const ONESIGNAL_APP_ID = '6d6eb723-2983-4765-9071-2c3edd92ed82';

export async function sendPushNotification(
  playerIds: string[],
  title: string,
  message: string,
  data?: Record<string, string>,
): Promise<void> {
  if (playerIds.length === 0) return;

  await fetch('https://api.onesignal.com/notifications', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${Deno.env.get('ONESIGNAL_REST_API_KEY')!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      app_id: ONESIGNAL_APP_ID,
      target_channel: 'push',
      include_subscription_ids: playerIds,
      headings: { en: title },
      contents: { en: message },
      ...(data ? { data } : {}),
    }),
  });
}
