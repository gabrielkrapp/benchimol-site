import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTaxonomies } from '@/lib/server/public-repository';

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
function configured() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abcdefghijklmnopqrst.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_fixture');
  vi.stubEnv('SUPABASE_CLINIC_PROJECT_REF', 'abcdefghijklmnopqrst');
  vi.stubEnv('ALLOW_PUBLIC_SNAPSHOT', 'false');
}
describe('narrow public taxonomy reads', () => {
  it('counts all pages with public predicates without requesting post HTML or SEO', async () => {
    configured(); const requests: URL[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request) => {
      const url = new URL(input instanceof Request ? input.url : String(input)); requests.push(url);
      const isPosts = url.pathname.endsWith('/posts');
      const first = url.searchParams.get('offset') === '0';
      const rows = isPosts ? (first ? Array.from({ length: 1000 }, (_, id) => ({ id, category_ids: [6], tag_ids: [] })) : [{ id: 1000, category_ids: [6, 6], tag_ids: [8] }])
        : [{ wp_id: 6, slug: 'oftalmologia', name: 'Oftalmologia', kind: 'category' }, { wp_id: 8, slug: 'exame', name: 'Exame', kind: 'tag' }, { wp_id: 9, slug: 'sem-post', name: 'Sem post', kind: 'category' }];
      return new Response(JSON.stringify(rows), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));
    const terms = await getTaxonomies();
    expect(terms.categories.map(item => item.count)).toEqual([1001, 0]); expect(terms.tags[0].count).toBe(1);
    const posts = requests.filter(url => url.pathname.endsWith('/posts'));
    expect(posts).toHaveLength(2);
    for (const url of posts) {
      expect(url.searchParams.get('select')).toBe('id,category_ids,tag_ids');
      expect(url.searchParams.get('status')).toBe('eq.published');
      expect(url.searchParams.get('public_path')).toBe('not.is.null');
      expect(url.searchParams.getAll('published_at')).toEqual(expect.arrayContaining(['not.is.null', expect.stringMatching(/^lte\./)]));
      expect(url.searchParams.get('order')).toBe('id.asc');
    }
    expect(requests.find(url => url.pathname.endsWith('/taxonomies'))?.searchParams.get('select')).toBe('wp_id,slug,name,kind');
  });
  it('fails closed when taxonomy membership cannot be read', async () => {
    configured();
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ message: 'provider unavailable' }), { status: 503, headers: { 'Content-Type': 'application/json' } })));
    await expect(getTaxonomies()).rejects.toMatchObject({ status: 503 });
  });
});
