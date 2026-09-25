import { AuthShell } from '@/features/auth/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { requireUser } from '@/services/session';
export const metadata = { title: 'Sua empresa' };
export const dynamic = 'force-dynamic';
export default async function Onboarding() {
  await requireUser();
  return (
    <AuthShell
      title="Um espaço para sua empresa."
      description="Crie sua empresa e experimente o WR Finance Pro por 30 dias, sem cartão de crédito. As categorias iniciais serão organizadas para você."
    >
      <AuthForm mode="organization" />
    </AuthShell>
  );
}
