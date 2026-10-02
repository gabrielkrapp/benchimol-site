import { endpoint,assertOrigin,success } from '@/lib/server/http';
import { getAdminMedia } from '@/lib/server/admin-repository';
import { uploadMedia } from '@/lib/server/media';
export async function GET(request:Request){return endpoint(async()=>{const s=new URL(request.url).searchParams;return success(await getAdminMedia({q:s.get('q')??undefined,page:Number(s.get('page')??1),pageSize:Number(s.get('pageSize')??24)}));});}
export async function POST(request:Request){return endpoint(async()=>{assertOrigin(request);return success(await uploadMedia(request),undefined,201);});}
