import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHmac } from 'node:crypto';
import { verifyStripeSignature } from '../src/billing/stripe-signature.ts';
import { StripeProvider } from '../src/billing/providers/stripe.ts';
import { trialMessage } from '../src/billing/presentation.ts';
import { PRO_PLAN, unavailableAccess, type BillingSnapshot } from '../src/billing/types.ts';
import { synchronizeBilling, type BillingEventStore } from '../src/billing/webhook-service.ts';
import type { BillingProvider } from '../src/billing/provider.ts';

const org = '11111111-1111-4111-8111-111111111111';
const billingId = '22222222-2222-4222-8222-222222222222';
const secret = 'whsec_test_only';
const config = { secretKey: 'sk_test_not_real', webhookSecret: secret, priceId: 'price_pro' };
const sign = (raw: string, seconds = Math.floor(Date.now() / 1000)) =>
  `t=${seconds},v1=${createHmac('sha256', secret).update(`${seconds}.${raw}`).digest('hex')}`;
test('webhook exige assinatura autêntica, corpo intacto e timestamp recente', () => {
  const raw = '{"id":"evt_paid"}';
  assert.doesNotThrow(() => verifyStripeSignature(raw, sign(raw), secret));
  assert.throws(() => verifyStripeSignature(`${raw} `, sign(raw), secret));
  assert.throws(() => verifyStripeSignature(raw, null, secret));
  assert.throws(() =>
    verifyStripeSignature(raw, sign(raw, Math.floor(Date.now() / 1000) - 301), secret),
  );
  assert.throws(() =>
    verifyStripeSignature(raw, sign(raw, Math.floor(Date.now() / 1000) + 301), secret),
  );
  assert.doesNotThrow(() =>
    verifyStripeSignature(raw, `${sign(raw)},v1=${'0'.repeat(64)}`, secret),
  );
  assert.throws(() => verifyStripeSignature(raw, `${sign(raw)},t=1`, secret));
});
test('mensagens usam a decisão e as datas do servidor, inclusive hoje e amanhã', () => {
  const access = {
    ...unavailableAccess(org, true),
    available: true,
    status: 'trialing' as const,
    isTrial: true,
    canWrite: true,
    isReadOnly: false,
    plan: PRO_PLAN,
    daysRemaining: 23,
    trialCalendarDays: 23,
  };
  assert.match(trialMessage(access), /23 dias/);
  for (const days of [7, 3])
    assert.match(
      trialMessage({ ...access, daysRemaining: days, trialCalendarDays: days }),
      new RegExp(`termina em ${days} dias`),
    );
  assert.match(trialMessage({ ...access, daysRemaining: 1, trialCalendarDays: 1 }), /amanhã/);
  assert.match(trialMessage({ ...access, daysRemaining: 1, trialCalendarDays: 0 }), /hoje/);
  assert.match(
    trialMessage({ ...access, status: 'expired', canWrite: false }),
    /gratuito terminou/,
  );
});

function remoteSubscription(status = 'active', invoiceStatus = 'paid') {
  return {
    id: 'sub_test',
    customer: 'cus_test',
    status,
    metadata: { organization_id: org, billing_id: billingId },
    cancel_at_period_end: false,
    canceled_at: null,
    pause_collection: null,
    items: {
      has_more: false,
      data: [
        {
          id: 'si_test',
          quantity: 1,
          price: {
            id: 'price_pro',
            active: true,
            currency: 'brl',
            unit_amount: 2990,
            recurring: { interval: 'month', interval_count: 1 },
          },
        },
      ],
    },
    latest_invoice: {
      status: invoiceStatus,
      currency: 'brl',
      lines: {
        has_more: false,
        data: [
          {
            pricing: { price_details: { price: 'price_pro' } },
            period: { start: 1788210000, end: 1790802000 },
          },
        ],
      },
    },
  };
}
test('Stripe só libera período confirmado como pago e correspondente ao preço Pro', async () => {
  let remote = remoteSubscription();
  const provider = new StripeProvider(config, async () => Response.json(remote));
  const paid = await provider.getSubscription('sub_test');
  assert.equal(paid.status, 'active');
  assert.ok(paid.periodEnd);
  remote = remoteSubscription('active', 'open');
  const pending = await provider.getSubscription('sub_test');
  assert.equal(pending.status, 'past_due');
  assert.equal(pending.periodEnd, null);
  remote = remoteSubscription('canceled');
  assert.equal((await provider.getSubscription('sub_test')).terminal, true);
  remote = remoteSubscription();
  remote.items.data[0].price.unit_amount = 1;
  await assert.rejects(provider.getSubscription('sub_test'), /INVALID_PLAN_PRICE/);
});
test('checkout cria preço e identificadores no servidor com idempotência e URL confiável', async () => {
  let posted: URLSearchParams | null = null;
  const provider = new StripeProvider(config, async (input, init) => {
    if (String(input).includes('/prices/'))
      return Response.json(remoteSubscription().items.data[0].price);
    assert.equal(new Headers(init?.headers).get('Idempotency-Key'), 'wr-checkout-safe-key');
    assert.equal(new Headers(init?.headers).get('Authorization'), 'Bearer sk_test_not_real');
    posted = new URLSearchParams(String(init?.body));
    return Response.json({ id: 'cs_test', url: 'https://checkout.stripe.com/c/pay/cs_test' });
  });
  await provider.createCheckout({
    organizationId: org,
    billingId,
    customerId: 'cus_test',
    idempotencyKey: 'safe-key',
    expiresAt: '2026-10-01T00:00:00Z',
    returnUrl: 'https://wr.example/configuracoes/assinatura',
  });
  assert.ok(posted);
  const body = posted as URLSearchParams;
  assert.equal(body.get('line_items[0][price]'), 'price_pro');
  assert.equal(body.get('mode'), 'subscription');
  assert.equal(body.get('subscription_data[metadata][organization_id]'), org);
  assert.equal(body.has('trial_period_days'), false);
  const malicious = new StripeProvider(config, async (input) =>
    String(input).includes('/prices/')
      ? Response.json(remoteSubscription().items.data[0].price)
      : Response.json({ id: 'cs_test', url: 'https://evil.example/' }),
  );
  await assert.rejects(
    malicious.createCheckout({
      organizationId: org,
      billingId,
      customerId: 'cus_test',
      idempotencyKey: 'safe-key',
      expiresAt: '2026-10-01T00:00:00Z',
      returnUrl: 'https://wr.example',
    }),
    /INVALID_CHECKOUT_URL/,
  );
});
test('eventos assinados reconhecem renovação e rejeitam ambiente incorreto', () => {
  const provider = new StripeProvider(config);
  const event = {
    id: 'evt_paid',
    type: 'invoice.paid',
    livemode: false,
    data: { object: { parent: { subscription_details: { subscription: 'sub_test' } } } },
  };
  const raw = JSON.stringify(event);
  assert.equal(provider.verifyWebhook(raw, sign(raw))?.subscriptionId, 'sub_test');
  const wrongMode = JSON.stringify({ ...event, livemode: true });
  assert.throws(() => provider.verifyWebhook(wrongMode, sign(wrongMode)), /INVALID_EVENT_MODE/);
});
test('webhooks duplicados não reaplicam e eventos fora de ordem leem o estado atual após obter exclusividade', async () => {
  const events = new Set<string>();
  const sequence: string[] = [];
  let writes = 0;
  const snapshot: BillingSnapshot = {
    provider: 'stripe',
    organizationId: org,
    billingId,
    customerId: 'cus_test',
    subscriptionId: 'sub_test',
    status: 'active',
    terminal: false,
    periodStart: '2026-09-01T00:00:00Z',
    periodEnd: '2026-10-01T00:00:00Z',
    cancelAtPeriodEnd: false,
    canceledAt: null,
  };
  const provider: BillingProvider = {
    name: 'stripe',
    createCustomer: async () => '',
    createCheckout: async () => ({ id: '', url: '' }),
    getOpenSubscription: async () => null,
    createPortal: async () => '',
    cancelSubscription: async () => {},
    verifyWebhook: () => null,
    resolveOrganization: async () => org,
    getSubscription: async () => {
      sequence.push('read current state');
      return snapshot;
    },
  };
  const store: BillingEventStore = {
    claim: async (_org, _provider, event) => {
      sequence.push('claim');
      return { duplicate: events.has(event.id), token: 'lease' };
    },
    apply: async (_org, _token, id, data) => {
      assert.equal(data.status, 'active');
      writes++;
      events.add(id);
    },
    release: async () => {
      sequence.push('release');
    },
  };
  const event = {
    id: 'evt_late_failure',
    type: 'invoice.payment_failed',
    subscriptionId: 'sub_test',
  };
  await synchronizeBilling(provider, store, event);
  assert.deepEqual(sequence, ['claim', 'read current state', 'release']);
  assert.equal((await synchronizeBilling(provider, store, event)).duplicate, true);
  assert.equal(writes, 1);
  let canceled = false;
  await assert.rejects(
    synchronizeBilling(
      provider,
      store,
      { ...event, id: 'other' },
      async () => {
        canceled = true;
      },
      billingId,
    ),
    /BILLING_EVENT_MISMATCH/,
  );
  assert.equal(canceled, false, 'A tenant mismatch is rejected before a provider mutation');
});
