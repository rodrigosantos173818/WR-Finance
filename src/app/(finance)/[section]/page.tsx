import Link from 'next/link';
import { notFound } from 'next/navigation';

const sections = {
  'contas-receber': 'Contas a receber',
  'contas-pagar': 'Contas a pagar',
  transferencias: 'Transferências',
  contas: 'Contas',
  clientes: 'Clientes',
  categorias: 'Categorias',
  relatorios: 'Relatórios',
} as const;

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;
  const title = sections[section as keyof typeof sections];

  if (!title) notFound();

  return (
    <main id="main-content" className="wr-page">
      <div className="wr-section max-w-3xl p-8 sm:p-10">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[.13em] text-primary">
          Módulo financeiro
        </p>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
          Esta área está pronta para receber os lançamentos e controles de {title.toLowerCase()}.
        </p>
        <Link
          href="/dashboard"
          className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </main>
  );
}
