import { createHmac } from 'node:crypto';
import { consumeLoginBucket } from './privileged';
import { AppError } from './errors';
export async function limitLogin(email:string,request:Request):Promise<void> {
 const secret=process.env.LOGIN_RATE_SECRET;
 if(!secret||secret.length<32)throw new AppError(503,'setup_required','Configure a proteção de login para habilitar o acesso.');
 // Trust platform-injected IP only on Vercel. Local/unknown connections share a conservative bucket.
 const ip=process.env.VERCEL ? request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim()??'unknown' : 'local';
 const hash=(value:string)=>createHmac('sha256',secret).update(value).digest('hex');
 // Stop on the origin bucket before allocating an email bucket, bounding unique-email abuse.
 if(!await consumeLoginBucket(hash(`origin:${ip}`),24))throw new AppError(429,'rate_limited','Muitas tentativas. Aguarde 15 minutos para tentar novamente.');
 if(!await consumeLoginBucket(hash(`email:${email.toLowerCase()}`),8))throw new AppError(429,'rate_limited','Muitas tentativas. Aguarde 15 minutos para tentar novamente.');
}
