import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

/**
 * POST /api/ocr
 * Body: { photoId: string }
 *
 * Calls the Modal OCRGateway.trigger endpoint (cold start ~2s — no ML libs).
 * The gateway spawns MarathonPipeline.do_ocr_and_save asynchronously inside
 * Modal, which runs with no timeout. This route awaits the gateway (fast) so
 * Vercel doesn't kill the outgoing connection before it lands.
 */
export async function POST(req: NextRequest) {
  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const gatewayUrl = process.env.MODAL_OCR_SAVE_URL;
  if (!gatewayUrl) {
    return NextResponse.json({ skipped: true, reason: "MODAL_OCR_SAVE_URL not set" });
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

  try {
    // Await the gateway — it returns immediately after spawning the ML job.
    // This ensures the HTTP connection is established before Vercel returns.
    const res = await fetch(gatewayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storage_key: photo.storageKey,
        photo_id: photo.id,
        supabase_url: supabaseUrl,
        supabase_service_key: serviceKey,
      }),
      signal: AbortSignal.timeout(15_000), // gateway is fast, 15s is generous
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error("Gateway error:", res.status, text);
      return NextResponse.json({ error: "Gateway rejected request", status: res.status }, { status: 502 });
    }

    const data = await res.json() as { status?: string; photo_id?: string };
    return NextResponse.json({ accepted: true, photoId, gateway: data });
  } catch (err) {
    console.error("Gateway call failed:", err);
    return NextResponse.json({ error: "Gateway unreachable" }, { status: 502 });
  }
}
