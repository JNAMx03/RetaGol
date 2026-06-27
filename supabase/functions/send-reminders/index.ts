import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/onesignal.ts';

serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const now = new Date();

  // ── 1. Recordatorio 15 min antes del partido ───────────────────────────────
  // Ventana: entre 15 y 30 minutos desde ahora — evita duplicados si el cron corre cada 15 min
  const in15 = new Date(now.getTime() + 15 * 60 * 1000);
  const in30 = new Date(now.getTime() + 30 * 60 * 1000);

  const { data: upcomingMatches } = await supabase
    .from('matches')
    .select('id, pool_id, home, away')
    .is('home_score', null)
    .gte('utc_date', in15.toISOString())
    .lte('utc_date', in30.toISOString());

  let reminders = 0;

  for (const match of upcomingMatches ?? []) {
    try {
      const { data: participants } = await supabase
        .from('pool_participants')
        .select('user_id')
        .eq('pool_id', match.pool_id);

      const userIds = (participants ?? []).map((p: any) => p.user_id as string);
      if (userIds.length === 0) continue;

      await sendPushNotification(
        userIds,
        '⏱️ Partido en 15 minutos',
        `${match.home} vs ${match.away} — ¡última oportunidad para hacer tu predicción!`,
        { type: 'reminder', pool_id: match.pool_id },
      );
      reminders++;
    } catch (e) {
      console.error(`Error con recordatorio para match ${match.id}:`, e);
    }
  }

  // ── 2. Notificación al iniciar partido — picks del grupo ───────────────────
  // Ventana: partidos cuyo utc_date cayó en los últimos 15 minutos (strict > para no repetir)
  const startedFrom = new Date(now.getTime() - 15 * 60 * 1000);

  const { data: startedMatches } = await supabase
    .from('matches')
    .select('id, pool_id, home, away')
    .is('home_score', null)
    .gt('utc_date', startedFrom.toISOString())
    .lte('utc_date', now.toISOString());

  let matchStartNotifs = 0;

  for (const match of startedMatches ?? []) {
    try {
      const [{ data: participants }, { data: preds }] = await Promise.all([
        supabase
          .from('pool_participants')
          .select('user_id')
          .eq('pool_id', match.pool_id),
        supabase
          .from('predictions')
          .select('user_id, home_score, away_score, profiles(name)')
          .eq('pool_id', match.pool_id)
          .eq('match_id', match.id),
      ]);

      if (!participants || participants.length === 0) continue;

      // Mapa userId → { pred, name }
      const predMap = new Map(
        (preds ?? []).map((p: any) => [
          p.user_id as string,
          { pred: `${p.home_score}-${p.away_score}`, name: p.profiles?.name ?? 'Usuario' },
        ]),
      );

      // Enviar notificación personalizada a cada participante
      for (const participant of participants) {
        const userId = participant.user_id as string;

        // Construir lista de picks: el propio usuario va primero como "Tú"
        const parts: string[] = [];

        const myEntry = predMap.get(userId);
        if (myEntry) parts.push(`Tú: ${myEntry.pred}`);

        for (const [uid, { pred, name }] of predMap) {
          if (uid !== userId) parts.push(`${name}: ${pred}`);
        }

        const message = parts.length > 0
          ? parts.join(' · ')
          : 'Nadie ha hecho predicción aún';

        await sendPushNotification(
          [userId],
          `⚽ ${match.home} vs ${match.away} — ¡Comenzó!`,
          message,
          { type: 'match_start', pool_id: match.pool_id, match_id: match.id },
        );
      }

      matchStartNotifs++;
    } catch (e) {
      console.error(`Error con notificación de inicio match ${match.id}:`, e);
    }
  }

  return new Response(
    JSON.stringify({ reminders, matchStartNotifs }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
