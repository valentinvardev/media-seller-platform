# Plan: migrar Supabase Pro → Free

**Objetivo:** dejar de pagar Supabase Pro (~USD 25/mes) sin perder nada crítico.

## Contexto (medido)

- La base pesa **41 MB**. Límite Free = **500 MB** → 8% usado. Las imágenes viven
  en S3, la DB es solo metadata. Aun creciendo 10× seguimos cómodos.
- Supabase ya NO se usa para storage (todo en S3) ni para la Data API (la cerramos
  con RLS). Es puramente Postgres vía Prisma.
- En capacidad/cómputo, **Free sobra**. Lo único que Pro daba y hay que reemplazar:
  1. **Backups automáticos** (Free no tiene ninguno) ← crítico, hay datos de compras.
  2. **No auto-pausa** (Free pausa tras 7 días sin actividad) ← riesgo solo si el
     tráfico es estacional.

## Paso 0 — Verificaciones previas (en el dashboard, antes de tocar nada)

- [ ] **¿La organización tiene otros proyectos?** El plan es por *organización*.
      Si Cuervito (u otro) está en la MISMA org, bajar a Free los afecta a todos
      (límite 500 MB y pausa por proyecto; Free permite máx 2 proyectos activos).
      Si están en orgs separadas, son independientes. **Confirmar esto primero.**
- [ ] **¿Hay add-ons Pro activos?** (PITR, compute upgrade, réplicas, custom
      domain). Free no los permite — hay que desactivarlos antes de bajar.
- [ ] Confirmar que la base está < 500 MB (hoy 41 MB ✓).

## Paso 1 — Backups propios (HACER ANTES DE BAJAR) ⚠️

Sin esto no se baja. Ya está el script: `scripts/db-backup.mjs`.
Hace `pg_dump` comprimido y lo sube a `s3://<bucket>/db-backups/` (fuera del
prefijo de media, así el s3-orphan-audit nunca lo borra). Retiene 30 días.

En el VPS:

```bash
# 1. Instalar pg_dump (cliente Postgres 16, la major de Supabase)
sudo apt-get update && sudo apt-get install -y postgresql-client-16

# 2. Traer el código y probar el backup a mano
cd ~/media-seller-platform && git pull
node scripts/db-backup.mjs
# Debe imprimir "[backup] OK" y dejar un archivo en s3://.../db-backups/

# 3. Verificar que subió (en la consola S3, prefijo db-backups/)

# 4. Programar el cron (4 AM todos los días)
crontab -e
# agregar esta línea:
0 4 * * * cd ~/media-seller-platform && /usr/bin/node scripts/db-backup.mjs >> ~/db-backup.log 2>&1
```

- [ ] `postgresql-client-16` instalado
- [ ] Backup manual corrió y subió a S3
- [ ] Cron agregado
- [ ] Probar una restauración de prueba (ver "Cómo restaurar" abajo) — un backup
      que nunca restauraste no es un backup.

## Paso 2 — Anti-pausa (solo si el tráfico es estacional)

Si hay semanas sin ventas, la DB Free se pausa. El propio cron de backup ya la
toca cada día (el pg_dump cuenta como actividad), así que **con el backup diario
andando, la pausa deja de ser un problema** — la base se "usa" cada noche.
No hace falta un ping extra.

## Paso 3 — Chequear límites de conexión de Free

- Seguimos usando el pooler de transacciones (DATABASE_URL, puerto 6543) con
  `connection_limit=15` (ver `src/server/db.ts`). Free soporta esto de sobra para
  un solo proceso Node en el VPS.
- `DIRECT_URL` (puerto 5432) se usa para migraciones (`prisma db push`) y para el
  pg_dump. En Free las conexiones directas son pocas — está bien, son operaciones
  puntuales.
- [ ] No cambia nada de config; solo confirmar que tras bajar no aparecen errores
      de "too many connections" en `pm2 logs`.

## Paso 4 — Bajar el plan

En el dashboard de Supabase → Organization → **Billing** → cambiar a **Free**.
- El proyecto, la URL, las credenciales y los datos **no cambian** — es el mismo
  proyecto, solo el plan. No hay que tocar el `.env` ni redeployar.
- [ ] Cambiar plan a Free

## Paso 5 — Smoke test post-downgrade

- [ ] La home y una colección cargan (`collection.list`, galería)
- [ ] Login al admin funciona
- [ ] Subir 2-3 fotos → se procesan (OCR + watermark)
- [ ] Búsqueda por dorsal y por selfie
- [ ] Una compra de prueba (o al menos que `/admin/ventas` liste)
- [ ] `pm2 logs` sin errores de conexión

## Paso 6 — Monitoreo primera semana

- [ ] Revisar `~/db-backup.log` cada mañana la primera semana
- [ ] Confirmar que hay un `.sql.gz` nuevo por día en `s3://.../db-backups/`
- [ ] Ojo con lentitud de queries (Free es compute compartido chico; a este
      tamaño no debería notarse)

## Rollback

Si algo se complica, volver a Pro en el dashboard es **instantáneo** y no pierde
datos. El `.env` no cambió, así que no hay nada que revertir del lado del código.

## Cómo restaurar un backup (por las dudas)

```bash
# Bajar el backup de S3 y restaurar sobre la DB (¡esto sobrescribe!)
aws s3 cp s3://<bucket>/db-backups/altafoto-<fecha>.sql.gz .   # o vía consola
gunzip altafoto-<fecha>.sql.gz
psql "<DIRECT_URL>" < altafoto-<fecha>.sql
```

## Resumen de la decisión

| | Free + backups propios | Pro |
|---|---|---|
| Costo | **$0** | $25/mes |
| Tamaño (41 MB / 500 MB) | ✅ sobra | ✅ |
| Backups | script propio → S3 (diario, 30 días) | automáticos |
| Pausa | cubierta por el cron diario | no pausa |
| Restauración | manual (pg_dump/psql) | 1 clic + PITR |

Para este proyecto, **Free + el backup diario es suficiente**. Lo único que se
resigna es la comodidad de restaurar con un clic y el PITR (recuperar a un minuto
exacto); con snapshots diarios el peor caso es perder hasta 24 h de datos — para
el volumen de escritura de esta plataforma, aceptable.
