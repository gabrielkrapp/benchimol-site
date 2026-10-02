export const LOCAL_PROJECT = 'benchimol-local';
export const LOCAL_NETWORK = 'benchimol-local-loopback';
export const LOCAL_PORTS = { api: 54351, database: 54352, studio: 54353, mail: 54354 } as const;
export const LOCAL_ENV_FILE = '.env.supabase.local';
/** Deliberate messages safe for logs; native CLI/PG/JSON errors stay private. */
export class LocalError extends Error {}

/** Exact local destinations; no supplied URL can select a hosted project. */
export function assertLocalUrl(value: string, kind: 'api' | 'database'): URL {
  const url = new URL(value);
  const protocol = kind === 'api' ? 'http:' : 'postgresql:';
  const postgresProtocol = kind === 'database' && url.protocol === 'postgres:';
  if (url.hostname !== '127.0.0.1' || url.port !== String(LOCAL_PORTS[kind]) ||
      (url.protocol !== protocol && !postgresProtocol) || url.search || url.hash ||
      (kind === 'api' && (url.username || url.password || url.pathname !== '/')) ||
      (kind === 'database' && (url.username !== 'postgres' || url.pathname !== '/postgres'))) {
    throw new LocalError('Destino recusado: este comando aceita somente o Supabase Docker Benchimol em 127.0.0.1.');
  }
  return url;
}

export function assertLoopbackBindings(containers: Array<{ Name: string; HostConfig: { PortBindings?: Record<string, Array<{ HostIp: string; HostPort: string }> | null> }; NetworkSettings?: { Networks?: Record<string, unknown>; Ports?: Record<string, Array<{ HostIp: string; HostPort: string }> | null> } }>): void {
  if (!containers.length) throw new LocalError('Nenhum container local Benchimol encontrado.');
  for (const container of containers) {
    if (!container.Name.endsWith(`_${LOCAL_PROJECT}`) || !container.NetworkSettings?.Networks?.[LOCAL_NETWORK]) {
      throw new LocalError('Container ou rede fora do ambiente Benchimol.');
    }
    // Docker resolves an empty HostConfig HostIp via the network's default bind.
    // NetworkSettings.Ports is the effective mapping of the running container.
    for (const bindings of Object.values(container.NetworkSettings?.Ports ?? container.HostConfig.PortBindings ?? {})) {
      for (const binding of bindings ?? []) {
        if (binding.HostIp !== '127.0.0.1') throw new LocalError('Porta Docker fora do loopback; inicialização recusada.');
      }
    }
  }
}

export function validateLocalConfig(config: string): void {
  const section = (name: string) => config.match(new RegExp(`^\\[${name.replaceAll('.', '\\.') }\\]\\s*\\n([\\s\\S]*?)(?=^\\[|$(?![\\s\\S]))`, 'm'))?.[1] ?? '';
  if (!/^project_id\s*=\s*"benchimol-local"\s*$/m.test(config)) throw new LocalError('project_id local deve ser benchimol-local.');
  for (const [name, port] of [['api', LOCAL_PORTS.api], ['db', LOCAL_PORTS.database], ['studio', LOCAL_PORTS.studio], ['inbucket', LOCAL_PORTS.mail]] as const) {
    if (!new RegExp(`^port\\s*=\\s*${port}\\s*$`, 'm').test(section(name))) throw new LocalError(`Porta local ${name} inesperada.`);
  }
  if (!/^enabled\s*=\s*false\s*$/m.test(section('db.seed'))) throw new LocalError('O seed local deve ser aplicado pelo bootstrap após os schemas.');
  if (!/^enable_signup\s*=\s*false\s*$/m.test(section('auth'))) throw new LocalError('Signup público deve permanecer desativado.');
  if (!/^enable_signup\s*=\s*true\s*$/m.test(section('auth.email'))) throw new LocalError('Provider de e-mail deve estar habilitado para login por senha; o signup global continua desativado.');
}
