export type Transaction = {
  id: string;
  title: string;
  contact: string;
  category: string;
  account: string;
  amount: number;
  type: 'income' | 'expense';
  status: 'paid' | 'pending' | 'overdue';
  date: string;
};
export const categories = ['Serviços', 'Vendas', 'Marketing', 'Equipe', 'Operacional', 'Software'];
export const accounts = ['Conta principal', 'Conta digital', 'Reserva'];
export const openingBalance = 865090;
export function summarize(transactions: Transaction[], initial = 0) {
  const income = transactions
    .filter((t) => t.type === 'income' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  const expenses = transactions
    .filter((t) => t.type === 'expense' && t.status === 'paid')
    .reduce((sum, t) => sum + t.amount, 0);
  return { income, expenses, profit: income - expenses, balance: initial + income - expenses };
}
export function parseBRL(value: string): number | null {
  const cleaned = value.trim().replace(/^R\$\s*/, '');
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(cleaned)) return null;
  const [integer, decimals = ''] = cleaned.replaceAll('.', '').split(',');
  const cents = Number(integer) * 100 + Number(decimals.padEnd(2, '0'));
  return Number.isSafeInteger(cents) && cents > 0 && cents <= 99999999999 ? cents : null;
}
export function monthTransactions(transactions: Transaction[], month: string) {
  return transactions.filter((t) => t.date.startsWith(month));
}
export function formatDate(value: string) {
  return new Date(`${value}T12:00:00`)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '');
}
export function categoryTotals(transactions: Transaction[]) {
  return categories
    .map((name) => ({
      name,
      value: transactions
        .filter((t) => t.type === 'expense' && t.status === 'paid' && t.category === name)
        .reduce((sum, t) => sum + t.amount, 0),
    }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
}
export function dailySeries(transactions: Transaction[], month: string) {
  const [year, monthNumber] = month.split('-').map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: days }, (_, i) => {
    const date = `${month}-${String(i + 1).padStart(2, '0')}`;
    const totals = summarize(transactions.filter((t) => t.date <= date));
    return {
      day: String(i + 1).padStart(2, '0'),
      Receitas: totals.income / 100,
      Despesas: totals.expenses / 100,
    };
  });
}
