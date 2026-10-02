import { serverClient } from './supabase';
import { AppError } from './errors';
export async function requireAdmin() {
  const client=await serverClient();
  const {data,error}=await client.auth.getUser();
  if(error || !data.user) throw new AppError(401,'unauthenticated','Sua sessão expirou. Entre novamente.');
  const result=await client.from('administrators').select('user_id,display_name,active').eq('user_id',data.user.id).maybeSingle();
  if(result.error) throw new AppError(503,'unavailable','Não foi possível verificar o acesso. Tente novamente.');
  if(!result.data?.active) throw new AppError(403,'forbidden','Acesso não autorizado.');
  return {client,user:data.user,admin:{userId:data.user.id,displayName:result.data.display_name as string}};
}
