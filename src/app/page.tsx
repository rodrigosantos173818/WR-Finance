import type { Metadata } from 'next';
import Link from 'next/link';
import {
	ArrowRight,
	BarChart3,
	Check,
	LayoutDashboard,
	ShieldCheck,
	Wallet,
} from 'lucide-react';
import { Logo } from '@/design-system';

export const metadata: Metadata = {
	title: 'Controle financeiro para empresas',
	description: 'Organize entradas, despesas e decisões financeiras em um só lugar.',
};

const features = [
	{
		icon: LayoutDashboard,
		title: 'Visão que orienta',
		description: 'Acompanhe saldo, receitas e despesas sem perder tempo procurando números.',
	},
	{
		icon: Wallet,
		title: 'Rotina organizada',
		description: 'Registre movimentações, contas e categorias com clareza e consistência.',
	},
	{
		icon: BarChart3,
		title: 'Decisões melhores',
		description: 'Transforme o histórico financeiro em uma leitura simples do seu negócio.',
	},
];

export default function Home() {
	return (
		<main className="min-h-dvh overflow-hidden bg-[var(--background)] text-foreground">
			<header className="relative z-10 border-b border-border/70">
				<div className="mx-auto flex h-[76px] max-w-[1240px] items-center justify-between px-5 sm:px-8">
					<Link href="/" aria-label="WR Finance, início">
						<Logo />
					</Link>
					<nav className="flex items-center gap-3" aria-label="Acesso">
						<Link
							href="/login"
							className="inline-flex px-2 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:px-3"
						>
							Entrar
						</Link>
						<Link
							href="/cadastro"
							className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
						>
							Criar conta
						</Link>
					</nav>
				</div>
			</header>

			<section className="relative border-b border-border/70">
				<div className="pointer-events-none absolute inset-0 bg-[image:var(--wr-background-glow)] opacity-80" />
				<div className="relative mx-auto grid max-w-[1240px] items-center gap-14 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:gap-20 lg:py-28">
					<div>
						<p className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
							<span className="size-1.5 rounded-full bg-primary" />
							Seu negócio em perspectiva
						</p>
						<h1 className="max-w-3xl text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
							Clareza financeira para fazer seu negócio avançar.
						</h1>
						<p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
							O WR Finance reúne suas entradas, despesas e decisões em uma visão simples, prática e
							feita para a rotina da sua empresa.
						</p>
						<div className="mt-8 flex flex-col gap-3 sm:flex-row">
							<Link
								href="/cadastro"
								className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
							>
								Começar gratuitamente
								<ArrowRight className="size-4" />
							</Link>
							<Link
								href="#visao"
								className="inline-flex min-h-12 items-center justify-center rounded-lg border border-border px-5 text-sm font-semibold transition-colors hover:bg-accent"
							>
								Conhecer o WR Finance
							</Link>
						</div>
						<p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
							<ShieldCheck className="size-4 text-primary" />
							30 dias para experimentar. Sem cartão para começar.
						</p>
					</div>

					<div className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
						<div className="absolute -inset-5 rounded-[28px] border border-primary/10 bg-primary/5 blur-2xl" />
						<div className="relative overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
							<div className="flex items-center justify-between border-b border-border px-5 py-4">
								<div>
									<p className="text-xs text-muted-foreground">Visão geral</p>
									<p className="mt-1 font-semibold">Saúde financeira</p>
								</div>
								<span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
									Este mês
								</span>
							</div>
							<div className="grid grid-cols-2 gap-3 p-5">
								<div className="rounded-xl border border-border bg-background p-4">
									<p className="text-xs text-muted-foreground">Saldo atual</p>
									<p className="mt-2 text-xl font-semibold">R$ 42.580</p>
									<p className="mt-2 text-xs text-primary">+12,8% no período</p>
								</div>
								<div className="rounded-xl border border-border bg-background p-4">
									<p className="text-xs text-muted-foreground">Resultado</p>
									<p className="mt-2 text-xl font-semibold">R$ 8.240</p>
									<p className="mt-2 text-xs text-primary">Mês positivo</p>
								</div>
							</div>
							<div className="px-5 pb-6">
								<div className="flex h-36 items-end gap-2 rounded-xl border border-border bg-background px-5 pb-4 pt-5">
									{[32, 48, 42, 68, 55, 78, 92, 70, 84, 100].map((height, index) => (
										<span
											key={index}
											className="flex-1 rounded-t-md bg-primary/70"
											style={{ height: `${height}%` }}
										/>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section id="visao" className="mx-auto max-w-[1240px] px-5 py-16 sm:px-8 sm:py-24">
				<div className="max-w-2xl">
					<p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">Mais controle</p>
					<h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
						Menos improviso. Mais direção.
					</h2>
					<p className="mt-4 text-base leading-7 text-muted-foreground">
						Uma base financeira confiável muda a qualidade das decisões que você toma todos os dias.
					</p>
				</div>
				<div className="mt-12 grid gap-5 md:grid-cols-3">
					{features.map(({ icon: Icon, title, description }) => (
						<article key={title} className="border-t border-border pt-5">
							<Icon className="size-5 text-primary" />
							<h3 className="mt-5 text-lg font-semibold">{title}</h3>
							<p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
						</article>
					))}
				</div>
			</section>

			<section className="border-y border-border bg-card/60">
				<div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1fr_auto] lg:items-center">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[.16em] text-primary">WR Finance Pro</p>
						<h2 className="mt-3 text-3xl font-semibold tracking-tight">Sua empresa merece uma visão clara.</h2>
						<ul className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
							{['Dashboard financeiro', 'Entradas e despesas', 'Contas e transferências', 'Gestão organizada'].map(
								(item) => (
									<li key={item} className="flex items-center gap-2">
										<Check className="size-4 text-primary" />
										{item}
									</li>
								),
							)}
						</ul>
					</div>
					<div className="lg:min-w-[260px]">
						<p className="text-3xl font-semibold">R$ 19,90 <span className="text-sm font-normal text-muted-foreground">/mês</span></p>
						<p className="mt-2 text-sm text-muted-foreground">30 dias grátis para começar.</p>
						<Link
							href="/cadastro"
							className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
						>
							Criar minha conta
							<ArrowRight className="size-4" />
						</Link>
					</div>
				</div>
			</section>

			<footer className="mx-auto flex max-w-[1240px] flex-col gap-3 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
				<Logo />
				<span>Controle financeiro feito para empresas que querem avançar.</span>
			</footer>
		</main>
	);
}
