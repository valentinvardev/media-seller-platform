import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export async function GET(req: NextRequest) {
  // Any authenticated user (admin or collaborator) — polled by the uploader UI.
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const photoId = req.nextUrl.searchParams.get("photoId");
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { bibNumber: true },
  });
  if (!photo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ bib: photo.bibNumber ?? null });
}
