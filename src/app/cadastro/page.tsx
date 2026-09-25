import { AuthShell } from '@/features/auth/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { getSupabaseEnv } from '@/lib/supabase/env';
export const metadata={title:'Criar acesso'};
export default function Signup(){return <AuthShell title="Vamos começar?" description="Crie seu acesso. Depois, organize o espaço da sua empresa." configured={Boolean(getSupabaseEnv())}><AuthForm mode="signup" configured={Boolean(getSupabaseEnv())}/></AuthShell>;}
