import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { createMediaUpload } from '@/lib/server/media';
export async function POST(request:Request){return endpoint(async()=>{assertOrigin(request);return success(await createMediaUpload(await jsonBody(request)));});}
