import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildExpiredUploadPlan, executeExpiredUploadCleanup, assertCleanupDestination } from '../../scripts/migration/cleanup-expired-uploads';

const now = Date.parse('2026-10-02T12:00:00Z');
const id = '11111111-1111-4111-8111-111111111111', user = '22222222-2222-4222-8222-222222222222';
const row = { id, user_id: user, storage_path: `${user}/${id}.png`, created_at: '2026-10-02T06:00:00Z', bytes: 100, mime_type: 'image/png', media_reference: false, post_reference: false, revision_reference: false, object_present: true };
afterEach(() => vi.unstubAllEnvs());
describe('manual expired upload cleanup', () => {
 it('protects nonexpired, malformed and referenced intents, including revisions', () => {
  for (const change of [{created_at:'2026-10-02T09:00:00Z'},{created_at:'bad'},{storage_path:'../outside.png'},{id:'bad'},{media_reference:true},{post_reference:true},{revision_reference:true}]) {
   expect(buildExpiredUploadPlan([{...row,...change}],now).candidates).toHaveLength(0);
  }
  expect(buildExpiredUploadPlan([row],now).candidates).toHaveLength(1);
 });
 it('binds approval to exact candidates and metadata', () => {
  const initial=buildExpiredUploadPlan([row],now);
  expect(buildExpiredUploadPlan([row],now).hash).toBe(initial.hash);
  expect(buildExpiredUploadPlan([{...row,bytes:101}],now).hash).not.toBe(initial.hash);
  expect(buildExpiredUploadPlan([],now).hash).not.toBe(initial.hash);
 });
 it('refuses a wrong clinic or loopback before connecting', () => {
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF','jjrzmuuwuvxcsnwqzvxf');
  expect(() => assertCleanupDestination('jjrzmuuwuvxcsnwqzvxf','https://jjrzmuuwuvxcsnwqzvxf.supabase.co','postgresql://postgres.jjrzmuuwuvxcsnwqzvxf:p@aws-0.pooler.supabase.com:5432/postgres')).not.toThrow();
  expect(() => assertCleanupDestination('aaevrjkhfgazbudipjgb','https://aaevrjkhfgazbudipjgb.supabase.co','postgresql://postgres:p@127.0.0.1:54352/postgres')).toThrow();
  expect(() => assertCleanupDestination('jjrzmuuwuvxcsnwqzvxf','https://jjrzmuuwuvxcsnwqzvxf.supabase.co','postgresql://postgres:p@127.0.0.1:54352/postgres')).toThrow();
 });
 function connection(rows:unknown[]) {
  const query=vi.fn(async (sql:string) => sql.includes('select u.id') ? {rows} : sql.startsWith('delete from public.media_uploads') ? {rowCount:1,rows:[]} : {rows:[]});
  return {query};
 }
 it('rechecks under locks and does not delete anything when the approved plan changed', async () => {
  const client=connection([{...row,media_reference:true}]), remove=vi.fn();
  await expect(executeExpiredUploadCleanup(client,remove,buildExpiredUploadPlan([row],now).hash,now)).rejects.toThrow(/plan_changed/);
  expect(remove).not.toHaveBeenCalled();
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('rollback');
  expect(client.query.mock.calls.some(([sql]) => sql.includes('lock table public.media in share mode'))).toBe(true);
  expect(client.query.mock.calls.some(([sql]) => sql.includes('lock table public.posts in share mode'))).toBe(true);
  expect(client.query.mock.calls.some(([sql]) => sql.includes('lock table public.post_revisions in share mode'))).toBe(true);
 });
 it('deletes only the approved expired object and then its intent', async () => {
  const client=connection([row]), remove=vi.fn(async () => {});
  const result=await executeExpiredUploadCleanup(client,remove,buildExpiredUploadPlan([row],now).hash,now);
  expect(remove).toHaveBeenCalledExactlyOnceWith([row.storage_path]);
  expect(result).toEqual({deletedIntents:1,deletedObjects:1});
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('commit');
 });
 it('retains intentions when Storage deletion fails; no fictional rollback of bytes', async () => {
  const client=connection([row]);
  await expect(executeExpiredUploadCleanup(client,async () => {throw new Error('storage_failed');},buildExpiredUploadPlan([row],now).hash,now)).rejects.toThrow('storage_failed');
  expect(client.query.mock.calls.some(([sql]) => sql.startsWith('delete from'))).toBe(false);
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('rollback');
 });
 it('never calls Storage when a reference-source lock times out', async () => {
  const client=connection([row]), original=client.query.getMockImplementation()!, remove=vi.fn();
  client.query.mockImplementation(async sql=>{if(sql==='lock table public.posts in share mode')throw new Error('lock_timeout');return original(sql);});
  await expect(executeExpiredUploadCleanup(client,remove,buildExpiredUploadPlan([row],now).hash,now)).rejects.toThrow('lock_timeout');
  expect(remove).not.toHaveBeenCalled();
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('delete from'))).toBe(false);
  expect(client.query.mock.calls.at(-1)?.[0]).toBe('rollback');
 });
 it('refuses more than 25 objects before any irreversible deletion', async () => {
  const rows=Array.from({length:26},(_,index)=>{const itemId=`${index.toString(16).padStart(8,'0')}-3333-4333-8333-333333333333`;return {...row,id:itemId,storage_path:`${user}/${itemId}.png`};});
  const client=connection(rows),remove=vi.fn();
  await expect(executeExpiredUploadCleanup(client,remove,buildExpiredUploadPlan(rows,now).hash,now)).rejects.toThrow('manual_batch_review_required');
  expect(remove).not.toHaveBeenCalled();
  expect(client.query.mock.calls.some(([sql])=>sql.startsWith('delete from'))).toBe(false);
 });
 it('removes a stale intent whose object is already absent without deleting Storage', async () => {
  const absent={...row,object_present:false},client=connection([absent]),remove=vi.fn();
  const result=await executeExpiredUploadCleanup(client,remove,buildExpiredUploadPlan([absent],now).hash,now);
  expect(result).toEqual({deletedIntents:1,deletedObjects:0});
  expect(remove).not.toHaveBeenCalled();
 });
});
