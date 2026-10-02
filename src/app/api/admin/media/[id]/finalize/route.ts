import { endpoint,assertOrigin,success } from '@/lib/server/http';
import { finalizeMediaUpload } from '@/lib/server/media';
export async function POST(request:Request,ctx:{params:Promise<{id:string}>}){return endpoint(async()=>{assertOrigin(request);return success(await finalizeMediaUpload((await ctx.params).id),undefined,201);});}
