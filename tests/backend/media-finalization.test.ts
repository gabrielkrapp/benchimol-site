import { afterEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { finalizeMediaUpload, uploadMedia } from '@/lib/server/media';
const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/auth', () => ({ requireAdmin }));
vi.mock('server-only', () => ({}));
afterEach(() => requireAdmin.mockReset());
const id = '33333333-3333-4333-8333-333333333333', user = '11111111-1111-4111-8111-111111111111';

function uploadedFixture(bytes: Uint8Array) {
  const storagePath = `${user}/${id}.png`;
  const intent = { id, storage_path: storagePath, mime_type: 'image/png', bytes: bytes.length, alt: 'Alt', caption: 'Caption', created_at: new Date().toISOString() };
  let saved: Record<string, unknown> | null = null;
  const inserted = vi.fn((data: Record<string, unknown>) => { saved = data; return media; });
  const media = { select: () => media, eq: () => media, maybeSingle: async () => ({ data: null, error: null }), insert: inserted, single: async () => ({ data: saved, error: null }) };
  const removedIntent = vi.fn(), removedObject = vi.fn(async () => ({ error: null }));
  const intents = { select: () => intents, eq: () => intents, maybeSingle: async () => ({ data: intent, error: null }), delete: () => { removedIntent(); return intents; } };
  requireAdmin.mockResolvedValue({ client: { from: (table: string) => table === 'media' ? media : intents, storage: { from: () => ({ download: async () => ({ data: new Blob([bytes as Uint8Array<ArrayBuffer>]), error: null }), remove: removedObject }) } } });
  return { intent, inserted, removedIntent, removedObject, get saved() { return saved; } };
}

describe('managed upload finalization', () => {
  it('records verified dimensions only after decoding, retaining the original object', async () => {
    const fixture = uploadedFixture(await sharp({ create: { width: 3, height: 2, channels: 3, background: '#fff' } }).png().toBuffer());
    const media = await finalizeMediaUpload(id);
    expect(fixture.saved).toMatchObject({ id, width: 3, height: 2, alt: 'Alt', caption: 'Caption' });
    expect(media).toMatchObject({ id, width: 3, height: 2 });
    expect(fixture.removedIntent).toHaveBeenCalledOnce();
    expect(fixture.removedObject).not.toHaveBeenCalled();
  });
  it('removes a malformed private upload and refuses to make a media record', async () => {
    const fixture = uploadedFixture(Uint8Array.from([137,80,78,71,13,10,26,10]));
    await expect(finalizeMediaUpload(id)).rejects.toMatchObject({ status: 422 });
    expect(fixture.inserted).not.toHaveBeenCalled();
    expect(fixture.removedObject).toHaveBeenCalledWith([fixture.intent.storage_path]);
    expect(fixture.removedIntent).toHaveBeenCalledOnce();
  });
  it('does not access bytes for an expired intent', async () => {
    const fixture = uploadedFixture(new Uint8Array([1]));
    fixture.intent.created_at = new Date(Date.now() - 3 * 3600_000).toISOString();
    await expect(finalizeMediaUpload(id)).rejects.toMatchObject({ code: 'expired_upload' });
    expect(fixture.inserted).not.toHaveBeenCalled();
    expect(fixture.removedObject).not.toHaveBeenCalled();
  });
  it('rejects malformed multipart files before storing any object', async () => {
    const upload = vi.fn();
    requireAdmin.mockResolvedValue({ user: { id: user }, client: { storage: { from: () => ({ upload }) } } });
    const form = new FormData();
    form.set('file', new File([Uint8Array.from([137,80,78,71,13,10,26,10])], 'bad.png', { type: 'image/png' }));
    await expect(uploadMedia(new Request('http://localhost/api/admin/media', { method: 'POST', body: form }))).rejects.toMatchObject({ status: 422 });
    expect(upload).not.toHaveBeenCalled();
  });
});
