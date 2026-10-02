import type { Post, PostStatus } from '@/lib/domain/types';

const zone = 'America/Sao_Paulo';
export function utcToSaoPaulo(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Data inválida.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (key: string) => parts.find(p => p.type === key)?.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`;
}
export function saoPauloToUtc(value: string): string | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Informe uma data e um horário válidos.');
  const wall = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(wall)) throw new Error('Informe uma data e um horário válidos.');
  let instant = wall + 3 * 3_600_000;
  for (let count = 0; count < 4; count++) {
    const observed = Date.parse(`${utcToSaoPaulo(new Date(instant).toISOString())}:00Z`);
    const adjustment = wall - observed;
    if (adjustment === 0) break;
    instant += adjustment;
  }
  const result = new Date(instant).toISOString();
  if (utcToSaoPaulo(result) !== value) throw new Error('Esse horário não existe em São Paulo. Escolha outro horário.');
  return result;
}
export function formatDate(value: string | null): string {
  return value ? new Intl.DateTimeFormat('pt-BR', { timeZone: zone, dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : 'Sem data';
}
export function formatBytes(value: number): string {
  if (value < 1024) return `${value} bytes`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let amount = value / 1024, index = 0;
  while (amount >= 1024 && index < units.length - 1) { amount /= 1024; index++; }
  return `${amount.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} ${units[index]}`;
}
export function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export function safeLink(value: string): string | null {
  if (value.startsWith('/') && !value.startsWith('//') && !/[\\\s]/.test(value)) return value;
  try { const url = new URL(value); return ['https:', 'http:', 'mailto:', 'tel:'].includes(url.protocol) ? value : null; } catch { return null; }
}
export function videoUrl(value: string): boolean {
  try { const url = new URL(value); return url.protocol === 'https:' && ['www.youtube.com', 'youtube.com', 'youtu.be', 'www.youtube-nocookie.com'].includes(url.hostname); } catch { return false; }
}
export function isRichBodySupported(html: string): boolean {
  if (/<!--|<!doctype/i.test(html)) return false;
  const common = ['class', 'id', 'style', 'aria-label', 'role'];
  const allowed: Record<string, string[]> = {
    p: common, h2: common, h3: common, h4: common, blockquote: common, u: common, strong: common, b: common, em: common, i: common, span: common,
    ul: common, ol: [...common, 'start'], li: common, br: [],
    a: [...common, 'href', 'title', 'target', 'rel'],
    img: [...common, 'src', 'alt', 'title', 'width', 'height', 'srcset', 'sizes', 'loading', 'decoding', 'fetchpriority', 'data-id'],
    figure: common, figcaption: common,
    div: ['data-youtube-video'], iframe: ['src', 'width', 'height', 'frameborder', 'allowfullscreen', 'allow', 'loading', 'title'],
  };
  const figures: { gallery: boolean; images: number }[] = [];
  let inCaption = false;
  for (const match of html.matchAll(/<\/?([a-z][a-z0-9-]*)([^>]*)>/gi)) {
    const tag = match[1].toLowerCase(), closing = match[0].startsWith('</');
    if (tag === 'figure') {
      if (closing) { const figure = figures.pop(); if (!figure || !figure.gallery && figure.images !== 1) return false; }
      else { const gallery = figures[0]?.gallery || /class\s*=\s*["'][^"']*\bwp-block-gallery\b/.test(match[2]); if (figures.length && !gallery) return false; figures.push({ gallery, images: 0 }); }
    }
    if (tag === 'img' && figures.length && !closing) figures[figures.length - 1].images++;
    if (inCaption && !closing && !figures[0]?.gallery) return false;
    if (tag === 'figcaption') inCaption = !closing;
    if (!(tag in allowed)) return false;
    if (figures[0]?.gallery && !['figure','figcaption','img','a','p','br','strong','b','em','i','span','u'].includes(tag)) return false;
    if (tag === 'div' && !match[0].startsWith('</') && !/data-youtube-video/.test(match[2])) return false;
    if (tag === 'iframe' && !match[0].startsWith('</')) {
      const source = match[2].match(/src\s*=\s*["']([^"']+)["']/i)?.[1];
      if (!source || !videoUrl(source)) return false;
    }
    for (const attribute of match[2].matchAll(/\s+([a-z_:][a-z0-9_:.-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/gi)) {
      if (!allowed[tag].includes(attribute[1].toLowerCase())) return false;
    }
  }
  return figures.length === 0;
}
export function makePostPayload(form: Post, base: Post | null, status: PostStatus) {
  const payload: Record<string, unknown> = {
    title: form.title, slug: form.slug, excerptHtml: form.excerptHtml, authorName: form.authorName,
    status, publishedAt: form.publishedAt, featuredImage: form.featuredImage,
    featuredAlt: form.featuredAlt, categoryIds: form.categoryIds, tagIds: form.tagIds, seo: { title: form.seo.title, description: form.seo.description, ...(form.seo.canonical?.trim() ? { canonical: form.seo.canonical.trim() } : {}), ...(form.seo.ogImage?.trim() ? { ogImage: form.seo.ogImage.trim() } : {}) },
  };
  if (!base || base.bodyHtml !== form.bodyHtml && base.bodyEditMode === 'rich' && isRichBodySupported(base.bodyHtml)) payload.bodyHtml = form.bodyHtml;
  if (base) { payload.version = base.version; if (base.slug === form.slug) delete payload.slug; }
  return payload;
}
export function validateUpload(file: Pick<File, 'name' | 'type' | 'size'>): string | null {
  const types: Record<string, string[]> = { 'image/jpeg': ['jpg', 'jpeg'], 'image/png': ['png'], 'image/webp': ['webp'], 'image/gif': ['gif'] };
  if (!types[file.type]) return 'Formato não permitido. Use JPG, PNG, WebP ou GIF.';
  if (!types[file.type].includes(file.name.split('.').pop()?.toLowerCase() ?? '')) return 'A extensão do arquivo não corresponde ao formato.';
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > 10 * 1024 * 1024) return 'O arquivo deve ter até 10 MB.';
  return null;
}
export const statusLabels: Record<PostStatus, string> = { draft: 'Rascunho', published: 'Publicado', trashed: 'Lixeira' };

export function whatsappLink(number: string, message: string): string | null { const digits = number.replace(/[\s()+.-]/g, ''); return /^55[1-9]\d\d{8,9}$/.test(digits) ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null; }
