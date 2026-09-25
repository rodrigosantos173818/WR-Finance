'use client';
import { useTransition } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ErrorBoundary({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <section className="wr-section flex flex-col items-center gap-5 p-10 text-center">
      <AlertCircle className="size-9 text-warning" />
      <h1 className="text-2xl font-semibold">Não foi possível carregar os dados.</h1>
      <p className="max-w-md text-sm leading-6 text-muted-foreground">
        Verifique a conexão e tente novamente. Se for o primeiro acesso, confirme se as migrações do
        Supabase foram aplicadas.
      </p>
      <Button disabled={pending} onClick={() => startTransition(() => retry())}>
        {pending ? 'Tentando novamente…' : 'Tentar novamente'}
      </Button>
    </section>
  );
}
