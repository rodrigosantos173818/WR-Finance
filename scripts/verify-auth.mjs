// Auth regression tests with a local transport; no real email is sent.
import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';
import { startLocalSupabase } from './support/local-supabase.mjs';
import { prepareUiWorkspace } from './support/ui-workspace.mjs';
import { verifyAuth } from './support/verify-auth.mjs';

const fixture = await startLocalSupabase({ authOnly: true });
const baseUrl = 'http://127.0.0.1:3101';
const expect = baseExpect.configure({ timeout: 15000 });
const workspace = await prepareUiWorkspace();
const binary = resolve('node_modules/next/dist/bin/next');
const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: fixture.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fixture.key,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  NEXT_PUBLIC_SITE_URL: baseUrl,
  BILLING_PROVIDER: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
};
let server, browser, page;
let logs = '';
try {
  const build = await promisify(execFile)(process.execPath, [binary, 'build'], {
    cwd: workspace,
    env,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  await writeFile('artifacts/auth-build.log', build.stdout + build.stderr);
  console.log('OK: build de produção isolado.');
  server = spawn(process.execPath, [binary, 'start', '--hostname', '127.0.0.1', '--port', '3101'], {
    cwd: workspace,
    env,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  server.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  let ready = false;
  for (let attempt = 0; attempt < 30; attempt++) {
    if (server.exitCode !== null) throw new Error('O servidor de teste encerrou.');
    try {
      ready = (await fetch(`${baseUrl}/login`)).ok;
    } catch {
      /* Server is starting. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert.ok(ready, 'Servidor de teste disponível');
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'pt-BR' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await verifyAuth({ page, fixture, baseUrl, expect, authOnly: true });
  await page.goto(`${baseUrl}/reenviar-confirmacao`);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.screenshot({ path: 'artifacts/auth-resend-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    'OK: autenticação e reenvio sem erros no navegador; layout mobile sem transbordamento.',
  );
} finally {
  await writeFile('artifacts/auth-server.log', logs);
  await browser?.close();
  if (server && server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit');
    server.kill('SIGTERM');
    await stopped;
  }
  await fixture.close();
}
