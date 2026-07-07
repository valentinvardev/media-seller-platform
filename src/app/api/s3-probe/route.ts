import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { env } from "~/env";
import { downloadObject } from "~/lib/s3";

/**
 * GET /api/s3-probe?photoId=xxx  (or ?collectionId=xxx to pick the first one)
 *
 * Admin diagnostic. Tries to fetch the actual bytes for a photo from S3 and
 * reports back what S3 said — bucket, prefix, key, response length, and the
 * raw error message if it failed. Meant to be visited directly in a browser
 * so we can see exactly what's wrong when the OCR retry says "download-failed".
 */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  let photoId = url.searchParams.get("photoId");
  const collectionId = url.searchParams.get("collectionId");

  if (!photoId && collectionId) {
    const p = await db.photo.findFirst({
      where: { collectionId },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    photoId = p?.id ?? null;
  }

  if (!photoId) {
    return NextResponse.json({ error: "Pass ?photoId=... or ?collectionId=..." }, { status: 400 });
  }

  const photo = await db.photo.findUnique({
    where: { id: photoId },
    select: { id: true, storageKey: true, previewKey: true, filename: true, fileSize: true, createdAt: true },
  });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const bucket = env.AWS_S3_BUCKET ?? null;
  const prefix = env.AWS_S3_PREFIX ?? null;
  const region = env.AWS_REGION ?? null;
  const s3Region = env.AWS_S3_REGION ?? region;

  const t0 = Date.now();
  let result: unknown;
  try {
    const buf = await downloadObject(photo.storageKey);
    result = {
      ok: true,
      elapsedMs: Date.now() - t0,
      downloadedBytes: buf.length,
      matchesDbFileSize: photo.fileSize ? buf.length === photo.fileSize : null,
    };
  } catch (err) {
    result = {
      ok: false,
      elapsedMs: Date.now() - t0,
      error: err instanceof Error ? err.message : String(err),
      errorName: err instanceof Error ? err.name : undefined,
    };
  }

  return NextResponse.json({
    photo: {
      id: photo.id,
      filename: photo.filename,
      storageKey: photo.storageKey,
      previewKey: photo.previewKey,
      fileSizeInDb: photo.fileSize,
      createdAt: photo.createdAt,
    },
    s3Config: {
      bucket,
      prefix,
      region,            // AWS_REGION (used by Rekognition too)
      s3Region,          // Effective region for the S3 client
      s3RegionOverride: env.AWS_S3_REGION ?? null,
      hasAccessKey: !!env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!env.AWS_SECRET_ACCESS_KEY,
    },
    downloadResult: result,
  });
}
