import { endpoint,assertOrigin,jsonBody,success } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { parseContactRestore,parseContact } from '@/lib/domain/validation';
import { databaseError } from '@/lib/server/errors';
import { invalidatePublication } from '@/lib/server/publication';
export async function POST(request:Request){return endpoint(async()=>{
 assertOrigin(request);const {client}=await requireAdmin(),{version,revisionId}=parseContactRestore(await jsonBody(request));
 const {data,error}=await client.rpc('restore_contact_settings',{expected_version:version,revision_id:revisionId});if(error)databaseError(error);
 const contact={...parseContact({...data.value,version:data.version}),updatedAt:data.updated_at};
 const publication=await invalidatePublication(undefined,undefined,{key:'contact',version:contact.version});return success(contact,{publication});
});}
