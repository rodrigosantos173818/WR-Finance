# Confirmação de e-mail em produção

Aplicação: https://wr-finance-delta.vercel.app

As variáveis da Vercel não configuram o serviço de envio do Supabase. As configurações abaixo precisam ser verificadas por um administrador do projeto.

## URLs

Em [Authentication > URL Configuration](https://supabase.com/dashboard/project/mpvcopcvybyoikqynbin/auth/url-configuration):

- Site URL: `https://wr-finance-delta.vercel.app`
- Redirect URLs: `https://wr-finance-delta.vercel.app/auth/callback` e `https://wr-finance-delta.vercel.app/auth/callback?next=/reset-password`

Mantenha os retornos locais apenas se forem usados no desenvolvimento.

## Envio

Em Authentication > Emails > SMTP Settings, verifique se há um provedor SMTP configurado, com remetente/domínio verificado e credenciais válidas. O serviço padrão do Supabase é limitado a endereços autorizados da equipe e tem limites baixos; não é adequado para cadastros públicos. Consulte a [documentação oficial de SMTP](https://supabase.com/docs/guides/auth/auth-smtp).

Mantenha a confirmação de e-mail habilitada. No template, preserve o link de confirmação gerado pelo Supabase (`{{ .ConfirmationURL }}`); a Site URL sozinha não confirma a conta.

## Diagnóstico

Consulte os logs de Auth do Supabase e os eventos de entrega do provedor SMTP para distinguir falha de envio, bloqueio de destinatário, limite, rejeição e spam. O aplicativo registra operação, código e status de erro nos logs da Vercel, sem e-mail, senha ou tokens.

- `email_address_not_authorized`: serviço padrão não autorizado para esse destinatário.
- `over_email_send_rate_limit`: limite de envio atingido.
- `email_not_confirmed`: login bloqueado até a confirmação; o formulário oferece reenvio.
- `unexpected_failure`: consultar o log de Auth; não concluir que é SMTP apenas por esse código.

Após configurar, teste com uma conta autorizada pelo responsável: cadastre, receba o e-mail, abra o link no mesmo navegador do cadastro e entre. Teste também a recuperação de senha. Uma resposta de sucesso à solicitação não comprova entrega na caixa de entrada.

## Verificações locais

`npm run test:auth` compila uma cópia isolada e testa com transporte Auth simulado: validação, erros de envio, limite, reenvio, login não confirmado e recuperação PKCE. Não envia e-mails reais.

Os testes completos (`test:db` e `test:ui`) dependem de recuperar a migração `supabase/migrations/202609110001_initial_schema.sql`, que está vazia inclusive no commit inicial disponível. Não substituir o esquema de produção nem reaplicar migrações para contornar esse problema. Recuperar o SQL original ou um dump de esquema autorizado do banco existente.

Na verificação de produção de 25/09/2026, `get_my_organizations` respondeu 401/42501 (proteção esperada), mas `get_subscription_access` respondeu 404/PGRST202: a função não está disponível no cache de esquema da API. Um administrador deve conferir se a migração `202609140002_billing_and_trials.sql` foi aplicada integralmente. Se estiver ausente, aplicar essa migração uma única vez; se já existir, verificar assinatura da função e cache PostgREST. O teste `npm run test:connection` agora detecta essa ausência. Não contornar a verificação de assinatura no aplicativo.
