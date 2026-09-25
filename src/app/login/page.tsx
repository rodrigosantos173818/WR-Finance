import { AuthShell } from '@/features/auth/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { getSupabaseEnv } from '@/lib/supabase/env';
export const metadata={title:'Entrar'};
export default async function Login({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}) {
  const params=await searchParams;
  return <AuthShell title="Bom ter você por aqui." description="Entre para acompanhar o financeiro da sua empresa." configured={Boolean(getSupabaseEnv())}>{params.error&&<p role="alert" className="mb-5 text-sm text-negative">O link expirou ou não é válido. Solicite um novo link.</p>}{params.updated&&<p role="status" className="mb-5 text-sm text-positive">Senha atualizada. Entre com a nova senha.</p>}<AuthForm mode="login" configured={Boolean(getSupabaseEnv())}/></AuthShell>;
}
