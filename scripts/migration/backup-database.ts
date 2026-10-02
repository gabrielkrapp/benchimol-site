import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { mkdir,writeFile } from 'node:fs/promises';
import { resolve,join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pgConnectionConfig } from '../../src/lib/server/database-connection';
import { assertClinicTarget } from '../../src/lib/server/clinic-binding';
export const BACKUP_TABLES=['administrators','reserved_routes','taxonomies','media','posts','post_revisions','redirects','settings','settings_revisions','operation_events'] as const;
export const hashBytes=(bytes:Uint8Array|string)=>createHash('sha256').update(bytes).digest('hex');
export interface BackupManifest {schemaVersion:1;createdAt:string;projectRef:string;tables:Record<string,any[]>;files:{path:string;localFile:string;sha256:string;bytes:number;mimeType:string}[];databaseSha256:string;}
async function main(){
 if(!process.argv.includes('--execute')){console.log('Planejamento: exportar tabelas editoriais em snapshot consistente e arquivos geridos. Auth/WordPress e assets legados exigem backups próprios. Nenhuma conexão realizada.');return;}
 const target=process.env.DATABASE_URL,url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!target||!url||!key)throw new Error('Missing configuration');assertClinicTarget(target,true);assertClinicTarget(url,true);
 const arg=process.argv.indexOf('--output'),folder=resolve(arg>=0?process.argv[arg+1]:`/private/tmp/benchimol-backup-${Date.now()}`),repo=resolve('.');
 if(folder.startsWith(`${repo}/`)&&!folder.startsWith(`${repo}/backups/`))throw new Error('Backups must stay outside tracked workspace');
 await mkdir(folder,{mode:0o700});await mkdir(join(folder,'files'),{mode:0o700});
 const client=new Client(await pgConnectionConfig(target)),storage=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});await client.connect();
 try{
  await client.query('begin isolation level repeatable read read only');const tables:Record<string,any[]>={};
  for(const table of BACKUP_TABLES)tables[table]=(await client.query(`select * from public.${table}`)).rows;
  await client.query('commit');const files:BackupManifest['files']=[];
  for(const asset of tables.media.filter(m=>m.storage_path)){
   const downloaded=await storage.storage.from('editorial-media').download(asset.storage_path);if(downloaded.error)throw new Error('Storage export incomplete');
   const bytes=new Uint8Array(await downloaded.data.arrayBuffer()),filename=`${files.length}-${asset.id}.bin`;
   await writeFile(join(folder,'files',filename),bytes,{mode:0o600});files.push({path:asset.storage_path,localFile:`files/${filename}`,sha256:hashBytes(bytes),bytes:bytes.length,mimeType:asset.mime_type});
  }
  const manifest:BackupManifest={schemaVersion:1,createdAt:new Date().toISOString(),projectRef:process.env.SUPABASE_CLINIC_PROJECT_REF!,tables,files,databaseSha256:hashBytes(JSON.stringify(tables))};
  await writeFile(join(folder,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
  await client.query("insert into public.operation_events(kind,source,details) values('export','Manual verified database+managed-files export',$1)",[JSON.stringify({tables:BACKUP_TABLES.length,files:files.length,hash:manifest.databaseSha256})]);
  console.log(`Exportação verificada gravada em ${folder}. Auth e assets legados não estão incluídos.`);
 }catch(error){await client.query('rollback').catch(()=>{});throw error;}finally{await client.end();}
}
if(resolve(process.argv[1]??'')===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Backup não concluído. Nenhum sucesso de backup registrado. Preserve a pasta parcial para diagnóstico.');process.exitCode=1;});
