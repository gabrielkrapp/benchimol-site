import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { getAdminSettings } from '@/lib/server/admin-repository';
import { requireAdmin } from '@/lib/server/auth';
import { parseContact } from '@/lib/domain/validation';
import { databaseError } from '@/lib/server/errors';
import { invalidatePublication } from '@/lib/server/publication';
export async function GET(){return endpoint(async()=>success((await getAdminSettings()).contact));}
export async function PATCH(request:Request){return endpoint(async()=>{assertOrigin(request);const {client}=await requireAdmin(),{version,...payload}=parseContact(await jsonBody(request));const {data,error}=await client.rpc('save_settings',{setting_key:'contact',expected_version:version,payload});if(error)databaseError(error);const publication=await invalidatePublication(undefined,undefined,{key:'contact',version:data.version});return success({...data.value,version:data.version,updatedAt:data.updated_at},{publication});});}
