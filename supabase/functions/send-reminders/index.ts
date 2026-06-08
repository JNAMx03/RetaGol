import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/onesignal.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();
  // Ventana: entre 15 y 30 minutos desde ahora — evita duplicados si el cron corre cada 15 min
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);

  // Partidos sin resultado cuyo utc_date cae en la ventana de 15-30 minutos
  const { data: matches } = await supabase
    .from('matches')
    .select('id, pool_id, home, away')
    .is('home_score', null)
    .gte('utc_date', in15.toISOString())
    .lte('utc_date', in30.toISOString());

  if (!matches || matches.length === 0) {
    return new Response(JSON.stringify({ reminders: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let reminders = 0;

  for (const match of matches) {
    try {
      const { data: participants } = await supabase
        .from('pool_participants')
        .select('profiles(onesignal_player_id)')
        .eq('pool_id', match.pool_id);

      const playerIds = (participants ?? [])
        .map((p: any) => p.profiles?.onesignal_player_id)
        .filter(Boolean);

      if (playerIds.length === 0) continue;

      await sendPushNotification(
        playerIds,
        '⏱️ Partido en 15 minutos',
        `${match.home} vs ${match.away} — ¡última oportunidad para hacer tu predicción!`,
        { type: 'reminder', pool_id: match.pool_id },
      );
      reminders++;
    } catch (e) {
      console.error(`Error con recordatorio para match ${match.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ reminders }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
