import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import assetMap from '../../data/wordpress/asset-map.json';

const publicRoot = await realpath(path.resolve(process.cwd(), 'public'));
async function localFile(url: string) {
  const file = await realpath(path.resolve(publicRoot, url.replace(/^\//, '')));
  if (!file.startsWith(publicRoot + path.sep)) throw new Error('Image source escapes the public directory');
  return file;
}
async function atomicJson(file: string, value: unknown) {
  const temporary = `${file}.tmp-${process.pid}`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n'); await rename(temporary, file);
}
const dimensions: Record<string, { width: number; height: number }> = {};
const skipped: { path: string; reason: string }[] = [];
for (const url of [...new Set(Object.values(assetMap))].filter(url => /\.(?:png|jpe?g|webp|gif)$/i.test(url)).sort()) {
  try {
    const metadata = await sharp(await localFile(url), { limitInputPixels: 100_000_000 }).metadata();
    if (!metadata.width || !metadata.height) throw new Error('No intrinsic dimensions');
    const rotated = metadata.orientation !== undefined && metadata.orientation >= 5 && metadata.orientation <= 8;
    dimensions[url] = { width: rotated ? metadata.height : metadata.width, height: rotated ? metadata.width : metadata.height };
  } catch (error) {
    skipped.push({ path: url, reason: error instanceof Error ? error.message.replace(publicRoot, '[public]') : 'Cannot inspect image' });
  }
}
const backgrounds: Record<string, { src: string; width: number; height: number; bytes: number; sourceSha256: string; sha256: string; decodedPixelsSha256: string }> = {};
await mkdir(path.join(publicRoot, 'site-images'), { recursive: true });
for (const url of ['/wp-content/uploads/2025/08/slide.png', '/wp-content/uploads/2025/07/937c18f100f7cc149f718438cf4e5bcb1865bba8.png']) {
  const source = await readFile(await localFile(url));
  const generated = await sharp(source, { limitInputPixels: 100_000_000 }).webp({ lossless: true, effort: 6 }).toBuffer();
  const [before, after] = await Promise.all([sharp(source).ensureAlpha().raw().toBuffer(), sharp(generated).ensureAlpha().raw().toBuffer()]);
  if (!before.equals(after)) throw new Error(`Lossless background changed decoded pixels: ${url}`);
  if (generated.length >= source.length) throw new Error(`Derived background is not smaller: ${url}`);
  const digest = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex');
  const hash = digest(generated), src = `/site-images/${hash}.webp`;
  const destination = path.join(publicRoot, 'site-images', `${hash}.webp`);
  const temporary = `${destination}.tmp-${process.pid}`;
  await writeFile(temporary, generated); await rename(temporary, destination);
  const size = dimensions[url]; if (!size) throw new Error('Background dimensions missing');
  backgrounds[url] = { src, ...size, bytes: generated.length, sourceSha256: digest(source), sha256: hash, decodedPixelsSha256: digest(before) };
}
await atomicJson(path.resolve('data/wordpress/image-dimensions.json'), dimensions);
await atomicJson(path.resolve('data/wordpress/derived-backgrounds.json'), backgrounds);
console.log(JSON.stringify({ dimensions: Object.keys(dimensions).length, backgrounds, skipped, sharp: sharp.versions.sharp }));
