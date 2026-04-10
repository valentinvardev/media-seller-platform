import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * POST /api/ocr
 * Body: { photoId: string }
 *
 * Fires a request to the Modal `process_and_save` endpoint which:
 *   1. Downloads the photo from Supabase directly
 *   2. Runs Roboflow bib detection + EasyOCR
 *   3. Writes the bib number straight to the DB
 *
 * The Modal endpoint does all the heavy lifting — this route returns
 * immediately so it never hits Vercel's function timeout.
 */
export async function POST(req: NextRequest) {
  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const modalUrl = process.env.MODAL_OCR_URL;
  if (!modalUrl) {
    return NextResponse.json({ skipped: true, reason: "MODAL_OCR_URL not set" });
  }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true, bibNumber: true },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.bibNumber) return NextResponse.json({ bib: photo.bibNumber, cached: true });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Supabase env vars missing" }, { status: 500 });
  }

  const saveUrl = process.env.MODAL_OCR_SAVE_URL ?? modalUrl;

  // Fire to Modal — don't await, return instantly so Vercel doesn't time out.
  // Modal downloads the photo, runs OCR, and writes the bib directly to Supabase.
  void fetch(saveUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storage_key: photo.storageKey,
      photo_id: photo.id,
      supabase_url: supabaseUrl,
      supabase_service_key: serviceKey,
    }),
  }).catch((err) => console.error("Modal OCR trigger failed:", err));

  return NextResponse.json({ accepted: true, photoId });
}
