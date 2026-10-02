import { requireAdmin } from '@/lib/server/auth';
import { getAdminPrompts } from '@/lib/admin/prompts';
import { PromptLibrary } from '@/components/admin/PromptLibrary';
export default async function PromptsPage() { await requireAdmin(); return <PromptLibrary prompts={await getAdminPrompts()} />; }
