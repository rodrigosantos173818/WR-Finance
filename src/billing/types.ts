import { z } from 'zod';

export const subscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'expired',
]);
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>;
const timestamp = z.iso.datetime({ offset: true });
export const subscriptionAccessSchema = z.object({
  organizationId: z.uuid(),
  subscriptionId: z.uuid().nullable(),
  status: subscriptionStatusSchema,
  available: z.boolean(),
  canRead: z.literal(true),
  canWrite: z.boolean(),
  isReadOnly: z.boolean(),
  isTrial: z.boolean(),
  isActive: z.boolean(),
  isExpired: z.boolean(),
  canManage: z.boolean(),
  trialStartedAt: timestamp.nullable(),
  trialEndsAt: timestamp.nullable(),
  daysRemaining: z.number().int().min(0).max(30),
  trialCalendarDays: z.number().int().min(0).max(30),
  currentPeriodStart: timestamp.nullable(),
  currentPeriodEnd: timestamp.nullable(),
  canceledAt: timestamp.nullable(),
  cancelAtPeriodEnd: z.boolean(),
  createdAt: timestamp.nullable(),
  serverNow: timestamp.nullable(),
  hasProviderSubscription: z.boolean(),
  plan: z.object({
    slug: z.literal('pro'),
    name: z.string(),
    priceCents: z.number().int().positive(),
    currency: z.literal('BRL'),
    interval: z.literal('month'),
    trialDays: z.literal(30),
  }),
});
export type SubscriptionAccess = z.infer<typeof subscriptionAccessSchema>;
export const PRO_PLAN: SubscriptionAccess['plan'] = {
  slug: 'pro',
  name: 'WR Finance Pro',
  priceCents: 1990,
  currency: 'BRL',
  interval: 'month',
  trialDays: 30,
};
export const SUBSCRIPTION_REQUIRED = 'SUBSCRIPTION_REQUIRED' as const;

export const billingSnapshotSchema = z.object({
  provider: z.literal('stripe'),
  organizationId: z.uuid(),
  billingId: z.uuid(),
  customerId: z.string().min(1).max(255),
  subscriptionId: z.string().min(1).max(255),
  status: subscriptionStatusSchema,
  terminal: z.boolean(),
  periodStart: timestamp.nullable(),
  periodEnd: timestamp.nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: timestamp.nullable(),
});
export type BillingSnapshot = z.infer<typeof billingSnapshotSchema>;
export type BillingNotification = { id: string; type: string; subscriptionId: string };

export function unavailableAccess(organizationId: string, canManage: boolean): SubscriptionAccess {
  return {
    organizationId,
    subscriptionId: null,
    status: 'expired',
    available: false,
    canRead: true,
    canWrite: false,
    isReadOnly: true,
    isTrial: false,
    isActive: false,
    isExpired: false,
    canManage,
    trialStartedAt: null,
    trialEndsAt: null,
    daysRemaining: 0,
    trialCalendarDays: 0,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    canceledAt: null,
    createdAt: null,
    serverNow: null,
    hasProviderSubscription: false,
    plan: PRO_PLAN,
  };
}
