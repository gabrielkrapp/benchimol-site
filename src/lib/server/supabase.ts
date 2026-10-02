import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies, headers } from 'next/headers';
import { backendConfig } from './config';
export const noStoreFetch:typeof fetch = (input,init) => fetch(input,{...init,cache:'no-store'});
export async function serverClient() {
  const {url,key}=backendConfig(), jar=await cookies();
  return createServerClient(url,key,{
    global:{fetch:noStoreFetch},
    cookieOptions:{ httpOnly:true, sameSite:'lax', secure:process.env.NODE_ENV==='production', path:'/' },
    cookies:{ getAll:()=>jar.getAll(), setAll:(all)=>{
      // Server Components cannot write. Proxy owns refresh; handlers own mutations.
      try { all.forEach(({name,value,options})=>jar.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'})); } catch { /* read-only RSC jar */ }
    } },
  });
}
export function publicClient() {
  const {url,key}=backendConfig();
  return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:noStoreFetch}});
}
