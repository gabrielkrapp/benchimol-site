import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicShell } from '@/components/public/PublicShell';
import { templates } from '@/lib/public/catalog';
import { snapshotSettings } from '@/lib/server/snapshot';

describe('public shell server rendering', () => {
  it('preserves the two captured Maps embeds through navigation and sanitization', async () => {
    const shell = await PublicShell({ path: '/', title: 'Clínica de Olhos Benchimol', template: templates.sample, html: '<h1>Clínica de Olhos Benchimol</h1>', settings: snapshotSettings() });
    const html = renderToStaticMarkup(shell);
    expect((html.match(/<iframe\b/g) || []).length).toBe(2);
    expect(html).toContain('https://maps.google.com/maps?q=');
    expect(html).toContain('Rua Ivo do Prado');
    expect(html).not.toContain('about:blank');
    expect(html).toContain('parent-has-child');
  });
});
