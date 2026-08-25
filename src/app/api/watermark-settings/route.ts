import { type NextRequest, NextResponse } from "next/server";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import {
  uploadObject,
  copyObject,
  isS3Configured,
  objectExists,
  createCFInvalidation,
} from "~/lib/s3";
import { resolveMediaUrl } from "~/lib/media";
import { WATERMARK_KEY } from "~/lib/watermark";
import { invalidateWatermarkCache } from "~/lib/photo-processing";

const presetKey = (id: string) => `watermark-presets/${id}.png`;

/** GET — display URL for the currently active watermark, or null. */
export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isS3Configured()) return NextResponse.json({ url: null });

  const url = await resolveMediaUrl(WATERMARK_KEY).catch(() => null);
  return NextResponse.json({ url });
}

/**
 * POST — upload a new watermark. Saved as its OWN preset (unique, immutable S3
 * key) and set active. Because the key is unique there's no CDN cache collision
 * — the replacement shows immediately (the old "no se reemplaza" bug). The
 * previously active watermark stays saved as a preset, so nothing is lost.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isS3Configured()) return NextResponse.json({ error: "Storage not configured" }, { status: 500 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
  }
  const name = ((form.get("name") as string | null) ?? file.name.replace(/\.[^.]+$/, "")).slice(0, 60) || "Marca de agua";

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    // Preserve any legacy active watermark that isn't a preset yet.
    const anyPreset = await db.watermarkPreset.count();
    if (anyPreset === 0 && (await objectExists(WATERMARK_KEY))) {
      const legacy = await db.watermarkPreset.create({ data: { name: "Anterior", storageKey: "" } });
      const lk = presetKey(legacy.id);
      await copyObject(WATERMARK_KEY, lk);
      await db.watermarkPreset.update({ where: { id: legacy.id }, data: { storageKey: lk } });
    }

    // Store the new one at a unique key, then mirror to the active key.
    const preset = await db.watermarkPreset.create({ data: { name, storageKey: "" } });
    const key = presetKey(preset.id);
    await uploadObject(key, buffer, "image/png");
    await copyObject(key, WATERMARK_KEY);

    await db.watermarkPreset.updateMany({ where: { isActive: true }, data: { isActive: false } });
    await db.watermarkPreset.update({ where: { id: preset.id }, data: { storageKey: key, isActive: true } });

    invalidateWatermarkCache();
    void createCFInvalidation([`/${WATERMARK_KEY}`]);
    return NextResponse.json({ ok: true, presetId: preset.id });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
