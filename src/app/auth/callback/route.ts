import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv, siteUrl } from '@/lib/supabase/env';
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const next =
    request.nextUrl.searchParams.get('next') === '/reset-password'
      ? '/reset-password'
      : '/dashboard';
  if (code && getSupabaseEnv()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    // Next can normalize loopback request URLs to localhost. Keep the configured
    // public origin so the browser retains the session cookie on the callback host.
    if (!error) return NextResponse.redirect(new URL(next, siteUrl()));
  }
  return NextResponse.redirect(new URL('/login?error=link', siteUrl()));
}
