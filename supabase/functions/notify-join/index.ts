import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendPushNotification } from '../_shared/onesignal.ts';

serve(async (req) => {
  try {
    const { pool_id, pool_name, joiner_name } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: pool } = await supabase
      .from('pools')
      .select('creator_id')
      .eq('id', pool_id)
      .single();

    if (!pool) {
      return new Response(JSON.stringify({ sent: false }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await sendPushNotification(
      [pool.creator_id],
      'Nuevo participante',
      `${joiner_name} se unió a tu polla "${pool_name}"`,
      { type: 'join', pool_id },
    );

    return new Response(
      JSON.stringify({ sent: true }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('Error en notify-join:', e);
    return new Response(JSON.stringify({ sent: false }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
