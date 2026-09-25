import { Building2, ShieldCheck, UserRound } from 'lucide-react';
import { PageHeader } from '@/components/financial/primitives';
import { ThemeToggle } from '@/components/theme-toggle';
import { AuthForm } from '@/features/auth/auth-form';
import { requireOrganization } from '@/services/session';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getSubscriptionAccess } from '@/billing/subscription-service';
import { statusLabels } from '@/billing/presentation';

export const metadata = { title: 'Configurações' };

export default async function SettingsPage() {
  const { user, organization } = await requireOrganization();
  const subscription = await getSubscriptionAccess();
  const roles = { owner: 'Proprietário', admin: 'Administrador', member: 'Membro' };
  return (
    <>
      <PageHeader
        title="Configurações"
        description="Seu acesso, sua empresa e suas preferências."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <section className="wr-section flex flex-wrap items-center justify-between gap-4 p-6 xl:col-span-2">
          <div>
            <h2 className="font-semibold">Assinatura</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              WR Finance Pro · R$ 19,90/mês ·{' '}
              {subscription.available ? statusLabels[subscription.status] : 'Verificar status'}
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/configuracoes/assinatura">Ver minha assinatura</Link>
          </Button>
        </section>
        <section className="wr-section space-y-6 p-6">
          <h2 className="flex items-center gap-3 font-semibold">
            <Building2 className="size-5 text-primary" />
            Empresa atual
          </h2>
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="mt-1 font-medium">{organization.name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Seu perfil de acesso</dt>
              <dd className="mt-1">{roles[organization.role]}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Moeda e fuso horário</dt>
              <dd className="mt-1">Real brasileiro (BRL) · São Paulo</dd>
            </div>
          </dl>
          <p className="flex gap-3 border-t border-border pt-5 text-sm leading-6 text-muted-foreground">
            <ShieldCheck className="mt-1 size-5 shrink-0 text-primary" />
            Os dados financeiros pertencem à empresa selecionada. Use o menu do usuário para
            alternar entre suas empresas.
          </p>
        </section>
        <section className="wr-section space-y-6 p-6">
          <h2 className="flex items-center gap-3 font-semibold">
            <UserRound className="size-5 text-primary" />
            Minha conta
          </h2>
          <dl className="space-y-5 text-sm">
            <div>
              <dt className="text-muted-foreground">Nome</dt>
              <dd className="mt-1 break-words">
                {typeof user.user_metadata.full_name === 'string'
                  ? user.user_metadata.full_name
                  : 'Minha conta'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">E-mail</dt>
              <dd className="mt-1 break-all">{user.email}</dd>
            </div>
          </dl>
          <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
            <div>
              <h3 className="text-sm font-medium">Aparência</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Alterne entre os temas claro e escuro.
              </p>
            </div>
            <ThemeToggle />
          </div>
        </section>
        <section className="wr-section p-6 xl:col-span-2">
          <div className="max-w-lg">
            <h2 className="font-semibold">Adicionar outra empresa</h2>
            <p className="mb-6 mt-2 text-sm leading-6 text-muted-foreground">
              Crie um novo espaço com contas e movimentações próprias. Ao concluir, você será
              direcionado para a nova empresa. Novas empresas compartilham seu período gratuito
              original, sem reiniciar os 30 dias. Limite de 10 empresas criadas por usuário.
            </p>
            <AuthForm mode="organization" />
          </div>
        </section>
      </div>
    </>
  );
}
