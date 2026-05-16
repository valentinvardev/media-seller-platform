// Migrate photos from Supabase Storage (bucket "photos") to AWS S3.
//
// Reads every Photo row from the DB, downloads the file by its `storageKey`
// from Supabase Storage, and uploads it to S3 under `${AWS_S3_PREFIX}/${storageKey}`.
//
// Safe to re-run: skips objects that already exist in S3 (HEAD check).
// Run from the project root:
//
//   node scripts/migrate-supabase-to-s3.mjs
//
// Required env (already in your .env):
//   DATABASE_URL or DIRECT_URL
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
//   AWS_S3_BUCKET, AWS_S3_PREFIX

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency)
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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!S3_BUCKET || !S3_PREFIX) {
  console.error("Missing AWS_S3_BUCKET or AWS_S3_PREFIX");
  process.exit(1);
}

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

async function downloadFromSupabase(storageKey) {
  const url = `${SUPABASE_URL}/storage/v1/object/photos/${encodeURI(storageKey)}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${SUPABASE_KEY}` },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${await res.text().catch(() => "")}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  return { body: buf, contentType };
}

async function uploadToS3(key, body, contentType) {
  await s3.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

async function migrateOne(photo) {
  const s3Key = `${S3_PREFIX}/${photo.storageKey}`;
  try {
    if (await existsInS3(s3Key)) {
      stats.skipped++;
      return;
    }
    const { body, contentType } = await downloadFromSupabase(photo.storageKey);
    await uploadToS3(s3Key, body, contentType);
    stats.uploaded++;
  } catch (err) {
    stats.failed++;
    errors.push({ id: photo.id, storageKey: photo.storageKey, error: err.message });
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
      if (done % 50 === 0 || done === stats.total) {
        const pct = ((done / stats.total) * 100).toFixed(1);
        console.log(`[${done}/${stats.total}] ${pct}% — uploaded:${stats.uploaded} skipped:${stats.skipped} failed:${stats.failed}`);
      }
    }
  });
  await Promise.all(workers);
}

async function main() {
  const photos = await db.photo.findMany({ select: { id: true, storageKey: true } });
  stats.total = photos.length;
  console.log(`\nMigrating ${photos.length} photos`);
  console.log(`  From: Supabase Storage bucket "photos"`);
  console.log(`  To:   s3://${S3_BUCKET}/${S3_PREFIX}/`);
  console.log(`  Concurrency: ${CONCURRENCY}\n`);

  const start = Date.now();
  await runPool(photos, migrateOne, CONCURRENCY);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  console.log(`\nDone in ${elapsed}s`);
  console.log(`  uploaded: ${stats.uploaded}`);
  console.log(`  skipped (already in S3): ${stats.skipped}`);
  console.log(`  failed: ${stats.failed}`);

  if (errors.length) {
    const errFile = `migration-errors-${Date.now()}.json`;
    writeFileSync(errFile, JSON.stringify(errors, null, 2));
    console.log(`  errors written to: ${errFile}`);
    process.exitCode = 1;
  }

  await db.$disconnect();
}

main().catch(async (err) => {
  console.error("Fatal:", err);
  await db.$disconnect();
  process.exit(1);
});
