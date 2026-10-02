import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import { randomBytes, randomUUID } from 'node:crypto';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { bootstrapDatabase, fixtureExists, localCredentials, PROJECT_ROOT, validatePrerequisites, writePrivateFixture } from './runtime';
import { applyImport, buildImportPlan } from '../migration/import-database';
import { LocalError } from './guards';

type Fixture = { kind: 'benchimol-disposable-local-qa'; userId: string; email: string; password: string; originalSettings: Array<Record<string, unknown>>; createdAt: string };
const fixturePath = resolve(PROJECT_ROOT, '.local-supabase/qa-fixture.json');
const create = (url: string, key: string) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
function ensure(condition: unknown, label: string): asserts condition { if (!condition) throw new LocalError(label); }

async function cleanupFixture(service: SupabaseClient, db: Client, api: string, publishable: string): Promise<void> {
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as Fixture;
  ensure(fixture.kind === 'benchimol-disposable-local-qa' && /^qa-[a-f0-9]+@benchimol\.test$/.test(fixture.email), 'Fixture local não reconhecida; nada foi removido.');
  const identity = await service.auth.admin.getUserById(fixture.userId);
  ensure(identity.data.user?.email === fixture.email, 'Identidade QA divergente; nada foi removido.');
  const localAdmin = create(api, publishable);
  const session = await localAdmin.auth.signInWithPassword({ email: fixture.email, password: fixture.password });
  if (session.data.session) await service.auth.admin.signOut(session.data.session.access_token, 'global');
  const managed = await db.query('select storage_path from public.media where storage_path like $1', [`${fixture.userId}/%`]);
  await db.query('begin');
  try {
    const posts = await db.query('select id from public.posts where wp_id is null and updated_by=$1', [fixture.userId]);
    const ids = posts.rows.map(row => row.id);
    await db.query('delete from public.post_revisions where post_id=any($1::uuid[])', [ids]);
    await db.query('delete from public.redirects where post_id=any($1::uuid[])', [ids]);
    await db.query('delete from public.posts where id=any($1::uuid[])', [ids]);
    await db.query('delete from public.media_uploads where user_id=$1', [fixture.userId]);
    await db.query('delete from public.media where storage_path like $1', [`${fixture.userId}/%`]);
    await db.query('alter table public.settings disable trigger audit_settings_change; alter table public.settings disable trigger validate_settings_value');
    for (const setting of fixture.originalSettings) await db.query('update public.settings set value=$2::jsonb,version=$3,updated_at=$4,updated_by=$5 where key=$1', [setting.key, JSON.stringify(setting.value), setting.version, setting.updated_at, setting.updated_by]);
    await db.query('delete from public.settings_revisions where actor_id=$1', [fixture.userId]);
    await db.query('alter table public.settings enable trigger audit_settings_change; alter table public.settings enable trigger validate_settings_value');
    await db.query('commit');
  } catch (error) { await db.query('rollback'); throw error; }
  if (managed.rows.length) {
    const removal = await service.storage.from('editorial-media').remove(managed.rows.map(row => row.storage_path));
    ensure(!removal.error, 'Não foi possível remover as mídias QA; fixture preservada.');
  }
  const deletion = await service.auth.admin.deleteUser(fixture.userId);
  ensure(!deletion.error, 'Não foi possível remover a conta QA; fixture preservada.');
  await unlink(fixturePath);
}

async function main(): Promise<void> {
  await validatePrerequisites();
  const credentials = await localCredentials();
  const service = create(credentials.api, credentials.service);
  const anon = create(credentials.api, credentials.publishable);
  const db = new Client({ connectionString: credentials.database, ssl: false });
  await db.connect();
  if (process.argv.includes('--cleanup-qa')) {
    try { await cleanupFixture(service, db, credentials.api, credentials.publishable); console.log('Conta e registros descartáveis QA removidos somente do Docker Benchimol.'); } finally { await db.end(); }
    return;
  }
  ensure(!await fixtureExists(), 'Já existe uma fixture QA aguardando revisão; conclua a revisão e execute supabase:local:qa:clean antes de repetir.');
  const checks: Array<{ name: string; passed: boolean; detail?: string }> = [];
  let activeCheck = 'bootstrap';
  let adminId: string | undefined, outsiderId: string | undefined, postId: string | undefined, mediaId: string | undefined, storagePath: string | undefined;
  let keepAdmin = false;
  const admin = create(credentials.api, credentials.publishable);
  const outsider = create(credentials.api, credentials.publishable);
  const password = randomBytes(24).toString('base64url') + '!Aa9';
  const email = `qa-${randomBytes(8).toString('hex')}@benchimol.test`;
  const originalSettings = (await db.query('select * from public.settings order by key')).rows;
  try {
    const first = await bootstrapDatabase(credentials);
    const second = await bootstrapDatabase(credentials);
    ensure(!second.initialized && first.sha256 === second.sha256, 'Bootstrap idempotente não confirmado.');
    checks.push({ name: 'schema + private bucket + seed + idempotent bootstrap', passed: true });
    activeCheck = 'import';
    const plan = buildImportPlan();
    for (let attempt = 0; attempt < 2; attempt++) {
      await db.query('begin'); try { await applyImport(db, plan); await db.query('commit'); } catch (error) { await db.query('rollback'); throw error; }
    }
    const counts = (await db.query('select (select count(*) from public.posts) as posts,(select count(*) from public.posts where public_path is not null) as canonical,(select count(*) from public.media where wp_id is not null) as media')).rows[0];
    ensure(Number(counts.posts) === 154 && Number(counts.canonical) === 153 && Number(counts.media) === 551, 'Inventário local não reconciliado após repetir importação.');
    checks.push({ name: 'idempotent import: 154 posts / 153 canonical / 551 media', passed: true });

    activeCheck = 'authentication';
    const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'QA local descartável' } });
    ensure(!created.error && created.data.user, 'Criação da conta descartável não concluída.'); adminId = created.data.user.id;
    await db.query('insert into public.administrators(user_id,display_name,active) values($1,$2,true)', [adminId, 'QA local descartável']);
    const other = await service.auth.admin.createUser({ email: `outsider-${randomBytes(8).toString('hex')}@benchimol.test`, password, email_confirm: true });
    ensure(!other.error && other.data.user, 'Criação do usuário sem permissão não concluída.'); outsiderId = other.data.user.id;
    const signed = await admin.auth.signInWithPassword({ email, password });
    const outsiderSigned = await outsider.auth.signInWithPassword({ email: other.data.user.email!, password });
    ensure(!signed.error && !outsiderSigned.error && (await admin.auth.getUser()).data.user?.id === adminId, 'Login e validação de usuário reais não concluídos.');
    const signup = await anon.auth.signUp({ email: `signup-${randomBytes(8).toString('hex')}@benchimol.test`, password });
    if (signup.data.user) await service.auth.admin.deleteUser(signup.data.user.id);
    ensure(Boolean(signup.error) && signup.error?.code === 'signup_disabled', 'Signup público não foi recusado pelo Auth.');
    checks.push({ name: 'real Supabase Auth password login + getUser', passed: true });
    checks.push({ name: 'public Auth signup rejected (signup_disabled)', passed: true });

    activeCheck = 'authorization';
    const publicPosts = await anon.from('posts').select('id', { count: 'exact' });
    const privateAdmins = await anon.from('administrators').select('*');
    const outsiderCreate = await outsider.rpc('create_post', { payload: { slug: `blocked-${randomBytes(4).toString('hex')}`, title: 'Blocked QA' } });
    const deniedLimit = await anon.rpc('consume_login_attempt', { bucket_hash: 'a'.repeat(64), max_attempts: 8 });
    // The CLI grants default table privileges in public. RLS may return zero
    // rows instead of permission_denied; both deny access to administrator data.
    const privateAdminDenied = Boolean(privateAdmins.error) || privateAdmins.data?.length === 0;
    ensure(!publicPosts.error && publicPosts.count === 153 && privateAdminDenied && Boolean(outsiderCreate.error) && Boolean(deniedLimit.error), 'RLS ou privilégios não bloqueiam os acessos esperados.');
    const adminPosts = await admin.from('posts').select('id', { count: 'exact' });
    ensure(!adminPosts.error && adminPosts.count === 154, 'Admin não consegue acessar inventário completo.');
    checks.push({ name: 'anon published-only + outsider denied + private rate RPC denied', passed: true });

    activeCheck = 'editorial mutations';
    const slug = `qa-${randomBytes(6).toString('hex')}`;
    const createPost = await admin.rpc('create_post', { payload: { slug, title: 'QA local descartável', bodyHtml: '<p>Conteúdo de teste local.</p>', publishedAt: new Date().toISOString() } });
    ensure(!createPost.error && createPost.data, 'RPC create_post falhou.'); postId = createPost.data.id;
    const draft = await anon.from('posts').select('id').eq('id', postId!);
    ensure(!draft.error && draft.data?.length === 0, 'Rascunho ficou público.');
    const publish = await admin.rpc('save_post', { post_id: postId, expected_version: 1, payload: { status: 'published' } });
    ensure(!publish.error && publish.data.version === 2, 'Publicação/versionamento falhou.');
    const visible = await anon.from('posts').select('id').eq('id', postId!);
    ensure(visible.data?.length === 1, 'Publicação não ficou visível pelo RLS.');
    const conflict = await admin.rpc('save_post', { post_id: postId, expected_version: 1, payload: { status: 'published' } });
    ensure(Boolean(conflict.error), 'Atualização concorrente não foi rejeitada.');
    const rename = await admin.rpc('save_post', { post_id: postId, expected_version: 2, payload: { status: 'published', slug: `${slug}-edited` } });
    const redirect = await anon.from('redirects').select('to_path').eq('from_path', `/${slug}/`).single();
    ensure(!rename.error && redirect.data?.to_path === `/${slug}-edited/`, 'Mudança de slug não preservou redirect.');
    const trash = await admin.rpc('save_post', { post_id: postId, expected_version: 3, payload: { status: 'trashed' } });
    const withdrawn = await anon.from('posts').select('id').eq('id', postId!);
    ensure(!trash.error && withdrawn.data?.length === 0, 'Lixeira não retirou post do público.');
    const restore = await admin.rpc('restore_post', { post_id: postId, expected_version: 4 });
    ensure(!restore.error && restore.data.status === 'draft' && restore.data.version === 5, 'Restauração não retornou como rascunho.');
    const revisions = await admin.from('post_revisions').select('id').eq('post_id', postId!);
    ensure(revisions.data?.length === 4, 'Histórico imutável de revisões incompleto.');
    checks.push({ name: 'post create/publish/conflict/slug redirect/trash/restore/revisions', passed: true });

    activeCheck = 'Storage';
    mediaId = randomUUID(); storagePath = `${adminId}/${mediaId}.png`;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aop0AAAAASUVORK5CYII=', 'base64');
    const uploadUrl = await admin.storage.from('editorial-media').createSignedUploadUrl(storagePath, { upsert: false });
    ensure(!uploadUrl.error && uploadUrl.data, 'Admin não consegue preparar upload assinado.');
    const upload = await anon.storage.from('editorial-media').uploadToSignedUrl(storagePath, uploadUrl.data.token, png, { contentType: 'image/png' });
    ensure(!upload.error, 'Upload direto com token não concluído.');
    const download = await admin.storage.from('editorial-media').download(storagePath);
    ensure(!download.error && download.data.size === png.length, 'Admin não consegue baixar a mídia privada.');
    const outsiderDownload = await outsider.storage.from('editorial-media').download(storagePath);
    const adminSign = await admin.storage.from('editorial-media').createSignedUrl(storagePath, 60);
    ensure(Boolean(outsiderDownload.error) && Boolean(adminSign.error), 'Storage permitiu leitura/sign fora da política.');
    const media = await admin.from('media').insert({ id: mediaId, url: `/api/media/${mediaId}`, storage_path: storagePath, mime_type: 'image/png', bytes: png.length }).select('id').single();
    ensure(!media.error, 'Registro da mídia não concluído.');
    const attach = await admin.rpc('save_post', { post_id: postId, expected_version: 5, payload: { status: 'published', featuredImage: `/api/media/${mediaId}` } });
    ensure(!attach.error, 'Associação da mídia à publicação não concluída.');
    const publicMedia = await anon.rpc('get_public_media', { media_id: mediaId });
    const anonSign = await anon.storage.from('editorial-media').createSignedUrl(storagePath, 60);
    const signedDownload = await service.storage.from('editorial-media').createSignedUrl(storagePath, 60);
    ensure(!publicMedia.error && publicMedia.data?.length === 1 && Boolean(anonSign.error) && !signedDownload.error && signedDownload.data, 'Media pública ou assinatura privada não respeitou contrato.');
    const fileResponse = await fetch(signedDownload.data.signedUrl);
    ensure(fileResponse.ok && Buffer.from(await fileResponse.arrayBuffer()).equals(png), 'Bytes da URL assinada divergem do upload.');
    const removeReferenced = await admin.storage.from('editorial-media').remove([storagePath]);
    const stillPresent = await service.storage.from('editorial-media').download(storagePath);
    ensure(!stillPresent.error && (Boolean(removeReferenced.error) || removeReferenced.data?.length === 0), 'Mídia referenciada pôde ser excluída.');
    checks.push({ name: 'private Storage signed upload/download + bytes + denied sign/delete', passed: true });

    activeCheck = 'settings';
    const popup = await admin.from('settings').select('*').eq('key', 'popup').single();
    const setting = await admin.rpc('save_settings', { setting_key: 'popup', expected_version: popup.data!.version, payload: { title: 'Aviso QA local', text: 'Teste local descartável.', active: false, startsAt: null, endsAt: null } });
    const publicSetting = await anon.from('settings').select('value').eq('key', 'popup').single();
    ensure(!setting.error && publicSetting.data?.value.text === 'Teste local descartável.', 'Popup não passou pelo banco/RLS.');
    checks.push({ name: 'settings versioned RPC + anonymous public value', passed: true });
    keepAdmin = process.argv.includes('--keep-admin-for-qa');
    if (keepAdmin) {
      await writePrivateFixture({ kind: 'benchimol-disposable-local-qa', userId: adminId, email, password, originalSettings, createdAt: new Date().toISOString() } satisfies Fixture);
    }
  } catch (error) {
    checks.push({ name: activeCheck, passed: false, detail: error instanceof LocalError ? error.message : 'upstream_error_details_suppressed' });
    process.exitCode = 1;
  } finally {
    if (postId) {
      await db.query('delete from public.post_revisions where post_id=$1', [postId]);
      await db.query('delete from public.redirects where post_id=$1', [postId]);
      await db.query('delete from public.posts where id=$1', [postId]);
    }
    if (mediaId) await db.query('delete from public.media where id=$1', [mediaId]);
    if (storagePath) await service.storage.from('editorial-media').remove([storagePath]);
    // Restore only the original settings captured for this run; no user edits
    // occurred concurrently while this new local environment was validated.
    await db.query('begin');
    try {
      await db.query('alter table public.settings disable trigger audit_settings_change; alter table public.settings disable trigger validate_settings_value');
      for (const setting of originalSettings) await db.query('update public.settings set value=$2::jsonb,version=$3,updated_at=$4,updated_by=$5 where key=$1', [setting.key, JSON.stringify(setting.value), setting.version, setting.updated_at, setting.updated_by]);
      if (adminId) await db.query('delete from public.settings_revisions where actor_id=$1', [adminId]);
      await db.query('alter table public.settings enable trigger audit_settings_change; alter table public.settings enable trigger validate_settings_value');
      await db.query('commit');
    } catch { await db.query('rollback'); process.exitCode = 1; }
    await outsider.auth.signOut(); if (outsiderId) await service.auth.admin.deleteUser(outsiderId);
    await admin.auth.signOut(); if (adminId && !keepAdmin) await service.auth.admin.deleteUser(adminId);
    await db.end();
    const report = { generatedAt: new Date().toISOString(), target: 'Docker benchimol-local / 127.0.0.1 only', cli: '2.95.0', passed: !process.exitCode && checks.every(check => check.passed), checks, fixture: keepAdmin ? 'private local admin retained only for browser QA; cleanup required' : 'temporary users and test content removed', production: 'not accessed' };
    await writeFile(resolve(PROJECT_ROOT, 'docs/validation/supabase-local.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report, null, 2));
  }
}
main().catch(() => { console.error('Validação Docker local não concluída. Nenhuma credencial é exibida; consulte docs/validation/supabase-local.json e o guia local.'); process.exitCode = 1; });
