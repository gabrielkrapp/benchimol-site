import { describe,it,expect,vi,afterEach } from 'vitest';
import { Client } from 'pg';
import { pgConnectionConfig } from '@/lib/server/database-connection';
afterEach(()=>vi.unstubAllEnvs());
describe('PostgreSQL transport before connecting',()=>{
 it('requires verified TLS remotely even when the pooler URL has no sslmode',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  const config=await pgConnectionConfig('postgresql://postgres.abcdefghijklmnopqrst:redacted@aws-0-sa-east-1.pooler.supabase.com/postgres');
  const client=new Client(config) as any;
  expect(client.connectionParameters.ssl).toMatchObject({rejectUnauthorized:true});
 });
 it('removes URL SSL overrides while preserving verified TLS for sslmode=require',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  const config=await pgConnectionConfig('postgresql://postgres:redacted@db.abcdefghijklmnopqrst.supabase.co/postgres?sslmode=require');
  expect(config.connectionString).toBeUndefined();expect((new Client(config) as any).connectionParameters.ssl).toMatchObject({rejectUnauthorized:true});
 });
 it('rejects remote disable/no-verify and certificate paths in a connection URL',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  for(const query of ['sslmode=disable','sslmode=no-verify','sslrootcert=/tmp/fake.crt','ssl=false'])await expect(pgConnectionConfig(`postgresql://postgres:redacted@db.abcdefghijklmnopqrst.supabase.co/postgres?${query}`)).rejects.toThrow();
 });
 it('permits explicit loopback development without remote TLS setup',async()=>{
  const config=await pgConnectionConfig('postgresql://postgres:redacted@127.0.0.1:54322/postgres');
  expect((new Client(config) as any).connectionParameters.ssl).toBe(false);
 });

 it.each(['host=db.zyxwvutsrqponmlkjihg.supabase.co','user=postgres.zyxwvutsrqponmlkjihg','password=other','port=6543','database=other','options=-c%20search_path%3Dother'])('rejects a connection override in the query: %s',async(query)=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  await expect(pgConnectionConfig(`postgresql://postgres.abcdefghijklmnopqrst:fixture@aws-0-sa-east-1.pooler.supabase.com/postgres?${query}`)).rejects.toThrow();
 });
 it('rejects a remote-host override on a loopback URL rather than producing remote ssl:false',async()=>{
  await expect(pgConnectionConfig('postgresql://postgres:fixture@127.0.0.1:54322/postgres?host=db.zyxwvutsrqponmlkjihg.supabase.co')).rejects.toThrow();
 });
 it('pins all destination parameters independently of ambient PG connection variables',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  for(const [key,value] of Object.entries({PGHOST:'other.example',PGUSER:'other',PGPASSWORD:'other',PGDATABASE:'other',PGPORT:'6543',PGSSLMODE:'disable'}))vi.stubEnv(key,value);
  const config=await pgConnectionConfig('postgresql://postgres.abcdefghijklmnopqrst:p%40ss%24%26%3A%2F%25@aws-0-sa-east-1.pooler.supabase.com/postgres?sslmode=require&pgbouncer=true');
  const actual=(new Client(config) as any).connectionParameters;
  expect(config.connectionString).toBeUndefined();
  expect(actual).toMatchObject({host:'aws-0-sa-east-1.pooler.supabase.com',user:'postgres.abcdefghijklmnopqrst',database:'postgres',port:5432,ssl:{rejectUnauthorized:true}});
  expect(actual.password).toBe('p@ss$&:/%');
 });
 it('preserves the official direct and transaction-pooler URL ports',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  expect((new Client(await pgConnectionConfig('postgresql://postgres:fixture@db.abcdefghijklmnopqrst.supabase.co:5432/postgres?sslmode=verify-full')) as any).connectionParameters.port).toBe(5432);
  expect((new Client(await pgConnectionConfig('postgresql://postgres.abcdefghijklmnopqrst:fixture@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true')) as any).connectionParameters.port).toBe(6543);
 });
 it.each(['','/','/other','/postgres/'])('rejects missing or another database pathname: %s',async(path)=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  vi.stubEnv('PGDATABASE','other');
  await expect(pgConnectionConfig(`postgresql://postgres:fixture@db.abcdefghijklmnopqrst.supabase.co${path}`)).rejects.toThrow();
 });
 it.each(['postgres@','@','postgres:@'])('rejects absent credentials instead of inheriting PGUSER/PGPASSWORD: %s',async(credentials)=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  vi.stubEnv('PGUSER','other');vi.stubEnv('PGPASSWORD','other');
  await expect(pgConnectionConfig(`postgresql://${credentials}db.abcdefghijklmnopqrst.supabase.co/postgres`)).rejects.toThrow();
 });
 it('rejects ambient session options that are outside the approved URL',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  vi.stubEnv('PGOPTIONS','-c search_path=other');
  await expect(pgConnectionConfig('postgresql://postgres:fixture@db.abcdefghijklmnopqrst.supabase.co/postgres')).rejects.toThrow();
 });
 it('rejects unknown parameters and contradictory repeated TLS modes explicitly',async()=>{
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','abcdefghijklmnopqrst');
  for(const query of ['unknown=value','sslmode=require&sslmode=disable','pgbouncer=invalid'])await expect(pgConnectionConfig(`postgresql://postgres:fixture@db.abcdefghijklmnopqrst.supabase.co/postgres?${query}`)).rejects.toThrow();
 });
});
