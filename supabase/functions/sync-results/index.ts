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

  // 1a. Partidos sin resultado que tienen api_id (sincronizan + disparan notificación)
  const { data: unsyncedMatches, error } = await supabase
    .from('matches')
    .select('id, api_id, pool_id')
    .is('home_score', null)
    .not('api_id', 'is', null);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  // 1b. Partidos recientes ya con resultado (últimas 48h) — re-verificación silenciosa.
  //     Corrige marcadores incorrectamente grabados (cron en mitad del partido, dato
  //     temporal de la API, etc.) sin re-enviar notificaciones.
  const cutoff48h = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
  const { data: recentMatches } = await supabase
    .from('matches')
    .select('id, api_id, pool_id')
    .not('home_score', 'is', null)
    .not('api_id', 'is', null)
    .gt('utc_date', cutoff48h)
    .lt('utc_date', new Date().toISOString());

  // IDs de partidos en re-verificación: no disparan notificación aunque cambien
  const reverifyIds = new Set((recentMatches ?? []).map((m: any) => m.id as string));

  const allMatches = [...(unsyncedMatches ?? []), ...(recentMatches ?? [])];

  if (allMatches.length === 0) {
    return new Response(JSON.stringify({ updated: 0, total: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // 2. Obtener el tipo (código de competición) de cada polla afectada
  const uniquePoolIds = [...new Set(allMatches.map((m: any) => m.pool_id))];
  const { data: pools } = await supabase
    .from('pools')
    .select('id, type')
    .in('id', uniquePoolIds);

  const poolTypeMap = new Map((pools ?? []).map((p: any) => [p.id, p.type as string]));

  // 3. Agrupar api_ids por competición y construir índice para lookup rápido
  const competitionApiIds = new Map<string, Set<number>>();
  const matchesByApiId    = new Map<number, { id: string; pool_id: string }[]>();

  for (const m of allMatches) {
    const compCode = poolTypeMap.get(m.pool_id);
    if (!compCode) continue;

    if (!competitionApiIds.has(compCode)) competitionApiIds.set(compCode, new Set());
    competitionApiIds.get(compCode)!.add(m.api_id);

    if (!matchesByApiId.has(m.api_id)) matchesByApiId.set(m.api_id, []);
    // Evitar duplicados si el mismo match apareció en ambas listas
    const existing = matchesByApiId.get(m.api_id)!;
    if (!existing.some((e) => e.id === m.id)) {
      existing.push({ id: m.id, pool_id: m.pool_id });
    }
  }

  const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_KEY')!;
  let updated = 0;
  const updatedPoolIds = new Set<string>();

  // 4. UNA sola llamada API por competición (en vez de una por partido)
  for (const [compCode, apiIds] of competitionApiIds) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${compCode}/matches?status=FINISHED`,
        { headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY } },
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`API error ${compCode}: HTTP ${res.status} — ${text}`);
        continue;
      }

      const data = await res.json();
      const finishedMatches: any[] = data.matches ?? [];

      for (const apiMatch of finishedMatches) {
        if (!apiIds.has(apiMatch.id)) continue;

        // score.regularTime existe en partidos con ET o penales y da el resultado exacto
        // a los 90 minutos. Para partidos REGULAR no viene → caemos a score.fullTime
        // (que en ese caso sí es el resultado a los 90').
        const homeScore = apiMatch.score?.regularTime?.home ?? apiMatch.score?.fullTime?.home;
        const awayScore = apiMatch.score?.regularTime?.away ?? apiMatch.score?.fullTime?.away;
        if (homeScore == null || awayScore == null) continue;

        const affected = matchesByApiId.get(apiMatch.id) ?? [];

        // Partidos nuevos (home_score IS NULL): actualización normal
        const newAffected      = affected.filter(({ id }) => !reverifyIds.has(id));
        // Partidos en re-verificación: sobreescribir aunque ya tengan marcador
        const reverifyAffected = affected.filter(({ id }) => reverifyIds.has(id));

        if (newAffected.length > 0) {
          const { error: updateError } = await supabase
            .from('matches')
            .update({ home_score: String(homeScore), away_score: String(awayScore) })
            .eq('api_id', apiMatch.id)
            .is('home_score', null);

          if (!updateError) {
            updated++;
            for (const { pool_id } of newAffected) updatedPoolIds.add(pool_id);
          }
        }

        // Corrección silenciosa de marcadores recientes incorrectos (sin notificación)
        if (reverifyAffected.length > 0) {
          for (const { id } of reverifyAffected) {
            await supabase
              .from('matches')
              .update({ home_score: String(homeScore), away_score: String(awayScore) })
              .eq('id', id);
          }
        }
      }
    } catch (e) {
      console.error(`Error procesando competición ${compCode}:`, e);
    }
  }

  // ─── Notificar + actualizar stats por cada polla con cambios ──────────────

  for (const poolId of updatedPoolIds) {
    try {
      // Info de la polla
      const { data: pool } = await supabase
        .from('pools')
        .select('name, type, scoring_config')
        .eq('id', poolId)
        .single();

      if (!pool) continue;

      // Partidos finalizados de esta polla
      const { data: finishedMatches } = await supabase
        .from('matches')
        .select('id, home_score, away_score, stage')
        .eq('pool_id', poolId)
        .not('home_score', 'is', null)
        .not('away_score', 'is', null);

      if (!finishedMatches || finishedMatches.length === 0) continue;

      // Total de partidos en la polla (para detectar si el torneo terminó)
      const { count: totalMatchCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('pool_id', poolId);

      const tournamentJustFinished =
        (totalMatchCount ?? 0) > 0 && finishedMatches.length === totalMatchCount;

      // Construir mapa de resultados para cálculo de puntos
      const resultMap = new Map(
        finishedMatches.map((m: any) => [
          m.id,
          { homeScore: String(m.home_score), awayScore: String(m.away_score), stage: m.stage },
        ]),
      );

      // Calcular puntos por usuario
      const { data: allPredictions } = await supabase
        .from('predictions')
        .select('user_id, match_id, home_score, away_score')
        .eq('pool_id', poolId);

      const config: ScoringConfig = pool.scoring_config ?? {};
      const statsRows: object[] = [];
      const statsByUser = new Map<string, number>();

      if (allPredictions && allPredictions.length > 0) {
        const byUser = new Map<string, typeof allPredictions>();
        for (const pred of allPredictions) {
          if (!byUser.has(pred.user_id)) byUser.set(pred.user_id, []);
          byUser.get(pred.user_id)!.push(pred);
        }

        for (const [userId, preds] of byUser) {
          let totalPoints      = 0;
          let totalCorrect     = 0;
          let totalExact       = 0;
          const totalPredictions = preds.length;

          for (const pred of preds) {
            const result = resultMap.get(pred.match_id);
            if (!result) continue;

            const pts = calcPoints(pred, result, config);
            const isExact = pred.home_score === result.homeScore
                         && pred.away_score === result.awayScore;

            if (pts > 0) totalCorrect++;
            if (isExact) totalExact++;
            totalPoints += pts;
          }

          statsByUser.set(userId, totalPoints);
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
      }

      // Participantes de la polla
      const { data: participants } = await supabase
        .from('pool_participants')
        .select('user_id')
        .eq('pool_id', poolId);

      if (tournamentJustFinished) {
        // Notificación personalizada al terminar el torneo
        const RANK_EMOJIS = ['🥇', '🥈', '🥉'];

        const ranking = (participants ?? [])
          .map((p: any) => ({ userId: p.user_id as string, points: statsByUser.get(p.user_id) ?? 0 }))
          .sort((a, b) => b.points - a.points);

        for (let i = 0; i < ranking.length; i++) {
          const { userId, points } = ranking[i];
          const rank  = i + 1;
          const emoji = RANK_EMOJIS[i] ?? '🏆';
          const title   = rank === 1 ? `${emoji} ¡Ganaste la polla!` : `${emoji} Polla finalizada`;
          const message = rank === 1
            ? `¡Quedaste 1° en "${pool.name}" con ${points} pts! 🎉`
            : `Quedaste ${rank}° en "${pool.name}" con ${points} pts`;

          await sendPushNotification(
            [userId],
            title,
            message,
            { type: 'tournament_end', pool_id: poolId, rank: String(rank), points: String(points) },
          );
        }
      } else {
        // Notificación genérica de nuevos resultados
        const userIds = (participants ?? []).map((p: any) => p.user_id as string);

        if (userIds.length > 0) {
          await sendPushNotification(
            userIds,
            'Resultado disponible',
            `Nuevos resultados en "${pool.name}" — ¡revisa tu clasificación!`,
            { type: 'result', pool_id: poolId },
          );
        }
      }

      // Upsert de stats
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

  return new Response(JSON.stringify({ updated, total: unsyncedMatches.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
