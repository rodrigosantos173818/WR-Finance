import { getDashboard } from '@/services/dashboard';
import { requireOrganization } from '@/services/session';
import { businessToday, resolveDateRange } from '@/utils/dates';
import { getDetails } from './actions';
import { Transactions } from './transactions';

export type TransactionPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function TransactionsPage({
  searchParams,
  type,
}: TransactionPageProps & { type: 'income' | 'expense' }) {
  const params = await searchParams;
  const single = (key: string) => (typeof params[key] === 'string' ? params[key] : undefined);
  const range = resolveDateRange(single('range'), businessToday(), single('start'), single('end'));
  const pending = single('status') === 'pending';
  const requestedPage = Number(single('page') ?? 1);
  let page =
    Number.isInteger(requestedPage) && requestedPage > 0 && requestedPage <= 21474836
      ? requestedPage
      : 1;
  const { organization } = await requireOrganization();
  const data = await getDashboard(range, 3);
  const category = data.categories.find(
    (item) => item.id === single('category') && item.type === type,
  )?.id;
  const filter = { start: range.start, end: range.end, type, pending, category };
  let result = await getDetails({ ...filter, offset: (page - 1) * 100 });
  if (!result.ok) throw new Error(result.error);
  const lastPage = Math.max(1, Math.ceil(result.data.count / 100));
  // A saved settlement can remove the last item of the current page.
  if (page > lastPage) {
    page = lastPage;
    result = await getDetails({ ...filter, offset: (page - 1) * 100 });
    if (!result.ok) throw new Error(result.error);
  }
  return (
    <Transactions
      key={`${organization.id}:${type}`}
      type={type}
      data={data}
      range={range}
      pending={pending}
      category={category ?? ''}
      page={page}
      records={result.data}
    />
  );
}
