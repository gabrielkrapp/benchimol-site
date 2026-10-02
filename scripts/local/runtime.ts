import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { promisify } from 'node:util';
import { readFile, writeFile, chmod, mkdir, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { Client } from 'pg';
import { assertLocalUrl, assertLoopbackBindings, validateLocalConfig, LOCAL_ENV_FILE, LOCAL_NETWORK, LOCAL_PROJECT, LOCAL_PORTS, LocalError } from './guards';

const execute = promisify(execFile);
export const PROJECT_ROOT = resolve(new URL('../../', import.meta.url).pathname);
export const CLI = process.env.SUPABASE_CLI_BIN || (existsSync(resolve(PROJECT_ROOT, 'node_modules/.bin/supabase')) ? resolve(PROJECT_ROOT, 'node_modules/.bin/supabase') : 'supabase');
export const excludedServices = 'realtime,imgproxy,edge-runtime,logflare,vector,supavisor';

export async function runCommand(binary: string, args: string[], timeout = 60_000): Promise<string> {
  try {
    const result = await execute(binary, args, { cwd: PROJECT_ROOT, timeout, maxBuffer: 32 * 1024 * 1024, env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1' } });
    return result.stdout;
  } catch (error) {
    // start/status can emit service keys and database passwords. Never forward
    // raw stdout/stderr or the child-process exception to a console/report.
    const code = (error as { code?: string | number }).code ?? 'unknown';
    throw new LocalError(`Comando local ${binary.split('/').at(-1)} ${args[0]} falhou (${code}); detalhes com credenciais foram suprimidos.`);
  }
}

export async function validatePrerequisites(): Promise<void> {
  await validateLocalConfig(await readFile(resolve(PROJECT_ROOT, 'supabase/config.toml'), 'utf8'));
  const version = (await runCommand(CLI, ['--version'])).trim();
  if (version !== '2.95.0') throw new LocalError('Este ambiente foi validado com Supabase CLI 2.95.0. Use a dependência fixa do projeto ou revise a compatibilidade antes de atualizar.');
  await runCommand('docker', ['info', '--format', '{{.ServerVersion}}']);
}

export async function ensureNetwork(): Promise<void> {
  const names = (await runCommand('docker', ['network', 'ls', '--format', '{{.Name}}'])).split('\n');
  if (!names.includes(LOCAL_NETWORK)) {
    await runCommand('docker', ['network', 'create', '--driver', 'bridge', '--opt', 'com.docker.network.bridge.host_binding_ipv4=127.0.0.1', '--label', 'com.benchimol.local=true', LOCAL_NETWORK]);
  }
  const [network] = JSON.parse(await runCommand('docker', ['network', 'inspect', LOCAL_NETWORK]));
  if (network.Driver !== 'bridge' || network.Options?.['com.docker.network.bridge.host_binding_ipv4'] !== '127.0.0.1' || network.Labels?.['com.benchimol.local'] !== 'true') {
    throw new LocalError('Rede Benchimol existente não corresponde à configuração local segura; não foi alterada.');
  }
}

export async function verifyContainers(): Promise<Array<{ Name: string; Image: string; State: { Status: string; Health?: { Status: string } } }>> {
  const candidates = (await runCommand('docker', ['ps', '--filter', 'label=com.supabase.cli.project=benchimol-local', '--format', '{{.Names}}'])).trim().split('\n').filter(Boolean);
  if (!candidates.length) throw new LocalError('Containers Benchimol não estão em execução. Execute npm run supabase:local:start.');
  if (candidates.some(name => !name.endsWith(`_${LOCAL_PROJECT}`))) throw new LocalError('Identificação de container inesperada.');
  const containers = JSON.parse(await runCommand('docker', ['inspect', ...candidates]));
  assertLoopbackBindings(containers);
  for (const service of ['db', 'kong', 'auth', 'rest', 'storage', 'pg_meta', 'studio', 'inbucket']) {
    const container = containers.find((entry: { Name: string }) => entry.Name === `/supabase_${service}_${LOCAL_PROJECT}`);
    if (!container || container.State?.Status !== 'running' || (container.State.Health && container.State.Health.Status !== 'healthy')) {
      throw new LocalError(`Serviço Docker Benchimol ${service} ainda não está saudável. Nenhuma conexão da aplicação foi liberada.`);
    }
  }
  return containers;
}

export async function awaitHealthyContainers(timeout = 120_000): Promise<void> {
  const deadline = Date.now() + timeout;
  let lastError: unknown;
  do {
    try { await verifyContainers(); return; } catch (error) {
      lastError = error;
      // Network/binding errors are never a warming-up condition.
      if (!(error instanceof LocalError) || !error.message.startsWith('Serviço Docker Benchimol ')) throw error;
    }
    await new Promise(accept => setTimeout(accept, 3_000));
  } while (Date.now() < deadline);
  throw lastError;
}

export type LocalCredentials = { api: string; database: string; publishable: string; service: string };
export async function localCredentials(): Promise<LocalCredentials> {
  await verifyContainers();
  const state = JSON.parse(await runCommand(CLI, ['status', '--workdir', PROJECT_ROOT, '--network-id', LOCAL_NETWORK, '--output', 'json']));
  const api = state.API_URL ?? state.api_url;
  const database = state.DB_URL ?? state.db_url;
  assertLocalUrl(api, 'api'); assertLocalUrl(database, 'database');
  const publishable = state.PUBLISHABLE_KEY || state.ANON_KEY;
  const service = state.SECRET_KEY || state.SERVICE_ROLE_KEY;
  if (typeof publishable !== 'string' || !publishable || typeof service !== 'string' || !service) throw new LocalError('A CLI não forneceu as credenciais locais esperadas.');
  return { api, database, publishable, service };
}

export async function generateLocalEnv(credentials: LocalCredentials): Promise<string> {
  assertLocalUrl(credentials.api, 'api'); assertLocalUrl(credentials.database, 'database');
  const destination = resolve(PROJECT_ROOT, LOCAL_ENV_FILE);
  try {
    const previous = await readFile(destination, 'utf8');
    const expected = previous.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1];
    if (!expected) throw new LocalError('Env local existente não é reconhecido e não será sobrescrito.');
    assertLocalUrl(expected, 'api');
    // Do not silently rotate LOGIN_RATE_SECRET or replace a user's local edits.
    return destination;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  const values = {
    NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3000',
    NEXT_PUBLIC_SUPABASE_URL: credentials.api,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: credentials.publishable,
    SUPABASE_SECRET_KEY: credentials.service,
    SUPABASE_SERVICE_ROLE_KEY: '',
    DATABASE_URL: credentials.database,
    SUPABASE_DB_CA_FILE: '',
    SUPABASE_CLINIC_PROJECT_REF: '',
    ALLOW_PUBLIC_SNAPSHOT: 'false',
    ALLOW_LOCAL_SNAPSHOT: 'false',
    AUTH_RECOVERY_ENABLED: 'false',
    LOGIN_RATE_SECRET: randomBytes(32).toString('hex'),
  };
  for (const value of Object.values(values)) if (/[\r\n]/.test(value)) throw new LocalError('Valor de configuração inválido.');
  await writeFile(destination, '# Generated local Docker credentials. Never commit or use remotely.\n' + Object.entries(values).map(([key, value]) => `${key}=${value}`).join('\n') + '\n', { mode: 0o600, flag: 'wx' });
  await chmod(destination, 0o600);
  return destination;
}

/** Local bootstrap is not a cloud migration. Hash mismatch refuses any change. */
export async function bootstrapDatabase(credentials: LocalCredentials): Promise<{ initialized: boolean; sha256: string }> {
  assertLocalUrl(credentials.database, 'database');
  const files = ['01_editorial.sql', '02_mutations.sql', '03_storage.sql', '04_login_limit.sql'];
  const schema = await Promise.all(files.map(file => readFile(resolve(PROJECT_ROOT, 'supabase/schemas', file), 'utf8')));
  const sha256 = createHash('sha256').update(files.map((file, i) => `${file}\n${schema[i]}\n`).join('')).digest('hex');
  const client = new Client({ connectionString: credentials.database, ssl: false });
  await client.connect();
  try {
    await client.query('begin');
    await client.query("select pg_advisory_xact_lock(hashtext('benchimol-local-bootstrap'))");
    const metadata = await client.query("select to_regclass('private.local_schema_bootstrap') as ledger,to_regclass('public.posts') as posts");
    if (metadata.rows[0].ledger) {
      const previous = await client.query('select sha256 from private.local_schema_bootstrap where singleton=true');
      if (previous.rows[0]?.sha256 !== sha256) throw new LocalError('Schemas mudaram após o bootstrap. Banco local preservado; gere/revise uma migração antes de alterar.');
      if (!metadata.rows[0].posts) throw new LocalError('Ledger local existe, mas o schema está incompleto; nenhuma correção automática foi aplicada.');
      await client.query('commit');
      return { initialized: false, sha256 };
    }
    const existing = await client.query("select count(*)::integer as total from pg_tables where schemaname in('public','private')");
    if (existing.rows[0].total > 0) throw new LocalError('Banco local já contém tabelas e não possui o ledger Benchimol. Não foi alterado.');
    for (const sql of schema) await client.query(sql);
    await client.query(await readFile(resolve(PROJECT_ROOT, 'supabase/seed.sql'), 'utf8'));
    await client.query('create table private.local_schema_bootstrap(singleton boolean primary key default true check(singleton),sha256 text not null,initialized_at timestamptz not null default now())');
    await client.query('alter table private.local_schema_bootstrap enable row level security; revoke all on private.local_schema_bootstrap from public,anon,authenticated');
    await client.query('insert into private.local_schema_bootstrap(singleton,sha256) values(true,$1)', [sha256]);
    await client.query("notify pgrst,'reload schema'");
    await client.query('commit');
    return { initialized: true, sha256 };
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally { await client.end(); }
}

export async function writePrivateFixture(value: unknown): Promise<string> {
  const directory = resolve(PROJECT_ROOT, '.local-supabase');
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const path = resolve(directory, 'qa-fixture.json');
  await writeFile(path, JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' });
  await chmod(path, 0o600);
  return path;
}

export async function fixtureExists(): Promise<boolean> {
  try { await access(resolve(PROJECT_ROOT, '.local-supabase/qa-fixture.json')); return true; } catch { return false; }
}

export function serviceUrls() {
  return { api: `http://127.0.0.1:${LOCAL_PORTS.api}`, studio: `http://127.0.0.1:${LOCAL_PORTS.studio}`, mailpit: `http://127.0.0.1:${LOCAL_PORTS.mail}`, database: `127.0.0.1:${LOCAL_PORTS.database}` };
}
