import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireAdmin } from './auth';
import { AppError,databaseError } from './errors';
import { mapMedia } from './mappers';
import { validateManagedImage } from './image-validation';
import { normalizePlainText } from '@/lib/domain/sanitize';
export async function uploadMedia(request:Request) {
 const {client,user}=await requireAdmin();
 const length=Number(request.headers.get('content-length')??0);if(length>10*1024*1024+100_000)throw new AppError(413,'too_large','Imagem deve ter no máximo 10 MB.');
 const form=await request.formData(),file=form.get('file');
 if(!(file instanceof File)||file.size>10*1024*1024)throw new AppError(422,'validation','Escolha uma imagem de até 10 MB.');
 const fields=z.object({alt:z.string().max(500).transform(normalizePlainText),caption:z.string().max(1000).transform(normalizePlainText)}).parse({alt:form.get('alt')??'',caption:form.get('caption')??''});
 const bytes=new Uint8Array(await file.arrayBuffer());let image:Awaited<ReturnType<typeof validateManagedImage>>;
 try{image=await validateManagedImage(bytes,file.type);}catch{throw new AppError(422,'validation','Imagem inválida. Use PNG, JPEG, GIF ou WebP de até 10 MB, 8192 px por lado e 20 milhões de pixels somando os quadros.');}
 const {extension,width,height}=image;
 const id=randomUUID(),storagePath=`${user.id}/${id}.${extension}`,url=`/api/media/${id}`;
 const uploaded=await client.storage.from('editorial-media').upload(storagePath,bytes,{contentType:file.type,upsert:false,cacheControl:'0'});
 if(uploaded.error)throw new AppError(503,'storage_unavailable','Não foi possível enviar a imagem. Tente novamente.');
 const {data,error}=await client.from('media').insert({id,url,storage_path:storagePath,mime_type:file.type,bytes:file.size,width,height,...fields}).select('*').single();
 if(error){await client.storage.from('editorial-media').remove([storagePath]);databaseError(error);}
 return mapMedia(data);
}
export async function updateMedia(id:string,request:unknown) {
 const {client}=await requireAdmin(),input=z.object({alt:z.string().max(500).transform(normalizePlainText),caption:z.string().max(1000).transform(normalizePlainText)}).strict().parse(request);
 const {data,error}=await client.from('media').update(input).eq('id',id).select('*').maybeSingle();if(error)databaseError(error);if(!data)throw new AppError(404,'not_found','Mídia não encontrada.');return mapMedia(data);
}
export async function deleteMedia(id:string) {
 const {client}=await requireAdmin();const result=await client.from('media').select('*').eq('id',id).maybeSingle();if(result.error)databaseError(result.error);if(!result.data)throw new AppError(404,'not_found','Mídia não encontrada.');
 if(!result.data.storage_path)throw new AppError(409,'legacy_asset','Arquivo legado preservado como referência. A remoção exige revisão da migração.');
 // Lock/check references at the database before deleting bytes; Storage policy repeats checks.
 const deleted=await client.from('media').delete().eq('id',id);if(deleted.error)databaseError(deleted.error);
 const removed=await client.storage.from('editorial-media').remove([result.data.storage_path]);
 if(removed.error)return {deleted:true,storageCleanup:'pending',message:'Registro removido; limpeza do arquivo pendente. O arquivo continua privado.'};
 return {deleted:true,storageCleanup:'complete'};
}

/** Direct upload avoids the hosting request body limit; uploaded bytes remain private until validated. */
export async function createMediaUpload(input:unknown) {
 const {client,user}=await requireAdmin();
 const parsed=z.object({mimeType:z.enum(['image/png','image/jpeg','image/webp','image/gif']),bytes:z.number().int().min(1).max(10*1024*1024),alt:z.string().max(500).transform(normalizePlainText),caption:z.string().max(1000).transform(normalizePlainText)}).strict().parse(input);
 const id=randomUUID(),ext=({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif'} as const)[parsed.mimeType],storagePath=`${user.id}/${id}.${ext}`;
 const intent=await client.from('media_uploads').insert({id,user_id:user.id,storage_path:storagePath,mime_type:parsed.mimeType,bytes:parsed.bytes,alt:parsed.alt,caption:parsed.caption});if(intent.error)databaseError(intent.error);
 const signed=await client.storage.from('editorial-media').createSignedUploadUrl(storagePath,{upsert:false});
 if(signed.error){await client.from('media_uploads').delete().eq('id',id);throw new AppError(503,'storage_unavailable','Não foi possível preparar o envio. Tente novamente.');}
 return {id,storagePath,signedUrl:signed.data.signedUrl,token:signed.data.token};
}
export async function finalizeMediaUpload(id:string) {
 const {client}=await requireAdmin();
 const completed=await client.from('media').select('*').eq('id',id).maybeSingle();if(completed.error)databaseError(completed.error);if(completed.data)return mapMedia(completed.data);
 const result=await client.from('media_uploads').select('*').eq('id',id).maybeSingle();if(result.error)databaseError(result.error);if(!result.data)throw new AppError(404,'not_found','Envio não encontrado ou já finalizado.');
 const intent=result.data;if(Date.parse(intent.created_at)<Date.now()-2*3600_000)throw new AppError(422,'expired_upload','O envio expirou. Escolha o arquivo novamente.');
 const file=await client.storage.from('editorial-media').download(intent.storage_path);if(file.error)throw new AppError(422,'missing_upload','O arquivo ainda não foi enviado.');
 const bytes=new Uint8Array(await file.data.arrayBuffer());let image:Awaited<ReturnType<typeof validateManagedImage>>;
 try{if(bytes.length!==Number(intent.bytes))throw new Error('Unexpected length');image=await validateManagedImage(bytes,intent.mime_type);}catch{
  await client.storage.from('editorial-media').remove([intent.storage_path]);await client.from('media_uploads').delete().eq('id',id);throw new AppError(422,'validation','O arquivo recebido não é uma imagem válida com o tamanho informado.');
 }
 const row={id:intent.id,url:`/api/media/${intent.id}`,storage_path:intent.storage_path,mime_type:intent.mime_type,bytes:bytes.length,width:image.width,height:image.height,alt:intent.alt,caption:intent.caption};
 const saved=await client.from('media').insert(row).select('*').single();if(saved.error){if(saved.error.code==='23505'){const existing=await client.from('media').select('*').eq('id',id).maybeSingle();if(existing.data?.storage_path===intent.storage_path)return mapMedia(existing.data);}databaseError(saved.error);}await client.from('media_uploads').delete().eq('id',id);return mapMedia(saved.data);
}
