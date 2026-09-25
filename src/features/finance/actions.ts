'use server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireOrganization } from '@/services/session';
import { requireFinancialWrite } from '@/billing/subscription-service';
import {
  accountSchema,
  transactionSchema,
  settlementSchema,
  transferSchema,
  dateSchema,
  type AccountInput,
  type TransactionInput,
  type SettlementInput,
  type TransferInput,
} from '@/validations/finance';
import { detailsSchema, type FinancialRecord } from '@/validations/dashboard';
import type { ActionResult } from '@/types/actions';
function databaseError(code: string) {
  return code === '23505'
    ? 'Já existe um registro com esses dados.'
    : code === '23503'
      ? 'Selecione uma conta, categoria e cliente desta empresa.'
      : code === '42501'
        ? 'Você não tem permissão para esta operação.'
        : code === '22023'
          ? 'Confira o valor, a data e a situação do lançamento. A efetivação deve estar entre a abertura da conta e hoje.'
          : 'Não foi possível salvar. Confira os campos e tente novamente.';
}
function revalidateFinance() {
  for (const path of ['/dashboard', '/entradas', '/despesas']) revalidatePath(path);
}
function writeError(error: { code: string; message: string }): ActionResult<never> {
  if (error.message.includes('SUBSCRIPTION_REQUIRED'))
    return {
      ok: false,
      code: 'SUBSCRIPTION_REQUIRED',
      error: 'Sua empresa está em modo somente leitura. Assine o WR Finance Pro para continuar.',
    };
  return { ok: false, error: databaseError(error.code) };
}
export async function saveAccount(input: AccountInput): Promise<ActionResult<string>> {
  const { supabase, organization } = await requireOrganization();
  const denied = await requireFinancialWrite();
  if (denied) return denied;
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'Confira o nome, o tipo, o saldo inicial e a data de abertura.' };
  const d = parsed.data;
  const { data, error } = await supabase.rpc('create_account', {
    p_org: organization.id,
    p_name: d.name,
    p_type: d.type,
    p_opening_balance: d.opening_balance,
    p_opening_date: d.opening_date,
  });
  if (error) return writeError(error);
  revalidateFinance();
  return { ok: true, data };
}
export async function saveTransaction(input: TransactionInput): Promise<ActionResult<string>> {
  const { supabase, organization } = await requireOrganization();
  const denied = await requireFinancialWrite();
  if (denied) return denied;
  const parsed = transactionSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      error: 'Confira os campos obrigatórios, o valor e as datas do lançamento.',
    };
  const d = parsed.data;
  const { data, error } = await supabase.rpc('create_transaction', {
    p_org: organization.id,
    p_account: d.account_id,
    p_category: d.category_id,
    p_client: d.client_id,
    p_type: d.type,
    p_description: d.description,
    p_amount: d.amount,
    p_competence_date: d.competence_date,
    p_due_date: d.due_date,
    p_paid_at: d.paid_at,
    p_status: d.status,
    p_payment_method: d.payment_method,
    p_is_fixed: d.is_fixed,
    p_notes: d.notes,
  });
  if (error) return writeError(error);
  revalidateFinance();
  return { ok: true, data };
}
export async function settleTransaction(input: SettlementInput): Promise<ActionResult> {
  const { supabase, organization } = await requireOrganization();
  const denied = await requireFinancialWrite();
  if (denied) return denied;
  const parsed = settlementSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'Confira a conta, a data e a forma de pagamento.' };
  const d = parsed.data;
  const { error } = await supabase.rpc('settle_transaction', {
    p_org: organization.id,
    p_transaction: d.id,
    p_account: d.account_id,
    p_paid_at: d.paid_at,
    p_payment_method: d.payment_method,
  });
  if (error) return writeError(error);
  revalidateFinance();
  return { ok: true, data: undefined };
}
export async function saveTransfer(input: TransferInput): Promise<ActionResult<string>> {
  const { supabase, organization } = await requireOrganization();
  const denied = await requireFinancialWrite();
  if (denied) return denied;
  const parsed = transferSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: 'Escolha contas diferentes e confira o valor e a data.' };
  const d = parsed.data;
  const { data, error } = await supabase.rpc('create_transfer', {
    p_org: organization.id,
    p_from: d.from,
    p_to: d.to,
    p_amount: d.amount,
    p_date: d.date,
    p_notes: d.notes,
  });
  if (error) return writeError(error);
  revalidateFinance();
  return { ok: true, data };
}
export async function getDetails(input: {
  start: string;
  end: string;
  type?: 'income' | 'expense';
  category?: string;
  pending?: boolean;
  offset?: number;
}): Promise<ActionResult<{ items: FinancialRecord[]; count: number }>> {
  const { supabase, organization } = await requireOrganization();
  const parsed = z
    .object({
      start: dateSchema,
      end: dateSchema,
      type: z.enum(['income', 'expense']).optional(),
      category: z.uuid().optional(),
      pending: z.boolean().optional(),
      offset: z.number().int().min(0).max(2147483647).default(0),
    })
    .refine(
      (value) =>
        value.start <= value.end &&
        (Date.parse(value.end) - Date.parse(value.start)) / 86400000 <= 3660,
    )
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: 'Filtro inválido.' };
  const d = parsed.data;
  const { data, error } = await supabase.rpc('get_transaction_details', {
    p_org: organization.id,
    p_start: d.start,
    p_end: d.end,
    p_type: d.type || null,
    p_category: d.category || null,
    p_pending: d.pending || false,
    p_offset: d.offset,
  });
  if (error) return { ok: false, error: 'Não foi possível consultar os lançamentos.' };
  return { ok: true, data: detailsSchema.parse(data) };
}
