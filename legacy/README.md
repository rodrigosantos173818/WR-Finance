# WR Finance

Design System escuro, identidade própria e dashboard demonstrativo em React + TypeScript + Vite.

## Executar

Requer Node.js 22.18+ ou 24+ e npm. A instalação inicial precisa de acesso ao registro npm.

```sh
npm install
npm run dev
```

Abra o endereço exibido pelo Vite. O dashboard está em `/` e o catálogo em `/#design-system`.

```sh
npm run build
npm test
npm run preview
```

Para a verificação de interface, mantenha `npm run dev -- --port 5173` ativo e execute `npm run test:ui`. O teste usa uma sessão temporária do Chrome instalado na máquina; não acessa seu perfil pessoal. Capturas ficam em `artifacts/`.

## Organização

- `src/styles/tokens.css`: cores e tokens de design.
- `src/styles/components.css`: estilos dos componentes reutilizáveis.
- `src/styles/app.css`: composição do dashboard e catálogo, com responsividade.
- `src/design-system/index.tsx`: componentes públicos.
- `src/design-system/tailwind.css`: integração opcional com Tailwind v4.
- `src/components`: gráficos, tabela, formulário e catálogo.
- `src/lib/finance.ts`: cálculos da demonstração em centavos.
- `src/data/demo.ts`: dados fictícios.
- `DESIGN.md`: decisões visuais, exemplos e limites de integração.

## Estado do projeto

A pasta de trabalho estava vazia; esta entrega cria a base solicitada. Nenhum sistema existente foi migrado. O dashboard demonstra a identidade com dados fictícios e alterações temporárias em memória. Os módulos futuros indicados na navegação permanecem desabilitados até a integração.

O tema segue o briefing da identidade WR Finance, sem assets, textos ou código da referência Cakto.
