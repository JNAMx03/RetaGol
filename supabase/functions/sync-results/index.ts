import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/onesignal.ts';

// ─── Helpers de puntuación (espejo de utils/scoring.ts para Deno) ─────────────

interface ScoringConfig {
  resultado?: number;
  golesLocal?: number;
  golesVisitante?: number;
  diferencia?: number;
  dobleEliminatoria?: boolean;
}

const KNOCKOUT_STAGES = new Set([
  'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL', 'THIRD_PLACE',
]);

function calcPoints(
  pred:   { home_score: string; away_score: string },
  result: { homeScore: string; awayScore: string; stage?: string | null },
  config: ScoringConfig,
): number {
  const pH = parseInt(pred.home_score);
  const pA = parseInt(pred.away_score);
  const rH = parseInt(result.homeScore);
  const rA = parseInt(result.awayScore);

  if (isNaN(pH) || isNaN(pA) || isNaN(rH) || isNaN(rA)) return 0;

  const predOut = pH > pA ? 'H' : pH < pA ? 'A' : 'D';
  const realOut = rH > rA ? 'H' : rH < rA ? 'A' : 'D';

  let pts = 0;
  if (predOut === realOut)                           pts += config.resultado       ?? 0;
  if (pH === rH)                                     pts += config.golesLocal      ?? 0;
  if (pA === rA)                                     pts += config.golesVisitante  ?? 0;
  if (Math.abs(pH - pA) === Math.abs(rH - rA))       pts += config.diferencia      ?? 0;

  if ((config.dobleEliminatoria ?? false) && KNOCKOUT_STAGES.has(result.stage ?? '')) {
    pts *= 2;
  }

  return pts;
}

// ─── Handler principal ────────────────────────────────────────────────────────

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Partidos con api_id definido pero sin resultado todavía
  const { data: matches, error } = await supabase
    .from('matches')
    .select('*')
    .is('home_score', null)
    .not('api_id', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!matches || matches.length === 0) {
    return new Response(JSON.stringify({ updated: 0, total: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let updated = 0;
  const updatedPoolIds = new Set<string>();

  // ─── Actualizar marcadores desde football-data.org ────────────────────────

  for (const match of matches) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/matches/${match.api_id}`,
        { headers: { 'X-Auth-Token': Deno.env.get('FOOTBALL_DATA_KEY')! } },
      );

      const data = await res.json();

      if (data.status === 'FINISHED') {
        await supabase
          .from('matches')
          .update({
            home_score: String(data.score.fullTime.home ?? 0),
            away_score: String(data.score.fullTime.away ?? 0),
          })
          .eq('id', match.id);

        updatedPoolIds.add(match.pool_id);
        updated++;
      }
    } catch (e) {
      console.error(`Error sincronizando match ${match.id}:`, e);
    }
  }

  // ─── Notificar + actualizar stats por cada polla con cambios ──────────────

  for (const poolId of updatedPoolIds) {
    // ── Notificación push ────────────────────────────────────────────────────
    try {
      const { data: participants } = await supabase
        .from('pool_participants')
        .select('profiles(onesignal_player_id)')
        .eq('pool_id', poolId);

      const playerIds = (participants ?? [])
        .map((p: any) => p.profiles?.onesignal_player_id)
        .filter(Boolean);

      const { data: pool } = await supabase
        .from('pools')
        .select('name, type, scoring_config')
        .eq('id', poolId)
        .single();

      if (playerIds.length > 0) {
        await sendPushNotification(
          playerIds,
          'Resultado disponible',
          `Nuevos resultados en "${pool?.name ?? 'tu polla'}" — ¡revisa tu clasificación!`,
          { type: 'result', pool_id: poolId },
        );
      }

      // ── Actualizar user_pool_stats ─────────────────────────────────────────
      // Se ejecuta aunque no haya jugadores con push registrado
      if (!pool) continue;

      // 1. Todos los partidos finalizados de esta polla
      const { data: finishedMatches } = await supabase
        .from('matches')
        .select('id, home_score, away_score, stage')
        .eq('pool_id', poolId)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      if (!finishedMatches || finishedMatches.length === 0) continue;

      // Mapa rápido: match_id → resultado
      const resultMap = new Map(
        finishedMatches.map((m: any) => [
          m.id,
          { homeScore: String(m.home_score), awayScore: String(m.away_score), stage: m.stage },
        ]),
      );

      // 2. Todas las predicciones de esta polla
      const { data: allPredictions } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score')
        .eq('pool_id', poolId);

      if (!allPredictions || allPredictions.length === 0) continue;

      // 3. Agrupar predicciones por usuario
      const byUser = new Map<string, typeof allPredictions>();
      for (const pred of allPredictions) {
        if (!byUser.has(pred.user_id)) byUser.set(pred.user_id, []);
        byUser.get(pred.user_id)!.push(pred);
      }

      const config: ScoringConfig = pool.scoring_config ?? {};

      // 4. Calcular stats por participante y preparar upsert
      const statsRows: object[] = [];

      for (const [userId, preds] of byUser) {
        let totalPoints      = 0;
        let totalCorrect     = 0;
        let totalExact       = 0;
        const totalPredictions = preds.length;

        for (const pred of preds) {
          const result = resultMap.get(pred.match_id);
          if (!result) continue; // partido sin resultado aún → no contar

          const pts = calcPoints(pred, result, config);
          const isExact = pred.home_score === result.homeScore
                       && pred.away_score === result.awayScore;

          if (pts > 0) totalCorrect++;
          if (isExact) totalExact++;
          totalPoints += pts;
        }

        statsRows.push({
          user_id:           userId,
          pool_id:           poolId,
          pool_name:         pool.name,
          tournament_type:   pool.type ?? '',
          total_points:      totalPoints,
          total_predictions: totalPredictions,
          total_correct:     totalCorrect,
          total_exact:       totalExact,
        });
      }

      // 5. Upsert en bloque — service role bypasses RLS
      if (statsRows.length > 0) {
        const { error: statsError } = await supabase
          .from('user_pool_stats')
          .upsert(statsRows, { onConflict: 'user_id,pool_id' });

        if (statsError) {
          console.error(`Error actualizando stats pool ${poolId}:`, statsError.message);
        }
      }

    } catch (e) {
      console.error(`Error procesando pool ${poolId}:`, e);
    }
  }

  return new Response(JSON.stringify({ updated, total: matches.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
