import { createHash } from 'node:crypto';
import type { CapturedTemplate } from './catalog';

export function stylesheetKey(template: CapturedTemplate, customCss: string): string {
  // New database articles share the captured article template. The generator verifies
  // that no captured stylesheet selects a per-post body ID before normalizing it.
  const bodyClasses = template.bodyClasses.split(/\s+/).filter(name => name && !/^postid-/.test(name)).sort();
  return createHash('sha256').update(JSON.stringify({ paths: [...new Set(template.cssPaths)], inline: template.inlineStyles, bodyClasses, customCss })).digest('hex');
}
