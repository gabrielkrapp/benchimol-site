import manifestData from './style-manifest.json';
import { stylesheetKey } from './style-key';
import type { CapturedTemplate } from './catalog';

export interface CompiledStylesheet { href: string; bytes: number; sha256: string; }
const manifest = manifestData as Record<string, CompiledStylesheet>;
export function publicStylesheet(template: CapturedTemplate, customCss: string): CompiledStylesheet {
  const stylesheet = manifest[stylesheetKey(template, customCss)];
  if (!stylesheet) throw new Error('Public stylesheet manifest is stale. Run npm run styles:public before starting or building the application.');
  return stylesheet;
}
