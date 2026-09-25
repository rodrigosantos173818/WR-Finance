import { AuthShell } from '@/features/auth/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { getSupabaseEnv } from '@/lib/supabase/env';

export const metadata = { title: 'Reenviar confirmação' };

export default function ResendConfirmation() {
  const configured = Boolean(getSupabaseEnv());
  return (
    <AuthShell
      title="Confirme seu e-mail."
      description="Informe o e-mail usado no cadastro para solicitar uma nova confirmação. Confira também a pasta de spam."
      configured={configured}
    >
      <AuthForm mode="resend" configured={configured} />
    </AuthShell>
  );
}
