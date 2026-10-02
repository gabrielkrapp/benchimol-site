/** Four sequential read-only HTTP GETs. No browser trace, env credentials or mutations. */
import http from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { brotliDecompressSync, gunzipSync, inflateSync } from 'node:zlib';
const auditDir = 'docs/validation/audit-2026-10-01';
const offline = JSON.parse(await readFile(`${auditDir}/performance.json`, 'utf8'));
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const headersAllowed = ['content-type', 'content-encoding', 'content-length', 'cache-control', 'etag', 'last-modified', 'vary', 'transfer-encoding'];
function get(path) {
  return new Promise((resolve, reject) => {
    const request = http.get(new URL(path, 'http://127.0.0.1:3000'), { headers: { 'Accept-Encoding': 'br, gzip', 'User-Agent': 'Benchimol-ReadOnly-Performance-Audit/1.0' } }, response => {
      const chunks = []; let size = 0;
      response.on('data', chunk => { size += chunk.length; if (size > 20_000_000) request.destroy(new Error('Response exceeded audit bound')); else chunks.push(chunk); });
      response.on('error', reject);
      response.on('end', () => {
        try {
          const encoded = Buffer.concat(chunks), encoding = response.headers['content-encoding'];
          const decoded = encoding === 'br' ? brotliDecompressSync(encoded) : encoding === 'gzip' ? gunzipSync(encoded) : encoding === 'deflate' ? inflateSync(encoded) : encoded;
          resolve({ evidence: { url: `http://127.0.0.1:3000${path}`, collectedAtUtc: new Date().toISOString(), status: response.statusCode, requestAcceptEncoding: 'br, gzip', headers: Object.fromEntries(headersAllowed.filter(key => response.headers[key] !== undefined).map(key => [key, response.headers[key]])), encodedBodyBytes: encoded.byteLength, decodedBodyBytes: decoded.byteLength, decodedSha256: sha(decoded) }, decoded });
        } catch (error) { reject(error); }
      });
    });
    request.setTimeout(30_000, () => request.destroy(new Error('Request timeout at 30s')));
    request.on('error', reject);
  });
}
const output = { collectedAtUtc: new Date().toISOString(), scope: 'Next dev server started and controlled by Gabriel; four sequential public GETs; no cookies/authentication.', limits: { production: false, browserTrace: false, pageSpeedScore: null, lcp: null, inp: null, cls: null, productionTtfb: null, byteScope: 'HTTP response body only; encoded bytes exclude headers and chunk framing. Accept-Encoding explicitly br,gzip. Not a browser network waterfall.' }, offlineEvidence: { file: 'performance.json', generatedAtUtc: offline.generatedAtUtc }, responses: [] };
try {
  const home = await get('/'); output.responses.push(home.evidence);
  if (home.evidence.status === 200) {
    const html = home.decoded.toString('utf8');
    const stylesheetPaths = [...new Set([...html.matchAll(/href=["'](\/site-styles\/[a-f0-9]{64}\.css)["']/g)].map(match => match[1]))];
    home.evidence.publicStylesheetPaths = stylesheetPaths;
    home.evidence.contentSource = html.match(/data-content-source=["']([^"']+)["']/)?.[1] || null;
    home.evidence.hasExactBannerPreload = /<link\b[^>]*rel=["']preload["'][^>]*slide\.png|<link\b[^>]*slide\.png[^>]*rel=["']preload["']/i.test(html);
    const homeCssPath = stylesheetPaths[0] || offline.routes[0].stylesheet.href;
    for (const [kind, url] of [['home-css', homeCssPath], ['home-hero', '/wp-content/uploads/2025/08/slide.png'], ['article-css', offline.routes.find(route => route.kind === 'article').stylesheet.href]]) {
      const result = await get(url), local = await readFile(`public${url}`);
      const evidence = { kind, ...result.evidence, localBytes: local.byteLength, localSha256: sha(local), sameBytesAsLocalFile: result.evidence.decodedSha256 === sha(local) };
      if (kind === 'home-css') evidence.referencesExactHero = result.decoded.includes(Buffer.from('/wp-content/uploads/2025/08/slide.png'));
      if (kind === 'home-hero' && result.decoded.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) evidence.pngDimensions = { width: result.decoded.readUInt32BE(16), height: result.decoded.readUInt32BE(20) };
      output.responses.push(evidence);
    }
  }
} catch (error) { output.error = { code: error.code || null, message: error.message }; }
await writeFile(`${auditDir}/performance-http-live.json`, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify(output, null, 2));
if (output.error) process.exitCode = 1;
