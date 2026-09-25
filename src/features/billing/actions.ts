'use server';

import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireOrganization } from '@/services/session';
import { getSubscriptionAccess } from '@/billing/subscription-service';
import { getBillingProvider } from '@/billing/provider-server';
import { BillingProviderError } from '@/billing/provider';
import { createBillingAdmin } from '@/lib/supabase/admin';
import { createBillingEventStore } from '@/billing/event-store';
import { synchronizeBilling } from '@/billing/webhook-service';
import { revalidateBilling } from '@/billing/revalidate';
import type { ActionResult } from '@/types/actions';

export async function refreshSubscription() {
  return getSubscriptionAccess();
}
function returnUrl() {
  const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000');
  if (
    url.username ||
    url.password ||
    (url.protocol !== 'https:' &&
      !(url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname)))
  )
    throw new BillingProviderError('INVALID_SITE_URL');
  return new URL('/configuracoes/assinatura', url).href;
}
function errorResult(error: unknown): ActionResult<never> {
  const code = error instanceof BillingProviderError ? error.code : 'BILLING_ERROR';
  console.warn('billing.action_failed', { code });
  return {
    ok: false,
    code: code === 'BILLING_NOT_CONFIGURED' ? 'BILLING_NOT_CONFIGURED' : 'BILLING_ERROR',
    error:
      code === 'BILLING_NOT_CONFIGURED'
        ? 'A contratação online está temporariamente indisponível. Tente novamente mais tarde.'
        : 'Não foi possível concluir a solicitação. Confira o status da assinatura e tente novamente.',
  };
}
const checkoutSchema = z.object({
  organizationId: z.uuid(),
  subscriptionId: z.uuid(),
  customerId: z.string().nullable(),
  providerSubscriptionId: z.string().nullable(),
  key: z.uuid(),
  expiresAt: z.iso.datetime({ offset: true }),
  url: z.url().nullable(),
  sessionId: z.string().nullable(),
});

export async function startCheckout(): Promise<ActionResult<string>> {
  const { supabase, organization, user } = await requireOrganization();
  if (organization.role !== 'owner')
    return {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Somente o proprietário pode gerenciar a assinatura da empresa.',
    };
  try {
    const provider = getBillingProvider();
    const { data, error } = await supabase.rpc('begin_billing_checkout', {
      p_org: organization.id,
    });
    if (error) throw new BillingProviderError('CHECKOUT_RESERVATION_FAILED');
    const context = checkoutSchema.parse(data);
    const admin = createBillingAdmin();
    const customerId =
      context.customerId ??
      (await provider.createCustomer({
        billingId: context.subscriptionId,
        organizationId: organization.id,
        email: user.email ?? '',
      }));
    const saved = await admin.rpc('billing_set_customer', {
      p_org: organization.id,
      p_provider: provider.name,
      p_customer: customerId,
    });
    if (saved.error) throw new BillingProviderError('CUSTOMER_SAVE_FAILED');
    const access = await getSubscriptionAccess();
    if (!access.available) throw new BillingProviderError('BILLING_UNAVAILABLE');
    if (access.canWrite && !access.isTrial)
      return { ok: true, data: await provider.createPortal(customerId, returnUrl()) };
    const existing = await provider.getOpenSubscription(customerId);
    if (existing) return { ok: true, data: await provider.createPortal(customerId, returnUrl()) };
    if (context.url) return { ok: true, data: context.url };
    const checkout = await provider.createCheckout({
      organizationId: organization.id,
      billingId: context.subscriptionId,
      customerId,
      idempotencyKey: context.key,
      expiresAt: context.expiresAt,
      returnUrl: returnUrl(),
    });
    const stored = await admin.rpc('billing_save_checkout', {
      p_org: organization.id,
      p_key: context.key,
      p_session: checkout.id,
      p_url: checkout.url,
    });
    if (stored.error) throw new BillingProviderError('CHECKOUT_SAVE_FAILED');
    console.info('billing.checkout_created', { organizationId: organization.id });
    return { ok: true, data: checkout.url };
  } catch (error) {
    return errorResult(error);
  }
}
export async function manageSubscription(): Promise<ActionResult<string>> {
  const { supabase, organization } = await requireOrganization();
  if (organization.role !== 'owner')
    return {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Somente o proprietário pode gerenciar a assinatura da empresa.',
    };
  try {
    const provider = getBillingProvider();
    const { data, error } = await supabase.rpc('begin_billing_checkout', {
      p_org: organization.id,
    });
    if (error) throw new BillingProviderError('BILLING_UNAVAILABLE');
    const context = checkoutSchema.parse(data);
    if (!context.customerId) throw new BillingProviderError('BILLING_CUSTOMER_MISSING');
    return { ok: true, data: await provider.createPortal(context.customerId, returnUrl()) };
  } catch (error) {
    return errorResult(error);
  }
}
export async function cancelSubscription(): Promise<ActionResult> {
  const { supabase, organization } = await requireOrganization();
  if (organization.role !== 'owner')
    return {
      ok: false,
      code: 'FORBIDDEN',
      error: 'Somente o proprietário pode cancelar a assinatura.',
    };
  try {
    const provider = getBillingProvider();
    const { data, error } = await supabase.rpc('begin_billing_checkout', {
      p_org: organization.id,
    });
    if (error) throw new BillingProviderError('BILLING_UNAVAILABLE');
    const context = checkoutSchema.parse(data);
    if (!context.providerSubscriptionId)
      throw new BillingProviderError('BILLING_SUBSCRIPTION_MISSING');
    const id = `cancel_${randomUUID()}`;
    await synchronizeBilling(
      provider,
      createBillingEventStore(),
      { id, type: 'subscription.cancel_requested', subscriptionId: context.providerSubscriptionId },
      () => provider.cancelSubscription(context.providerSubscriptionId!, id),
      organization.id,
    );
    revalidateBilling();
    console.info('billing.cancellation_requested', { organizationId: organization.id });
    return { ok: true, data: undefined };
  } catch (error) {
    return errorResult(error);
  }
}
