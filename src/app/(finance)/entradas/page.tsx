import { TransactionsPage, type TransactionPageProps } from '@/features/finance/transactions-page';

export const metadata = { title: 'Entradas' };

export default function IncomePage(props: TransactionPageProps) {
  return <TransactionsPage {...props} type="income" />;
}
