import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { AppError } from './errors';
const privateHeaders={'Cache-Control':'private, no-store, max-age=0','Pragma':'no-cache','Expires':'0','X-Robots-Tag':'noindex, nofollow'};
export const success=(data:unknown,meta?:unknown,status=200)=>NextResponse.json({data,...(meta?{meta}:{})},{status,headers:privateHeaders});
export async function endpoint(action:()=>Promise<Response>):Promise<Response> {
 try{return await action();}catch(error){
  const app=error instanceof AppError?error:error instanceof ZodError||error instanceof SyntaxError?new AppError(422,'validation','Revise os campos informados.'):new AppError(503,'unavailable','O serviço está temporariamente indisponível. Tente novamente.');
  return NextResponse.json({error:{code:app.code,message:app.message}},{status:app.status,headers:privateHeaders});
 }
}
export function assertOrigin(request:Request):void {
 const origin=request.headers.get('origin');
 const allowed=new Set([process.env.NEXT_PUBLIC_SITE_URL].filter(Boolean));
 const url=new URL(request.url);
 // Next can normalize the browser's loopback hostname in Request.url.
 // Keep aliases on the same protocol/port; never trust arbitrary Host headers.
 const loopbackHosts=['localhost','127.0.0.1'];
 if(loopbackHosts.includes(url.hostname))for(const hostname of loopbackHosts){
  const local=new URL(url.origin);local.hostname=hostname;allowed.add(local.origin);
 }
 if(!origin||!allowed.has(origin))throw new AppError(403,'origin_denied','Origem de solicitação não autorizada.');
 if(request.headers.get('sec-fetch-site')==='cross-site')throw new AppError(403,'origin_denied','Origem de solicitação não autorizada.');
}
export async function jsonBody(request:Request):Promise<unknown> {
 if(!request.headers.get('content-type')?.includes('application/json'))throw new AppError(422,'validation','Envie um objeto JSON.');
 const declared=Number(request.headers.get('content-length')??0);if(declared>2_100_000)throw new AppError(413,'too_large','Conteúdo excede o limite.');
 const text=await request.text();if(Buffer.byteLength(text)>2_100_000)throw new AppError(413,'too_large','Conteúdo excede o limite.');
 return JSON.parse(text);
}
