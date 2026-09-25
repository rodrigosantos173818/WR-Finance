import { useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleHelp,
  Copy,
  Inbox,
  Plus,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  EmptyState,
  Field,
  Logo,
  Modal,
  Money,
  Select,
  Skeleton,
  Tooltip,
} from '../design-system';
import { TransactionForm } from './TransactionForm';

const swatches = [
  ['Fundo principal', '--wr-background'],
  ['Fundo secundário', '--wr-background-secondary'],
  ['Superfície', '--wr-surface'],
  ['Superfície secundária', '--wr-surface-secondary'],
  ['WR Green', '--wr-green'],
  ['Verde escuro', '--wr-green-dark'],
  ['Verde de destaque', '--wr-green-bright'],
  ['Superfície em hover', '--wr-surface-hover'],
  ['Texto principal', '--wr-text'],
  ['Texto secundário', '--wr-text-secondary'],
  ['Texto terciário', '--wr-text-muted'],
  ['Texto auxiliar legível', '--wr-text-subtle'],
  ['Positivo', '--wr-positive'],
  ['Negativo', '--wr-negative'],
  ['Atenção', '--wr-warning'],
  ['Informação', '--wr-info'],
];
export default function DesignSystem({ onNotify }: { onNotify: (message: string) => void }) {
  const [select, setSelect] = useState('principal');
  const [modal, setModal] = useState<'form' | 'dialog' | 'drawer' | null>(null);
  async function copyToken(token: string) {
    try {
      await navigator.clipboard.writeText(`var(${token})`);
      onNotify(`Token ${token} copiado.`);
    } catch {
      onNotify(`Use var(${token}) no seu componente.`);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            <span className="wr-dot" />
            FUNDAÇÃO VISUAL · VERSÃO 1.0
          </div>
          <h1>
            Uma identidade. Todo o sistema<span>.</span>
          </h1>
          <p>A linguagem visual que conecta cada experiência do WR Finance.</p>
        </div>
        <a href="#dashboard" className="wr-button wr-button--secondary">
          <ArrowLeft size={15} />
          Dashboard
        </a>
      </div>
      <Card featured className="ds-intro">
        <div>
          <Logo />
          <p>
            Tecnologia, dinheiro, controle e confiança. Superfícies grafite, contraste com intenção
            e um verde que orienta cada próximo passo.
          </p>
        </div>
        <Badge tone="positive">Dark por natureza</Badge>
      </Card>
      <section className="ds-section">
        <h2>01 · A nossa paleta</h2>
        <p>
          Cores centralizadas em tokens semânticos. Clique em uma amostra para copiar sua variável
          CSS.
        </p>
        <div className="swatch-grid">
          {swatches.map(([name, token]) => (
            <button
              className="swatch"
              key={token}
              onClick={() => copyToken(token)}
              aria-label={`Copiar token ${name}`}
            >
              <span className="swatch-color" style={{ background: `var(${token})` }} />
              <span className="swatch-info">
                <strong>{name}</strong>
                <code>{token}</code>
              </span>
            </button>
          ))}
        </div>
      </section>
      <section className="ds-section">
        <h2>02 · Hierarquia e ritmo</h2>
        <p>Inter, números tabulares, espaço para respirar e bordas discretas.</p>
        <div className="ds-grid">
          <Card className="ds-card">
            <h3>Tipografia</h3>
            <p>Uma família. Diferentes níveis de informação.</p>
            <div className="ds-stack">
              <div className="ds-type-sample">
                <small>Título · 32 px / peso 570</small>
                <strong>Clareza para crescer.</strong>
              </div>
              <div className="ds-type-sample">
                <small>Valor financeiro · números tabulares</small>
                <Money className="stat-value" value={1845090} />
              </div>
              <div className="ds-type-sample">
                <small>Texto secundário · contexto e descrição</small>
                <p className="text-secondary">Cada número conta uma parte da sua história.</p>
              </div>
            </div>
          </Card>
          <Card className="ds-card">
            <h3>Espaçamento e superfícies</h3>
            <p>Escala de 4 px. Cards de 16 px e controles de 10 px de raio.</p>
            <div className="ds-stack">
              {[4, 8, 12, 16, 20, 24, 32, 40, 48].map((space) => (
                <div className="ds-space" key={space}>
                  <code>{space}px</code>
                  <span style={{ width: space * 4 }} />
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
      <section className="ds-section">
        <h2>03 · Componentes essenciais</h2>
        <p>Estados normais, hover, foco, carregamento, erro e desabilitado.</p>
        <div className="ds-grid">
          <Card className="ds-card">
            <h3>Botões</h3>
            <p>A ação principal recebe o verde. Ações de apoio usam superfícies discretas.</p>
            <div className="ds-stack">
              <div className="ds-samples">
                <Button variant="primary" onClick={() => setModal('form')} data-modal-return>
                  <Plus size={16} />
                  Nova transação
                </Button>
                <Button onClick={() => onNotify('Ação secundária executada.')}>
                  <Copy size={15} />
                  Secundário
                </Button>
                <Button variant="ghost" onClick={() => onNotify('Ação discreta executada.')}>
                  Discreto
                  <ArrowUpRight size={15} />
                </Button>
              </div>
              <div className="ds-samples">
                <Button variant="danger" onClick={() => setModal('dialog')}>
                  <Trash2 size={15} />
                  Ação destrutiva
                </Button>
                <Button disabled>Desabilitado</Button>
                <Button loading>Processando</Button>
              </div>
            </div>
          </Card>
          <Card className="ds-card">
            <h3>Badges e indicadores</h3>
            <p>Cor acompanhada por texto. Estados financeiros reconhecíveis.</p>
            <div className="ds-stack">
              <div className="ds-samples">
                <Badge tone="positive">Recebido</Badge>
                <Badge tone="positive">Pago</Badge>
                <Badge tone="warning">Pendente</Badge>
                <Badge tone="negative">Vencido</Badge>
                <Badge tone="info">Em análise</Badge>
                <Badge>Rascunho</Badge>
              </div>
              <div className="ds-alert">
                <ShieldCheck size={18} />
                <span>As informações foram atualizadas com sucesso.</span>
              </div>
            </div>
          </Card>
          <Card className="ds-card">
            <h3>Campos e seletores</h3>
            <p>Fundo escuro, foco verde e mensagens junto ao campo.</p>
            <div className="ds-stack">
              <Field
                label="Descrição"
                placeholder="Ex.: Consultoria de setembro"
                hint="Use uma descrição fácil de reconhecer."
              />
              <div className="form-grid">
                <Field
                  label="Valor com erro"
                  defaultValue="-100"
                  error="O valor deve ser maior que zero."
                />
                <Field label="Campo desabilitado" defaultValue="Não disponível" disabled />
              </div>
              <div className="wr-field">
                <label>Conta de destino</label>
                <Select
                  label="Conta de destino"
                  value={select}
                  onValueChange={setSelect}
                  options={[
                    { value: 'principal', label: 'Conta principal' },
                    { value: 'digital', label: 'Conta digital' },
                    { value: 'reserva', label: 'Reserva' },
                  ]}
                />
              </div>
              <Field label="Data de vencimento" type="date" defaultValue="2026-09-30" />
              <label className="ds-checkbox">
                <input type="checkbox" defaultChecked />
                Notificar sobre este vencimento
              </label>
            </div>
          </Card>
          <Card className="ds-card">
            <h3>Cards financeiros</h3>
            <p>O saldo tem um destaque sutil. Valores e estados mantêm sua hierarquia.</p>
            <div className="ds-stack">
              <Card featured className="stat-card">
                <div className="stat-top">
                  <span>Saldo atual</span>
                  <span className="stat-icon balance">
                    <Wallet size={18} />
                  </span>
                </div>
                <Money className="stat-value" value={1845090} />
                <span className="balance-status">
                  <span className="wr-dot" />
                  Saldo disponível
                </span>
              </Card>
              <Card className="stat-card">
                <div className="stat-top">
                  <span>Resultado negativo</span>
                  <span className="stat-icon expense">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
                <Money className="stat-value text-negative" value={-125000} />
                <span className="text-secondary">
                  O vermelho aparece no indicador, sem dominar o card.
                </span>
              </Card>
            </div>
          </Card>
          <Card className="ds-card">
            <h3>Sobreposições</h3>
            <p>
              Modal, dialog, drawer, dropdown e tooltip compartilham superfícies e foco por teclado.
            </p>
            <div className="ds-samples">
              <Button onClick={() => setModal('form')} data-modal-return>
                Modal de transação
              </Button>
              <Button onClick={() => setModal('dialog')} data-modal-return>
                Dialog
              </Button>
              <Button onClick={() => setModal('drawer')} data-modal-return>
                Drawer
              </Button>
              <Dropdown
                label="Menu demonstrativo"
                trigger={
                  <Button>
                    Dropdown
                    <ChevronDown size={14} />
                  </Button>
                }
                items={[
                  {
                    label: 'Copiar token',
                    icon: <Copy size={15} />,
                    onSelect: () => copyToken('--wr-green'),
                  },
                  {
                    label: 'Mostrar confirmação',
                    icon: <Check size={15} />,
                    onSelect: () => onNotify('Tudo certo. Essa é a notificação do WR Finance.'),
                  },
                ]}
              />
              <Tooltip label="Uma informação de apoio, no momento certo.">
                <Button variant="ghost" size="icon" aria-label="Exemplo de tooltip">
                  <CircleHelp size={18} />
                </Button>
              </Tooltip>
            </div>
          </Card>
          <Card className="ds-card">
            <h3>Carregamento e estado vazio</h3>
            <p>Feedback claro mesmo quando ainda não há dados.</p>
            <div className="ds-stack">
              <div role="status" aria-label="Exemplo de carregamento">
                <Skeleton style={{ width: '55%', height: 12 }} />
                <Skeleton style={{ width: '85%', height: 25, marginTop: 12 }} />
              </div>
              <EmptyState
                icon={<Inbox size={23} />}
                title="Seu primeiro movimento começa aqui"
                description="Adicione uma transação para acompanhar a evolução do seu negócio."
                action={
                  <Button onClick={() => setModal('form')}>
                    <Plus size={15} />
                    Adicionar transação
                  </Button>
                }
              />
            </div>
          </Card>
        </div>
      </section>
      <section className="ds-section">
        <h2>04 · Pronto para ser reutilizado</h2>
        <p>A mesma base visual para todas as próximas telas.</p>
        <Card className="ds-card">
          <ul className="ds-usage">
            <li>
              Importe <code>tokens.css</code> e <code>components.css</code> uma única vez na
              aplicação.
            </li>
            <li>
              Use os componentes em <code>src/design-system</code> para botões, cards, campos e
              sobreposições.
            </li>
            <li>
              Use <code>--wr-positive</code>, <code>--wr-negative</code> e <code>--wr-warning</code>{' '}
              conforme o significado financeiro.
            </li>
            <li>
              Consulte <code>DESIGN.md</code> para regras, exemplos de uso e integração com
              Tailwind.
            </li>
            <li>
              Gráficos e tabela podem ser revisados no dashboard, com filtros e estados vazios.
            </li>
          </ul>
        </Card>
      </section>
      <footer className="page-footer">
        <span>WR Finance · Design System v1.0</span>
        <a href="#dashboard">Voltar ao dashboard →</a>
      </footer>
      <Modal
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
        title={
          modal === 'form'
            ? 'Nova transação'
            : modal === 'drawer'
              ? 'Um pouco mais de contexto'
              : 'Confirmar ação de exemplo'
        }
        description={
          modal === 'form'
            ? 'Um formulário completo, com a identidade WR Finance.'
            : modal === 'drawer'
              ? 'O painel lateral mantém a tarefa principal em perspectiva.'
              : 'Revise os detalhes antes de continuar.'
        }
        drawer={modal === 'drawer'}
      >
        {modal === 'form' ? (
          <TransactionForm
            onCancel={() => setModal(null)}
            onSave={() => {
              setModal(null);
              onNotify('Exemplo validado. Use o dashboard para adicionar uma transação.');
            }}
          />
        ) : modal === 'drawer' ? (
          <div className="ds-stack">
            <Card featured className="stat-card">
              <div className="stat-top">Saldo atual</div>
              <Money className="stat-value" value={1845090} />
              <Badge tone="positive">Disponível</Badge>
            </Card>
            <p className="text-secondary">
              Use este componente para detalhes, notificações e informações complementares.
            </p>
            <Button onClick={() => setModal(null)}>Entendido</Button>
          </div>
        ) : (
          <>
            <p className="text-secondary">
              Esta é uma demonstração de confirmação. Nenhum registro será excluído.
            </p>
            <div className="form-actions" style={{ marginTop: 24 }}>
              <Button onClick={() => setModal(null)}>Cancelar</Button>
              <Button
                variant="danger"
                onClick={() => {
                  setModal(null);
                  onNotify('Confirmação demonstrativa concluída.');
                }}
              >
                Confirmar exemplo
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
