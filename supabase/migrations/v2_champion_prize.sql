-- Migración V2: champion_config, prize_config y champion_predictions
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar columnas a la tabla pools
ALTER TABLE pools
  ADD COLUMN IF NOT EXISTS champion_config JSONB,
  ADD COLUMN IF NOT EXISTS prize_config    JSONB;

-- 2. Agregar columna stage a matches (para detectar fase eliminatoria)
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'GROUP_STAGE';

-- 3. Crear tabla de predicciones de campeón
CREATE TABLE IF NOT EXISTS pool_champion_predictions (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pool_id      UUID REFERENCES pools(id)    ON DELETE CASCADE NOT NULL,
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  champion     TEXT,
  runner_up    TEXT,
  third_place  TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pool_id, user_id)
);

-- 4. RLS para pool_champion_predictions
ALTER TABLE pool_champion_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "champion_pred_select" ON pool_champion_predictions
  FOR SELECT USING (true);

CREATE POLICY "champion_pred_insert" ON pool_champion_predictions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "champion_pred_update" ON pool_champion_predictions
  FOR UPDATE USING (auth.uid() = user_id);
