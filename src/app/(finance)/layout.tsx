import { requireOrganization } from '@/services/session';
import { AppShell } from '@/components/layout/app-shell';
import { getSubscriptionAccess } from '@/billing/subscription-service';
import { SubscriptionProvider } from '@/features/billing/subscription-provider';
export const dynamic = 'force-dynamic';
export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { user, organization, organizations } = await requireOrganization();
  const name =
    typeof user.user_metadata.full_name === 'string'
      ? user.user_metadata.full_name
      : user.email?.split('@')[0] || 'Minha conta';
  const subscription = await getSubscriptionAccess();
  return (
    <SubscriptionProvider key={organization.id} initial={subscription}>
      <AppShell
        user={{ name, email: user.email || '' }}
        organization={organization}
        organizations={organizations}
      >
        {children}
      </AppShell>
    </SubscriptionProvider>
  );
}
