'use client';
import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowRight, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  signIn,
  signUp,
  forgotPassword,
  resetPassword,
  createOrganization,
  resendConfirmation,
} from './actions';
type Mode = 'login' | 'signup' | 'forgot' | 'reset' | 'organization' | 'resend';
const actions = {
  login: signIn,
  signup: signUp,
  forgot: forgotPassword,
  reset: resetPassword,
  organization: createOrganization,
  resend: resendConfirmation,
};
const labels = {
  login: 'Entrar no WR Finance',
  signup: 'Criar meu acesso',
  forgot: 'Enviar link de recuperação',
  reset: 'Salvar nova senha',
  organization: 'Criar minha empresa',
  resend: 'Reenviar confirmação',
};
export function AuthForm({ mode, configured = true }: { mode: Mode; configured?: boolean }) {
  const [state, action, pending] = useActionState(actions[mode], {});
  return (
    <form action={action} className="space-y-6">
      <fieldset disabled={!configured || pending} className="space-y-5 disabled:opacity-60">
        {(mode === 'signup' || mode === 'organization') && (
          <div className="space-y-2">
            <Label htmlFor="name">{mode === 'organization' ? 'Nome da empresa' : 'Seu nome'}</Label>
            <Input
              id="name"
              name="name"
              placeholder={mode === 'organization' ? 'Ex.: WR Tech' : 'Como podemos chamar você?'}
              required
              minLength={2}
              maxLength={100}
              autoComplete={mode === 'organization' ? 'organization' : 'name'}
              className="h-12"
            />
          </div>
        )}
        {!['reset', 'organization'].includes(mode) && (
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="voce@empresa.com.br"
              required
              maxLength={254}
              className="h-12"
            />
          </div>
        )}
        {['login', 'signup', 'reset'].includes(mode) && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="password">{mode === 'reset' ? 'Nova senha' : 'Senha'}</Label>
              {mode === 'login' && (
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Esqueci minha senha
                </Link>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder={mode === 'login' ? 'Sua senha' : 'Pelo menos 10 caracteres'}
              minLength={mode === 'login' ? undefined : 10}
              maxLength={128}
              required
              className="h-12"
            />
          </div>
        )}
        {mode === 'reset' && (
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={10}
              maxLength={128}
              className="h-12"
            />
          </div>
        )}
        <Button
          type="submit"
          className="h-12 w-full gap-2 text-sm"
          disabled={pending || !configured}
        >
          {pending ? <LoaderCircle className="size-4 animate-spin" /> : null}
          {pending ? 'Aguarde...' : labels[mode]}
          {!pending && <ArrowRight className="size-4" />}
        </Button>
      </fieldset>
      {state.error && (
        <p role="alert" className="rounded-xl bg-negative/10 p-4 text-sm text-negative">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="rounded-xl bg-positive/10 p-4 text-sm leading-6 text-positive">
          {state.success}
        </p>
      )}
      {mode === 'login' && (
        <p className="text-center text-sm text-muted-foreground">
          Primeiro acesso?{' '}
          <Link href="/cadastro" className="font-medium text-primary hover:underline">
            Crie sua conta
          </Link>
        </p>
      )}
      {['login', 'signup'].includes(mode) && (
        <p className="text-center text-sm text-muted-foreground">
          Não recebeu o e-mail?{' '}
          <Link href="/reenviar-confirmacao" className="font-medium text-primary hover:underline">
            Reenviar confirmação
          </Link>
        </p>
      )}
      {['signup', 'forgot', 'reset', 'resend'].includes(mode) && (
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/login" className="hover:text-foreground">
            Voltar para entrar
          </Link>
        </p>
      )}
    </form>
  );
}
