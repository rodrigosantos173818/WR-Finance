# WR Finance

Sistema de controle financeiro para empresas em Next.js, React, TypeScript e Supabase. Interface em português, temas claro/escuro e valores em reais.

## Estado atual

A aplicação principal foi migrada para Next.js. Inclui:

- Cadastro, login, confirmação de e-mail e recuperação de senha via Supabase Auth.
- Criação e seleção de empresas, com isolamento de dados por RLS.
- Dashboard com saldo atual, entradas, despesas, resultado e pendências.
- Períodos predefinidos e personalizados; fluxo de caixa mensal e despesas por categoria.
- Cadastro de contas com saldo inicial, entradas e despesas, baixa de pendências e transferências.
- Consulta paginada de movimentações efetivadas e pendências.
- Páginas de Entradas e Despesas com cadastro, baixa, filtros de situação/categoria/período e paginação preservados na URL.
- Configurações de acesso, empresa atual, aparência e criação de outra empresa.
- WR Finance Pro por R$ 29,90/mês, com 30 dias gratuitos sem cartão, assinatura por empresa e modo somente leitura após expirar.
- Página de assinatura, avisos de término do teste, checkout/portal Stripe configuráveis e webhooks autenticados.

Entradas e Despesas estão disponíveis pelo menu lateral, inclusive no celular. As listas separam os valores efetivados das pendências; o período considera a data de recebimento/pagamento, enquanto as pendências incluem vencidas e futuras. Os cartões mostram os totais da empresa em todas as categorias; o filtro de categoria se aplica à lista. Ao criar um lançamento, a situação inicial acompanha a consulta aberta e pode ser alterada no formulário.

Os módulos dedicados de contas, transferências, contas a pagar/receber, clientes, categorias e relatórios ainda não têm páginas próprias. Contas e transferências podem ser cadastradas pelo dashboard; recebimentos e pagamentos também podem ser baixados nas páginas de Entradas e Despesas. Edição/exclusão de lançamentos, gestão de membros e geração automática de recorrências ficam para a próxima etapa.

O protótipo anterior está preservado em `legacy/`. Os dados fictícios dele não são usados na aplicação principal.

## Preparar o ambiente

Requer Node.js 22.18+ ou 24+ e npm.

```sh
npm ci
```

Copie `.env.example` para `.env.local` e preencha:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=SUA_CHAVE_PUBLICA
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
```

Projetos antigos podem usar `NEXT_PUBLIC_SUPABASE_ANON_KEY` no lugar da chave publicável. Use somente a chave pública/anon; as variáveis `NEXT_PUBLIC_*` chegam ao navegador.

No SQL Editor do seu projeto Supabase, aplique cada migração, uma única vez e nesta ordem:

1. `supabase/migrations/202609110001_initial_schema.sql`
2. `supabase/migrations/202609110002_dashboard.sql`
3. `supabase/migrations/202609130001_transaction_details_pagination.sql`
4. `supabase/migrations/202609140001_dashboard_chart_validation.sql`
5. `supabase/migrations/202609140002_billing_and_trials.sql`

Aplique somente as migrações ainda não executadas. A terceira adiciona paginação e a quarta corrige a validação de um número de meses nulo na consulta do dashboard. A quinta adiciona assinaturas e concede 30 dias às empresas existentes a partir da implantação, preservando os registros financeiros. Aplique a quinta antes de publicar o código de cobrança, pois a verificação de assinatura bloqueia escritas enquanto estiver indisponível.

As páginas de Entradas e Despesas utilizam essas mesmas migrações.

Consulte [docs/billing.md](docs/billing.md) para regras do trial, variáveis exclusivas do servidor, configuração do preço e webhooks Stripe, cancelamento e homologação. O trial funciona sem gateway; a contratação online permanece indisponível enquanto as variáveis de cobrança estiverem vazias.

Em Supabase Auth, habilite o provedor Email e configure a Site URL para o mesmo endereço de `NEXT_PUBLIC_SITE_URL`. Adicione os retornos:

- `http://127.0.0.1:3000/auth/callback`
- `http://127.0.0.1:3000/auth/callback?next=/reset-password`

Na hospedagem, substitua o endereço local pelo domínio HTTPS da aplicação, tanto nas variáveis quanto nos retornos do Auth. Mantenha confirmação de e-mail habilitada conforme sua configuração de acesso.

```sh
npm run dev
```

Abra [WR Finance local](http://127.0.0.1:3000). Sem as variáveis, a aplicação mostra `/setup`. Com o Supabase configurado, crie seu acesso, confirme o e-mail, crie uma empresa e adicione sua primeira conta.

## Regras dos valores

- O PostgreSQL armazena dinheiro como `numeric(14,2)`. A aplicação transmite strings decimais e usa BigInt ao interpretar valores; somente a geometria dos gráficos usa números de ponto flutuante.
- Entradas, despesas, resultado e categorias consideram a data efetiva (`paid_at`) no período selecionado. O gráfico mensal tem seu próprio seletor de 3, 6 ou 12 meses, até o mês atual.
- Saldos são atuais e somam abertura, movimentações efetivadas e transferências.
- A receber/a pagar incluem todas as pendências, mesmo fora do período. Pendências não alteram o saldo.
- Transferências alteram os saldos das contas e preservam o resultado da empresa.
- Efetivações devem ocorrer entre a abertura da conta e o dia atual, no fuso de São Paulo.
- “Valor fixo” é uma classificação; não gera lançamentos automaticamente.

## Verificar

```sh
npm run typecheck
npm run lint
npm test
npm run test:db
npm run build
npm run test:ui
npm run test:connection
```

`npm test` cobre moeda, validações, configuração das chaves, atalhos de período e a integração de cobrança com transporte Stripe simulado. `test:db` aplica todas as migrações em PostgreSQL local em memória (PGlite), verifica os contratos financeiros, isolamento entre empresas, backfill do trial, prazos, bloqueio de escritas diretas, permissões de cobrança, idempotência e sincronização de eventos.

`test:ui` copia o código para `artifacts/ui-workspace-*`, sem copiar `.env.local`, compila a versão de produção e inicia seu próprio servidor Next na porta 3100. O servidor de desenvolvimento original pode continuar ativo. Usa Chrome instalado na máquina em uma sessão temporária. O transporte Auth/PostgREST é simulado localmente, e as operações executam as migrações reais no PGlite. Nenhuma credencial nem banco Supabase real é utilizado. Verifica cadastro, login, recuperação de senha com PKCE, onboarding, empresas, operações financeiras, validações, erros de consulta, paginação, períodos, temas e navegação mobile. Capturas e logs ficam em `artifacts/phase1-*`.

`test:connection` usa `.env.local` para realizar apenas leituras no Supabase real: valida a conexão com Auth, o provedor de e-mail e a proteção de três funções de consulta contra chamadas anônimas. O resultado fica em `artifacts/supabase-connection.json`. Não cadastra usuários, não envia e-mails e não grava dados. Entrega real dos e-mails e login de um usuário real não são cobertos pela simulação.

O teste de interface também percorre `/entradas` e `/despesas`: cadastro, filtros persistentes, pendências futuras fora do período, baixa do último item de uma página, recuperação de falha, isolamento entre empresas e navegação mobile. As capturas dessas páginas ficam em `artifacts/transactions-*.png`.

A bateria de assinatura testa avisos, expiração durante um formulário aberto, somente leitura, modal de upgrade, retorno do checkout sem confirmação falsa e atualização de acesso sem novo login. Verifica 1920, 1440, 1366, 1024, 768, 430 e 390 px; capturas em `artifacts/billing-*.png`. Não utiliza Stripe real nem aplica migrations no Supabase de produção.

A dependência TypeScript permanece na série 6.0, compatível com o ESLint instalado.

## Produção e protótipo

```sh
npm run build
npm start
```

Para consultar o protótipo Vite preservado:

```sh
npm run dev:legacy
```

## Organização

- `src/app`: rotas, layouts e estados de carregamento/erro.
- `src/features/auth`: autenticação e criação/seleção de empresas.
- `src/features/finance`: dashboard, formulários, consultas e Server Actions.
- `src/features/billing` e `src/billing`: assinatura, acesso, checkout e sincronização com o gateway.
- `src/services`: sessão e consultas autenticadas.
- `src/validations`: validações de entrada e dos contratos do banco.
- `src/components/ui` e `src/components/financial`: componentes reutilizáveis.
- `src/styles/tokens.css` e `src/app/globals.css`: identidade visual e tema.
- `supabase/migrations`: esquema, RLS, funções financeiras e consultas.
- `tests` e `scripts`: verificações automatizadas.
- `DESIGN.md`: referência visual original, com observações da migração.
