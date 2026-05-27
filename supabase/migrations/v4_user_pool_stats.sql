-- Migración V4: estadísticas históricas por participación
-- Ejecutar en Supabase SQL Editor ANTES del lanzamiento en Google Play
-- No requiere cambios en el código de la app — un trigger lo maneja todo.

-- ─── 1. Tabla principal ────────────────────────────────────────────────────────

CREATE TABLE user_pool_stats (
  id                 uuid DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Relaciones
  user_id            uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  pool_id            uuid REFERENCES pools(id)    ON DELETE SET NULL,
    -- SET NULL (no CASCADE) → cuando la polla expire y se borre,
    -- el historial queda con pool_id = NULL pero todos los demás datos intactos

  -- Datos denormalizados (sobreviven al borrado de la polla)
  pool_name          text NOT NULL DEFAULT '',
  tournament_type    text NOT NULL DEFAULT '',   -- código del torneo: 'WC', 'CL', 'PD', etc.

  -- Stats acumuladas (actualizadas por sync-results)
  total_points       int  NOT NULL DEFAULT 0,
  total_predictions  int  NOT NULL DEFAULT 0,    -- predicciones ingresadas
  total_correct      int  NOT NULL DEFAULT 0,    -- partidos donde ganó algún punto
  total_exact        int  NOT NULL DEFAULT 0,    -- marcadores exactos

  -- Stats del campeón (para implementar más adelante cuando haya infraestructura)
  champion_points    int  NOT NULL DEFAULT 0,

  -- Stats de cierre (rellenadas por cleanup_expired_pools antes del DELETE)
  final_rank         int,                        -- posición final en la clasificación
  total_participants int  NOT NULL DEFAULT 1,    -- participantes al momento del cierre
  pool_won           boolean NOT NULL DEFAULT false,  -- true si final_rank = 1
  finished_at        timestamptz,                -- null mientras la polla sigue activa

  created_at         timestamptz DEFAULT now(),

  -- Un solo registro por (usuario × polla activa)
  -- Los NULL en pool_id son distintos entre sí en PostgreSQL — correcto para historial
  UNIQUE (user_id, pool_id)
);

-- ─── 2. RLS ────────────────────────────────────────────────────────────────────

ALTER TABLE user_pool_stats ENABLE ROW LEVEL SECURITY;

-- Los usuarios ven solo sus propias stats
CREATE POLICY "usuarios ven sus propias stats"
  ON user_pool_stats FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE solo desde el service role (Edge Functions + triggers SECURITY DEFINER)
-- No hay políticas para escritura del cliente → intencionalmente bloqueado para evitar trampa

-- ─── 3. Trigger: crear fila inicial al unirse a una polla ──────────────────────
-- Se dispara cuando alguien entra como participante (creador o miembro)
-- Funciona tanto para createPool() como para joinPool() en AppContext
-- sin necesidad de ningún cambio en el código TypeScript.

CREATE OR REPLACE FUNCTION create_initial_pool_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER   -- necesita escribir en user_pool_stats sin pasar por RLS
AS $$
DECLARE
  v_pool_name text;
  v_pool_type text;
BEGIN
  -- Leer nombre y tipo de la polla recién unida
  SELECT name, type
    INTO v_pool_name, v_pool_type
    FROM pools
   WHERE id = NEW.pool_id;

  -- Crear fila inicial con puntos en 0
  -- ON CONFLICT DO NOTHING → seguro si el trigger se dispara dos veces
  INSERT INTO user_pool_stats (user_id, pool_id, pool_name, tournament_type)
  VALUES (NEW.user_id, NEW.pool_id, COALESCE(v_pool_name, ''), COALESCE(v_pool_type, ''))
  ON CONFLICT (user_id, pool_id) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pool_participant_join
  AFTER INSERT ON pool_participants
  FOR EACH ROW
  EXECUTE PROCEDURE create_initial_pool_stats();

-- ─── 4. Actualizar cleanup_expired_pools para cerrar stats antes de borrar ──────
-- Reemplaza la función del v3. La lógica de borrado es idéntica;
-- se añade el bloque de cierre de estadísticas ANTES del DELETE.

CREATE OR REPLACE FUNCTION cleanup_expired_pools()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_expired_ids uuid[];
BEGIN
  -- ── Paso 1: Identificar pollas expiradas ─────────────────────────────────────
  --   Condiciones:
  --     a) Al menos un partido
  --     b) Todos los partidos tienen resultado
  --     c) El último partido se jugó hace más de 7 días (según utc_date)

  SELECT ARRAY(
    SELECT s.pool_id
    FROM (
      SELECT
        m.pool_id,
        COUNT(*)                                                        AS total_matches,
        COUNT(*) FILTER (WHERE m.home_score IS NULL
                           OR  m.away_score IS NULL)                    AS pending_matches,
        MAX(m.utc_date)                                                 AS last_match_utc
      FROM matches m
      GROUP BY m.pool_id
    ) s
    WHERE s.total_matches  > 0
      AND s.pending_matches = 0
      AND s.last_match_utc IS NOT NULL
      AND s.last_match_utc < NOW() - INTERVAL '7 days'
  ) INTO v_expired_ids;

  -- Nada que hacer si no hay pollas expiradas
  IF array_length(v_expired_ids, 1) IS NULL THEN
    RETURN;
  END IF;

  -- ── Paso 2: Cerrar estadísticas ANTES del DELETE ─────────────────────────────
  --   Calcula final_rank (RANK por total_points desc dentro de cada polla)
  --   y total_participants, luego marca finished_at = NOW()

  UPDATE user_pool_stats ups
  SET
    final_rank         = ranked.rnk,
    pool_won           = (ranked.rnk = 1),
    total_participants = ranked.participant_count,
    finished_at        = NOW()
  FROM (
    SELECT
      ups2.user_id,
      ups2.pool_id,
      RANK() OVER (
        PARTITION BY ups2.pool_id
        ORDER BY ups2.total_points DESC
      )                                    AS rnk,
      COUNT(*) OVER (PARTITION BY ups2.pool_id) AS participant_count
    FROM user_pool_stats ups2
    WHERE ups2.pool_id = ANY(v_expired_ids)
      AND ups2.finished_at IS NULL    -- evitar re-cerrar si ya se procesó
  ) ranked
  WHERE ups.user_id = ranked.user_id
    AND ups.pool_id = ranked.pool_id;

  -- ── Paso 3: Borrar pollas ────────────────────────────────────────────────────
  --   CASCADE borra: matches, pool_participants, predictions, pool_champion_predictions
  --   SET NULL en user_pool_stats.pool_id → historial queda intacto

  DELETE FROM pools WHERE id = ANY(v_expired_ids);

END;
$$;

-- ─── Verificaciones (ejecutar manualmente para confirmar) ─────────────────────
-- SELECT * FROM user_pool_stats LIMIT 10;
-- SELECT * FROM information_schema.triggers WHERE trigger_name = 'on_pool_participant_join';
