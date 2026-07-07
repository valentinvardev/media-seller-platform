import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runOcr } from "~/lib/photo-processing";

/**
 * POST /api/ocr-one  { photoId }
 *
 * Re-runs OCR on one photo. Used by the OcrRetryButton in a client-side
 * worker pool so we can process many photos in parallel with visible
 * progress and no HTTP proxy timeout risk.
 *
 * Response also carries a `reason` string that the client aggregates into a
 * breakdown so the admin can tell "found nothing" apart from real errors.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const result = await runOcr(photoId);
  return NextResponse.json({
    bib: result.bib,
    reason: result.reason,
    errorMessage: "errorMessage" in result ? result.errorMessage : undefined,
  });
}
