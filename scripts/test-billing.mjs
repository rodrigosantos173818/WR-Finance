import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { subscriptionAccessSchema } from '../src/billing/types.ts';

const db = new PGlite();
const alice = '11111111-1111-4111-8111-111111111111';
const bob = '22222222-2222-4222-8222-222222222222';
const q = (sql, args = []) => db.query(sql, args);
const value = async (sql, args = []) => Object.values((await q(sql, args)).rows[0])[0];
async function asUser(user) {
  await db.exec('reset role; set role authenticated');
  await q("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function trusted() {
  await db.exec('reset role');
}
async function denied(sql, args = [], message) {
  await assert.rejects(
    q(sql, args),
    (error) =>
      message ? error.message.includes(message) : ['42501', 'P0001'].includes(error.code),
    sql,
  );
}
async function access(org) {
  return subscriptionAccessSchema.parse(
    await value('select public.get_subscription_access($1)', [org]),
  );
}
try {
  await db.exec(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`);
  await q('insert into auth.users values($1),($2)', [alice, bob]);
  const migrations = (await readdir('supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrations.filter((file) => !file.includes('billing_and_trials')))
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));
  await asUser(alice);
  const legacy = await value("select public.create_organization('Empresa anterior à cobrança')");
  const account = await value(
    "select public.create_account($1,'Conta antiga','bank',100,'2020-01-01')",
    [legacy],
  );
  await trusted();
  await db.exec(
    await readFile(
      `supabase/migrations/${migrations.find((file) => file.includes('billing_and_trials'))}`,
      'utf8',
    ),
  );
  assert.equal(await value('select count(*)::int from public.accounts where id=$1', [account]), 1);
  assert.equal(
    await value(
      'select extract(epoch from(trial_ends_at-trial_started_at))::int from public.subscriptions where organization_id=$1',
      [legacy],
    ),
    2592000,
  );
  await asUser(alice);
  const initial = await access(legacy);
  assert.equal(initial.status, 'trialing');
  assert.equal(initial.canWrite, true);
  assert.equal(initial.daysRemaining, 30);
  assert.equal(initial.plan.priceCents, 1990);
  const second = await value("select public.create_organization('Outra empresa do mesmo usuário')");
  assert.equal((await access(second)).trialEndsAt, initial.trialEndsAt);
  await q('delete from public.organizations where id=$1', [second]);
  assert.equal(
    await value('select count(*)::int from public.organizations where id=$1', [second]),
    0,
  );
  await denied("update public.subscriptions set status='active' where organization_id=$1", [
    legacy,
  ]);
  await denied(
    "update public.subscriptions set trial_ends_at=now()+interval '1 year' where organization_id=$1",
    [legacy],
  );
  await denied('delete from public.subscriptions where organization_id=$1', [legacy]);
  await denied('select * from private.billing_trial_claims');
  await denied(
    "insert into public.plans(name,slug,price_cents,billing_interval,trial_days) values('Fake','fake',1,'month',30)",
  );
  await denied("select public.billing_set_customer($1,'stripe','cus_fake')", [legacy]);
  await denied("select public.claim_billing_event($1,'stripe','evt_fake','invoice.paid')", [
    legacy,
  ]);
  await asUser(bob);
  const other = await value("select public.create_organization('Empresa de outro usuário')");
  assert.equal((await access(other)).daysRemaining, 30);
  assert.equal(
    (await q('select id from public.subscriptions where organization_id=$1', [legacy])).rows.length,
    0,
  );
  await denied('select public.get_subscription_access($1)', [legacy]);
  await denied('select public.begin_billing_checkout($1)', [legacy]);
  await trusted();
  await q(
    "insert into public.organization_members(organization_id,user_id,role) values($1,$2,'member')",
    [legacy, bob],
  );
  await asUser(bob);
  assert.equal((await access(legacy)).canManage, false);
  await denied('select public.begin_billing_checkout($1)', [legacy]);
  await asUser(alice);
  const reservation1 = await value('select public.begin_billing_checkout($1)', [legacy]);
  const reservation2 = await value('select public.begin_billing_checkout($1)', [legacy]);
  assert.equal(
    reservation1.key,
    reservation2.key,
    'Concurrent/repeated checkout uses the same reservation',
  );

  const account2 = await value(
    "select public.create_account($1,'Outra conta','bank',0,'2020-01-01')",
    [legacy],
  );
  const category = await value(
    "select id from public.categories where organization_id=$1 and type='income' limit 1",
    [legacy],
  );
  const client = await value(
    "insert into public.clients(organization_id,name) values($1,'Cliente preservado') returning id",
    [legacy],
  );
  const recurring = await value(
    "insert into public.recurring_transactions(organization_id,account_id,category_id,type,description,amount,next_due_date) values($1,$2,$3,'income','Recorrência preservada',10,current_date) returning id",
    [legacy, account, category],
  );
  const transaction = await value(
    "select public.create_transaction($1,$2,$3,null,'income','Entrada preservada',10,current_date,current_date,null,'pending','pix',false,null)",
    [legacy, account, category],
  );
  const transfer = await value('select public.create_transfer($1,$2,$3,1,current_date,null)', [
    legacy,
    account,
    account2,
  ]);
  await trusted();
  await q(
    "update public.subscriptions set trial_started_at=statement_timestamp()-interval '10 days',trial_ends_at=statement_timestamp()+interval '20 days' where organization_id=$1",
    [legacy],
  );
  await asUser(alice);
  const twenty = await access(legacy);
  assert.equal(twenty.canWrite, true);
  assert.equal(twenty.daysRemaining, 20);
  await trusted();
  for (const [instant, allowed] of [
    ['2026-10-01T23:59:59.999Z', true],
    ['2026-10-02T00:00:00Z', false],
  ]) {
    assert.equal(
      await value(
        "select private.subscription_can_write('trialing','2026-10-02T00:00:00Z',null,null,$1)",
        [instant],
      ),
      allowed,
    );
  }
  await q(
    "update public.subscriptions set trial_started_at=statement_timestamp()-interval '31 days',trial_ends_at=statement_timestamp()-interval '1 day' where organization_id=$1",
    [legacy],
  );
  await asUser(alice);
  const expired = await access(legacy);
  assert.equal(expired.status, 'expired');
  assert.equal(expired.canRead, true);
  assert.equal(expired.canWrite, false);
  assert.equal(expired.daysRemaining, 0);
  for (const [table, id, assignment] of [
    ['accounts', account, "name='Proibido'"],
    ['categories', category, "name='Proibido'"],
    ['clients', client, "name='Proibido'"],
    ['transactions', transaction, "notes='Proibido'"],
    ['transfers', transfer, "notes='Proibido'"],
    ['recurring_transactions', recurring, "notes='Proibido'"],
  ]) {
    assert.equal(await value(`select count(*)::int from public.${table} where id=$1`, [id]), 1);
    await denied(
      `update public.${table} set ${assignment} where id=$1`,
      [id],
      'SUBSCRIPTION_REQUIRED',
    );
    await denied(`delete from public.${table} where id=$1`, [id], 'SUBSCRIPTION_REQUIRED');
  }
  const blockedInserts = [
    ["insert into public.accounts(organization_id,name) values($1,'Proibido')", [legacy]],
    [
      "insert into public.categories(organization_id,name,type) values($1,'Proibido','income')",
      [legacy],
    ],
    ["insert into public.clients(organization_id,name) values($1,'Proibido')", [legacy]],
    [
      "insert into public.transactions(organization_id,account_id,category_id,type,description,amount,competence_date,due_date) values($1,$2,$3,'income','Proibido',1,current_date,current_date)",
      [legacy, account, category],
    ],
    [
      'insert into public.transfers(organization_id,from_account_id,to_account_id,amount,transferred_at) values($1,$2,$3,1,current_date)',
      [legacy, account, account2],
    ],
    [
      "insert into public.recurring_transactions(organization_id,account_id,category_id,type,description,amount,next_due_date) values($1,$2,$3,'income','Proibido',1,current_date)",
      [legacy, account, category],
    ],
    ["select public.create_account($1,'Proibido','bank',0,current_date)", [legacy]],
    [
      "select public.create_transaction($1,$2,$3,null,'income','Proibido',1,current_date,current_date,null,'pending','pix',false,null)",
      [legacy, account, category],
    ],
    [
      "select public.settle_transaction($1,$2,$3,current_date,'pix')",
      [legacy, transaction, account],
    ],
    ['select public.create_transfer($1,$2,$3,1,current_date,null)', [legacy, account, account2]],
    ['delete from public.organizations where id=$1', [legacy]],
  ];
  for (const [sql, args] of blockedInserts) await denied(sql, args, 'SUBSCRIPTION_REQUIRED');
  const dashboard = await value('select public.get_dashboard($1,current_date,current_date,3)', [
    legacy,
  ]);
  assert.equal(dashboard.summary.balance, '100.00');
  assert.ok(
    (
      await value(
        'select public.get_transaction_details($1,current_date,current_date,null,null,true,0)',
        [legacy],
      )
    ).items.length,
  );

  // Expiration, deleting a company, or creating another company never resets the ledger.
  await trusted();
  await q(
    "update private.billing_trial_claims set started_at=statement_timestamp()-interval '31 days',ends_at=statement_timestamp()-interval '1 day' where user_id=$1",
    [alice],
  );
  await asUser(alice);
  const expiredCompany = await value("select public.create_organization('Empresa sem novo teste')");
  assert.equal((await access(expiredCompany)).canWrite, false);
  for (let i = 3; i < 10; i++)
    await value(`select public.create_organization('Empresa limite ${i}')`);
  await denied(
    "select public.create_organization('Décima primeira empresa')",
    [],
    'COMPANY_LIMIT_REACHED',
  );
  await trusted();
  const originalTrial = await value(
    'select trial_ends_at::text from public.subscriptions where organization_id=$1',
    [legacy],
  );
  const billingId = await value('select id from public.subscriptions where organization_id=$1', [
    legacy,
  ]);
  const now = Date.now();
  const snapshot = {
    provider: 'stripe',
    organizationId: legacy,
    billingId,
    customerId: 'cus_test',
    subscriptionId: 'sub_test',
    status: 'active',
    terminal: false,
    periodStart: new Date(now - 60000).toISOString(),
    periodEnd: new Date(now + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: false,
    canceledAt: null,
  };
  await db.exec('set role service_role');
  await value("select public.billing_set_customer($1,'stripe','cus_test')", [legacy]);
  const event = await value(
    "select public.claim_billing_event($1,'stripe','evt_paid','invoice.paid')",
    [legacy],
  );
  await denied(
    "select public.claim_billing_event($1,'stripe','evt_competing','invoice.paid')",
    [legacy],
    'BILLING_SYNC_BUSY',
  );
  await value('select public.apply_billing_event($1,$2,$3,$4)', [
    legacy,
    event.token,
    'evt_paid',
    snapshot,
  ]);
  assert.equal(
    (
      await value("select public.claim_billing_event($1,'stripe','evt_paid','invoice.paid')", [
        legacy,
      ])
    ).duplicate,
    true,
  );
  await trusted();
  assert.equal(
    await value(
      "select count(*)::int from public.billing_events where event_id='evt_paid' and processed_at is not null",
    ),
    1,
  );
  assert.equal(
    await value('select trial_ends_at::text from public.subscriptions where organization_id=$1', [
      legacy,
    ]),
    originalTrial,
  );
  await asUser(alice);
  assert.equal((await access(legacy)).canWrite, true);
  await value("select public.create_account($1,'Liberada após pagamento','bank',0,current_date)", [
    legacy,
  ]);
  await trusted();
  await q(
    "update public.subscriptions set status='canceled',cancel_at_period_end=true where organization_id=$1",
    [legacy],
  );
  await asUser(alice);
  assert.equal((await access(legacy)).canWrite, true);
  await trusted();
  await q(
    "update public.subscriptions set current_period_start=now()-interval '32 days',current_period_end=now()-interval '2 days' where organization_id=$1",
    [legacy],
  );
  await asUser(alice);
  assert.equal((await access(legacy)).canWrite, false);
  await trusted();
  await q(
    "update public.subscriptions set status='past_due',current_period_end=now()+interval '2 days' where organization_id=$1",
    [legacy],
  );
  await asUser(alice);
  assert.equal((await access(legacy)).canWrite, false);
  await trusted();
  await q(
    "update public.subscriptions set status='active',current_period_end=now()-interval '2 days' where organization_id=$1",
    [legacy],
  );
  await asUser(alice);
  assert.equal((await access(legacy)).status, 'expired');
  await trusted();
  await db.exec('set role service_role');
  const retry = await value(
    "select public.claim_billing_event($1,'stripe','evt_retry','invoice.paid')",
    [legacy],
  );
  await denied(
    'select public.apply_billing_event($1,$2,$3,$4)',
    [legacy, retry.token, 'evt_retry', { ...snapshot, customerId: 'cus_other' }],
    'BILLING_CUSTOMER_MISMATCH',
  );
  await value('select public.release_billing_event($1,$2)', [legacy, retry.token]);
  const retry2 = await value(
    "select public.claim_billing_event($1,'stripe','evt_retry','invoice.paid')",
    [legacy],
  );
  await denied(
    'select public.apply_billing_event($1,$2,$3,$4)',
    [legacy, retry.token, 'evt_retry', snapshot],
    'BILLING_SYNC_STALE',
  );
  await value('select public.apply_billing_event($1,$2,$3,$4)', [
    legacy,
    retry2.token,
    'evt_retry',
    snapshot,
  ]);
  await trusted();
  assert.equal(
    await value(
      "select count(*)::int from public.billing_events where event_id='evt_retry' and processed_at is not null",
    ),
    1,
  );
  const unpaidBillingId = await value(
    'select id from public.subscriptions where organization_id=$1',
    [other],
  );
  await db.exec('set role service_role');
  await value("select public.billing_set_customer($1,'stripe','cus_unpaid')", [other]);
  for (const status of ['past_due', 'expired', 'canceled']) {
    const eventId = `evt_unpaid_${status}`;
    const claim = await value(
      "select public.claim_billing_event($1,'stripe',$2,'customer.subscription.updated')",
      [other, eventId],
    );
    await value('select public.apply_billing_event($1,$2,$3,$4)', [
      other,
      claim.token,
      eventId,
      {
        ...snapshot,
        organizationId: other,
        billingId: unpaidBillingId,
        customerId: 'cus_unpaid',
        subscriptionId: 'sub_unpaid',
        status,
        terminal: status !== 'past_due',
        periodStart: null,
        periodEnd: null,
      },
    ]);
    await asUser(bob);
    const unpaid = await access(other);
    assert.equal(unpaid.status, 'trialing', 'An unpaid checkout must preserve the original trial');
    assert.equal(unpaid.canWrite, true);
    await trusted();
    await db.exec('set role service_role');
  }
  for (const [eventId, state] of [
    [
      'evt_old_terminal',
      {
        ...snapshot,
        status: 'canceled',
        terminal: true,
        periodStart: new Date(now - 32 * 86400000).toISOString(),
        periodEnd: new Date(now - 2 * 86400000).toISOString(),
      },
    ],
    ['evt_new_paid', { ...snapshot, subscriptionId: 'sub_new' }],
    ['evt_late_old', { ...snapshot, status: 'canceled', terminal: true }],
  ]) {
    const claim = await value(
      "select public.claim_billing_event($1,'stripe',$2,'customer.subscription.updated')",
      [legacy, eventId],
    );
    await value('select public.apply_billing_event($1,$2,$3,$4)', [
      legacy,
      claim.token,
      eventId,
      state,
    ]);
  }
  await trusted();
  assert.equal(
    await value(
      'select provider_subscription_id from public.subscriptions where organization_id=$1',
      [legacy],
    ),
    'sub_new',
  );
  await asUser(alice);
  assert.equal(
    (await access(legacy)).status,
    'active',
    'A superseded subscription cannot overwrite its replacement',
  );
  await trusted();
  await db.exec('set role anon');
  await denied('select public.get_subscription_access($1)', [legacy]);
  console.log(
    'OK: billing migration/backfill, exact 30-day trial, shared eligibility and cap, RLS, immutable trial, six-table direct-write protection, read-only RPCs, paid/canceled/past_due states, checkout reservation, duplicate events, lease fencing and safe retries.',
  );
} finally {
  await db.close();
}
