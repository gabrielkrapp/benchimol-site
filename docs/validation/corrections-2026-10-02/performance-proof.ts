import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { brotliCompressSync, constants } from 'node:zlib';
import postcss from 'postcss';
import { institutionalPages, galleries, templates, approvedCustomCss } from '../../../src/lib/public/catalog';
import { homeTemplate, pageTemplate } from '../../../src/lib/public/render';
import { capturedStyles } from '../../../src/lib/public/styles';
import { stylesheetKey } from '../../../src/lib/public/style-key';
import { optimizeCapturedCss, capturedCssSemanticSignature } from '../../../src/lib/public/optimize-css';
import backgrounds from '../../../data/wordpress/derived-backgrounds.json';

const beforeManifest = JSON.parse(await readFile('docs/validation/corrections-2026-10-02/performance-before-manifest.json', 'utf8'));
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const definitions = [{ path: '/', template: homeTemplate() }, ...institutionalPages.map(page => ({ path: page.path, template: pageTemplate(page) })), ...galleries.map(page => ({ path: page.path, template: pageTemplate(page) })), ...Object.entries({ blog: templates.blog, galleryArchive: templates.galleryArchive, article: templates.article, taxonomy: templates.taxonomy, sample: templates.sample }).map(([name, template]) => ({ path: name, template }))];
const results: unknown[] = [], checked = new Set<string>(); let beforeBytes = 0, afterBytes = 0, removedRules = 0;
for (const { path, template } of definitions) {
  const key = stylesheetKey(template, approvedCustomCss); if (checked.has(key)) continue; checked.add(key);
  const before = beforeManifest[key]; if (!before) throw new Error(`No baseline CSS for ${path}`);
  const original = await readFile(`public${before.href}`, 'utf8');
  if (digest(original) !== before.sha256) throw new Error('Baseline CSS hash mismatch');
  const normalized = Object.entries(backgrounds).reduce((css, [url, derived]) => css.replaceAll(url, derived.src), original);
  const unoptimized = await capturedStyles(template.cssPaths, [...template.inlineStyles, approvedCustomCss], template.bodyClasses, false);
  if (normalized !== unoptimized) throw new Error(`CSS source changed beyond the approved background derivative: ${path}`);
  const { css, removedRules: removed } = optimizeCapturedCss(unoptimized);
  const parsed = postcss.parse(css); let rules = 0, declarations = 0;
  parsed.walkRules(() => rules++); parsed.walkDecls(() => declarations++);
  const signature = capturedCssSemanticSignature(unoptimized);
  if (signature !== capturedCssSemanticSignature(css)) throw new Error('Semantic CSS mismatch');
  const beforeBrotli = brotliCompressSync(original, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length;
  const afterBrotli = brotliCompressSync(css, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).length;
  const after = { href: `/site-styles/${digest(css)}.css`, sha256: digest(css), bytes: Buffer.byteLength(css), brotliQuality5Bytes: afterBrotli, rules, declarations };
  results.push({ path, key, before: { ...before, brotliQuality5Bytes: beforeBrotli }, after, removedRules: removed, semanticSignatureSha256: digest(signature), identicalSemanticsExceptProvenLosslessBackgroundUrl: true });
  beforeBytes += before.bytes; afterBytes += after.bytes; removedRules += removed;
}
const report = { generatedAtUtc: new Date().toISOString(), method: 'Offline AST comparison. Keeps last identical rule in same parent, preserves font faces/keyframes/comments/values and all originals. Not a browser timing or Lighthouse score.', beforeManifestSha256: digest(JSON.stringify(beforeManifest)), templates: results.length, totalsPerManifestEntry: { beforeBytes, afterBytes, removedRules }, backgrounds, results, limits: ['No deployed URL, PageSpeed or Core Web Vitals score.', 'Original hash CSS retained; publication of new manifest is separately coordinated.', 'Desktop browser geometry and before/after screenshots collected by root, not by this offline script.'] };
await writeFile('docs/validation/corrections-2026-10-02/performance-proof.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ templates: results.length, beforeBytes, afterBytes, removedRules }));
