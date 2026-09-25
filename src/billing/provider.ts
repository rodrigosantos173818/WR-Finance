import type { BillingNotification, BillingSnapshot } from './types.ts';

export interface CheckoutInput {
  organizationId: string;
  billingId: string;
  customerId: string;
  idempotencyKey: string;
  expiresAt: string;
  returnUrl: string;
}
export interface BillingProvider {
  readonly name: 'stripe';
  createCustomer(input: {
    billingId: string;
    organizationId: string;
    email: string;
  }): Promise<string>;
  createCheckout(input: CheckoutInput): Promise<{ id: string; url: string }>;
  getOpenSubscription(customerId: string): Promise<string | null>;
  createPortal(customerId: string, returnUrl: string): Promise<string>;
  cancelSubscription(subscriptionId: string, idempotencyKey: string): Promise<void>;
  getSubscription(subscriptionId: string): Promise<BillingSnapshot>;
  resolveOrganization(subscriptionId: string): Promise<string | null>;
  verifyWebhook(raw: string, signature: string | null): BillingNotification | null;
}
export class BillingProviderError extends Error {
  readonly code: string;
  constructor(code: string) {
    super(code);
    this.code = code;
    this.name = 'BillingProviderError';
  }
}
