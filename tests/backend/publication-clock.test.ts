import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { invalidatePublication } from '@/lib/server/publication';
import { getAllPublicPosts, getPublicPostByPath } from '@/lib/server/public-repository';
import type { Post } from '@/lib/domain/types';

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
const cutoff = new Date('2026-10-02T00:00:00.000Z');
const future = { id: 'clock-future', legacyPath: '/clock-future/', status: 'published', publishedAt: '2026-10-02T00:00:00.500Z', version: 2 } as Post;
function row(id: string, publishedAt: string) {
  return { id, wp_id: null, slug: id, public_path: `/${id}/`, legacy_path: `/${id}/`, title: id, body_html: '<p>Fixture</p>', excerpt_html: '', author_name: 'Fixture', status: 'published', published_at: publishedAt, created_at: publishedAt, updated_at: publishedAt, version: 2, featured_image: null, featured_alt: '', category_ids: [], tag_ids: [], seo: { title: '', description: '' }, body_edit_mode: 'rich', publication_sync: 'current' };
}

function serve(rows: ReturnType<typeof row>[]) {
  // The real repository/client constructs the REST requests. Only the remote
  // fetch is replaced; filtering obeys the captured request cutoff and advances
  // the local clock while responses are pending.
  vi.stubGlobal('fetch', async (input: string | URL | Request) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const at = Date.parse(url.searchParams.getAll('published_at').find(value => value.startsWith('lte.'))!.slice(4));
    const path = url.searchParams.getAll('public_path').find(value => value.startsWith('eq.'))?.slice(3);
    const visible = rows.filter(item => Date.parse(item.published_at) <= at && (!path || item.public_path === path))
      .sort((a, b) => b.published_at.localeCompare(a.published_at) || a.id.localeCompare(b.id));
    const offset = Number(url.searchParams.get('offset') ?? 0), limit = Number(url.searchParams.get('limit') ?? visible.length);
    await Promise.resolve();
    vi.setSystemTime(new Date('2026-10-02T00:00:01.000Z'));
    return new Response(JSON.stringify(visible.slice(offset, offset + limit)), { status: 200, headers: { 'Content-Type': 'application/json', 'Content-Range': `*/${visible.length}` } });
  });
}

beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(cutoff);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF', 'abcdefghijklmnopqrst');
  vi.stubEnv('ALLOW_PUBLIC_SNAPSHOT', 'false');
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('publication confirmation uses one UTC cutoff', () => {
  it('does not report a pending version when its publication date passes during the confirmation reads', async () => {
    serve([row(future.id, future.publishedAt!)]);
    expect((await invalidatePublication(future)).status).toBe('current');
  });

  it('keeps a future post hidden for an explicit cutoff even when the local clock has advanced', async () => {
    serve([row(future.id, future.publishedAt!)]);
    vi.setSystemTime(new Date('2026-10-02T00:00:01.000Z'));
    expect(await getPublicPostByPath(future.legacyPath, cutoff)).toBeNull();
  });

  it('keeps the archive pagination cutoff stable across responses that cross a publication date', async () => {
    const oldRows = Array.from({ length: 101 }, (_, index) => row(`clock-old-${String(index).padStart(3, '0')}`, '2026-10-01T00:00:00.000Z'));
    serve([...oldRows, row(future.id, future.publishedAt!)]);
    const posts = await getAllPublicPosts();
    expect(posts).toHaveLength(101);
    expect(new Set(posts.map(post => post.id)).size).toBe(101);
    expect(posts.some(post => post.id === future.id)).toBe(false);
  });
});
