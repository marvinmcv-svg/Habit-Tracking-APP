// RevenueCat → entitlements_cache. The only writer of that table (service role),
// so clients can never grant themselves Pro.
// Configure in RevenueCat: Integrations → Webhooks, URL = <project>/functions/v1/revenuecat-webhook,
// Authorization header = the value of REVENUECAT_WEBHOOK_SECRET.
// The app identifies users to RevenueCat with their Supabase user id (Purchases.logIn(userId)).
import { createClient } from 'npm:@supabase/supabase-js@2';

interface RcEvent {
  type: string;
  app_user_id: string;
  original_app_user_id?: string;
  entitlement_ids?: string[] | null;
  expiration_at_ms?: number | null;
}

const ACTIVE_TYPES = new Set(['INITIAL_PURCHASE', 'RENEWAL', 'PRODUCT_CHANGE', 'UNCANCELLATION', 'NON_RENEWING_PURCHASE', 'SUBSCRIPTION_EXTENDED', 'TEMPORARY_ENTITLEMENT_GRANT']);
// CANCELLATION keeps access until expiry; BILLING_ISSUE keeps access through the grace period.
const KEEP_TYPES = new Set(['CANCELLATION', 'BILLING_ISSUE', 'SUBSCRIPTION_PAUSED']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  if (req.headers.get('Authorization') !== Deno.env.get('REVENUECAT_WEBHOOK_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { event } = (await req.json()) as { event: RcEvent };
  const userId = [event.app_user_id, event.original_app_user_id].find((id) => id && UUID.test(id));
  if (!userId) return new Response('ignored: anonymous RevenueCat user', { status: 200 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const expiresAt = event.expiration_at_ms ? new Date(event.expiration_at_ms).toISOString() : null;
  const entitlements = ACTIVE_TYPES.has(event.type) || KEEP_TYPES.has(event.type) ? (event.entitlement_ids ?? []) : [];

  const { error } = await admin.from('entitlements_cache').upsert(
    { user_id: userId, rc_app_user_id: event.app_user_id, active_entitlements: entitlements, expires_at: expiresAt },
    { onConflict: 'user_id' },
  );
  if (error) return new Response(error.message, { status: 500 });
  return new Response('ok');
});
