import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import catalog from '../../../docs/prompts/catalog.json';
export interface AdminPrompt { id: string; title: string; category: string; version: string; contextPaths: string[]; text: string; }
export async function getAdminPrompts(): Promise<AdminPrompt[]> {
  if (catalog.basePath !== 'docs/prompts/base.md') throw new Error('Invalid prompt base path');
  const base = await readFile(path.join(process.cwd(), 'docs/prompts/base.md'), 'utf8');
  return Promise.all(catalog.prompts.map(async item => {
    if (!/^docs\/prompts\/[a-z0-9-]+\.md$/.test(item.path)) throw new Error('Invalid prompt file path');
    const filename = path.basename(item.path);
    // Keep a literal directory prefix so production tracing cannot include the
    // whole project (contracts and raw research are never runtime documents).
    const task = await readFile(path.join(process.cwd(), 'docs/prompts', filename), 'utf8');
    return { id: item.id, title: item.title, category: item.category, version: item.version, contextPaths: item.contextPaths, text: `${base.trim()}\n\n${task.trim()}\n` };
  }));
}
