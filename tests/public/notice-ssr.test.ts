import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { PublicShell } from '@/components/public/PublicShell';
import { templates } from '@/lib/public/catalog';
import { snapshotSettings } from '@/lib/server/snapshot';
import type { PopupSettings } from '@/lib/domain/types';

const now = '2026-10-02T12:00:00Z';
const popup: PopupSettings = { active: true, title: 'Aviso & <feriado>', text: 'Fecharemos em 12/10.\nRetornaremos em 13/10.', startsAt: now, endsAt: '2026-10-03T12:00:00Z', version: 3, updatedAt: now };
afterEach(() => vi.useRealTimers());
async function renderNotice(value: PopupSettings) {
  vi.useFakeTimers(); vi.setSystemTime(new Date(now));
  return renderToStaticMarkup(await PublicShell({ path: '/', title: 'Clínica', template: templates.sample, html: '<h1>Clínica</h1>', settings: { ...snapshotSettings(), popup: value } }));
}

describe('public notice initial server HTML', () => {
  it('includes active text before hydration in the closed dialog and visible no-JavaScript fallback', async () => {
    const html = await renderNotice(popup), document = new JSDOM(html).window.document;
    expect(document.querySelector('dialog h2')?.textContent).toBe(popup.title);
    expect(document.querySelector('dialog p')?.textContent).toBe(popup.text);
    expect(document.querySelector('dialog')?.hasAttribute('open')).toBe(false);
    expect(document.querySelector('noscript h2')?.textContent).toBe(popup.title);
    expect(document.querySelector('noscript p')?.textContent).toBe(popup.text);
    expect(html).not.toContain('<feriado>');
    document.defaultView?.close();
  });

  it.each([
    { ...popup, active: false },
    { ...popup, startsAt: '2026-10-02T12:00:01Z' },
    { ...popup, endsAt: now },
    { ...popup, startsAt: 'invalid' },
  ])('does not expose inactive, future, expired or invalid notices: %j', async value => {
    const html = await renderNotice(value), document = new JSDOM(html).window.document;
    expect(document.querySelector('dialog h2')).toBeNull();
    expect(document.querySelector('noscript')).toBeNull();
    document.defaultView?.close();
  });
});
