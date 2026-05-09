import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import {
  createSignedUrl,
  uploadObject,
  deleteObjects,
  isS3Configured,
} from "~/lib/s3";
import { WATERMARK_KEY } from "~/lib/watermark";
import { invalidateWatermarkCache } from "~/lib/photo-processing";

/** GET — returns a signed URL for the current watermark, or null */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isS3Configured()) return NextResponse.json({ url: null });

  const url = await createSignedUrl(WATERMARK_KEY, 3600).catch(() => null);
  return NextResponse.json({ url });
}

/** POST — uploads a new watermark PNG; body is FormData with field "file" */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isS3Configured()) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    await uploadObject(WATERMARK_KEY, buffer, file.type);
    invalidateWatermarkCache();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

/** DELETE — removes the current watermark */
export async function DELETE() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!isS3Configured()) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  await deleteObjects([WATERMARK_KEY]).catch(() => undefined);
  invalidateWatermarkCache();
  return NextResponse.json({ ok: true });
}
