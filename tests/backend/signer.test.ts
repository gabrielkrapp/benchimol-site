import { afterEach,describe,it,expect,vi } from 'vitest';
// The Next compiler enforces this boundary; outside Next, mock only the marker, not the signer.
vi.mock('server-only',()=>({}));
import { signMediaDownload } from '@/lib/server/privileged';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals()});
describe('private media signing boundary',()=>{
 it('signs exactly sixty seconds using only the private server credential',async()=>{
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL','https://abcdefghijklmnopqrst.supabase.co');vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','sb_publishable_fixture');vi.stubEnv('SUPABASE_SECRET_KEY','sb_secret_fixture');vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  let requestBody:unknown,authorization:string|null=null;
  vi.stubGlobal('fetch',async(_url:unknown,options:RequestInit)=>{
   requestBody=JSON.parse(String(options.body));authorization=new Headers(options.headers).get('authorization');
   return new Response(JSON.stringify({signedURL:'/object/sign/editorial-media/fixture.png?token=fixture'}),{status:200,headers:{'Content-Type':'application/json'}});
  });
  const url=await signMediaDownload('11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.png');
  expect(requestBody).toEqual({expiresIn:60});expect(authorization).toBe('Bearer sb_secret_fixture');expect(url).toContain('?token=fixture');
 });
 it('refuses traversal before invoking the privileged provider',async()=>{
  let called=false;vi.stubGlobal('fetch',async()=>{called=true;throw new Error('unexpected remote request')});
  await expect(signMediaDownload('../other-bucket/private.png')).rejects.toMatchObject({status:503});expect(called).toBe(false);
 });
});
