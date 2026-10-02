import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { brotliCompressSync, constants } from 'node:zlib';
import { institutionalPages, galleries, templates, approvedCustomCss, type CapturedTemplate } from './catalog';
import { homeTemplate, pageTemplate } from './render';
import { capturedStyles } from './styles';
import { stylesheetKey } from './style-key';
import type { CompiledStylesheet } from './stylesheets';

const outputDirectory = path.resolve(process.cwd(), 'public/site-styles');
await mkdir(outputDirectory, { recursive: true });
const definitions: CapturedTemplate[] = [homeTemplate(), ...institutionalPages.map(pageTemplate), ...galleries.map(pageTemplate), templates.blog, templates.galleryArchive, templates.article, templates.taxonomy, templates.sample];
const manifest: Record<string, CompiledStylesheet> = {}, assets = new Map<string, { bytes: number; brotliBytes: number }>();
const checked = new Set<string>();
for (const definition of definitions) {
  for (const asset of definition.cssPaths) {
    if (checked.has(asset)) continue;
    const file = path.resolve(process.cwd(), 'public', asset.replace(/^\//, ''));
    if (!file.startsWith(path.resolve(process.cwd(), 'public') + path.sep)) throw new Error('Invalid source CSS path');
    const css = await readFile(file, 'utf8');
    if (/\.postid-[\w-]+/.test(css)) throw new Error(`Per-post stylesheet selector requires an explicit template variant: ${asset}`);
    checked.add(asset);
  }
  if (definition.inlineStyles.some(css => /\.postid-[\w-]+/.test(css)) || /\.postid-[\w-]+/.test(approvedCustomCss)) throw new Error('Per-post inline CSS requires an explicit template variant');
  const key = stylesheetKey(definition, approvedCustomCss);
  if (manifest[key]) continue;
  const css = await capturedStyles(definition.cssPaths, [...definition.inlineStyles, approvedCustomCss], definition.bodyClasses);
  const hash = createHash('sha256').update(css).digest('hex'), href = `/site-styles/${hash}.css`, bytes = Buffer.byteLength(css);
  const destination = path.join(outputDirectory, `${hash}.css`);
  let current: string | null = null;
  try { current = await readFile(destination, 'utf8'); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  if (current !== css) {
    const temporary = `${destination}.tmp-${process.pid}`;
    await writeFile(temporary, css, 'utf8'); await rename(temporary, destination);
  }
  manifest[key] = { href, bytes, sha256: hash };
  if (!assets.has(href)) assets.set(href, { bytes, brotliBytes: brotliCompressSync(css, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).byteLength });
}
const manifestPath = path.resolve(process.cwd(), 'src/lib/public/style-manifest.json');
const temporaryManifest = `${manifestPath}.tmp-${process.pid}`;
await writeFile(temporaryManifest, JSON.stringify(manifest, null, 2) + '\n');
await rename(temporaryManifest, manifestPath);
// Historical hash assets remain valid for open tabs and the user-controlled dev
// server while it moves to the new manifest. Cleanup is a separate offline task.
console.log(JSON.stringify({ templates: Object.keys(manifest).length, files: assets.size, totalBytes: [...assets.values()].reduce((sum, file) => sum + file.bytes, 0), largestBytes: Math.max(...[...assets.values()].map(file => file.bytes)), largestBrotliBytes: Math.max(...[...assets.values()].map(file => file.brotliBytes)) }));
