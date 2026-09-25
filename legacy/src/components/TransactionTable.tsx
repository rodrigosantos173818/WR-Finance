import { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge, Button, Dropdown, EmptyState, Money, Select } from '../design-system';
import { formatDate, type Transaction } from '../lib/finance';

export type TransactionFilter = 'all' | 'income' | 'expense' | 'payable' | 'receivable';
export function TransactionTable({
  transactions,
  hidden,
  filter,
  onFilter,
  query,
  onQuery,
  onInspect,
}: {
  transactions: Transaction[];
  hidden: boolean;
  filter: TransactionFilter;
  onFilter: (value: TransactionFilter) => void;
  query: string;
  onQuery: (value: string) => void;
  onInspect: (t: Transaction) => void;
}) {
  const [page, setPage] = useState(0);
  const [ascending, setAscending] = useState(false);
  const [status, setStatus] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const visible = transactions
    .filter(
      (t) =>
        (filter === 'all' ||
          t.type === filter ||
          (filter === 'payable' && t.type === 'expense' && t.status !== 'paid') ||
          (filter === 'receivable' && t.type === 'income' && t.status !== 'paid')) &&
        (status === 'all' || t.status === status) &&
        `${t.title} ${t.contact} ${t.category}`
          .toLocaleLowerCase('pt-BR')
          .includes(query.toLocaleLowerCase('pt-BR')),
    )
    .sort((a, b) => (ascending ? 1 : -1) * a.date.localeCompare(b.date));
  const lastPage = Math.max(0, Math.ceil(visible.length / 5) - 1);
  const currentPage = Math.min(page, lastPage);
  const rows = visible.slice(currentPage * 5, currentPage * 5 + 5);
  return (
    <section className="wr-card transactions-card" id="transactions">
      <div className="panel-heading">
        <div>
          <h2>
            Últimas transações <span className="count-label">{transactions.length}</span>
          </h2>
          <p>Os movimentos que fazem seu negócio acontecer.</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            onFilter('all');
            onQuery('');
            setStatus('all');
            setPage(0);
          }}
        >
          Ver todas
          <ArrowUpRight size={14} />
        </Button>
      </div>
      <div className="table-toolbar">
        <div className="table-tabs" aria-label="Filtrar transações">
          {(
            [
              { value: 'all', label: 'Todas' },
              { value: 'income', label: 'Entradas' },
              { value: 'expense', label: 'Despesas' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                onFilter(tab.value);
                setPage(0);
              }}
              className={filter === tab.value ? 'active' : ''}
              aria-pressed={filter === tab.value}
            >
              {tab.label}
            </button>
          ))}
          {(filter === 'payable' || filter === 'receivable') && (
            <span className="special-filter">{filter === 'payable' ? 'A pagar' : 'A receber'}</span>
          )}
        </div>
        <div className="table-tools">
          <label className="table-search">
            <Search size={15} />
            <input
              type="search"
              aria-label="Buscar transações"
              placeholder="Buscar transação..."
              value={query}
              onChange={(e) => {
                onQuery(e.target.value);
                setPage(0);
              }}
            />
          </label>
          <Button
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            aria-controls="table-filters"
          >
            <SlidersHorizontal size={14} />
            Filtros{status !== 'all' && <span className="wr-dot text-positive" />}
          </Button>
        </div>
      </div>
      {showFilters && (
        <div className="table-filters" id="table-filters">
          <span>Situação</span>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(0);
            }}
            label="Filtrar por situação"
            options={[
              { value: 'all', label: 'Todas as situações' },
              { value: 'paid', label: 'Recebido / Pago' },
              { value: 'pending', label: 'Pendente' },
              { value: 'overdue', label: 'Vencido' },
            ]}
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStatus('all');
              onQuery('');
              onFilter('all');
            }}
          >
            Limpar filtros
          </Button>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <caption className="sr-only">Transações demonstrativas do período selecionado</caption>
          <thead>
            <tr>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>
                <button
                  className="sort-button"
                  onClick={() => setAscending(!ascending)}
                  aria-label={`Ordenar data da mais ${ascending ? 'recente' : 'antiga'}`}
                >
                  Data
                  <ArrowUpDown size={11} />
                </button>
              </th>
              <th>Situação</th>
              <th className="align-right">Valor</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td>
                  <div className="transaction-description">
                    <span
                      className={`transaction-icon ${t.type === 'income' ? 'income' : 'expense'}`}
                    >
                      {t.type === 'income' ? (
                        <ArrowDownLeft size={17} />
                      ) : (
                        <ArrowUpRight size={17} />
                      )}
                    </span>
                    <div>
                      <button className="transaction-name" onClick={() => onInspect(t)}>
                        {t.title}
                      </button>
                      <span>{t.contact}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className="category-pill">{t.category}</span>
                </td>
                <td className="date-cell">{formatDate(t.date)}</td>
                <td>
                  <Badge
                    tone={
                      t.status === 'paid'
                        ? 'positive'
                        : t.status === 'pending'
                          ? 'warning'
                          : 'negative'
                    }
                  >
                    {t.status === 'paid'
                      ? t.type === 'income'
                        ? 'Recebido'
                        : 'Pago'
                      : t.status === 'pending'
                        ? 'Pendente'
                        : 'Vencido'}
                  </Badge>
                </td>
                <td
                  className={`align-right amount-cell ${t.type === 'income' ? 'text-positive' : ''}`}
                >
                  <span>{!hidden && (t.type === 'income' ? '+ ' : '− ')}</span>
                  <Money value={t.amount} hidden={hidden} />
                </td>
                <td>
                  <Dropdown
                    label="Ações da transação"
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Ações: ${t.title}`}>
                        <Ellipsis size={17} />
                      </Button>
                    }
                    items={[{ label: 'Ver detalhes', onSelect: () => onInspect(t) }]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && (
        <EmptyState
          icon={<Search size={22} />}
          title="Nenhuma transação encontrada"
          description="Experimente outro termo ou ajuste os filtros do período."
          action={
            <Button
              onClick={() => {
                onQuery('');
                setStatus('all');
                onFilter('all');
              }}
            >
              Limpar filtros
            </Button>
          }
        />
      )}
      <div className="table-footer">
        <span>
          {visible.length
            ? `${currentPage * 5 + 1}–${Math.min(currentPage * 5 + 5, visible.length)} de ${visible.length} transações`
            : '0 transações'}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Página anterior"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft size={15} />
          </Button>
          <span>{currentPage + 1}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próxima página"
            disabled={currentPage === lastPage}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight size={15} />
          </Button>
        </div>
      </div>
    </section>
  );
}
