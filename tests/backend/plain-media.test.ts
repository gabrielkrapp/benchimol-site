import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMediaUpload, updateMedia, uploadMedia } from '@/lib/server/media';
import { mapSnapshotPost } from '@/lib/server/snapshot';
import posts from '../../data/wordpress/posts.json';
import sharp from 'sharp';

const requireAdmin = vi.hoisted(() => vi.fn());
vi.mock('@/lib/server/auth', () => ({ requireAdmin }));
vi.mock('server-only', () => ({}));
afterEach(() => requireAdmin.mockReset());
const alt = 'Olho & retina <imagem> &amp;';
const caption = 'Legenda <literal> & clínica\nSegunda linha';
const fields = { alt, caption };

describe('literal media and snapshot fields', () => {
  it('keeps alt and caption literal in the direct-upload intent sent to the external database', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    requireAdmin.mockResolvedValue({ user: { id: 'admin-id' }, client: {
      from: () => ({ insert }),
      storage: { from: () => ({ createSignedUploadUrl: async () => ({ data: { signedUrl: 'https://storage.example/upload', token: 'test-only' }, error: null }) }) },
    } });
    await createMediaUpload({ mimeType: 'image/png', bytes: 8, ...fields });
    expect(insert.mock.calls[0][0]).toMatchObject(fields);
  });

  it('keeps alt and caption literal during media editing and in the returned editorial data', async () => {
    let saved: Record<string, unknown> = {};
    const query = { update: (input: Record<string, unknown>) => { saved = input; return query; }, eq: () => query, select: () => query, maybeSingle: async () => ({ data: { id: 'media-id', url: '/api/media/media-id', bytes: 8, ...saved }, error: null }) };
    requireAdmin.mockResolvedValue({ client: { from: () => query } });
    const result = await updateMedia('media-id', fields);
    expect(saved).toEqual(fields);
    expect(result).toMatchObject(fields);
  });

  it('preserves literal metadata through the existing multipart upload boundary', async () => {
    const multipartFields = { alt, caption: 'Legenda <literal> & clínica' };
    let saved: Record<string, unknown> = {};
    const query = { insert: (input: Record<string, unknown>) => { saved = input; return query; }, select: () => query, single: async () => ({ data: saved, error: null }) };
    requireAdmin.mockResolvedValue({ user: { id: 'admin-id' }, client: {
      from: () => query,
      storage: { from: () => ({ upload: async () => ({ error: null }) }) },
    } });
    const form = new FormData();
    const png = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } }).png().toBuffer();
    form.set('file', new File([png], 'test.png', { type: 'image/png' }));
    form.set('alt', multipartFields.alt); form.set('caption', multipartFields.caption);
    const result = await uploadMedia(new Request('http://localhost/api/admin/media', { method: 'POST', body: form }));
    expect(saved).toMatchObject(multipartFields);
    expect(result).toMatchObject(multipartFields);
  });

  it('preserves literal snapshot titles without modifying the imported source record', () => {
    const record = { ...posts[0], title: 'Consultas & <olhos> &amp;' };
    const mapped = mapSnapshotPost(record);
    expect(mapped.title).toBe('Consultas & <olhos> &amp;');
    expect(record.title).toBe('Consultas & <olhos> &amp;');
    expect(mapped.bodyHtml).toBe(record.contentHtml);
  });
});
