import 'server-only';
import { requireOrganization } from '@/services/session';
import { dashboardSchema } from '@/validations/dashboard';
import type { DateRange } from '@/utils/dates';
export async function getDashboard(range:DateRange,chartMonths:number) {
  const {supabase,organization}=await requireOrganization();
  const {data,error}=await supabase.rpc('get_dashboard',{p_org:organization.id,p_start:range.start,p_end:range.end,p_chart_months:chartMonths});
  if(error) throw new Error('Não foi possível carregar o financeiro. Verifique a conexão e as migrações do banco.');
  return dashboardSchema.parse(data);
}
