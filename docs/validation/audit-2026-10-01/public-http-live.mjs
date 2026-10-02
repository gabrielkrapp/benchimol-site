// Read-only local HTTP evidence. Does not load env files, authenticate or change data.
import fs from 'node:fs';
import crypto from 'node:crypto';
import { JSDOM } from 'jsdom';

const origin = 'http://127.0.0.1:3000';
const canonicalOrigin = 'https://clinicadeolhosbenchimol.com.br';
const posts = JSON.parse(fs.readFileSync('data/wordpress/posts.json', 'utf8'));
const article = posts.find(p => p.wpId === 17).path;
const routes = ['/', '/sobre-nos/', '/equipe/', '/exames-e-procedimentos/', '/blog/', '/blog/page/2/', article, '/cirurgia-refrativa-artigo/', '/por-que-piscamos-os-olhos-artigo-2020/', '/robots.txt', '/sitemap.xml', '/llms.txt', '/audit-path-that-does-not-exist-20261001/'];
const result = { startedAt: new Date().toISOString(), origin, scope: 'sequential read-only GET, user-started Next dev; no production score or real bot verification', requests: [] };
for (const path of routes) {
  try {
    const response = await fetch(origin + path, { redirect: 'manual', signal: AbortSignal.timeout(60000), headers: { 'User-Agent': 'Benchimol-ReadOnly-Local-Audit/1.0' } });
    const body = await response.text();
    const item = { path, status: response.status, contentType: response.headers.get('content-type'), bytes: Buffer.byteLength(body), sha256: crypto.createHash('sha256').update(body).digest('hex'), location: response.headers.get('location'), xRobotsTag: response.headers.get('x-robots-tag') };
    if ((item.contentType || '').includes('text/html')) {
      const doc = new JSDOM(body).window.document;
      item.html = { lang: doc.documentElement.lang, title: doc.title, description: doc.querySelector('meta[name="description"]')?.getAttribute('content'), canonicals: [...doc.querySelectorAll('link[rel="canonical"]')].map(e => e.getAttribute('href')), robots: [...doc.querySelectorAll('meta[name="robots"]')].map(e => e.getAttribute('content')), h1Count: doc.querySelectorAll('h1').length, mainTextCharacters: (doc.querySelector('main')?.textContent || '').trim().length, articleTextCharacters: (doc.querySelector('article')?.textContent || '').trim().length, jsonLd: [...doc.querySelectorAll('script[type="application/ld+json"]')].map(e => { try { const p = JSON.parse(e.textContent); return { valid: true, type: p['@type'] || null, graphTypes: p['@graph']?.map(n => n['@type']) || null, author: p.author?.name || null, descriptionHasLegacyEntity: /&(?:hellip|amp|lt|gt|quot);/.test(p.description || '') }; } catch { return { valid: false }; } }), blogPostLinks: path.startsWith('/blog/') ? [...new Set([...doc.querySelectorAll('a[href]')].map(e => e.getAttribute('href')).filter(href => posts.some(p => p.path === href)))].length : null, publicStylesheets: [...doc.querySelectorAll('link[rel="stylesheet"]')].map(e => e.getAttribute('href')).filter(h => h.startsWith('/site-styles/')) };
    }
    if (path === '/robots.txt') item.rules = body;
    if (path === '/sitemap.xml') {
      const doc = new JSDOM(body, { contentType: 'text/xml' }).window.document;
      const locations = [...doc.querySelectorAll('loc')].map(e => e.textContent);
      item.sitemap = { count: locations.length, allCanonicalOrigin: locations.every(u => u.startsWith(canonicalOrigin + '/')), privatePaths: locations.filter(u => /\/(admin|api|preview)\//.test(u)), articlePresent: locations.includes(canonicalOrigin + article), includesSamplePage: locations.includes(canonicalOrigin + '/sample-page/') };
    }
    if (path === '/llms.txt') item.llms = { publicLinks: [...body.matchAll(/https:\/\/clinicadeolhosbenchimol\.com\.br[^\s)]+/g)].map(m => m[0]), containsPrivatePaths: /\/(admin|api|preview|docs|backups)\//.test(body) };
    result.requests.push(item);
  } catch (error) { result.requests.push({ path, error: String(error), code: error.cause?.code || null }); break; }
}
result.finishedAt = new Date().toISOString();
fs.writeFileSync('docs/validation/audit-2026-10-01/public-http-live.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ startedAt: result.startedAt, finishedAt: result.finishedAt, requests: result.requests.map(r => ({ path: r.path, status: r.status, error: r.error })), output: 'docs/validation/audit-2026-10-01/public-http-live.json' }));
