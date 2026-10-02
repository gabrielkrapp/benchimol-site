import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { readFile } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { hashBytes,BACKUP_TABLES } from './backup-database';
import type { SqlConnection } from './import-database';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
const schema=z.object({schemaVersion:z.literal(1),createdAt:z.string(),projectRef:z.string(),tables:z.record(z.string(),z.array(z.record(z.string(),z.unknown()))),files:z.array(z.object({path:z.string(),localFile:z.string(),sha256:z.string(),bytes:z.number(),mimeType:z.string()})),databaseSha256:z.string()});
export async function readVerifiedBackup(path:string){
 const folder=dirname(resolve(path)),manifest=schema.parse(JSON.parse(await readFile(path,'utf8')));
 if(hashBytes(JSON.stringify(manifest.tables))!==manifest.databaseSha256)throw new Error('Database checksum mismatch');
 if(Object.keys(manifest.tables).some(t=>!BACKUP_TABLES.includes(t as any))||BACKUP_TABLES.some(t=>!manifest.tables[t]))throw new Error('Unexpected backup table');
 for(const file of manifest.files){const local=resolve(folder,file.localFile);if(!local.startsWith(`${folder}/files/`))throw new Error('Invalid backup path');const bytes=await readFile(local);if(bytes.length!==file.bytes||hashBytes(bytes)!==file.sha256)throw new Error('Storage checksum mismatch');}
 return manifest;
}
export async function restoreBackupFiles(manifest:Awaited<ReturnType<typeof readVerifiedBackup>>,folder:string,upload:(path:string,bytes:Uint8Array,mime:string)=>Promise<void>) {
 for(const file of manifest.files){
  if(file.path.startsWith('/')||file.path.split('/').some(part=>part==='..'||part==='.'||!part))throw new Error('Invalid Storage path');
  const local=resolve(folder,file.localFile);if(!local.startsWith(`${resolve(folder)}/files/`))throw new Error('Invalid backup path');
  const bytes=await readFile(local);if(bytes.length!==file.bytes||hashBytes(bytes)!==file.sha256)throw new Error('Storage checksum mismatch');
  await upload(file.path,bytes,file.mimeType);
 }
}
export async function assertEmptyRestoreTarget(client:SqlConnection) {
 for(const table of ['posts','media','post_revisions','redirects','administrators','operation_events','taxonomies','media_uploads','settings_revisions']){const current=await client.query(`select count(*)::int as count from public.${table}`);if(current.rows[0].count!==0)throw new Error('Target is not empty');}
}
export async function restoreDatabaseRows(client:SqlConnection,manifest:Awaited<ReturnType<typeof readVerifiedBackup>>) {
 for(const table of BACKUP_TABLES){
  if(table==='settings'||table==='reserved_routes')await client.query(`delete from public.${table}`);
  for(const row of manifest.tables[table]){const columns=Object.keys(row);if(columns.some(k=>!/^[a-z_]+$/.test(k)))throw new Error('Invalid column');const values=Object.values(row).map(v=>v!==null&&typeof v==='object'&&!Array.isArray(v)?JSON.stringify(v):v);await client.query(`insert into public.${table} (${columns.join(',')}) values (${columns.map((_,i)=>`$${i+1}`).join(',')})`,values);}
 }
}
async function main(){
 const sourceIndex=process.argv.indexOf('--source');if(sourceIndex<0)throw new Error('Pass --source /absolute/path/manifest.json');const source=resolve(process.argv[sourceIndex+1]),manifest=await readVerifiedBackup(source);
 if(!process.argv.includes('--execute')){console.log(JSON.stringify({mode:'verified-plan',tables:BACKUP_TABLES.map(t=>({table:t,rows:manifest.tables[t].length})),files:manifest.files.length},null,2));return;}
 if(!process.argv.includes('--confirm-empty-target'))throw new Error('Manual empty target confirmation required');
 const target=process.env.DATABASE_URL,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;if(!target||!url||!key)throw new Error('Missing configuration');assertClinicTarget(target,true);assertClinicTarget(url,true);
 const client=new Client(await pgConnectionConfig(target)),storage=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});await client.connect();
 try{
  await client.query('begin');
  // Refuse overwrite of a working editorial database. Auth must already contain the same admins.
  await assertEmptyRestoreTarget(client);
  await restoreBackupFiles(manifest,dirname(source),async(path,bytes,mime)=>{const result=await storage.storage.from('editorial-media').upload(path,bytes,{contentType:mime,upsert:false});if(result.error)throw new Error('Storage restore incomplete');});
  await restoreDatabaseRows(client,manifest);
  await client.query("insert into public.operation_events(kind,source,details) values('restore','Manual checksum-verified database+managed-files restore',$1)",[JSON.stringify({databaseHash:manifest.databaseSha256,files:manifest.files.length})]);
  await client.query('commit');console.log('Restauração gravada em destino vazio. Valide Auth, leituras públicas e arquivos antes de qualquer publicação manual.');
 }catch(error){await client.query('rollback');throw error;}finally{await client.end();}
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Restauração não concluída. Banco não foi confirmado; arquivos privados enviados podem exigir limpeza manual.');process.exitCode=1;});
