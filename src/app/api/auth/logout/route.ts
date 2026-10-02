import { endpoint,assertOrigin,success } from '@/lib/server/http';
import { serverClient } from '@/lib/server/supabase';
import { AppError } from '@/lib/server/errors';
export async function POST(request:Request){return endpoint(async()=>{assertOrigin(request);const client=await serverClient();const {error}=await client.auth.signOut();if(error)throw new AppError(503,'unavailable','Não foi possível encerrar a sessão. Tente novamente.');return success({authenticated:false});});}
