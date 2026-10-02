import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { parseVersion } from '@/lib/domain/validation';
import { databaseError } from '@/lib/server/errors';
import { mapPost } from '@/lib/server/mappers';
import { invalidatePublication,recordPublicationState } from '@/lib/server/publication';
export async function POST(request:Request,ctx:{params:Promise<{id:string}>}){return endpoint(async()=>{assertOrigin(request);const {client}=await requireAdmin(),{id}=await ctx.params,{version,revisionId}=parseVersion(await jsonBody(request));const {data,error}=await client.rpc('restore_post',{post_id:id,expected_version:version,revision_id:revisionId??null});if(error)databaseError(error);const post=mapPost(data),publication=await invalidatePublication(post);await recordPublicationState(client,post,publication.status);return success({...post,publicationSync:publication.status},{publication});});}
