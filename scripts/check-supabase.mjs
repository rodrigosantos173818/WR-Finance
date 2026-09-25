import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { getSupabaseEnv } from '../src/lib/supabase/env.ts';

process.loadEnvFile('.env.local');
const config = getSupabaseEnv();
assert.ok(config, 'Preencha a URL e a chave pública do Supabase em .env.local.');
const checks = [];
const settingsResponse = await fetch(`${config.url}/auth/v1/settings`, {
  headers: { apikey: config.key },
  signal: AbortSignal.timeout(15000),
});
assert.equal(
  settingsResponse.status,
  200,
  'Supabase Auth deve reconhecer a URL e a chave pública.',
);
const settings = await settingsResponse.json();
assert.equal(settings.external.email, true, 'O provedor de e-mail deve estar habilitado.');
checks.push({
  name: 'Auth e chave pública',
  status: 'passed',
  emailEnabled: settings.external.email,
  signupDisabled: settings.disable_signup,
  emailConfirmationRequired: !settings.mailer_autoconfirm,
});
const filters = {
  p_org: '00000000-0000-0000-0000-000000000000',
  p_start: '2026-09-01',
  p_end: '2026-09-30',
};
for (const [name, body] of [
  ['get_my_organizations', {}],
  ['get_dashboard', { ...filters, p_chart_months: 6 }],
  [
    'get_transaction_details',
    { ...filters, p_type: null, p_category: null, p_pending: false, p_offset: 0 },
  ],
]) {
  // Only read functions, called anonymously. No records or users are created.
  const response = await fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: { apikey: config.key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const result = await response.json();
  assert.equal(response.status, 401, `${name} deve exigir login.`);
  assert.equal(result.code, '42501', `${name} deve existir e negar execução anônima.`);
  checks.push({ name, status: 'passed', httpStatus: response.status, code: result.code });
}
await mkdir('artifacts', { recursive: true });
await writeFile(
  'artifacts/supabase-connection.json',
  JSON.stringify({ checkedAt: new Date().toISOString(), mode: 'read-only', checks }, null, 2),
);
console.log(
  'OK: Supabase real acessível, chave válida, e-mail habilitado e 3 consultas protegidas contra acesso anônimo. Nenhuma gravação realizada.',
);
