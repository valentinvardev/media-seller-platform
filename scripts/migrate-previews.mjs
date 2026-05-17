// Migrate photo previews (watermarked thumbnails) from Supabase Storage to S3.
// Reads every Photo row that has a previewKey, downloads from Supabase bucket
// "photos" and uploads to s3://${AWS_S3_BUCKET}/${AWS_S3_PREFIX}/${previewKey}.
//
// Idempotent: HEAD-check skips objects already in S3.
// Run from project root: node scripts/migrate-previews.mjs

import { readFileSync, writeFileSync } from "node:fs";
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

const CONCURRENCY = 10;
const stats = { skipped: 0, uploaded: 0, failed: 0, total: 0 };
const errors = [];

async function existsInS3(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return true;
  } catch (err) {
    if (err?.$metadata?.httpStatusCode === 404 || err.name === "NotFound") return false;
    throw err;
  }
}

async function migrateOne(photo) {
  const s3Key = `${S3_PREFIX}/${photo.previewKey}`;
  try {
    if (await existsInS3(s3Key)) {
      stats.skipped++;
      return;
    }
    const url = `${SUPABASE_URL}/storage/v1/object/photos/${encodeURI(photo.previewKey)}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${SUPABASE_KEY}` } });
    if (!res.ok) throw new Error(`Supabase ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: s3Key,
        Body: buf,
        ContentType: res.headers.get("content-type") || "image/jpeg",
      }),
    );
    stats.uploaded++;
  } catch (err) {
    stats.failed++;
    errors.push({ id: photo.id, previewKey: photo.previewKey, error: err.message });
  }
}

async function runPool(items, worker, concurrency) {
  let i = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      await worker(items[idx]);
      const done = stats.skipped + stats.uploaded + stats.failed;
      if (done % 100 === 0 || done === stats.total) {
        const pct = ((done / stats.total) * 100).toFixed(1);
        console.log(`[${done}/${stats.total}] ${pct}% — uploaded:${stats.uploaded} skipped:${stats.skipped} failed:${stats.failed}`);
      }
    }
  });
  await Promise.all(workers);
}

const photos = await db.photo.findMany({
  where: { previewKey: { not: null } },
  select: { id: true, previewKey: true },
});
stats.total = photos.length;
console.log(`\nMigrating ${photos.length} previews to s3://${S3_BUCKET}/${S3_PREFIX}/\n`);

const start = Date.now();
await runPool(photos, migrateOne, CONCURRENCY);
const elapsed = ((Date.now() - start) / 1000).toFixed(1);

console.log(`\nDone in ${elapsed}s`);
console.log(`  uploaded: ${stats.uploaded}`);
console.log(`  skipped (already in S3): ${stats.skipped}`);
console.log(`  failed: ${stats.failed}`);

if (errors.length) {
  const errFile = `preview-migration-errors-${Date.now()}.json`;
  writeFileSync(errFile, JSON.stringify(errors, null, 2));
  console.log(`  errors written to: ${errFile}`);
  process.exitCode = 1;
}

await db.$disconnect();
