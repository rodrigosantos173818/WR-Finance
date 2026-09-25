import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseBRL,
  summarize,
  categoryTotals,
  dailySeries,
  monthTransactions,
  type Transaction,
} from './finance.ts';

const transactions: Transaction[] = [
  {
    id: '1',
    title: 'Receita',
    contact: 'Cliente',
    category: 'Serviços',
    account: 'Principal',
    amount: 125090,
    type: 'income',
    status: 'paid',
    date: '2026-09-02',
  },
  {
    id: '2',
    title: 'Despesa',
    contact: 'Fornecedor',
    category: 'Software',
    account: 'Principal',
    amount: 50000,
    type: 'expense',
    status: 'paid',
    date: '2026-09-10',
  },
  {
    id: '3',
    title: 'A receber',
    contact: 'Cliente',
    category: 'Serviços',
    account: 'Principal',
    amount: 90000,
    type: 'income',
    status: 'pending',
    date: '2026-09-15',
  },
  {
    id: '4',
    title: 'Em atraso',
    contact: 'Fornecedor',
    category: 'Software',
    account: 'Principal',
    amount: 40000,
    type: 'expense',
    status: 'overdue',
    date: '2026-09-01',
  },
];
test('moeda brasileira mantém centavos e rejeita valores inválidos', () => {
  assert.equal(parseBRL('1.250,90'), 125090);
  assert.equal(parseBRL('0,01'), 1);
  assert.equal(parseBRL('1250,9'), 125090);
  assert.equal(parseBRL('R$ 20,50'), 2050);
  for (const invalid of [
    '',
    '0',
    '-1',
    '1.25',
    '10,123',
    '1e6',
    'NaN',
    'R$ texto',
    '99999999999999999',
  ])
    assert.equal(parseBRL(invalid), null, invalid);
});
test('saldo de caixa exclui valores pendentes e vencidos', () => {
  assert.deepEqual(summarize(transactions, 10000), {
    income: 125090,
    expenses: 50000,
    profit: 75090,
    balance: 85090,
  });
  assert.deepEqual(summarize([], 10000), { income: 0, expenses: 0, profit: 0, balance: 10000 });
});
test('categorias e gráfico conciliam com os totais de caixa', () => {
  assert.deepEqual(categoryTotals(transactions), [{ name: 'Software', value: 50000 }]);
  const series = dailySeries(transactions, '2026-09');
  assert.equal(series.length, 30);
  assert.equal(series[0].Receitas, 0);
  assert.equal(series[1].Receitas, 1250.9);
  assert.equal(series.at(-1)?.Despesas, 500);
  assert.equal(monthTransactions(transactions, '2026-10').length, 0);
});
