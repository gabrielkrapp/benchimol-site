import { createServerClient } from '@supabase/ssr';
import { NextRequest,NextResponse } from 'next/server';
import { backendConfig,isBackendConfigured } from '@/lib/server/config';
import { noStoreFetch } from '@/lib/server/supabase';
export async function proxy(request:NextRequest) {
 let response=NextResponse.next({request});
 const noStore=()=>{response.headers.set('Cache-Control','private, no-store, max-age=0');response.headers.set('Pragma','no-cache');response.headers.set('Expires','0');response.headers.set('X-Robots-Tag','noindex, nofollow');};
 noStore();
 if(!isBackendConfigured())return response;
 try {
  const {url,key}=backendConfig();
  const client=createServerClient(url,key,{
    global:{fetch:noStoreFetch},cookieOptions:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'},
    cookies:{getAll:()=>request.cookies.getAll(),setAll:(all,headers)=>{
      all.forEach(({name,value})=>request.cookies.set(name,value));
      const previous=response;response=NextResponse.next({request});
      previous.cookies.getAll().forEach(cookie=>response.cookies.set(cookie));
      all.forEach(({name,value,options})=>response.cookies.set(name,value,{...options,httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/'}));
      Object.entries(headers).forEach(([name,value])=>response.headers.set(name,value));noStore();
    }},
  });
  // Refresh only. Every private page and handler performs remote getUser + active-admin authorization.
  await client.auth.getClaims();
 }catch{noStore();}
 return response;
}
export const config={matcher:['/admin/:path*','/api/admin/:path*','/api/auth/:path*']};
