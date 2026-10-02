import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { getAdminPost } from '@/lib/server/admin-repository';
import { requireAdmin } from '@/lib/server/auth';
import { parsePostPatch,parseVersion } from '@/lib/domain/validation';
import { databaseError,AppError } from '@/lib/server/errors';
import { mapPost } from '@/lib/server/mappers';
import { invalidatePublication,recordPublicationState } from '@/lib/server/publication';
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,ctx:Context){return endpoint(async()=>{const {id}=await ctx.params;const post=await getAdminPost(id);if(!post)throw new AppError(404,'not_found','Post não encontrado.');return success(post);});}
async function save(request:Request,ctx:Context,trash=false){return endpoint(async()=>{assertOrigin(request);const {id}=await ctx.params,{client}=await requireAdmin();const previous=await getAdminPost(id);if(!previous)throw new AppError(404,'not_found','Post não encontrado.');
 const raw=await jsonBody(request);const input=trash?{...parseVersion(raw),status:'trashed' as const}:parsePostPatch(raw);const {version,...payload}=input;
 // Reject known stale versions before a remote mutation. The RPC still owns
 // the atomic check for edits committed after this authorized read.
 if(version!==previous.version)throw new AppError(409,'version_conflict','Este item foi alterado. Recarregue antes de salvar.');
 const {data,error}=await client.rpc('save_post',{post_id:id,expected_version:version,payload});
 if(error){const code=/^(?:[0-9A-Z]{5}|PGRST\d{3})$/.test(error.code??'')?error.code:'unavailable';console.warn('[admin-post] Save failed',{code});databaseError(error);}
 const post=mapPost(data);const publication=await invalidatePublication(post,previous.legacyPath);await recordPublicationState(client,post,publication.status);return success({...post,publicationSync:publication.status},{publication});});}
export async function PATCH(request:Request,ctx:Context){return save(request,ctx);}
export async function DELETE(request:Request,ctx:Context){return save(request,ctx,true);}
