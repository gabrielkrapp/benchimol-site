import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicPostByPath, getPublicPosts, getPublicSettings, getPublicRedirect, getTaxonomies } from '@/lib/server/public-repository';
import { institutionalPages, resolvePublicPath, templates, canonicalPostPath, galleryArchiveCapture } from '@/lib/public/catalog';
import { normalizePath, publicText } from '@/lib/public/html';
import { articleJsonLd, metadataForPage, metadataForPost } from '@/lib/public/seo';
import { renderCapturedHtml, pageTemplate, homeTemplate, paginationHtml } from '@/lib/public/render';
import { PublicShell } from '@/components/public/PublicShell';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
type Props = { params: Promise<{ path?: string[] }>; searchParams: Promise<Record<string, string | string[] | undefined>> };
async function requestPath(params: Props['params']) { return normalizePath((await params).path?.join('/') || '/'); }
export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const path = await requestPath(params), route = resolvePublicPath(path), search = await searchParams;
  if (search.s && path === '/') return { title: `Busca: ${publicText(String(search.s))} — Clínica de Olhos Benchimol`, robots: { index: false, follow: true } };
  if (route?.kind === 'home') return metadataForPage(institutionalPages.find(page => page.path === '/')!);
  if (route?.kind === 'page' || route?.kind === 'gallery') return metadataForPage(route.page, path);
  if (route?.kind === 'archive') {
    const page = institutionalPages.find(page => page.path === '/blog/')!;
    const metadataPage = route.base === '/simply_galleries/' ? { ...page, seo: { title: galleryArchiveCapture.title }, title: galleryArchiveCapture.title } : page;
    return { ...metadataForPage(metadataPage, path), ...(route.page > 1 ? { title: `Blog — Página ${route.page} — Clínica de Olhos Benchimol` } : {}) };
  }
  if (route?.kind === 'taxonomy') {
    const taxonomies = await getTaxonomies(), terms = route.taxonomy === 'category' ? taxonomies.categories : taxonomies.tags;
    const term = terms.find(item => item.slug === route.slug); if (!term) return { robots: { index: false } };
    return { title: `${term.name}${route.page > 1 ? ` — Página ${route.page}` : ''} — Clínica de Olhos Benchimol`, alternates: { canonical: `https://clinicadeolhosbenchimol.com.br${path}` }, robots: { index: term.count > 0, follow: true } };
  }
  if (route?.kind === 'redirect') return { robots: { index: false } };
  const post = await getPublicPostByPath(path); return post ? metadataForPost(post) : { robots: { index: false } };
}
export default async function PublicPage({ params, searchParams }: Props) {
  const path = await requestPath(params), route = resolvePublicPath(path), search = await searchParams;
  if (route?.kind === 'redirect') permanentRedirect(route.to);
  const query = typeof search.s === 'string' && path === '/' ? search.s.trim().slice(0, 200) : undefined;
  if (route?.kind === 'home' && !query) {
    const [settings, posts] = await Promise.all([getPublicSettings(), getPublicPosts({ page: 1, pageSize: 3 })]);
    const template = homeTemplate();
    return <PublicShell path={path} title="Home" template={template} html={renderCapturedHtml(template.html, { posts: posts.items, contact: settings.contact, isHome: true })} settings={settings} />;
  }
  if (route?.kind === 'page' || route?.kind === 'gallery') {
    const settings = await getPublicSettings(), template = pageTemplate(route.page);
    return <PublicShell path={path} title={route.page.title} template={template} html={renderCapturedHtml(template.html, { contact: settings.contact })} settings={settings} />;
  }
  if (route?.kind === 'archive' || route?.kind === 'taxonomy' || query) {
    const [settings, terms, recent] = await Promise.all([getPublicSettings(), getTaxonomies(), getPublicPosts({ pageSize: 3 })]);
    const term = route?.kind === 'taxonomy' ? (route.taxonomy === 'category' ? terms.categories : terms.tags).find(item => item.slug === route.slug) : undefined;
    if (route?.kind === 'taxonomy' && !term) notFound();
    const page = route?.kind === 'archive' || route?.kind === 'taxonomy' ? route.page : 1;
    const pageSize = 6;
    const posts = await getPublicPosts({ page, pageSize, ...(route?.kind === 'taxonomy' && term ? { [route.taxonomy === 'category' ? 'category' : 'tag']: term.wpId } : {}), ...(query ? { q: query } : {}) });
    if (page > 1 && posts.items.length === 0) notFound();
    const base = route?.kind === 'taxonomy' ? `/${route.taxonomy}/${route.slug}/` : route?.kind === 'archive' ? route.base : '/blog/';
    const title = term?.name || (query ? `Busca: ${query}` : 'Blog');
    const template = route?.kind === 'taxonomy' ? templates.taxonomy : route?.kind === 'archive' && route.base === '/simply_galleries/' ? templates.galleryArchive : templates.blog;
    let html = renderCapturedHtml(template.html, { posts: posts.items, recentPosts: recent.items, contact: settings.contact, archiveTitle: term || query ? title : undefined, pagination: query ? '' : paginationHtml(base, page, posts.total, pageSize) });
    if (posts.total === 0) html += '<p class="public-empty">Nenhum artigo publicado nesta consulta.</p>';
    return <PublicShell path={path} title={title} template={template} html={html} settings={settings} />;
  }
  const redirect = await getPublicRedirect(path); if (redirect) permanentRedirect(redirect);
  const post = await getPublicPostByPath(path); if (!post) notFound();
  if (canonicalPostPath(post) !== path) permanentRedirect(canonicalPostPath(post));
  const [settings, related, recent, terms] = await Promise.all([getPublicSettings(), getPublicPosts({ pageSize: 4 }), getPublicPosts({ pageSize: 3 }), getTaxonomies()]);
  const template = { ...templates.article, bodyClasses: templates.article.bodyClasses.replace(/postid-\d+/g, `postid-${post.wpId || post.id}`) };
  const html = renderCapturedHtml(template.html, { post, posts: related.items.filter(item => item.id !== post.id).slice(0, 3), recentPosts: recent.items, contact: settings.contact, categories: terms.categories });
  return <PublicShell path={path} title={post.title} template={template} html={html} settings={settings} schema={articleJsonLd(post)} />;
}
