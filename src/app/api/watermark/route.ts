import { type NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { getAdminClient } from "~/lib/supabase/admin";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { photoId } = (await req.json()) as { photoId: string };
  if (!photoId) return NextResponse.json({ error: "photoId required" }, { status: 400 });

  const photo = await db.photo.findUnique({ where: { id: photoId } });
  if (!photo) return NextResponse.json({ error: "Photo not found" }, { status: 404 });

  const client = getAdminClient();
  if (!client) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  // Download original from Supabase
  const { data, error: dlError } = await client.storage.from("photos").download(photo.storageKey);
  if (dlError ?? !data) return NextResponse.json({ error: "Download failed" }, { status: 500 });

  const buffer = Buffer.from(await data.arrayBuffer());

  // Watermark tile: diagonal repeating "PREVIEW" text
  const tileSize = 220;
  const half = tileSize / 2;
  const wmSvg = Buffer.from(
    `<svg width="${tileSize}" height="${tileSize}" xmlns="http://www.w3.org/2000/svg">
      <text x="${half}" y="${half}" text-anchor="middle" dominant-baseline="middle"
        font-family="Arial, sans-serif" font-size="22" font-weight="bold" letter-spacing="3"
        fill="rgba(255,255,255,0.38)"
        transform="rotate(-35, ${half}, ${half})">PREVIEW</text>
    </svg>`,
  );

  const watermarked = await sharp(buffer)
    .composite([{ input: wmSvg, tile: true, blend: "over" }])
    .jpeg({ quality: 78 })
    .toBuffer();

  // Delete existing preview if any
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
