#!/usr/bin/env bash
# Migra la base de Supabase al Postgres en Docker del VPS.
#
# Qué hace:
#   1. pg_dump (solo schema public, sin owners ni grants) desde Supabase, usando
#      la imagen postgres:17 — no hace falta instalar pg_dump en el host.
#   2. Guarda una copia .sql.gz del dump en ./backups/ (fuera de git).
#   3. Restaura en el contenedor (DROP SCHEMA public primero: el dump trae su
#      propio CREATE SCHEMA porque en Supabase el owner es otro).
#   4. Apaga el flag ROW LEVEL SECURITY que Supabase dejó en cada tabla
#      (no hay policies; es un artefacto, y con un segundo rol devolvería 0 filas).
#   5. Compara count(*) tabla por tabla entre origen y destino. Si difiere, falla.
#
# Uso (en el VPS, con el contenedor ya levantado y la app DETENIDA con pm2):
#   SUPABASE_URL="postgresql://postgres.xxx:PASS@aws-1-us-east-2.pooler.supabase.com:5432/postgres" \
#     bash scripts/db-migrate-to-docker.sh
#
#   SUPABASE_URL = el DIRECT_URL actual (puerto 5432, NO el pooler 6543).
#   FORCE=1      = permite pisar un destino que ya tiene tablas (re-ejecución).
set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${SUPABASE_URL:?Falta SUPABASE_URL (el DIRECT_URL de Supabase, puerto 5432)}"
CONTAINER="${DB_CONTAINER:-altafoto-db}"
[ -f deploy/db.env ] || { echo "Falta deploy/db.env (ver deploy/db.env.example)"; exit 1; }
set -a; . deploy/db.env; set +a
DST_USER="$POSTGRES_USER"; DST_DB="$POSTGRES_DB"

psql_dst() { docker exec -i "$CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$DST_USER" -d "$DST_DB" "$@"; }
psql_src() { docker run --rm -i -e PGCONNECT_TIMEOUT=20 postgres:17 psql -v ON_ERROR_STOP=1 -q "$SRC" "$@"; }

docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{end}}' "$CONTAINER" 2>/dev/null | grep -q healthy \
  || { echo "El contenedor $CONTAINER no está healthy. ¿docker compose -f deploy/docker-compose.db.yml up -d?"; exit 1; }

STAMP=$(date +%Y%m%d-%H%M)
mkdir -p backups
DUMP="backups/supabase-public-$STAMP.sql"

echo "[1/5] pg_dump desde Supabase → $DUMP"
docker run --rm -e PGCONNECT_TIMEOUT=20 postgres:17 \
  pg_dump "$SRC" -n public --no-owner --no-privileges > "$DUMP"
BYTES=$(stat -c %s "$DUMP")
[ "$BYTES" -gt 100000 ] || { echo "Dump sospechosamente chico ($BYTES bytes). Abort."; exit 1; }
gzip -kf "$DUMP"
echo "      $((BYTES / 1024)) KB. Copia comprimida: $DUMP.gz (guardala también fuera del VPS)"

echo "[2/5] Chequeo del destino"
N=$(psql_dst -Atc "select count(*) from pg_tables where schemaname='public'")
if [ "$N" != "0" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "El destino ya tiene $N tablas. Si querés pisarlo: FORCE=1 $0"; exit 1
fi

echo "[3/5] Restore"
psql_dst -c "DROP SCHEMA IF EXISTS public CASCADE;"
psql_dst -o /dev/null < "$DUMP"

echo "[4/5] Apagando ROW LEVEL SECURITY (artefacto de Supabase)"
psql_dst -Atc "select format('ALTER TABLE %I.%I DISABLE ROW LEVEL SECURITY;', schemaname, tablename) from pg_tables where schemaname='public' and rowsecurity" \
  | psql_dst

echo "[5/5] Verificando count(*) por tabla (origen vs destino)"
COUNT_SQL=$(psql_dst -Atc "select string_agg(format('select %L as t, count(*) as n from %I.%I', tablename, schemaname, tablename), ' union all ' order by tablename) from pg_tables where schemaname='public'")
psql_src -Atc "$COUNT_SQL" > /tmp/counts-src.txt
psql_dst -Atc "$COUNT_SQL" > /tmp/counts-dst.txt
if diff /tmp/counts-src.txt /tmp/counts-dst.txt; then
  echo; cat /tmp/counts-dst.txt | tr '|' '='
  echo
  echo "OK. Conteos idénticos. Ahora en .env de la app:"
  echo "  DATABASE_URL=\"postgresql://$DST_USER:<PASSWORD>@127.0.0.1:${DB_PORT:-5432}/$DST_DB\""
  echo "  DIRECT_URL=\"postgresql://$DST_USER:<PASSWORD>@127.0.0.1:${DB_PORT:-5432}/$DST_DB\""
  echo "y después: pm2 restart all"
else
  echo "DIFERENCIAS entre origen y destino. NO cambies el .env. Revisá arriba."; exit 1
fi
