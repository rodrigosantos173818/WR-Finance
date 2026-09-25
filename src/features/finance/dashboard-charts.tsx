'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CurrencyDisplay, EmptyState } from '@/components/financial/primitives';
import type { DashboardData } from '@/validations/dashboard';

const colors: Record<string, string> = {
  primary: 'var(--wr-green)',
  positive: 'var(--wr-positive)',
  mint: 'var(--wr-chart-mint)',
  info: 'var(--wr-info)',
  violet: 'var(--wr-chart-violet)',
  warning: 'var(--wr-warning)',
};
const monthLabel = (value: string) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }).format(
    new Date(`${value}-01T12:00:00Z`),
  );

export function DashboardCharts({
  data,
  hidden,
  chartMonths,
  onCategory,
}: {
  data: DashboardData;
  hidden: boolean;
  chartMonths: number;
  onCategory: (id: string, name: string) => void;
}) {
  const router = useRouter(),
    pathname = usePathname(),
    params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const points = data.monthly.map((point) => ({
    ...point,
    income: Number(point.income),
    expense: Number(point.expense),
  }));
  const total = data.expense_categories.reduce((sum, category) => sum + Number(category.amount), 0);
  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[1.6fr_1fr]">
      <section className="wr-section min-w-0 p-5 sm:p-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Fluxo de caixa</h2>
          <select
            aria-label="Meses no gráfico"
            className="wr-native-select max-w-36"
            value={chartMonths}
            disabled={pending}
            onChange={(event) => {
              const next = new URLSearchParams(params);
              next.set('months', event.target.value);
              startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
            }}
          >
            {[3, 6, 12].map((months) => (
              <option value={months} key={months}>
                {months} meses
              </option>
            ))}
          </select>
        </div>
        <p className="mb-6 text-xs leading-5 text-muted-foreground">
          Recebimentos e pagamentos por mês, até o mês atual.
        </p>
        {hidden ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Valores do gráfico ocultos
          </div>
        ) : (
          <>
            <div className="h-64 w-full min-w-0" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={points} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="income-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--wr-positive)" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="var(--wr-positive)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--wr-chart-grid)" />
                  <XAxis
                    dataKey="month"
                    tickFormatter={monthLabel}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--wr-text-secondary)', fontSize: 11 }}
                    minTickGap={20}
                    dy={10}
                  />
                  <YAxis
                    tickFormatter={(value) =>
                      new Intl.NumberFormat('pt-BR', {
                        notation: 'compact',
                        maximumFractionDigits: 1,
                      }).format(value)
                    }
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'var(--wr-text-secondary)', fontSize: 11 }}
                    width={50}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const point = data.monthly.find((item) => item.month === label);
                      return point ? (
                        <div className="wr-chart-tooltip space-y-2 text-xs">
                          <p className="font-medium">{monthLabel(point.month)}</p>
                          <p className="text-positive">
                            Entradas: <CurrencyDisplay value={point.income} />
                          </p>
                          <p className="text-negative">
                            Despesas: <CurrencyDisplay value={point.expense} />
                          </p>
                        </div>
                      ) : null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke="var(--wr-positive)"
                    fill="url(#income-fill)"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke="var(--wr-negative)"
                    fill="transparent"
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <table className="sr-only">
              <caption>Fluxo de caixa mensal em reais</caption>
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Entradas</th>
                  <th>Despesas</th>
                </tr>
              </thead>
              <tbody>
                {data.monthly.map((point) => (
                  <tr key={point.month}>
                    <th>{monthLabel(point.month)}</th>
                    <td>
                      <CurrencyDisplay value={point.income} />
                    </td>
                    <td>
                      <CurrencyDisplay value={point.expense} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        <div className="mt-5 flex justify-center gap-5 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="wr-dot text-positive" />
            Entradas
          </span>
          <span className="flex items-center gap-2">
            <span className="wr-dot text-negative" />
            Despesas
          </span>
        </div>
      </section>
      <section className="wr-section min-w-0 p-5 sm:p-6">
        <h2 className="font-semibold">Despesas por categoria</h2>
        <p className="mb-5 mt-2 text-xs leading-5 text-muted-foreground">
          Valores pagos no período selecionado. Selecione para consultar.
        </p>
        {!data.expense_categories.length ? (
          <EmptyState
            title="Nenhuma despesa paga"
            description="As despesas aparecem aqui após a confirmação do pagamento."
          />
        ) : (
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {data.expense_categories.map((category) => (
              <button
                key={category.id}
                className="block w-full rounded-xl p-3 text-left transition-colors hover:bg-muted"
                onClick={() => onCategory(category.id, category.name)}
              >
                <span className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="wr-dot shrink-0"
                      style={{ color: colors[category.color] || colors.primary }}
                    />
                    <span className="truncate">{category.name}</span>
                  </span>
                  <CurrencyDisplay
                    value={category.amount}
                    hidden={hidden}
                    className="font-medium"
                  />
                </span>
                {!hidden && (
                  <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${total ? (Number(category.amount) / total) * 100 : 0}%`,
                        background: colors[category.color] || colors.primary,
                      }}
                    />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
