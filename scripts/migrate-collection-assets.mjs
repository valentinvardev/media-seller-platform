// Migrate Collection cover/logo/banner images from Supabase Storage to S3.
// Reads all Collection rows and copies any coverUrl/logoUrl/bannerUrl that
// looks like a storage key (not a full URL) from Supabase bucket "photos"
// to s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX}/${key}.
//
// Idempotent: skips if already in S3.
// Run from project root: node scripts/migrate-collection-assets.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

try {
  const envFile = readFileSync(path.join(__dirname, "..", ".env"), "utf8");
  for (const line of envFile.split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    const [, key, rawVal] = m;
    if (process.env[key] !== undefined) continue;
    let val = rawVal.trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
} catch (e) {
  console.error("Could not load .env:", e.message);
}

const { PrismaClient } = await import("../generated/prisma/index.js");
const { S3Client, PutObjectCommand, HeadObjectCommand } = await import("@aws-sdk/client-s3");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const S3_BUCKET = process.env.AWS_S3_BUCKET;
const S3_PREFIX = (process.env.AWS_S3_PREFIX || "").replace(/^\/+|\/+$/g, "");

const s3 = new S3Client({ region: process.env.AWS_REGION || "us-east-2" });
const db = new PrismaClient();

async function existsInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err.name === "NotFound") return false;
    throw err;
  }
}

async function migrate(storageKey) {
  if (!storageKey || storageKey.startsWith("http")) {
    return { skipped: true, reason: "not a storage key" };
  }
  const s3Key = `${S3_PREFIX}/${storageKey}`;
  if (await existsInS3(s3Key)) {
    return { skipped: true, reason: "already in S3" };
  }
  const url = `${SUPABASE_URL}/storage/v1/object/photos/${encodeURI(storageKey)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: s3Key,
      Body: buf,
      ContentType: res.headers.get("content-type") || "application/octet-stream",
    }),
  );
  return { uploaded: true, size: buf.length };
}

const collections = await db.collection.findMany({
  select: { id: true, title: true, coverUrl: true, logoUrl: true, bannerUrl: true },
});

console.log(`Migrating assets for ${collections.length} collections to s3://${S3_BUCKET}/${S3_PREFIX}/\n`);

let uploaded = 0,
  skipped = 0,
  failed = 0;

for (const c of collections) {
  for (const [field, key] of [
    ["coverUrl", c.coverUrl],
    ["logoUrl", c.logoUrl],
    ["bannerUrl", c.bannerUrl],
  ]) {
    if (!key) continue;
    try {
      const r = await migrate(key);
      if (r.uploaded) {
        uploaded++;
        console.log(`  ✓ ${c.title} · ${field} · ${key} (${(r.size / 1024).toFixed(0)} KB)`);
      } else {
        skipped++;
      }
    } catch (e) {
      failed++;
      console.log(`  ✗ ${c.title} · ${field} · ${key} — ${e.message}`);
    }
  }
}

console.log(`\nDone. uploaded:${uploaded} skipped:${skipped} failed:${failed}`);
await db.$disconnect();
