import assert from 'node:assert/strict';

export async function verifyTransactionPages({ page, fixture, baseUrl, expect }) {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const list = page.getByRole('region', { name: 'Lançamentos', exact: true });
  async function openRoute(name) {
    await page
      .getByRole('navigation', { name: 'Navegação principal' })
      .getByRole('link', { name, exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: name === 'Dashboard' ? 'Visão financeira.' : `${name}.`,
        exact: true,
      }),
    ).toBeVisible();
  }
  async function create(button, description, category, dueDate) {
    await page.getByRole('button', { name: button, exact: true }).click();
    const form = page.getByRole('dialog');
    await form.getByRole('textbox', { name: 'Valor em reais' }).fill('12,34');
    await form.getByLabel('Descrição', { exact: true }).fill(description);
    await form.getByLabel('Categoria', { exact: true }).selectOption({ label: category });
    await form.getByLabel('Conta', { exact: true }).selectOption({ label: 'Conta principal' });
    if (dueDate) await form.getByLabel('Vencimento', { exact: true }).fill(dueDate);
    await form.getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(form).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Lançamento criado.');
  }

  await openRoute('Entradas');
  await expect(list).toContainText('Serviço recebido');
  await expect(list).not.toContainText('Software pago');
  await expect(page.getByRole('link', { name: 'Entradas', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await create('Nova entrada', 'Entrada pela página', 'Serviços');
  await expect(list).toContainText('Entrada pela página');
  await expect(list.getByRole('listitem').filter({ hasText: 'Entrada pela página' })).toContainText(
    'Recebido',
  );
  await page
    .getByRole('combobox', { name: 'Filtrar categoria' })
    .selectOption({ label: 'Serviços' });
  await expect(page).toHaveURL(/category=/);
  await expect(list).toContainText('Entrada pela página');
  const category = new URL(page.url()).searchParams.get('category');
  assert.ok(category);
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Filtrar categoria' })).toHaveValue(category);
  await page.getByLabel('Filtrar período').selectOption('custom');
  let dialog = page.getByRole('dialog');
  await dialog.getByLabel('De', { exact: true }).fill('2020-01-01');
  await dialog.getByLabel('Até', { exact: true }).fill('2020-01-31');
  await dialog.getByRole('button', { name: 'Aplicar período' }).click();
  await expect(list).toContainText('0 lançamentos');
  assert.equal(new URL(page.url()).searchParams.get('category'), category);
  await page.getByRole('combobox', { name: 'Filtrar situação' }).selectOption('pending');
  await expect(page.getByLabel('Filtrar período')).toHaveCount(0);
  await create('Nova entrada', 'Recebimento futuro pela página', 'Serviços', '2100-01-01');
  await expect(list).toContainText('Recebimento futuro pela página');
  await expect(list).toContainText('01/01/2100');
  await list
    .getByRole('button', { name: 'Receber Recebimento futuro pela página', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar baixa', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(list).toContainText('0 lançamentos');
  await page.getByRole('combobox', { name: 'Filtrar situação' }).selectOption('paid');
  await page.getByLabel('Filtrar período').selectOption('month');
  await expect(list).toContainText('Recebimento futuro pela página');
  await page.getByRole('button', { name: 'Ocultar valores', exact: true }).click();
  await expect(list).not.toContainText('12,34');
  await page.getByRole('button', { name: 'Mostrar valores', exact: true }).click();
  await expect(list).toContainText('12,34');
  await page.screenshot({ path: 'artifacts/transactions-income-desktop.png', fullPage: true });
  console.log(
    'OK: página de entradas, cadastro, categoria e período persistentes, pendência futura, recebimento e privacidade.',
  );

  await openRoute('Despesas');
  await expect(list).toContainText('Software pago');
  await expect(list).not.toContainText('Entrada pela página');
  await page.getByRole('combobox', { name: 'Filtrar situação' }).selectOption('pending');
  await expect(list).toContainText('1–100 de 100 lançamentos');
  await create('Nova despesa', 'Pagamento futuro pela página', 'Software', '2100-01-01');
  await expect(list).toContainText('1–100 de 101 lançamentos');
  await list.getByRole('button', { name: 'Próxima', exact: true }).click();
  await expect(list).toContainText('101–101 de 101 lançamentos');
  await page.reload();
  await expect(list).toContainText('Pagamento futuro pela página');
  await list
    .getByRole('button', { name: 'Pagar Pagamento futuro pela página', exact: true })
    .click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Confirmar baixa', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(list).toContainText('1–100 de 100 lançamentos');
  await expect(list.getByRole('button', { name: 'Anterior', exact: true })).toBeDisabled();
  await page.getByRole('combobox', { name: 'Filtrar situação' }).selectOption('paid');
  await expect(list).toContainText('Pagamento futuro pela página');
  assert.equal(new URL(page.url()).searchParams.has('page'), false);
  await page
    .getByRole('combobox', { name: 'Filtrar categoria' })
    .selectOption({ label: 'Salários' });
  await expect(list).toContainText('0 lançamentos');
  await page.getByRole('combobox', { name: 'Filtrar categoria' }).selectOption('');
  await expect(list).toContainText('Software pago');
  await page.screenshot({ path: 'artifacts/transactions-expense-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.screenshot({ path: 'artifacts/transactions-expense-light.png', fullPage: true });
  await page.getByRole('button', { name: 'Alternar tema' }).click();
  console.log(
    'OK: página de despesas, paginação persistente, pagamento do último registro e retorno à página válida.',
  );

  await page.goto(`${baseUrl}/entradas?page=-5&category=invalid&status=invalid&range=invalid`);
  await expect(list).toContainText('Entrada pela página');
  await expect(page.getByRole('combobox', { name: 'Filtrar categoria' })).toHaveValue('');
  await expect(page.getByRole('combobox', { name: 'Filtrar situação' })).toHaveValue('paid');
  await page.goto(`${baseUrl}/entradas?page=999999`);
  await expect(list).toContainText('1–4 de 4 lançamentos');
  await page.getByLabel('Filtrar período').selectOption('today');
  await expect(page).toHaveURL(/range=today/);
  assert.equal(new URL(page.url()).searchParams.has('page'), false);
  fixture.failNextRpc('get_transaction_details');
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Não foi possível carregar os dados.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Tentar novamente', exact: true }).click();
  await expect(list).toContainText('Entrada pela página');

  await page.getByRole('button', { name: 'Menu do usuário' }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Segunda empresa de teste' }).click();
  await expect(page.getByRole('heading', { name: 'Visão financeira.' })).toBeVisible();
  await openRoute('Entradas');
  await expect(list).toContainText('0 lançamentos');
  await expect(list).not.toContainText('Entrada pela página');
  await page.getByRole('button', { name: 'Criar primeira conta', exact: true }).click();
  dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome da conta').fill('Conta da segunda empresa');
  await dialog.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Nova entrada', exact: true })).toBeVisible();
  await openRoute('Despesas');
  await expect(list).toContainText('0 lançamentos');
  await page.getByRole('button', { name: 'Menu do usuário' }).click();
  await page.getByRole('menuitem').filter({ hasText: 'Empresa de teste local' }).click();
  await expect(page.getByRole('heading', { name: 'Visão financeira.' })).toBeVisible();
  await openRoute('Despesas');
  await expect(list).toContainText('Software pago');

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'No horizontal overflow on expenses',
  );
  await page.screenshot({ path: 'artifacts/transactions-expense-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Abrir menu' }).click();
  await page.getByRole('dialog').getByRole('link', { name: 'Entradas', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Entradas.', exact: true })).toBeVisible();
  await expect(list).toContainText('Entrada pela página');
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    true,
    'No horizontal overflow on income',
  );
  await page.screenshot({ path: 'artifacts/transactions-income-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Nova entrada', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Nova entrada', exact: true })).toBeFocused();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openRoute('Dashboard');
  console.log(
    'OK: filtros inválidos, recuperação de falha, isolamento entre empresas, primeira conta, temas, navegação mobile e foco.',
  );
}
