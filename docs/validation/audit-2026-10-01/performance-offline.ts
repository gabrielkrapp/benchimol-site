/** Read-only source/asset audit. Writes only performance.json beside this script. */
import { readFile, stat, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliCompressSync, constants } from 'node:zlib';
import path from 'node:path';
import postcss from 'postcss';
import { JSDOM } from 'jsdom';
import { institutionalPages, galleries, templates, approvedCustomCss, publicHeader, site, canonicalPostPath } from '../../../src/lib/public/catalog';
import { homeTemplate, pageTemplate, renderCapturedHtml, paginationHtml } from '../../../src/lib/public/render';
import { publicStylesheet } from '../../../src/lib/public/stylesheets';
import { selectCapturedStylesheets } from '../../../src/lib/public/styles';
import { sanitizePublicHtml } from '../../../src/lib/public/html';
import { htmlToDOM, elements, hasClass, serialize } from '../../../src/lib/public/dom';
import { snapshotPosts, snapshotSettings } from '../../../src/lib/server/snapshot';
const cwd = process.cwd(), auditDir = 'docs/validation/audit-2026-10-01';
const read = (file: string) => readFile(path.resolve(cwd, file), 'utf8');
const json = async (file: string) => JSON.parse(await read(file));
const brotli = (input: string) => brotliCompressSync(input, { params: { [constants.BROTLI_PARAM_QUALITY]: 5 } }).byteLength;
const fileInfo = async (url: string) => {
  if (!url.startsWith('/') || url.startsWith('//')) return { url, bytes: null, local: false };
  const file = path.resolve(cwd, 'public', decodeURI(url.split(/[?#]/)[0]).replace(/^\//, ''));
  if (!file.startsWith(path.resolve(cwd, 'public') + path.sep)) return { url, bytes: null, local: false };
  try { return { url, bytes: (await stat(file)).size, local: true }; } catch { return { url, bytes: null, local: true }; }
};
const manifest = await json('src/lib/public/style-manifest.json');
const assets = [...new Set(Object.values(manifest).map((v: any) => v.href))] as string[];
const cssFiles = [];
for (const href of assets) {
  const css = await read(`public${href}`);
  cssFiles.push({ href, bytes: Buffer.byteLength(css), brotliQuality5Bytes: brotli(css), sha256: createHash('sha256').update(css).digest('hex') });
}
const cssCache = new Map<string, any>();
async function cssDetails(template: any) {
  const compiled = publicStylesheet(template, approvedCustomCss);
  if (!cssCache.has(compiled.href)) {
    const css = await read(`public${compiled.href}`), ast = postcss.parse(css);
    let rules = 0, selectorEntries = 0, declarations = 0, imports = 0;
    const fonts: any[] = [], backgroundRefs: any[] = [];
    ast.walkRules(rule => { rules++; selectorEntries += rule.selectors.length; });
    ast.walkDecls(decl => { declarations++; if (/background/.test(decl.prop)) for (const match of decl.value.matchAll(/url\(["']?([^"')]+)["']?\)/g)) if (!match[1].startsWith('data:')) backgroundRefs.push({ selector: (decl.parent as any).selector, url: match[1] }); });
    ast.walkAtRules('import', () => { imports++; });
    ast.walkAtRules('font-face', rule => { const values: Record<string, string> = {}; rule.walkDecls(decl => { values[decl.prop] = decl.value; }); fonts.push(values); });
    const uniqueFonts = [...new Map(fonts.map(font => [JSON.stringify(font), font])).values()];
    const sources = await Promise.all(selectCapturedStylesheets(template.cssPaths).map(fileInfo));
    cssCache.set(compiled.href, { ...compiled, brotliQuality5Bytes: brotli(css), rules, selectorEntries, declarations, imports, fontFaces: fonts.length, uniqueFontFaces: uniqueFonts, backgroundRefs, sourceFiles: sources.sort((a, b) => (b.bytes || 0) - (a.bytes || 0)) });
  }
  return cssCache.get(compiled.href);
}
const posts = (await snapshotPosts()).sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
const settings = snapshotSettings();
const mostImages = [...posts].sort((a, b) => (b.bodyHtml.match(/<img\b/g)?.length || 0) - (a.bodyHtml.match(/<img\b/g)?.length || 0))[0];
const rows = [
  { path: '/', kind: 'home', template: homeTemplate(), options: { posts: posts.slice(0, 3), contact: settings.contact, isHome: true } },
  { path: '/blog/', kind: 'archive', template: templates.blog, options: { posts: posts.slice(0, 6), recentPosts: posts.slice(0, 3), contact: settings.contact, pagination: paginationHtml('/blog/', 1, posts.length, 6) } },
  ...institutionalPages.filter(p => ['/contato/', '/sobre-nos/', '/equipe/', '/exames-e-procedimentos/'].includes(p.path)).map(page => ({ path: page.path, kind: 'page', template: pageTemplate(page), options: { contact: settings.contact } })),
  ...[posts[0], mostImages].map(post => ({ path: canonicalPostPath(post), kind: 'article', template: templates.article, options: { post, posts: posts.filter(p => p.id !== post.id).slice(0, 3), recentPosts: posts.slice(0, 3), contact: settings.contact } })),
  ...galleries.slice(0, 1).map(page => ({ path: page.path, kind: 'gallery', template: pageTemplate(page), options: { contact: settings.contact } })),
];
const routeEvidence = [];
for (const row of rows) {
  const main = renderCapturedHtml(row.template.html, row.options);
  const html = sanitizePublicHtml(publicHeader(row.path), { contact: settings.contact }) + main + sanitizePublicHtml(site.footerHtml, { contact: settings.contact });
  const nodes = htmlToDOM(html), imgs = elements(nodes, node => node.name === 'img');
  const dom = new JSDOM(`<div class="public-site ${row.template.bodyClasses}">${html}</div>`);
  const imageDetails = await Promise.all(imgs.map(async img => ({ ...await fileInfo(img.attribs.src || ''), width: img.attribs.width || null, height: img.attribs.height || null, loading: img.attribs.loading || null, decoding: img.attribs.decoding || null, fetchpriority: img.attribs.fetchpriority || null, hasSrcset: Boolean(img.attribs.srcset), sizes: img.attribs.sizes || null, className: img.attribs.class || '', isFeatured: Boolean(img.parent && hasClass(img.parent.parent as any || img.parent, 'elementor-widget-theme-post-featured-image')) })));
  const css = await cssDetails(row.template);
  const inlineBackgrounds = [];
  for (const node of elements(nodes, node => Boolean(node.attribs.style))) for (const match of node.attribs.style.matchAll(/url\(["']?([^"')]+)["']?\)/g)) inlineBackgrounds.push({ selector: node.attribs.class || node.name, ...await fileInfo(match[1]) });
  const hero = elements(nodes, node => hasClass(node, 'elementor-widget-slides'))[0];
  const heroHtml = hero ? serialize([hero]) : null;
  const heroBackgrounds = [...new Map(css.backgroundRefs.filter((ref: any) => {
    if (!heroHtml || !/(?:swiper-slide|elementor-slide)/.test(ref.selector)) return false;
    try { return [...dom.window.document.querySelectorAll(ref.selector)].some(node => node.closest('.elementor-widget-slides')); } catch { return false; }
  }).map((ref: any) => [`${ref.selector}:${ref.url}`, ref])).values()];
  routeEvidence.push({ path: row.path, kind: row.kind, reconstructedHtmlBytes: Buffer.byteLength(html), htmlScope: 'Public header/main/footer rendered offline using the canonical public snapshot, not an HTTP response or database state.', stylesheet: { ...css, backgroundRefs: undefined }, imageCount: imgs.length, imagesMissingDimensions: imageDetails.filter(img => !img.width || !img.height).length, imagesLazy: imageDetails.filter(img => img.loading === 'lazy').length, imagesWithSrcset: imageDetails.filter(img => img.hasSrcset).length, imagesWithFetchpriorityHigh: imageDetails.filter(img => img.fetchpriority === 'high').length, images: imageDetails.sort((a, b) => (b.bytes || 0) - (a.bytes || 0)), inlineBackgrounds, heroBackgrounds: await Promise.all(heroBackgrounds.map(async (ref: any) => ({ ...ref, ...await fileInfo(ref.url) }))), heroHtml, frames: elements(nodes, node => node.name === 'iframe').map(frame => ({ src: frame.attribs.src, loading: frame.attribs.loading, width: frame.attribs.width, height: frame.attribs.height })) });
  dom.window.close();
}
const bodyImages: any[] = [];
for (const post of posts) for (const image of elements(htmlToDOM(sanitizePublicHtml(post.bodyHtml)), node => node.name === 'img')) bodyImages.push({ postWpId: post.wpId, postPath: canonicalPostPath(post), ...await fileInfo(image.attribs.src || ''), width: image.attribs.width || null, height: image.attribs.height || null, loading: image.attribs.loading || null, hasSrcset: Boolean(image.attribs.srcset) });
const publicClientFiles = ['src/components/public/Interactions.tsx', 'src/components/public/galleries.ts', 'src/components/public/load-more.ts', 'src/components/public/Lightbox.tsx', 'src/components/public/lightbox-icons.ts'];
const clientSources = await Promise.all(publicClientFiles.map(async file => ({ file, bytes: (await stat(path.resolve(cwd, file))).size, imports: (await read(file)).split('\n').filter(line => line.startsWith('import ')) })));
const output = {
  generatedAtUtc: new Date().toISOString(), method: 'Read-only local source/asset audit; no build, CSS generator, server lifecycle, database calls, deploy, or browser trace.',
  limits: { browserPerformanceTraceToolAvailable: false, context7Available: false, publicNextUrl: null, lighthouseScores: null, metrics: { lcp: null, inp: null, cls: null, ttfb: null, fcp: null, tbt: null }, compression: 'Node Brotli quality 5 offline estimate; not observed Vercel wire transfer.', sourceSnapshot: 'canonical imported public snapshot; editorial database changes excluded' },
  cssCatalog: { manifestEntries: Object.keys(manifest).length, uniqueFiles: cssFiles.length, totalBytes: cssFiles.reduce((sum, f) => sum + f.bytes, 0), largest: [...cssFiles].sort((a, b) => b.bytes - a.bytes)[0], files: cssFiles },
  routes: routeEvidence,
  articleBodies: { canonicalPosts: posts.length, htmlBytes: posts.reduce((sum, post) => sum + Buffer.byteLength(post.bodyHtml), 0), imageElements: bodyImages.length, imagesMissingDimensions: bodyImages.filter(i => !i.width || !i.height).length, imageElementsOver200000Bytes: bodyImages.filter(i => (i.bytes || 0) > 200000).length, imagesWithSrcset: bodyImages.filter(i => i.hasSrcset).length, imagesLazy: bodyImages.filter(i => i.loading === 'lazy').length, largest: bodyImages.sort((a, b) => (b.bytes || 0) - (a.bytes || 0)).slice(0, 20) },
  clientSources,
  sourceHashes: await Promise.all(['package.json', 'src/lib/public/style-manifest.json', 'src/lib/server/public-repository.ts', 'src/lib/public/render.ts', 'src/components/public/PublicShell.tsx', 'src/components/public/Interactions.tsx'].map(async file => ({ file, sha256: createHash('sha256').update(await read(file)).digest('hex') }))),
  sources: ['https://web.dev/articles/vitals', 'https://developer.chrome.com/docs/lighthouse/performance/performance-scoring', 'https://developers.google.com/speed/docs/insights/v5/about', 'node_modules/next/dist/docs/01-app/01-getting-started/12-images.md', 'node_modules/next/dist/docs/01-app/02-guides/caching-without-cache-components.md'],
};
await writeFile(path.resolve(cwd, auditDir, 'performance.json'), JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ cssCatalog: { ...output.cssCatalog, files: undefined }, routes: routeEvidence.map(route => ({ path: route.path, css: route.stylesheet.bytes, brotliQuality5: route.stylesheet.brotliQuality5Bytes, rules: route.stylesheet.rules, selectorEntries: route.stylesheet.selectorEntries, fontFaces: route.stylesheet.fontFaces, fontFacesWithoutDisplay: route.stylesheet.uniqueFontFaces.filter((font: any) => !font['font-display']).length, images: route.imageCount, missingDimensions: route.imagesMissingDimensions, largestImage: route.images[0], heroBackgrounds: route.heroBackgrounds })), articleBodies: output.articleBodies, clientSourceBytes: clientSources.reduce((sum, file) => sum + file.bytes, 0) }, null, 2));
