import { BillingPage } from '@/features/billing/billing-page';
import { billingConfigured } from '@/billing/provider-server';

export const metadata = { title: 'Assinatura' };
export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  return (
    <BillingPage
      configured={billingConfigured()}
      checkout={typeof params.checkout === 'string' ? params.checkout : undefined}
      returnCompany={typeof params.company === 'string' ? params.company : undefined}
    />
  );
}
