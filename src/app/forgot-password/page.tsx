import { AuthShell } from '@/features/auth/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { getSupabaseEnv } from '@/lib/supabase/env';
export const metadata={title:'Recuperar senha'};
export default function Forgot(){return <AuthShell title="Vamos recuperar seu acesso." description="Informe seu e-mail para receber um link de redefinição de senha." configured={Boolean(getSupabaseEnv())}><AuthForm mode="forgot" configured={Boolean(getSupabaseEnv())}/></AuthShell>;}
