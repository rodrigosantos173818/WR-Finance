import { useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react';
import { Button, Field, Select } from '../design-system';
import { accounts, categories, parseBRL, type Transaction } from '../lib/finance';

export function TransactionForm({
  onSave,
  onCancel,
}: {
  onSave: (transaction: Transaction) => void;
  onCancel: () => void;
}) {
  const [type, setType] = useState<'income' | 'expense'>('income');
  const [category, setCategory] = useState('Serviços');
  const [account, setAccount] = useState('Conta principal');
  const [status, setStatus] = useState('paid');
  const [error, setError] = useState('');
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = parseBRL(String(form.get('amount')));
    if (amount === null) {
      setError('Informe um valor positivo, como 1.250,90.');
      return;
    }
    const title = String(form.get('title')).trim();
    if (!title) return;
    onSave({
      id: crypto.randomUUID(),
      title,
      contact: String(form.get('contact')).trim() || 'Sem contato',
      category,
      account,
      status: status as Transaction['status'],
      type,
      amount,
      date: String(form.get('date')),
    });
  }
  return (
    <form onSubmit={submit} className="transaction-form">
      <div className="type-selector" role="group" aria-label="Tipo da transação">
        <button
          type="button"
          className={type === 'income' ? 'selected-income' : ''}
          aria-pressed={type === 'income'}
          onClick={() => setType('income')}
        >
          <ArrowDownLeft size={17} />
          Entrada
        </button>
        <button
          type="button"
          className={type === 'expense' ? 'selected-expense' : ''}
          aria-pressed={type === 'expense'}
          onClick={() => {
            setType('expense');
            setCategory('Operacional');
          }}
        >
          <ArrowUpRight size={17} />
          Despesa
        </button>
      </div>
      <Field
        label="Descrição"
        name="title"
        placeholder="Ex.: Consultoria de setembro"
        required
        maxLength={100}
      />
      <div className="form-grid">
        <Field
          label="Valor (R$)"
          name="amount"
          inputMode="decimal"
          placeholder="0,00"
          required
          error={error}
          onChange={() => setError('')}
        />
        <Field
          label="Data"
          name="date"
          type="date"
          defaultValue="2026-09-30"
          min="2000-01-01"
          max="2100-12-31"
          required
        />
      </div>
      <Field
        label="Cliente ou fornecedor"
        name="contact"
        placeholder="Nome do contato"
        maxLength={80}
      />
      <div className="form-grid">
        <div className="wr-field">
          <label id="category-label">Categoria</label>
          <Select
            label="Categoria"
            value={category}
            onValueChange={setCategory}
            options={categories.map((value) => ({ value, label: value }))}
          />
        </div>
        <div className="wr-field">
          <label>Conta</label>
          <Select
            label="Conta"
            value={account}
            onValueChange={setAccount}
            options={accounts.map((value) => ({ value, label: value }))}
          />
        </div>
      </div>
      <div className="wr-field">
        <label>Situação</label>
        <Select
          label="Situação"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: 'paid', label: type === 'income' ? 'Recebido' : 'Pago' },
            { value: 'pending', label: 'Pendente' },
            { value: 'overdue', label: 'Vencido' },
          ]}
        />
      </div>
      <p className="form-note">
        Demonstração: os lançamentos ficam disponíveis até atualizar a página.
      </p>
      <div className="form-actions">
        <Button onClick={onCancel}>Cancelar</Button>
        <Button type="submit" variant="primary">
          <Check size={16} />
          Adicionar transação
        </Button>
      </div>
    </form>
  );
}
