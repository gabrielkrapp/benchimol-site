import 'server-only';
import sharp from 'sharp';
import { Writable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { validateImage } from '@/lib/domain/validation';

export const MANAGED_IMAGE_LIMITS = { bytes: 10 * 1024 * 1024, dimension: 8192, pixels: 20_000_000, frames: 100, seconds: 10 } as const;

function assertContainerEnd(bytes: Uint8Array, extension: string) {
  if (extension === 'png') {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    let offset = 8;
    while (offset + 12 <= bytes.length) {
      const length = view.getUint32(offset), end = offset + length + 12;
      if (end > bytes.length) break;
      const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
      if (type === 'IEND') {
        if (length === 0 && end === bytes.length) return;
        break;
      }
      offset = end;
    }
  } else if (extension === 'webp') {
    if (bytes.length >= 12 && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.length) return;
  } else if (extension === 'gif') {
    if (bytes[bytes.length - 1] === 0x3b) return;
  } else if (extension === 'jpg') {
    if (bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) return;
  }
  throw new Error('Invalid or trailing image container');
}

/** Decode new managed uploads only. Discard decoded pixels; uploaded bytes stay unchanged. */
export async function validateManagedImage(bytes: Uint8Array, mime: string) {
  if (!bytes.length || bytes.length > MANAGED_IMAGE_LIMITS.bytes) throw new Error('Invalid image size');
  const extension = validateImage(bytes, mime);
  assertContainerEnd(bytes, extension);
  const image = sharp(bytes, { failOn: 'warning', limitInputPixels: MANAGED_IMAGE_LIMITS.pixels, limitInputChannels: 4, animated: true, sequentialRead: true });
  const metadata = await image.metadata();
  const expectedFormat = extension === 'jpg' ? 'jpeg' : extension;
  const width = metadata.width, height = metadata.pageHeight ?? metadata.height, frames = metadata.pages ?? 1;
  if (metadata.format !== expectedFormat || !width || !height || width > MANAGED_IMAGE_LIMITS.dimension || height > MANAGED_IMAGE_LIMITS.dimension ||
      frames > MANAGED_IMAGE_LIMITS.frames || width * height * frames > MANAGED_IMAGE_LIMITS.pixels) {
    image.destroy(); throw new Error('Invalid image dimensions, format or frame count');
  }
  let decodedBytes = 0;
  const discard = new Writable({ write(chunk, _encoding, done) {
    decodedBytes += chunk.length;
    done(decodedBytes <= MANAGED_IMAGE_LIMITS.pixels * 4 ? undefined : new Error('Decoded image exceeds limit'));
  } });
  // metadata() alone does not decompress pixel data. The bounded raw stream does.
  await pipeline(image.timeout({ seconds: MANAGED_IMAGE_LIMITS.seconds }).toColourspace('srgb').ensureAlpha().raw(), discard);
  if (!decodedBytes) throw new Error('Missing image pixels');
  // Browsers apply EXIF orientation while metadata.width/height describe the
  // encoded raster. Store displayed dimensions without rotating/re-encoding bytes.
  const transpose = metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8;
  return { extension, width: transpose ? height : width, height: transpose ? width : height, frames };
}
