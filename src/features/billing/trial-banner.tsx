'use client';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { billingDate, trialMessage } from '@/billing/presentation';
import { useSubscription } from './subscription-provider';

export function TrialBanner() {
  const access = useSubscription();
  const pathname = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  if (access.isActive || pathname.startsWith('/configuracoes/assinatura')) return null;
  const welcome = params.get('welcome') === '1' && access.isTrial;
  return (
    <aside
      aria-label="Status da assinatura"
      className={`mb-6 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 ${access.isTrial && access.daysRemaining > 7 ? 'border-primary/20 bg-primary/5' : 'border-warning/20 bg-warning/5'}`}
    >
      <ShieldCheck
        className={`size-4 shrink-0 ${access.canWrite ? 'text-primary' : 'text-warning'}`}
      />
      <p className="min-w-0 flex-1 basis-48 text-xs leading-5 sm:text-sm">
        {welcome
          ? access.trialStartedAt &&
            access.createdAt &&
            Math.abs(Date.parse(access.createdAt) - Date.parse(access.trialStartedAt)) < 1000
            ? 'Seu teste gratuito de 30 dias começou.'
            : 'Esta empresa compartilha seu período gratuito original.'
          : trialMessage(access)}
        {welcome && (
          <span className="block text-xs text-muted-foreground">
            Acesso completo até {billingDate(access.trialEndsAt)}. Sem cartão de crédito.
          </span>
        )}
      </p>
      {welcome && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            const next = new URLSearchParams(params);
            next.delete('welcome');
            router.replace(`${pathname}?${next}`, { scroll: false });
          }}
        >
          Começar
        </Button>
      )}
      <Button size="sm" variant="outline" asChild>
        <Link href="/configuracoes/assinatura">
          {!access.available
            ? 'Ver assinatura'
            : access.canManage
              ? access.isTrial
                ? 'Assinar agora'
                : 'Assinar WR Finance Pro'
              : 'Ver assinatura'}
        </Link>
      </Button>
    </aside>
  );
}
