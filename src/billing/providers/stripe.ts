import { z } from 'zod';
import { BillingProviderError, type BillingProvider, type CheckoutInput } from '../provider.ts';
import { billingSnapshotSchema, type BillingNotification } from '../types.ts';
import { verifyStripeSignature } from '../stripe-signature.ts';

export const STRIPE_API_VERSION = '2025-06-30.basil';
const id = z.string().regex(/^[a-z]+_[A-Za-z0-9_]+$/);
const priceSchema = z.object({
  id,
  active: z.boolean(),
  currency: z.string(),
  unit_amount: z.number().int().nullable(),
  recurring: z.object({ interval: z.string(), interval_count: z.number().int() }).nullable(),
});
const subscriptionSchema = z.object({
  id,
  customer: id,
  status: z.enum([
    'incomplete',
    'incomplete_expired',
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'paused',
  ]),
  metadata: z.record(z.string(), z.string()),
  cancel_at_period_end: z.boolean(),
  canceled_at: z.number().nullable(),
  pause_collection: z.unknown().optional(),
  items: z.object({
    has_more: z.boolean(),
    data: z.array(z.object({ id, quantity: z.number().int(), price: priceSchema })),
  }),
  latest_invoice: z
    .object({
      status: z.string().nullable(),
      currency: z.string(),
      lines: z.object({
        has_more: z.boolean(),
        data: z.array(
          z.object({
            pricing: z
              .object({ price_details: z.object({ price: id }).nullable().optional() })
              .nullable()
              .optional(),
            period: z.object({ start: z.number().int(), end: z.number().int() }),
          }),
        ),
      }),
    })
    .nullable(),
});
const unixDate = (seconds: number) => new Date(seconds * 1000).toISOString();

export class StripeProvider implements BillingProvider {
  readonly name = 'stripe' as const;
  private readonly config: { secretKey: string; webhookSecret: string; priceId: string };
  private readonly transport: typeof fetch;
  constructor(
    config: { secretKey: string; webhookSecret: string; priceId: string },
    transport: typeof fetch = fetch,
  ) {
    this.config = config;
    this.transport = transport;
  }

  private async request(
    path: string,
    body?: Record<string, string>,
    key?: string,
  ): Promise<unknown> {
    const response = await this.transport(`https://api.stripe.com/v1/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${this.config.secretKey}`,
        'Stripe-Version': STRIPE_API_VERSION,
        ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        ...(key ? { 'Idempotency-Key': key } : {}),
      },
      ...(body ? { body: new URLSearchParams(body) } : {}),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new BillingProviderError(
        response.status === 429 ? 'PROVIDER_BUSY' : 'PROVIDER_UNAVAILABLE',
      );
    return response.json();
  }
  private validPrice(value: z.infer<typeof priceSchema>) {
    if (
      value.id !== this.config.priceId ||
      value.currency !== 'brl' ||
      value.unit_amount !== 1990 ||
      value.recurring?.interval !== 'month' ||
      value.recurring.interval_count !== 1
    )
      throw new BillingProviderError('INVALID_PLAN_PRICE');
  }
  async createCustomer(input: { billingId: string; organizationId: string; email: string }) {
    const response = await this.request(
      'customers',
      {
        email: input.email,
        'metadata[organization_id]': input.organizationId,
        'metadata[billing_id]': input.billingId,
      },
      `wr-customer-${input.billingId}`,
    );
    return z.object({ id }).parse(response).id;
  }
  async createCheckout(input: CheckoutInput) {
    const price = priceSchema.parse(
      await this.request(`prices/${encodeURIComponent(this.config.priceId)}`),
    );
    this.validPrice(price);
    if (!price.active) throw new BillingProviderError('INVALID_PLAN_PRICE');
    const result = z.object({ id, url: z.url() }).parse(
      await this.request(
        'checkout/sessions',
        {
          mode: 'subscription',
          customer: input.customerId,
          'line_items[0][price]': this.config.priceId,
          'line_items[0][quantity]': '1',
          'payment_method_types[0]': 'card',
          'subscription_data[metadata][organization_id]': input.organizationId,
          'subscription_data[metadata][billing_id]': input.billingId,
          client_reference_id: input.organizationId,
          success_url: `${input.returnUrl}?checkout=success&company=${input.organizationId}`,
          cancel_url: `${input.returnUrl}?checkout=canceled`,
          expires_at: String(Math.floor(Date.parse(input.expiresAt) / 1000)),
        },
        `wr-checkout-${input.idempotencyKey}`,
      ),
    );
    if (new URL(result.url).origin !== 'https://checkout.stripe.com')
      throw new BillingProviderError('INVALID_CHECKOUT_URL');
    return result;
  }
  async getOpenSubscription(customerId: string) {
    const list = z
      .object({ data: z.array(z.object({ id, status: z.string() })), has_more: z.boolean() })
      .parse(
        await this.request(
          `subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
        ),
      );
    if (list.has_more) throw new BillingProviderError('BILLING_REVIEW_REQUIRED');
    return (
      list.data.find((item) => !['canceled', 'incomplete_expired'].includes(item.status))?.id ??
      null
    );
  }
  async createPortal(customerId: string, returnUrl: string) {
    const { url } = z.object({ url: z.url() }).parse(
      await this.request('billing_portal/sessions', {
        customer: customerId,
        return_url: returnUrl,
      }),
    );
    if (new URL(url).origin !== 'https://billing.stripe.com')
      throw new BillingProviderError('INVALID_PORTAL_URL');
    return url;
  }
  async cancelSubscription(subscriptionId: string, idempotencyKey: string) {
    await this.request(
      `subscriptions/${encodeURIComponent(subscriptionId)}`,
      { cancel_at_period_end: 'true' },
      idempotencyKey,
    );
  }
  async resolveOrganization(subscriptionId: string) {
    const data = z
      .object({ metadata: z.record(z.string(), z.string()) })
      .parse(await this.request(`subscriptions/${encodeURIComponent(subscriptionId)}`));
    const parsed = z.uuid().safeParse(data.metadata.organization_id);
    return parsed.success ? parsed.data : null;
  }
  async getSubscription(subscriptionId: string) {
    const s = subscriptionSchema.parse(
      await this.request(
        `subscriptions/${encodeURIComponent(subscriptionId)}?expand%5B%5D=latest_invoice`,
      ),
    );
    if (s.items.has_more || s.items.data.length !== 1 || s.items.data[0].quantity !== 1)
      throw new BillingProviderError('INVALID_PLAN_PRICE');
    this.validPrice(s.items.data[0].price);
    const invoice = s.latest_invoice;
    const paidLine =
      invoice?.status === 'paid' && invoice.currency === 'brl' && !invoice.lines.has_more
        ? invoice.lines.data.find(
            (line) =>
              line.pricing?.price_details?.price === this.config.priceId &&
              line.period.end > line.period.start,
          )
        : undefined;
    const status =
      s.status === 'canceled' || s.cancel_at_period_end
        ? 'canceled'
        : s.status === 'trialing'
          ? 'trialing'
          : s.status === 'active' && paidLine && !s.pause_collection
            ? 'active'
            : s.status === 'incomplete_expired'
              ? 'expired'
              : 'past_due';
    return billingSnapshotSchema.parse({
      provider: this.name,
      organizationId: s.metadata.organization_id,
      billingId: s.metadata.billing_id,
      customerId: s.customer,
      subscriptionId: s.id,
      status,
      terminal: s.status === 'canceled' || s.status === 'incomplete_expired',
      periodStart: paidLine ? unixDate(paidLine.period.start) : null,
      periodEnd: paidLine ? unixDate(paidLine.period.end) : null,
      cancelAtPeriodEnd: s.cancel_at_period_end,
      canceledAt: s.canceled_at ? unixDate(s.canceled_at) : null,
    });
  }
  verifyWebhook(raw: string, signature: string | null): BillingNotification | null {
    verifyStripeSignature(raw, signature, this.config.webhookSecret);
    const event = z
      .object({
        id,
        type: z.string().max(100),
        livemode: z.boolean(),
        data: z.object({ object: z.record(z.string(), z.unknown()) }),
      })
      .parse(JSON.parse(raw));
    if (event.livemode !== this.config.secretKey.startsWith('sk_live_'))
      throw new BillingProviderError('INVALID_EVENT_MODE');
    const object = event.data.object;
    if (
      [
        'customer.subscription.created',
        'customer.subscription.updated',
        'customer.subscription.deleted',
        'customer.subscription.paused',
        'customer.subscription.resumed',
      ].includes(event.type)
    )
      return { id: event.id, type: event.type, subscriptionId: id.parse(object.id) };
    if (
      [
        'invoice.paid',
        'invoice.payment_failed',
        'invoice.payment_action_required',
        'invoice.marked_uncollectible',
      ].includes(event.type)
    ) {
      const invoice = z
        .object({
          parent: z
            .object({ subscription_details: z.object({ subscription: id }).nullable().optional() })
            .nullable()
            .optional(),
        })
        .parse(object);
      const subscriptionId = invoice.parent?.subscription_details?.subscription;
      return subscriptionId ? { id: event.id, type: event.type, subscriptionId } : null;
    }
    return null;
  }
}
