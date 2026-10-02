import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { JSDOM } from 'jsdom';
import { generateHTML, generateJSON } from '@tiptap/core';
import posts from '../../data/wordpress/posts.json';
import { createEditorExtensions } from '../../src/lib/admin/editor-extensions';
import { isRichBodySupported } from '../../src/lib/admin/helpers';
import { sanitizeBodyHtml } from '../../src/lib/domain/sanitize';
let dom: JSDOM;
beforeAll(() => { dom = new JSDOM('<!doctype html><html><body></body></html>'); Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true }); Object.defineProperty(globalThis, 'document', { value: dom.window.document, configurable: true }); });
afterAll(() => { dom.window.close(); Reflect.deleteProperty(globalThis, 'window'); Reflect.deleteProperty(globalThis, 'document'); });
function roundtrip(html: string) { return generateHTML(generateJSON(html, createEditorExtensions()), createEditorExtensions()); }
function fragment(html: string) { const element = document.createElement('div'); element.innerHTML = html; return element; }
function text(element: Element) { const copy = element.cloneNode(true) as Element; for (const block of copy.querySelectorAll('p,h2,h3,h4,blockquote,li,figcaption,br')) block.after(document.createTextNode(' ')); return copy.textContent?.replace(/\s+/g, ' ').trim(); }
function facts(element: Element) {
  return { quotations: [...element.querySelectorAll('blockquote')].map(item => text(item)), underline: [...element.querySelectorAll('u')].map(item => text(item)), decorations: [...element.querySelectorAll('[class],[id],[style],[aria-label],[role]')].map(item => ({ tag: item.tagName.replace(/^B$/, 'STRONG').replace(/^I$/, 'EM'), class: item.getAttribute('class'), id: item.getAttribute('id'), style: (item as HTMLElement).style.cssText || null, ariaLabel: item.getAttribute('aria-label'), role: item.getAttribute('role') })), text: text(element), headings: [...element.querySelectorAll('h2,h3,h4')].map(item => `${item.tagName}:${text(item)}`), images: [...element.querySelectorAll('img')].map(item => ({ src: item.getAttribute('src'), alt: item.getAttribute('alt') ?? '', width: item.getAttribute('width'), height: item.getAttribute('height'), srcset: item.getAttribute('srcset'), sizes: item.getAttribute('sizes'), loading: item.getAttribute('loading'), decoding: item.getAttribute('decoding'), class: item.getAttribute('class'), style: (item as HTMLElement).style.cssText || null })), links: [...element.querySelectorAll('a')].map(item => ({ href: item.getAttribute('href'), title: item.getAttribute('title'), target: item.getAttribute('target'), rel: item.getAttribute('rel'), text: text(item) })), captions: [...element.querySelectorAll('figcaption')].map(item => ({ text: text(item), class: item.getAttribute('class'), style: (item as HTMLElement).style.cssText || null })) };
}
describe('editor sem conversão destrutiva', () => {
  it('retém estilos, classes, links, imagem e legenda representáveis', () => {
    const html = '<h2 class="wp-block-heading">Título</h2><p style="text-align: center"><a id="secao">Seção</a> Texto <strong class="destaque">forte</strong> <a href="/exames/" target="_blank" rel="noopener noreferrer" title="Exames">link</a></p><figure class="wp-block-image"><img src="/foto.webp" alt="Retina" width="800" height="600" srcset="/foto.webp 800w" sizes="100vw" decoding="async" loading="lazy" class="wp-image-22"><figcaption class="wp-element-caption">Legenda clínica</figcaption></figure>';
    expect(isRichBodySupported(html)).toBe(true);
    expect(facts(fragment(roundtrip(html)))).toEqual(facts(fragment(html)));
    expect(fragment(roundtrip(html)).querySelector('figure')?.className).toBe('wp-block-image');
  });
  it('retém texto, imagens, links, headings e legendas de cada corpo legado liberado', () => {
    let editable = 0; const locked: number[] = [];
    for (const post of posts) {
      const safe = sanitizeBodyHtml(post.contentHtml);
      if (!isRichBodySupported(safe)) { locked.push(post.wpId); continue; }
      editable++;
      expect(facts(fragment(roundtrip(safe))), `WP ID ${post.wpId}`).toEqual(facts(fragment(safe)));
    }
    expect(editable).toBe(154);
    expect(locked).toEqual([]);
    expect(editable + locked.length).toBe(154);
  }, 45_000);
});
