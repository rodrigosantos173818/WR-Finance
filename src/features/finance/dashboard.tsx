'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSubscription } from '@/features/billing/subscription-provider';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Eye,
  EyeOff,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/financial/date-range-picker';
import {
  AccountCard,
  CurrencyDisplay,
  EmptyState,
  FinancialCard,
  PageHeader,
} from '@/components/financial/primitives';
import { DashboardCharts } from './dashboard-charts';
import { TransactionList } from './transaction-list';
import { DetailsDialog, type DetailFilter } from './details-dialog';
import { FinanceEditor, type Editor } from './finance-forms';
import type { DashboardData, FinancialRecord } from '@/validations/dashboard';
import { formatDate, type DateRange } from '@/utils/dates';

export function Dashboard({
  data,
  range,
  chartMonths,
}: {
  data: DashboardData;
  range: DateRange;
  chartMonths: number;
}) {
  const router = useRouter();
  const subscription = useSubscription();
  const [hidden, setHidden] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [details, setDetails] = useState<DetailFilter | null>(null);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  const editorTrigger = useRef<HTMLElement | null>(null);
  const detailTrigger = useRef<HTMLElement | null>(null);
  const activeAccounts = data.accounts.filter((account) => !account.archived);
  const summary = data.summary;

  function openEditor(next: Editor) {
    if (!subscription.available || !subscription.canWrite) {
      subscription.openUpgrade();
      return;
    }
    editorTrigger.current = document.activeElement as HTMLElement;
    setEditor(next);
    setMessage('');
  }
  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => editorTrigger.current?.focus());
  }
  function openDetails(next: DetailFilter) {
    detailTrigger.current = document.activeElement as HTMLElement;
    setDetails(next);
  }
  function closeDetails() {
    setDetails(null);
    requestAnimationFrame(() => detailTrigger.current?.focus());
  }
  function settle(record: FinancialRecord) {
    openEditor({ kind: 'settlement', record });
  }

  return (
    <>
      <PageHeader
        title="Visão financeira"
        description="Um olhar claro sobre o dinheiro da sua empresa."
      >
        <Button
          variant="outline"
          size="icon"
          aria-label={hidden ? 'Mostrar valores' : 'Ocultar valores'}
          aria-pressed={hidden}
          onClick={() => setHidden((value) => !value)}
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </Button>
        <DateRangePicker range={range} />
        <Button
          onClick={() =>
            openEditor(
              activeAccounts.length ? { kind: 'transaction', type: 'income' } : { kind: 'account' },
            )
          }
        >
          <Plus className="size-4" />
          {activeAccounts.length ? 'Nova entrada' : 'Criar primeira conta'}
        </Button>
      </PageHeader>
      {message && (
        <p role="status" className="mb-5 rounded-xl bg-positive/10 p-4 text-sm text-positive">
          {message}
        </p>
      )}
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <FinancialCard
            title="Saldo atual"
            value={summary.balance}
            icon={Wallet}
            description={`Saldo de todas as contas em ${formatDate(data.today)}.`}
            featured
            hidden={hidden}
          />
          <FinancialCard
            title="Entradas"
            value={summary.income}
            icon={ArrowUpRight}
            tone="positive"
            description="Valores recebidos no período selecionado."
            hidden={hidden}
          />
          <FinancialCard
            title="Despesas"
            value={summary.expense}
            icon={ArrowDownRight}
            tone="negative"
            description="Valores pagos no período selecionado."
            hidden={hidden}
          />
          <FinancialCard
            title="Resultado"
            value={summary.result}
            icon={TrendingUp}
            description="Entradas menos despesas do período."
            hidden={hidden}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {(['income', 'expense'] as const).map((type) => {
            const income = type === 'income';
            const overdue = income ? summary.receivable_overdue : summary.payable_overdue;
            const week = income ? summary.receivable_week : summary.payable_week;
            return (
              <button
                key={type}
                className="wr-section flex flex-wrap items-center justify-between gap-4 p-5 text-left transition-colors hover:border-primary/40"
                onClick={() =>
                  openDetails({
                    title: income ? 'Contas a receber' : 'Contas a pagar',
                    type,
                    pending: true,
                  })
                }
              >
                <div>
                  <h2 className="text-sm font-medium text-muted-foreground">
                    {income ? 'A receber' : 'A pagar'}
                  </h2>
                  <CurrencyDisplay
                    value={income ? summary.receivable : summary.payable}
                    hidden={hidden}
                    className="mt-2 block text-2xl font-semibold"
                  />
                </div>
                <div className="text-right text-xs leading-6">
                  <p className={overdue ? 'text-negative' : 'text-muted-foreground'}>
                    {overdue} {overdue === 1 ? 'vencido' : 'vencidos'}
                  </p>
                  <p className="text-muted-foreground">{week} nos próximos 7 dias</p>
                  <p className="text-primary">Ver pendências →</p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={!activeAccounts.length}
            onClick={() => openEditor({ kind: 'transaction', type: 'expense' })}
          >
            <ArrowDownRight className="size-4 text-negative" />
            Nova despesa
          </Button>
          <Button
            variant="outline"
            disabled={activeAccounts.length < 2}
            onClick={() => openEditor({ kind: 'transfer' })}
          >
            <ArrowLeftRight className="size-4" />
            Transferir
          </Button>
          <Button variant="ghost" onClick={() => openEditor({ kind: 'account' })}>
            <Plus className="size-4" />
            Adicionar conta
          </Button>
          {activeAccounts.length === 1 && (
            <span className="self-center text-xs text-muted-foreground">
              Adicione outra conta para transferir.
            </span>
          )}
        </div>
        <DashboardCharts
          data={data}
          chartMonths={chartMonths}
          hidden={hidden}
          onCategory={(category, name) => openDetails({ title: name, type: 'expense', category })}
        />
        <section className="wr-section overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:px-6">
            <div>
              <h2 className="font-semibold">Últimos lançamentos</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                No período de {formatDate(range.start)} a {formatDate(range.end)}.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => openDetails({ title: 'Movimentações efetivadas' })}
            >
              Ver efetivados →
            </Button>
          </div>
          <TransactionList
            items={data.recent}
            today={data.today}
            hidden={hidden}
            onSettle={settle}
          />
        </section>
        <section>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">Suas contas</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Saldo atual, incluindo transferências internas.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => openEditor({ kind: 'account' })}>
              <Plus className="size-4" />
              Nova conta
            </Button>
          </div>
          {data.accounts.length ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {data.accounts.map((account) => (
                <AccountCard key={account.id} account={account} hidden={hidden} />
              ))}
            </div>
          ) : (
            <div className="wr-section">
              <EmptyState
                title="Seu controle começa com uma conta"
                description="Cadastre uma conta bancária ou carteira com seu saldo inicial para começar."
                action="Adicionar primeira conta"
                onAction={() => openEditor({ kind: 'account' })}
              />
            </div>
          )}
        </section>
        <p className="text-center text-xs leading-6 text-muted-foreground">
          Entradas e despesas seguem a data da efetivação. Saldos e pendências mostram a posição
          atual da empresa.
        </p>
      </div>
      {details && (
        <DetailsDialog
          key={JSON.stringify(details)}
          filter={details}
          range={range}
          today={data.today}
          hidden={hidden}
          revision={revision}
          onClose={closeDetails}
          onSettle={settle}
        />
      )}
      {editor && (
        <FinanceEditor
          editor={editor}
          data={data}
          onClose={closeEditor}
          onSaved={(text) => {
            closeEditor();
            setMessage(text);
            setRevision((value) => value + 1);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
