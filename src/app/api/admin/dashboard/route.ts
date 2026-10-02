import { endpoint,success } from '@/lib/server/http';
import { getDashboard } from '@/lib/server/admin-repository';
export async function GET(){return endpoint(async()=>success(await getDashboard()));}
