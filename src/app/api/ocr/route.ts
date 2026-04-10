import { type NextRequest, NextResponse } from "next/server";
import { RekognitionClient, DetectTextCommand } from "@aws-sdk/client-rekognition";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";

/**
 * POST /api/ocr  { photoId }
 *
 * Uses AWS Rekognition DetectText to extract the bib number from a photo.
 * Fully synchronous — returns { bib } immediately.
 */

const rekognition = new RekognitionClient({
  region: process.env.AWS_REGION ?? "sa-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ── Bib extraction ────────────────────────────────────────────────────────────

/**
 * Given Rekognition TextDetection results, find the most likely bib number.
 * Strategy:
 *  1. Only look at LINE detections (not WORD — lines give more context)
 *  2. Prefer large isolated numbers (2-5 digits)
 *  3. Prefer detections with higher confidence
 *  4. Ignore obvious non-bib text (times, percentages, km markers)
 */
function extractBib(
  detections: Array<{ DetectedText?: string; Type?: string; Confidence?: number }>
): string | null {
  const candidates: { value: string; score: number }[] = [];

  for (const d of detections) {
    if (d.Type !== "LINE") continue;
    const text = (d.DetectedText ?? "").trim();
    const confidence = d.Confidence ?? 0;

    const matches = text.match(/\b\d{2,5}\b/g) ?? [];
    for (const m of matches) {
      if (/^\d{1,2}:\d{2}/.test(text)) continue;  // times like 1:23:45
      if (text.includes("%")) continue;             // percentages
      if (/^\d+\s*km$/i.test(text)) continue;      // km markers
      if (parseInt(m) > 99999) continue;

      const len = m.length;
      const lenScore = len === 3 ? 4 : len === 4 ? 5 : len === 2 ? 3 : len === 5 ? 2 : 1;
      // Boost score if the entire line is just this number
      const isolatedBonus = text === m ? 3 : 0;
      // Factor in Rekognition confidence (0-100 → 0-2)
      const confBonus = confidence / 50;

      candidates.push({ value: m, score: lenScore + isolatedBonus + confBonus });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  console.log("[Rekognition] candidates:", JSON.stringify(candidates.slice(0, 5)));
  return candidates[0]!.value;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true, bibNumber: true },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.bibNumber) return NextResponse.json({ bib: photo.bibNumber, cached: true });

  const supabase = getAdminClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase admin client not available" }, { status: 500 });
  }

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("photos")
    .download(photo.storageKey);

  if (downloadError || !fileData) {
    console.error("Supabase download error:", downloadError);
    return NextResponse.json({ error: "Failed to download photo" }, { status: 500 });
  }

  const imageBytes = new Uint8Array(await fileData.arrayBuffer());

  try {
    const command = new DetectTextCommand({
      Image: { Bytes: imageBytes },
    });

    const response = await rekognition.send(command);
    const detections = response.TextDetections ?? [];

    console.log("[Rekognition] detections:", detections
      .filter(d => d.Type === "LINE")
      .map(d => `"${d.DetectedText}" (${d.Confidence?.toFixed(1)}%)`));

    const bib = extractBib(detections);

    if (bib) {
      await db.photo.update({ where: { id: photoId }, data: { bibNumber: bib } });
      return NextResponse.json({ bib, source: "rekognition" });
    }

    return NextResponse.json({ bib: null, source: "rekognition", found: false });
  } catch (err) {
    console.error("[Rekognition] error:", err);
    return NextResponse.json({ error: "Rekognition failed", detail: String(err) }, { status: 500 });
  }
}
