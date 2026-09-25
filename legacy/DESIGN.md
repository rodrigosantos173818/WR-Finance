# WR Finance · Design System 1.0

Tecnologia, dinheiro, controle e confiança. Identidade original, escura por padrão, com superfícies grafite azuladas e verde para orientar a atenção. A [Cakto](https://www.cakto.com.br/) foi usada somente como referência de direção visual fornecida no briefing; nenhuma marca, ilustração, texto, código ou asset foi reutilizado.

## Fonte de verdade

`src/styles/tokens.css` concentra todas as cores, transparências, bordas, sombras, gradientes, raios, espaçamentos e tempos. Componentes consomem `var(--wr-...)`; evite valores de cor diretos nas páginas. `index.html` contém apenas a cor de fundo em `theme-color`, necessária como metadado antes de carregar o CSS.

| Grupo       | Tokens e valores                                                                          |
| ----------- | ----------------------------------------------------------------------------------------- |
| Fundos      | `--wr-background: #080B10`, `--wr-background-secondary: #0D1117`                          |
| Superfícies | `--wr-surface: #121922`, `--wr-surface-secondary: #161F2A`, `--wr-surface-hover: #1A2531` |
| Marca       | `--wr-green: #17A655`, `--wr-green-dark: #1D7A4A`, `--wr-green-bright: #20D675`           |
| Textos      | `--wr-text: #F8FAFC`, `--wr-text-secondary: #A8B3C2`, `--wr-text-muted: #687588`          |
| Estados     | Positivo `#20D675`, negativo `#F05D68`, atenção `#F4B942`, informação `#5AA7FF`           |
| Bordas      | Branco a 6%, hover a 10%, controles a 8%, ativo em verde a 45%                            |
| Gráficos    | Marca, positivo, mint `#65C98E`, informação, violeta `#8B7CF6`, atenção                   |

`--wr-text-subtle: #8C99AA` complementa o texto terciário em informações auxiliares que precisam continuar legíveis. O token original `--wr-text-muted` é reservado a detalhes de baixa ênfase, ícones e placeholders.

## Marca e composição

`Logo` é um componente vetorial original: um W abstrato e um movimento ascendente. O símbolo usa `currentColor`; a marca herda os tokens CSS. Disponível em versão completa e compacta. Mantenha uma área livre mínima de 8 px e evite usar o símbolo abaixo de 24 px.

- Fundo principal constante; brilho verde apenas no topo e em intensidade mínima.
- Sidebar e header em fundo secundário; navegação ativa com verde transparente e indicador vertical discreto.
- Cards com raio de 16 px, padding de 20–24 px, borda de 6% e sombra escura sutil.
- O saldo recebe `--wr-balance-gradient` e `--wr-balance-border`. Os demais cards mantêm a superfície normal.
- Verde brilhante ocupa indicadores, detalhes e resultados positivos. Vermelho fica restrito a despesas e alertas.
- Estados financeiros combinam texto, ícone/sinal e cor; não dependem somente de cor.

## Tipografia, medidas e movimento

Inter variável hospedada localmente pelo pacote Fontsource, com fallback para a fonte de sistema. Números financeiros usam `font-variant-numeric: tabular-nums` e formatação brasileira. A escala de espaçamento parte de 4 px. Controles têm 42 px de altura; ações de toque usam 44 px quando necessário. Transições de cor duram 160 ms, sem animações ornamentais. `prefers-reduced-motion` desliga animações e transições.

## Componentes reutilizáveis

Importe por `src/design-system/index.tsx`:

| Componente   | Uso                                                                            |
| ------------ | ------------------------------------------------------------------------------ |
| `Logo`       | Marca completa ou `compact`                                                    |
| `Button`     | `primary`, `secondary`, `ghost`, `danger`; `sm`, `icon`, `loading`, `disabled` |
| `Card`       | Superfície; `featured` para saldo                                              |
| `Money`      | Valor em centavos; `hidden` oculta o texto também para leitores de tela        |
| `Badge`      | `positive`, `negative`, `warning`, `info`, `neutral`; ponto opcional           |
| `Field`      | Label associado, hint, erro, desabilitado, datas e demais inputs               |
| `Select`     | Seleção escura acessível com lista de opções                                   |
| `Tooltip`    | Informação complementar por hover ou foco                                      |
| `Dropdown`   | Menu de ações com teclado e Escape                                             |
| `Modal`      | Modal ou `drawer`; título, descrição, foco contido e retorno ao acionador      |
| `EmptyState` | Ausência de dados com contexto e ação                                          |
| `Skeleton`   | Exemplo de carregamento com movimento reduzido                                 |
| `ColorDot`   | Marcador de legenda usando token CSS                                           |

As sobreposições utilizam [primitivas Radix](https://www.radix-ui.com/primitives/docs/components/dialog). O portal recebe o mesmo tema na raiz; não é necessário reaplicar cores dentro do modal. O foco retorna ao acionador ao fechar. Use sempre nome acessível em botões somente com ícone.

```tsx
import { Button, Card, Money, Badge } from './design-system';

<Card featured className="stat-card">
  <h2>Saldo atual</h2>
  <Money value={1845090} />
  <Badge tone="positive">Disponível</Badge>
  <Button variant="primary" onClick={abrirTransacao}>
    Nova transação
  </Button>
</Card>;
```

Para inputs de data, `Field type="date"` utiliza o calendário nativo do navegador com `color-scheme: dark`. A disposição do calendário acompanha o navegador e o sistema operacional, não um calendário proprietário.

## Gráficos e tabelas

`src/components/Charts.tsx` usa Recharts. Fundo transparente, grid branco a 5%, receitas positivas, despesas em vermelho suave e tooltips em superfície secundária. A linha mostra valores **acumulados recebidos e pagos no mês**; valores pendentes ficam fora da linha e do saldo. A rosca considera apenas despesas pagas. Ambos são calculados dos mesmos registros usados pelos cards.

`TransactionTable` contém busca, filtros, paginação, ordenação por data, menu de ações e estado vazio. Tabelas têm cabeçalho em fundo secundário, linhas em superfície e hover discreto. Em telas pequenas, a tabela rola dentro do próprio card; a página mantém a largura do dispositivo.

## Integração com Tailwind v4

O projeto atual usa CSS e não depende de Tailwind. Para integrá-lo a uma aplicação Tailwind v4, importe os tokens e o mapeamento opcional após a folha do Tailwind:

```css
@import 'tailwindcss';
@import './styles/tokens.css';
@import './design-system/tailwind.css';
```

Exemplo: `bg-wr-surface text-wr-text border-wr-border rounded-wr-card`. O mapeamento não redefine cores, somente referencia os tokens existentes. O tema é escuro desde o HTML inicial e independe da preferência de tema do sistema operacional.

## Contraste e acessibilidade

Textos principais e secundários usam cores claras sobre as superfícies escuras. Foco visível usa contorno verde brilhante; erros têm mensagem escrita, e não apenas borda. Há link para pular a navegação e foco contido em sobreposições.

Os valores de cor do briefing foram preservados. Branco sobre o verde primário e o token de texto terciário não atingem 4,5:1 em todos os contextos; portanto, esta base não declara conformidade integral WCAG AA. Para uma aplicação que exija AA, é necessário aprovar um token de botão mais escuro ou um foreground alternativo, e reservar o terciário a conteúdo não essencial. O verde escuro já existe como token de hover.

## Escopo desta entrega

A pasta fornecida estava vazia. Esta é uma base visual independente com um dashboard demonstrativo e um catálogo de componentes em `/#design-system`, não uma migração do sistema anterior.

- Os dados são fictícios, com um fechamento ilustrativo de setembro de 2026. O saldo inicial é R$ 8.650,90, as entradas são R$ 18.600,00 e as despesas são R$ 8.800,00, resultando em R$ 18.450,90.
- Valores são guardados em centavos inteiros e convertidos apenas na apresentação.
- Novas transações são temporárias, em memória, até recarregar a página. Nenhum dado é enviado a um servidor.
- Entradas, despesas, contas a pagar e contas a receber demonstram filtros na mesma superfície.
- Contas, transferências, clientes, categorias e relatórios aparecem na hierarquia prevista, ainda desabilitados. A implementação dessas páginas depende da integração com o projeto de negócio.
- Não foram implementados autenticação, banco de dados, pagamentos ou serviços financeiros reais.

## Validação

`npm run build` verifica TypeScript e gera a versão de produção. `npm test` verifica moeda brasileira, exclusão de pendências do caixa e conciliação de gráficos. Com o servidor ativo, `npm run test:ui` verifica desktop/mobile, busca, filtros, formulário, exportação, ocultação de valores, dropdown, drawer, Escape e retorno de foco. Capturas são gravadas em `artifacts/`.
