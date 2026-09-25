'use client';

import {
  CurrencyDisplay,
  EmptyState,
  MovementIcon,
  StatusBadge,
} from '@/components/financial/primitives';
import { Button } from '@/components/ui/button';
import type { FinancialRecord } from '@/validations/dashboard';
import { formatDate } from '@/utils/dates';

export function TransactionList({
  items,
  today,
  hidden,
  onSettle,
}: {
  items: FinancialRecord[];
  today: string;
  hidden: boolean;
  onSettle: (item: FinancialRecord) => void;
}) {
  if (!items.length)
    return (
      <EmptyState description="Não há movimentações para esta consulta. Experimente outro período ou registre um lançamento." />
    );
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
          <MovementIcon type={item.type} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" title={item.description}>
              {item.description}
            </p>
            <p className="mt-1 truncate text-xs text-muted-foreground">
              {item.category} · {item.account}
              {item.client ? ` · ${item.client}` : ''}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {item.paid_at ? 'Efetivado' : 'Vencimento'}:{' '}
              {formatDate(item.paid_at || item.due_date)}
            </p>
          </div>
          <div className="text-right">
            <CurrencyDisplay
              hidden={hidden}
              value={item.type === 'expense' ? `-${item.amount}` : item.amount}
              className={`mb-2 block text-sm font-semibold ${item.type === 'income' ? 'text-positive' : 'text-negative'}`}
            />
            <StatusBadge
              status={item.status}
              type={item.type}
              dueDate={item.due_date}
              today={today}
            />
          </div>
          {item.status === 'pending' && (
            <div className="flex w-full justify-end sm:w-auto">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onSettle(item)}
                aria-label={`${item.type === 'income' ? 'Receber' : 'Pagar'} ${item.description}`}
              >
                {item.type === 'income' ? 'Receber' : 'Pagar'}
              </Button>
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}
