# Migración: Supabase Postgres → Postgres 17 en Docker (VPS)

**Por qué:** la org de Supabase tiene 3 proyectos y Free permite 2, así que no se
puede bajar el plan sin borrar uno. Este proyecto se mueve al VPS, se borra de
Supabase y recién ahí se cancela Pro.

**Qué se verificó antes de escribir esto (2026-10-12, contra la base real):**

- Supabase corre **PostgreSQL 17.6**. Usamos la imagen `postgres:17` → misma major,
  dump/restore 1:1 sin conversiones.
- La base pesa 50 MB. Solo se usa el schema `public`: 13 tablas, **sin** funciones,
  triggers, policies, secuencias ni defaults que dependan de extensiones de Supabase.
  `uuid-ossp`/`pgcrypto` están instaladas pero nada en `public` las usa.
- La app es Prisma puro: no hay `$queryRaw`, no se usa Supabase Auth (next-auth +
  adapter Prisma), ni Storage (S3), ni Realtime. **Solo cambia `DATABASE_URL` y
  `DIRECT_URL`.**
- Ensayo completo hecho en local con Docker: dump → restore → `count(*)` idéntico en
  las 13 tablas (Photo 7525, FaceRecord 11549, Purchase 337…) → `prisma migrate diff`
  contra la base restaurada = "empty migration" (cero drift de schema).

**Lo que se resigna:** DB y app comparten máquina. Si el VPS muere, perdés hasta 24 h
(el último backup nocturno en S3). Pro daba PITR y restore con un clic; Free no daba
nada de eso igual.

---

## Archivos nuevos

| Archivo | Qué es |
|---|---|
| `deploy/docker-compose.db.yml` | Postgres 17, puerto solo en `127.0.0.1`, volumen `altafoto-pgdata`, healthcheck, log de queries > 500 ms |
| `deploy/db.env.example` | plantilla de credenciales → copiar a `deploy/db.env` (gitignored) |
| `scripts/db-migrate-to-docker.sh` | dump desde Supabase → restore en el contenedor → apaga RLS → compara `count(*)` por tabla. Falla si algo difiere |
| `scripts/db-backup.mjs` | ya existía; ahora con `PG_DUMP_CONTAINER=altafoto-db` usa el `pg_dump` del contenedor (no hay que instalar nada en el host) |

Dos detalles que el script ya resuelve y conviene saber por qué:

- El dump de Supabase trae `CREATE SCHEMA public` (allá el owner es otro rol). En una
  base nueva eso falla con "already exists", así que el script hace `DROP SCHEMA
  public CASCADE` antes de restaurar.
- Todas las tablas tienen `ENABLE ROW LEVEL SECURITY` sin ninguna policy (lo
  activamos para cerrar la Data API de Supabase). El owner de la tabla bypassea RLS,
  por eso Prisma anda igual; pero si algún día conectás con otro rol, cada tabla
  devuelve 0 filas sin error. El script lo apaga: ya no hay Data API que cerrar.

---

## Paso 0 — Antes de tocar nada

- [ ] Docker en el VPS: `docker --version && docker compose version`. Si falta:
      `curl -fsSL https://get.docker.com | sh && sudo usermod -aG docker $USER` (re-login).
- [ ] Espacio en disco: `df -h /`. Necesitás ~1 GB libre (imagen 450 MB + datos + dumps).
- [ ] RAM: `free -m`. Postgres con defaults usa ~150–250 MB. Si el VPS tiene 1 GB y ya
      va justo con Next + Sharp, considerá subir a 2 GB antes.
- [ ] **Un último backup a S3 desde Supabase**, por fuera de este proceso:
      `node scripts/db-backup.mjs` (con el `.env` todavía apuntando a Supabase).
- [ ] Anotar el `DIRECT_URL` actual de Supabase en un lugar seguro: es el rollback.

## Paso 1 — Levantar Postgres en el VPS

```bash
cd ~/media-seller-platform && git pull
cp deploy/db.env.example deploy/db.env
# editar deploy/db.env con una contraseña larga: openssl rand -base64 32 | tr -d '/+='
nano deploy/db.env

docker compose -f deploy/docker-compose.db.yml up -d
docker inspect -f '{{.State.Health.Status}}' altafoto-db   # esperar "healthy"
docker logs altafoto-db | tail -5
```

- [ ] `altafoto-db` healthy
- [ ] `ss -ltnp | grep 5432` muestra **solo** `127.0.0.1:5432` (no `0.0.0.0`)

## Paso 2 — Ventana de corte (~3 minutos de downtime)

Parar la app ANTES de dumpear, si no una compra que entra entre el dump y el cambio
de `.env` queda en Supabase y no en Docker.

```bash
# SOLO esta app: en el VPS conviven otros proyectos bajo el mismo pm2.
# altafoto-test es un resto de la prueba de S3 que apunta a la misma DB; se para y queda parado.
pm2 stop photoplatform altafoto-test

SUPABASE_URL="<DIRECT_URL de Supabase, puerto 5432>" bash scripts/db-migrate-to-docker.sh
```

El script termina con la tabla de conteos y las dos líneas para el `.env`. **Si dice
DIFERENCIAS, no sigas**: la app sigue apuntando a Supabase, con `pm2 start all`
volvés al estado anterior sin pérdida (`pm2 start photoplatform`).

```bash
nano .env
#   DATABASE_URL="postgresql://altafoto:<PASSWORD>@127.0.0.1:5432/altafoto"
#   DIRECT_URL="postgresql://altafoto:<PASSWORD>@127.0.0.1:5432/altafoto"
#   PG_DUMP_CONTAINER=altafoto-db
#   (dejá comentadas las URLs viejas de Supabase por si hay que volver)

pm2 start photoplatform
pm2 logs photoplatform --lines 50      # sin errores de conexión
```

Sobre Mercado Pago durante el corte: si un webhook llega mientras la app está
caída, MP lo reintenta solo. Igual, después del corte revisá en `/admin/ventas` que
no haya quedado una compra `PENDING` que en MP figure aprobada.

- [ ] Script terminó en OK
- [ ] `.env` cambiado, `pm2 start all`
- [ ] Copiar el `backups/supabase-public-<fecha>.sql.gz` fuera del VPS (scp a tu PC
      o a S3 `db-backups/`). Es la última foto de Supabase.

## Paso 3 — Smoke test

- [ ] Home y una colección cargan
- [ ] Login al admin
- [ ] Subir 2–3 fotos → se procesan (OCR + watermark + FaceRecord)
- [ ] Búsqueda por dorsal y por selfie
- [ ] `/admin/ventas` lista las 337 compras
- [ ] Compra de prueba de punta a punta (o al menos un webhook de MP llega y se procesa)
- [ ] `pm2 logs` limpio durante 10 minutos de uso

## Paso 4 — Backups nocturnos (sin esto no se borra Supabase)

```bash
node scripts/db-backup.mjs
# debe imprimir "[backup] via docker exec altafoto-db" y "[backup] OK"

# El VPS no tiene cron instalado; se usa el cron de pm2 (ya corre otros, ej. surcodia-cron).
# --no-autorestart: corre, termina, queda stopped hasta que el cron lo despierta.
pm2 start scripts/db-backup.mjs --name altafoto-db-backup --cron-restart="0 4 * * *" --no-autorestart --time
pm2 save
# logs: ~/.pm2/logs/altafoto-db-backup-out.log
```

**Probar una restauración** (un backup que nunca restauraste no es un backup):

```bash
aws s3 cp s3://<bucket>/db-backups/altafoto-<fecha>.sql.gz . && gunzip altafoto-<fecha>.sql.gz
docker exec altafoto-db psql -U altafoto -c "CREATE DATABASE restore_test;"
docker exec -i altafoto-db psql -U altafoto -d restore_test < altafoto-<fecha>.sql
docker exec altafoto-db psql -U altafoto -d restore_test -c 'select count(*) from "Purchase";'
docker exec altafoto-db psql -U altafoto -c "DROP DATABASE restore_test;"
```

- [ ] Backup manual OK en S3
- [ ] Cron agregado (pm2 `altafoto-db-backup`)
- [ ] Restore de prueba OK

## Paso 5 — Acceso desde tu PC (Prisma Studio, scripts)

Hasta hoy el `.env` local apuntaba directo a Supabase. Ahora la DB solo escucha en
localhost del VPS, así que se entra por túnel SSH:

```bash
ssh -N -L 5433:127.0.0.1:5432 usuario@vps
# en otra terminal, .env local:
#   DATABASE_URL="postgresql://altafoto:<PASSWORD>@127.0.0.1:5433/altafoto"
#   DIRECT_URL=…igual…
npx prisma studio
```

No abras el 5432 al mundo "para que sea más cómodo": una contraseña en un puerto
público es lo primero que escanean los bots.

## Paso 6 — Esperar y recién después borrar Supabase

**Estado 2026-10-12 23:30:** Pasos 0 a 4 hechos. App en Docker, latencia tRPC de 700–1900 ms → 4–41 ms, backup nocturno por pm2, restore de prueba OK (337 compras). Falta lo de abajo.

- [ ] **Al menos 7 días** con la app en Docker, backups diarios llegando a S3 y
      ninguna sorpresa. Durante este tiempo Supabase sigue vivo como rollback.
- [ ] Pausar el proyecto en Supabase (Settings → General → Pause) una semana más
      si querés un colchón extra. Pausado no cuenta como activo.
- [ ] Borrar el proyecto en Supabase.
- [ ] Organization → Billing → bajar a **Free**. Ojo: afecta a los OTROS 2 proyectos
      de la org (pierden backups automáticos, se pausan tras 7 días sin uso).
- [ ] Actualizar `src/app/privacidad/page.tsx`: hoy dice que la base está en
      Supabase (EE. UU.). Poner el proveedor y país reales del VPS.
- [ ] `pm2 delete altafoto-test` (resto de la prueba de S3, quedó parado).
- [ ] Borrar del `.env` las vars `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      y `SUPABASE_SERVICE_ROLE_KEY` (solo las leían los scripts viejos de migración de storage).

## Rollback

Mientras el proyecto de Supabase exista: volver las dos URLs del `.env` a las de
Supabase y `pm2 restart all`. Las compras hechas mientras estabas en Docker **no**
están en Supabase: antes de volver, dumpeá desde Docker y restaurá en Supabase
(mismo script al revés, a mano) o aceptá perderlas.

## Operación diaria

```bash
docker logs -f altafoto-db                                  # queries lentas (> 500 ms) y errores
docker exec -it altafoto-db psql -U altafoto -d altafoto    # consola SQL
docker compose -f deploy/docker-compose.db.yml pull && \
docker compose -f deploy/docker-compose.db.yml up -d        # actualizar a la última 17.x (minor, sin migrar datos)
docker system df                                            # espacio
```

Nunca uses `docker compose down -v`: el `-v` borra el volumen con la base.
