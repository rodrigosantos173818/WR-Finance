import { PGlite } from '@electric-sql/pglite';
import { readFile, readdir } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { dashboardSchema, detailsSchema } from '../src/validations/dashboard.ts';

// Actual PostgreSQL engine in memory. Test fixtures never enter a Supabase project.
const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const member = '33333333-3333-4333-8333-333333333333';
const sql = (text, params = []) => db.query(text, params);
async function asUser(id) {
  await db.exec('reset role; set role authenticated;');
  await sql("select set_config('request.jwt.claim.sub',$1,false)", [id]);
}
async function expectDenied(text, params = []) {
  let denied = false;
  try {
    await sql(text, params);
  } catch (error) {
    denied = ['42501', '23502', '23503', '23505', '23514', '22023', '22003'].includes(error.code);
    if (!denied) throw error;
  }
  assert.equal(denied, true, `Operation should be denied: ${text}`);
}
try {
  await db.exec(
    `create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  await sql('insert into auth.users(id) values($1),($2),($3)', [alice, bob, member]);
  for (const file of (await readdir('supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  await asUser(alice);
  const orgA = (await sql("select public.create_organization('Empresa A') id")).rows[0].id;
  const empty = (
    await sql("select public.get_dashboard($1,'2026-02-01','2026-02-28',6) data", [orgA])
  ).rows[0].data;
  dashboardSchema.parse(empty);
  assert.equal(empty.accounts.length, 0);
  assert.equal(empty.recent.length, 0);
  assert.equal(empty.expense_categories.length, 0);
  for (const value of Object.values(empty.summary)) assert.equal(Number(value), 0);
  assert.equal(empty.monthly.length, 6);
  const organizations = (await sql('select public.get_my_organizations() data')).rows[0].data;
  assert.equal(organizations[0].role, 'owner');
  const accountA = (
    await sql("select public.create_account($1,'Conta A','bank',1000,'2026-01-01') id", [orgA])
  ).rows[0].id;
  const accountB = (
    await sql("select public.create_account($1,'Carteira','cash',0,'2026-01-01') id", [orgA])
  ).rows[0].id;
  const categories = (
    await sql('select id,type from public.categories where organization_id=$1', [orgA])
  ).rows;
  const incomeCategory = categories.find((c) => c.type === 'income').id;
  const expenseCategory = categories.find((c) => c.type === 'expense').id;
  await expectDenied("select public.create_account($1,'Conta A','bank',0,'2026-01-01')", [orgA]);
  await expectDenied(
    "select public.create_account($1,'Saldo inválido','bank',0.001,'2026-01-01')",
    [orgA],
  );
  const insert = `select public.create_transaction($1,$2,$3,null,$4,$5,$6,'2026-01-15',$7,$8,$9,'pix',false,null) id`;
  await sql(insert, [
    orgA,
    accountA,
    incomeCategory,
    'income',
    'Recebimento com vencimento anterior',
    '1000.10',
    '2026-01-20',
    '2026-02-03',
    'paid',
  ]);
  await sql(insert, [
    orgA,
    accountA,
    expenseCategory,
    'expense',
    'Despesa efetiva',
    '100.10',
    '2026-02-05',
    '2026-02-05',
    'paid',
  ]);
  const pendingId = (
    await sql(insert, [
      orgA,
      accountA,
      incomeCategory,
      'income',
      'Valor pendente',
      '500.00',
      '2026-02-10',
      null,
      'pending',
    ])
  ).rows[0].id;
  await sql("select public.create_transfer($1,$2,$3,200,'2026-02-06',null)", [
    orgA,
    accountA,
    accountB,
  ]);
  const snap = (
    await sql("select public.get_dashboard($1,'2026-02-01','2026-02-28',6) data", [orgA])
  ).rows[0].data;
  assert.equal(Number(snap.summary.balance), 1900);
  dashboardSchema.parse(snap);
  assert.equal(snap.summary.income, '1000.10');
  assert.equal(snap.summary.expense, '100.10');
  assert.equal(Number(snap.summary.result), 900);
  assert.equal(Number(snap.summary.receivable), 500);
  assert.equal(Number(snap.accounts.find((a) => a.id === accountA).balance), 1700);
  assert.equal(Number(snap.accounts.find((a) => a.id === accountB).balance), 200);
  const january = (
    await sql("select public.get_dashboard($1,'2026-01-01','2026-01-31',6) data", [orgA])
  ).rows[0].data;
  assert.equal(Number(january.summary.income), 0, 'Revenue follows paid_at, never due_date');
  assert.equal(Number(snap.expense_categories[0].amount), 100.1);
  const previous = (
    await sql("select public.get_dashboard($1,'2026-03-01','2026-03-31',12) data", [orgA])
  ).rows[0].data;
  assert.equal(previous.summary.previous_income, '1000.10');
  assert.equal(previous.summary.previous_expense, '100.10');
  assert.equal(previous.monthly.length, 12);
  for (const months of [0, 13, null])
    await expectDenied("select public.get_dashboard($1,'2026-02-01','2026-02-28',$2)", [
      orgA,
      months,
    ]);
  await expectDenied("select public.get_dashboard($1,'2026-03-01','2026-02-01',6)", [orgA]);
  await expectDenied("select public.create_transfer($1,$2,$2,10,'2026-02-01',null)", [
    orgA,
    accountA,
  ]);
  await expectDenied(insert, [
    orgA,
    accountA,
    incomeCategory,
    'income',
    'Invalid cents',
    '1.001',
    '2026-02-01',
    null,
    'pending',
  ]);
  await expectDenied(insert, [
    orgA,
    accountA,
    expenseCategory,
    'income',
    'Wrong category type',
    '10',
    '2026-02-01',
    null,
    'pending',
  ]);
  await expectDenied(
    'delete from public.organization_members where organization_id=$1 and user_id=$2',
    [orgA, alice],
  );
  await sql(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'member')",
    [orgA, member],
  );
  await asUser(member);
  await sql(
    "update public.organization_members set role='owner' where organization_id=$1 and user_id=$2",
    [orgA, member],
  );
  assert.equal(
    (await sql('select role from public.organization_members where user_id=$1', [member])).rows[0]
      .role,
    'member',
  );
  await expectDenied(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'owner')",
    [orgA, bob],
  );
  await asUser(bob);
  const orgB = (await sql("select public.create_organization('Empresa B') id")).rows[0].id;
  const otherAccount = (
    await sql("select public.create_account($1,'Outra conta','bank',50,'2026-01-01') id", [orgB])
  ).rows[0].id;
  assert.equal(
    (await sql('select * from public.transactions where organization_id=$1', [orgA])).rows.length,
    0,
  );
  await expectDenied("select public.get_dashboard($1,'2026-02-01','2026-02-28',6)", [orgA]);
  await expectDenied("select public.get_transaction_details($1,'2026-02-01','2026-02-28')", [orgA]);
  await expectDenied(insert, [
    orgA,
    accountA,
    incomeCategory,
    'income',
    'Intrusão',
    '10',
    '2026-02-01',
    null,
    'pending',
  ]);
  await sql('update public.transactions set amount=1 where organization_id=$1', [orgA]);
  await asUser(alice);
  await expectDenied(insert, [
    orgA,
    otherAccount,
    incomeCategory,
    'income',
    'Conta de outra empresa',
    '10',
    '2026-02-01',
    null,
    'pending',
  ]);
  // Even membership in BOTH companies does not permit moving a record across tenants.
  await db.exec('reset role');
  await sql(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'member')",
    [orgB, alice],
  );
  await asUser(alice);
  await expectDenied('update public.accounts set organization_id=$1 where id=$2', [orgB, accountA]);
  await sql("select public.settle_transaction($1,$2,$3,'2026-02-12','pix')", [
    orgA,
    pendingId,
    accountA,
  ]);
  await expectDenied("select public.settle_transaction($1,$2,$3,'2026-02-12','pix')", [
    orgA,
    pendingId,
    accountA,
  ]);
  const settled = (
    await sql("select public.get_dashboard($1,'2026-02-01','2026-02-28',6) data", [orgA])
  ).rows[0].data;
  assert.equal(Number(settled.summary.balance), 2400);
  const paidDetails = (
    await sql("select public.get_transaction_details($1,'2026-02-01','2026-02-28') data", [orgA])
  ).rows[0].data;
  detailsSchema.parse(paidDetails);
  assert.equal(paidDetails.count, 3);
  const categoryDetails = (
    await sql(
      "select public.get_transaction_details($1,'2026-02-01','2026-02-28','expense',$2) data",
      [orgA, expenseCategory],
    )
  ).rows[0].data;
  assert.equal(categoryDetails.count, 1);
  await expectDenied("select public.get_transaction_details($1,'2026-03-01','2026-02-01')", [orgA]);
  await expectDenied(
    "select public.get_transaction_details($1,'2026-02-01','2026-02-28',null,null,false,-1)",
    [orgA],
  );
  const lateAccount = (
    await sql("select public.create_account($1,'Conta aberta depois','bank',0,'2026-03-01') id", [
      orgA,
    ])
  ).rows[0].id;
  await expectDenied(insert, [
    orgA,
    lateAccount,
    incomeCategory,
    'income',
    'Antes da abertura',
    '10.00',
    '2026-02-10',
    '2026-02-10',
    'paid',
  ]);
  await expectDenied(
    "select public.create_transfer($1,$2,$3,10,((now() at time zone 'America/Sao_Paulo')::date+1),null)",
    [orgA, accountA, accountB],
  );
  // All pages remain accessible, including totals when an offset is beyond the last page.
  for (let i = 0; i < 105; i++)
    await sql(insert, [
      orgA,
      accountA,
      incomeCategory,
      'income',
      `Pendente ${i}`,
      '1.00',
      '2026-02-10',
      null,
      'pending',
    ]);
  const detailPage = async (offset) =>
    (
      await sql(
        "select public.get_transaction_details($1,'2026-09-01','2026-09-30','income',null,true,$2) data",
        [orgA, offset],
      )
    ).rows[0].data;
  const first = await detailPage(0),
    second = await detailPage(100),
    past = await detailPage(200);
  detailsSchema.parse(first);
  assert.equal(
    first.count,
    105,
    'Pending items include overdue records outside the selected period',
  );
  assert.equal(first.items.length, 100);
  assert.equal(second.items.length, 5);
  assert.equal(new Set([...first.items, ...second.items].map((item) => item.id)).size, 105);
  assert.equal(past.count, 105);
  assert.equal(past.items.length, 0);
  const isolatedOrg = (await sql("select public.create_organization('Casos de borda') id")).rows[0]
    .id;
  const debit = (
    await sql("select public.create_account($1,'Conta negativa','bank',-250,'2026-01-01') id", [
      isolatedOrg,
    ])
  ).rows[0].id;
  const edgeCategories = (
    await sql('select id,type from public.categories where organization_id=$1', [isolatedOrg])
  ).rows;
  const edgeExpense = edgeCategories.find((item) => item.type === 'expense').id;
  const edgeIncome = edgeCategories.find((item) => item.type === 'income').id;
  const edgeSnapshot = async () =>
    (await sql("select public.get_dashboard($1,'2026-02-01','2026-02-28',3) data", [isolatedOrg]))
      .rows[0].data;
  assert.equal(Number((await edgeSnapshot()).summary.balance), -250);
  const edgePending = (
    await sql(insert, [
      isolatedOrg,
      debit,
      edgeExpense,
      'expense',
      'Conta vencida',
      '25.01',
      '2026-02-01',
      null,
      'pending',
    ])
  ).rows[0].id;
  let edge = await edgeSnapshot();
  assert.equal(Number(edge.summary.payable), 25.01);
  assert.equal(edge.summary.payable_overdue, 1);
  assert.equal(Number(edge.summary.balance), -250);
  await sql(insert, [
    isolatedOrg,
    debit,
    edgeIncome,
    'income',
    'Cancelado não entra no caixa',
    '1000.00',
    '2026-02-01',
    null,
    'cancelled',
  ]);
  assert.equal(Number((await edgeSnapshot()).summary.balance), -250);
  await expectDenied(insert, [
    isolatedOrg,
    debit,
    edgeIncome,
    'income',
    'Valor zero',
    '0.00',
    '2026-02-01',
    null,
    'pending',
  ]);
  await expectDenied(insert, [
    isolatedOrg,
    debit,
    edgeIncome,
    'income',
    'Valor negativo',
    '-1.00',
    '2026-02-01',
    null,
    'pending',
  ]);
  await expectDenied(insert, [
    isolatedOrg,
    debit,
    edgeIncome,
    'income',
    'Fora do limite',
    '1000000000000.00',
    '2026-02-01',
    null,
    'pending',
  ]);
  await expectDenied(insert, [
    isolatedOrg,
    debit,
    edgeIncome,
    'income',
    'Pago sem data',
    '1.00',
    '2026-02-01',
    null,
    'paid',
  ]);
  await expectDenied('update public.transactions set created_by=$1 where id=$2', [
    bob,
    edgePending,
  ]);
  await sql("select public.settle_transaction($1,$2,$3,'2026-02-02','boleto')", [
    isolatedOrg,
    edgePending,
    debit,
  ]);
  edge = await edgeSnapshot();
  assert.equal(Number(edge.summary.balance), -275.01);
  assert.equal(Number(edge.summary.payable), 0);
  assert.equal(Number(edge.summary.expense), 25.01);
  await sql('update public.accounts set archived=true where id=$1', [debit]);
  assert.equal(
    Number((await edgeSnapshot()).summary.balance),
    -275.01,
    'Archiving does not erase historical balances',
  );
  await db.exec('reset role; set role anon;');
  await expectDenied('select * from public.transactions');
  await expectDenied("select public.get_transaction_details($1,'2026-02-01','2026-02-28')", [orgA]);
  await expectDenied("select public.create_organization('Intrusão anônima')");
  console.log(
    'OK: migrations, dashboard contracts, exact money, effective dates, balances, transfers, settlement, pagination, filters, RLS isolation, cross-tenant FKs, immutable tenant, roles, last owner, anonymous access.',
  );
} finally {
  await db.close();
}
