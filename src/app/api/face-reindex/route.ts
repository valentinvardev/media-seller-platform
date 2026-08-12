import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

/**
 * POST /api/face-reindex  { collectionId, force? }
 *
 * Default (force=false): indexes ONLY photos never processed before
 * (faceProcessedAt IS NULL). Idempotent — clicking twice costs nothing, because
 * IndexFaces is billed per image and does not deduplicate.
 *
 * force=true: full rebuild. Deletes the Rekognition collection (drops all stored
 * faces), clears our FaceRecords + faceProcessedAt, then re-indexes everything.
 * Use only when the collection is genuinely broken (e.g. wrong region, corrupted).
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { collectionId, force } = (await req.json()) as { collectionId?: string; force?: boolean };
  if (!collectionId) return NextResponse.json({ error: "Missing collectionId" }, { status: 400 });

  const { runFaceIndex, deleteRekognitionCollection } = await import("~/lib/photo-processing");

  if (force) {
    // Nuclear rebuild: wipe AWS faces + our records so nothing is double-charged
    // as duplicates, then re-index the whole collection from scratch.
    await deleteRekognitionCollection(collectionId);
    await db.faceRecord.deleteMany({ where: { collectionId } });
    await db.photo.updateMany({ where: { collectionId }, data: { faceProcessedAt: null } });
  }

  // Only pull photos that still need indexing. After the backfill + the upload
  // path stamping faceProcessedAt, this is empty on a healthy collection — so a
  // stray click does zero IndexFaces calls.
  const photos = await db.photo.findMany({
    where: { collectionId, faceProcessedAt: null },
    select: { id: true },
  });

  let indexed = 0;
  for (const photo of photos) {
    await runFaceIndex(photo.id, collectionId, { force: true });
    indexed++;
  }

  return NextResponse.json({ indexed, total: photos.length, mode: force ? "rebuild" : "missing-only" });
}
