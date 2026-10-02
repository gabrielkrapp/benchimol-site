import type { Metadata, MetadataRoute } from 'next';
import type { Post } from '@/lib/domain/types';
import { SITE_ORIGIN, localizeUrl, publicText } from './html';
import { canonicalPostPath, type CapturedPage } from './catalog';
const siteName = 'Clínica de Olhos Benchimol';
export const publicIndexRobots: Metadata['robots'] = { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 };
function literalMetadataText(value: string): string { return value.replace(/\s+/g, ' ').trim(); }
function postDescription(post: Post): string { return post.seo.description ? literalMetadataText(post.seo.description) : publicText(post.excerptHtml); }
export function absoluteUrl(path: string): string { return new URL(path, SITE_ORIGIN).href; }
export function postCanonicalUrl(post: Post): string {
  if (post.seo.canonical) {
    try { const url = new URL(post.seo.canonical); if (url.protocol === 'http:' || url.protocol === 'https:') return url.href; } catch {}
  }
  return absoluteUrl(canonicalPostPath(post));
}
export function metadataForPage(page: CapturedPage, path = page.path): Metadata {
  const title = publicText(page.seo?.title || page.title);
  const description = publicText(page.seo?.description || page.seo?.og_description || '').slice(0, 500);
  const image = page.seo?.og_image?.[0]?.url;
  return { title, description, robots: publicIndexRobots, alternates: { canonical: absoluteUrl(path) }, openGraph: { title, description, locale: 'pt_BR', siteName, type: 'website', url: absoluteUrl(path), ...(image ? { images: [absoluteUrl(localizeUrl(image))] } : {}) }, twitter: { card: 'summary_large_image' } };
}
export function metadataForPost(post: Post): Metadata {
  const canonical = postCanonicalUrl(post), title = literalMetadataText(post.seo.title || post.title), description = postDescription(post).slice(0, 500);
  const image = post.seo.ogImage || post.featuredImage;
  return { title, description, robots: publicIndexRobots, alternates: { canonical }, openGraph: { title, description, locale: 'pt_BR', siteName, type: 'article', url: canonical, ...(post.publishedAt ? { publishedTime: post.publishedAt } : {}), modifiedTime: post.updatedAt, authors: [post.authorName], ...(image ? { images: [absoluteUrl(localizeUrl(image))] } : {}) }, twitter: { card: 'summary_large_image' } };
}
export function articleJsonLd(post: Post) {
  const path = canonicalPostPath(post);
  return { '@context': 'https://schema.org', '@type': 'BlogPosting', '@id': `${absoluteUrl(path)}#article`, url: absoluteUrl(path), mainEntityOfPage: postCanonicalUrl(post), headline: post.title, description: postDescription(post), inLanguage: 'pt-BR', ...(post.publishedAt ? { datePublished: post.publishedAt } : {}), dateModified: post.updatedAt, author: { '@type': 'Person', name: post.authorName }, publisher: { '@id': `${SITE_ORIGIN}/#clinic` }, ...(post.featuredImage ? { image: absoluteUrl(localizeUrl(post.featuredImage)) } : {}) };
}
export function clinicJsonLd() {
  return { '@context': 'https://schema.org', '@graph': [
    { '@type': 'MedicalOrganization', '@id': `${SITE_ORIGIN}/#clinic`, name: siteName, url: `${SITE_ORIGIN}/`, medicalSpecialty: 'Ophthalmologic', logo: `${SITE_ORIGIN}/wp-content/uploads/2023/01/Clinica-Benchimol-Logo.png`, sameAs: ['https://www.facebook.com/clinicabenchimol', 'https://www.instagram.com/clinicadeolhosbenchimol/'], department: [{ '@id': `${SITE_ORIGIN}/#copacabana` }, { '@id': `${SITE_ORIGIN}/#campo-grande` }] },
    { '@type': 'MedicalClinic', '@id': `${SITE_ORIGIN}/#copacabana`, name: `${siteName} — Copacabana`, parentOrganization: { '@id': `${SITE_ORIGIN}/#clinic` }, address: { '@type': 'PostalAddress', streetAddress: 'Av. N. Senhora de Copacabana, 680, 5º andar', addressLocality: 'Rio de Janeiro', addressRegion: 'RJ', postalCode: '22020-001', addressCountry: 'BR' } },
    { '@type': 'MedicalClinic', '@id': `${SITE_ORIGIN}/#campo-grande`, name: `${siteName} — Campo Grande`, parentOrganization: { '@id': `${SITE_ORIGIN}/#clinic` }, address: { '@type': 'PostalAddress', streetAddress: 'Rua Ivo do Prado, 79, 6º andar', addressLocality: 'Rio de Janeiro', addressRegion: 'RJ', postalCode: '23080-200', addressCountry: 'BR' } },
  ] };
}
export function websiteJsonLd() {
  return { '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${SITE_ORIGIN}/#website`, url: `${SITE_ORIGIN}/`, name: siteName, inLanguage: 'pt-BR', publisher: { '@id': `${SITE_ORIGIN}/#clinic` } };
}
export function breadcrumbJsonLd(path: string, title: string) {
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_ORIGIN}/` }, ...(path === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: title, item: absoluteUrl(path) }])] };
}
export function jsonLdString(value: unknown): string { return JSON.stringify(value).replace(/</g, '\\u003c'); }
export function publicRobots(): MetadataRoute.Robots {
  const privatePaths = ['/admin/', '/api/', '/preview/'];
  return { rules: [
    { userAgent: '*', allow: ['/', '/api/media/'], disallow: privatePaths },
    { userAgent: ['OAI-SearchBot', 'ChatGPT-User', 'PerplexityBot', 'Perplexity-User', 'Claude-SearchBot', 'Claude-User', 'Googlebot', 'Bingbot'], allow: ['/', '/api/media/'], disallow: privatePaths },
    { userAgent: ['GPTBot', 'ClaudeBot', 'Google-Extended', 'CCBot'], disallow: '/' },
  ], sitemap: `${SITE_ORIGIN}/sitemap.xml`, host: SITE_ORIGIN };
}
