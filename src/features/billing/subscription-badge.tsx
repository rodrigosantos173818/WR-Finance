'use client';
import Link from 'next/link';
import { useSubscription } from './subscription-provider';
import { statusLabels } from '@/billing/presentation';

export function SubscriptionBadge() {
  const access = useSubscription();
  return (
    <Link
      href="/configuracoes/assinatura"
      className="mx-2 block rounded-lg border border-border px-3 py-2 transition-colors hover:bg-accent"
      aria-label="Ver assinatura da empresa"
    >
      <span
        className={`block text-[10px] font-semibold tracking-[.1em] ${access.canWrite ? 'text-primary' : 'text-warning'}`}
      >
        {!access.available
          ? 'ASSINATURA'
          : access.isTrial
            ? 'PRO · TESTE GRÁTIS'
            : access.isExpired
              ? 'PLANO EXPIRADO'
              : 'WR FINANCE PRO'}
      </span>
      <span className="mt-1 block text-xs text-muted-foreground">
        {!access.available
          ? 'Verificar status'
          : access.isTrial
            ? `${access.daysRemaining} ${access.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`
            : access.isActive
              ? 'Plano ativo'
              : statusLabels[access.status]}
      </span>
    </Link>
  );
}
