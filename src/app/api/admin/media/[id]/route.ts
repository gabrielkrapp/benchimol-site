import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { updateMedia,deleteMedia } from '@/lib/server/media';
type Context={params:Promise<{id:string}>};
export async function PATCH(request:Request,ctx:Context){return endpoint(async()=>{assertOrigin(request);return success(await updateMedia((await ctx.params).id,await jsonBody(request)));});}
export async function DELETE(request:Request,ctx:Context){return endpoint(async()=>{assertOrigin(request);return success(await deleteMedia((await ctx.params).id));});}
