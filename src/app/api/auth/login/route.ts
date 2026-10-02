import { z } from 'zod';
import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { serverClient } from '@/lib/server/supabase';
import { AppError } from '@/lib/server/errors';
import { limitLogin } from '@/lib/server/login';
export const dynamic='force-dynamic';
export async function POST(request:Request){return endpoint(async()=>{
 assertOrigin(request);const input=z.object({email:z.string().email().max(254),password:z.string().min(1).max(1024)}).strict().parse(await jsonBody(request));
 await limitLogin(input.email,request);const client=await serverClient();
 const result=await client.auth.signInWithPassword(input);
 if(result.error||!result.data.user)throw new AppError(401,'invalid_login','Não foi possível entrar com os dados informados.');
 const user=await client.auth.getUser();
 const admin=await client.from('administrators').select('active').eq('user_id',user.data.user?.id??'00000000-0000-0000-0000-000000000000').maybeSingle();
 if(user.error||admin.error||!admin.data?.active){await client.auth.signOut();throw new AppError(401,'invalid_login','Não foi possível entrar com os dados informados.');}
 return success({authenticated:true});
});}
