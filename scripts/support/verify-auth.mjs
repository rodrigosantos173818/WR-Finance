import assert from 'node:assert/strict';

export async function verifyAuth({ page, fixture, baseUrl, expect, authOnly = false }) {
  for (const route of ['/dashboard', '/configuracoes', '/onboarding', '/reset-password']) {
    await page.goto(baseUrl + route);
    await expect(page).toHaveURL(/\/login$/);
  }
  await page.goto(`${baseUrl}/auth/callback?code=invalid&next=https://example.com`);
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await expect(page.getByRole('alert').filter({ hasText: 'O link expirou' })).toBeVisible();
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill('senha-incorreta');
  await page.getByRole('button', { name: 'Entrar no WR Finance' }).click();
  await expect(page.getByText('Não foi possível entrar.', { exact: false })).toBeVisible();
  console.log(
    'OK: rotas protegidas, link inválido, redirecionamento externo bloqueado e senha incorreta.',
  );

  await page.goto(`${baseUrl}/cadastro`);
  await page.getByLabel('Seu nome').fill('Novo usuário de teste');
  await page.getByLabel('E-mail', { exact: true }).fill('novo@wr.local');
  await page.getByLabel('Senha', { exact: true }).fill('curta');
  assert.equal(
    await page.getByLabel('Senha', { exact: true }).evaluate((input) => input.checkValidity()),
    false,
  );
  await page.locator('form').evaluate((form) => {
    form.noValidate = true;
  });
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'pelo menos 10 caracteres' }),
  ).toBeVisible();
  // React resets uncontrolled fields after a completed Server Action, including validation errors.
  for (const [code, status, message] of [
    ['email_address_not_authorized', 422, 'ainda não está habilitado'],
    ['over_email_send_rate_limit', 429, 'limite de envio'],
    ['unexpected_failure', 500, 'serviço de acesso'],
  ]) {
    fixture.failNextAuth('signup', code, status);
    await page.getByLabel('Seu nome').fill('Novo usuário de teste');
    await page.getByLabel('E-mail', { exact: true }).fill('novo@wr.local');
    await page.getByLabel('Senha', { exact: true }).fill('senha-apenas-teste');
    await page.getByRole('button', { name: 'Criar meu acesso' }).click();
    await expect(page.locator('form').getByRole('alert')).toContainText(message);
    await expect(page.getByRole('status')).toHaveCount(0);
  }
  await page.getByLabel('Seu nome').fill('Novo usuário de teste');
  await page.getByLabel('E-mail', { exact: true }).fill('novo@wr.local');
  await page.getByLabel('Senha', { exact: true }).fill('senha-apenas-teste');
  await page.getByRole('button', { name: 'Criar meu acesso' }).click();
  await expect(page.getByRole('status')).toContainText('Confira seu e-mail');
  const signup = fixture.requests.findLast((request) => request.path === '/auth/v1/signup');
  assert.equal(signup.body.email, 'novo@wr.local');
  assert.equal(signup.body.data.full_name, 'Novo usuário de teste');
  assert.equal(signup.query.redirect_to, `${baseUrl}/auth/callback`);
  console.log(
    'OK: cadastro, senha mínima e retorno para confirmação de e-mail (transporte simulado).',
  );

  await page.getByRole('link', { name: 'Reenviar confirmação' }).click();
  await expect(page).toHaveURL(/\/reenviar-confirmacao$/);
  fixture.failNextAuth('resend', 'over_email_send_rate_limit', 429);
  await page.getByLabel('E-mail', { exact: true }).fill('novo@wr.local');
  await page.getByRole('button', { name: 'Reenviar confirmação' }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('limite de envio');
  await page.getByLabel('E-mail', { exact: true }).fill('novo@wr.local');
  await page.getByRole('button', { name: 'Reenviar confirmação' }).click();
  await expect(page.getByRole('status')).toContainText('aguardando confirmação');
  const resend = fixture.requests.findLast((request) => request.path === '/auth/v1/resend');
  assert.equal(resend.body.email, 'novo@wr.local');
  assert.equal(resend.body.type, 'signup');
  assert.equal(resend.query.redirect_to, `${baseUrl}/auth/callback`);
  await page.getByRole('link', { name: 'Voltar para entrar' }).click();
  await expect(page).toHaveURL(/\/login$/);
  fixture.failNextAuth('token', 'email_not_confirmed', 400);
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill(fixture.password);
  await page.getByRole('button', { name: 'Entrar no WR Finance' }).click();
  await expect(page.locator('form').getByRole('alert')).toContainText('Confirme seu e-mail');
  await expect(page.getByRole('link', { name: 'Reenviar confirmação' })).toBeVisible();
  console.log(
    'OK: erros de envio, limite de e-mails, reenvio de confirmação e login não confirmado.',
  );

  await page.goto(`${baseUrl}/forgot-password`);
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByRole('button', { name: 'Enviar link de recuperação' }).click();
  await expect(page.getByRole('status')).toContainText('você receberá um link');
  const recovery = fixture.requests.findLast((request) => request.path === '/auth/v1/recover');
  assert.equal(recovery.query.redirect_to, `${baseUrl}/auth/callback?next=/reset-password`);
  assert.ok(recovery.body.code_challenge);
  await page.goto(`${baseUrl}/auth/callback?code=local-recovery-code&next=/reset-password`);
  await expect(page).toHaveURL(/\/reset-password$/);
  assert.equal(
    new URL(page.url()).origin,
    baseUrl,
    'O callback deve preservar a origem pública configurada.',
  );
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-de-teste');
  await page.getByLabel('Confirme a nova senha').fill('senhas-diferentes');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(
    page.getByRole('alert').filter({ hasText: 'As senhas precisam ser iguais' }),
  ).toBeVisible();
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-de-teste');
  await page.getByLabel('Confirme a nova senha').fill('nova-senha-de-teste');
  await page.getByRole('button', { name: 'Salvar nova senha' }).click();
  await expect(page).toHaveURL(/\/login\?updated=1$/);
  await expect(page.getByRole('status')).toContainText('Senha atualizada');
  await page.getByLabel('E-mail', { exact: true }).fill(fixture.email);
  await page.getByLabel('Senha', { exact: true }).fill('nova-senha-de-teste');
  await page.getByRole('button', { name: 'Entrar no WR Finance' }).click();
  if (authOnly) await expect(page).toHaveURL(/\/onboarding$/);
  else await expect(page.getByRole('heading', { name: 'Visão financeira.' })).toBeVisible();
  console.log(
    'OK: recuperação com PKCE, senhas divergentes, atualização e login com a nova senha (Auth simulado).',
  );
}
