'use client';

import { useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ArrowDownRight, ArrowUpRight, Clock3, Eye, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DateRangePicker } from '@/components/financial/date-range-picker';
import { EmptyState, FinancialCard, PageHeader } from '@/components/financial/primitives';
import type { DashboardData, FinancialRecord } from '@/validations/dashboard';
import { formatDate, type DateRange } from '@/utils/dates';
import { FinanceEditor, type Editor } from './finance-forms';
import { TransactionList } from './transaction-list';
import { useSubscription } from '@/features/billing/subscription-provider';

export function Transactions({
  type,
  data,
  range,
  pending,
  category,
  page,
  records,
}: {
  type: 'income' | 'expense';
  data: DashboardData;
  range: DateRange;
  pending: boolean;
  category: string;
  page: number;
  records: { items: FinancialRecord[]; count: number };
}) {
  const router = useRouter();
  const subscription = useSubscription();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [changing, startTransition] = useTransition();
  const [hidden, setHidden] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [message, setMessage] = useState('');
  const editorTrigger = useRef<HTMLElement | null>(null);
  const listHeading = useRef<HTMLHeadingElement | null>(null);
  const isIncome = type === 'income';
  const activeAccounts = data.accounts.some((account) => !account.archived);
  const categories = data.categories.filter((item) => item.type === type);
  const period = `${formatDate(range.start)} a ${formatDate(range.end)}`;

  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(searchParams);
    next.delete('page');
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
  }
  function openEditor(next: Editor) {
    if (!subscription.available || !subscription.canWrite) {
      subscription.openUpgrade();
      return;
    }
    editorTrigger.current = document.activeElement as HTMLElement;
    setMessage('');
    setEditor(next);
  }
  function closeEditor() {
    setEditor(null);
    requestAnimationFrame(() => {
      const target = editorTrigger.current;
      if (target?.isConnected) target.focus();
      else listHeading.current?.focus();
    });
  }

  return (
    <>
      <PageHeader
        title={isIncome ? 'Entradas' : 'Despesas'}
        description={
          isIncome
            ? 'Acompanhe seus recebimentos e o que ainda está por entrar.'
            : 'Organize seus pagamentos e acompanhe os compromissos da empresa.'
        }
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
        {!pending && <DateRangePicker range={range} />}
        <Button
          onClick={() =>
            openEditor(
              activeAccounts
                ? { kind: 'transaction', type, initialStatus: pending ? 'pending' : 'paid' }
                : { kind: 'account' },
            )
          }
        >
          <Plus className="size-4" />
          {activeAccounts ? (isIncome ? 'Nova entrada' : 'Nova despesa') : 'Criar primeira conta'}
        </Button>
      </PageHeader>

      {message && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-positive/20 bg-positive/10 px-4 py-3 text-sm text-positive"
        >
          {message}
        </p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <FinancialCard
          title={isIncome ? 'Recebido no período' : 'Pago no período'}
          value={isIncome ? data.summary.income : data.summary.expense}
          icon={isIncome ? ArrowUpRight : ArrowDownRight}
          tone={isIncome ? 'positive' : 'negative'}
          description={`${period} · Todas as categorias.`}
          hidden={hidden}
        />
        <FinancialCard
          title={isIncome ? 'A receber' : 'A pagar'}
          value={isIncome ? data.summary.receivable : data.summary.payable}
          icon={Clock3}
          tone="info"
          description="Todas as pendências da empresa, incluindo vencidas e futuras."
          hidden={hidden}
        />
      </div>

      <section className="wr-section" aria-labelledby="transactions-heading" aria-busy={changing}>
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-5 sm:p-6">
          <div>
            <h2
              id="transactions-heading"
              ref={listHeading}
              tabIndex={-1}
              className="text-base font-semibold"
            >
              Lançamentos
            </h2>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {pending
                ? 'Pendências de todos os períodos, por vencimento.'
                : `Efetivados de ${period}.`}
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <label className="min-w-0 flex-1 space-y-2 text-xs text-muted-foreground sm:flex-none">
              <span className="block">Situação</span>
              <select
                aria-label="Filtrar situação"
                className="wr-native-select"
                value={pending ? 'pending' : 'paid'}
                disabled={changing}
                onChange={(event) => navigate({ status: event.target.value })}
              >
                <option value="paid">{isIncome ? 'Recebidas' : 'Pagas'}</option>
                <option value="pending">{isIncome ? 'A receber' : 'A pagar'}</option>
              </select>
            </label>
            <label className="min-w-0 flex-1 space-y-2 text-xs text-muted-foreground sm:max-w-64 sm:flex-none">
              <span className="block">Categoria</span>
              <select
                aria-label="Filtrar categoria"
                className="wr-native-select"
                value={category}
                disabled={changing}
                onChange={(event) => navigate({ category: event.target.value })}
              >
                <option value="">Todas as categorias</option>
                {categories.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {changing && (
          <p
            role="status"
            className="border-b border-border px-5 py-3 text-xs text-muted-foreground"
          >
            Atualizando lançamentos…
          </p>
        )}
        {!activeAccounts ? (
          <EmptyState
            title="Seu controle começa com uma conta"
            description="Cadastre uma conta para registrar entradas e despesas."
            action="Adicionar conta"
            onAction={() => openEditor({ kind: 'account' })}
          />
        ) : null}
        {records.items.length ? (
          <TransactionList
            items={records.items}
            today={data.today}
            hidden={hidden}
            onSettle={(record) => openEditor({ kind: 'settlement', record })}
          />
        ) : activeAccounts ? (
          <EmptyState
            description={
              pending
                ? 'Nenhuma pendência nesta categoria. Registre um lançamento ou selecione outra categoria.'
                : 'Não há lançamentos efetivados nesta consulta. Experimente outro período ou categoria.'
            }
          />
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5 text-xs text-muted-foreground">
          <p aria-live="polite">
            {records.count
              ? `${(page - 1) * 100 + 1}–${(page - 1) * 100 + records.items.length} de ${records.count} lançamentos`
              : '0 lançamentos'}
          </p>
          <nav aria-label="Paginação dos lançamentos" className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={changing || page === 1}
              onClick={() => navigate({ page: String(page - 1) })}
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={changing || page * 100 >= records.count}
              onClick={() => navigate({ page: String(page + 1) })}
            >
              Próxima
            </Button>
          </nav>
        </div>
      </section>

      {editor && (
        <FinanceEditor
          editor={editor}
          data={data}
          onClose={closeEditor}
          onSaved={(text) => {
            closeEditor();
            setMessage(text);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
