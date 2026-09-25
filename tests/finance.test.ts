import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatCurrency, moneyMask, parseMoneyInput } from '../src/utils/money.ts';
import { businessToday, formatDate, isDate, resolveDateRange } from '../src/utils/dates.ts';
import {
  accountSchema,
  transactionSchema,
  transferSchema,
  settlementSchema,
  paymentSchema,
} from '../src/validations/finance.ts';

test('valores brasileiros mantêm os centavos, inclusive negativos e no limite', () => {
  assert.equal(parseMoneyInput('R$ 1.234,56'), '1234.56');
  assert.equal(parseMoneyInput('-0,50'), '-0.50');
  assert.equal(parseMoneyInput('999.999.999.999,99'), '999999999999.99');
  assert.equal(parseMoneyInput('1.000.000.000.000,00'), null);
  for (const value of ['1.00', '1,001', '', 'Infinity', '1e3', '1.23.456,78'])
    assert.equal(parseMoneyInput(value), null);
  assert.equal(formatCurrency('999999999999.99'), 'R$ 999.999.999.999,99');
  assert.equal(formatCurrency('-0.50'), '− R$ 0,50');
  assert.equal(formatCurrency('NaN'), '—');
  assert.equal(moneyMask('123456'), '1.234,56');
});

test('semana atravessa mês e ano corretamente', () => {
  const september = resolveDateRange('week', '2026-09-01');
  assert.equal(september.start, '2026-08-31');
  assert.equal(september.end, '2026-09-06');
  const january = resolveDateRange('week', '2027-01-01');
  assert.equal(january.start, '2026-12-28');
  assert.equal(january.end, '2027-01-03');
});

test('períodos respeitam anos bissextos, limites de mês e datas inválidas', () => {
  assert.equal(resolveDateRange('last-month', '2024-03-31').end, '2024-02-29');
  assert.equal(resolveDateRange('month', '2026-02-15').end, '2026-02-28');
  assert.equal(resolveDateRange('30-days', '2026-03-01').start, '2026-01-31');
  for (const value of ['2026-02-29', '2026-04-31', '0000-01-01', '13/09/2026'])
    assert.equal(isDate(value), false);
  assert.equal(isDate('2024-02-29'), true);
  assert.equal(
    resolveDateRange('custom', '2026-09-13', '2026-09-20', '2026-09-01').preset,
    'month',
  );
  assert.equal(
    resolveDateRange('custom', '2026-09-13', '2000-01-01', '2026-09-01').preset,
    'month',
  );
  assert.equal(
    resolveDateRange('custom', '2026-09-13', '2026-09-01', '2026-09-01').preset,
    'custom',
  );
});

const account = '11111111-1111-4111-8111-111111111111';
const category = '22222222-2222-4222-8222-222222222222';
const transaction = {
  account_id: account,
  category_id: category,
  client_id: null,
  type: 'income',
  description: 'Serviço',
  amount: '0.01',
  competence_date: '2026-09-01',
  due_date: '2026-09-13',
  paid_at: null,
  status: 'pending',
  payment_method: 'pix',
  is_fixed: false,
  notes: null,
};

test('todos os atalhos de período usam datas válidas e inclusivas', () => {
  const ranges = [
    ['today', '2026-09-13', '2026-09-13'],
    ['week', '2026-09-07', '2026-09-13'],
    ['month', '2026-09-01', '2026-09-30'],
    ['last-month', '2026-08-01', '2026-08-31'],
    ['30-days', '2026-08-15', '2026-09-13'],
    ['3-months', '2026-07-01', '2026-09-13'],
    ['6-months', '2026-04-01', '2026-09-13'],
    ['year', '2026-01-01', '2026-09-13'],
    ['unknown', '2026-09-01', '2026-09-30'],
  ];
  for (const [preset, start, end] of ranges) {
    const range = resolveDateRange(preset, '2026-09-13');
    assert.deepEqual([range.start, range.end], [start, end], preset);
  }
  assert.equal(isDate(businessToday()), true);
  assert.equal(formatDate('2026-09-13'), '13/09/2026');
  assert.equal(formatDate('2026-02-30'), '—');
});

test('máscara e leitura monetária preservam valores de ida e volta', () => {
  for (const cents of ['0', '1', '99', '100', '10001', '99999999999999']) {
    const expected = `${BigInt(cents) / 100n}.${String(BigInt(cents) % 100n).padStart(2, '0')}`;
    assert.equal(parseMoneyInput(moneyMask(cents)), expected);
  }
  assert.equal(moneyMask(''), '');
  assert.equal(moneyMask('abc'), '');
  assert.equal(parseMoneyInput(' -1.234,5 '), '-1234.50');
  assert.equal(formatCurrency('1.234'), '—');
});

test('cadastros, baixas e formas de pagamento rejeitam campos inválidos', () => {
  const baseAccount = {
    name: 'Conta',
    type: 'bank',
    opening_balance: '0.00',
    opening_date: '2026-09-01',
  };
  for (const type of ['bank', 'cash', 'pix', 'wallet', 'card', 'other'])
    assert.equal(accountSchema.safeParse({ ...baseAccount, type }).success, true);
  for (const patch of [
    { name: ' ' },
    { name: 'x'.repeat(81) },
    { type: 'invalid' },
    { opening_date: '2026-02-30' },
    { opening_balance: '1,00' },
  ])
    assert.equal(accountSchema.safeParse({ ...baseAccount, ...patch }).success, false);
  for (const method of [
    'pix',
    'cash',
    'bank_transfer',
    'credit_card',
    'debit_card',
    'boleto',
    'other',
  ])
    assert.equal(paymentSchema.safeParse(method).success, true);
  const settlement = {
    id: account,
    account_id: account,
    paid_at: '2026-09-13',
    payment_method: 'pix',
  };
  assert.equal(settlementSchema.safeParse(settlement).success, true);
  for (const patch of [
    { id: '' },
    { account_id: 'invalid' },
    { paid_at: '2026-02-30' },
    { payment_method: 'invalid' },
  ])
    assert.equal(settlementSchema.safeParse({ ...settlement, ...patch }).success, false);
  for (const patch of [
    { description: ' ' },
    { description: 'x'.repeat(201) },
    { notes: 'x'.repeat(5001) },
    { client_id: 'invalid' },
    { category_id: '' },
    { is_fixed: 'true' },
  ])
    assert.equal(transactionSchema.safeParse({ ...transaction, ...patch }).success, false);
});

test('validações impedem valores inválidos e efetivações inconsistentes', () => {
  assert.equal(transactionSchema.safeParse(transaction).success, true);
  for (const amount of ['0.00', '-1.00', '1.001', '1e3', '1000000000000.00'])
    assert.equal(transactionSchema.safeParse({ ...transaction, amount }).success, false);
  assert.equal(transactionSchema.safeParse({ ...transaction, status: 'paid' }).success, false);
  assert.equal(
    transactionSchema.safeParse({ ...transaction, paid_at: '2026-09-13' }).success,
    false,
  );
  assert.equal(
    transactionSchema.safeParse({ ...transaction, status: 'paid', paid_at: '2026-09-13' }).success,
    true,
  );
  assert.equal(
    transferSchema.safeParse({
      from: account,
      to: account,
      amount: '1.00',
      date: '2026-09-13',
      notes: null,
    }).success,
    false,
  );
  assert.equal(
    accountSchema.safeParse({
      name: 'Conta devedora',
      type: 'bank',
      opening_balance: '-250.00',
      opening_date: '2026-09-01',
    }).success,
    true,
  );
});
