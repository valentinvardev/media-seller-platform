import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";

/**
 * POST /api/ocr
 * Body: { photoId: string }
 *
 * Downloads the photo from Supabase, sends it to the Modal OCR endpoint,
 * extracts the bib number from Roboflow predictions, and saves it to the DB.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const modalUrl = process.env.MODAL_OCR_URL;
  if (!modalUrl) {
    // OCR not configured — return null silently so upload still works
    return NextResponse.json({ bibNumber: null, skipped: true });
  }

  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  // Already has a bib — skip
  if (photo.bibNumber) return NextResponse.json({ bibNumber: photo.bibNumber, cached: true });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  // Download the original from Supabase
  const { data, error } = await client.storage.from("photos").download(photo.storageKey);
  if (error ?? !data) return NextResponse.json({ error: "Download failed" }, { status: 500 });

  const imageBase64 = Buffer.from(await data.arrayBuffer()).toString("base64");

  let bibNumber: string | null = null;
  try {
    const modalRes = await fetch(modalUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image_base64: imageBase64 }),
      signal: AbortSignal.timeout(30_000),
    });

    if (modalRes.ok) {
      const result = await modalRes.json() as {
        roboflow_results?: {
          predictions?: Array<{ class?: string; bib_text?: string; confidence?: number }>;
        };
      };

      const preds = result.roboflow_results?.predictions ?? [];
      // Take the first bib-class prediction with a valid digit string
      for (const pred of preds) {
        if (pred.class?.toLowerCase() !== "bib") continue;
        const text = pred.bib_text?.trim();
        if (text && text !== "Unknown" && /^\d+$/.test(text)) {
          bibNumber = text;
          break;
        }
      }
    }
  } catch (err) {
    console.error("OCR request failed:", err);
    // Non-fatal — photo stays with null bib
  }

  if (bibNumber) {
    await db.photo.update({ where: { id: photoId }, data: { bibNumber } });
  }

  return NextResponse.json({ bibNumber });
}
