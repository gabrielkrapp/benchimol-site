import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { getAdminPosts } from '@/lib/server/admin-repository';
import { requireAdmin } from '@/lib/server/auth';
import { parsePostCreate } from '@/lib/domain/validation';
import { databaseError } from '@/lib/server/errors';
import { mapPost } from '@/lib/server/mappers';
import type { PostStatus } from '@/lib/domain/types';
export const dynamic='force-dynamic';
export async function GET(request:Request){return endpoint(async()=>{const s=new URL(request.url).searchParams;return success(await getAdminPosts({q:s.get('q')??undefined,status:(['draft','published','trashed'].includes(s.get('status')??'')?s.get('status'):undefined) as PostStatus|undefined,category:s.has('category')?Number(s.get('category')):undefined,page:Number(s.get('page')??1),pageSize:Number(s.get('pageSize')??20)},s.get('order')==='publishedAt'?'publishedAt':'updatedAt'));});}
export async function POST(request:Request){return endpoint(async()=>{assertOrigin(request);const {client}=await requireAdmin();const input=parsePostCreate(await jsonBody(request));const {data,error}=await client.rpc('create_post',{payload:input});if(error)databaseError(error);return success(mapPost(data),undefined,201);});}
