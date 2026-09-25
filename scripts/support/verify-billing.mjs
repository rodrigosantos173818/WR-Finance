import assert from 'node:assert/strict';

export async function verifyBilling({ page, fixture, baseUrl, expect }) {
  const banner = page.getByRole('complementary', { name: 'Status da assinatura' });
  const goDashboard = async () => {
    await page.goto(`${baseUrl}/dashboard`);
    await expect(page.getByRole('heading', { name: 'Visão financeira.' })).toBeVisible();
  };
  await fixture.setBillingState('trialing', { days: 20 });
  await goDashboard();
  await expect(banner).toContainText('20 dias');
  await expect(page.getByRole('link', { name: 'Ver assinatura da empresa' })).toContainText(
    'PRO · TESTE GRÁTIS',
  );
  for (const [days, text] of [
    [7, 'termina em 7 dias'],
    [3, 'termina em 3 dias'],
    [1, 'termina amanhã'],
  ]) {
    await fixture.setBillingState('trialing', { days });
    await page.reload();
    await expect(banner).toContainText(text);
  }
  await fixture.setBillingState('trialing', { days: 20 });
  await goDashboard();
  const before = await fixture.financialCount();
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Valor em reais' }).fill('10,00');
  await dialog.getByLabel('Descrição', { exact: true }).fill('Não deve ser gravado após expirar');
  await dialog.getByLabel('Categoria', { exact: true }).selectOption({ index: 1 });
  await dialog.getByLabel('Conta', { exact: true }).selectOption({ label: 'Conta principal' });
  await fixture.setBillingState('trialing', { days: -1 });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Continue usando o WR Finance' })).toBeVisible();
  assert.equal(
    await fixture.financialCount(),
    before,
    'Server rejects an editor opened before expiry',
  );
  await page.getByRole('button', { name: 'Agora não', exact: true }).click();
  await goDashboard();
  await expect(banner).toContainText('Seu período gratuito terminou');
  await expect(page.getByRole('link', { name: 'Ver assinatura da empresa' })).toContainText(
    'PLANO EXPIRADO',
  );
  for (const button of ['Nova entrada', 'Nova despesa', 'Transferir', 'Adicionar conta']) {
    await page.getByRole('button', { name: button, exact: true }).click();
    await expect(page.getByRole('dialog', { name: 'Continue usando o WR Finance' })).toBeVisible();
    await page.getByRole('button', { name: 'Agora não', exact: true }).click();
  }
  await page.goto(`${baseUrl}/entradas`);
  await expect(page.getByRole('region', { name: 'Lançamentos', exact: true })).toContainText(
    'Entrada pela página',
  );
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Assinar WR Finance Pro' }).click();
  await expect(page.getByRole('heading', { name: 'Assinatura.', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'WR Finance Pro', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Assinar por R$ 29,90/mês', exact: true }).click();
  await expect(page.getByRole('main').getByRole('alert')).toContainText('temporariamente indisponível');
  const organizationId = await fixture.setBillingState('trialing', { days: -1 });
  await page.goto(`${baseUrl}/configuracoes/assinatura?checkout=success&company=${organizationId}`);
  await expect(page.getByRole('status')).toContainText('aguardando a confirmação');
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao WR Finance Pro!' })).toHaveCount(0);
  await fixture.setBillingState('active', { provider: true });
  await page.getByRole('button', { name: 'Atualizar status', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bem-vindo ao WR Finance Pro!' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Gerenciar assinatura', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancelar assinatura', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Cancelar assinatura?' });
  await expect(dialog).toContainText('final do período já pago');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await goDashboard();
  await expect(banner).toHaveCount(0);
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Nova entrada', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await fixture.setBillingState('canceled', { provider: true, periodDays: 10 });
  await page.reload();
  await expect(banner).toContainText('Acesso completo até');
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Nova entrada', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await fixture.setBillingState('canceled', { provider: true, periodDays: -1 });
  await page.reload();
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Continue usando o WR Finance' })).toBeVisible();
  await page.getByRole('button', { name: 'Agora não', exact: true }).click();
  await fixture.setBillingState('past_due', { provider: true });
  await page.reload();
  await expect(banner).toContainText('problema com o pagamento');
  await fixture.setBillingState('trialing', { days: 20 });
  await page.goto(`${baseUrl}/configuracoes/assinatura`);
  for (const width of [1920, 1440, 1366, 1024, 768, 430, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.getByRole('heading', { name: 'Assinatura.', exact: true })).toBeVisible();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      true,
      `Billing has no overflow at ${width}px`,
    );
    await page.screenshot({ path: `artifacts/billing-${width}.png`, fullPage: true });
  }
  await goDashboard();
  await page.screenshot({ path: 'artifacts/billing-dashboard-mobile.png', fullPage: true });
  await fixture.setBillingState('trialing', { days: -1 });
  await page.reload();
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  await page.screenshot({ path: 'artifacts/billing-upgrade-mobile.png' });
  await page.getByRole('button', { name: 'Agora não', exact: true }).click();
  await fixture.setBillingState('trialing', { days: 20 });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await goDashboard();
  const webhook = await fetch(`${baseUrl}/api/billing/webhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
  assert.equal(webhook.status, 503, 'An unconfigured provider cannot accept fabricated events');
  console.log(
    'OK: billing trial notices, stale-editor backend rejection, read-only consultation, upgrade modal, checkout unavailable, server-confirmed success, canceled/past_due access, seven responsive widths, and closed webhook without configuration.',
  );
}
