import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

        updated++;
      }
    } catch (e) {
      console.error(`Error sincronizando match ${match.id}:`, e);
    }
  }

  return new Response(JSON.stringify({ updated, total: matches.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
