// Dry-run: encuentra objetos en el bucket S3 que NO tienen fila en la DB
// (originales + previews de eventos borrados que nunca se limpiaron).
// NO borra nada — solo mide cuántos son, cuánto pesan y cuánto cuestan.
//
// Correr en el VPS (tiene las credenciales AWS en .env):
//   node scripts/s3-orphan-audit.mjs
//
// Para borrarlos de verdad, después de revisar la salida:
//   node scripts/s3-orphan-audit.mjs --delete
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
// Resolve everything from the repo root so the script works from any cwd.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const l of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = /^([A-Z_0-9]+)\s*=\s*"?([^"\r\n]*)"?/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { S3Client, ListObjectsV2Command, DeleteObjectsCommand } = await import("@aws-sdk/client-s3");
const { PrismaClient } = await import(pathToFileURL(path.join(ROOT, "generated/prisma/index.js")).href);

const DELETE = process.argv.includes("--delete");
const BUCKET = process.env.AWS_S3_BUCKET;
const PREFIX = process.env.AWS_S3_PREFIX ? process.env.AWS_S3_PREFIX.replace(/\/?$/, "/") : "";
const region = process.env.AWS_S3_REGION || process.env.AWS_REGION || "us-east-2";
const s3 = new S3Client({ region, credentials: { accessKeyId: process.env.AWS_ACCESS_KEY_ID, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY } });
const db = new PrismaClient();

// 1) Todas las keys "vivas" según la DB (con el prefijo aplicado, como en S3).
const withPrefix = (k) => (k.startsWith("http") ? k : PREFIX + k);
const live = new Set();
const photos = await db.photo.findMany({ select: { storageKey: true, previewKey: true } });
for (const p of photos) {
  if (p.storageKey && !p.storageKey.startsWith("http")) live.add(withPrefix(p.storageKey));
  if (p.previewKey && !p.previewKey.startsWith("http")) live.add(withPrefix(p.previewKey));
}
const cols = await db.collection.findMany({ select: { coverUrl: true, logoUrl: true, bannerUrl: true } });
for (const c of cols) for (const a of [c.coverUrl, c.logoUrl, c.bannerUrl]) if (a && !a.startsWith("http")) live.add(withPrefix(a));

// PROTEGIDO: la marca de agua (WATERMARK_KEY = "watermarks/active.png") no vive
// en ninguna tabla. Blindamos TODO el prefijo watermarks/ para no borrarla nunca.
const PROTECTED_PREFIXES = [PREFIX + "watermarks/"];
const isProtected = (key) => PROTECTED_PREFIXES.some((p) => key.startsWith(p));

console.log(`DB: ${live.size} objetos vivos referenciados. Escaneando bucket ${BUCKET} (prefix "${PREFIX || "-"}", ${region})...`);

// 2) Recorrer el bucket y separar los que NO están vivos.
let tok, scanned = 0, orphanBytes = 0, liveBytes = 0;
const orphans = [];
do {
  const r = await s3.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: PREFIX || undefined, ContinuationToken: tok, MaxKeys: 1000 }));
  for (const o of (r.Contents || [])) {
    scanned++;
    if (live.has(o.Key) || isProtected(o.Key)) { liveBytes += o.Size || 0; }
    else { orphans.push(o.Key); orphanBytes += o.Size || 0; }
  }
  tok = r.IsTruncated ? r.NextContinuationToken : undefined;
  process.stdout.write(`\r  escaneados ${scanned}...`);
} while (tok);

const gb = (b) => (b / 1024 / 1024 / 1024).toFixed(2);
console.log(`\n\nObjetos en el bucket: ${scanned}`);
console.log(`  Vivos (en la DB):   ${scanned - orphans.length}  (${gb(liveBytes)} GB)`);
console.log(`  HUERFANOS:          ${orphans.length}  (${gb(orphanBytes)} GB)`);
console.log(`  Costo huerfanos S3 Standard: ~$${(orphanBytes / 1024 / 1024 / 1024 * 0.023).toFixed(2)}/mes`);
if (orphans.length) {
  console.log("\n  Ejemplos:");
  for (const k of orphans.slice(0, 10)) console.log("    " + k);
}

if (DELETE && orphans.length) {
  console.log(`\nBORRANDO ${orphans.length} objetos huerfanos...`);
  for (let i = 0; i < orphans.length; i += 1000) {
    const chunk = orphans.slice(i, i + 1000);
    await s3.send(new DeleteObjectsCommand({ Bucket: BUCKET, Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true } }));
    process.stdout.write(`\r  borrados ${Math.min(i + 1000, orphans.length)}/${orphans.length}...`);
  }
  console.log("\nListo.");
} else if (orphans.length) {
  console.log("\n(dry-run — nada borrado. Corré con --delete para borrarlos.)");
}
await db.$disconnect();
