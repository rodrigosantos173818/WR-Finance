import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Used only by authenticated owner billing actions and verified webhooks.
export function createBillingAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('BILLING_NOT_CONFIGURED');
  const secretRole =
    key.startsWith('sb_secret_') ||
    (() => {
      try {
        return (
          JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role'
        );
      } catch {
        return false;
      }
    })();
  if (!secretRole) throw new Error('BILLING_INVALID_SERVER_KEY');
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
