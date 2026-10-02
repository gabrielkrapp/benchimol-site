import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { getAdminPost } from '@/lib/server/admin-repository';
import { requireAdmin } from '@/lib/server/auth';
import { invalidatePublication,recordPublicationState } from '@/lib/server/publication';
import { AppError } from '@/lib/server/errors';
import { z } from 'zod';
export async function POST(request:Request,ctx:{params:Promise<{id:string}>}){return endpoint(async()=>{
 assertOrigin(request);const {version}=z.object({version:z.number().int().positive()}).strict().parse(await jsonBody(request));
 const post=await getAdminPost((await ctx.params).id);if(!post)throw new AppError(404,'not_found','Post não encontrado.');
 if(post.version!==version)throw new AppError(409,'version_conflict','Este post foi alterado. Recarregue antes de tentar novamente.');
 const publication=await invalidatePublication(post);await recordPublicationState((await requireAdmin()).client,post,publication.status);
 return success({...post,publicationSync:publication.status},{publication});
});}
