import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { assertOrigin, endpoint, success } from '@/lib/server/http';

const clinic = 'https://clinicadeolhosbenchimol.com.br';
beforeEach(() => vi.stubEnv('NEXT_PUBLIC_SITE_URL', clinic));
afterEach(() => vi.unstubAllEnvs());

describe('origin guard for local Next requests and production writes', () => {
  it.each([
    ['browser localhost with internal IP', 'http://127.0.0.1:3000', 'http://localhost:3000'],
    ['browser IP with internal localhost', 'http://localhost:3000', 'http://127.0.0.1:3000'],
    ['local custom port', 'http://localhost:3002', 'http://127.0.0.1:3002'],
    ['local IP unchanged', 'http://127.0.0.1:3000', 'http://127.0.0.1:3000'],
    ['local hostname unchanged', 'http://localhost:3000', 'http://localhost:3000'],
    ['clinic production origin', clinic, clinic],
  ])('accepts %s', (_name, requestOrigin, browserOrigin) => {
    const request = new Request(`${requestOrigin}/api/auth/login/`, {
      headers: { Origin: browserOrigin, 'Sec-Fetch-Site': 'same-origin' },
    });
    expect(() => assertOrigin(request)).not.toThrow();
  });

  it.each([
    ['missing Origin', 'http://localhost:3000', undefined, 'same-origin'],
    ['opaque Origin', 'http://localhost:3000', 'null', 'same-origin'],
    ['external site', 'http://localhost:3000', 'https://attacker.invalid', 'same-origin'],
    ['different port', 'http://localhost:3000', 'http://127.0.0.1:3001', 'same-origin'],
    ['different protocol', 'http://localhost:3000', 'https://127.0.0.1:3000', 'same-origin'],
    ['hostname suffix', 'http://localhost:3000', 'http://localhost.attacker.invalid:3000', 'same-origin'],
    ['hostname prefix', 'http://localhost:3000', 'http://127.0.0.1.attacker.invalid:3000', 'same-origin'],
    ['userinfo spoof', 'http://localhost:3000', 'http://localhost@attacker.invalid:3000', 'same-origin'],
    ['Origin with path', 'http://localhost:3000', 'http://localhost:3000/admin/', 'same-origin'],
    ['production from loopback', clinic, 'http://localhost:3000', 'same-origin'],
    ['other production domain', 'https://preview.invalid', 'https://preview.invalid', 'same-origin'],
    ['unbound local port', 'http://localhost:3002', 'http://127.0.0.1:3000', 'same-origin'],
    ['cross-site local alias', 'http://localhost:3000', 'http://127.0.0.1:3000', 'cross-site'],
    ['cross-site production', clinic, clinic, 'cross-site'],
  ])('denies %s with a private 403 response', async (_name, requestOrigin, browserOrigin, fetchSite) => {
    const headers: Record<string, string> = { 'Sec-Fetch-Site': fetchSite };
    if (browserOrigin !== undefined) headers.Origin = browserOrigin;
    const request = new Request(`${requestOrigin}/api/auth/login/`, { headers });
    const response = await endpoint(async () => {
      assertOrigin(request);
      return success({ accepted: true });
    });
    expect(response.status).toBe(403);
    expect((await response.json()).error.code).toBe('origin_denied');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it.each(['Host', 'X-Forwarded-Host'])('does not trust %s to authorize an external origin', header => {
    const request = new Request(`${clinic}/api/auth/login/`, {
      headers: { Origin: 'https://attacker.invalid', [header]: 'attacker.invalid', 'Sec-Fetch-Site': 'same-origin' },
    });
    expect(() => assertOrigin(request)).toThrow();
  });
});
