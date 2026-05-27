-- Migración V3: política de borrado + limpieza automática de pollas expiradas
-- Ejecutar en Supabase SQL Editor

-- ─── 1. Política RLS para que el creador pueda borrar su propia polla ─────────
-- (La política UPDATE ya existe; solo falta DELETE)

CREATE POLICY "solo el creador puede borrar su polla"
  ON pools FOR DELETE
  USING (auth.uid() = creator_id);

-- ─── 2. Función SQL que limpia pollas expiradas ───────────────────────────────
-- Una polla está "expirada" si:
--   a) Todos sus partidos tienen resultado (home_score y away_score NOT NULL)
--   b) El último partido se jugó hace más de 7 días (según utc_date)
--   c) Tiene al menos un partido (evitar borrar pollas vacías/en construcción)
--
-- El CASCADE en las FK borra automáticamente:
--   matches, pool_participants, predictions, pool_champion_predictions

CREATE OR REPLACE FUNCTION cleanup_expired_pools()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- se ejecuta con permisos de superusuario (necesario para pg_cron)
AS $$
BEGIN
  DELETE FROM pools
  WHERE id IN (
    SELECT s.pool_id
    FROM (
      SELECT
        m.pool_id,
        COUNT(*)                                                       AS total_matches,
        COUNT(*) FILTER (WHERE m.home_score IS NULL
                           OR  m.away_score IS NULL)                   AS pending_matches,
        MAX(m.utc_date)                                                AS last_match_utc
      FROM matches m
      GROUP BY m.pool_id
    ) s
    WHERE s.total_matches  > 0          -- la polla tiene partidos
      AND s.pending_matches = 0         -- todos finalizados
      AND s.last_match_utc IS NOT NULL  -- tiene fecha UTC registrada
      AND s.last_match_utc < NOW() - INTERVAL '7 days'
  );
END;
$$;

-- ─── 3. Cron diario a las 3:00 AM UTC ─────────────────────────────────────────
-- Requiere que pg_cron esté habilitado en el proyecto Supabase
-- (Dashboard → Database → Extensions → pg_cron → Enable)

SELECT cron.schedule(
  'cleanup-expired-pools',   -- nombre del job
  '0 3 * * *',               -- cada día a las 3 AM UTC
  $$ SELECT cleanup_expired_pools(); $$
);

-- ─── Para verificar que el cron quedó registrado ──────────────────────────────
-- SELECT * FROM cron.job WHERE jobname = 'cleanup-expired-pools';

-- ─── Para eliminar el cron si fuera necesario ─────────────────────────────────
-- SELECT cron.unschedule('cleanup-expired-pools');

-- ─── Para ejecutar la limpieza manualmente (prueba) ──────────────────────────
-- SELECT cleanup_expired_pools();
