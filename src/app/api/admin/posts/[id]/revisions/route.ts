import { endpoint,success } from '@/lib/server/http';
import { getAdminRevisions } from '@/lib/server/admin-repository';
export async function GET(_request:Request,ctx:{params:Promise<{id:string}>}){return endpoint(async()=>success(await getAdminRevisions((await ctx.params).id)));}
