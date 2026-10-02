import { readFile } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import { localizeCss } from './html';
import assetMapData from '../../../data/wordpress/asset-map.json';
import { optimizeCapturedCss } from './optimize-css';
const optimizedCss = new Set(Object.entries(assetMapData).filter(([url]) => url.includes('/litespeed/ucss/')).map(([, asset]) => asset));
export function selectCapturedStylesheets(cssPaths: string[]): string[] {
  const complete = ['frontend.min.css', 'post-257.css', 'post-55.css'].every(name => cssPaths.some(asset => asset.includes('/elementor-restored/') && asset.endsWith(`/${name}`)));
  return [...new Set(cssPaths)].filter(asset => asset && (!complete || !optimizedCss.has(asset)));
}
function selectors(value: string): string[] {
  const result: string[] = []; let depth = 0, quote = '', current = '';
  for (const char of value) {
    if (quote) { current += char; if (char === quote) quote = ''; continue; }
    if (char === '"' || char === "'") quote = char;
    if (char === '(' || char === '[') depth++; if (char === ')' || char === ']') depth--;
    if (char === ',' && depth === 0) { result.push(current); current = ''; } else current += char;
  }
  if (current) result.push(current); return result;
}
export function scopePublicCss(input: string, bodyClasses: string[] = ['elementor-kit-257']): string {
  const bodyClassSelector = new RegExp(`^\\.(?:${bodyClasses.map(name => name.replace(/[^a-zA-Z0-9_-]/g, '')).join('|')})(?![\\w-])`);
  const root = postcss.parse(localizeCss(input));
  root.walkAtRules('import', rule => { rule.remove(); });
  root.walkRules(rule => {
    let parent = rule.parent;
    while (parent && parent.type !== 'root') { if (parent.type === 'atrule' && /keyframes$/i.test(parent.name)) return; parent = parent.parent; }
    rule.selector = selectors(rule.selector).map(selector => {
      let value = selector.trim().replace(/(?<![\w-])(?:body|html)(?![\w-])|:root/g, '.public-site');
      value = value.replace(/\.public-site\s+(?:>\s*)?\.public-site/g, '.public-site');
      return value.startsWith('.public-site') ? value : bodyClassSelector.test(value) ? `.public-site${value}` : `.public-site ${value}`;
    }).join(',');
  });
  return root.toString();
}
const sourceCache = new Map<string, Promise<string>>();
const scopedCache = new Map<string, Promise<string>>();
export async function capturedStyles(cssPaths: string[], inlineStyles: string[], bodyClasses: string, optimize = true): Promise<string> {
  const classes = bodyClasses.split(/\s+/).filter(Boolean);
  const files = await Promise.all(selectCapturedStylesheets(cssPaths).map(async asset => {
    const file = path.resolve(process.cwd(), 'public', asset.replace(/^\//, ''));
    if (!file.startsWith(path.resolve(process.cwd(), 'public') + path.sep)) throw new Error('Invalid captured stylesheet path');
    let source = sourceCache.get(file); if (!source) { source = readFile(file, 'utf8'); sourceCache.set(file, source); }
    const css = await source;
    // Per-post WP IDs that never occur in the stylesheet do not change its selectors.
    const relevantClasses = classes.filter(name => new RegExp(`\\.${name.replace(/[^a-zA-Z0-9_-]/g, '')}(?![\\w-])`).test(css));
    const cacheKey = `${file}:${relevantClasses.join(' ')}`;
    let scoped = scopedCache.get(cacheKey); if (!scoped) { scoped = Promise.resolve(scopePublicCss(css, relevantClasses)); scopedCache.set(cacheKey, scoped); }
    return scoped;
  }));
  const css = [...files, ...inlineStyles.filter(Boolean).map(css => scopePublicCss(css, classes))].join('\n');
  return optimize ? optimizeCapturedCss(css).css : css;
}
