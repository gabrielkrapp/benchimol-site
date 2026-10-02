import { describe, expect, it } from 'vitest';
import { parsePostPatch } from '@/lib/domain/validation';

describe('publication date from the admin form', () => {
  it('uses the server default when publishing with an empty date', () => {
    const payload = parsePostPatch({ version:1, status:'published', publishedAt:null });
    expect(payload).not.toHaveProperty('publishedAt');
    expect(payload.status).toBe('published');
  });
  it('preserves an explicit schedule rather than publishing immediately', () => {
    const future = '2030-10-01T12:00:00.000Z';
    expect(parsePostPatch({ version:1, status:'published', publishedAt:future }).publishedAt).toBe(future);
  });
  it('allows a draft date to be cleared explicitly', () => {
    expect(parsePostPatch({ version:1, status:'draft', publishedAt:null })).toHaveProperty('publishedAt',null);
  });
});
