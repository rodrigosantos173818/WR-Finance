import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownLeft,
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Boxes,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Eye,
  EyeOff,
  FileChartColumn,
  Landmark,
  LayoutDashboard,
  Menu,
  Plus,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Dropdown,
  Logo,
  Modal,
  Money,
  Select,
  Skeleton,
  Tooltip,
} from './design-system';
import { demoTransactions } from './data/demo';
import { monthTransactions, openingBalance, summarize, type Transaction } from './lib/finance';
const CashflowChart = lazy(() =>
  import('./components/Charts').then((module) => ({ default: module.CashflowChart })),
);
const CategoriesChart = lazy(() =>
  import('./components/Charts').then((module) => ({ default: module.CategoriesChart })),
);
import { TransactionTable, type TransactionFilter } from './components/TransactionTable';
import { TransactionForm } from './components/TransactionForm';
const DesignSystem = lazy(() => import('./components/DesignSystem'));
const defaultPeriods = ['2026-09', '2026-10'];

function App() {
  const [catalog, setCatalog] = useState(location.hash === '#design-system');
  const [transactions, setTransactions] = useState(demoTransactions);
  const [month, setMonth] = useState('2026-09');
  const periodOptions = useMemo(
    () =>
      [
        ...new Set([
          ...defaultPeriods,
          ...transactions.map((transaction) => transaction.date.slice(0, 7)),
        ]),
      ]
        .sort()
        .map((value) => ({
          value,
          label: new Date(`${value}-01T12:00:00`)
            .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            .replace(/^./, (letter) => letter.toUpperCase()),
        })),
    [transactions],
  );
  const [account, setAccount] = useState('all');
  const [hidden, setHidden] = useState(false);
  const [filter, setFilter] = useState<TransactionFilter>('all');
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [inspected, setInspected] = useState<Transaction | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => {
    const update = () => {
      setCatalog(location.hash === '#design-system');
      setMenuOpen(false);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    document.title = `${catalog ? 'Design System' : 'Dashboard'} · WR Finance`;
  }, [catalog]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('#global-search')?.focus();
      }
    }
    window.addEventListener('keydown', shortcut);
    return () => window.removeEventListener('keydown', shortcut);
  }, []);
  const period = useMemo(
    () =>
      monthTransactions(transactions, month).filter(
        (t) => account === 'all' || t.account === account,
      ),
    [transactions, month, account],
  );
  const initial = summarize(
    transactions.filter(
      (t) => t.date < `${month}-01` && (account === 'all' || t.account === account),
    ),
    account === 'all' || account === 'Conta principal' ? openingBalance : 0,
  ).balance;
  const totals = summarize(period, initial);
  const pending = period.filter((t) => t.status !== 'paid');
  const receivable = pending
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
  const payable = pending.filter((t) => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  function navigateFilter(value: TransactionFilter) {
    if (catalog) location.hash = '#dashboard';
    setFilter(value);
    setMenuOpen(false);
    window.setTimeout(
      () =>
        document
          .getElementById('transactions')
          ?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
            block: 'start',
          }),
      50,
    );
  }
  function exportCsv() {
    const escape = (value: string) =>
      `"${(/^[=+@\-\t\r]/.test(value) ? "'" : '') + value.replaceAll('"', '""')}"`;
    const content = [
      ['Descrição', 'Contato', 'Categoria', 'Data', 'Tipo', 'Situação', 'Valor (R$)'],
      ...period.map((t) => [
        t.title,
        t.contact,
        t.category,
        t.date,
        t.type === 'income' ? 'Entrada' : 'Despesa',
        t.status === 'paid' ? 'Liquidado' : t.status === 'pending' ? 'Pendente' : 'Vencido',
        (t.amount / 100).toFixed(2).replace('.', ','),
      ]),
    ]
      .map((row) => row.map(escape).join(';'))
      .join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = `wr-finance-demonstracao-${month}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setToast('Transações do período exportadas.');
  }
  const navContent = (
    <>
      <a href="#dashboard" className="sidebar-brand">
        <Logo />
      </a>
      <div className="workspace-chip">
        <span className="workspace-avatar">WR</span>
        <div>
          <strong>Meu negócio</strong>
          <small>Espaço de trabalho</small>
        </div>
        <span className="workspace-indicator" />
      </div>
      <nav aria-label="Navegação principal">
        <span className="nav-caption">VISÃO DO NEGÓCIO</span>
        <a
          href="#dashboard"
          className={`nav-item ${!catalog && filter === 'all' ? 'active' : ''}`}
          aria-current={!catalog && filter === 'all' ? 'page' : undefined}
          onClick={() => {
            setFilter('all');
            setMenuOpen(false);
            window.scrollTo(0, 0);
          }}
        >
          <LayoutDashboard />
          Dashboard
        </a>
        <span className="nav-caption">FINANCEIRO</span>
        <button
          className={`nav-item ${!catalog && filter === 'income' ? 'active' : ''}`}
          onClick={() => navigateFilter('income')}
        >
          <ArrowDownLeft />
          Entradas
        </button>
        <button
          className={`nav-item ${!catalog && filter === 'expense' ? 'active' : ''}`}
          onClick={() => navigateFilter('expense')}
        >
          <ArrowUpRight />
          Despesas
        </button>
        <Tooltip label="Módulo previsto para a integração com o sistema">
          <span className="nav-placeholder">
            <button className="nav-item" disabled>
              <Landmark />
              Contas
            </button>
          </span>
        </Tooltip>
        <button
          className={`nav-item ${!catalog && filter === 'payable' ? 'active' : ''}`}
          onClick={() => navigateFilter('payable')}
        >
          <Receipt />
          Contas a pagar
        </button>
        <button
          className={`nav-item ${!catalog && filter === 'receivable' ? 'active' : ''}`}
          onClick={() => navigateFilter('receivable')}
        >
          <CreditCard />
          Contas a receber
          <span className="nav-counter">{pending.filter((t) => t.type === 'income').length}</span>
        </button>
        <Tooltip label="Módulo previsto para a integração com o sistema">
          <span className="nav-placeholder">
            <button className="nav-item" disabled>
              <ArrowLeftRight />
              Transferências
            </button>
          </span>
        </Tooltip>
        <span className="nav-caption">GESTÃO</span>
        {[
          { label: 'Clientes', icon: Users },
          { label: 'Categorias', icon: Tag },
          { label: 'Relatórios', icon: FileChartColumn },
        ].map((item) => (
          <Tooltip key={item.label} label="Módulo previsto para a integração com o sistema">
            <span className="nav-placeholder">
              <button className="nav-item" disabled>
                <item.icon />
                {item.label}
              </button>
            </span>
          </Tooltip>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-message">
          <span className="message-icon">
            <ChartNoAxesCombined size={19} />
          </span>
          <strong>Clareza para crescer.</strong>
          <p>
            Cada número conta uma parte
            <br />
            da sua próxima conquista.
          </p>
          <span className="sidebar-message-line" />
        </div>
        <a
          href="#design-system"
          className={`nav-item ${catalog ? 'active' : ''}`}
          aria-current={catalog ? 'page' : undefined}
        >
          <Boxes />
          Design System<span className="version-tag">1.0</span>
        </a>
        <button className="nav-item" onClick={() => setHelpOpen(true)}>
          <CircleHelp />
          Sobre a demonstração
        </button>
        <div className="sidebar-footer">
          <span className="wr-dot" />
          WR Finance <span>Feito para o seu próximo passo.</span>
        </div>
      </div>
    </>
  );
  return (
    <>
      <a className="skip-link" href="#main">
        Pular para o conteúdo
      </a>
      <aside className="sidebar">{navContent}</aside>
      <Modal
        open={menuOpen}
        onOpenChange={setMenuOpen}
        title="WR Finance"
        description="Navegação do espaço de trabalho"
        drawer
      >
        <div className="mobile-navigation">{navContent}</div>
      </Modal>
      <div className="app-content">
        <header className="topbar">
          <div className="breadcrumb">
            <Button
              className="mobile-menu"
              variant="ghost"
              size="icon"
              aria-label="Abrir navegação"
              onClick={() => setMenuOpen(true)}
              data-modal-return
            >
              <Menu size={21} />
            </Button>
            <span className="breadcrumb-icon">
              <LayoutDashboard size={16} />
            </span>
            <span>Meu negócio</span>
            <ChevronRight size={12} />
            <strong>{catalog ? 'Design System' : 'Dashboard'}</strong>
          </div>
          <div className="topbar-actions">
            <label className="global-search">
              <Search size={15} />
              <input
                id="global-search"
                type="search"
                placeholder="Buscar transações..."
                aria-label="Busca global de transações"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  if (catalog) location.hash = '#dashboard';
                }}
              />
              <kbd>Ctrl K</kbd>
            </label>
            <Tooltip label={hidden ? 'Mostrar valores' : 'Ocultar valores'}>
              <Button
                variant="ghost"
                size="icon"
                aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
                aria-pressed={hidden}
                onClick={() => setHidden(!hidden)}
              >
                {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
              </Button>
            </Tooltip>
            <Button
              variant="ghost"
              size="icon"
              className="notification-button"
              aria-label={`Ver ${pending.length} pendências`}
              onClick={() => setNotificationsOpen(true)}
            >
              <Bell size={18} />
              {pending.length > 0 && <span />}
            </Button>
            <span className="topbar-divider" />
            <Dropdown
              label="Menu do espaço de trabalho"
              trigger={
                <button className="profile-button" aria-label="Abrir menu do perfil">
                  <span className="profile-avatar">WR</span>
                  <ChevronDown size={13} />
                </button>
              }
              items={[
                {
                  label: 'Sobre esta demonstração',
                  icon: <CircleHelp size={15} />,
                  onSelect: () => setHelpOpen(true),
                },
                {
                  label: 'Explorar Design System',
                  icon: <Boxes size={15} />,
                  onSelect: () => {
                    location.hash = '#design-system';
                  },
                },
              ]}
            />
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {catalog ? (
            <Suspense fallback={<Skeleton style={{ height: 400 }} />}>
              <DesignSystem onNotify={setToast} />
            </Suspense>
          ) : (
            <>
              <div className="page-heading">
                <div>
                  <div className="eyebrow">
                    <span className="wr-dot" />
                    SEU NEGÓCIO EM PERSPECTIVA
                  </div>
                  <h1>
                    Visão geral<span>.</span>
                  </h1>
                  <p>Mais clareza nos números. Mais confiança no próximo passo.</p>
                </div>
                <Button variant="primary" onClick={() => setNewOpen(true)} data-modal-return>
                  <Plus size={17} />
                  Nova transação
                </Button>
              </div>
              <div className="dashboard-toolbar">
                <div className="period-control">
                  <CalendarDays size={15} />
                  <Select
                    label="Selecionar período"
                    value={month}
                    onValueChange={setMonth}
                    options={periodOptions}
                  />
                </div>
                <Select
                  className="account-select"
                  label="Filtrar por conta"
                  value={account}
                  onValueChange={setAccount}
                  options={[
                    { value: 'all', label: 'Todas as contas' },
                    { value: 'Conta principal', label: 'Conta principal' },
                    { value: 'Conta digital', label: 'Conta digital' },
                  ]}
                />
                <div className="toolbar-end">
                  <Badge tone="neutral">Dados de demonstração</Badge>
                  <Button variant="ghost" size="sm" onClick={exportCsv} disabled={!period.length}>
                    <ArrowDownToLine size={14} />
                    Exportar
                  </Button>
                </div>
              </div>
              <div className="stats-grid">
                <Card className="stat-card" featured>
                  <div className="stat-top">
                    <span>Saldo atual</span>
                    <span className="stat-icon balance">
                      <Wallet size={17} />
                    </span>
                  </div>
                  <Money className="stat-value" value={totals.balance} hidden={hidden} />
                  <div className="stat-foot">
                    <span className="balance-status">
                      <span className="wr-dot" />
                      Saldo disponível
                    </span>
                    <Tooltip label="Saldo inicial + entradas recebidas − despesas pagas, até o fim do período.">
                      <button className="info-button" aria-label="Como o saldo é calculado">
                        <CircleHelp size={13} />
                      </button>
                    </Tooltip>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-top">
                    <span>Entradas do mês</span>
                    <span className="stat-icon income">
                      <ArrowDownLeft size={17} />
                    </span>
                  </div>
                  <Money className="stat-value" value={totals.income} hidden={hidden} />
                  <div className="stat-foot">
                    <span className="stat-status text-positive">
                      <ArrowUpRight size={13} />
                      {period.filter((t) => t.type === 'income' && t.status === 'paid').length}{' '}
                      entradas recebidas
                    </span>
                    <span>no período</span>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-top">
                    <span>Despesas do mês</span>
                    <span className="stat-icon expense">
                      <ArrowUpRight size={17} />
                    </span>
                  </div>
                  <Money className="stat-value" value={totals.expenses} hidden={hidden} />
                  <div className="stat-foot">
                    <span className="stat-status text-negative">
                      <ArrowUpRight size={13} />
                      {
                        period.filter((t) => t.type === 'expense' && t.status === 'paid').length
                      }{' '}
                      despesas pagas
                    </span>
                    <span>no período</span>
                  </div>
                </Card>
                <Card className="stat-card">
                  <div className="stat-top">
                    <span>Resultado do mês</span>
                    <span className="stat-icon result">
                      <ChartNoAxesCombined size={17} />
                    </span>
                  </div>
                  <Money
                    className={`stat-value ${totals.profit < 0 ? 'text-negative' : 'text-positive'}`}
                    value={totals.profit}
                    hidden={hidden}
                  />
                  <div className="stat-foot">
                    <span className="stat-status">
                      <span
                        className={`wr-dot ${totals.profit < 0 ? 'text-negative' : 'text-positive'}`}
                      />
                      {totals.profit >= 0 ? 'Resultado positivo' : 'Resultado negativo'}
                    </span>
                    <span>regime de caixa</span>
                  </div>
                </Card>
              </div>
              <div className="charts-grid">
                <Suspense fallback={<Skeleton style={{ height: 350 }} />}>
                  <CashflowChart transactions={period} month={month} hidden={hidden} />
                </Suspense>
                <Suspense fallback={<Skeleton style={{ height: 350 }} />}>
                  <CategoriesChart transactions={period} hidden={hidden} />
                </Suspense>
              </div>
              <div className="commitments-strip">
                <div className="commitment-intro">
                  <span>
                    <CalendarDays size={19} />
                  </span>
                  <div>
                    <strong>De olho nos compromissos</strong>
                    <small>Organize hoje. Respire tranquilo amanhã.</small>
                  </div>
                </div>
                <button className="commitment-value" onClick={() => navigateFilter('receivable')}>
                  <span className="stat-icon income">
                    <ArrowDownLeft size={16} />
                  </span>
                  <div>
                    <span>A receber</span>
                    <Money value={receivable} hidden={hidden} />
                  </div>
                  <ChevronRight size={15} />
                </button>
                <button className="commitment-value" onClick={() => navigateFilter('payable')}>
                  <span className="stat-icon warning">
                    <ArrowUpRight size={16} />
                  </span>
                  <div>
                    <span>A pagar</span>
                    <Money value={payable} hidden={hidden} />
                  </div>
                  <ChevronRight size={15} />
                </button>
              </div>
              <TransactionTable
                transactions={period}
                hidden={hidden}
                filter={filter}
                onFilter={setFilter}
                query={query}
                onQuery={setQuery}
                onInspect={setInspected}
              />
              <footer className="page-footer">
                <span>
                  <ShieldCheck size={13} />
                  Seu controle começa com uma visão clara.
                </span>
                <span>
                  WR Finance <span className="footer-dot">·</span> Ambiente de demonstração
                </span>
              </footer>
            </>
          )}
        </main>
      </div>
      <Modal
        open={newOpen}
        onOpenChange={setNewOpen}
        title="Nova transação"
        description="Cada movimento registrado. Tudo sob controle."
      >
        <TransactionForm
          onCancel={() => setNewOpen(false)}
          onSave={(transaction) => {
            setTransactions((current) => [transaction, ...current]);
            setNewOpen(false);
            setMonth(transaction.date.slice(0, 7));
            setAccount('all');
            setFilter('all');
            setQuery('');
            setToast('Transação adicionada à demonstração.');
          }}
        />
      </Modal>
      <Modal
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        title="Seus próximos movimentos"
        description="Contas pendentes no período e na conta selecionados."
        drawer
      >
        {pending.length ? (
          <div className="pending-list">
            {pending.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setNotificationsOpen(false);
                  setInspected(t);
                }}
              >
                <span className={`transaction-icon ${t.type === 'income' ? 'income' : 'expense'}`}>
                  {t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                </span>
                <div>
                  <strong>{t.title}</strong>
                  <span>{t.contact}</span>
                  <Badge tone={t.status === 'overdue' ? 'negative' : 'warning'}>
                    {t.status === 'overdue' ? 'Vencido' : 'Pendente'}
                  </Badge>
                </div>
                <Money value={t.amount} hidden={hidden} />
              </button>
            ))}
          </div>
        ) : (
          <p className="text-secondary">Tudo em dia. Nenhuma conta pendente neste período.</p>
        )}
      </Modal>
      <Modal
        open={Boolean(inspected)}
        onOpenChange={(open) => {
          if (!open) setInspected(null);
        }}
        title="Detalhes da transação"
        description="Informações do lançamento demonstrativo."
      >
        {inspected && (
          <div className="transaction-detail">
            <span
              className={`transaction-icon ${inspected.type === 'income' ? 'income' : 'expense'}`}
            >
              {inspected.type === 'income' ? <ArrowDownLeft /> : <ArrowUpRight />}
            </span>
            <h3>{inspected.title}</h3>
            <Money value={inspected.amount} hidden={hidden} />
            <dl>
              {[
                ['Contato', inspected.contact],
                ['Categoria', inspected.category],
                ['Conta', inspected.account],
                ['Data', new Date(`${inspected.date}T12:00:00`).toLocaleDateString('pt-BR')],
                [
                  'Situação',
                  inspected.status === 'paid'
                    ? 'Liquidado'
                    : inspected.status === 'pending'
                      ? 'Pendente'
                      : 'Vencido',
                ],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
            <Button onClick={() => setInspected(null)}>Fechar detalhes</Button>
          </div>
        )}
      </Modal>
      <Modal
        open={helpOpen}
        onOpenChange={setHelpOpen}
        title="Seu próximo passo começa aqui."
        description="Conheça a nova identidade do WR Finance."
      >
        <div className="about-content">
          <Logo />
          <p>
            Uma base visual própria, pensada para trazer tecnologia, clareza e confiança à gestão
            financeira.
          </p>
          <div>
            <Sparkles size={18} />
            <span>
              Este é um ambiente demonstrativo do Design System, com dados fictícios. Alterações são
              temporárias e desaparecem ao recarregar.
            </span>
          </div>
          <div>
            <BookOpen size={18} />
            <span>
              Entradas, despesas e contas pendentes filtram o dashboard. Os demais módulos estão
              previstos para a integração ao sistema existente.
            </span>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setHelpOpen(false);
              location.hash = '#design-system';
            }}
          >
            Explorar componentes
            <ArrowUpRight size={16} />
          </Button>
        </div>
      </Modal>
      {toast && (
        <div role="status" aria-live="polite" className="toast">
          <Check size={17} />
          <span>{toast}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Fechar aviso"
            onClick={() => setToast('')}
          >
            <X size={14} />
          </Button>
        </div>
      )}
    </>
  );
}
export default App;
