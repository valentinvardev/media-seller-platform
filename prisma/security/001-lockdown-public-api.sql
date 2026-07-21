-- Lockdown: cerrar la Data API pública (PostgREST) de Supabase.
--
-- Contexto: esta app NO usa el SDK de Supabase — todo el acceso a datos pasa
-- por Prisma con la connection string del rol `postgres` (rolbypassrls = true).
-- Sin embargo, Supabase otorga por defecto permisos completos sobre las tablas
-- del schema `public` a los roles `anon` y `authenticated`, que son los que
-- expone PostgREST. Con RLS apagado eso significaba que cualquiera con la
-- anon key (pública por diseño) podía leer y escribir toda la base:
-- compras con downloadToken, usuarios, sesiones y el token de MercadoPago.
--
-- Este script es idempotente: se puede correr de nuevo sin efectos adversos.

-- 1) RLS en todas las tablas del schema. Sin políticas definidas, RLS deniega
--    todo a los roles que no tienen BYPASSRLS. Prisma (postgres) no se afecta.
--    Recorre las tablas dinámicamente para cubrir también los modelos que se
--    agreguen más adelante: basta con volver a correr este script.
DO $$
DECLARE t regclass;
BEGIN
  FOR t IN
    SELECT c.oid::regclass
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity
  LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', t);
    RAISE NOTICE 'RLS habilitado en %', t;
  END LOOP;
END $$;

-- 2) Quitar los permisos que PostgREST usa. La app no consume la Data API,
--    así que anon/authenticated no necesitan nada acá.
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;

-- 3) Evitar que las tablas futuras (cada `prisma db push`) vuelvan a heredar
--    esos permisos por los default privileges de Supabase.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
