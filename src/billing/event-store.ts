import 'server-only';
import { z } from 'zod';
import { createBillingAdmin } from '@/lib/supabase/admin';
import { BillingProviderError } from './provider';
import type { BillingEventStore } from './webhook-service';

export function createBillingEventStore(): BillingEventStore {
  const admin = createBillingAdmin();
  return {
    async claim(organizationId, provider, event) {
      const { data, error } = await admin.rpc('claim_billing_event', {
        p_org: organizationId,
        p_provider: provider,
        p_event_id: event.id,
        p_event_type: event.type,
      });
      if (error) throw new BillingProviderError('BILLING_EVENT_CLAIM_FAILED');
      return z.object({ duplicate: z.boolean(), token: z.uuid().nullable() }).parse(data);
    },
    async apply(organizationId, token, eventId, snapshot) {
      const { error } = await admin.rpc('apply_billing_event', {
        p_org: organizationId,
        p_token: token,
        p_event_id: eventId,
        p_snapshot: snapshot,
      });
      if (error) throw new BillingProviderError('BILLING_EVENT_APPLY_FAILED');
      console.info('billing.subscription_updated', {
        organizationId,
        eventId,
        status: snapshot.status,
      });
    },
    async release(organizationId, token) {
      const { error } = await admin.rpc('release_billing_event', {
        p_org: organizationId,
        p_token: token,
      });
      if (error) console.warn('billing.lease_release_failed', { organizationId, code: error.code });
    },
  };
}
