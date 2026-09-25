'use client';

import {
  Children,
  cloneElement,
  isValidElement,
  useId,
  useRef,
  useState,
  useTransition,
} from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { MoneyInput } from '@/components/financial/money-input';
import { CurrencyDisplay } from '@/components/financial/primitives';
import { parseMoneyInput } from '@/utils/money';
import {
  accountSchema,
  transactionSchema,
  settlementSchema,
  transferSchema,
} from '@/validations/finance';
import type { DashboardData, FinancialRecord } from '@/validations/dashboard';
import type { ActionResult } from '@/types/actions';
import { saveAccount, saveTransaction, settleTransaction, saveTransfer } from './actions';
import { useSubscription } from '@/features/billing/subscription-provider';

export type Editor =
  | { kind: 'account' }
  | { kind: 'transaction'; type: 'income' | 'expense'; initialStatus?: 'paid' | 'pending' }
  | { kind: 'transfer' }
  | { kind: 'settlement'; record: FinancialRecord };
type Props = {
  editor: Editor;
  data: DashboardData;
  onClose: () => void;
  onSaved: (message: string) => void;
};
const payments = {
  pix: 'Pix',
  cash: 'Dinheiro',
  bank_transfer: 'Transferência bancária',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  boleto: 'Boleto',
  other: 'Outra',
};
const accountTypes = {
  bank: 'Conta bancária',
  cash: 'Dinheiro',
  pix: 'Pix',
  wallet: 'Carteira digital',
  card: 'Cartão',
  other: 'Outra',
};
const field = (form: FormData, key: string) => String(form.get(key) ?? '');

function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  const [control, ...hints] = Children.toArray(children);
  return (
    <div className="space-y-2 text-sm font-medium">
      <label htmlFor={id} className="block">
        {label}
      </label>
      {isValidElement<{ id?: string }>(control) ? cloneElement(control, { id }) : control}
      {hints}
    </div>
  );
}

export function FinanceEditor({ editor, data, onClose, onSaved }: Props) {
  const subscription = useSubscription();
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState<'paid' | 'pending'>(
    editor.kind === 'transaction' ? (editor.initialStatus ?? 'pending') : 'pending',
  );
  const [error, setError] = useState('');
  const [busy, startTransition] = useTransition();
  const submitting = useRef(false);
  const accounts = data.accounts.filter((account) => !account.archived);
  const isIncome =
    (editor.kind === 'transaction' && editor.type === 'income') ||
    (editor.kind === 'settlement' && editor.record.type === 'income');
  const title =
    editor.kind === 'account'
      ? 'Nova conta'
      : editor.kind === 'transfer'
        ? 'Transferir entre contas'
        : editor.kind === 'settlement'
          ? isIncome
            ? 'Confirmar recebimento'
            : 'Confirmar pagamento'
          : isIncome
            ? 'Nova entrada'
            : 'Nova despesa';
  const description =
    editor.kind === 'account'
      ? 'Informe o saldo na data de abertura, antes dos lançamentos que você vai cadastrar.'
      : editor.kind === 'transfer'
        ? 'Movimente o saldo entre contas da sua empresa.'
        : editor.kind === 'settlement'
          ? 'Informe quando e onde o valor foi efetivamente movimentado.'
          : 'Organize o previsto e registre o que já foi efetivado.';

  function accountSelect(name: string, initial?: string) {
    // A settlement must select an active account, including when the original was archived.
    return (
      <select
        name={name}
        className="wr-native-select"
        defaultValue={accounts.some((a) => a.id === initial) ? initial : ''}
        required
      >
        <option value="" disabled>
          Selecione uma conta
        </option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    );
  }
  function paymentSelect(initial = 'pix') {
    return (
      <select name="payment_method" className="wr-native-select" defaultValue={initial}>
        {Object.entries(payments).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    );
  }
  function dateField(name: string, label: string, effective = false) {
    return (
      <Field label={label}>
        <Input
          className="h-11"
          type="date"
          name={name}
          defaultValue={data.today}
          max={effective ? data.today : undefined}
          required
        />
      </Field>
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    const value = parseMoneyInput(amount);
    let execute: () => Promise<ActionResult<unknown>>;
    if (editor.kind === 'account') {
      const parsed = accountSchema.safeParse({
        name: field(form, 'name'),
        type: field(form, 'type'),
        opening_balance: parseMoneyInput(field(form, 'opening_balance')),
        opening_date: field(form, 'opening_date'),
      });
      if (!parsed.success) {
        setError('Confira o nome, a data e o saldo. Use valores como 1.250,00 ou -250,00.');
        return;
      }
      execute = () => saveAccount(parsed.data);
    } else if (editor.kind === 'transfer') {
      const parsed = transferSchema.safeParse({
        from: field(form, 'from'),
        to: field(form, 'to'),
        amount: value,
        date: field(form, 'date'),
        notes: field(form, 'notes') || null,
      });
      if (!parsed.success) {
        setError('Escolha duas contas diferentes e informe um valor maior que zero.');
        return;
      }
      execute = () => saveTransfer(parsed.data);
    } else if (editor.kind === 'settlement') {
      const parsed = settlementSchema.safeParse({
        id: editor.record.id,
        account_id: field(form, 'account_id'),
        paid_at: field(form, 'paid_at'),
        payment_method: field(form, 'payment_method'),
      });
      if (!parsed.success) {
        setError('Confira a conta, a data e a forma de pagamento.');
        return;
      }
      execute = () => settleTransaction(parsed.data);
    } else {
      const parsed = transactionSchema.safeParse({
        type: editor.type,
        description: field(form, 'description'),
        amount: value,
        account_id: field(form, 'account_id'),
        category_id: field(form, 'category_id'),
        client_id: field(form, 'client_id') || null,
        competence_date: field(form, 'competence_date'),
        due_date: field(form, 'due_date'),
        paid_at: status === 'paid' ? field(form, 'paid_at') : null,
        status,
        payment_method: field(form, 'payment_method'),
        is_fixed: form.has('is_fixed'),
        notes: field(form, 'notes') || null,
      });
      if (!parsed.success) {
        setError('Preencha os campos obrigatórios e informe um valor maior que zero.');
        return;
      }
      execute = () => saveTransaction(parsed.data);
    }
    setError('');
    submitting.current = true;
    startTransition(async () => {
      try {
        const result = await execute();
        if (!result.ok) {
          if (result.code === 'SUBSCRIPTION_REQUIRED') {
            onClose();
            subscription.openUpgrade();
            void subscription.refresh();
            return;
          }
          setError(result.error);
          return;
        }
        onSaved(
          editor.kind === 'account'
            ? 'Conta criada.'
            : editor.kind === 'transfer'
              ? 'Transferência registrada.'
              : editor.kind === 'settlement'
                ? 'Baixa registrada.'
                : 'Lançamento criado.',
        );
      } catch {
        setError(
          'Não foi possível confirmar a operação. Verifique a conexão e consulte os lançamentos antes de tentar novamente.',
        );
      } finally {
        submitting.current = false;
      }
    });
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy} className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <fieldset disabled={busy} className="space-y-5 disabled:opacity-60">
            {editor.kind === 'account' ? (
              <>
                <Field label="Nome da conta">
                  <Input
                    name="name"
                    placeholder="Ex.: Conta principal"
                    minLength={2}
                    maxLength={80}
                    required
                    className="h-11"
                  />
                </Field>
                <Field label="Tipo de conta">
                  <select name="type" className="wr-native-select">
                    {Object.entries(accountTypes).map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Saldo inicial (R$)">
                  <Input
                    name="opening_balance"
                    defaultValue="0,00"
                    inputMode="text"
                    required
                    className="h-11"
                  />
                  <span className="block text-xs font-normal text-muted-foreground">
                    Para saldo negativo, use o sinal de menos. Ex.: -250,00.
                  </span>
                </Field>
                {dateField('opening_date', 'Data de abertura', true)}
              </>
            ) : (
              <>
                {editor.kind === 'settlement' ? (
                  <div className="rounded-xl bg-muted p-4">
                    <p className="mb-2 text-sm">{editor.record.description}</p>
                    <CurrencyDisplay
                      value={editor.record.amount}
                      className="text-2xl font-semibold"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="wr-label" htmlFor="amount">
                      Valor
                    </label>
                    <MoneyInput value={amount} onChange={setAmount} large />
                  </div>
                )}
                {editor.kind === 'transfer' ? (
                  <>
                    <Field label="Conta de origem">{accountSelect('from')}</Field>
                    <Field label="Conta de destino">{accountSelect('to')}</Field>
                    {dateField('date', 'Data da transferência', true)}
                  </>
                ) : (
                  <>
                    {editor.kind === 'transaction' && (
                      <>
                        <Field label="Descrição">
                          <Input
                            name="description"
                            placeholder={
                              isIncome
                                ? 'Ex.: Serviço de consultoria'
                                : 'Ex.: Assinatura de software'
                            }
                            minLength={2}
                            maxLength={200}
                            required
                            className="h-11"
                          />
                        </Field>
                        <Field label="Categoria">
                          <select
                            name="category_id"
                            className="wr-native-select"
                            defaultValue=""
                            required
                          >
                            <option value="" disabled>
                              Selecione uma categoria
                            </option>
                            {data.categories
                              .filter((category) => category.type === editor.type)
                              .map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                          </select>
                        </Field>
                      </>
                    )}
                    <Field label="Conta">
                      {accountSelect(
                        'account_id',
                        editor.kind === 'settlement' ? editor.record.account_id : undefined,
                      )}
                    </Field>
                    {editor.kind === 'transaction' && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {dateField('competence_date', 'Competência')}
                          {dateField('due_date', 'Vencimento')}
                        </div>
                        <Field label="Situação">
                          <select
                            className="wr-native-select"
                            value={status}
                            onChange={(event) =>
                              setStatus(event.target.value as 'paid' | 'pending')
                            }
                          >
                            <option value="pending">{isIncome ? 'A receber' : 'A pagar'}</option>
                            <option value="paid">{isIncome ? 'Já recebido' : 'Já pago'}</option>
                          </select>
                        </Field>
                      </>
                    )}
                    {(editor.kind === 'settlement' || status === 'paid') &&
                      dateField(
                        'paid_at',
                        isIncome ? 'Data do recebimento' : 'Data do pagamento',
                        true,
                      )}
                    <Field label="Forma de pagamento">
                      {paymentSelect(
                        editor.kind === 'settlement' ? editor.record.payment_method : 'pix',
                      )}
                    </Field>
                    {editor.kind === 'transaction' && data.clients.length > 0 && (
                      <Field label="Cliente (opcional)">
                        <select name="client_id" className="wr-native-select">
                          <option value="">Sem cliente</option>
                          {data.clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {editor.kind === 'transaction' && (
                      <label className="flex items-center gap-3 text-sm">
                        <input type="checkbox" name="is_fixed" className="size-4 accent-primary" />
                        Valor fixo{' '}
                        <span className="text-xs text-muted-foreground">
                          (sem repetição automática)
                        </span>
                      </label>
                    )}
                  </>
                )}
                {editor.kind !== 'settlement' && (
                  <Field label="Observações (opcional)">
                    <textarea
                      name="notes"
                      maxLength={5000}
                      rows={3}
                      className="w-full rounded-xl border border-input bg-transparent p-3 text-sm"
                    />
                  </Field>
                )}
              </>
            )}
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-xl bg-negative/10 p-3 text-sm leading-6 text-negative"
            >
              {error}
            </p>
          )}
          <div className="flex justify-end gap-3 border-t border-border pt-5">
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Salvando…' : editor.kind === 'settlement' ? 'Confirmar baixa' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
