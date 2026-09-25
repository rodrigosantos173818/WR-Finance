import 'server-only';
import { cache } from 'react';
import { requireOrganization } from '@/services/session';
import { subscriptionAccessSchema, unavailableAccess } from './types';

// React cache deduplicates within a server request, never across users or requests.
// The database clock and predicate remain the sole source of entitlements.
export const getSubscriptionAccess = cache(async () => {
  const { supabase, organization } = await requireOrganization();
  const { data, error } = await supabase.rpc('get_subscription_access', { p_org: organization.id });
  const parsed = subscriptionAccessSchema.safeParse(data);
  if (error || !parsed.success) {
    console.warn('billing.access_unavailable', {
      organizationId: organization.id,
      code: error?.code ?? 'INVALID_CONTRACT',
    });
    return unavailableAccess(organization.id, organization.role === 'owner');
  }
  return parsed.data;
});

export async function requireFinancialWrite() {
  const access = await getSubscriptionAccess();
  if (!access.available)
    return {
      ok: false as const,
      code: 'BILLING_UNAVAILABLE' as const,
      error: 'Não foi possível verificar sua assinatura. Tente novamente em instantes.',
    };
  if (!access.canWrite)
    return {
      ok: false as const,
      code: 'SUBSCRIPTION_REQUIRED' as const,
      error: 'Sua empresa está em modo somente leitura. Assine o WR Finance Pro para continuar.',
    };
  return null;
}
