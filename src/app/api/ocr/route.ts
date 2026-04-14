import { type NextRequest, NextResponse } from "next/server";
import { RekognitionClient, DetectTextCommand } from "@aws-sdk/client-rekognition";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";
import { auth } from "~/server/auth";

/**
 * POST /api/ocr  { photoId }
 *
 * Uses AWS Rekognition DetectText to extract ALL bib numbers from a photo.
 * Returns { bib } as comma-separated string (e.g. "1234,5678").
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
 * Given Rekognition TextDetection results, return ALL likely bib numbers
 * as a deduplicated array, sorted by confidence score descending.
 */
function extractAllBibs(
  detections: Array<{ DetectedText?: string; Type?: string; Confidence?: number }>
): string[] {
  const candidates: { value: string; score: number }[] = [];

  for (const d of detections) {
    if (d.Type !== "LINE") continue;
    const text = (d.DetectedText ?? "").trim();
    const confidence = d.Confidence ?? 0;

    // Skip low-confidence detections
    if (confidence < 50) continue;

    const matches = text.match(/\b\d{2,5}\b/g) ?? [];
    for (const m of matches) {
      if (/^\d{1,2}:\d{2}/.test(text)) continue;  // times like 1:23:45
      if (text.includes("%")) continue;             // percentages
      if (/^\d+\s*km$/i.test(text)) continue;      // km markers
      if (parseInt(m) > 99999) continue;

      const len = m.length;
      const lenScore = len === 3 ? 4 : len === 4 ? 5 : len === 2 ? 3 : len === 5 ? 2 : 1;
      const isolatedBonus = text === m ? 3 : 0;
      const confBonus = confidence / 50;

      candidates.push({ value: m, score: lenScore + isolatedBonus + confBonus });
    }
  }

  if (candidates.length === 0) return [];

  // Deduplicate keeping highest score per value
  const best = new Map<string, number>();
  for (const c of candidates) {
    if (!best.has(c.value) || best.get(c.value)! < c.score) {
      best.set(c.value, c.score);
    }
  }

  // Sort by score descending
  const sorted = Array.from(best.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([v]) => v);

  console.log("[Rekognition] all bib candidates:", sorted);
  return sorted;
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    console.log("[Rekognition] lines:", detections
      .filter(d => d.Type === "LINE")
      .map(d => `"${d.DetectedText}" (${d.Confidence?.toFixed(1)}%)`));

    const bibs = extractAllBibs(detections);

    if (bibs.length > 0) {
      const bibString = bibs.join(",");
      await db.photo.update({ where: { id: photoId }, data: { bibNumber: bibString } });
      return NextResponse.json({ bib: bibString, bibs, source: "Amazon Rekognition" });
    }

    return NextResponse.json({ bib: null, source: "Amazon Rekognition", found: false });
  } catch (err) {
    console.error("[Rekognition] error:", err);
    return NextResponse.json({ error: "Rekognition failed", detail: String(err) }, { status: 500 });
  }
}
