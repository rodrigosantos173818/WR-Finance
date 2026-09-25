import assert from 'node:assert/strict';

export async function verifyFinancialExtensions({ page, fixture, expect }) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: 'Adicionar conta', exact: true }).click();
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da conta').fill('Conta principal');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Já existe');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();

  await page.getByRole('button', { name: 'Transferir', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Valor em reais' }).fill('1000');
  await dialog.getByLabel('Conta de origem').selectOption({ label: 'Conta principal' });
  await dialog.getByLabel('Conta de destino').selectOption({ label: 'Conta principal' });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('duas contas diferentes');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();

  await page.getByRole('button', { name: 'Nova despesa', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Valor em reais' }).fill('0');
  await dialog.getByLabel('Descrição', { exact: true }).fill('Despesa pendente QA');
  await dialog.getByLabel('Categoria', { exact: true }).selectOption({ label: 'Software' });
  await dialog.getByLabel('Conta', { exact: true }).selectOption({ label: 'Conta principal' });
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('valor maior que zero');
  await dialog.getByRole('textbox', { name: 'Valor em reais' }).fill('2500');
  await dialog.getByRole('checkbox').check();
  await dialog.getByLabel('Observações (opcional)').fill('Observação de teste');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const savedExpense = fixture.requests.findLast(
    (request) =>
      request.path === '/rest/v1/rpc/create_transaction' &&
      request.body.p_description === 'Despesa pendente QA',
  );
  assert.equal(savedExpense.body.p_is_fixed, true);
  assert.equal(savedExpense.body.p_notes, 'Observação de teste');
  const balance = page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Saldo atual', exact: true }) });
  await expect(balance).toContainText('R$ 1.200,00');
  await page.getByRole('button', { name: /^A pagar/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Despesa pendente QA');
  await page.getByRole('button', { name: 'Pagar Despesa pendente QA', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirmar pagamento' })
    .getByRole('button', { name: 'Confirmar baixa' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Contas a pagar' })).toContainText('0 lançamentos');
  await page.keyboard.press('Escape');
  await expect(balance).toContainText('R$ 1.175,00');
  console.log(
    'OK: conta duplicada, valor zero, despesa pendente, valor fixo, observações e pagamento.',
  );

  await page.getByLabel('Filtrar período').selectOption('custom');
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('De', { exact: true }).fill('2000-01-01');
  await dialog.getByLabel('Até', { exact: true }).fill('2026-01-01');
  await dialog.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(dialog.getByRole('alert')).toContainText('até 10 anos');
  await dialog.getByLabel('De', { exact: true }).fill('2020-01-01');
  await dialog.getByLabel('Até', { exact: true }).fill('2020-01-31');
  await dialog.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(page).toHaveURL(/range=custom/);
  await expect(page.getByText('Nenhuma transação encontrada')).toBeVisible();
  await expect(balance).toContainText('R$ 1.175,00');
  for (const months of ['3', '12', '6']) {
    await page.getByLabel('Meses no gráfico').selectOption(months);
    await expect(page).toHaveURL(new RegExp(`months=${months}`));
    assert.equal(new URL(page.url()).searchParams.get('range'), 'custom');
  }
  for (const preset of [
    'today',
    'week',
    'last-month',
    '30-days',
    '3-months',
    '6-months',
    'year',
    'month',
  ]) {
    await page.getByLabel('Filtrar período').selectOption(preset);
    await expect(page).toHaveURL(new RegExp(`range=${preset}(?:&|$)`));
  }
  await page
    .locator('section')
    .filter({ has: page.getByRole('heading', { name: 'Despesas por categoria' }) })
    .getByRole('button')
    .filter({ hasText: 'Software' })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Despesa pendente QA');
  await expect(page.getByRole('dialog')).not.toContainText('Serviço recebido');
  await page.keyboard.press('Escape');
  console.log(
    'OK: todos os períodos, intervalo inválido, período sem dados, meses do gráfico e consulta por categoria.',
  );

  fixture.failNextRpc('get_transaction_details');
  await page.getByRole('button', { name: 'Ver efetivados' }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('dialog')).toContainText('4 lançamentos');
  await page.keyboard.press('Escape');
  await fixture.seedPending(101);
  await page.reload();
  await page.getByRole('button', { name: /^A pagar/ }).click();
  await expect(page.getByRole('dialog')).toContainText('1–100 de 101 lançamentos');
  await page.getByRole('dialog').getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('101–101 de 101 lançamentos');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Pagar Pendente para paginação/ })
    .click();
  await page
    .getByRole('dialog', { name: 'Confirmar pagamento' })
    .getByRole('button', { name: 'Confirmar baixa' })
    .click();
  await expect(page.getByRole('dialog', { name: 'Contas a pagar' })).toContainText(
    '1–100 de 100 lançamentos',
  );
  await page.keyboard.press('Escape');
  console.log(
    'OK: erro de consulta e nova tentativa, paginação acima de 100 registros e baixa do último item da página.',
  );
  fixture.failNextRpc('get_dashboard');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar os dados.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Visão financeira.' })).toBeVisible();
  console.log('OK: erro no carregamento do dashboard e recuperação pela interface.');
}
