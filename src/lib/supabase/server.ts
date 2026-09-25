import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';
import type { Database } from '@/types/database';

export async function createClient() {
  const config=getSupabaseEnv();
  if(!config) throw new Error('SUPABASE_NOT_CONFIGURED');
  const store=await cookies();
  return createServerClient<Database>(config.url,config.key,{cookies:{
    getAll(){return store.getAll();},
    setAll(values){try {values.forEach(({name,value,options})=>store.set(name,value,options));} catch { /* Proxy refreshes cookies for read-only Server Components. */ }}
  }});
}
