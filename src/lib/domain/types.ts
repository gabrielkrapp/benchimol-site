export type PostStatus = 'draft' | 'published' | 'trashed';
export interface SeoFields { title: string; description: string; canonical?: string; ogImage?: string; }
export interface Post {
  id: string; wpId: number | null; slug: string; legacyPath: string;
  title: string; excerptHtml: string; bodyHtml: string; authorName: string;
  status: PostStatus; publishedAt: string | null; createdAt: string; updatedAt: string;
  version: number; featuredImage: string | null; featuredAlt: string;
  categoryIds: number[]; tagIds: number[]; seo: SeoFields;
  bodyEditMode: 'rich' | 'legacy'; publicationSync: 'current' | 'pending';
}
export interface Taxonomy { wpId: number; slug: string; name: string; count: number; }
export interface PopupSettings {
  title: string; text: string; active: boolean; startsAt: string | null; endsAt: string | null;
  version: number; updatedAt: string;
}
export interface ContactSettings { whatsapp: string; message: string; version: number; updatedAt: string; }
export interface ContactRevision { id: string; version: number; createdAt: string; actorName: string; snapshot: ContactSettings; }
export interface PublicSettings { popup: PopupSettings; contact: ContactSettings; source: 'database' | 'snapshot'; }
export interface Media {
  id: string; wpId: number | null; url: string; originalUrl: string | null;
  storagePath: string | null; mimeType: string; bytes: number; width: number | null;
  height: number | null; alt: string; caption: string; createdAt: string;
  uses: { postId: string; title: string }[];
}
export interface PostRevision { id: string; postId: string; version: number; createdAt: string; actorName: string; snapshot: Post; }
export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number; }
export interface PostFilters { q?: string; status?: PostStatus; category?: number; tag?: number; author?: string; page?: number; pageSize?: number; }
export interface Dashboard {
  counts: Record<PostStatus, number>; recentPosts: Post[]; settings: PublicSettings;
  storage: { bytes: number; items: number; source: string; checkedAt: string };
  backup: { lastExportAt: string | null; lastRestoreAt: string | null; source: string };
  warnings: { message: string; postId?: string }[]; checkedAt: string;
}
