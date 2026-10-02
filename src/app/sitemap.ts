import type { MetadataRoute } from 'next';
import { getAllPublicPosts, getTaxonomies } from '@/lib/server/public-repository';
import { canonicalPostPath, institutionalPages, galleries, galleryArchiveCapture } from '@/lib/public/catalog';
import { absoluteUrl } from '@/lib/public/seo';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [posts, taxonomies] = await Promise.all([getAllPublicPosts(), getTaxonomies()]);
  const pages = [...institutionalPages, ...galleries].map(page => ({ url: absoluteUrl(page.path), ...(page.modifiedAtGmt ? { lastModified: new Date(`${page.modifiedAtGmt.replace(/Z$/, '')}Z`) } : {}) }));
  const articles = posts.map(post => ({ url: absoluteUrl(canonicalPostPath(post)), lastModified: new Date(post.updatedAt) }));
  const archives = [...taxonomies.categories.filter(term => term.count > 0).map(term => ({ url: absoluteUrl(`/category/${term.slug}/`) })), ...taxonomies.tags.filter(term => term.count > 0).map(term => ({ url: absoluteUrl(`/tag/${term.slug}/`) }))];
  return [...new Map([...pages, { url: absoluteUrl(galleryArchiveCapture.path) }, ...articles, ...archives].map(item => [item.url, item])).values()];
}
