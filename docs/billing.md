# Assinaturas do WR Finance

O WR Finance Pro custa **R$ 29,90 por mês por empresa**. A primeira empresa de um usuário inicia um teste de **30 dias, sem cartão**. O fim do teste mantém login, consultas e dados disponíveis; apenas as operações financeiras de escrita ficam bloqueadas.

## Regras implementadas

| Estado efetivo | Leitura   | Escrita                                 |
| -------------- | --------- | --------------------------------------- |
| `trialing`     | Permitida | Até o instante exato de `trial_ends_at` |
| `active`       | Permitida | Dentro do período pago confirmado       |
| `canceled`     | Permitida | Até o fim do período já pago            |
| `past_due`     | Permitida | Bloqueada                               |
| `expired`      | Permitida | Bloqueada                               |

O PostgreSQL calcula o acesso com `statement_timestamp()`. O intervalo gratuito é de 720 horas, armazenado em `timestamptz`. Os dias restantes usam arredondamento para cima, limitados entre 0 e 30; “hoje” e “amanhã” consideram o calendário de São Paulo. O navegador não decide se uma assinatura está válida.

A expiração é calculada em cada consulta e escrita, sem depender de cron. Uma linha pode continuar armazenada como `trialing` depois do prazo; `get_subscription_access` já retorna `expired` e os triggers bloqueiam a escrita. O mesmo vale para um período `active` vencido sem renovação confirmada. Cancelamentos permanecem identificados como `canceled`, com `canWrite=false` depois do período pago.

O trial começa ao criar a empresa, depois do cadastro e da autenticação. Outras empresas criadas pelo mesmo usuário recebem o prazo original, incluindo um prazo já vencido. O registro privado de elegibilidade é preservado após excluir uma empresa e limita a dez empresas criadas por usuário ao longo do tempo. A criação e a contagem são atômicas. Empresas existentes acima desse limite são preservadas, mas não permitem novas criações pelo mesmo proprietário. Essa proteção reduz a repetição trivial de testes; não identifica uma mesma pessoa usando identidades diferentes. Mantenha a confirmação de e-mail do Supabase habilitada.

Uma tentativa de checkout sem pagamento, inclusive cancelada, preserva o teste ainda válido. Ao confirmar voluntariamente uma assinatura durante o teste, **a cobrança mensal começa imediatamente**, conforme o aviso anterior ao checkout. Não há cobrança automática ao terminar o teste gratuito.

## Arquitetura e proteção

- `supabase/migrations/202609140002_billing_and_trials.sql`: planos, assinaturas, eventos, elegibilidade do trial, RLS, funções de cobrança e proteção das tabelas financeiras.
- `src/billing/subscription-service.ts`: `getSubscriptionAccess` e `requireFinancialWrite`. O cache do React existe somente dentro da requisição.
- `src/billing/provider.ts` e `providers/stripe.ts`: interface do gateway e adaptador Stripe via API REST, com versão fixada em `2025-06-30.basil`.
- `src/billing/webhook-service.ts` e `event-store.ts`: sincronização e persistência confiável dos eventos.
- `src/features/billing/actions.ts`: atualização do status, checkout, portal e cancelamento autenticados.
- `src/features/billing/subscription-provider.tsx`: contexto da empresa, atualização dos dados e modal compartilhado de upgrade.
- `src/app/(finance)/configuracoes/assinatura/page.tsx`: página de assinatura.
- `src/app/api/billing/webhook/route.ts`: recebimento dos eventos assinados do gateway.

As Server Actions financeiras consultam o acesso antes de escrever e retornam `SUBSCRIPTION_REQUIRED` quando necessário. Os triggers `BEFORE INSERT/UPDATE/DELETE` também protegem `accounts`, `categories`, `clients`, `transactions`, `transfers` e `recurring_transactions`. Chamadas diretas ao PostgREST ou às RPCs existentes passam pela mesma proteção. Isso inclui operações ainda sem tela própria, como edição e exclusão. A exclusão da empresa também exige acesso de escrita. A criação interna das categorias iniciais continua funcionando mesmo para uma nova empresa cujo prazo compartilhado já venceu.

A RLS mantém o isolamento por empresa. Membros consultam somente sua assinatura; apenas proprietários iniciam checkout, abrem o portal e cancelam. Clientes não recebem permissão para alterar planos, status, datas, identificadores do gateway ou eventos. Somente as funções confiáveis de cobrança aceitam a chave `service_role`/secret. Essa chave é carregada por um módulo `server-only` e não substitui o cliente autenticado nas ações financeiras.

Se a consulta de assinatura falhar, a aplicação preserva as consultas financeiras e bloqueia novas escritas até recuperar a verificação. A interface atualiza o status ao navegar, recuperar o foco, voltar de uma aba oculta e periodicamente. O backend verifica o prazo novamente mesmo se um formulário tiver sido aberto antes da expiração.

## Implantação no Supabase

1. Aplique as quatro migrations anteriores, caso ainda não estejam aplicadas, na ordem indicada no README.
2. Aplique **uma única vez** `202609140002_billing_and_trials.sql` no SQL Editor ou no processo de migrations do projeto.
3. Publique a aplicação que contém a integração de cobrança depois de concluir a migration.

A migration roda em uma transação. Cada empresa existente recebe uma assinatura e 30 dias a partir do mesmo instante da implantação, sem alterar contas, lançamentos ou saldos. Não reaplique migrations antigas e não altere manualmente os prazos para “renovar” testes.

Não publique somente o código antes de aplicar essa migration: a verificação de assinatura ficará indisponível e as Server Actions financeiras bloquearão escritas. O gateway pode ser configurado depois; o trial e a proteção do banco funcionam independentemente dele.

## Configurar o Stripe

Não havia gateway no projeto. O adaptador Stripe foi implementado e fica desabilitado até receber a configuração completa. Não há ativação fictícia ou checkout local que finja pagamento.

Primeiro configure um ambiente de homologação no Stripe e um projeto Supabase separado. Crie o produto WR Finance Pro com um preço recorrente mensal de **2990 centavos em BRL**, quantidade 1. Use o identificador `price_...`, não o identificador do produto. Não configure trial no Stripe: o teste gratuito pertence ao WR Finance.

Configure as variáveis do servidor usando `.env.example` como referência:

| Variável                    | Valor esperado                                                         |
| --------------------------- | ---------------------------------------------------------------------- |
| `BILLING_PROVIDER`          | `stripe` para habilitar o adaptador; vazio para deixá-lo indisponível  |
| `STRIPE_SECRET_KEY`         | Chave `sk_test_...` na homologação ou `sk_live_...` em produção        |
| `STRIPE_WEBHOOK_SECRET`     | Segredo `whsec_...` do endpoint correspondente                         |
| `STRIPE_PRICE_ID`           | Preço mensal de R$ 29,90 criado no mesmo ambiente da chave             |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave secret `sb_secret_...` ou JWT `service_role` do projeto correto  |
| `NEXT_PUBLIC_SITE_URL`      | Origem HTTPS pública da aplicação; HTTP somente em localhost/127.0.0.1 |

As variáveis do Supabase para URL e chave pública continuam necessárias. Nunca adicione `NEXT_PUBLIC_` às chaves de cobrança ou à chave privilegiada do Supabase. Reinicie/republique a aplicação depois de configurar o ambiente.

Habilite o Customer Portal no mesmo ambiente Stripe para consultar faturas, atualizar o cartão e cancelar ao final do período. Mantenha o produto com o preço mensal único; troca de planos, quantidades e preços não faz parte deste adaptador. O checkout aceita cartão e valida o preço no servidor antes de criar a sessão. Para outros meios de pagamento, implemente o suporte e a confirmação correspondentes no adaptador.

O botão de assinatura cria o checkout no servidor. Uma reserva de uma hora por empresa e chaves de idempotência no Stripe permitem retomar solicitações e evitam duplicação por cliques simultâneos. Um cliente com assinatura aberta ou acesso pago vigente é encaminhado ao portal. O cliente Stripe é vinculado à assinatura local antes de disponibilizar o checkout.

## Webhooks e ativação

Cadastre o endpoint HTTPS:

```text
https://SEU-DOMINIO/api/billing/webhook
```

Configure o endpoint para a versão **`2025-06-30.basil`**, compatível com o adaptador, e habilite:

```text
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
invoice.payment_action_required
invoice.marked_uncollectible
```

Para encaminhar eventos de homologação local com a Stripe CLI, depois de autenticar a CLI na conta de teste:

```sh
stripe listen --forward-to http://127.0.0.1:3000/api/billing/webhook
```

Use o segredo informado por essa sessão da CLI na variável de webhook local. Ele não é o mesmo segredo do endpoint de produção. Eventos avulsos gerados pela CLI podem não ter o vínculo da empresa; para testar a ativação completa, inicie o checkout pela própria aplicação.

O handler verifica a assinatura HMAC do **corpo original**, compara em tempo constante, valida a tolerância de cinco minutos e confere se o evento pertence ao ambiente teste/live esperado. O corpo é limitado a 1 MiB. Esta rota não exige login de usuário: a autenticação é a assinatura do gateway. Eventos sem vínculo com este produto são ignorados.

Para cada evento válido, a aplicação:

1. Resolve a empresa a partir da assinatura consultada na API do Stripe.
2. Reserva a sincronização por empresa no banco por até dois minutos e verifica a unicidade de `(provider, event_id)`.
3. Consulta o estado **atual** no gateway depois de obter a reserva, em vez de aplicar cegamente o estado recebido no evento.
4. Confere empresa, assinatura local, cliente do gateway, preço, quantidade e período da fatura paga.
5. Atualiza assinatura e evento de forma atômica. Um token da reserva impede que uma execução antiga sobrescreva uma posterior.

Eventos repetidos já processados não são reaplicados. Eventos fora de ordem consultam o estado atual; notificações de uma assinatura encerrada e substituída não alteram a nova assinatura. Falhas de processamento retornam `503`, permitindo reentrega. Assinatura inválida retorna `400`; corpo acima do limite, `413`. O período pago tem fim obrigatório, portanto uma renovação sem confirmação não concede acesso indefinido.

`checkout=success` na URL apenas inicia a espera pela confirmação. A mensagem “Bem-vindo ao WR Finance Pro!” depende do status ativo confirmado pelo servidor para a mesma empresa. O webhook libera o acesso mesmo se o cliente não retornar ao site. A página atualiza o status sem logout/login; se o processamento demorar, o usuário pode atualizar novamente.

Referências do provedor: [webhooks](https://docs.stripe.com/webhooks), [Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create) e [assinaturas](https://docs.stripe.com/api/subscriptions/object?api-version=2025-06-30.basil).

## Cancelamento e recuperação de falhas

O cancelamento exige proprietário autenticado e confirmação na interface. A ação solicita `cancel_at_period_end=true` ao Stripe, sob a mesma reserva de sincronização, e consulta o resultado antes de atualizar o banco. O período pago é preservado; ao terminar, a empresa passa a somente leitura. Dados financeiros não são excluídos. Uma nova contratação após o encerramento pode substituir o vínculo da assinatura anterior.

Em caso de pagamento confirmado no Stripe ainda não refletido na aplicação, verifique entregas e erros do webhook e reenvie o evento pelo painel do Stripe após corrigir a causa. O botão “Atualizar status” consulta o banco; ele não inventa uma confirmação nem substitui a reentrega do webhook. Não existe job automático de reconciliação nesta versão. Reservas abandonadas expiram em dois minutos; o retry consulta novamente o gateway.

## Logs e acompanhamento

O PostgreSQL registra criação do trial e mudanças de status. A aplicação registra `billing.checkout_created`, `billing.subscription_updated`, `billing.cancellation_requested`, `billing.webhook_rejected`, `billing.action_failed`, `billing.access_unavailable` e falhas ao liberar reservas. Mudanças para `active` e `past_due` identificam ativação e pendência de pagamento. Os logs usam identificadores técnicos, status e códigos; não incluem corpo bruto do webhook, cartões, senhas ou segredos.

`billing_events.payload` contém somente o estado normalizado necessário à sincronização. Proprietários podem consultar metadados dos próprios eventos; não recebem acesso ao payload. Eventos pendentes têm `processed_at` nulo. Para investigar com uma conexão administrativa ao banco:

```sql
select provider, event_id, event_type, organization_id, created_at, processed_at
from public.billing_events
where processed_at is null
order by created_at;
```

## Verificação e limites atuais

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run test:ui
```

`npm test` inclui assinatura HMAC, preço/período pago, checkout com idempotência e sincronização de eventos. `test:db` aplica as migrations reais no PGlite e testa backfill, limite de empresas, trial compartilhado, prazos exatos, RLS, alteração manual recusada, as seis tabelas financeiras, leitura após expiração, cancelamento, repetição de eventos, reservas e substituição de assinatura.

`test:ui` compila uma cópia de produção e usa Chrome com Auth/PostgREST locais. Testa avisos progressivos, formulário aberto antes da expiração, bloqueio sem alteração de dados, modal, navegação, checkout indisponível, retorno sem confirmação falsa e atualização para ativo sem novo login. Verifica larguras de 1920, 1440, 1366, 1024, 768, 430 e 390 px. Capturas em `artifacts/billing-*.png`; relatório em `TEST-REPORT.md`.

A migration foi aplicada **somente nos bancos locais de teste**. Não houve deploy, configuração de conta Stripe, cobrança real nem aplicação no Supabase de produção. Antes de abrir a contratação, valide o checkout completo em homologação, entregas reais do webhook, renovação, falha de pagamento, portal e cancelamento com as credenciais do seu ambiente. Os testes automatizados do adaptador usam respostas simuladas da API Stripe.

O plano cobre as funcionalidades financeiras existentes. As páginas dedicadas de clientes, categorias e relatórios continuam previstas para próximas etapas, como indicado na página de assinatura. Não foram criadas essas telas neste trabalho. Dados de cartão e histórico de faturas são consultados no portal do provedor; a apresentação própria desses dados no WR Finance fica para uma próxima atualização.
