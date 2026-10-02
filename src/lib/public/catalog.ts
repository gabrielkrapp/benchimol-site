import pagesData from '../../../data/wordpress/pages.json';
import siteData from '../../../data/wordpress/site.json';
import routesData from '../../../data/wordpress/routes.json';
import galleriesData from '../../../data/wordpress/galleries.json';
import decisionsData from '../../../data/wordpress/route-decisions.json';
import templatesData from './captured-templates.json';
import overridesData from '../../../content/site-overrides.json';
import sharedStylesData from '../../../data/wordpress/elementor-shared-styles.json';
import { htmlToDOM, elements, hasClass, content, serialize } from './dom';
import { normalizePath, publicText } from './html';
import { menuGlyph, caretGlyph } from './icons';

export interface CapturedPage {
  wpId: number; path: string; title: string; titleHtml: string; contentHtml: string; renderedHtml?: string;
  modifiedAtGmt: string; publishedAtGmt: string; bodyClasses?: string; inlineStyles?: string[]; cssPaths?: string[];
  seo: { title?: string; description?: string; og_description?: string; og_image?: { url: string; width?: number; height?: number }[] };
}
export interface CapturedTemplate { html: string; cssPaths: string[]; inlineStyles: string[]; bodyClasses: string; }
export const capturedInstitutionalPages = pagesData as unknown as CapturedPage[];
export const pageOverrides = overridesData.pageOverrides as Record<string, Partial<CapturedPage>>;
export const institutionalPages = [...capturedInstitutionalPages.map(page => ({ ...page, ...(pageOverrides[page.path] || {}), path: page.path })), ...(overridesData.additionalPages as CapturedPage[])];
export const site = { ...siteData, headerHtml: overridesData.headerHtml ?? siteData.headerHtml, footerHtml: overridesData.footerHtml ?? siteData.footerHtml };
export const approvedCustomCss = overridesData.customCss || ''; 
const originalTemplates = templatesData as unknown as {
  headers: Record<string, string>; floatingWhatsappHtml: string; backToTopHtml: string; routes: Record<string, { headerId: string }>;
  blog: CapturedTemplate; article: CapturedTemplate; taxonomy: CapturedTemplate; sample: CapturedTemplate;
};
export const galleryArchiveCapture = routesData.find(route => route.path === '/simply_galleries/')!;
export const templates = { ...originalTemplates, blog: { ...originalTemplates.blog, cssPaths: [...originalTemplates.blog.cssPaths, ...sharedStylesData] }, galleryArchive: { ...originalTemplates.blog, cssPaths: [...originalTemplates.blog.cssPaths, ...galleryArchiveCapture.cssPaths, ...sharedStylesData], bodyClasses: galleryArchiveCapture.bodyAttributes.class }, article: { ...originalTemplates.article, cssPaths: [...originalTemplates.article.cssPaths, ...sharedStylesData] }, taxonomy: { ...originalTemplates.taxonomy, cssPaths: [...originalTemplates.taxonomy.cssPaths, ...sharedStylesData] }, sample: { ...originalTemplates.sample, cssPaths: [...originalTemplates.sample.cssPaths, ...sharedStylesData] } };
export const galleries = galleriesData as unknown as CapturedPage[];
export const routeDecisions = decisionsData;
export function canonicalPostPath(post: { wpId: number | null; legacyPath: string }): string {
  const decision = decisionsData.decisions.find(item => item.wpId === post.wpId);
  const duplicate = decisionsData.duplicates.find(item => item.wpId === post.wpId);
  return normalizePath(decision?.publicPath ?? duplicate?.canonicalPath ?? post.legacyPath);
}
export type PublicRoute = { kind: 'page'; page: CapturedPage } | { kind: 'home' } | { kind: 'archive'; page: number; base: '/blog/' | '/simply_galleries/' } | { kind: 'taxonomy'; taxonomy: 'category' | 'tag'; slug: string; page: number } | { kind: 'gallery'; page: CapturedPage } | { kind: 'redirect'; to: string };
export function resolvePublicPath(input: string): PublicRoute | null {
  const path = normalizePath(input);
  if (path === '/') return { kind: 'home' };
  const archive = path.match(/^\/(blog|simply_galleries)\/(?:page\/(\d+)\/)?$/);
  if (archive) { const page = Number(archive[2] || 1); return page > 0 ? { kind: 'archive', page, base: `/${archive[1]}/` as '/blog/' | '/simply_galleries/' } : null; }
  const taxonomy = path.match(/^\/(category|tag)\/([^/]+)\/(?:page\/(\d+)\/)?$/);
  if (taxonomy) { const page = Number(taxonomy[3] || 1); return page > 0 ? { kind: 'taxonomy', taxonomy: taxonomy[1] as 'category' | 'tag', slug: taxonomy[2], page } : null; }
  const page = institutionalPages.find(item => normalizePath(item.path) === path);
  if (page) return { kind: 'page', page };
  const gallery = galleries.find(item => normalizePath(item.path) === path);
  if (gallery) return { kind: 'gallery', page: gallery };
  const redirected = routesData.find(item => normalizePath(item.path) === path && item.status === 200 && new URL(item.finalUrl).pathname !== item.path);
  if (redirected) { const to = normalizePath(new URL(redirected.finalUrl).pathname); if (to !== path) return { kind: 'redirect', to }; }
  return null;
}
export function pageTitle(page: CapturedPage): string { return publicText(page.seo.title || page.title); }
export function publicHeader(path: string): string {
  const id = templates.routes[path]?.headerId ?? (path === '/' ? '2800' : '48');
  return navigationState(overridesData.headerHtml ?? templates.headers[id] ?? site.headerHtml, path);
}

export function navigationState(html: string, currentPath: string): string {
  const nodes = htmlToDOM(html), current = normalizePath(currentPath);
  for (const icon of elements(nodes, node => node.name === 'i' && (hasClass(node, 'eicon-menu-bar') || hasClass(node, 'eicon-close')))) {
    const replacement = htmlToDOM(menuGlyph(icon.attribs.class, hasClass(icon, 'eicon-close')))[0];
    if (icon.parent) { replacement.parent = icon.parent; icon.parent.children[icon.parent.children.indexOf(icon)] = replacement; }
  }
  for (const item of elements(nodes, node => hasClass(node, 'menu-item'))) {
    item.attribs.class = (item.attribs.class || '').replace(/\b(current-menu-item|current_page_item|current-menu-ancestor|current-menu-parent)\b/g, '').trim();
    const link = elements(item.children as import('./dom').DOMNode[], node => node.name === 'a')[0];
    if (!link) continue;
    if (hasClass(item, 'menu-item-has-children') && hasClass(link, 'hfe-menu-item') && !hasClass(item, 'parent-has-child')) item.attribs.class += ' parent-has-child';
    if (hasClass(item, 'menu-item-has-children') && hasClass(link, 'elementor-item') && !elements(link.children as import('./dom').DOMNode[], node => hasClass(node, 'sub-arrow')).length) {
      content(link, `${serialize(link.children as import('./dom').DOMNode[])}<span class="sub-arrow" aria-hidden="true">${caretGlyph}</span>`);
    }
    delete link.attribs['aria-current']; link.attribs.class = (link.attribs.class || '').replace(/\belementor-item-active\b/g, '').trim();
    const href = link.attribs.href || '';
    let hrefPath = ''; try { hrefPath = normalizePath(new URL(href, 'https://clinicadeolhosbenchimol.com.br').pathname); } catch {}
    const active = hrefPath === current || hrefPath === '/blog/' && current.startsWith('/blog/');
    if (active) { item.attribs.class += ' current-menu-item'; link.attribs.class += ' elementor-item-active'; link.attribs['aria-current'] = 'page'; }
  }
  return serialize(nodes);
}
