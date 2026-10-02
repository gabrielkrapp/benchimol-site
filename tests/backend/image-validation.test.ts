import { describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { MANAGED_IMAGE_LIMITS, validateManagedImage } from '@/lib/server/image-validation';
vi.mock('server-only', () => ({}));

const create = () => sharp({ create: { width: 3, height: 2, channels: 4, background: '#347abc' } });
describe('managed image decoder boundary', () => {
  it.each(['png', 'jpeg', 'webp', 'gif'] as const)('fully decodes %s while preserving the input bytes', async format => {
    const bytes = await create().toFormat(format).toBuffer(), before = Buffer.from(bytes);
    const result = await validateManagedImage(bytes, `image/${format}`);
    expect(result).toEqual({ extension: format === 'jpeg' ? 'jpg' : format, width: 3, height: 2, frames: 1 });
    expect(bytes.equals(before)).toBe(true);
  });
  it('accepts an animated GIF and validates every frame with a combined pixel limit', async () => {
    const gif = await sharp(Buffer.from([255,0,0, 0,0,255]), { raw: { width: 1, height: 2, channels: 3, pageHeight: 1 } }).gif({ delay: [100, 100] }).toBuffer();
    expect(await validateManagedImage(gif, 'image/gif')).toMatchObject({ width: 1, height: 1, frames: 2 });
  });
  it.each([1, 3, 5, 6, 7, 8])('stores browser-visible JPEG dimensions for EXIF orientation %s without altering bytes', async orientation => {
    const bytes = await create().jpeg().withMetadata({ orientation }).toBuffer(), before = Buffer.from(bytes);
    expect(await validateManagedImage(bytes, 'image/jpeg')).toMatchObject(orientation >= 5 ? { width: 2, height: 3 } : { width: 3, height: 2 });
    expect(bytes.equals(before)).toBe(true);
    expect((await sharp(bytes).metadata()).orientation).toBe(orientation);
  });
  it.each(['png', 'jpeg', 'webp', 'gif'] as const)('rejects truncation and appended garbage for %s', async format => {
    const bytes = await create().toFormat(format).toBuffer();
    await expect(validateManagedImage(bytes.subarray(0, bytes.length - 5), `image/${format}`)).rejects.toThrow();
    await expect(validateManagedImage(Buffer.concat([bytes, Buffer.from('<script>bad</script>')]), `image/${format}`)).rejects.toThrow();
  });
  it('rejects a MIME mismatch and a signature-only former fixture', async () => {
    await expect(validateManagedImage(await create().png().toBuffer(), 'image/jpeg')).rejects.toThrow();
    await expect(validateManagedImage(Uint8Array.from([137,80,78,71,13,10,26,10]), 'image/png')).rejects.toThrow();
  });
  it('rejects empty data and the managed byte limit before invoking the decoder', async () => {
    await expect(validateManagedImage(new Uint8Array(), 'image/png')).rejects.toThrow(/size/);
    await expect(validateManagedImage(new Uint8Array(MANAGED_IMAGE_LIMITS.bytes + 1), 'image/png')).rejects.toThrow(/size/);
  });
  it('rejects excessive dimensions and compressed pixel bombs before raw output', async () => {
    const tooWide = await sharp({ create: { width: MANAGED_IMAGE_LIMITS.dimension + 1, height: 1, channels: 3, background: '#fff' } }).png().toBuffer();
    await expect(validateManagedImage(tooWide, 'image/png')).rejects.toThrow(/dimensions/);
    // Patch a tiny PNG's IHDR dimensions. libvips refuses the pixel limit even
    // though no huge raw image needs to be allocated by this test.
    const bomb = await create().png().toBuffer();
    bomb.writeUInt32BE(7000, 16); bomb.writeUInt32BE(7000, 20);
    await expect(validateManagedImage(bomb, 'image/png')).rejects.toThrow();
  });
  it('rejects corrupt pixel data despite a structurally complete container', async () => {
    const bytes = await create().png().toBuffer();
    const index = bytes.indexOf('IDAT');
    bytes[index + 8] ^= 0xff;
    await expect(validateManagedImage(bytes, 'image/png')).rejects.toThrow();
  });
  it('rejects more than the allowed frames', async () => {
    const pixels = Buffer.from(Array.from({ length: MANAGED_IMAGE_LIMITS.frames + 1 }, (_, frame) => frame % 2 ? [0, 0, 255] : [255, 0, 0]).flat());
    const gif = await sharp(pixels, {
      raw: { width: 1, height: MANAGED_IMAGE_LIMITS.frames + 1, channels: 3, pageHeight: 1 },
    }).gif().toBuffer();
    await expect(validateManagedImage(gif, 'image/gif')).rejects.toThrow(/frame/);
  });
});
