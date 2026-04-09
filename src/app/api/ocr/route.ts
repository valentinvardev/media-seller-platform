import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";

/**
 * POST /api/ocr
 * Body: { photoId: string }
 *
 * Downloads the photo from Supabase, sends it base64-encoded to the Modal
 * OCR endpoint, extracts the bib number from Roboflow predictions, and saves
 * it to the DB.
 *
 * Auth: no session required — only photoId is accepted, and only the bib
 * number field is written. Called fire-and-forget from PhotoUploader.
 */
export async function POST(req: NextRequest) {
  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const modalUrl = process.env.MODAL_OCR_URL;
  if (!modalUrl) {
    return NextResponse.json({ bibNumber: null, skipped: true });
  }

  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  // Already has a bib — nothing to do
  if (photo.bibNumber) return NextResponse.json({ bibNumber: photo.bibNumber, cached: true });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  // Download original from Supabase
  const { data, error } = await client.storage.from("photos").download(photo.storageKey);
  if (error ?? !data) return NextResponse.json({ error: "Download failed" }, { status: 500 });

  const imageBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");

  let bibNumber: string | null = null;
  try {
    const modalRes = await fetch(modalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
      // Modal cold start can take up to 90s with ML libs loaded
      signal: AbortSignal.timeout(120_000),
    });

    if (modalRes.ok) {
      const result = await modalRes.json() as {
        roboflow_results?: {
          predictions?: Array<{ class?: string; bib_text?: string; confidence?: number }>;
        };
      };

      const preds = result.roboflow_results?.predictions ?? [];
      // Take the highest-confidence bib prediction with a valid digit string
      const sorted = [...preds].sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
      for (const pred of sorted) {
        if (pred.class?.toLowerCase() !== "bib") continue;
        const text = pred.bib_text?.trim();
        if (text && text !== "Unknown" && /^\d+$/.test(text)) {
          bibNumber = text;
          break;
        }
      }
    } else {
      console.error("Modal OCR non-ok:", modalRes.status, await modalRes.text().catch(() => ""));
    }
  } catch (err) {
    console.error("OCR request failed:", err);
  }

  if (bibNumber) {
    await db.photo.update({ where: { id: photoId }, data: { bibNumber } });
  }

  return NextResponse.json({ bibNumber });
}
