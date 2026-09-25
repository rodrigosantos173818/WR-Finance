export function getSupabaseEnv() {
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!url || !key || key.startsWith('sb_secret_')) return null;
  try {
    const parsed=new URL(url);
    if(!['https:','http:'].includes(parsed.protocol)) return null;
    if(key.startsWith('eyJ')) {
      const payload=JSON.parse(atob(key.split('.')[1].replaceAll('-','+').replaceAll('_','/'))) as {role?:string};
      if(payload.role!=='anon') return null;
    } else if(!key.startsWith('sb_publishable_')) return null;
    return {url,key};
  } catch { return null; }
}
export function siteUrl() { return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'; }
