// Test-only Auth/PostgREST transport backed by actual PostgreSQL migrations.
// Binds exclusively to loopback. No real Supabase project or credentials are used.
import { createServer } from 'node:http';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

export async function startLocalSupabase({ authOnly = false } = {}) {
  const db = new PGlite();
  const user = {
    id: randomUUID(),
    aud: 'authenticated',
    role: 'authenticated',
    email: 'teste@wr.local',
    email_confirmed_at: new Date().toISOString(),
    user_metadata: { full_name: 'Pessoa de teste' },
    app_metadata: { provider: 'email', providers: ['email'] },
    created_at: new Date().toISOString(),
  };
  let password = 'somente-teste-local';
  let sessionActive = false,
    recoveryChallenge;
  const requests = [];
  const failures = new Map();
  const authFailures = new Map();
  const jwtSecret = randomUUID();
  const encoded = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const tokenBody = `${encoded({ alg: 'HS256', typ: 'JWT' })}.${encoded({ sub: user.id, aud: 'authenticated', role: 'authenticated', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000), session_id: randomUUID() })}`;
  const token = `${tokenBody}.${createHmac('sha256', jwtSecret).update(tokenBody).digest('base64url')}`;
  function session() {
    sessionActive = true;
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      refresh_token: randomUUID(),
      user,
    };
  }
  await db.exec(
    `create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;`,
  );
  await db.query('insert into auth.users(id) values ($1)', [user.id]);
  for (const file of (authOnly ? [] : await readdir('supabase/migrations'))
    .filter((file) => file.endsWith('.sql'))
    .sort())
    await db.exec(await readFile(`supabase/migrations/${file}`, 'utf8'));

  const allowedFunctions = new Set([
    'get_my_organizations',
    'create_organization',
    'create_account',
    'create_transaction',
    'settle_transaction',
    'create_transfer',
    'get_dashboard',
    'get_transaction_details',
    'get_subscription_access',
    'begin_billing_checkout',
  ]);
  const server = createServer(async (request, response) => {
    const send = (status, body) => {
      response.writeHead(status, {
        'Content-Type': 'application/json',
        'X-Supabase-Api-Version': '2024-01-01',
      });
      response.end(JSON.stringify(body));
    };
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      const chunks = [];
      for await (const chunk of request) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
      requests.push({
        path: url.pathname,
        method: request.method,
        body,
        query: Object.fromEntries(url.searchParams),
      });
      if (authFailures.has(url.pathname)) {
        const failure = authFailures.get(url.pathname);
        authFailures.delete(url.pathname);
        return send(failure.status, { code: failure.code, message: 'Simulated Auth failure' });
      }
      if (url.pathname === '/auth/v1/resend') return send(200, {});
      if (url.pathname === '/auth/v1/signup')
        return send(200, {
          ...user,
          id: randomUUID(),
          email: body.email,
          user_metadata: body.data,
          email_confirmed_at: undefined,
        });
      if (url.pathname === '/auth/v1/recover') {
        recoveryChallenge = body.code_challenge;
        return send(200, {});
      }
      if (url.pathname === '/auth/v1/token' && url.searchParams.get('grant_type') === 'pkce') {
        const challenge = createHash('sha256')
          .update(body.code_verifier || '')
          .digest('base64url');
        if (
          body.auth_code !== 'local-recovery-code' ||
          !recoveryChallenge ||
          recoveryChallenge !== challenge
        )
          return send(400, { code: 'invalid_grant', message: 'Invalid test recovery code' });
        recoveryChallenge = undefined;
        return send(200, session());
      }
      if (
        url.pathname === '/auth/v1/token' &&
        body.email === user.email &&
        body.password === password
      )
        return send(200, session());
      if (url.pathname === '/auth/v1/token')
        return send(400, { code: 'invalid_credentials', message: 'Invalid login credentials' });
      if (!sessionActive || request.headers.authorization !== `Bearer ${token}`)
        return send(401, { code: 'bad_jwt', message: 'Test session required' });
      if (url.pathname === '/auth/v1/user') {
        if (request.method === 'PUT' && body.password) password = body.password;
        return send(200, user);
      }
      if (url.pathname === '/auth/v1/logout') {
        sessionActive = false;
        response.writeHead(204);
        response.end();
        return;
      }
      const name = url.pathname.replace('/rest/v1/rpc/', '');
      if (authOnly && name === 'get_my_organizations') return send(200, []);
      if (!allowedFunctions.has(name) || request.method !== 'POST')
        return send(404, { message: 'Test endpoint not found' });
      if (failures.has(name)) {
        const failure = failures.get(name);
        failures.delete(name);
        return send(503, { code: 'XX000', message: failure });
      }
      const keys = Object.keys(body);
      if (!keys.every((key) => /^p_[a-z_]+$/.test(key)))
        return send(400, { message: 'Invalid arguments' });
      const result = await db.transaction(async (tx) => {
        await tx.exec('set local role authenticated');
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user.id]);
        return tx.query(
          `select public.${name}(${keys.map((key, index) => `${key} => $${index + 1}`).join(',')}) data`,
          keys.map((key) => body[key]),
        );
      });
      return send(200, result.rows[0].data);
    } catch (error) {
      return send(400, { code: error.code || 'XX000', message: error.message });
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    key: 'sb_publishable_local_test_only',
    email: user.email,
    password,
    requests,
    failNextAuth(path, code, status = 422) {
      authFailures.set(`/auth/v1/${path}`, { code, status });
    },
    failNextRpc(name) {
      failures.set(name, 'Simulated local connection error');
    },
    async setBillingState(status, { days = 20, periodDays = 30, provider = false } = {}) {
      const result = await db.query(
        `update public.subscriptions s set status=$1::public.subscription_status,
          trial_started_at=statement_timestamp()+make_interval(days=>$2)-interval '720 hours',
          trial_ends_at=statement_timestamp()+make_interval(days=>$2),
          current_period_start=case when $4 then statement_timestamp()+make_interval(days=>$3)-interval '30 days' else null end,
          current_period_end=case when $4 then statement_timestamp()+make_interval(days=>$3) else null end,
          payment_provider=case when $4 then 'stripe' else null end,
          provider_customer_id=case when $4 then 'cus_ui_test' else null end,
          provider_subscription_id=case when $4 then 'sub_ui_test' else null end,
          cancel_at_period_end=($1='canceled'),canceled_at=case when $1='canceled' then statement_timestamp() else null end
        from public.organizations o where s.organization_id=o.id and o.name='Empresa de teste local' returning s.organization_id`,
        [status, days, periodDays, provider],
      );
      return result.rows[0].organization_id;
    },
    async financialCount() {
      return (await db.query('select count(*)::int count from public.transactions')).rows[0].count;
    },
    async seedPending(count) {
      await db.transaction(async (tx) => {
        await tx.exec('set local role authenticated');
        await tx.query("select set_config('request.jwt.claim.sub',$1,true)", [user.id]);
        await tx.query(
          `insert into public.transactions(organization_id,account_id,category_id,type,description,amount,competence_date,due_date,status,payment_method)
          select o.id,a.id,c.id,'expense','Pendente para paginação '||n,1,current_date,current_date,'pending','pix'
          from public.organizations o join public.accounts a on a.organization_id=o.id and a.name='Conta principal'
          join public.categories c on c.organization_id=o.id and c.name='Software' and c.type='expense'
          cross join generate_series(1,$1::integer) n where o.name='Empresa de teste local'`,
          [count],
        );
      });
    },
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
      await db.close();
    },
  };
}
