// Normaliza Photo.bibNumber al formato canónico "a,b,c" — sin espacios
// alrededor de las comas, sin elementos vacíos, "" convertido a NULL.
//
// Por qué: los matchers de src/lib/bib-match.ts parten el CSV por "," exacto
// para comparar dorsales enteros. Si una fila guarda "103, 1042", el elemento
// "1042" queda con un espacio adelante y deja de matchear.
//
// Es idempotente: correrlo dos veces no cambia nada la segunda vez.
//
// Dry-run (default, no escribe):
//   node scripts/normalize-bib-numbers.mjs
// Aplicar de verdad:
//   node scripts/normalize-bib-numbers.mjs --apply
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const l of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = /^([A-Z_0-9]+)\s*=\s*"?([^"\r\n]*)"?/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { PrismaClient } = await import(pathToFileURL(path.join(ROOT, "generated/prisma/index.js")).href);

const APPLY = process.argv.includes("--apply");
const db = new PrismaClient();

// Misma lógica que normalizeBibNumber() en src/lib/bib-match.ts.
const normalize = (raw) => {
  if (raw == null) return null;
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(",") : null;
};

const rows = await db.photo.findMany({
  where: { bibNumber: { not: null } },
  select: { id: true, bibNumber: true },
});

const dirty = rows.filter((r) => normalize(r.bibNumber) !== r.bibNumber);

console.log(`[normalize-bibs] ${rows.length} fotos con dorsal, ${dirty.length} a corregir`);
for (const r of dirty.slice(0, 20)) {
  console.log(`  ${r.id}  ${JSON.stringify(r.bibNumber)} -> ${JSON.stringify(normalize(r.bibNumber))}`);
}
if (dirty.length > 20) console.log(`  ... y ${dirty.length - 20} más`);

if (!APPLY) {
  console.log("[normalize-bibs] dry-run — nada escrito. Correr con --apply para aplicar.");
} else {
  for (const r of dirty) {
    await db.photo.update({ where: { id: r.id }, data: { bibNumber: normalize(r.bibNumber) } });
  }
  console.log(`[normalize-bibs] OK — ${dirty.length} filas actualizadas`);
}

await db.$disconnect();
