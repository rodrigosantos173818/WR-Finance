import { z } from 'zod';
const decimal=z.string().regex(/^-?\d+(\.\d+)?$/);
export const organizationsSchema=z.array(z.object({id:z.uuid(),name:z.string(),role:z.enum(['owner','admin','member'])}));
export const recordSchema=z.object({id:z.uuid(),description:z.string(),amount:decimal,type:z.enum(['income','expense']),status:z.enum(['paid','pending','cancelled']),due_date:z.string(),paid_at:z.string().nullable(),account_id:z.uuid(),account:z.string(),category:z.string(),category_id:z.uuid(),client:z.string().nullable(),payment_method:z.enum(['pix','cash','bank_transfer','credit_card','debit_card','boleto','other']),notes:z.string().nullable()});
export const dashboardSchema=z.object({
  today:z.string(),
  summary:z.object({balance:decimal,income:decimal,expense:decimal,result:decimal,previous_income:decimal,previous_expense:decimal,receivable:decimal,payable:decimal,receivable_week:z.number(),payable_week:z.number(),receivable_overdue:z.number(),payable_overdue:z.number()}),
  accounts:z.array(z.object({id:z.uuid(),name:z.string(),type:z.enum(['bank','cash','pix','wallet','card','other']),balance:decimal,archived:z.boolean()})),
  expense_categories:z.array(z.object({id:z.uuid(),name:z.string(),color:z.string(),amount:decimal})),
  monthly:z.array(z.object({month:z.string(),income:decimal,expense:decimal})),
  recent:z.array(recordSchema),
  categories:z.array(z.object({id:z.uuid(),name:z.string(),type:z.enum(['income','expense']),color:z.string()})),
  clients:z.array(z.object({id:z.uuid(),name:z.string()}))
});
export const detailsSchema=z.object({items:z.array(recordSchema),count:z.number()});
export type DashboardData=z.infer<typeof dashboardSchema>;
export type FinancialRecord=z.infer<typeof recordSchema>;
export type Organization=z.infer<typeof organizationsSchema>[number];
