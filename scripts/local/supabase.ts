import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { Client } from 'pg';
import { createServer } from 'node:net';
import { applyImport, buildImportPlan } from '../migration/import-database';
import { bootstrapDatabase, ensureNetwork, generateLocalEnv, localCredentials, PROJECT_ROOT, runCommand, serviceUrls, validatePrerequisites, verifyContainers, awaitHealthyContainers, excludedServices, CLI } from './runtime';
import { LOCAL_NETWORK, LOCAL_PORTS, LOCAL_PROJECT, LocalError } from './guards';

async function verifyFreePort(port: number): Promise<void> {
  const server = createServer();
  await new Promise<void>((accept, reject) => {
    server.once('error', () => reject(new Error(`Porta local ${port} já está ocupada; outro serviço não será parado.`)));
    server.listen(port, '127.0.0.1', () => server.close(error => error ? reject(error) : accept()));
  });
}

export async function main(command: string): Promise<void> {
  if (!['start', 'stop', 'status', 'import'].includes(command)) throw new LocalError('Use start, stop, status ou import. Não há comando remoto nem reset destrutivo.');
  await validatePrerequisites();
  if (command === 'stop') {
    await runCommand(CLI, ['stop', '--project-id', LOCAL_PROJECT, '--workdir', PROJECT_ROOT, '--network-id', LOCAL_NETWORK], 180_000);
    console.log('Supabase Docker Benchimol parado. Volumes e dados locais preservados.');
    return;
  }
  if (command === 'start') {
    await ensureNetwork();
    const existing = (await runCommand('docker', ['ps', '--filter', `label=com.supabase.cli.project=${LOCAL_PROJECT}`, '--format', '{{.Names}}'])).trim();
    // Never stop or reconfigure a pre-existing same-name stack with a different
    // network/bind. Validate before asking the CLI to act on it.
    if (existing) await verifyContainers();
    else await Promise.all(Object.values(LOCAL_PORTS).map(verifyFreePort));
    console.log('Iniciando containers Docker locais Benchimol; o primeiro uso pode baixar imagens.');
    // The classic CLI can stop freshly booting Storage/Studio after the first
    // failed probe. Keep services alive for a bounded warmup; readiness still
    // requires every real Docker health check to pass below, without exceptions.
    await runCommand(CLI, ['start', '--workdir', PROJECT_ROOT, '--network-id', LOCAL_NETWORK, '--exclude', excludedServices, '--ignore-health-check', '--agent', 'no', '--yes'], 900_000);
    try { await awaitHealthyContainers(); } catch (error) {
      // If a CLI/runtime change exposes this project's ports, stop only this
      // new local stack while retaining all volumes. Other projects are untouched.
      await runCommand(CLI, ['stop', '--project-id', LOCAL_PROJECT, '--workdir', PROJECT_ROOT, '--network-id', LOCAL_NETWORK], 180_000);
      throw error;
    }
    const credentials = await localCredentials();
    const bootstrap = await bootstrapDatabase(credentials);
    await generateLocalEnv(credentials);
    console.log(JSON.stringify({ project: LOCAL_PROJECT, services: serviceUrls(), schema: bootstrap.initialized ? 'initialized' : 'unchanged', envFile: '.env.supabase.local', credentials: 'not displayed' }, null, 2));
    return;
  }
  const credentials = await localCredentials();
  if (command === 'import') {
    await bootstrapDatabase(credentials);
    const client = new Client({ connectionString: credentials.database, ssl: false });
    await client.connect();
    const plan = buildImportPlan();
    try {
      await client.query('begin'); await applyImport(client, plan); await client.query('commit');
      console.log(JSON.stringify({ mode: 'local-docker-only', posts: plan.posts.length, publicArticles: plan.posts.filter(post => post.public_path).length, media: plan.media.length }, null, 2));
    } catch (error) { await client.query('rollback'); throw error; } finally { await client.end(); }
  } else {
    const containers = await verifyContainers();
    console.log(JSON.stringify({ project: LOCAL_PROJECT, services: serviceUrls(), containers: containers.map(container => ({ name: container.Name.slice(1), state: container.State.Status, health: container.State.Health?.Status ?? 'not configured' })), credentials: 'not displayed' }, null, 2));
  }
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) main(process.argv[2] ?? '').catch(error => {
  // Only our deliberate safe errors are printable; pg/API errors may include data.
  const safe = error instanceof LocalError ? error.message : 'Operação local não concluída. Banco e outros projetos foram preservados; verifique schemas e configuração.';
  console.error(safe); process.exitCode = 1;
});
