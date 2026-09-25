'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  ChevronDown,
  ChartNoAxesCombined,
  LayoutDashboard,
  LogOut,
  Menu,
  Receipt,
  Settings,
  Tag,
  Users,
  Wallet,
} from 'lucide-react';
import { Logo } from '@/design-system';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/theme-toggle';
import { SubscriptionBadge } from '@/features/billing/subscription-badge';
import { TrialBanner } from '@/features/billing/trial-banner';
import { signOut, switchOrganization } from '@/features/auth/actions';
import type { Organization } from '@/validations/dashboard';
const groups: {
  label: string;
  items: { name: string; href: string; icon: typeof Wallet; ready?: boolean }[];
}[] = [
  {
    label: 'VISÃO GERAL',
    items: [{ name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }],
  },
  {
    label: 'FINANCEIRO',
    items: [
      { name: 'Entradas', href: '/entradas', icon: ArrowUpRight },
      { name: 'Despesas', href: '/despesas', icon: ArrowDownRight },
      { name: 'Contas a receber', href: '/contas-receber', icon: Receipt },
      { name: 'Contas a pagar', href: '/contas-pagar', icon: Receipt },
      { name: 'Transferências', href: '/transferencias', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'GESTÃO',
    items: [
      { name: 'Contas', href: '/contas', icon: Wallet },
      { name: 'Clientes', href: '/clientes', icon: Users },
      { name: 'Categorias', href: '/categorias', icon: Tag },
    ],
  },
  {
    label: 'ANÁLISES',
    items: [{ name: 'Relatórios', href: '/relatorios', icon: ChartNoAxesCombined }],
  },
  {
    label: 'SISTEMA',
    items: [{ name: 'Configurações', href: '/configuracoes', icon: Settings }],
  },
];
export function AppShell({
  children,
  organization,
  organizations,
  user,
}: {
  children: React.ReactNode;
  organization: Organization;
  organizations: Organization[];
  user: { name: string; email: string };
}) {
  const pathname = usePathname(),
    [open, setOpen] = useState(false);
  const [changingSession, startSessionChange] = useTransition();
  const navigation = (
    <>
      <Link href="/dashboard" className="mb-8 block px-3">
        <Logo />
      </Link>
      <nav aria-label="Navegação principal" className="space-y-5">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-semibold tracking-[.13em] text-muted-foreground">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="wr-sidebar-link"
                aria-current={
                  pathname === item.href || pathname.startsWith(`${item.href}/`)
                    ? 'page'
                    : undefined
                }
                onClick={() => setOpen(false)}
              >
                <item.icon className="size-[18px]" />
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="mt-auto space-y-4 border-t border-border pt-5">
        <SubscriptionBadge />
        <div className="flex items-center gap-3 px-2">
          <span className="rounded-xl bg-primary/10 p-2 text-primary">
            <Building2 className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{organization.name}</p>
            <p className="text-xs text-muted-foreground">Empresa atual</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-2 pb-2">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">
            {user.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm">{user.name}</span>
          <form action={signOut}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Sair">
              <LogOut className="size-4" />
            </Button>
          </form>
        </div>
      </div>
    </>
  );
  return (
    <>
      <a
        href="#main-content"
        className="sr-only fixed left-4 top-4 z-[100] rounded-lg bg-primary p-3 text-primary-foreground focus:not-sr-only"
      >
        Pular para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[252px] flex-col gap-6 overflow-y-auto border-r border-border bg-[var(--wr-background-secondary)] px-4 pb-4 pt-7 lg:flex">
        {navigation}
      </aside>
      <div className="min-h-dvh bg-[image:var(--wr-background-glow)] lg:pl-[252px]">
        <header className="flex h-[76px] items-center justify-between gap-4 border-b border-border bg-[var(--wr-background-secondary)] px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[290px] gap-5 overflow-y-auto px-4 py-7 sm:max-w-[290px]"
              >
                <SheetHeader className="sr-only">
                  <SheetTitle>Navegação</SheetTitle>
                  <SheetDescription>Acesse o espaço da sua empresa.</SheetDescription>
                </SheetHeader>
                {navigation}
              </SheetContent>
            </Sheet>
            <Building2 className="hidden size-4 text-muted-foreground sm:block" />
            <span className="text-sm text-muted-foreground">{organization.name}</span>
            <span className="hidden text-muted-foreground sm:block">/</span>
            <span className="hidden text-sm sm:block">
              {groups
                .flatMap((group) => group.items)
                .find((item) => item.href === pathname || pathname.startsWith(`${item.href}/`))
                ?.name ?? 'Visão financeira'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-2"
                  aria-label="Menu do usuário"
                  disabled={changingSession}
                >
                  <span className="flex size-8 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-xs font-semibold text-primary">
                    {user.name.slice(0, 2).toUpperCase()}
                  </span>
                  <ChevronDown className="size-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="truncate">
                  {user.name}
                  <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                    {user.email}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {organizations.map((org) => (
                  <DropdownMenuItem
                    key={org.id}
                    disabled={changingSession}
                    onSelect={() => {
                      const form = new FormData();
                      form.set('organization', org.id);
                      startSessionChange(async () => {
                        await switchOrganization(form);
                      });
                    }}
                  >
                    {org.name}
                    {org.id === organization.id ? ' ✓' : ''}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/configuracoes">Configurações</Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={changingSession}
                  onSelect={() =>
                    startSessionChange(async () => {
                      await signOut();
                    })
                  }
                >
                  <LogOut className="size-4" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main-content" className="wr-page" tabIndex={-1}>
          <TrialBanner />
          {children}
        </main>
      </div>
    </>
  );
}
