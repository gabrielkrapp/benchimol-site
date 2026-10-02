import { z } from 'zod';
import type { PopupSettings } from './types';
import { sanitizeBodyHtml, sanitizeExcerptHtml, normalizePlainText } from './sanitize';

export const RESERVED_SLUGS = new Set(['admin','api','blog','category','tag','wp-admin','wp-json','wp-content','sitemap.xml','robots.txt','home','sobre-nos','servicos','exames','cirurgias','tratamentos','contato','sample-page','header-benchimol','footer-benchimol','clinica','como-funciona','exames-2','cirurgias-2','aviso','equipe-medica','unidades','convenios','contato-2','cirurgia-de-catarata','cirurgia-refrativa','retina','glaucoma','oftalmopediatria','lentes-de-contato','mapeamento-de-retina','oct','campo-visual','tonometria','paquimetria','topografia-corneana','biometria','microscopia-especular','ultrassonografia','capsulotomia','plastica-ocular','estrabismo','sample-page','blog','dr-sergio-benchimol-old','dra-nina-benchimol','dra-mirelle-benchimol','dra-adriana-benchimol','dra-liana-benchimol','dr-eliezer-benchimol','dr-luciano-galhardo-de-barros','dr-amir-zisman','dr-eduardo-lessa-martinez','dra-amelia-gomes-de-souza','dra-monica-de-oliveira-coelho','dra-dilma-de-sa-cavalcanti-do-vale','dr-paulo-de-heraclito-lima-filho','dra-francine-campos-hauck','instalacoes','equipamentos','certificacoes','especialidades','insternacional','nova-home','sobre-nos','servicos','equipe','faq-perguntas-frequentes','exames-e-procedimentos','catarata','retinopatia-diabetica','degeneracao-macular','glaucoma','cirurgia-refrativa','olho-seco','dr-sergio-benchimol','dra-veronica-benchimol','dr-raphael-lima-benchimol','dr-gabriel-benchimol','convenios']);
export function validateSlug(input: string): string {
  if (!/^[a-z0-9]+(?:[-_][a-z0-9]+)*$/.test(input) || input.length > 200 || RESERVED_SLUGS.has(input)) throw new Error('Slug inválido ou reservado.');
  return input;
}
const html = z.string().max(2_000_000);
const title = z.string().trim().min(1).max(300).transform(normalizePlainText).pipe(z.string().min(1));
const image = z.string().max(2000).refine(v => v.startsWith('/') && !v.startsWith('//') || /^https:\/\/[^\s]+$/.test(v), 'URL de imagem inválida').nullable();
const iso = z.string().refine(v => /^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v) && Number.isFinite(Date.parse(v)), 'Data UTC inválida').nullable();
function safeUrlText(value:string):boolean {
 if(/[\s\u0000-\u001f\u007f\\]/.test(value)||/%(?![a-f0-9]{2})/i.test(value))return false;
 try {
  let decoded=value;for(let i=0;i<3;i++){const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next;}
  if(/[\u0000-\u001f\u007f\\]/.test(decoded))return false;
  const path=decoded.replace(/^https?:\/\/[^/?#]+/i,'').split(/[?#]/)[0];
  return !path.split('/').some(segment=>segment==='.'||segment==='..');
 }catch{return false;}
}
export function isHttpUrl(value:string):boolean {
 if(!/^https?:\/\//i.test(value)||!safeUrlText(value))return false;
 try{const url=new URL(value);return ['http:','https:'].includes(url.protocol)&&Boolean(url.hostname)&&!url.username&&!url.password;}catch{return false;}
}
export function isSeoImageUrl(value:string):boolean {
 if(isHttpUrl(value))return true;
 if(!safeUrlText(value)||/[?#]/.test(value))return false;
 return /^\/api\/media\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)||/^\/(?:wp-content\/uploads|legacy-assets)\/.+\.(?:png|jpe?g|webp|gif|avif|svg|ico)$/i.test(value);
}
const seo = z.object({ title: z.string().max(300), description: z.string().max(600), canonical: z.string().max(2000).refine(isHttpUrl,'URL canônica deve ser HTTP(S) absoluta.').optional(), ogImage: z.string().max(2000).refine(isSeoImageUrl,'Imagem SEO deve usar HTTP(S) ou caminho local de imagem permitido.').optional() }).strict();
const fields = {
  title, slug: z.string().refine(value=>{try{validateSlug(value);return true;}catch{return false;}},'Slug inválido ou reservado.'), excerptHtml: html.transform(sanitizeExcerptHtml),
  bodyHtml: html.transform(sanitizeBodyHtml), authorName: z.string().trim().max(150).transform(normalizePlainText),
  featuredImage: image, featuredAlt: z.string().max(500).transform(normalizePlainText),
  categoryIds: z.array(z.number().int().positive()).max(100), tagIds: z.array(z.number().int().positive()).max(100),
  seo, publishedAt: iso,
};
const create = z.object({
  ...fields, excerptHtml: fields.excerptHtml.default(''), bodyHtml: fields.bodyHtml.default(''),
  authorName: fields.authorName.default('Clínica de Olhos Benchimol'), featuredImage: image.default(null),
  featuredAlt: fields.featuredAlt.default(''), categoryIds: fields.categoryIds.default([]), tagIds: fields.tagIds.default([]),
  seo: seo.default({ title:'', description:'' }), publishedAt: iso.default(null), status: z.literal('draft').default('draft'),
}).strict();
const patch = z.object(fields).partial().extend({ version: z.number().int().positive(), status: z.enum(['draft','published','trashed']) }).strict();
export const parsePostCreate = (input: unknown) => create.parse(input);
export const parsePostPatch = (input: unknown) => {
  const result = patch.parse(input);
  // An empty date in the publishing form means the RPC assigns its server date.
  // Drafts retain explicit null so their optional schedule can be cleared.
  if (result.status === 'published' && result.publishedAt === null) delete result.publishedAt;
  return result;
};
export const parseVersion = (input: unknown) => z.object({ version:z.number().int().positive(), revisionId:z.string().uuid().optional() }).strict().parse(input);
export const parseContactRestore = (input:unknown) => z.object({version:z.number().int().positive(),revisionId:z.string().uuid()}).strict().parse(input);
export function parsePopup(input: unknown) {
  return z.object({ title:z.string().max(200).transform(normalizePlainText), text:z.string().max(5000).transform(normalizePlainText), active:z.boolean(), startsAt:iso, endsAt:iso, version:z.number().int().positive() }).strict()
    .refine(v => !v.startsAt || !v.endsAt || Date.parse(v.startsAt) < Date.parse(v.endsAt), 'Início deve preceder o fim.').parse(input);
}
export function parseContact(input: unknown) {
  return z.object({ whatsapp:z.string().max(50).transform(v => v.replace(/[\s()+.-]/g, '')).refine(v => /^55[1-9]\d\d{8,9}$/.test(v), 'Número brasileiro com DDI 55 obrigatório.'), message:z.string().max(1000).transform(normalizePlainText), version:z.number().int().positive() }).strict().parse(input);
}
export function isPopupVisible(popup: Pick<PopupSettings,'active'|'startsAt'|'endsAt'>, now = new Date()): boolean {
  return popup.active && (!popup.startsAt || Date.parse(popup.startsAt) <= now.getTime()) && (!popup.endsAt || now.getTime() < Date.parse(popup.endsAt));
}
export function validateImage(bytes: Uint8Array, mime: string): 'png'|'jpg'|'webp'|'gif' {
  if (!bytes.length || bytes.length > 10 * 1024 * 1024) throw new Error('Imagem deve ter no máximo 10 MB.');
  const starts = (signature:number[]) => signature.every((v,i) => bytes[i] === v);
  if (mime === 'image/png' && starts([137,80,78,71,13,10,26,10])) return 'png';
  if (mime === 'image/jpeg' && starts([255,216,255])) return 'jpg';
  if (mime === 'image/gif' && starts([71,73,70,56]) && [55,57].includes(bytes[4]) && bytes[5] === 97) return 'gif';
  if (mime === 'image/webp' && starts([82,73,70,70]) && [87,69,66,80].every((v,i)=>bytes[8+i]===v)) return 'webp';
  throw new Error('Tipo de imagem inválido. Aceitos PNG, JPEG, GIF e WebP.');
}
/** Classify the sanitized subset the rich editor preserves; never rewrite the source. */
export function classifyBodyEditMode(input:string):'rich'|'legacy' {
 let body=sanitizeBodyHtml(input);
 // Keep the exact video wrapper expected by Tiptap; arbitrary div/iframe content stays locked.
 body=body.replace(/<div\b([^>]*)>\s*(<iframe\b[^>]*>\s*<\/iframe>)\s*<\/div>/gi,(block,attrs:string,frame:string)=>{
  if(!/\bdata-youtube-video(?:=|\s|$)/.test(attrs))return block;
  const src=/\bsrc="([^"]+)"/.exec(frame)?.[1];if(!src)return block;
  try{const url=new URL(src);return url.protocol==='https:'&&['www.youtube.com','www.youtube-nocookie.com'].includes(url.hostname)&&url.pathname.startsWith('/embed/')?'<p></p>':block;}catch{return block;}
 });
 const supported=new Set(['p','h2','h3','h4','blockquote','u','strong','b','em','i','ul','ol','li','a','br','figure','img','figcaption','span']);
 for(const match of body.matchAll(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi))if(!supported.has(match[1].toLowerCase()))return 'legacy';
 // Known WordPress galleries are preserved as a read-only rich-editor atom.
 const figures=/<\/?figure\b[^>]*>/gi,stack:{start:number;gallery:boolean;outerGallery:boolean}[]=[],ranges:{start:number;end:number}[]=[];
 for(let token=figures.exec(body);token;token=figures.exec(body)){
  if(token[0].startsWith('</')){const opened=stack.pop();if(opened?.gallery&&!opened.outerGallery)ranges.push({start:opened.start,end:figures.lastIndex});}
  else stack.push({start:token.index,gallery:/class="[^"]*\bwp-block-gallery\b/.test(token[0]),outerGallery:stack.some(v=>v.gallery)});
 }
 for(const range of ranges.sort((a,b)=>b.start-a.start))body=body.slice(0,range.start)+'<p></p>'+body.slice(range.end);
 for(const match of body.matchAll(/<figure\b[^>]*>([\s\S]*?)<\/figure>/gi)){
  const content=match[1];
  if((content.match(/<img\b/gi)??[]).length!==1 || (content.match(/<figcaption\b/gi)??[]).length>1 || /<(?:p|figure|ul|ol|h2|h3)\b/i.test(content))return 'legacy';
 }
 // Rich caption images currently preserve plain caption text, not nested inline formatting.
 for(const match of body.matchAll(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/gi))if(/<[a-z]/i.test(match[1]))return 'legacy';
 return 'rich';
}

export function isPostPublic(post:{status:string;publishedAt:string|null},now=new Date()):boolean{return post.status==='published'&&Boolean(post.publishedAt)&&Date.parse(post.publishedAt!)<=now.getTime();}
