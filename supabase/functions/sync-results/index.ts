import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/onesignal.ts';

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

  for (const match of matches) {
    try {
      const res = await fetch(
        `https://api.football-data.org/v4/matches/${match.api_id}`,
        {
          headers: {
            'X-Auth-Token': Deno.env.get('FOOTBALL_DATA_KEY')!,
          },
        },
      );

      const data = await res.json();

      // Solo actualizar si el partido ya terminó
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

  // Notificar a los participantes de cada polla con resultados nuevos
  for (const poolId of updatedPoolIds) {
    try {
      const { data: participants } = await supabase
        .from('pool_participants')
        .select('profiles(onesignal_player_id)')
        .eq('pool_id', poolId);

      const playerIds = (participants ?? [])
        .map((p: any) => p.profiles?.onesignal_player_id)
        .filter(Boolean);

      if (playerIds.length === 0) continue;

      const { data: pool } = await supabase
        .from('pools')
        .select('name')
        .eq('id', poolId)
        .single();

      await sendPushNotification(
        playerIds,
        'Resultado disponible',
        `Nuevos resultados en "${pool?.name ?? 'tu polla'}" — ¡revisa tu clasificación!`,
        { type: 'result', pool_id: poolId },
      );
    } catch (e) {
      console.error(`Error notificando pool ${poolId}:`, e);
    }
  }

  return new Response(JSON.stringify({ updated, total: matches.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
