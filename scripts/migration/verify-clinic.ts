import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { writeFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
import { buildImportPlan } from './import-database';
class CheckError extends Error {}
function ensure(value:unknown,label:string):asserts value {if(!value)throw new CheckError(label);}
async function main(){
 const ref=process.env.SUPABASE_CLINIC_PROJECT_REF;
 ensure(ref&&process.argv.includes(`--expected-ref=${ref}`),'Explicit clinic project required');
 const api=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,target=process.env.DATABASE_URL;
 ensure(api&&key&&target,'Missing clinic configuration');assertClinicTarget(api,true);assertClinicTarget(target,true);
 ensure(new URL(api).hostname===`${ref}.supabase.co`,'Clinic API mismatch');
 const sdk=createClient(api,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 const plan=buildImportPlan(),checks:Array<{name:string;passed:true;detail?:unknown}>=[];
 const posts=await sdk.from('posts').select('wp_id,body_html,slug,public_path,status,published_at',{count:'exact'}).order('wp_id').range(0,999);
 ensure(!posts.error&&posts.count===153&&posts.data?.length===153,'Public API inventory mismatch');
 const expected=new Map(plan.posts.filter(p=>p.public_path).map(p=>[Number(p.wp_id),p]));
 ensure(posts.data.every(p=>{const s=expected.get(Number(p.wp_id));return s&&p.body_html===s.body_html&&p.slug===s.slug&&p.public_path===s.public_path&&p.status==='published'&&new Date(p.published_at).toISOString()===new Date(s.published_at!).toISOString();}),'Public API content/date mismatch');
 checks.push({name:'Public SDK: 153 canonical articles, exact bodies, dates and paths',passed:true});
 const media=await sdk.from('media').select('wp_id,url',{count:'exact'}).not('wp_id','is',null).range(0,999);
 ensure(media.error?.code==='42501'||!media.error&&media.data?.length===0,'Anonymous SDK exposed the administrative media catalog');
 checks.push({name:'Anonymous SDK cannot list administrative media metadata; legacy bytes remain static',passed:true});
 const authResponse=await fetch(`${api}/auth/v1/settings`,{headers:{apikey:key},signal:AbortSignal.timeout(15000)});
 ensure(authResponse.ok,'Auth settings unavailable');const settings=await authResponse.json();ensure(settings.disable_signup===true&&settings.external?.email===true,'Auth signup/email configuration mismatch');
 checks.push({name:'Auth: signup disabled, email provider enabled',passed:true});
 const client=new Client({...await pgConnectionConfig(target),connectionTimeoutMillis:15000,query_timeout:15000});await client.connect();
 let approvedAdminExists=false;
 try{
  const records=(await client.query('select wp_id,url from public.media where wp_id is not null')).rows;
  const expectedMedia=new Map(plan.media.map(m=>[m.wpId,m.localPath]));
  ensure(records.length===551&&records.every(m=>expectedMedia.get(Number(m.wp_id))===m.url),'Stored legacy media inventory mismatch');
  checks.push({name:'PostgreSQL: 551 legacy media IDs and URLs reconciled',passed:true});
  const bucket=(await client.query("select public,file_size_limit from storage.buckets where id='editorial-media'")).rows[0];ensure(bucket?.public===false&&Number(bucket.file_size_limit)===10485760,'Storage bucket mismatch');
  checks.push({name:'Managed Storage bucket private, image limit 10 MB',passed:true});
  for(const role of ['anon','authenticated']){
   const id=randomUUID();let denied=false;
   await client.query('begin');
   try{
    // Private probes exist only inside this transaction; always rolled back.
    await client.query('insert into public.posts(id,slug,title,status) values($1,$2,$3,$4)',[id,`clinic-policy-probe-${id}`,'Transactional private policy probe','draft']);
    await client.query('insert into public.post_revisions(post_id,version,actor_name,snapshot) values($1,1,$2,$3)',[id,'Transactional policy probe','{}']);
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claim.sub',$1,true)",[role==='authenticated'?randomUUID():'']);
    ensure((await client.query('select count(*)::int as total from public.posts where id=$1',[id])).rows[0].total===0,'Unauthorized private post read');
    try{ensure((await client.query('select count(*)::int as total from public.post_revisions where post_id=$1',[id])).rows[0].total===0,'Unauthorized revision read');}catch(error){if((error as {code?:string}).code==='42501'){await client.query('rollback');await client.query('begin');await client.query(`set local role ${role}`);await client.query("select set_config('request.jwt.claim.sub',$1,true)",[role==='authenticated'?randomUUID():'']);}else throw error;}
    try{await client.query('select public.create_post($1::jsonb)',[JSON.stringify({slug:`denied-policy-${id}`,title:'Transactional write denial probe'})]);}catch(error){ensure((error as {code:string}).code==='42501','Unexpected error instead of permission denial');denied=true;}
    ensure(denied,'Unauthorized post write succeeded');
   }finally{await client.query('rollback');}
   checks.push({name:`${role}: private post/revision hidden and RPC write refused; probes rolled back`,passed:true});
  }
  approvedAdminExists=(await client.query('select count(*)::int as total from auth.users where lower(email)=$1',['gabriel.krapp@hotmail.com'])).rows[0].total===1;
  ensure((await client.query("select count(*)::int as total from public.posts where wp_id is null")).rows[0].total===0,'A policy probe was persisted');
 }finally{await client.end();}
 const report={createdAt:new Date().toISOString(),projectRef:ref,passed:true,checks,approvedAdminExists,adminSessionTested:false,managedUploadTested:false,productionSiteTested:false,noDocker:true,noSiteDeployment:true};
 await writeFile('docs/validation/clinic-connected.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(error=>{console.error(JSON.stringify({completed:false,check:error instanceof CheckError?error.message:null,errorCode:error instanceof CheckError?null:error.code??null}));process.exitCode=1;});
