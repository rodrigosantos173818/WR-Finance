'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { Check, CreditCard, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/financial/confirm-dialog';
import { PageHeader } from '@/components/financial/primitives';
import { billingDate, statusLabels, trialMessage } from '@/billing/presentation';
import { useSubscription } from './subscription-provider';
import { cancelSubscription, manageSubscription, startCheckout } from './actions';

export function BillingPage({
  configured,
  checkout,
  returnCompany,
}: {
  configured: boolean;
  checkout?: string;
  returnCompany?: string;
}) {
  const access = useSubscription();
  const refresh = access.refresh;
  const [busy, startTransition] = useTransition();
  const inFlight = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [confirm, setConfirm] = useState(false);
  const waitingForPayment =
    checkout === 'success' && returnCompany === access.organizationId && !access.isActive;
  useEffect(() => {
    if (!waitingForPayment) return;
    let count = 0;
    const timer = window.setInterval(() => {
      if (++count > 12) window.clearInterval(timer);
      else void refresh();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [waitingForPayment, refresh]);
  function perform(kind: 'checkout' | 'portal' | 'cancel') {
    if (inFlight.current) return;
    inFlight.current = true;
    setError('');
    setMessage('');
    startTransition(async () => {
      try {
        if (kind === 'cancel') {
          const result = await cancelSubscription();
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setConfirm(false);
          setMessage('Cancelamento confirmado. Você mantém o acesso até o fim do período pago.');
          await access.refresh();
        } else {
          const result = await (kind === 'checkout' ? startCheckout() : manageSubscription());
          if (!result.ok) {
            setError(result.error);
            return;
          }
          window.location.assign(result.data);
        }
      } catch {
        setError('Não foi possível concluir a solicitação. Tente novamente em instantes.');
      } finally {
        inFlight.current = false;
      }
    });
  }
  const features = [
    'Dashboard financeiro',
    'Entradas e despesas',
    'Contas a pagar e a receber',
    'Transferências',
    'Gestão de contas',
    'Histórico financeiro',
    'Atualizações futuras',
  ];
  return (
    <>
      <PageHeader
        title="Assinatura"
        description="Seu plano, seu período gratuito e suas próximas cobranças."
      >
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => startTransition(() => access.refresh())}
        >
          <RefreshCw className={`size-4 ${busy ? 'animate-spin' : ''}`} />
          Atualizar status
        </Button>
      </PageHeader>
      {checkout === 'success' && returnCompany === access.organizationId && access.isActive && (
        <section
          className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-5"
          aria-label="Pagamento confirmado"
        >
          <h2 className="font-semibold text-primary">Bem-vindo ao WR Finance Pro!</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua assinatura está ativa e todas as funcionalidades foram liberadas.
          </p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Ir para o Dashboard</Link>
          </Button>
        </section>
      )}
      {waitingForPayment && (
        <p role="status" className="mb-6 rounded-xl border border-border p-4 text-sm leading-6">
          Estamos aguardando a confirmação do pagamento. O acesso será atualizado automaticamente
          quando ela chegar. Você pode continuar consultando seus dados.
        </p>
      )}
      {checkout === 'success' && returnCompany !== access.organizationId && (
        <p className="mb-6 text-sm text-muted-foreground">
          O retorno do checkout pertence a outra empresa. Selecione a empresa correspondente no menu
          do usuário para consultar sua assinatura.
        </p>
      )}
      {checkout === 'canceled' && (
        <p className="mb-6 text-sm text-muted-foreground">
          O checkout foi fechado. Nenhuma alteração de plano foi feita por esta página.
        </p>
      )}
      {error && (
        <p role="alert" className="mb-5 rounded-xl bg-negative/10 p-4 text-sm text-negative">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mb-5 rounded-xl bg-positive/10 p-4 text-sm text-positive">
          {message}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className="wr-section p-6 sm:p-8" aria-labelledby="plan-title">
          <div className="mb-5 flex items-center justify-between gap-3">
            <h2 id="plan-title" className="text-xl font-semibold">
              WR Finance Pro
            </h2>
            <CreditCard className="size-5 text-primary" />
          </div>
          <p className="text-4xl font-semibold tracking-tight">
            R$ 19,90 <span className="text-sm font-normal text-muted-foreground">/ mês</span>
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            30 dias para experimentar. Sem cartão para começar.
          </p>
          <ul className="my-6 space-y-3">
            {features.map((feature) => (
              <li key={feature} className="flex gap-3 text-sm">
                <Check className="size-4 shrink-0 text-primary" />
                {feature}
              </li>
            ))}
          </ul>
          <p className="mb-6 text-xs leading-5 text-muted-foreground">
            Gestão de clientes, gestão de categorias e relatórios: páginas dedicadas previstas nas
            próximas atualizações do Pro.
          </p>
          {access.canManage ? (
            <div className="space-y-3">
              <Button
                className="w-full whitespace-normal"
                disabled={busy || !access.available}
                onClick={() =>
                  perform(
                    access.hasProviderSubscription && !access.isExpired ? 'portal' : 'checkout',
                  )
                }
              >
                {busy
                  ? 'Aguarde…'
                  : access.hasProviderSubscription && !access.isExpired
                    ? 'Gerenciar assinatura'
                    : 'Assinar por R$ 19,90/mês'}
              </Button>
              {!access.hasProviderSubscription && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Ao confirmar a assinatura no checkout, a cobrança mensal começa imediatamente. O
                  teste gratuito não é cobrado automaticamente.
                </p>
              )}
              {!configured && (
                <p className="text-xs leading-5 text-muted-foreground">
                  A contratação online ainda não está disponível. Seu período gratuito e seus dados
                  permanecem preservados.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-xl bg-muted p-4 text-sm leading-6 text-muted-foreground">
              Somente o proprietário da empresa pode contratar e gerenciar a assinatura.
            </p>
          )}
        </section>
        <section className="wr-section p-6 sm:p-8" aria-labelledby="billing-status-title">
          <h2 id="billing-status-title" className="mb-6 flex items-center gap-3 font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            Sua assinatura
          </h2>
          <p
            className={`mb-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${access.canWrite ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}
          >
            {access.available ? statusLabels[access.status] : 'Status indisponível'}
          </p>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">{trialMessage(access)}</p>
          <dl className="space-y-4 text-sm">
            {[
              ['Plano', access.plan.name],
              ['Preço', 'R$ 19,90 / mês'],
              ['Data de início', billingDate(access.createdAt)],
              ['Início do teste', billingDate(access.trialStartedAt)],
              ['Fim do período gratuito', billingDate(access.trialEndsAt)],
              ...(access.isTrial
                ? [
                    [
                      'Tempo restante',
                      `${access.daysRemaining} ${access.daysRemaining === 1 ? 'dia' : 'dias'}`,
                    ],
                  ]
                : []),
              [
                access.status === 'canceled' || access.cancelAtPeriodEnd
                  ? 'Acesso pago até'
                  : 'Próxima renovação',
                billingDate(access.currentPeriodEnd),
              ],
            ].map(([label, value]) => (
              <div
                key={label}
                className="flex flex-wrap justify-between gap-2 border-b border-border pb-4"
              >
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-xs leading-5 text-muted-foreground">
            Forma de pagamento e histórico de cobrança estarão disponíveis aqui em uma próxima
            atualização. Assinantes podem consultar esses dados em Gerenciar assinatura.
          </p>
          {access.canManage &&
            access.hasProviderSubscription &&
            access.canWrite &&
            access.status !== 'canceled' && (
              <Button
                variant="outline"
                className="mt-6"
                disabled={busy}
                onClick={() => setConfirm(true)}
              >
                Cancelar assinatura
              </Button>
            )}
        </section>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={(open) => {
          if (!busy) setConfirm(open);
        }}
        title="Cancelar assinatura?"
        description="Tem certeza que deseja cancelar sua assinatura? Você continuará tendo acesso ao WR Finance Pro até o final do período já pago. Seus dados não serão excluídos."
        onConfirm={() => perform('cancel')}
        busy={busy}
      />
    </>
  );
}
