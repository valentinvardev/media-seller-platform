import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collectionId } = (await req.json()) as { collectionId?: string };
  if (!collectionId) return NextResponse.json({ error: "Missing collectionId" }, { status: 400 });

  const photos = await db.photo.findMany({
    where: { collectionId },
    select: { id: true },
  });

  const { runFaceIndex } = await import("~/lib/photo-processing");

  // Run sequentially to avoid hammering Rekognition
  let indexed = 0;
  for (const photo of photos) {
    await runFaceIndex(photo.id, collectionId);
    indexed++;
  }

  return NextResponse.json({ indexed, total: photos.length });
}
