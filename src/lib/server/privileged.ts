import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { backendConfig } from './config';
import { AppError } from './errors';
import { validManagedStoragePath } from './media-policy';
import { noStoreFetch } from './supabase';
/** Narrow server-only operations. Never export a privileged client or use it for user Auth. */
function trustedClient(){
 const {url}=backendConfig(),key=process.env.SUPABASE_SECRET_KEY||process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)throw new AppError(503,'setup_required','Configure a chave privada do servidor no projeto exclusivo da clínica.');
 return createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:noStoreFetch}});
}
export async function signMediaDownload(storagePath:string):Promise<string>{
 if(!validManagedStoragePath(storagePath))throw new AppError(503,'unavailable','Imagem temporariamente indisponível.');
 const result=await trustedClient().storage.from('editorial-media').createSignedUrl(storagePath,60);
 if(result.error)throw new AppError(503,'unavailable','Imagem temporariamente indisponível.');return result.data.signedUrl;
}
export async function consumeLoginBucket(hash:string,max:number):Promise<boolean>{
 const result=await trustedClient().rpc('consume_login_attempt',{bucket_hash:hash,max_attempts:max});
 if(result.error)throw new AppError(503,'unavailable','Login temporariamente indisponível. Tente novamente.');return result.data===true;
}
