'use client';
import { useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { isDate, rangePresets, type DateRange } from '@/utils/dates';
export function DateRangePicker({ range }: { range: DateRange }) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [open, setOpen] = useState(false),
    [pending, startTransition] = useTransition();
  const [error, setError] = useState('');
  function apply(value: string, start?: string, end?: string) {
    const next = new URLSearchParams(params);
    next.delete('page');
    next.set('range', value);
    if (start && end) {
      next.set('start', start);
      next.set('end', end);
    } else {
      next.delete('start');
      next.delete('end');
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`, { scroll: false }));
    setOpen(false);
  }
  return (
    <>
      <div className="flex min-h-11 items-center gap-2 rounded-xl border border-input bg-card pl-3">
        <CalendarDays className="size-4 text-muted-foreground" />
        <select
          aria-label="Filtrar período"
          value={range.preset}
          disabled={pending}
          className="h-10 max-w-[210px] bg-transparent pr-3 text-sm"
          onChange={(event) => {
            setError('');
            if (event.target.value === 'custom') setOpen(true);
            else apply(event.target.value);
          }}
        >
          {rangePresets.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {range.preset === 'custom' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setError('');
              setOpen(true);
            }}
          >
            Editar
          </Button>
        )}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escolha o período</DialogTitle>
            <DialogDescription>
              Consulte movimentações em um intervalo de até 10 anos.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const start = String(data.get('start')),
                end = String(data.get('end'));
              if (!isDate(start) || !isDate(end) || start > end) {
                setError('A data final deve ser igual ou posterior à inicial.');
                return;
              }
              if ((Date.parse(end) - Date.parse(start)) / 86400000 > 3660) {
                setError('Escolha um intervalo de até 10 anos.');
                return;
              }
              setError('');
              apply('custom', start, end);
            }}
          >
            <label className="block text-sm">
              De
              <Input
                className="mt-2 h-11"
                type="date"
                name="start"
                defaultValue={range.start}
                required
              />
            </label>
            <label className="block text-sm">
              Até
              <Input
                className="mt-2 h-11"
                type="date"
                name="end"
                defaultValue={range.end}
                required
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-negative">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              Aplicar período
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
