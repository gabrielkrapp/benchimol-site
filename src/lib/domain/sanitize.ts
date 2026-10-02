import sanitizeHtml from 'sanitize-html';

/** Shared safe article renderer; no script, event handler, form or arbitrary embed. */
export function sanitizeBodyHtml(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, 'img', 'u', 'figure', 'figcaption', 'iframe', 'video', 'source', 'hr', 'details', 'summary'],
    allowedAttributes: {
      '*': ['class', 'id', 'style', 'aria-label', 'role'],
      a: ['href', 'title', 'target', 'rel'], div:['data-youtube-video'],
      img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading', 'decoding', 'data-id', 'fetchpriority'],
      iframe: ['src', 'title', 'width', 'height', 'allowfullscreen', 'loading'],
      video: ['src', 'poster', 'controls', 'width', 'height'], source: ['src', 'type'],
      td: ['colspan', 'rowspan'], th: ['colspan', 'rowspan', 'scope'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: { img: ['http', 'https'], iframe: ['https'], video: ['https'], source: ['https'] },
    allowProtocolRelative: false,
    allowedIframeHostnames: ['www.youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
    allowedStyles: { '*': {
      'text-align': [/^(left|right|center|justify)$/],
      color: [/^#[a-fA-F0-9]{3,8}$/, /^rgb\([\d\s,]+\)$/],
      'background-color': [/^#[a-fA-F0-9]{3,8}$/],
      width: [/^\d+(\.\d+)?(px|%|em|rem)$/], height: [/^\d+(\.\d+)?(px|%|em|rem)$/, /^auto$/],
      'list-style-type': [/^(none|disc|circle|square|decimal)$/],
      'font-size': [/^\d+(\.\d+)?(px|em|rem)$/], 'font-weight': [/^(normal|bold|[1-9]00)$/],
    } },
    transformTags: { a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, ...(attribs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}) } }) },
  });
}
export function sanitizeExcerptHtml(input: string): string {
  return sanitizeHtml(input, { allowedTags: ['p', 'br', 'strong', 'em', 'a'], allowedAttributes: { a: ['href'] }, allowedSchemes: ['https', 'http'], allowProtocolRelative: false });
}
export function plainText(input: string): string {
  return sanitizeHtml(input, { allowedTags: [], allowedAttributes: {} }).trim();
}
/** Literal editorial text. React/HTML/URL consumers escape it at their own sink. */
export function normalizePlainText(input: string): string {
  return input.trim();
}
