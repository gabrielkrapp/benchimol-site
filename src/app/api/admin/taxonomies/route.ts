import { endpoint,success } from '@/lib/server/http';
import { getAdminTaxonomies } from '@/lib/server/admin-repository';
export async function GET(){return endpoint(async()=>success(await getAdminTaxonomies()));}
