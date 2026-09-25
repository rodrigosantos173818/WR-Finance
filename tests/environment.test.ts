import assert from 'node:assert/strict';
import { afterEach, beforeEach, test } from 'node:test';
import { getSupabaseEnv, siteUrl } from '../src/lib/supabase/env.ts';

const names = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SITE_URL',
] as const;
let saved: (string | undefined)[];
beforeEach(() => {
  saved = names.map((name) => process.env[name]);
  names.forEach((name) => delete process.env[name]);
});
afterEach(() =>
  names.forEach((name, index) => {
    if (saved[index] === undefined) delete process.env[name];
    else process.env[name] = saved[index];
  }),
);
const jwt = (role: string) =>
  `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.test-signature`;

test('ambiente incompleto ou URL inválida não libera conexão', () => {
  assert.equal(getSupabaseEnv(), null);
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  for (const url of ['', 'not-a-url', 'javascript:alert(1)', 'file:///tmp/project']) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url;
    assert.equal(getSupabaseEnv(), null);
  }
});
test('somente chaves públicas são aceitas no cliente', () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://local-test.supabase.co';
  for (const key of [
    'sb_secret_test_only',
    jwt('service_role'),
    jwt('authenticated'),
    'eyJ.invalid.payload',
    'unknown',
  ]) {
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = key;
    assert.equal(getSupabaseEnv(), null);
  }
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test_only';
  assert.equal(getSupabaseEnv()?.key, 'sb_publishable_test_only');
  delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = jwt('anon');
  assert.equal(getSupabaseEnv()?.key, jwt('anon'));
});
test('endereço de retorno usa a configuração explícita', () => {
  process.env.NEXT_PUBLIC_SITE_URL = 'http://127.0.0.1:3100';
  assert.equal(siteUrl(), 'http://127.0.0.1:3100');
});
