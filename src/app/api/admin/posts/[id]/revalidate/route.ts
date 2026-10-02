import { endpoint,assertOrigin,success } from '@/lib/server/http';
import { getAdminPost } from '@/lib/server/admin-repository';
import { requireAdmin } from '@/lib/server/auth';
import { invalidatePublication,recordPublicationState } from '@/lib/server/publication';
import { AppError } from '@/lib/server/errors';
export async function POST(request:Request,ctx:{params:Promise<{id:string}>}){return endpoint(async()=>{assertOrigin(request);const post=await getAdminPost((await ctx.params).id);if(!post)throw new AppError(404,'not_found','Post não encontrado.');const publication=await invalidatePublication(post);await recordPublicationState((await requireAdmin()).client,post,publication.status);return success(publication);});}
