import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { parseEnv } from 'node:util';
import { resolve } from 'node:path';
import { assertLocalUrl, LOCAL_ENV_FILE, LocalError } from './guards';
import { PROJECT_ROOT, verifyContainers } from './runtime';

async function main() {
  await verifyContainers();
  const local = parseEnv(await readFile(resolve(PROJECT_ROOT, LOCAL_ENV_FILE), 'utf8'));
  assertLocalUrl(local.NEXT_PUBLIC_SUPABASE_URL ?? '', 'api');
  assertLocalUrl(local.DATABASE_URL ?? '', 'database');
  if (!local.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || !local.SUPABASE_SECRET_KEY || (local.LOGIN_RATE_SECRET?.length ?? 0) < 32) throw new Error('Env Docker local incompleto.');
  const args = process.argv.slice(2);
  const portIndex = args.findIndex(value => value === '--port' || value === '-p');
  const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 3000;
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Porta Next.js inválida.');
  local.NEXT_PUBLIC_SITE_URL = `http://127.0.0.1:${port}`;
  // Let Next load .env.local normally, while these explicit child env values
  // take precedence. The cloud configuration file is never edited or copied.
  const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev', '--', ...args], {
    cwd: PROJECT_ROOT, stdio: 'inherit', env: { ...process.env, ...local, NODE_ENV: 'development', BENCHIMOL_LOCAL_SUPABASE: 'true' },
  });
  child.once('exit', (code, signal) => { if (signal) process.kill(process.pid, signal); else process.exitCode = code ?? 1; });
  child.once('error', () => { console.error('Não foi possível iniciar o Next.js local.'); process.exitCode = 1; });
  for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => child.kill(signal));
}
main().catch(error => { console.error(error instanceof LocalError ? error.message : 'Supabase Docker local indisponível ou configuração inválida. Execute npm run supabase:local:start.'); process.exitCode = 1; });
