import { revalidatePath } from 'next/cache';
import { isPostPublic } from '@/lib/domain/validation';
import type { Post } from '@/lib/domain/types';
import { getAllPublicPosts,getPublicPostByPath,getPublicSettings } from './public-repository';
import { AppError } from './errors';
/** Verify the no-store public data after commit; CDN/hosting behavior still needs manual acceptance. */
export async function invalidatePublication(post?:Post,oldPath?:string,setting?:{key:'popup'|'contact';version:number}) {
 let phase:'cache'|'post-read'|'post-confirm'|'settings-read'|'settings-confirm'='cache';
 // A publish date can pass while requests are pending. Verify every surface
 // against one UTC cutoff rather than comparing old reads with a newer clock.
 const now=new Date();
 try {
  for(const path of new Set(['/', '/blog/','/sitemap.xml',post?.legacyPath,oldPath].filter((p):p is string=>Boolean(p))))revalidatePath(path);
  // Archives and articles share this registered route file; URL-shaped dynamic
  // patterns without a corresponding page file do not invalidate its cache.
  revalidatePath('/(public)/[[...path]]','page');
  if(post){
   phase='post-read';
   const [current,archive]=await Promise.all([getPublicPostByPath(post.legacyPath,now),getAllPublicPosts(now)]);
   phase='post-confirm';
   const listed=archive.find(p=>p.id===post.id);
   if(isPostPublic(post,now)&&(current?.id!==post.id||current.version!==post.version||listed?.version!==post.version))throw new Error('Public version not confirmed');
   if(!isPostPublic(post,now)&&(current?.id===post.id||listed))throw new Error('Withdrawal not confirmed');
  }
  if(setting){phase='settings-read';const current=await getPublicSettings();phase='settings-confirm';if(current[setting.key].version!==setting.version)throw new Error('Settings version not confirmed');}
  if(post?.status==='published'&&!isPostPublic(post,now))return {status:'current' as const,message:post.publishedAt?`Publicação agendada para ${new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}).format(new Date(post.publishedAt))}. Conteúdo confirmado privado até essa data.`:'Conteúdo salvo e privado. Informe a data de publicação para exibi-lo.'};
  return {status:'current' as const,message:'Conteúdo salvo e versão confirmada na leitura pública do banco. A verificação de CDN depende da hospedagem.'};
 }catch(error){
  // Keep diagnostic phases/codes server-side. Never log provider messages,
  // stacks, URLs, credentials or editorial payloads.
  const nextCode=error && typeof error==='object' && '__NEXT_ERROR_CODE' in error ? error.__NEXT_ERROR_CODE : undefined;
  const code=error instanceof AppError ? error.code : typeof nextCode==='string' && /^E\d{1,5}$/.test(nextCode) ? nextCode : 'unconfirmed';
  console.warn('[publication] Confirmation failed',{phase,code});
  return {status:'pending' as const,message:'Conteúdo salvo; atualização pública pendente de confirmação. Tente a invalidação novamente.'};
 }
}

export async function recordPublicationState(client:import('@supabase/supabase-js').SupabaseClient,post:Post,state:'current'|'pending') {
 const saved=await client.from('posts').update({publication_sync:state}).eq('id',post.id).eq('version',post.version);
 return !saved.error;
}
