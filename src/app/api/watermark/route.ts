import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runWatermark } from "~/lib/photo-processing";

/**
 * POST /api/watermark  { photoId }
 *
 * Admin-facing endpoint. Uses shared runWatermark() logic.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const { previewKey } = await runWatermark(photoId);
  if (!previewKey) return NextResponse.json({ error: "Watermark failed" }, { status: 500 });

  return NextResponse.json({ previewKey });
}
