'use client';
import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';
import type { Database } from '@/types/database';
export function createClient() {
  const config=getSupabaseEnv();
  if(!config) throw new Error('Supabase não configurado.');
  return createBrowserClient<Database>(config.url,config.key);
}
