'use server';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv, siteUrl } from '@/lib/supabase/env';
import { getMemberships, requireUser } from '@/services/session';
import { authErrorMessage, reportAuthError } from './errors';
export type AuthState = { error?: string; success?: string };
const emailSchema = z.email().max(254);
const passwordSchema = z.string().min(10).max(128);

export async function signIn(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseEnv())
    return { error: 'A conexão com o Supabase ainda precisa ser configurada.' };
  const email = emailSchema.safeParse(String(form.get('email')).trim());
  const password = String(form.get('password'));
  if (!email.success || !password) return { error: 'Confira o e-mail e a senha.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: email.data, password });
  if (error) {
    reportAuthError('signin', error);
    return {
      error: authErrorMessage(
        error,
        'Não foi possível entrar. Confira os dados e a confirmação do seu e-mail.',
      ),
    };
  }
  redirect('/dashboard');
}
export async function signUp(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseEnv())
    return { error: 'A conexão com o Supabase ainda precisa ser configurada.' };
  const result = z
    .object({
      email: emailSchema,
      password: passwordSchema,
      name: z.string().trim().min(2).max(100),
    })
    .safeParse({
      email: String(form.get('email')).trim(),
      password: form.get('password'),
      name: form.get('name'),
    });
  if (!result.success)
    return { error: 'Informe seu nome, um e-mail válido e uma senha de pelo menos 10 caracteres.' };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: result.data.email,
    password: result.data.password,
    options: {
      data: { full_name: result.data.name },
      emailRedirectTo: `${siteUrl()}/auth/callback`,
    },
  });
  if (error) {
    reportAuthError('signup', error);
    return {
      error: authErrorMessage(
        error,
        'Não foi possível criar o acesso. Confira os dados ou tente novamente mais tarde.',
      ),
    };
  }
  if (data.session) redirect('/onboarding');
  return {
    success:
      'Confira seu e-mail e a pasta de spam para confirmar o acesso. Se não chegar, use Reenviar confirmação abaixo. Se já tiver uma conta confirmada, use Entrar ou recupere sua senha.',
  };
}
export async function resendConfirmation(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseEnv())
    return { error: 'A conexão com o Supabase ainda precisa ser configurada.' };
  const email = emailSchema.safeParse(String(form.get('email')).trim());
  if (!email.success) return { error: 'Informe um e-mail válido.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) {
    reportAuthError('resend_confirmation', error);
    return {
      error: authErrorMessage(
        error,
        'Não foi possível solicitar a confirmação. Tente novamente mais tarde.',
      ),
    };
  }
  return {
    success:
      'Se houver um cadastro aguardando confirmação neste endereço, você receberá um novo e-mail. Confira também a pasta de spam e abra o link neste navegador. Aguarde antes de solicitar outro envio.',
  };
}
export async function forgotPassword(_state: AuthState, form: FormData): Promise<AuthState> {
  if (!getSupabaseEnv())
    return { error: 'A conexão com o Supabase ainda precisa ser configurada.' };
  const email = emailSchema.safeParse(String(form.get('email')).trim());
  if (!email.success) return { error: 'Informe um e-mail válido.' };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email.data, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  if (error) {
    reportAuthError('password_recovery', error);
    return {
      error: authErrorMessage(
        error,
        'Não foi possível enviar a solicitação agora. Tente novamente em alguns minutos.',
      ),
    };
  }
  return {
    success: 'Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha.',
  };
}
export async function resetPassword(_state: AuthState, form: FormData): Promise<AuthState> {
  const { supabase } = await requireUser();
  const password = passwordSchema.safeParse(form.get('password'));
  if (!password.success) return { error: 'Use uma senha de 10 a 128 caracteres.' };
  if (password.data !== form.get('confirmPassword'))
    return { error: 'As senhas precisam ser iguais.' };
  const { error } = await supabase.auth.updateUser({ password: password.data });
  if (error)
    return {
      error:
        'Não foi possível atualizar a senha. Abra um novo link de recuperação e tente novamente.',
    };
  await supabase.auth.signOut();
  redirect('/login?updated=1');
}
export async function signOut() {
  if (getSupabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete('wr-organization');
  redirect('/login');
}
export async function createOrganization(_state: AuthState, form: FormData): Promise<AuthState> {
  const { supabase } = await requireUser();
  const name = z.string().trim().min(2).max(100).safeParse(form.get('name'));
  if (!name.success) return { error: 'Informe um nome de empresa entre 2 e 100 caracteres.' };
  const { data, error } = await supabase.rpc('create_organization', { p_name: name.data });
  if (error)
    return {
      error: error.message.includes('COMPANY_LIMIT_REACHED')
        ? 'Você atingiu o limite de 10 empresas criadas. Entre em contato com o suporte para ampliar esse limite.'
        : 'Não foi possível criar a empresa. Verifique a conexão e as migrações do banco.',
    };
  (await cookies()).set('wr-organization', data, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/dashboard?welcome=1');
}
export async function switchOrganization(form: FormData) {
  const { organizations } = await getMemberships();
  const target = String(form.get('organization'));
  if (!organizations.some((org) => org.id === target)) throw new Error('Empresa indisponível.');
  (await cookies()).set('wr-organization', target, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect('/dashboard');
}
