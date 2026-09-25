import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
  reducedMotion: 'reduce',
});
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
try {
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await expect(page.locator('.stat-card').first()).toContainText('18.450,90');
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova transação', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'artifacts/transaction-modal.png' });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Nova transação', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Ocultar valores', exact: true }).click();
  await expect(page.locator('.stat-card').first()).not.toContainText('18.450,90');
  await expect(page.locator('.chart-hidden')).toBeVisible();
  await page.getByRole('button', { name: 'Mostrar valores', exact: true }).click();
  await page.getByRole('combobox', { name: 'Selecionar período' }).click();
  await page.getByRole('option', { name: 'Outubro de 2026' }).click();
  await expect(page.getByText('Nenhuma transação encontrada')).toBeVisible();
  await expect(page.locator('.stat-card').first()).toContainText('18.450,90');
  await page.getByRole('combobox', { name: 'Selecionar período' }).click();
  await page.getByRole('option', { name: 'Setembro de 2026' }).click();
  await page.getByRole('searchbox', { name: 'Buscar transações', exact: true }).fill('Aurora');
  await expect(page.locator('tbody tr')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('Projeto de identidade visual');
  await page.getByRole('searchbox', { name: 'Buscar transações', exact: true }).fill('');
  await page.getByRole('button', { name: 'Nova transação', exact: true }).click();
  await page.getByLabel('Descrição', { exact: true }).fill('Validação visual');
  await page.getByLabel('Valor (R$)', { exact: true }).fill('1.250,90');
  await page.getByRole('button', { name: 'Adicionar transação', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.locator('.stat-card').first()).toContainText('19.701,80');
  await expect(page.getByRole('status')).toContainText('Transação adicionada');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const download = await downloadPromise;
  await download.saveAs('artifacts/export-demo.csv');
  await page.getByRole('link', { name: /Design System/ }).click();
  await expect(
    page.getByRole('heading', { name: 'Uma identidade. Todo o sistema.' }),
  ).toBeVisible();
  await page.screenshot({ path: 'artifacts/design-system.png', fullPage: true });
  await page.getByRole('button', { name: 'Drawer', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Drawer', exact: true })).toBeFocused();
  await page.getByRole('button', { name: 'Dropdown', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Mostrar confirmação' })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5173/');
  await expect(page.getByRole('heading', { name: 'Visão geral.' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/dashboard-mobile.png', fullPage: true });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  if (overflow) {
    console.log(
      await page.evaluate(() =>
        Array.from(document.querySelectorAll('body *'))
          .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
          .map((el) => ({
            tag: el.tagName,
            cls: el.className,
            width: el.getBoundingClientRect().width,
            right: el.getBoundingClientRect().right,
          }))
          .slice(0, 35),
      ),
    );
    throw new Error('Overflow horizontal na tela de 390px');
  }
  await page.getByRole('button', { name: 'Abrir navegação' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'artifacts/mobile-navigation.png' });
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Nova transação', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({ path: 'artifacts/transaction-modal-mobile.png' });
  await page.keyboard.press('Escape');
  if (errors.length) throw new Error(`Erros no navegador: ${errors.join('; ')}`);
  console.log(
    'OK: desktop/mobile, saldo, busca, período vazio, formulário, exportação, foco, Escape, drawer e dropdown. Sem erros de execução.',
  );
} catch (error) {
  console.log('URL:', page.url(), 'PAGE ERRORS:', errors);
  console.log((await page.locator('body').innerText()).slice(0, 4500));
  await page.screenshot({ path: 'artifacts/failure.png', fullPage: true });
  throw error;
} finally {
  await browser.close();
}
