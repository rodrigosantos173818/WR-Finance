# Relatório de testes — WR Finance

Data: 14/09/2026. Resultado final: todas as verificações executadas passaram após as correções abaixo.

Na implementação de assinaturas, passaram TypeScript, ESLint, os 16 testes unitários, as duas baterias de banco e a interface com build de produção. A verificação de conexão com o Supabase real pertence à etapa inicial e não foi repetida para cobrança. Todas as novas verificações de assinatura usaram ambientes locais, sem credenciais reais.

| Verificação               | Resultado                    | Ambiente                                                    |
| ------------------------- | ---------------------------- | ----------------------------------------------------------- |
| `npm run typecheck`       | Aprovado                     | Código atual                                                |
| `npm run lint`            | Aprovado, sem avisos         | Código e testes                                             |
| `npm test`                | 16 testes aprovados          | Node.js                                                     |
| `npm run test:db`         | Aprovado                     | PostgreSQL em memória com todas as migrações                |
| Build de produção         | Aprovado dentro de `test:ui` | Cópia isolada do código, sem `.env.local`                   |
| `npm run test:ui`         | Aprovado                     | Next em produção, Chrome desktop/mobile e banco local       |
| `npm run test:connection` | Aprovado na etapa inicial    | Supabase real, somente leituras; não repetido para cobrança |

## Continuação: assinatura e trial de 30 dias

- Backfill de empresas existentes com 30 dias exatos e dados preservados; novas empresas com trial automático, prazo compartilhado por usuário e limite de dez criações. Excluir uma empresa não reinicia a elegibilidade.
- Acesso com 20 dias restantes e até o último milissegundo permitido; leitura após expiração, recusa das quatro RPCs financeiras e de INSERT/UPDATE/DELETE nas seis tabelas financeiras.
- RLS entre empresas, gestão de cobrança somente pelo proprietário, recusa de alteração manual de status/datas e de chamadas às funções reservadas ao serviço confiável.
- Assinatura paga, cancelada dentro e fora do período pago, pendência e período ativo vencido; tentativa de pagamento sem cobrança, inclusive cancelada, preservando o trial original.
- Checkout com chave estável, preço mensal de 2990 centavos validado, metadata de empresa e URLs restritas ao provedor. Transporte Stripe simulado nos testes unitários.
- HMAC com assinatura adulterada, timestamp antigo e múltiplas assinaturas; distinção teste/live. Eventos repetidos, processamento reservado por empresa, token antigo recusado, retry seguro e notificações de uma assinatura substituída sem sobrescrever a nova.
- Avisos de 20, 7, 3 e 1 dia; formulário aberto antes da expiração recusado pelo backend sem gravar dados; modal somente ao tentar escrever e consultas/navegação preservadas.
- Página de assinatura, erro amigável com gateway indisponível, parâmetro de sucesso sem ativação falsa, atualização para ativo sem novo login e confirmação de cancelamento. O teste da interface não realiza um cancelamento no Stripe real.
- Página de assinatura sem rolagem horizontal em 1920, 1440, 1366, 1024, 768, 430 e 390 px. Capturas de desktop, tablet, celular, banner e modal conferidas visualmente.

Evidências: [assinatura desktop](artifacts/billing-1440.png), [tablet](artifacts/billing-768.png), [celular](artifacts/billing-390.png), [dashboard com aviso](artifacts/billing-dashboard-mobile.png) e [modal de upgrade](artifacts/billing-upgrade-mobile.png).

**Limites:** a migration de cobrança foi aplicada somente no PGlite. Stripe real, entregas externas de webhook, portal e cobranças não foram executados. O adaptador foi validado com respostas simuladas; a homologação completa depende das credenciais do ambiente, conforme [docs/billing.md](docs/billing.md). O build ocorreu em uma cópia isolada e o servidor original foi preservado.

## Funções e fluxos cobertos

| Área                      | Casos verificados                                                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Acesso                    | Cadastro, validação de senha no navegador e servidor, login correto/incorreto, logout, bloqueio das rotas privadas sem sessão                                                                                |
| Confirmação e recuperação | Endereço de retorno do cadastro, link inválido, bloqueio de redirecionamento externo, solicitação de recuperação, troca PKCE, manutenção da origem, senhas divergentes, atualização e login com a nova senha |
| Empresas                  | Nome inválido, criação, perfil proprietário, categorias iniciais, troca de empresa, separação dos saldos e configurações                                                                                     |
| Contas                    | Criação, saldo inicial, conta duplicada, tipos permitidos, saldo negativo, validações monetárias e preservação do histórico após arquivamento                                                                |
| Entradas e despesas       | Criação efetivada/pendente, categoria correspondente ao tipo, valor positivo, notas, classificação de valor fixo, recebimento e pagamento                                                                    |
| Transferências            | Movimentação entre contas, preservação do saldo total e resultado, bloqueio da mesma origem/destino, datas futuras e centavos inválidos                                                                      |
| Dashboard                 | Empresa vazia, saldo, entradas, despesas, resultado, comparação anterior, gráficos mensais, despesas por categoria, pendências vencidas, cancelamentos fora do caixa                                         |
| Períodos                  | Hoje, semana, mês, mês passado, 30 dias, 3 meses, 6 meses, ano, personalizado, intervalo invertido/longo, período sem dados, virada de mês/ano e ano bissexto                                                |
| Consultas                 | Efetivados, pendentes fora do período, filtro por categoria/tipo, páginas acima de 100 registros, total após o fim da lista e baixa do último registro de uma página                                         |
| Tratamento de falhas      | Erro de consulta com nova tentativa e erro de carregamento do dashboard com recuperação pelo botão                                                                                                           |
| Interface                 | Temas claro/escuro, ocultação dos valores e gráfico, atualização após recarregar, Escape, retorno de foco, navegação mobile, ausência de rolagem horizontal em 390 px                                        |
| Segurança do banco        | RLS entre empresas, vínculos de conta/categoria de outra empresa, organização e autoria imutáveis, tentativa de elevar privilégio, proteção do último proprietário, bloqueio de acesso anônimo               |
| Configuração              | Variáveis ausentes, URL inválida, rejeição de chave secreta/service_role no cliente, aceitação de chave pública/anon e endereço de retorno configurado                                                       |

As sete ações de autenticação e empresas (`signIn`, `signUp`, `forgotPassword`, `resetPassword`, `signOut`, `createOrganization`, `switchOrganization`) e as cinco ações financeiras (`saveAccount`, `saveTransaction`, `settleTransaction`, `saveTransfer`, `getDetails`) foram exercitadas pela interface. As oito funções RPC da etapa inicial foram exercitadas contra as migrações locais; a cobertura adicional das funções de cobrança está descrita acima.

## Problemas encontrados e corrigidos

1. **Dashboard aceitava número de meses nulo.** A consulta devolvia um gráfico vazio em vez de rejeitar o parâmetro inválido. A nova migração [202609140001_dashboard_chart_validation.sql](supabase/migrations/202609140001_dashboard_chart_validation.sql) corrige a validação e preserva as permissões existentes. O caso agora faz parte do teste de banco.
2. **Retorno de autenticação mudava a origem local.** O Next normalizava a URL da requisição de `127.0.0.1` para `localhost`, impedindo o uso da sessão recém-criada no destino. [route.ts](src/app/auth/callback/route.ts) agora usa `NEXT_PUBLIC_SITE_URL`. O teste percorre recuperação, troca PKCE, redefinição e login com a nova senha.
3. **“Tentar novamente” não buscava dados novos.** A tela usava `reset`, que apenas reapresentava o conteúdo com erro. [error.tsx](<src/app/(finance)/error.tsx>) agora usa `retry`, conforme a API do Next instalado, e desabilita o botão durante a tentativa. A verificação provoca uma falha local e confirma a recuperação.

## Supabase real e limites

### Continuação: páginas de Entradas e Despesas

As rotas `/entradas` e `/despesas` agora estão disponíveis no menu e usam as consultas e operações financeiras existentes. A nova bateria em `scripts/support/verify-transactions.mjs`, executada por `npm run test:ui`, cobre:

- Cadastro de entrada recebida e de entradas/despesas pendentes, incluindo vencimento futuro fora do período selecionado.
- Filtros por situação, categoria e período, persistência após recarregar e normalização de parâmetros inválidos.
- Listas separadas por tipo, estados vazios e ocultação de valores.
- Paginação com 101 registros, recarga da segunda página e retorno à primeira após pagar seu último item.
- Recebimento e pagamento atualizando as listas; criação de primeira conta diretamente pelo módulo.
- Falha de consulta seguida de recuperação, troca de empresa e ausência dos lançamentos de outra empresa.
- Proteção das duas rotas sem sessão, navegação mobile, retorno de foco ao fechar o formulário, temas claro/escuro e largura de 390 px sem rolagem horizontal.

Os formulários agora iniciam com a situação da consulta aberta, e as ações financeiras atualizam o dashboard e as duas páginas. Os filtros mobile ocupam linhas completas para manter seus textos legíveis. O teste encerra seu próprio processo Next diretamente e sempre fecha o banco local, evitando a falha do `taskkill` observada no Windows.

Capturas: [Entradas desktop](artifacts/transactions-income-desktop.png), [Entradas mobile](artifacts/transactions-income-mobile.png), [Despesas desktop](artifacts/transactions-expense-desktop.png), [Despesas mobile](artifacts/transactions-expense-mobile.png) e [Despesas em tema claro](artifacts/transactions-expense-light.png).

Esta continuação não exige migração adicional. Nenhum acesso ou dado do Supabase real foi alterado para validar as novas páginas.

### Limites da validação no ambiente real

- A chave pública e a URL foram reconhecidas; o acesso por e-mail está habilitado, o cadastro está permitido e a confirmação de e-mail é exigida.
- `get_my_organizations`, `get_dashboard` e `get_transaction_details` existem e rejeitam execução anônima com HTTP 401 / código PostgreSQL `42501`, conforme esperado.
- Nenhum usuário, empresa, lançamento ou transferência foi criado no Supabase real durante esta bateria.
- Cadastro, recuperação, envio para confirmação e atualização de senha foram verificados com o transporte Auth simulado. Entrega real de e-mails, configuração de SMTP/retornos no painel e login de um usuário real não foram verificados.
- Não se trata de uma auditoria de segurança completa nem de teste de carga. Não foram avaliadas concorrência de múltiplas sessões ou bases com milhões de registros.
- As páginas dedicadas ainda desabilitadas — contas, transferências, contas a pagar/receber, clientes/categorias e relatórios — não estão implementadas. As operações financeiras testadas são as disponíveis pelo dashboard e pelas novas páginas de Entradas e Despesas.
- O protótipo em `legacy/` não faz parte desta bateria da aplicação principal.

**As migrations foram aplicadas somente no banco de teste.** Para levar as mudanças ao Supabase real, aplique as migrations pendentes na ordem do README: a correção de validação `202609140001_dashboard_chart_validation.sql` e, depois, `202609140002_billing_and_trials.sql`. Não é necessário reaplicar o esquema inicial.

## Evidências e reprodução

Os testes de interface agora compilam uma cópia em `artifacts/ui-workspace-*`, mantendo o `.next` e a conexão do servidor original separados. Chrome, servidor de teste e banco em memória foram encerrados ao concluir.

- [Build de produção](artifacts/phase1-build.log)
- [Log do servidor de teste](artifacts/phase1-server.log) — contém a falha provocada intencionalmente para verificar a recuperação.
- [Verificação do Supabase real](artifacts/supabase-connection.json)
- [Dashboard desktop](artifacts/phase1-dashboard-desktop.png)
- [Dashboard mobile](artifacts/phase1-dashboard-mobile.png)
- [Tema claro](artifacts/phase1-dashboard-light.png)
- [Formulário mobile](artifacts/phase1-form-mobile.png)

Para repetir: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:db`, `npm run test:ui` e `npm run test:connection`. O último comando requer a configuração de `.env.local` e rede; o teste de interface usa exclusivamente dados locais.
