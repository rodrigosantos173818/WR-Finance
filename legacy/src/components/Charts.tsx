import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowUpRight } from 'lucide-react';
import { Card, ColorDot, Money } from '../design-system';
import { categoryTotals, dailySeries, type Transaction } from '../lib/finance';
const chartColors = [
  'var(--wr-green)',
  'var(--wr-green-bright)',
  'var(--wr-chart-mint)',
  'var(--wr-info)',
  'var(--wr-chart-violet)',
  'var(--wr-warning)',
];
const tooltipStyle = {
  background: 'var(--wr-surface-secondary)',
  border: '1px solid var(--wr-border-control)',
  borderRadius: 10,
  color: 'var(--wr-text)',
  fontSize: 11,
  padding: '10px 14px',
};

export function CashflowChart({
  transactions,
  month,
  hidden,
}: {
  transactions: Transaction[];
  month: string;
  hidden: boolean;
}) {
  const series = dailySeries(transactions, month);
  return (
    <Card className="cashflow-card">
      <div className="panel-heading">
        <div>
          <h2>Receitas × despesas</h2>
          <p>A evolução do seu negócio, em perspectiva.</p>
        </div>
        <span className="chart-period">Acumulado no mês</span>
      </div>
      <div className="chart-legend">
        <span>
          <ColorDot color="var(--wr-positive)" />
          Receitas
        </span>
        <span>
          <ColorDot color="var(--wr-negative)" />
          Despesas
        </span>
      </div>
      <div
        className="area-chart"
        aria-label={hidden ? 'Gráfico oculto' : 'Evolução acumulada de receitas e despesas no mês'}
      >
        {hidden ? (
          <div className="chart-hidden">Valores ocultos</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={series} margin={{ top: 12, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="wr-income-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--wr-green)" stopOpacity={0.19} />
                  <stop offset="100%" stopColor="var(--wr-green)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="wr-expense-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--wr-negative)" stopOpacity={0.07} />
                  <stop offset="100%" stopColor="var(--wr-negative)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--wr-chart-grid)" strokeDasharray="4 5" />
              <XAxis
                dataKey="day"
                ticks={['01', '05', '10', '15', '20', '25', '30']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--wr-text-subtle)', fontSize: 10 }}
                tickMargin={12}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--wr-text-subtle)', fontSize: 10 }}
                tickFormatter={(v) => (v === 0 ? 'R$ 0' : `${v / 1000} mil`)}
                tickCount={5}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(v) => `Dia ${v}`}
                formatter={(v) =>
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    Number(v),
                  )
                }
                cursor={{ stroke: 'var(--wr-border-hover)' }}
              />
              <Area
                type="monotone"
                dataKey="Receitas"
                stroke="var(--wr-positive)"
                fill="url(#wr-income-fill)"
                strokeWidth={2.3}
                activeDot={{ r: 4, stroke: 'var(--wr-surface)', strokeWidth: 3 }}
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="Despesas"
                stroke="var(--wr-negative)"
                fill="url(#wr-expense-fill)"
                strokeWidth={1.8}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      <div className="chart-footnote">
        <span className="wr-dot text-positive" />
        Valores recebidos e pagos no período
      </div>
    </Card>
  );
}
export function CategoriesChart({
  transactions,
  hidden,
}: {
  transactions: Transaction[];
  hidden: boolean;
}) {
  const data = categoryTotals(transactions);
  const total = data.reduce((sum, c) => sum + c.value, 0);
  return (
    <Card className="categories-card">
      <div className="panel-heading">
        <div>
          <h2>Onde você investe</h2>
          <p>Despesas por categoria</p>
        </div>
        <ArrowUpRight size={17} className="text-muted" />
      </div>
      <div className="donut-wrap">
        <div className="donut-chart" aria-label="Distribuição de despesas por categoria">
          {data.length > 0 && !hidden ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={69}
                  outerRadius={88}
                  paddingAngle={4}
                  cornerRadius={4}
                  startAngle={90}
                  endAngle={-270}
                  stroke="none"
                  isAnimationActive={false}
                >
                  {data.map((entry, i) => (
                    <Cell key={entry.name} fill={chartColors[i % chartColors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) =>
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                      Number(value) / 100,
                    )
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-donut" />
          )}
        </div>
        <div className="donut-label">
          <span>Total de despesas</span>
          <Money value={total} hidden={hidden} />
          <small>{data.length} categorias</small>
        </div>
      </div>
      <div className="category-legend">
        {data.map((category, i) => (
          <div key={category.name}>
            <span>
              <ColorDot color={chartColors[i % chartColors.length]} />
              {category.name}
            </span>
            <strong>{hidden ? '••' : `${Math.round((category.value / total) * 100)}%`}</strong>
          </div>
        ))}
        {!data.length && <p className="text-secondary">Nenhuma despesa neste período.</p>}
      </div>
    </Card>
  );
}
