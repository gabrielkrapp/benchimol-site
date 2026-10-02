import { describe, expect, it } from 'vitest';
import config from '../../next.config';

describe('security response policy', () => {
  it('sets global headers and an enforced admin-only anti-frame policy', async () => {
    const rules = await config.headers!();
    const global = Object.fromEntries(rules.find(rule => rule.source === '/:path*')!.headers.map(header => [header.key, header.value]));
    const admin = Object.fromEntries(rules.find(rule => rule.source === '/admin/:path*')!.headers.map(header => [header.key, header.value]));
    expect(global['X-Content-Type-Options']).toBe('nosniff');
    expect(global['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(global['Permissions-Policy']).toContain('camera=()');
    expect(global['Content-Security-Policy']).toBeUndefined();
    expect(global['Content-Security-Policy-Report-Only']).toContain("script-src 'self' 'unsafe-inline'");
    expect(global['Content-Security-Policy-Report-Only']).toContain('https://jjrzmuuwuvxcsnwqzvxf.supabase.co');
    expect(global['Content-Security-Policy-Report-Only']).toContain('https://www.youtube-nocookie.com');
    expect(global['Content-Security-Policy-Report-Only']).toContain('https://www.google.com');
    expect(admin['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    expect(admin['X-Frame-Options']).toBe('DENY');
    expect(admin['Referrer-Policy']).toBe('no-referrer');
    expect(admin['Cache-Control']).toBe('private, no-store');
  });
});
