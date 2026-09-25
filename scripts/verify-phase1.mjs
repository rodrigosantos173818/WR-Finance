import assert from 'node:assert/strict';
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect as baseExpect } from '@playwright/test';
import { startLocalSupabase } from './support/local-supabase.mjs';
import { prepareUiWorkspace } from './support/ui-workspace.mjs';
import { verifyAuth } from './support/verify-auth.mjs';
import { verifyFinancialExtensions } from './support/verify-financial.mjs';
import { verifyTransactionPages } from './support/verify-transactions.mjs';
import { verifyBilling } from './support/verify-billing.mjs';

const fixture = await startLocalSupabase();
const port = Number(process.env.WR_UI_PORT || 3100);
const baseUrl = `http://127.0.0.1:${port}`;
const workspace = await prepareUiWorkspace();
const nextBinary = resolve('node_modules/next/dist/bin/next');
const testEnv = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
  NEXT_PUBLIC_SUPABASE_URL: fixture.url,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: fixture.key,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '',
  NEXT_PUBLIC_SITE_URL: baseUrl,
  BILLING_PROVIDER: '',
  SUPABASE_SERVICE_ROLE_KEY: '',
};
let logs = '',
  browser,
  page,
  next;
const expect = baseExpect.configure({ timeout: 30000 });
await mkdir('artifacts', { recursive: true });
try {
  console.log('Compilando uma cópia isolada para testar a versão de produção…');
  const build = await promisify(execFile)(process.execPath, [nextBinary, 'build'], {
    cwd: workspace,
    env: testEnv,
    windowsHide: true,
    maxBuffer: 10 * 1024 * 1024,
  });
  await writeFile('artifacts/phase1-build.log', build.stdout + build.stderr);
  console.log('OK: build de produção isolado.');
  next = spawn(
    process.execPath,
    [nextBinary, 'start', '--hostname', '127.0.0.1', '--port', String(port)],
    { cwd: workspace, env: testEnv, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
  );
  next.stdout.on('data', (chunk) => {
    logs += chunk;
  });
  next.stderr.on('data', (chunk) => {
    logs += chunk;
  });
  for (let attempt = 0; attempt < 90; attempt++) {
    if (next.exitCode !== null) throw new Error(`Next stopped: ${logs}`);
    try {
      const response = await fetch(`${baseUrl}/login`);
      if (response.ok) break;
    } catch {
      /* Wait for the server, bounded below. */
    }
    if (attempt === 89) throw new Error('Next did not start within 90 attempts');
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    locale: 'pt-BR',
    reducedMotion: 'reduce',
  });
  page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(`${baseUrl}/dashboard`);
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Entrar no WR Finance' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
  await page.getByLabel('Nome da empresa').fill('A');
  await page.locator('form').evaluate((form) => {
    form.noValidate = true;
  });
  await page.getByRole('button', { name: 'Criar minha empresa' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'entre 2 e 100 caracteres' }),
  ).toBeVisible();
  await page.getByLabel('Nome da empresa').fill('Empresa de teste local');
  await page.getByRole('button', { name: 'Criar minha empresa' }).click();
  await expect(page.getByRole('heading', { name: 'Visão financeira.' })).toBeVisible();
  await expect(page.getByText('Seu controle começa com uma conta')).toBeVisible();
  await page.getByRole('button', { name: 'Criar primeira conta', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da conta').fill('Conta principal');
  await dialog.getByLabel('Saldo inicial').fill('1.000,00');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('status')).toHaveText('Conta criada.');
  await page.getByRole('button', { name: 'Adicionar conta', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da conta').fill('Carteira');
  await dialog.getByLabel('Tipo de conta').selectOption('cash');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);

  async function transaction(button, description, amount, paid) {
    await page.getByRole('button', { name: button, exact: true }).click();
    const form = page.getByRole('dialog');
    await form.getByRole('textbox', { name: 'Valor em reais' }).fill(amount);
    await form.getByLabel('Descrição', { exact: true }).fill(description);
    await form.getByLabel('Categoria', { exact: true }).selectOption({ index: 1 });
    await form.getByLabel('Conta', { exact: true }).selectOption({ label: 'Conta principal' });
    if (paid) await form.getByLabel('Situação').selectOption('paid');
    await form.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByText(description, { exact: true })).toBeVisible();
  }
  await transaction('Nova entrada', 'Serviço recebido', '25000', true);
  await transaction('Nova despesa', 'Software pago', '10000', true);
  await transaction('Nova entrada', 'Cliente pendente', '5000', false);
  const balance = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Saldo atual', exact: true }) });
  await expect(balance).toContainText('R$ 1.150,00');
  await page.getByRole('button', { name: /^A receber/ }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Receber Cliente pendente', exact: true })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirmar recebimento' })
    .getByRole('button', { name: 'Confirmar baixa' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Contas a receber' })).toContainText(
    '0 lançamentos',
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(balance).toContainText('R$ 1.200,00');
  await page.getByRole('button', { name: 'Transferir', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Valor em reais' }).fill('20000');
  await dialog.getByLabel('Conta de origem').selectOption({ label: 'Conta principal' });
  await dialog.getByLabel('Conta de destino').selectOption({ label: 'Carteira' });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(balance).toContainText('R$ 1.200,00');
  await page.getByRole('button', { name: 'Ocultar valores' }).click();
  await expect(balance).not.toContainText('1.200');
  await expect(page.getByText('Valores do gráfico ocultos')).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar valores' }).click();
  await page.getByRole('button', { name: 'Ver efetivados' }).click();
  await expect(page.getByRole('dialog')).toContainText('3 lançamentos');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Ver efetivados' })).toBeFocused();
  await page.getByLabel('Filtrar período').selectOption('custom');
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('De', { exact: true }).fill('2020-01-01');
  await dialog.getByLabel('Até', { exact: true }).fill('2019-01-01');
  await dialog.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/phase1-dashboard-desktop.png', fullPage: true });
  await page.reload();
  await expect(balance).toContainText('R$ 1.200,00');
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.screenshot({ path: 'artifacts/phase1-dashboard-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'No horizontal page overflow',
  );
  await page.screenshot({ path: 'artifacts/phase1-dashboard-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova despesa', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'artifacts/phase1-form-mobile.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Configurações', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Configurações.' })).toBeVisible();
  await expect(page.getByText('Empresa de teste local', { exact: true }).last()).toBeVisible();
  await page.getByLabel('Nome da empresa').fill('Segunda empresa de teste');
  await page.getByRole('button', { name: 'Criar minha empresa' }).click();
  await expect(page.getByText('Seu controle começa com uma conta')).toBeVisible();
  await page.getByRole('button', { name: 'Menu do usuário' }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Empresa de teste local' }).click();
  await expect(balance).toContainText('R$ 1.200,00');
  await verifyFinancialExtensions({ page, fixture, expect });
  await verifyTransactionPages({ page, fixture, baseUrl, expect });
  await verifyBilling({ page, fixture, baseUrl, expect });
  await page.getByRole('button', { name: 'Menu do usuário' }).click();
  await page.getByRole('menuitem', { name: 'Sair da conta' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto(`${baseUrl}/dashboard`);
  await expect(page).toHaveURL(/\/login$/);
  for (const route of ['/entradas', '/despesas', '/configuracoes/assinatura']) {
    await page.goto(`${baseUrl}${route}`);
    await expect(page).toHaveURL(/\/login$/);
  }
  await verifyAuth({ page, fixture, baseUrl, expect });
  assert.deepEqual(pageErrors, [], 'No uncaught browser errors');
  console.log(
    'OK: login, onboarding, accounts, income, expense, settlement, transfers, reload persistence, details, date validation, privacy, themes, mobile layout/navigation, settings. Uses only a local PostgreSQL fixture.',
  );
} catch (error) {
  console.error(error);
  if (page)
    await page.screenshot({ path: 'artifacts/phase1-failure.png', fullPage: true }).catch(() => {});
  throw error;
} finally {
  await writeFile('artifacts/phase1-server.log', logs);
  try {
    await browser?.close();
  } finally {
    try {
      // next start runs in this child; terminate only the process we created.
      if (next && next.exitCode === null && next.signalCode === null) {
        const stopped = once(next, 'exit');
        next.kill('SIGTERM');
        await stopped;
      }
    } finally {
      await fixture.close();
    }
  }
  console.log('OK: browser, temporary server and database closed.');
}
