import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { collectionId } = (await req.json()) as { collectionId?: string };
  if (!collectionId) return NextResponse.json({ error: "Missing collectionId" }, { status: 400 });

  const photos = await db.photo.findMany({
    where: { collectionId, bibNumber: null },
    select: { id: true },
  });

  const { runOcr } = await import("~/lib/photo-processing");

  let found = 0;
  for (const photo of photos) {
    const result = await runOcr(photo.id);
    if (result.bib) found++;
  }

  return NextResponse.json({ found, total: photos.length });
}
