/**
 * photo-processing.ts
 *
 * Core processing functions called directly from the server (bulkAdd mutation).
 * No HTTP, no auth — pure server-side logic.
 */

import sharp from "sharp";
import {
  RekognitionClient,
  DetectTextCommand,
  CreateCollectionCommand,
  IndexFacesCommand,
  DeleteCollectionCommand,
} from "@aws-sdk/client-rekognition";
import { db } from "~/server/db";
import { downloadObject, uploadObject, deleteObjects, createCFInvalidation } from "~/lib/s3";
import { WATERMARK_KEY } from "~/lib/watermark";

// ── S3 retry helper ───────────────────────────────────────────────────────────
// Transient errors on big uploads still happen (network, throttling). Same
// shape as the previous Supabase retry so call sites don't change.

async function downloadWithRetry(key: string): Promise<{ buffer: Buffer; error?: undefined } | { buffer: null; error: string }> {
  let lastError = "unknown";
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const buffer = await downloadObject(key);
      return { buffer };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      lastError = msg;
      const isRetryable = msg.includes("503") || msg.includes("Bad Gateway") || msg.includes("502") || msg.includes("Throttling") || msg.includes("SlowDown");
      if (!isRetryable) return { buffer: null, error: msg };
      await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt) + Math.random() * 300));
    }
  }
  return { buffer: null, error: lastError };
}

// ── Rekognition client (shared) ───────────────────────────────────────────────

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION ?? "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── OCR ───────────────────────────────────────────────────────────────────────

function extractAllBibs(
  detections: Array<{ DetectedText?: string; Type?: string; Confidence?: number }>,
): string[] {
  const candidates: { value: string; score: number }[] = [];

  // Score formula shared by both formats: longer-but-not-too-long bibs win,
  // isolated detections (the whole OCR line is just the bib) get a bonus,
  // higher OCR confidence boosts further.
  const lenScoreFor = (digits: number) =>
    digits === 3 ? 4 : digits === 4 ? 5 : digits === 2 ? 3 : digits === 5 ? 2 : 1;

  for (const d of detections) {
    if (d.Type !== "LINE") continue;
    const text = (d.DetectedText ?? "").trim();
    const confidence = d.Confidence ?? 0;
    if (confidence < 50) continue;

    // Line-level false-positive filters (clocks, percentages, "5 km" markers).
    if (/^\d{1,2}:\d{2}/.test(text)) continue;
    if (text.includes("%")) continue;
    if (/^\d+\s*km$/i.test(text)) continue;

    const confBonus = confidence / 50;

    // 1) Alphanumeric bibs: single letter followed by 2–5 digits (e.g. "C1722").
    // Used by some race series like Letape. Stored uppercased so "c1722" and
    // "C1722" dedupe to the same bib. \b anchors prevent matches inside longer
    // strings like "NIKE2024" or "1234B".
    const alphaMatches = text.match(/\b[A-Za-z]\d{2,5}\b/g) ?? [];
    const claimedDigits = new Set<string>();
    for (const raw of alphaMatches) {
      const value = raw.toUpperCase();
      const digitsLen = value.length - 1;
      const isolatedBonus = text === raw ? 3 : 0;
      candidates.push({ value, score: lenScoreFor(digitsLen) + isolatedBonus + confBonus });
      // Reserve the digit portion so the pure-numeric pass below doesn't
      // double-count "C1722" as both "C1722" and "1722".
      claimedDigits.add(value.slice(1));
    }

    // 2) Pure numeric bibs (legacy behavior).
    const numericMatches = text.match(/\b\d{2,5}\b/g) ?? [];
    for (const m of numericMatches) {
      if (claimedDigits.has(m)) continue;
      if (parseInt(m) > 99999) continue;

      const isolatedBonus = text === m ? 3 : 0;
      candidates.push({ value: m, score: lenScoreFor(m.length) + isolatedBonus + confBonus });
    }
  }

  if (candidates.length === 0) return [];

  const best = new Map<string, number>();
  for (const c of candidates) {
    if (!best.has(c.value) || best.get(c.value)! < c.score) best.set(c.value, c.score);
  }

  return Array.from(best.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v);
}

/**
 * `reason` explains why we didn't return a bib (or that we did). Callers can
 * bucket photos into: found / already-had / no-text / no-bib-in-text /
 * download-failed / empty-image / rekognition-error / photo-not-found.
 */
export type OcrResult =
  | { bib: string; reason: "found" | "existing" }
  | { bib: null; reason: "photo-not-found" | "download-failed" | "empty-image" | "no-text-detected" | "no-bib-in-text" | "rekognition-error"; errorMessage?: string };

export async function runOcr(photoId: string): Promise<OcrResult> {
  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true, bibNumber: true },
  });
  if (!photo) return { bib: null, reason: "photo-not-found" };
  if (photo.bibNumber !== null) return { bib: photo.bibNumber, reason: "existing" };

  const dl = await downloadWithRetry(photo.storageKey);
  if (!dl.buffer || dl.buffer.length === 0) {
    console.error(`[OCR] Download failed — photoId=${photoId} key=${photo.storageKey} error=${dl.error ?? "empty-buffer"}`);
    return { bib: null, reason: "download-failed", errorMessage: dl.error ?? `Empty response (0 bytes) for key ${photo.storageKey}` };
  }
  const rawBuffer = dl.buffer;

  let imageBytes: Uint8Array;
  try {
    const resized = await sharp(rawBuffer).resize(1920, 1920, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
    imageBytes = new Uint8Array(resized);
  } catch (err) {
    console.error(`[OCR] Sharp resize failed for photoId=${photoId}:`, err);
    return { bib: null, reason: "empty-image", errorMessage: err instanceof Error ? err.message : String(err) };
  }

  if (imageBytes.length === 0) {
    console.error(`[OCR] Resized image is empty — photoId=${photoId} key=${photo.storageKey}`);
    return { bib: null, reason: "empty-image" };
  }

  try {
    const response = await rekognition.send(new DetectTextCommand({ Image: { Bytes: imageBytes } }));
    const detections = response.TextDetections ?? [];
    const bibs = extractAllBibs(detections);

    console.log(`[OCR] photoId=${photoId} bibs=${bibs.join(",") || "none"} texts=${detections.length}`);

    if (bibs.length > 0) {
      const bibString = bibs.join(",");
      await db.photo.update({ where: { id: photoId }, data: { bibNumber: bibString } });
      return { bib: bibString, reason: "found" };
    }
    // Distinguish "Rekognition saw NO text at all" from "Rekognition saw text but nothing looked like a bib".
    return { bib: null, reason: detections.length === 0 ? "no-text-detected" : "no-bib-in-text" };
  } catch (err) {
    console.error(`[OCR] Rekognition error for photoId=${photoId}:`, err);
    return { bib: null, reason: "rekognition-error", errorMessage: err instanceof Error ? err.message : String(err) };
  }
}

// ── Watermark ─────────────────────────────────────────────────────────────────

// Module-level cache so watermark is downloaded once per server process
let cachedWatermark: Buffer | null | "none" = null;

async function getWatermarkBuffer(): Promise<Buffer | null> {
  if (cachedWatermark === "none") return null;
  if (cachedWatermark !== null) return cachedWatermark;
  try {
    cachedWatermark = await downloadObject(WATERMARK_KEY);
    return cachedWatermark;
  } catch {
    cachedWatermark = "none";
    return null;
  }
}

/** Reset the cached watermark buffer — called after upload/delete from the admin UI. */
export function invalidateWatermarkCache(): void {
  cachedWatermark = null;
}

async function buildWatermarkComposite(
  imageWidth: number,
  imageHeight: number,
): Promise<{ input: Buffer; tile: boolean; blend: "over" }> {
  const wmPng = await getWatermarkBuffer();

  if (wmPng) {
    const meta = await sharp(wmPng).metadata();
    const wmW = meta.width ?? 300;
    const wmH = meta.height ?? 100;
    const targetW = Math.round(Math.min(imageWidth, imageHeight) * 0.40);
    const targetH = Math.round((wmH / wmW) * targetW);

    const scaled = await sharp(wmPng)
      .resize(targetW, targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .rotate(-35, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return { input: scaled, tile: true, blend: "over" };
  }

  const tileSize = 220;
  const half = tileSize / 2;
  const fallback = Buffer.from(
    `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
      <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="22" font-weight="bold" letter-spacing="3"
        fill="rgba(255,255,255,0.38)"
        transform="rotate(-35, ${half}, ${half})">PREVIEW</text>
    </svg>`,
  );
  return { input: fallback, tile: true, blend: "over" };
}

export async function runWatermark(photoId: string): Promise<{ previewKey: string | null }> {
  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) return { previewKey: null };

  const dl = await downloadWithRetry(photo.storageKey);
  if (!dl.buffer) { console.error(`[Watermark] Download failed — photoId=${photoId} key=${photo.storageKey} error=${dl.error}`); return { previewKey: null }; }
  const rawBuffer = dl.buffer;

  // Resize first to a max preview dimension so watermark composite + final
  // upload are both lighter. 1200px @ quality 62 looks good in a gallery on
  // any device and roughly halves egress vs. the previous 1920/q78.
  const PREVIEW_MAX = 1200;
  const PREVIEW_QUALITY = 62;

  const resizedBuffer = await sharp(rawBuffer)
    .resize(PREVIEW_MAX, PREVIEW_MAX, { fit: "inside", withoutEnlargement: true })
    .toBuffer();

  const meta = await sharp(resizedBuffer).metadata();
  const w = meta.width ?? PREVIEW_MAX;
  const h = meta.height ?? PREVIEW_MAX;

  try {
    const composite = await buildWatermarkComposite(w, h);
    const watermarked = await sharp(resizedBuffer).composite([composite]).jpeg({ quality: PREVIEW_QUALITY, mozjpeg: true }).toBuffer();

    if (photo.previewKey) {
      await deleteObjects([photo.previewKey]).catch(() => undefined);
    }

    const previewKey = `previews/${photo.id}.jpg`;
    let uploadErr: unknown = null;
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        await uploadObject(
          previewKey,
          watermarked,
          "image/jpeg",
          // 1 year cache — preview never changes once generated. Lets browsers
          // and any CDN in front (Cloudflare) avoid re-requesting from S3.
          "public, max-age=31536000, immutable",
        );
        uploadErr = null;
        break;
      } catch (err) {
        uploadErr = err;
        const msg = err instanceof Error ? err.message : String(err);
        const isRetryable = msg.includes("503") || msg.includes("Bad Gateway") || msg.includes("502") || msg.includes("Throttling") || msg.includes("SlowDown");
        if (!isRetryable) break;
        await new Promise((r) => setTimeout(r, 500 * Math.pow(2, attempt) + Math.random() * 300));
      }
    }
    if (uploadErr) { console.error("[Watermark] Upload failed after retries:", uploadErr); return { previewKey: null }; }

    await db.photo.update({ where: { id: photoId }, data: { previewKey } });
    void createCFInvalidation([`/${previewKey}`]);
    console.log(`[Watermark] photoId=${photoId} done`);
    return { previewKey };
  } catch (err) {
    console.error(`[Watermark] Error for photoId=${photoId}:`, err);
    return { previewKey: null };
  }
}

// ── Face index ────────────────────────────────────────────────────────────────

export function rekognitionCollectionId(collectionId: string) {
  return `foto-${collectionId.replace(/[^a-zA-Z0-9_.\-]/g, "-")}`;
}

/**
 * Delete a collection's Rekognition collection (and thus all its stored faces).
 * Best-effort: swallows "doesn't exist". Called when an event is deleted (so we
 * stop paying face storage forever on orphans) and when forcing a full reindex.
 */
export async function deleteRekognitionCollection(collectionId: string): Promise<void> {
  const rekId = rekognitionCollectionId(collectionId);
  try {
    await rekognition.send(new DeleteCollectionCommand({ CollectionId: rekId }));
    ensuredCollections.delete(rekId);
    console.log(`[FaceIndex] deleted Rekognition collection ${rekId}`);
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== "ResourceNotFoundException") {
      console.error(`[FaceIndex] failed deleting collection ${rekId}:`, err);
    }
  }
}

// In-process cache of collections we've already ensured exist this server run.
// CreateCollection is free but calling it per-photo wastes a round-trip and
// risks throttling; once ensured, skip it.
const ensuredCollections = new Set<string>();

async function ensureRekognitionCollection(collId: string) {
  if (ensuredCollections.has(collId)) return;
  try {
    await rekognition.send(new CreateCollectionCommand({ CollectionId: collId }));
  } catch (err: unknown) {
    if ((err as { name?: string }).name !== "ResourceAlreadyExistsException") throw err;
  }
  ensuredCollections.add(collId);
}

/**
 * Index a photo's faces into its Rekognition collection.
 *
 * IMPORTANT — cost control: IndexFaces is billed per image and does NOT
 * deduplicate (calling it twice on the same image stores duplicate faces and
 * charges again). We stamp `faceProcessedAt` after every attempt so callers can
 * skip already-processed photos. Pass `force: true` only when you've already
 * cleared the old faces and genuinely want to re-index from scratch.
 */
export async function runFaceIndex(
  photoId: string,
  collectionId: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true, faceProcessedAt: true },
  });
  if (!photo) return;

  // Idempotency guard: if this photo was already indexed and we're not forcing
  // a rebuild, do nothing — this is what makes the reindex button free to click.
  if (photo.faceProcessedAt && !opts.force) return;

  const dl = await downloadWithRetry(photo.storageKey);
  if (!dl.buffer) { console.error(`[FaceIndex] Download failed — photoId=${photoId} key=${photo.storageKey} error=${dl.error}`); return; }
  const rawBuffer = dl.buffer;

  const resized = await sharp(rawBuffer).resize(1920, 1920, { fit: "inside", withoutEnlargement: true }).jpeg({ quality: 85 }).toBuffer();
  const imageBytes = new Uint8Array(resized);
  const rekCollectionId = rekognitionCollectionId(collectionId);

  try {
    await ensureRekognitionCollection(rekCollectionId);
    const result = await rekognition.send(new IndexFacesCommand({
      CollectionId: rekCollectionId,
      Image: { Bytes: imageBytes },
      ExternalImageId: photoId,
      DetectionAttributes: [],
      MaxFaces: 10,
    }));

    const indexed = result.FaceRecords ?? [];
    console.log(`[FaceIndex] photoId=${photoId} indexed ${indexed.length} faces`);

    for (const fr of indexed) {
      const faceId = fr.Face?.FaceId;
      if (!faceId) continue;
      await db.faceRecord.upsert({
        where: { rekFaceId: faceId },
        update: { photoId, collectionId, confidence: fr.Face?.Confidence ?? null },
        create: { rekFaceId: faceId, photoId, collectionId, confidence: fr.Face?.Confidence ?? null },
      });
    }

    // Stamp processed even when 0 faces were found — a bibless/faceless photo is
    // still "done" and must not be re-charged on the next reindex click.
    await db.photo.update({ where: { id: photoId }, data: { faceProcessedAt: new Date() } });
  } catch (err) {
    console.error(`[FaceIndex] Error for photoId=${photoId}:`, err);
  }
}

// ── Concurrency limiter (semaphore) ──────────────────────────────────────────
// Caps how many background photo-processing ops can be in flight against
// S3/Prisma at once. Without this, a 100-photo upload could fan out
// to 200+ concurrent ops and exhaust the connection pool.

function makeLimiter(max: number) {
  let active = 0;
  const queue: Array<() => void> = [];
  const next = () => {
    if (active >= max || queue.length === 0) return;
    active++;
    const job = queue.shift()!;
    job();
  };
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (active >= max) {
      await new Promise<void>((resolve) => queue.push(resolve));
    } else {
      active++;
    }
    try { return await fn(); }
    finally { active--; next(); }
  };
}

// 4 concurrent ops of each type = 12 total max. Tuned for connection_limit=15.
const ocrLimit = makeLimiter(4);
const watermarkLimit = makeLimiter(4);
const faceLimit = makeLimiter(4);

export const runOcrLimited = (photoId: string) => ocrLimit(() => runOcr(photoId));
export const runWatermarkLimited = (photoId: string) => watermarkLimit(() => runWatermark(photoId));
export const runFaceIndexLimited = (photoId: string, collectionId: string, opts: { force?: boolean } = {}) =>
  faceLimit(() => runFaceIndex(photoId, collectionId, opts));
