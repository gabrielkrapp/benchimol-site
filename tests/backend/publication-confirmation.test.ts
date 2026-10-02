import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revalidatePath } from 'next/cache';
import { invalidatePublication } from '@/lib/server/publication';
import type { Post } from '@/lib/domain/types';

// Next's cache invalidator requires a request-owned async store. Mock only that
// boundary; public reads below exercise the real repository's local snapshot.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const missingPublishedPost = { id: 'not-in-public-archive', legacyPath: '/not-in-public-archive/', status: 'published', publishedAt: '2026-01-01T00:00:00.000Z', version: 2 } as Post;

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', '');
  vi.stubEnv('ALLOW_PUBLIC_SNAPSHOT', 'true');
  vi.mocked(revalidatePath).mockReset();
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('publication confirmation', () => {
  it('invalidates the registered public catch-all route, including taxonomy and author surfaces', async () => {
    expect((await invalidatePublication()).status).toBe('current');
    expect(revalidatePath).toHaveBeenCalledWith('/(public)/[[...path]]', 'page');
    expect(revalidatePath).toHaveBeenCalledWith('/sitemap.xml');
  });

  it('keeps a missing published version pending and reports only the failed confirmation phase on the server', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await invalidatePublication(missingPublishedPost);
    expect(result.status).toBe('pending');
    expect(warn).toHaveBeenCalledWith('[publication] Confirmation failed', { phase: 'post-confirm', code: 'unconfirmed' });
    expect(JSON.stringify(result)).not.toContain('post-confirm');
  });

  it('records a cache invariant code without logging its error message, stack or returning it to the client', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(revalidatePath).mockImplementationOnce(() => { throw Object.assign(new Error('private provider URL and key'), { __NEXT_ERROR_CODE: 'E263' }); });
    const result = await invalidatePublication();
    expect(result.status).toBe('pending');
    expect(warn).toHaveBeenCalledWith('[publication] Confirmation failed', { phase: 'cache', code: 'E263' });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('private provider');
    expect(JSON.stringify(result)).not.toContain('E263');
  });

  it('distinguishes unavailable public reads from a saved version mismatch without logging provider configuration', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://fixture-unavailable.example');
    const result = await invalidatePublication(missingPublishedPost);
    expect(result.status).toBe('pending');
    expect(warn).toHaveBeenCalledWith('[publication] Confirmation failed', { phase: 'post-read', code: 'setup_required' });
    expect(JSON.stringify(warn.mock.calls)).not.toContain('fixture-unavailable');
  });

  it('keeps a settings version mismatch pending with a separate confirmation phase', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await invalidatePublication(undefined, undefined, { key: 'contact', version: 999 })).status).toBe('pending');
    expect(warn).toHaveBeenCalledWith('[publication] Confirmation failed', { phase: 'settings-confirm', code: 'unconfirmed' });
  });
});
