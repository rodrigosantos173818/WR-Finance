import { TransactionsPage, type TransactionPageProps } from '@/features/finance/transactions-page';

export const metadata = { title: 'Despesas' };

export default function ExpensesPage(props: TransactionPageProps) {
  return <TransactionsPage {...props} type="expense" />;
}
