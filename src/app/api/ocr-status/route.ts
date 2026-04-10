import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  const photoId = req.nextUrl.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { bibNumber: true },
  });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ bib: photo.bibNumber ?? null });
}
