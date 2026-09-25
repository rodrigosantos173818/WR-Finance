import { AuthShell } from '@/features/auth/auth-shell';
import { AuthForm } from '@/features/auth/auth-form';
import { requireUser } from '@/services/session';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Nova senha' };
export default async function Reset() {
  await requireUser();
  return (
    <AuthShell
      title="Defina uma nova senha."
      description="Escolha uma senha de pelo menos 10 caracteres que você ainda não utiliza em outros serviços."
    >
      <AuthForm mode="reset" />
    </AuthShell>
  );
}
