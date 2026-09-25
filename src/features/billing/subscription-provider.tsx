'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { refreshSubscription } from './actions';
import type { SubscriptionAccess } from '@/billing/types';

type SubscriptionContext = SubscriptionAccess & {
  refresh: () => Promise<void>;
  requestWrite: (operation: () => void) => void;
  openUpgrade: () => void;
};
const Context = createContext<SubscriptionContext | null>(null);
export function useSubscription() {
  const context = useContext(Context);
  if (!context) throw new Error('SubscriptionProvider is missing');
  return context;
}
export function SubscriptionProvider({
  initial,
  children,
}: {
  initial: SubscriptionAccess;
  children: React.ReactNode;
}) {
  const [latest, setLatest] = useState<SubscriptionAccess | null>(null);
  const [open, setOpen] = useState(false);
  const inFlight = useRef(false);
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const access =
    latest &&
    latest.organizationId === initial.organizationId &&
    (!initial.available ||
      !latest.available ||
      Date.parse(latest.serverNow ?? '') >= Date.parse(initial.serverNow ?? ''))
      ? latest
      : initial;
  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setLatest(await refreshSubscription());
    } catch {
      /* The next mutation still checks the server and database; reads remain available. */
    } finally {
      inFlight.current = false;
    }
  }, []);
  useEffect(() => {
    if (previousPath.current !== pathname) {
      previousPath.current = pathname;
      void refresh();
    }
  }, [pathname, refresh]);
  useEffect(() => {
    const focus = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', focus);
    // A timer only requests a fresh server decision; it never grants access locally.
    const end = access.isTrial
      ? access.trialEndsAt
      : access.canWrite
        ? access.currentPeriodEnd
        : null;
    const remaining =
      end && access.serverNow ? Date.parse(end) - Date.parse(access.serverNow) : 60000;
    const interval = window.setInterval(focus, 60000);
    const timer = end
      ? window.setTimeout(focus, Math.max(1000, Math.min(60000, remaining)))
      : undefined;
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', focus);
    };
  }, [
    access.serverNow,
    access.isTrial,
    access.canWrite,
    access.trialEndsAt,
    access.currentPeriodEnd,
    refresh,
  ]);
  function openUpgrade() {
    setOpen(true);
  }
  return (
    <Context.Provider
      value={{
        ...access,
        refresh,
        openUpgrade,
        requestWrite: (operation) =>
          access.available && access.canWrite ? operation() : openUpgrade(),
      }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {access.available
                ? 'Continue usando o WR Finance'
                : 'Não foi possível verificar sua assinatura'}
            </DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              {access.available ? (
                <>
                  {access.status === 'past_due'
                    ? 'Há um problema com o pagamento da sua assinatura.'
                    : access.currentPeriodEnd
                      ? 'Seu período pago terminou.'
                      : 'Seu período gratuito de 30 dias terminou.'}{' '}
                  Seus dados continuam seguros e disponíveis para consulta. Assine o WR Finance Pro
                  para voltar a cadastrar e gerenciar suas movimentações.
                </>
              ) : (
                'Seus dados continuam disponíveis para consulta. Tente atualizar o status antes de realizar alterações.'
              )}
            </DialogDescription>
          </DialogHeader>
          {access.available && (
            <p className="py-3 text-3xl font-semibold">
              R$ 19,90<span className="text-sm font-normal text-muted-foreground">/mês</span>
            </p>
          )}
          {!access.canManage && (
            <p className="text-sm text-muted-foreground">
              Peça ao proprietário da empresa para gerenciar a assinatura.
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Agora não
            </Button>
            {access.available ? (
              <Button asChild>
                <Link href="/configuracoes/assinatura" onClick={() => setOpen(false)}>
                  {access.canManage ? 'Assinar WR Finance Pro' : 'Ver assinatura'}
                </Link>
              </Button>
            ) : (
              <Button
                onClick={async () => {
                  await refresh();
                  setOpen(false);
                }}
              >
                Atualizar status
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Context.Provider>
  );
}
