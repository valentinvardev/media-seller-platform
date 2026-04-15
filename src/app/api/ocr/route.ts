import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { runOcr } from "~/lib/photo-processing";
import { db } from "~/server/db";

/**
 * POST /api/ocr  { photoId }
 *
 * Admin-facing endpoint. Uses shared runOcr() logic.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = (await req.json()) as { photoId?: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  // Check cache first
  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { bibNumber: true },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  if (photo.bibNumber !== null) return NextResponse.json({ bib: photo.bibNumber, cached: true });

  const { bib } = await runOcr(photoId);
  return NextResponse.json({ bib, source: "Amazon Rekognition", found: bib !== null });
}
