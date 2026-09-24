// Sends one notification row as an Expo push to every device of its user.
// Called by the notifications_push database trigger (see the migration), which
// authenticates with a shared secret rather than a user JWT.
//
// Secrets: PUSH_WEBHOOK_SECRET — the same value stored in Vault as
// giveback_push_secret.

import { createClient } from 'npm:@supabase/supabase-js@2';
import { json } from '../_shared/cors.ts';

type Notification = {
  id: number;
  user_id: string;
  kind: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
};

const CHANNEL: Record<string, string> = { message: 'messages', status: 'messages', alert: 'alerts', thanks: 'default' };

Deno.serve(async (req) => {
  const secret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  if (!secret || req.headers.get('x-push-secret') !== secret) return json({ error: 'forbidden' }, 403);

  const { notification } = (await req.json()) as { notification: Notification };
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: tokens } = await admin.from('push_tokens').select('token').eq('user_id', notification.user_id);
  if (!tokens?.length) return json({ sent: 0 });

  const { count: badge } = await admin
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', notification.user_id)
    .is('read_at', null);

  const messages = tokens.map(({ token }) => ({
    to: token,
    title: notification.title,
    body: notification.body,
    sound: 'default',
    badge: badge ?? undefined,
    channelId: CHANNEL[notification.kind] ?? 'default',
    data: { ...notification.data, kind: notification.kind, notification_id: notification.id },
  }));

  let result: { data?: { status: string; details?: { error?: string } }[] };
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    result = await res.json();
  } catch (error) {
    // The in-app notification row already exists; a missed push is not fatal.
    console.error('expo push failed', error);
    return json({ error: 'push service unreachable' }, 502);
  }

  // Forget devices that uninstalled the app or revoked permission.
  const dead = (result?.data ?? [])
    .map((ticket: { status: string; details?: { error?: string } }, i: number) =>
      ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered' ? messages[i].to : null,
    )
    .filter(Boolean);
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);

  return json({ sent: messages.length - dead.length });
});
