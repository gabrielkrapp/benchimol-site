import sanitizeHtml from 'sanitize-html';
import assetMapData from '../../../data/wordpress/asset-map.json';
import type { ContactSettings } from '@/lib/domain/types';
import { htmlToDOM, isElement, type DOMNode, type Text } from './dom';
import { optimizedBackgroundUrl, publicImageDimensions } from './images';

export const SITE_ORIGIN = 'https://clinicadeolhosbenchimol.com.br';
const assetMap = assetMapData as Record<string, string>;
const sameHosts = new Set(['clinicadeolhosbenchimol.com.br', 'www.clinicadeolhosbenchimol.com.br']);
const frameHosts = new Set(['maps.google.com', 'www.google.com', 'www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com']);
export function normalizePath(path: string): string {
  const pathname = `/${path.split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')}`;
  return pathname === '/' || /\.[a-z0-9]{1,6}$/i.test(pathname) ? pathname : `${pathname}/`;
}
export function localizeUrl(input: string): string {
  const value = input.trim();
  if (!value || value.startsWith('#') || /^(mailto:|tel:)/i.test(value)) return value;
  if (assetMap[value]) return assetMap[value];
  try {
    const url = new URL(value, SITE_ORIGIN);
    const absolute = url.origin + url.pathname;
    if (assetMap[absolute]) return assetMap[absolute];
    if (sameHosts.has(url.hostname)) return normalizePath(decodeURI(url.pathname)) + url.search + url.hash;
    return value;
  } catch { return value; }
}
export function whatsappUrl(contact: Pick<ContactSettings, 'whatsapp' | 'message'>): string {
  return `https://wa.me/${contact.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(contact.message)}`;
}
export function whatsappLabel(number: string): string {
  const digits = number.replace(/\D/g, '').replace(/^55/, '');
  return digits.length === 11 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}` : digits.length === 10 ? `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}` : number;
}
function isWhatsapp(value: string) {
  try { const url = new URL(value); return url.hostname === 'wa.me' || ['api.whatsapp.com', 'web.whatsapp.com'].includes(url.hostname); } catch { return false; }
}
export function localizeCss(css: string): string {
  // Captured styles are data. They cannot load JavaScript, CSS imports or untrusted schemes.
  return css.replace(/@import\s+[^;]+;?/gi, '').replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (_match, _quote, url: string) => {
    if (/^(javascript:|vbscript:|data:text|file:)/i.test(url.trim())) return 'url("")';
    return `url("${optimizedBackgroundUrl(localizeUrl(url)).replace(/["\\\r\n]/g, '')}")`;
  }).replace(/<\/style/gi, '');
}
function safeStyle(style: string): string {
  if (/expression\s*\(|javascript\s*:|vbscript\s*:|behavior\s*:|-moz-binding|@import|[<>]/i.test(style)) return '';
  return localizeCss(style.replace(/^"|"$/g, ''));
}
export function publicText(html: string): string {
  // sanitize-html returns escaped HTML. Decode its text nodes once so Metadata,
  // React and HTML builders can escape at their own output sink.
  const safe = sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });
  const text = (nodes: DOMNode[]): string => nodes.map(node => node.type === 'text' ? (node as Text).data : isElement(node) ? text(node.children as DOMNode[]) : '').join('');
  return text(htmlToDOM(safe)).replace(/\s+/g, ' ').trim();
}
export function sanitizePublicHtml(input: string, options: { contact?: ContactSettings } = {}): string {
  let prepared = input.replace(/<iframe\b[^<>]*>/gi, tag => {
    const sources = [...tag.matchAll(/\s+src\s*=\s*(['"])(.*?)\1/gi)];
    if (sources.length !== 2 || sources[0][2] !== 'about:blank') return tag;
    try {
      const candidate = new URL(sources[1][2]);
      if (candidate.protocol === 'https:' && ['maps.google.com', 'www.google.com'].includes(candidate.hostname) && candidate.pathname.startsWith('/maps')) return tag.replace(sources[0][0], '');
    } catch {}
    return tag;
  }).replace(/class=(['"])(.*?)\1/gi, (_match, quote, value: string) => `class=${quote}${value.replace(/\belementor-invisible\b/g, '')}${quote}`);
  if (options.contact) prepared = prepared.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (match, attributes: string, body: string) => {
    const href = attributes.match(/\bhref=(["'])(.*?)\1/i)?.[2] || '';
    const phoneCta = /\(21\)\s*98560[-\s]?1000/.test(publicText(body)) && (href === '#' || href.startsWith('tel:'));
    if (!isWhatsapp(href) && !phoneCta) return match;
    const updated = attributes.replace(/\bhref=(["'])(.*?)\1/i, () => `href="${whatsappUrl(options.contact!)}"`);
    return `<a${updated}>${body.replace(/\(21\)\s*98560[-\s]?1000/g, whatsappLabel(options.contact!.whatsapp))}</a>`;
  });
  return sanitizeHtml(prepared, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'iframe', 'video', 'source', 'button', 'svg', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'use', 'g', 'defs', 'linearGradient', 'radialGradient', 'lineargradient', 'radialgradient', 'stop', 'time', 'details', 'summary'],
    nonTextTags: ['script', 'style', 'textarea', 'option', 'form'],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'title', 'role', 'tabindex', 'aria-*', 'data-*', 'data-id', 'data-wp-id', 'data-elementor-*', 'data-element_type', 'data-e-type', 'data-widget_type', 'data-target', 'data-tab', 'data-tab-id', 'data-thumbnail', 'data-gallery-id', 'data-width', 'data-height', 'data-open-text', 'data-collapse-text', 'dir', 'hidden'],
      a: ['href', 'target', 'rel', 'name'],
      img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'fetchpriority'],
      iframe: ['src', 'title', 'width', 'height', 'loading', 'allowfullscreen', 'allow', 'referrerpolicy'],
      video: ['src', 'poster', 'controls', 'width', 'height', 'preload'], source: ['src', 'type', 'srcset'],
      button: ['type', 'disabled'], time: ['datetime'], ol: ['start', 'reversed'],
      td: ['colspan', 'rowspan', 'headers'], th: ['colspan', 'rowspan', 'scope', 'headers'],
      svg: ['viewbox', 'viewBox', 'width', 'height', 'fill', 'xmlns'], path: ['d', 'fill', 'stroke', 'stroke-width', 'fill-rule', 'clip-rule'],
      g: ['transform', 'fill'],
      circle: ['cx', 'cy', 'r', 'fill'], rect: ['x', 'y', 'width', 'height', 'fill'], use: ['href'],
      polygon: ['points', 'fill', 'stroke', 'stroke-width'], polyline: ['points', 'fill', 'stroke', 'stroke-width'],
      lineargradient: ['x1', 'x2', 'y1', 'y2', 'gradientunits', 'gradienttransform'],
      radialgradient: ['cx', 'cy', 'r', 'fx', 'fy', 'gradientunits', 'gradienttransform'],
      linearGradient: ['x1', 'x2', 'y1', 'y2', 'gradientUnits', 'gradientTransform', 'gradientunits', 'gradienttransform'],
      radialGradient: ['cx', 'cy', 'r', 'fx', 'fy', 'gradientUnits', 'gradientTransform', 'gradientunits', 'gradienttransform'],
      stop: ['offset', 'stop-color', 'stop-opacity'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'], allowProtocolRelative: false,
    allowedIframeHostnames: [...frameHosts], parseStyleAttributes: false,
    transformTags: {
      '*': (tagName, original) => {
        const attribs = { ...original };
        if (tagName === 'noscript') tagName = 'div';
        if (tagName === 'pre' && (attribs.class || '').split(/\s+/).includes('ti-widget')) { tagName = 'div'; attribs.class = 'public-reviews-host'; }
        if (tagName === 'img' || tagName === 'iframe') {
          const real = attribs['data-src'] || attribs['data-litespeed-src'] || attribs['data-lazy-src'];
          if (real) attribs.src = real;
          if (attribs['data-srcset'] || attribs['data-lazy-srcset']) attribs.srcset = attribs['data-srcset'] || attribs['data-lazy-srcset'];
          if (attribs['data-sizes']) attribs.sizes = attribs['data-sizes'].replace(/^auto,\s*/, '');
        }
        for (const key of ['data-src', 'data-litespeed-src', 'data-lazy-src', 'data-srcset', 'data-lazy-srcset', 'data-sizes']) delete attribs[key];
        for (const key of ['src', 'href', 'poster', 'data-thumbnail']) if (attribs[key]) attribs[key] = localizeUrl(attribs[key]);
        if (attribs.srcset) attribs.srcset = attribs.srcset.split(',').map(part => { const [url, ...descriptor] = part.trim().split(/\s+/); return [localizeUrl(url), ...descriptor].join(' '); }).join(', ');
        // The captured Trustindex avatars already reserve 40px in its CSS. Keep
        // their original attributes for the exact widget-provenance fingerprint;
        // adding dimensions before restoration would hide its loaded review state.
        const capturedReviewAvatar = tagName === 'img' &&
          (attribs.class || '').split(/\s+/).includes('skip-lazy') &&
          attribs.src?.startsWith('/legacy-assets/lh3.googleusercontent.com/');
        if (tagName === 'img' && !capturedReviewAvatar && !attribs.width && !attribs.height && attribs.src) {
          const dimensions = publicImageDimensions(attribs.src);
          if (dimensions) { attribs.width = String(dimensions.width); attribs.height = String(dimensions.height); }
        }
        if (attribs.style) { const style = safeStyle(attribs.style); if (style) attribs.style = style; else delete attribs.style; }
        if ((attribs.class || '').split(/\s+/).includes('ti-widget') && attribs['data-css-url'] && attribs.style) {
          attribs.style = attribs.style.replace(/(?:^|;)\s*(?:opacity\s*:\s*0|height\s*:\s*0\s*!important|overflow\s*:\s*hidden\s*!important)(?=\s*;|\s*$)/gi, '').replace(/^;|;$/g, '');
          if (!attribs.style) delete attribs.style;
        }
        if (attribs['data-thumbnail'] && /^(\/|https:\/\/)/.test(attribs['data-thumbnail'])) attribs.style = `${attribs.style ?? ''};background-image:url("${attribs['data-thumbnail'].replace(/["<>]/g, '')}")`;
        if (tagName === 'a') {
          if (options.contact && isWhatsapp(attribs.href ?? '')) attribs.href = whatsappUrl(options.contact);
          if (attribs.target === '_blank') attribs.rel = 'noopener noreferrer';
        }
        if (tagName === 'iframe') { attribs.loading = 'lazy'; attribs.referrerpolicy = 'strict-origin-when-cross-origin'; if (!attribs.title) attribs.title = (attribs.src ?? '').includes('maps') ? 'Mapa da unidade' : 'Vídeo incorporado'; }
        if (tagName === 'button') attribs.type = 'button';
        return { tagName, attribs };
      },
    },
    exclusiveFilter: frame => {
      if (frame.attribs.id === 'comments' || /(?:^|\s)(comments-area|elementor-widget-post-comments)(?:\s|$)/.test(frame.attribs.class ?? '')) return true;
      if (frame.tag === 'iframe') { try { const url = new URL(frame.attribs.src); return !frameHosts.has(url.hostname) || url.protocol !== 'https:' || ((url.hostname === 'www.google.com' || url.hostname === 'maps.google.com') && !url.pathname.startsWith('/maps')) || (url.hostname.includes('youtube') && !url.pathname.startsWith('/embed/')) || (url.hostname === 'player.vimeo.com' && !url.pathname.startsWith('/video/')); } catch { return true; } }
      return frame.tag === 'img' && (!frame.attribs.src || /^data:|about:/i.test(frame.attribs.src));
    },
  });
}
