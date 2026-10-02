import { describe, it, expect, vi, afterEach } from 'vitest';
import { adminRequest, adminRequestDetailed } from '../../src/lib/admin/api';
afterEach(() => vi.unstubAllGlobals());
describe('editorial saves and public confirmation', () => {
  it('retains pending publication when the database save succeeded', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ data: { version: 2 }, meta: { publication: { status: 'pending', message: 'Atualização pública pendente' } } }), { status: 200 }));
    const result = await adminRequestDetailed<{version:number}>('/api/admin/settings/contact', { method: 'PATCH', body: '{}' });
    expect(result.data.version).toBe(2);
    expect(result.meta?.publication?.status).toBe('pending');
    expect(await adminRequest('/api/admin/settings/contact')).toEqual({ version: 2 });
  });
  it('does not report a successful save when another editor changed the version', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ error: { code: 'conflict', message: 'Outra pessoa alterou esta versão.' } }), { status: 409 }));
    await expect(adminRequestDetailed('/api/admin/settings/contact', { method: 'PATCH', body: '{}' })).rejects.toMatchObject({status:409,code:'conflict'});
  });
});
