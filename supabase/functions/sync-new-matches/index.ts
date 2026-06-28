import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Replica de formatMatchDate del cliente (locale es-CO, zona Colombia UTC-5)
function formatMatchDate(utcDate: string): string {
  const date = new Date(utcDate);
  return date.toLocaleDateString('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // 1. Todas las pollas que tienen tipo de competición asignado.
  //    NO filtramos por home_score IS NULL — eso causaba que la función
  //    saliera prematuramente al finalizar la fase de grupos (todos los
  //    partidos existentes tenían resultado y no había nada "sin resultado"
  //    aunque los partidos de eliminatorias aún no estuvieran en BD).
  const { data: pools } = await supabase
    .from('pools')
    .select('id, type')
    .not('type', 'is', null);

  if (!pools || pools.length === 0) {
    return new Response(JSON.stringify({ inserted: 0, message: 'No hay pollas' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Agrupar pool_ids por competición (evitar duplicados y llamadas API extra)
  const poolsByComp = new Map<string, Set<string>>(); // compCode → Set<pool_id>
  for (const pool of pools) {
    const compCode = pool.type as string;
    if (!poolsByComp.has(compCode)) poolsByComp.set(compCode, new Set());
    poolsByComp.get(compCode)!.add(pool.id);
  }

  const FOOTBALL_DATA_KEY = Deno.env.get('FOOTBALL_DATA_KEY')!;
  let totalInserted = 0;

  // 2. Una sola llamada a la API por competición
  for (const [compCode, poolIdSet] of poolsByComp) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/competitions/${compCode}/matches`,
        { headers: { 'X-Auth-Token': FOOTBALL_DATA_KEY } },
      );

      if (!res.ok) {
        const text = await res.text();
        console.error(`API error ${compCode}: HTTP ${res.status} — ${text}`);
        continue;
      }

      const data = await res.json();

      // Solo partidos con ambos equipos definidos (descarta TBD/null de fases no confirmadas)
      const apiMatches = (data.matches ?? []).filter(
        (m: any) => m.homeTeam?.name && m.awayTeam?.name,
      );

      if (apiMatches.length === 0) continue;

      // 3. Para cada polla, insertar solo los partidos que le faltan
      for (const poolId of poolIdSet) {
        const { data: existing } = await supabase
          .from('matches')
          .select('api_id')
          .eq('pool_id', poolId)
          .not('api_id', 'is', null);

        const existingApiIds = new Set((existing ?? []).map((m: any) => m.api_id));

        const newMatches = apiMatches.filter((m: any) => !existingApiIds.has(m.id));
        if (newMatches.length === 0) continue;

        const rows = newMatches.map((m: any) => ({
          id:         `${poolId}_${m.id}`,
          pool_id:    poolId,
          home:       m.homeTeam.name,
          away:       m.awayTeam.name,
          date:       formatMatchDate(m.utcDate),
          utc_date:   m.utcDate,
          api_id:     m.id,
          stage:      m.stage ?? 'GROUP_STAGE',
          home_score: null,
          away_score: null,
        }));

        // upsert con ignoreDuplicates por si el cron corre dos veces seguidas
        const { error: upsertError } = await supabase
          .from('matches')
          .upsert(rows, { onConflict: 'id', ignoreDuplicates: true });

        if (upsertError) {
          console.error(`Error en pool ${poolId}:`, upsertError.message);
        } else {
          totalInserted += rows.length;
          console.log(`Pool ${poolId} (${compCode}): +${rows.length} partidos nuevos`);
        }
      }
    } catch (e) {
      console.error(`Error procesando competición ${compCode}:`, e);
    }
  }

  return new Response(JSON.stringify({ inserted: totalInserted }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
