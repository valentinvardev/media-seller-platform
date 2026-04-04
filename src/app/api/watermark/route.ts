import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";
import { WATERMARK_KEY } from "~/app/api/watermark-settings/route";

async function getWatermarkBuffer(client: NonNullable<ReturnType<typeof getAdminClient>>): Promise<Buffer | null> {
  const { data, error } = await client.storage.from("photos").download(WATERMARK_KEY);
  if (error ?? !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

/** Build the composite watermark: PNG overlay if available, else SVG tiled text */
async function buildWatermark(
  client: NonNullable<ReturnType<typeof getAdminClient>>,
  imageWidth: number,
  imageHeight: number,
): Promise<{ input: Buffer; tile: boolean; blend: "over" }> {
  const wmPng = await getWatermarkBuffer(client);

  if (wmPng) {
    // Scale the watermark PNG to a max of 40% of the shorter image side, preserve aspect ratio
    const meta = await sharp(wmPng).metadata();
    const wmW = meta.width ?? 300;
    const wmH = meta.height ?? 100;
    const targetW = Math.round(Math.min(imageWidth, imageHeight) * 0.40);
    const targetH = Math.round((wmH / wmW) * targetW);

    const scaled = await sharp(wmPng)
      .resize(targetW, targetH, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();

    return { input: scaled, tile: true, blend: "over" };
  }

  // Fallback: SVG tiled text
  const tileSize = 220;
  const half = tileSize / 2;
  const fallback = Buffer.from(
    `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
      <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="22" font-weight="bold" letter-spacing="3"
        fill="rgba(255,255,255,0.38)"
        transform="rotate(-35, ${half}, ${half})">PREVIEW</text>
    </svg>`,
  );

  return { input: fallback, tile: true, blend: "over" };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = (await req.json()) as { photoId: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  // Download original
  const { data, error: dlError } = await client.storage.from("photos").download(photo.storageKey);
  if (dlError ?? !data) return NextResponse.json({ error: "Download failed" }, { status: 500 });

  const buffer = Buffer.from(await data.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 1200;
  const h = meta.height ?? 800;

  const composite = await buildWatermark(client, w, h);

  const watermarked = await sharp(buffer)
    .composite([composite])
    .jpeg({ quality: 78 })
    .toBuffer();

  // Remove old preview file if any
  if (photo.previewKey) {
    await client.storage.from("photos").remove([photo.previewKey]);
  }

  const previewKey = `previews/${photo.id}.jpg`;
  const { error: upError } = await client.storage
    .from("photos")
    .upload(previewKey, watermarked, { contentType: "image/jpeg", upsert: true });

  if (upError) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

  await db.photo.update({ where: { id: photoId }, data: { isPreview: true, previewKey } });

  return NextResponse.json({ previewKey });
}
