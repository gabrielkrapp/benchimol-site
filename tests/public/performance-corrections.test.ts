import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import postcss from 'postcss';
import sharp from 'sharp';
import { optimizeCapturedCss, capturedCssSemanticSignature } from '@/lib/public/optimize-css';
import { sanitizePublicHtml, localizeCss } from '@/lib/public/html';
import { renderCapturedHtml, homeTemplate, pageTemplate } from '@/lib/public/render';
import { templates, institutionalPages } from '@/lib/public/catalog';
import { initialBackgroundImage } from '@/lib/public/images';
import { snapshotPosts } from '@/lib/server/snapshot';
import { htmlToDOM, elements, hasClass } from '@/lib/public/dom';
import backgrounds from '../../data/wordpress/derived-backgrounds.json';

describe('public performance changes preserve source meaning', () => {
  it('preloads only the actual first captured banner on its four matching pages', () => {
    expect(initialBackgroundImage(homeTemplate())?.src).toBe(Object.values(backgrounds)[0].src);
    for (const page of institutionalPages) {
      const expected = ['/', '/sobre-nos/', '/equipe/', '/exames-e-procedimentos/'].includes(page.path);
      expect(!!initialBackgroundImage(pageTemplate(page))).toBe(expected);
    }
    expect(initialBackgroundImage(templates.article)).toBeUndefined();
    expect(initialBackgroundImage(templates.blog)).toBeUndefined();
    expect(initialBackgroundImage({ ...homeTemplate(), html: '<h1>Outra Home aprovada</h1>' })).toBeUndefined();
    expect(initialBackgroundImage({ ...homeTemplate(), html: '<div class="swiper-slide outro-slide"></div>' + homeTemplate().html })).toBeUndefined();
  });
  it('retains the last exact rule, intervening cascade and different conditional contexts', () => {
    const source = '.a {color:red} .b {color:blue} .a {color:red}@media(max-width:767px){.a{color:red}.b{color:blue}.a{color:red}}@media(min-width:768px){.a{color:red}}';
    const result = optimizeCapturedCss(source);
    expect(result.removedRules).toBe(2);
    expect(result.css).toBe('.b{color:blue}.a{color:red}@media(max-width:767px){.b{color:blue}.a{color:red}}@media(min-width:768px){.a{color:red}}');
    expect(capturedCssSemanticSignature(result.css)).toBe(capturedCssSemanticSignature(source));
  });
  it('preserves selector escapes, strings, calc whitespace, var fallbacks, custom empties and CSS hacks', () => {
    const source = '/*! license */\n.a\\,b:not([data-x="x, y"]) { --empty: ; --text: "a  b"; width:calc(100% - 10px); color:var(--color, red); *zoom:1; _height:20px; background:url("/a b.png"); } @supports (display: grid) { .c {content:"literal  space"} }';
    const result = optimizeCapturedCss(source).css;
    expect(result).toContain('calc(100% - 10px)'); expect(result).toContain('--empty: ;');
    expect(result).toContain('*zoom:1'); expect(result).toContain('_height:20px');
    expect(result).toContain('"a  b"'); expect(result).toContain('/*! license */');
    expect(capturedCssSemanticSignature(result)).toBe(capturedCssSemanticSignature(source));
  });
  it('does not deduplicate font faces, keyframe steps, layered contexts or declarations within a rule', () => {
    const source = '@font-face{font-family:A;src:url(a.woff2)}@font-face{font-family:A;src:url(a.woff2)}@keyframes a{0%{opacity:0}0%{opacity:0}}@layer first{.x{color:red}}@layer second{.x{color:red}}.fallback{display:-webkit-box;display:flex}';
    const result = optimizeCapturedCss(source);
    expect(result.removedRules).toBe(0);
    const parsed = postcss.parse(result.css); let fonts = 0, steps = 0;
    parsed.walkAtRules('font-face', () => { fonts++; }); parsed.walkRules('0%', () => { steps++; });
    expect(fonts).toBe(2); expect(steps).toBe(2);
    expect(result.css).toContain('display:-webkit-box;display:flex');
  });
  it('keeps original background bytes and uses a smaller derivative with identical decoded pixels', async () => {
    for (const [source, derived] of Object.entries(backgrounds)) {
      const original = await readFile(`public${source}`), output = await readFile(`public${derived.src}`);
      const [before, after] = await Promise.all([sharp(original).ensureAlpha().raw().toBuffer(), sharp(output).ensureAlpha().raw().toBuffer()]);
      expect(before.equals(after)).toBe(true); expect(output.length).toBeLessThan(original.length);
      expect(localizeCss(`.x{background:url("${source}")}`)).toContain(derived.src);
    }
  });
  it('adds measured missing dimensions while preserving explicit editorial sizing and unknown media', () => {
    const input = '/legacy-assets/static.wixstatic.com/a88230c8b3918aae/file.png';
    const measured = sanitizePublicHtml(`<img src="${input}" alt="Conteúdo"><img src="${input}" width="100" height="120"><img src="/api/media/new" alt="Nova mídia">`);
    const images = elements(htmlToDOM(measured), node => node.name === 'img');
    expect(Number(images[0].attribs.width)).toBeGreaterThan(100); expect(Number(images[0].attribs.height)).toBeGreaterThan(100);
    expect(images[1].attribs.width).toBe('100'); expect(images[1].attribs.height).toBe('120');
    expect(images[2].attribs.width).toBeUndefined();
  });
  it('loads only the article cover eagerly and keeps cards lazy with placement-specific sizes', async () => {
    const posts = await snapshotPosts(), post = posts.find(item => item.featuredImage)!;
    const html = renderCapturedHtml(templates.article.html, { post, posts: posts.slice(0, 3), recentPosts: posts.slice(0, 3) });
    const nodes = htmlToDOM(html), featured = elements(nodes, node => hasClass(node, 'elementor-widget-theme-post-featured-image'))[0];
    const cover = elements(featured.children as import('@/lib/public/dom').DOMNode[], node => node.name === 'img')[0];
    expect(cover.attribs.loading).toBe('eager'); expect(cover.attribs.fetchpriority).not.toBe('high');
    const cards = elements(nodes, node => node.name === 'img' && hasClass(node, 'wp-post-image'));
    expect(cards.length).toBeGreaterThan(0); expect(cards.every(node => node.attribs.loading === 'lazy')).toBe(true);
    expect(cards.some(node => node.attribs.sizes?.includes('75px'))).toBe(true);
    expect(cover.attribs.sizes).toContain('731px');
  });
});
