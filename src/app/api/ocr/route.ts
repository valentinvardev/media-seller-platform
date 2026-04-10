import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";

/**
 * POST /api/ocr  { photoId }
 *
 * Uses Azure Computer Vision Read API to extract the bib number from a photo.
 * Fully synchronous — no polling needed. Returns { bib } immediately.
 *
 * Falls back to the Modal gateway if Azure env vars are not set.
 */

const AZURE_KEY = process.env.AZURE_VISION_KEY;
const AZURE_ENDPOINT = process.env.AZURE_VISION_ENDPOINT?.replace(/\/$/, "");

// ── Bib extraction helpers ────────────────────────────────────────────────────

/**
 * Given raw OCR text lines, find the most likely bib number.
 * Strategy:
 *  1. Prefer large isolated numbers (2-5 digits)
 *  2. Ignore obvious non-bib text (times, percentages, etc.)
 *  3. Return the first/most prominent candidate
 */
function extractBib(lines: string[]): string | null {
  const candidates: { value: string; score: number }[] = [];

  for (const line of lines) {
    const text = line.trim();

    // Extract all numeric sequences 2-5 digits
    const matches = text.match(/\b\d{2,5}\b/g) ?? [];
    for (const m of matches) {
      // Skip obvious non-bibs
      if (/^\d{2}:\d{2}/.test(text)) continue; // times like 01:23
      if (text.includes("%")) continue;          // percentages
      if (parseInt(m) > 99999) continue;         // too large

      // Score: prefer 3-4 digit numbers, penalize very short/long
      const len = m.length;
      const score = len === 3 ? 4 : len === 4 ? 5 : len === 2 ? 3 : len === 5 ? 2 : 1;
      candidates.push({ value: m, score });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  return candidates[0]!.value;
}

// ── Azure Vision OCR ──────────────────────────────────────────────────────────

async function runAzureOcr(imageBuffer: Buffer): Promise<string | null> {
  if (!AZURE_KEY || !AZURE_ENDPOINT) return null;

  // Azure Computer Vision Read API (v3.2) — analyze from stream
  const url = `${AZURE_ENDPOINT}/vision/v3.2/read/analyze?language=es&pages=1`;

  const analyzeRes = await fetch(url, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": AZURE_KEY,
      "Content-Type": "application/octet-stream",
    },
    body: new Blob([new Uint8Array(imageBuffer)]),
    signal: AbortSignal.timeout(15_000),
  });

  if (!analyzeRes.ok) {
    const text = await analyzeRes.text().catch(() => "");
    console.error("Azure Vision analyze error:", analyzeRes.status, text);
    return null;
  }

  // Azure returns 202 + Operation-Location header for async result polling
  const operationUrl = analyzeRes.headers.get("Operation-Location");
  if (!operationUrl) return null;

  // Poll for result (usually ready in 1-3s)
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 800));

    const resultRes = await fetch(operationUrl, {
      headers: { "Ocp-Apim-Subscription-Key": AZURE_KEY },
      signal: AbortSignal.timeout(10_000),
    });

    if (!resultRes.ok) continue;

    const result = await resultRes.json() as {
      status: string;
      analyzeResult?: {
        readResults: Array<{
          lines: Array<{ text: string }>;
        }>;
      };
    };

    if (result.status === "failed") return null;
    if (result.status !== "succeeded") continue;

    const lines = result.analyzeResult?.readResults
      .flatMap((r) => r.lines.map((l) => l.text)) ?? [];

    console.log("[Azure OCR] lines:", JSON.stringify(lines));
    const bib = extractBib(lines);
    console.log("[Azure OCR] extracted bib:", bib);
    return bib;
  }

  return null; // timed out
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

  // ── Try Azure Vision ──────────────────────────────────────────────────────
  if (AZURE_KEY && AZURE_ENDPOINT) {
    const supabase = getAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase admin client not available" }, { status: 500 });
    }

    // Download the photo from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("photos")
      .download(photo.storageKey);

    if (downloadError || !fileData) {
      console.error("Supabase download error:", downloadError);
      return NextResponse.json({ error: "Failed to download photo" }, { status: 500 });
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const bib = await runAzureOcr(buffer);

    if (bib) {
      await db.photo.update({ where: { id: photoId }, data: { bibNumber: bib } });
      return NextResponse.json({ bib, source: "azure" });
    }

    // Azure found no bib
    return NextResponse.json({ bib: null, source: "azure", found: false });
  }

  // ── Fallback: Modal gateway ───────────────────────────────────────────────
  const gatewayUrl = process.env.MODAL_OCR_SAVE_URL;
  if (!gatewayUrl) {
    return NextResponse.json({ skipped: true, reason: "No OCR provider configured" });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
  }

  try {
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_key: photo.storageKey,
        photo_id: photo.id,
        supabase_url: supabaseUrl,
        supabase_service_key: serviceKey,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Gateway error", status: res.status }, { status: 502 });
    }

    return NextResponse.json({ accepted: true, source: "modal" });
  } catch (err) {
    console.error("Modal gateway failed:", err);
    return NextResponse.json({ error: "Gateway unreachable" }, { status: 502 });
  }
}
