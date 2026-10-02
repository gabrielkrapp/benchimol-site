import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { PATCH, DELETE } from '@/app/api/admin/posts/[id]/route';
import { getAdminPost } from '@/lib/server/admin-repository';
import type { Post } from '@/lib/domain/types';

const database = vi.hoisted(() => ({ rpc: vi.fn() }));
// Authentication and remote reads are external boundaries; the handler,
// request validation, error mapping, JSON responses and post mapping are real.
vi.mock('@/lib/server/auth', () => ({ requireAdmin: async () => ({ client: database }) }));
vi.mock('@/lib/server/admin-repository', () => ({ getAdminPost: vi.fn() }));
vi.mock('@/lib/server/publication', () => ({ invalidatePublication: async () => ({ status: 'current', message: 'confirmed' }), recordPublicationState: async () => true }));

const id = '11111111-1111-4111-8111-111111111111';
const previous: Post = {
  id, wpId: null, slug: 'version-fixture', legacyPath: '/version-fixture/', title: 'Versão atual',
  bodyHtml: '<p>Conteúdo atual</p>', excerptHtml: '', authorName: 'Autoria', status: 'draft',
  publishedAt: null, createdAt: '2026-10-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z', version: 10,
  featuredImage: null, featuredAlt: '', categoryIds: [], tagIds: [], seo: { title: '', description: '' },
  bodyEditMode: 'rich', publicationSync: 'current',
};
const savedRow = {
  id, wp_id: null, slug: 'version-fixture', public_path: '/version-fixture/', legacy_path: '/version-fixture/',
  title: 'Edição aceita', body_html: '<p>Conteúdo atual</p>', excerpt_html: '', author_name: 'Autoria', status: 'draft',
  published_at: null, created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z', version: 11,
  featured_image: null, featured_alt: '', category_ids: [], tag_ids: [], seo: { title: '', description: '' },
  body_edit_mode: 'rich', publication_sync: 'current',
};
function request(method: string, body: unknown) {
  return new Request(`http://127.0.0.1:3000/api/admin/posts/${id}`, {
    method, headers: { Origin: 'http://127.0.0.1:3000', 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
}
const context = () => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(getAdminPost).mockResolvedValue(previous);
  database.rpc.mockReset(); database.rpc.mockResolvedValue({ data: savedRow, error: null });
});
afterEach(() => vi.restoreAllMocks());

describe('post save version preflight and atomic guard', () => {
  it('rejects an already stale edit before sending a mutation to the database', async () => {
    const response = await PATCH(request('PATCH', { version: 9, status: 'draft', title: 'Edição antiga' }), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'version_conflict' } });
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('rejects an already stale trash action without sending the deletion mutation', async () => {
    const response = await DELETE(request('DELETE', { version: 9 }), context());
    expect(response.status).toBe(409);
    expect(database.rpc).not.toHaveBeenCalled();
  });

  it('still sends the expected version to the atomic database guard for a matching read', async () => {
    const response = await PATCH(request('PATCH', { version: 10, status: 'draft', title: 'Edição aceita' }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ data: { version: 11, title: 'Edição aceita' } });
    expect(database.rpc).toHaveBeenCalledWith('save_post', { post_id: id, expected_version: 10, payload: { status: 'draft', title: 'Edição aceita' } });
  });

  it('returns a racing database conflict and logs only its code without provider detail', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    database.rpc.mockResolvedValueOnce({ data: null, error: { code: '40001', message: 'private provider URL and key', details: 'private detail', hint: 'private hint' } });
    const response = await PATCH(request('PATCH', { version: 10, status: 'draft' }), context());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: { code: 'version_conflict' } });
    expect(warn).toHaveBeenCalledWith('[admin-post] Save failed', { code: '40001' });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private');
  });
});
