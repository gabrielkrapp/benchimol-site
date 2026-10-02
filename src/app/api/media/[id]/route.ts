import { endpoint } from '@/lib/server/http';
import { serverClient,publicClient } from '@/lib/server/supabase';
import { signMediaDownload } from '@/lib/server/privileged';
import { AppError,databaseError } from '@/lib/server/errors';
export const dynamic='force-dynamic';
export async function GET(_request:Request,ctx:{params:Promise<{id:string}>}){return endpoint(async()=>{
 const {id}=await ctx.params;if(!/^[a-f0-9-]{36}$/.test(id))throw new AppError(404,'not_found','Imagem não encontrada.');
 let client=publicClient(),media:any=null;
 const authenticated=await serverClient();const identity=await authenticated.auth.getUser();
 if(identity.data.user&&!identity.error){const admin=await authenticated.from('administrators').select('active').eq('user_id',identity.data.user.id).maybeSingle();if(admin.error)databaseError(admin.error);if(admin.data?.active){client=authenticated;const row=await client.from('media').select('*').eq('id',id).maybeSingle();if(row.error)databaseError(row.error);media=row.data;}}
 if(!media){const row=await client.rpc('get_public_media',{media_id:id});if(row.error)databaseError(row.error);media=row.data?.[0];}
 if(!media?.storage_path)throw new AppError(404,'not_found','Imagem não encontrada.');
 const signedUrl=await signMediaDownload(media.storage_path);
 return new Response(null,{status:307,headers:{'Location':signedUrl,'Cache-Control':'private, no-store, max-age=0','X-Content-Type-Options':'nosniff'}});
});}
