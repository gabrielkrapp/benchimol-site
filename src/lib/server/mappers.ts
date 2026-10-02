import type { Post,Media,PublicSettings,PostRevision } from '@/lib/domain/types';
import { sanitizeBodyHtml,sanitizeExcerptHtml,normalizePlainText } from '@/lib/domain/sanitize';
export type DbRow=Record<string,any>;
export function mapPost(row:DbRow):Post {
 return { id:row.id,wpId:row.wp_id ?? null,slug:row.slug,legacyPath:row.public_path ?? row.legacy_path,
 title:normalizePlainText(row.title),excerptHtml:sanitizeExcerptHtml(row.excerpt_html ?? ''),bodyHtml:sanitizeBodyHtml(row.body_html ?? ''),authorName:normalizePlainText(row.author_name ?? ''),status:row.status,
 publishedAt:row.published_at,createdAt:row.created_at,updatedAt:row.updated_at,version:row.version,featuredImage:row.featured_image,featuredAlt:normalizePlainText(row.featured_alt ?? ''),
 categoryIds:row.category_ids ?? [],tagIds:row.tag_ids ?? [],seo:row.seo ?? {title:'',description:''},bodyEditMode:row.body_edit_mode,publicationSync:row.publication_sync };
}
export function mapMedia(row:DbRow,uses:Media['uses']=[]):Media {
 return {id:row.id,wpId:row.wp_id ?? null,url:row.url,originalUrl:row.original_url ?? null,storagePath:row.storage_path ?? null,mimeType:row.mime_type,bytes:Number(row.bytes),width:row.width ?? null,height:row.height ?? null,alt:row.alt,caption:row.caption,createdAt:row.created_at,uses};
}
export function mapSettings(rows:DbRow[],source:PublicSettings['source']='database'):PublicSettings {
 const popup=rows.find(r=>r.key==='popup'),contact=rows.find(r=>r.key==='contact');
 if(!popup||!contact) throw new Error('Missing configured settings');
 return {popup:{...popup.value,title:normalizePlainText(popup.value.title??''),text:normalizePlainText(popup.value.text??''),version:popup.version,updatedAt:popup.updated_at},contact:{...contact.value,whatsapp:String(contact.value.whatsapp??'').replace(/\D/g,''),message:normalizePlainText(contact.value.message??''),version:contact.version,updatedAt:contact.updated_at},source};
}
export function mapRevision(row:DbRow):PostRevision {return {id:row.id,postId:row.post_id,version:row.version,createdAt:row.created_at,actorName:normalizePlainText(row.actor_name??''),snapshot:mapPost(row.snapshot)};}
