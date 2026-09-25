import { Dashboard } from '@/features/finance/dashboard';
import { getDashboard } from '@/services/dashboard';
import { requireOrganization } from '@/services/session';
import { businessToday, resolveDateRange } from '@/utils/dates';

export const metadata = { title: 'Dashboard' };

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined);
  const range = resolveDateRange(single('range'), businessToday(), single('start'), single('end'));
  const months = single('months') === '12' ? 12 : single('months') === '3' ? 3 : 6;
  const { organization } = await requireOrganization();
  const data = await getDashboard(range, months);
  return <Dashboard key={organization.id} data={data} range={range} chartMonths={months} />;
}
