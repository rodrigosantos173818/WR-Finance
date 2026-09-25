import type { BillingProvider } from './provider.ts';
import { BillingProviderError } from './provider.ts';
import { billingSnapshotSchema, type BillingNotification, type BillingSnapshot } from './types.ts';

export interface BillingEventStore {
  claim(
    organizationId: string,
    provider: string,
    event: BillingNotification,
  ): Promise<{ duplicate: boolean; token: string | null }>;
  apply(
    organizationId: string,
    token: string,
    eventId: string,
    snapshot: BillingSnapshot,
  ): Promise<void>;
  release(organizationId: string, token: string): Promise<void>;
}
export async function synchronizeBilling(
  provider: BillingProvider,
  store: BillingEventStore,
  event: BillingNotification,
  beforeRead?: () => Promise<void>,
  expectedOrganizationId?: string,
) {
  const organizationId = await provider.resolveOrganization(event.subscriptionId);
  // Other Stripe products in the same account do not belong to this application.
  if (!organizationId) return { ignored: true, duplicate: false };
  if (expectedOrganizationId && organizationId !== expectedOrganizationId)
    throw new BillingProviderError('BILLING_EVENT_MISMATCH');
  const claim = await store.claim(organizationId, provider.name, event);
  if (claim.duplicate) return { ignored: false, duplicate: true };
  if (!claim.token) throw new BillingProviderError('BILLING_SYNC_BUSY');
  try {
    await beforeRead?.();
    const snapshot = billingSnapshotSchema.parse(
      await provider.getSubscription(event.subscriptionId),
    );
    if (
      snapshot.organizationId !== organizationId ||
      snapshot.subscriptionId !== event.subscriptionId
    )
      throw new BillingProviderError('BILLING_EVENT_MISMATCH');
    await store.apply(organizationId, claim.token, event.id, snapshot);
    return { ignored: false, duplicate: false };
  } finally {
    await store.release(organizationId, claim.token);
  }
}
