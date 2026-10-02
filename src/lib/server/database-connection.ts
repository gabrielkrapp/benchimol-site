import type { ClientConfig } from 'pg';
import { readFile } from 'node:fs/promises';
import { assertClinicTarget } from './clinic-binding';
import { AppError } from './errors';
/** Validate the URL once; pg must not reparse query overrides or inherit a target. */
export async function pgConnectionConfig(target:string):Promise<ClientConfig>{
 assertClinicTarget(target,true);const url=new URL(target);
 if(!['postgres:','postgresql:'].includes(url.protocol))throw new AppError(503,'database_transport','Use uma URL PostgreSQL válida.');
 const local=['localhost','127.0.0.1'].includes(url.hostname);
 if(url.pathname!=='/postgres'||url.hash)throw new AppError(503,'database_transport','Use o banco postgres explícito, sem fragmento na URL.');
 let user:string,password:string;
 try{user=decodeURIComponent(url.username);password=decodeURIComponent(url.password);}catch{throw new AppError(503,'database_transport','Credenciais PostgreSQL inválidas.');}
 if(!user||!password)throw new AppError(503,'database_transport','Informe usuário e senha completos na URL PostgreSQL.');
 const port=url.port?Number(url.port):5432;
 if(!Number.isInteger(port)||port<1||port>65535)throw new AppError(503,'database_transport','Porta PostgreSQL inválida.');
 // These optional pg defaults would otherwise be inherited from the shell.
 // Destination fields and TLS below are explicit and override their PG* values.
 const inherited=['PGOPTIONS','PGBINARY','PGREPLICATION','PGCLIENT_ENCODING','PGAPPNAME','PGSSLNEGOTIATION','PGCONNECT_TIMEOUT'];
 if(inherited.some(key=>Boolean(process.env[key])))throw new AppError(503,'database_transport','Remova opções PG de sessão externas antes de executar esta operação.');
 const seen=new Set<string>();
 for(const [key,value] of url.searchParams){
  const lowered=key.toLowerCase();
  if(seen.has(lowered))throw new AppError(503,'database_transport','Parâmetros PostgreSQL repetidos não são permitidos.');
  seen.add(lowered);
  if(lowered==='sslmode'){
   const modes=local?['disable']:['require','verify-ca','verify-full'];
   if(!modes.includes(value.toLowerCase()))throw new AppError(503,'database_transport','Modo TLS incompatível com o destino autorizado.');
  }else if(lowered==='pgbouncer'&&['true','false'].includes(value.toLowerCase())){
   // Marketplace/ORM hint: pg has no corresponding connection option.
  }else throw new AppError(503,'database_transport','Parâmetros da URL não podem substituir a conexão PostgreSQL autorizada.');
 }
 const connection={host:url.hostname,port,user,password,database:'postgres'};
 if(local)return {...connection,ssl:false};
 const caFile=process.env.SUPABASE_DB_CA_FILE,ca=caFile?await readFile(caFile,'utf8'):undefined;
 return {...connection,ssl:{rejectUnauthorized:true,...(ca?{ca}:{})},enableChannelBinding:true};
}
