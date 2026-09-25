'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { TransactionList } from './transaction-list';
import { getDetails } from './actions';
import type { FinancialRecord } from '@/validations/dashboard';
import type { DateRange } from '@/utils/dates';
import { formatDate } from '@/utils/dates';

export type DetailFilter = {
  title: string;
  type?: 'income' | 'expense';
  category?: string;
  pending?: boolean;
};

export function DetailsDialog({
  filter,
  range,
  hidden,
  today,
  revision,
  onClose,
  onSettle,
}: {
  filter: DetailFilter;
  range: DateRange;
  hidden: boolean;
  today: string;
  revision: number;
  onClose: () => void;
  onSettle: (item: FinancialRecord) => void;
}) {
  const [page, setPage] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: FinancialRecord[];
    count: number;
    error?: string;
  }>();
  const key = JSON.stringify([
    filter.type,
    filter.category,
    filter.pending,
    range.start,
    range.end,
    page,
    revision,
    attempt,
  ]);
  useEffect(() => {
    let current = true;
    getDetails({
      start: range.start,
      end: range.end,
      type: filter.type,
      category: filter.category,
      pending: filter.pending,
      offset: page * 100,
    })
      .then((response) => {
        if (current)
          setResult(
            response.ok
              ? { key, ...response.data }
              : { key, items: [], count: 0, error: response.error },
          );
      })
      .catch(() => {
        if (current)
          setResult({
            key,
            items: [],
            count: 0,
            error: 'Não foi possível consultar os lançamentos. Tente novamente.',
          });
      });
    return () => {
      current = false;
    };
  }, [key, filter.type, filter.category, filter.pending, range.start, range.end, page]);
  const loading = !result || result.key !== key;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto p-0 sm:max-w-3xl">
        <DialogHeader className="px-6 pt-6 pr-12">
          <DialogTitle>{filter.title}</DialogTitle>
          <DialogDescription>
            {filter.pending
              ? 'Todas as pendências da empresa, incluindo vencidas e futuras.'
              : `Movimentações efetivadas de ${formatDate(range.start)} a ${formatDate(range.end)}.`}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="space-y-4 p-6" role="status" aria-label="Carregando lançamentos">
            {[1, 2, 3].map((item) => (
              <Skeleton key={item} className="h-20 w-full" />
            ))}
          </div>
        ) : result.error ? (
          <div className="space-y-4 p-6">
            <p role="alert" className="text-sm text-negative">
              {result.error}
            </p>
            <Button variant="outline" onClick={() => setAttempt((value) => value + 1)}>
              Tentar novamente
            </Button>
          </div>
        ) : (
          <>
            <TransactionList
              items={result.items}
              today={today}
              hidden={hidden}
              onSettle={onSettle}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-5 text-xs text-muted-foreground">
              <p>
                {result.count
                  ? `${page * 100 + 1}–${page * 100 + result.items.length} de ${result.count} lançamentos`
                  : '0 lançamentos'}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 0}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={(page + 1) * 100 >= result.count}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
