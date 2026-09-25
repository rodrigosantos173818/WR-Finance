import { z } from 'zod';
import { isDate } from '../utils/dates.ts';
export const dateSchema = z.string().refine(isDate, 'Data inválida.');
export const amountSchema = z
  .string()
  .regex(/^\d{1,12}\.\d{2}$/)
  .refine(
    (value) => /^\d{1,12}\.\d{2}$/.test(value) && BigInt(value.replace('.', '')) > 0n,
    'O valor deve ser positivo.',
  );
export const paymentSchema = z.enum([
  'pix',
  'cash',
  'bank_transfer',
  'credit_card',
  'debit_card',
  'boleto',
  'other',
]);
export const transactionSchema = z
  .object({
    account_id: z.uuid(),
    category_id: z.uuid(),
    client_id: z.uuid().nullable(),
    type: z.enum(['income', 'expense']),
    description: z.string().trim().min(2).max(200),
    amount: amountSchema,
    competence_date: dateSchema,
    due_date: dateSchema,
    paid_at: dateSchema.nullable(),
    status: z.enum(['pending', 'paid']),
    payment_method: paymentSchema,
    is_fixed: z.boolean(),
    notes: z.string().trim().max(5000).nullable(),
  })
  .refine(
    (value) => (value.status === 'paid' ? value.paid_at !== null : value.paid_at === null),
    'Confira a data de efetivação.',
  );
export const accountSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(['bank', 'cash', 'pix', 'wallet', 'card', 'other']),
  opening_balance: z.string().regex(/^-?\d{1,12}\.\d{2}$/),
  opening_date: dateSchema,
});
export const settlementSchema = z.object({
  id: z.uuid(),
  account_id: z.uuid(),
  paid_at: dateSchema,
  payment_method: paymentSchema,
});
export const transferSchema = z
  .object({
    from: z.uuid(),
    to: z.uuid(),
    amount: amountSchema,
    date: dateSchema,
    notes: z.string().max(5000).nullable(),
  })
  .refine((value) => value.from !== value.to, 'Escolha contas diferentes.');
export type TransactionInput = z.infer<typeof transactionSchema>;
export type AccountInput = z.infer<typeof accountSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
export type TransferInput = z.infer<typeof transferSchema>;
