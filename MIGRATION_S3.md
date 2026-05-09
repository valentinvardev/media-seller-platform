# Migración Supabase Storage → AWS S3

Playbook completo para ejecutar la migración en **menos de 1 hora**. Pensado para que cuando arranques, ya tengas todo decidido y solo sigas pasos.

> **Pre-requisito**: este doc asume que ya tenés cuenta AWS, DB en Supabase Postgres (sigue igual, solo migra el **storage**), y MercadoPago/Resend/Auth funcionando.

> ⚠️ **Scope a validar antes de ejecutar**: este plan cubre solo Supabase Storage → S3. El repo de referencia [`photography-platform3`](https://github.com/valentinvardev/photography-platform3) puede tener cambios adicionales que no están reflejados acá (modelos de Prisma, rutas, componentes, lambdas de watermark, etc.). Antes de empezar la Parte B, hacer un diff explícito contra ese repo y agregar acá lo que falte. Ver sección **"Diffs vs photography-platform3"** al final.

---

## Backup y estrategia de rollback (HACER ANTES DE TOCAR NADA)

> Esta sección es **bloqueante**. No empezar la Parte B hasta tener los tres backups verificados.

### 0.1. Branch de seguridad con la versión actual ✅ HECHO

Estado actual (commit `f550dee` de `main`):

- ✅ Tag inmutable: `pre-s3-migration` (pusheado a origin)
- ✅ Branch paralela viva: `legacy/supabase-storage` (pusheada a origin, tracking configurado)
- ✅ De vuelta en `main` para seguir trabajando

Cómo usarlos durante/después de la migración:

```powershell
# Ver la versión legacy localmente
git checkout legacy/supabase-storage

# Hotfix urgente sobre la versión vieja (cliente necesita algo ya)
git checkout legacy/supabase-storage
# editar, commitear, push
# deploy al VPS apuntando a esta branch

# Tirar todo lo experimental en main y volver al snapshot exacto
git checkout main
git reset --hard pre-s3-migration

# Volver a main normal después de hotfix
git checkout main
```

Comandos que se corrieron para crear los backups (referencia, no re-ejecutar):

```powershell
git tag -a pre-s3-migration -m "Snapshot antes de migrar Supabase Storage -> S3"
git push origin pre-s3-migration
git branch legacy/supabase-storage
git push -u origin legacy/supabase-storage
```

### 0.2. Dump de la base de datos — ⏳ PENDIENTE (hacer antes de Parte C)
La DB **no cambia** en esta migración (Supabase Postgres sigue igual), pero igual conviene snapshot por si algo del script de migración de storage corrompe `storageKey`:

```powershell
# Reemplazar con tu DATABASE_URL real
pg_dump "postgresql://USER:PASS@HOST:5432/DB" -Fc -f "backups\db-pre-s3-$(Get-Date -Format yyyyMMdd-HHmm).dump"
```

Guardar el `.dump` fuera del repo (en OneDrive, Drive, o S3 mismo en otro bucket). Restore se hace con `pg_restore -d <url> <archivo>`.

### 0.3. Inventario del bucket Supabase actual — ⏳ PENDIENTE (hacer antes de Parte C)
Antes de empezar a copiar fotos, dejar registrado **cuántos objetos hay y qué tamaño total**:

```powershell
# Desde el repo, con las creds Supabase aún activas
node -e "import('@supabase/supabase-js').then(async ({createClient}) => { const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY); const { data } = await s.storage.from('photos').list('', { limit: 10000 }); console.log('objects:', data?.length); })"
```

Anotar el número en `backups/inventory.txt`. Después de la migración, comparar con `aws s3 ls s3://altafoto-prod --recursive | wc -l`. Si los conteos no coinciden, el script C1 falló silenciosamente en alguna foto.

### 0.4. Doble storage durante la transición
**No borrar el bucket de Supabase Storage hasta haber pasado al menos 1 semana en producción con S3 sin incidentes.** Cuesta unos centavos extra esa semana y es nuestro paracaídas real. Sin esta ventana, un bug raro que aparezca el día 3 deja al cliente sin las fotos.

### 0.5. Rollback plan resumido
Si algo explota en producción después de migrar:
1. `git revert <merge-commit>` o `git reset --hard pre-s3-migration` y redeployar (5 min).
2. La DB no se tocó: las keys siguen apuntando a paths que existen en Supabase Storage (porque no lo borramos, ver 0.4).
3. Sistema vuelve a funcionar exactamente como antes.

Si ya pasó más de 1 semana y borraste Supabase Storage, el rollback ya no es trivial — por eso 0.4 es la regla de oro.

---

## Estado actual (auditoría)

- Field `Photo.storageKey` en Prisma → **ya está**, no hace falta migrar schema.
- Env vars `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` → **ya están** en `src/env.js` (probablemente para Rekognition).
- 3 archivos de abstracción Supabase: `src/lib/supabase/{admin,server,client}.ts`
- 7 archivos consumidores que importan de `lib/supabase/admin`:
  - `src/app/api/uploads/sign/route.ts`
  - `src/app/api/uploads/sign-debug/route.ts`
  - `src/app/api/watermark-settings/route.ts`
  - `src/server/api/routers/photo.ts`
  - `src/server/api/routers/purchase.ts`
  - `src/server/api/routers/collection.ts`
  - `src/lib/photo-processing.ts`

---

## Parte A — Trámites AWS (hacer ANTES, fuera del cronómetro)

Estos pasos requieren consola AWS y propagación. Hacelos con anticipación.

### A1. Crear bucket S3
- Consola → S3 → Create bucket
- Nombre sugerido: `altafoto-prod` (debe ser único globalmente)
- Region: **us-east-2** (o la más cercana a tus usuarios)
- **Block all public access**: ✅ ON (los archivos se sirven con presigned URLs)
- Versioning: opcional (recomendado OFF al principio para no duplicar costos)
- Default encryption: SSE-S3 (gratis)

### A2. Configurar CORS del bucket
S3 → bucket → Permissions → CORS:
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "HEAD"],
    "AllowedOrigins": [
      "https://altafoto.com.ar",
      "https://www.altafoto.com.ar",
      "http://localhost:3000"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### A3. Crear IAM user para la app
- IAM → Users → Create user → `altafoto-app`
- **NO** dar console access, solo programmatic
- Adjuntar policy inline:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadWriteBucket",
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::altafoto-prod",
        "arn:aws:s3:::altafoto-prod/*"
      ]
    },
    {
      "Sid": "RekognitionUse",
      "Effect": "Allow",
      "Action": [
        "rekognition:DetectFaces",
        "rekognition:DetectText",
        "rekognition:IndexFaces",
        "rekognition:SearchFacesByImage",
        "rekognition:CreateCollection",
        "rekognition:DeleteFaces"
      ],
      "Resource": "*"
    }
  ]
}
```
- Generar Access Key → guardar `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`
- (Si ya tenés keys para Rekognition, podés reusarlas — verificá que la policy tenga los permisos S3 arriba)

### A4. (Opcional) Cloudflare proxy
Si querés esconder el dominio S3 detrás de tu propio dominio:
- Cloudflare DNS → CNAME `cdn.altafoto.com.ar` → `altafoto-prod.s3.us-east-2.amazonaws.com`
- Proxy: ON, Flexible SSL
- No es obligatorio para que funcione — los presigned URLs ya son seguros y rápidos.

---

## Parte B — Cambios de código (lo que se hace en la hora)

### B1. Instalar deps (1 min)
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

### B2. Agregar env vars faltantes (2 min)

**`.env` y `.env.production`:**
```
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
AWS_S3_BUCKET=altafoto-prod
AWS_S3_PREFIX=
```

**`src/env.js`** — agregar a `server.{...}` y `runtimeEnv`:
```js
AWS_S3_BUCKET: z.string().optional(),
AWS_S3_PREFIX: z.string().optional().default(""),
```
y en `runtimeEnv`:
```js
AWS_S3_BUCKET: process.env.AWS_S3_BUCKET,
AWS_S3_PREFIX: process.env.AWS_S3_PREFIX,
```

### B3. Crear `src/lib/s3.ts` (10 min)

API drop-in compatible con `lib/supabase/admin.ts`:

```ts
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

let _client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (!_client) {
    _client = new S3Client({
      region: env.AWS_REGION ?? "us-east-2",
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

const BUCKET = () => env.AWS_S3_BUCKET!;
const prefixed = (key: string) => (env.AWS_S3_PREFIX ? `${env.AWS_S3_PREFIX}/${key}` : key);

// Drop-in para reemplazar createSignedUrl() de Supabase
export async function createSignedUrl(storageKey: string, expiresIn: number): Promise<string | null> {
  if (storageKey.startsWith("http")) return storageKey;
  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: prefixed(storageKey) });
  return await getSignedUrl(getS3Client(), cmd, { expiresIn });
}

// Para /api/uploads/sign (devuelve URL para PUT directo)
export async function createUploadUrl(path: string, contentType?: string): Promise<{ signedUrl: string; path: string }> {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET(),
    Key: prefixed(path),
    ContentType: contentType,
  });
  const signedUrl = await getSignedUrl(getS3Client(), cmd, { expiresIn: 300 }); // 5 min
  return { signedUrl, path };
}

// Para photo-processing.ts (descargar bytes server-side, ej. para Rekognition)
export async function downloadObject(storageKey: string): Promise<Buffer> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET(), Key: prefixed(storageKey) });
  const res = await getS3Client().send(cmd);
  const chunks: Buffer[] = [];
  for await (const chunk of res.Body as AsyncIterable<Buffer>) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function deleteObject(storageKey: string): Promise<void> {
  const cmd = new DeleteObjectCommand({ Bucket: BUCKET(), Key: prefixed(storageKey) });
  await getS3Client().send(cmd);
}
```

### B4. Reemplazar imports en consumidores (15 min)

Es búsqueda y reemplazo. En cada archivo:

| Archivo | Cambio |
|---|---|
| `src/server/api/routers/photo.ts` | `from "~/lib/supabase/admin"` → `from "~/lib/s3"` |
| `src/server/api/routers/purchase.ts` | igual |
| `src/server/api/routers/collection.ts` | igual |
| `src/app/api/watermark-settings/route.ts` | igual |
| `src/lib/photo-processing.ts` | reemplazar `getAdminClient()` + `downloadWithRetry(supabase, key)` por `downloadObject(key)` |
| `src/app/api/uploads/sign/route.ts` | reescribir (ver B5) |
| `src/app/api/uploads/sign-debug/route.ts` | igual |

### B5. Reescribir `/api/uploads/sign/route.ts` (5 min)

```ts
import { NextResponse, type NextRequest } from "next/server";
import { auth } from "~/server/auth";
import { createUploadUrl } from "~/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as { path?: string; contentType?: string };
  if (!body.path) return NextResponse.json({ error: "path is required" }, { status: 400 });

  try {
    const { signedUrl, path } = await createUploadUrl(body.path, body.contentType);
    // Mantenemos shape compatible con lo que devolvía Supabase
    return NextResponse.json({ signedUrl, path, token: signedUrl });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
```

### B6. Adaptar el cliente de upload (10 min) — ⚠️ CRÍTICO

Supabase y S3 difieren en **cómo** se hace el PUT:

**Supabase** (lo actual):
```ts
await fetch(signedUrl, {
  method: "PUT",
  headers: { "x-upsert": "true" },  // header propio de Supabase
  body: file,
});
```

**S3** (lo nuevo):
```ts
await fetch(signedUrl, {
  method: "PUT",
  headers: { "Content-Type": file.type },  // ContentType DEBE coincidir con el de createUploadUrl
  body: file,
});
```

Buscar en `src/app/_components/admin/PhotoUploader.tsx` (y otros uploaders) las llamadas `fetch(signedUrl, ...)`:

```bash
# Para encontrarlas:
grep -rn "signedUrl" src/app/_components/admin/
```

Cambiar el header `x-upsert` por `Content-Type`, y pasar el `contentType` también al body del POST a `/api/uploads/sign`.

### B7. Limpieza (2 min)
- Borrar `src/lib/supabase/admin.ts`, `server.ts`, `client.ts` (después de verificar que ningún archivo los importa)
- Quitar `@supabase/supabase-js`, `@supabase/ssr` de `package.json`
- Quitar de `src/env.js`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `npm install` para regenerar lockfile

---

## Parte C — Migración de datos (10 min, en paralelo)

Si tenés fotos viejas en Supabase Storage que querés conservar:

### C1. Script de copia (correr una vez)

`scripts/migrate-storage.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { db } from "~/server/db";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const s3 = new S3Client({ region: process.env.AWS_REGION! });

async function main() {
  const photos = await db.photo.findMany({ select: { id: true, storageKey: true } });
  console.log(`Migrating ${photos.length} photos`);

  for (const photo of photos) {
    if (photo.storageKey.startsWith("http")) continue;

    const { data, error } = await supabase.storage.from("photos").download(photo.storageKey);
    if (error || !data) { console.error(`SKIP ${photo.id}: ${error?.message}`); continue; }

    const buffer = Buffer.from(await data.arrayBuffer());
    await s3.send(new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET!,
      Key: photo.storageKey, // misma key, no toca DB
      Body: buffer,
      ContentType: data.type,
    }));
    console.log(`OK ${photo.id}`);
  }
}
main().catch(console.error);
```

```bash
npx tsx scripts/migrate-storage.ts
```

> **Trick clave**: usar la **misma key** en S3 que tenías en Supabase. Así no hay que tocar la columna `storageKey` de la DB.

### C2. Migrar también covers/banners/logos
Si en Prisma hay `Collection.coverUrl/bannerUrl/logoUrl/watermarkStorageKey` con paths de Supabase, extender el script para esas tablas.

---

## Parte D — Verificación (5 min)

Checklist post-migración:

- [ ] Subir una foto nueva desde admin → debe aparecer en S3 console
- [ ] Refrescar galería pública → la foto se muestra (presigned URL funciona)
- [ ] Generar un purchase → el download token devuelve URLs válidas
- [ ] Revisar logs del servidor — ningún `Supabase Storage` warning
- [ ] OCR/face index sobre una foto recién subida → funciona (usa `downloadObject` de S3)
- [ ] Borrar una foto desde admin → desaparece de S3

---

## Variables de entorno — set completo final

```env
# === Auth & DB (sin cambios) ===
AUTH_SECRET=
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# === AWS — NUEVO/EXTENDIDO ===
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
AWS_S3_BUCKET=altafoto-prod
AWS_S3_PREFIX=                    # vacío o p.ej. "prod"

# === MercadoPago (sin cambios) ===
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
MP_CLIENT_ID=
MP_CLIENT_SECRET=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=

# === Resend (sin cambios) ===
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# === Admin/OCR (sin cambios) ===
ADMIN_EMAIL=
ADMIN_PASSWORD=
MODAL_OCR_URL=
MODAL_OCR_SAVE_URL=

# === App ===
NEXT_PUBLIC_BASE_URL=https://altafoto.com.ar

# === BORRAR después de migrar ===
# NEXT_PUBLIC_SUPABASE_URL=
# NEXT_PUBLIC_SUPABASE_ANON_KEY=
# SUPABASE_SERVICE_ROLE_KEY=
```

---

## Estimación de tiempos

| Fase | Tiempo | Bloqueante |
|---|---|---|
| **Antes** (AWS console) | 20 min | Hay que esperar propagación de IAM (~1 min) |
| B1 + B2 (deps + envs) | 3 min | — |
| B3 (lib/s3.ts) | 10 min | copy-paste de este doc |
| B4 (find/replace imports) | 15 min | — |
| B5 (sign route) | 5 min | copy-paste |
| B6 (cliente upload) | 10 min | testing manual |
| B7 (cleanup) | 2 min | — |
| C1 (data migration) | 10 min | corre en paralelo a B |
| D (verificación) | 5 min | — |
| **Total cronómetro** | **~50 min** | |

---

## Riesgos y rollback

- **Riesgo principal**: el cliente de upload (B6). Si el header `Content-Type` no coincide con lo firmado, S3 rechaza con 403. Probar primero con un archivo chico.
- **Rollback**: como las keys de DB no cambian, basta con revertir el commit y volver a `lib/supabase/admin.ts` — los archivos siguen estando en Supabase Storage **mientras no los borres**. Recomendado: dejar Supabase Storage vivo 1 semana después de migrar.
- **Costo durante doble-storage**: ~doble en GB-mes esa semana. Negligible para una colección típica de fotos.

---

## Post-migración (no urgente)

- Dar de baja el plan paid de Supabase Storage (mantener Postgres si lo usás de DB)
- (Opcional) Configurar S3 lifecycle: archivos en `previews/` que no se accedan en 90 días → Standard-IA
- (Opcional) Cloudflare CDN delante (ver A4)
- (Opcional) Replicar Lambda de watermark del repo `photography-platform3` si la carga server-side te queda chica

---

## Diffs vs `photography-platform3` (PENDIENTE — completar antes de migrar)

El repo de referencia: https://github.com/valentinvardev/photography-platform3

Antes de ejecutar Parte B, revisar y anotar acá las diferencias **más allá** de Supabase→S3. Sugerencia de áreas a comparar:

- [ ] `prisma/schema.prisma` — ¿hay campos/modelos nuevos? (ej. `watermarkStorageKey`, índices, tablas)
- [ ] `src/env.js` — ¿variables nuevas?
- [ ] `src/server/api/routers/` — ¿endpoints nuevos o cambios de input/output?
- [ ] `src/app/_components/admin/PhotoUploader*` — ¿cambió el flujo de upload (multipart, chunking, retries)?
- [ ] `src/lib/photo-processing.ts` — ¿cambió el pipeline OCR/face/watermark?
- [ ] `src/app/api/` — ¿rutas API nuevas (ej. webhook de Lambda watermark)?
- [ ] Infra: ¿hay terraform / SAM / CDK / cualquier cosa de AWS extra a desplegar?
- [ ] `package.json` — ¿deps nuevas más allá de `@aws-sdk/*`?

Forma rápida de hacer el diff:
```powershell
# Clonar el repo nuevo en una carpeta temporal y comparar
git clone https://github.com/valentinvardev/photography-platform3 ../photography-platform3
# Comparar carpetas relevantes
git diff --no-index ../photography-platform3/prisma/schema.prisma ./prisma/schema.prisma
git diff --no-index ../photography-platform3/src/env.js ./src/env.js
git diff --no-index ../photography-platform3/package.json ./package.json
```

Anotar cada diff relevante como un sub-item nuevo en Parte B con su propia estimación de tiempo.
