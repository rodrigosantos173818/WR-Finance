import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { organizationsSchema } from '@/validations/dashboard';

export const requireUser=cache(async()=>{
  if(!getSupabaseEnv()) redirect('/setup');
  const supabase=await createClient();
  const {data:{user},error}=await supabase.auth.getUser();
  if(error || !user) redirect('/login');
  return {supabase,user};
});
export const getMemberships=cache(async()=>{
  const {supabase,user}=await requireUser();
  const {data,error}=await supabase.rpc('get_my_organizations');
  if(error) throw new Error('Não foi possível consultar as empresas. Confirme as migrações do banco.');
  return {supabase,user,organizations:organizationsSchema.parse(data)};
});
export const requireOrganization=cache(async()=>{
  const context=await getMemberships();
  if(!context.organizations.length) redirect('/onboarding');
  const requested=(await cookies()).get('wr-organization')?.value;
  const organization=context.organizations.find(org=>org.id===requested) || context.organizations[0];
  return {...context,organization};
});
