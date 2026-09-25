import 'server-only';
import { StripeProvider } from './providers/stripe';
import { BillingProviderError } from './provider';

export function billingConfigured() {
  return (
    process.env.BILLING_PROVIDER === 'stripe' &&
    /^sk_(test|live)_/.test(process.env.STRIPE_SECRET_KEY ?? '') &&
    /^whsec_/.test(process.env.STRIPE_WEBHOOK_SECRET ?? '') &&
    /^price_/.test(process.env.STRIPE_PRICE_ID ?? '') &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY)
  );
}
export function getBillingProvider() {
  if (!billingConfigured()) throw new BillingProviderError('BILLING_NOT_CONFIGURED');
  return new StripeProvider({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    priceId: process.env.STRIPE_PRICE_ID!,
  });
}
