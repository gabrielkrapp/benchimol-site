import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { assertLocalUrl, assertLoopbackBindings, validateLocalConfig, LOCAL_NETWORK } from '../../scripts/local/guards';

describe('Supabase Docker local destination guards', () => {
  it('accepts only the dedicated loopback API and database', () => {
    expect(assertLocalUrl('http://127.0.0.1:54351', 'api').hostname).toBe('127.0.0.1');
    expect(assertLocalUrl('postgresql://postgres:local-only@127.0.0.1:54352/postgres', 'database').port).toBe('54352');
    for (const value of ['https://clinic.supabase.co', 'http://localhost:54351', 'http://127.0.0.1:54321', 'http://127.0.0.1:54351/path', 'http://user:password@127.0.0.1:54351']) {
      expect(() => assertLocalUrl(value, 'api')).toThrow();
    }
    for (const value of ['postgresql://postgres:password@db.clinic.supabase.co/postgres', 'postgresql://postgres:password@127.0.0.1:54322/postgres', 'postgresql://postgres:password@127.0.0.1:54352/postgres?host=remote']) {
      expect(() => assertLocalUrl(value, 'database')).toThrow();
    }
  });
  it('rejects ports on other host interfaces and other projects', () => {
    const base = { Name: '/supabase_kong_benchimol-local', HostConfig: { PortBindings: { '8000/tcp': [{ HostIp: '127.0.0.1', HostPort: '54351' }] } }, NetworkSettings: { Networks: { [LOCAL_NETWORK]: {} } } };
    expect(() => assertLoopbackBindings([base])).not.toThrow();
    expect(() => assertLoopbackBindings([{ ...base, Name: '/supabase_kong_lifewallet' }])).toThrow();
    expect(() => assertLoopbackBindings([{ ...base, HostConfig: { PortBindings: { '8000/tcp': [{ HostIp: '0.0.0.0', HostPort: '54351' }] } } }])).toThrow();
    expect(() => assertLoopbackBindings([])).toThrow();
  });
  it('refuses altered project, ports and eager seed configuration', () => {
    const source = readFileSync('supabase/config.toml', 'utf8');
    expect(() => validateLocalConfig(source)).not.toThrow();
    expect(() => validateLocalConfig(source.replace('benchimol-local', 'another-project'))).toThrow();
    expect(() => validateLocalConfig(source.replace('54351', '54321'))).toThrow();
    expect(() => validateLocalConfig(source.replace('[db.seed]\nenabled = false', '[db.seed]\nenabled = true'))).toThrow();
    expect(() => validateLocalConfig(source.replace('enable_signup = true', 'enable_signup = false'))).toThrow();
    expect(() => validateLocalConfig(source.replace('enable_signup = false', 'enable_signup = true'))).toThrow();
  });
});
