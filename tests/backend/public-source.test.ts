import { afterEach,describe,it,expect,vi } from 'vitest';
import { getPublicPostByPath,getPublicPosts,getPublicSettings } from '@/lib/server/public-repository';
import { backendConfig,canUseSnapshot } from '@/lib/server/config';
import { assertOrigin } from '@/lib/server/http';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('public source and request guards',()=>{
 it('opens the public migrated site without Supabase or an opt-in environment variable',async()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');
  vi.stubEnv('ALLOW_LOCAL_SNAPSHOT','');vi.stubEnv('ALLOW_PUBLIC_SNAPSHOT','');vi.stubEnv('VERCEL','1');
  expect(canUseSnapshot()).toBe(true);
  expect((await getPublicPosts({pageSize:3})).items).toHaveLength(3);
  expect((await getPublicSettings()).contact.whatsapp).toBeTruthy();
  expect(()=>backendConfig()).toThrow();
 });
 it('does not serve the captured archive for partial configuration or an explicit opt-out',()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://clinicexampleabcdefg.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');
  vi.stubEnv('ALLOW_PUBLIC_SNAPSHOT','true');expect(canUseSnapshot()).toBe(false);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('ALLOW_PUBLIC_SNAPSHOT','false');expect(canUseSnapshot()).toBe(false);
 });
 it('never serves stale snapshots when a configured database fails',async()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://abcdefghijklmnopqrst.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_fixture');vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');vi.stubEnv('ALLOW_LOCAL_SNAPSHOT','true');
  const fetch=vi.fn(async()=>new Response(JSON.stringify({message:'provider offline'}),{status:503,headers:{'Content-Type':'application/json'}}));
  vi.stubGlobal('fetch',fetch);
  expect(()=>backendConfig()).not.toThrow();
  await expect(getPublicPostByPath('/cirurgia-refrativa-artigo/')).rejects.toMatchObject({status:503});
  await expect(getPublicPosts()).rejects.toMatchObject({status:503});
  expect(fetch).toHaveBeenCalled();
 });
 it('requires an explicit clinic project binding for a configured remote backend',()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://abcdefghijklmnopqrst.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_fixture');vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','');
  expect(canUseSnapshot()).toBe(false);
  expect(()=>backendConfig()).toThrow(/Defina o projeto Supabase exclusivo da clínica/);
 });
 it('rejects a remote URL that differs from the approved clinic project binding',()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://zyxwvutsrqponmlkjihg.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_fixture');vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  expect(()=>backendConfig()).toThrow(/não corresponde ao projeto autorizado/);
 });
 it.each(['aaevrjkhfgazbudipjgb','kohuycbqadlnhkbbqcir'])('rejects a known LifeWallet runtime destination even with a matching binding: %s',ref=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',`https://${ref}.supabase.co`);vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_fixture');vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF',ref);
  expect(()=>backendConfig()).toThrow(/não pertence à clínica/);
 });
 it('retains explicit loopback development without requiring a clinic project ref',()=>{
  vi.stubEnv('NODE_ENV','development');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_fixture');vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','');
  for(const host of ['localhost','127.0.0.1']){
   const url=`http://${host}:54321`;vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL',url);
   expect(backendConfig()).toEqual({url,key:'sb_publishable_fixture'});
  }
 });
 it('uses only the approved local aliases and preserves original authors',async()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','');vi.stubEnv('ALLOW_LOCAL_SNAPSHOT','true');
  const post=await getPublicPostByPath('/cirurgia-refrativa-artigo/');expect(post?.wpId).toBe(34);expect(post?.authorName).toBe('Johny');
  expect((await getPublicPosts({pageSize:100})).total).toBe(153);
  expect(await getPublicPostByPath('/cirurgia-refrativa/')).toBeNull();
 });
 it('rejects missing and mismatched Origin on state-changing requests',()=>{
  vi.stubEnv('NEXT_PUBLIC_SITE_URL','https://clinicadeolhosbenchimol.com.br');
  expect(()=>assertOrigin(new Request('https://clinicadeolhosbenchimol.com.br/api/auth/login'))).toThrow();
  expect(()=>assertOrigin(new Request('https://clinicadeolhosbenchimol.com.br/api/auth/login',{headers:{Origin:'https://attacker.invalid'}}))).toThrow();
  expect(()=>assertOrigin(new Request('https://clinicadeolhosbenchimol.com.br/api/auth/login',{headers:{Origin:'https://clinicadeolhosbenchimol.com.br'}}))).not.toThrow();
 });
});
