// Backup nocturno de la base a S3 — reemplaza los backups automáticos que se
// pierden al bajar de Supabase Pro a Free.
//
// Hace pg_dump (comprimido) de la DB y lo sube a s3://<bucket>/db-backups/,
// FUERA del prefijo de media (altafoto/), así el s3-orphan-audit nunca lo toca.
// Al terminar, borra los backups de más de RETENTION_DAYS.
//
// Requisitos en el VPS: pg_dump (apt-get install postgresql-client-16), node.
// Correr:  node scripts/db-backup.mjs
// Cron:    0 4 * * *  cd ~/media-seller-platform && node scripts/db-backup.mjs >> ~/db-backup.log 2>&1
import fs from "fs";
import path from "path";
import os from "os";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { createGzip } from "zlib";
import { pipeline } from "stream/promises";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const l of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = /^([A-Z_0-9]+)=("?)([^"\r\n]*)\2/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[3];
}

const RETENTION_DAYS = 30;
const BUCKET = process.env.AWS_S3_BUCKET;
const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-2";
// pg_dump needs a DIRECT (non-pooler) connection — use DIRECT_URL (port 5432).
const DB_URL = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!DB_URL || !BUCKET) { console.error("Falta DIRECT_URL o AWS_S3_BUCKET"); process.exit(1); }

const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } =
  await import("@aws-sdk/client-s3");
const s3 = new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });

const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
const key = `db-backups/altafoto-${stamp}.sql.gz`;
const tmp = path.join(os.tmpdir(), `altafoto-${stamp}.sql.gz`);

// 1) pg_dump | gzip → archivo temporal
console.log(`[backup] pg_dump → ${tmp}`);
await new Promise((resolve, reject) => {
  const dump = spawn("pg_dump", [DB_URL, "--no-owner", "--no-privileges"], { stdio: ["ignore", "pipe", "inherit"] });
  const gz = createGzip();
  const out = fs.createWriteStream(tmp);
  dump.on("error", reject);
  dump.on("close", (code) => { if (code !== 0) reject(new Error("pg_dump exit " + code)); });
  pipeline(dump.stdout, gz, out).then(resolve).catch(reject);
});

const bytes = fs.statSync(tmp).size;
if (bytes < 1000) { console.error("[backup] dump sospechosamente chico, aborto"); fs.unlinkSync(tmp); process.exit(1); }

// 2) Subir a S3
console.log(`[backup] subiendo ${(bytes / 1024 / 1024).toFixed(2)} MB → s3://${BUCKET}/${key}`);
await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: fs.createReadStream(tmp), ContentType: "application/gzip" }));
fs.unlinkSync(tmp);

// 3) Prune: borrar backups de más de RETENTION_DAYS
const cutoff = Date.now() - RETENTION_DAYS * 24 * 3600 * 1000;
let tok, old = [];
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "db-backups/", ContinuationToken: tok }));
  for (const o of (r.Contents || [])) if (o.LastModified && o.LastModified.getTime() < cutoff) old.push({ Key: o.Key });
  tok = r.IsTruncated ? r.NextContinuationToken : undefined;
} while (tok);
if (old.length) {
  await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: old, Quiet: true } }));
  console.log(`[backup] borrados ${old.length} backups > ${RETENTION_DAYS} días`);
}
console.log("[backup] OK");
