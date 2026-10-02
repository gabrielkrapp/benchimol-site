// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import originalSite from '../../data/wordpress/site.json';
import { PublicInteractions } from '@/components/public/Interactions';
import { htmlToDOM, elements, hasClass, serialize, type DOMNode } from '@/lib/public/dom';
import { sanitizePublicHtml } from '@/lib/public/html';
import { restoreCapturedReviews } from '@/lib/public/reviews';
import { renderCapturedHtml } from '@/lib/public/render';
import captured from '@/lib/public/captured-reviews.json';

let reactRoot: Root | undefined;
afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot?.unmount());
  reactRoot = undefined;
  document.body.innerHTML = '';
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function originalWidget(): DOMNode[] {
  return [elements(htmlToDOM(sanitizePublicHtml(originalSite.homeHtml)), node => hasClass(node, 'ti-widget') && hasClass(node, 'ti-goog'))[0]];
}
function mountRestoredWidget() {
  const nodes = originalWidget();
  restoreCapturedReviews(nodes);
  document.body.innerHTML = `<div class="public-site">${serialize(nodes)}<div id="mount"></div></div>`;
  return document.querySelector<HTMLElement>('.ti-widget')!;
}

describe('captured public reviews', () => {
  it('preserves the original widget fingerprint for avatars already sized by captured CSS', () => {
    const nodes = originalWidget();
    expect(createHash('sha256').update(serialize(nodes)).digest('hex')).toBe(captured.originalWidgetSha256);
    const avatars = elements(nodes, node => node.name === 'img' && hasClass(node.parent as import('@/lib/public/dom').Element, 'ti-profile-img'));
    expect(avatars).toHaveLength(8);
    expect(avatars.every(avatar => !avatar.attribs.width && !avatar.attribs.height)).toBe(true);
  });
  it('fills the five source read-more controls and all eight date rows before JavaScript', () => {
    document.body.innerHTML = renderCapturedHtml(originalSite.homeHtml);
    const widget = document.querySelector<HTMLElement>('.ti-widget')!;
    expect(widget.querySelectorAll('.ti-read-more-active')).toHaveLength(5);
    const dates = Array.from(widget.querySelectorAll('.ti-date')).map(date => {
      const copy = date.cloneNode(true) as HTMLElement;
      copy.querySelector('.ti-tooltip')?.remove();
      return copy.textContent?.trim();
    });
    expect(dates).toEqual(['12 meses atrás', '12 meses atrás', '12 meses atrás', '12 meses atrás', '1 ano atrás', '1 ano atrás', '1 ano atrás', '1 ano atrás']);
    expect(widget.querySelector('.ti-date .ti-tooltip')?.textContent).toBe('22 de outubro de 2025 às 21:00 BRT');
    const placeholders = Array.from(widget.querySelectorAll<HTMLElement>('.ti-read-more')).filter(more => !more.querySelector('.ti-read-more-active'));
    expect(placeholders).toHaveLength(3);
    expect(placeholders.every(more => more.style.opacity === '0' && more.style.pointerEvents === 'none')).toBe(true);
  });

  it('preserves every review in source order and the loaded line breaks without executing a widget plugin', () => {
    const widget = mountRestoredWidget();
    expect(Array.from(widget.querySelectorAll('.ti-name')).map(name => name.textContent?.trim())).toEqual([
      'Vera Fernandes', 'luisa chaves', 'EDUARDO FONSECA', 'Marilene Bezerra', 'Patricia Figueira de Carvalho', 'Alberto Bayde', 'Cida Costa', 'Isa Vasconcellos',
    ]);
    expect(Array.from(widget.querySelectorAll('.ti-review-item')).map(card => card.querySelectorAll('.ti-review-text br').length)).toEqual([0, 0, 2, 3, 0, 0, 4, 2]);
    expect(widget.querySelectorAll('.ti-profile-img img')).toHaveLength(8);
    expect(widget.querySelectorAll('.ti-stars img')).toHaveLength(40);
    expect(widget.querySelector('script,iframe,form,[onclick]')).toBeNull();
    expect(widget.querySelector('.ti-widget-container.ti-col-3')).not.toBeNull();
    expect(Array.from(widget.querySelectorAll<HTMLElement>('.ti-review-text')).every(text => !text.style.height)).toBe(true);
  });

  it('does not replace a widget changed by an approved override or a different widget', () => {
    for (const changed of [
      serialize(originalWidget()).replace('Vera Fernandes', 'Nome aprovado pelo cliente'),
      serialize(originalWidget()).replace('data-layout-id="15"', 'data-layout-id="16"'),
      serialize(originalWidget()).replace('data-layout-id="15"', 'data-layout-id="15" style="color:red"'),
      serialize(originalWidget()).replace('alt="Vera Fernandes profile picture"', 'width="40" height="41" alt="Vera Fernandes profile picture"'),
      '<div class="ti-widget ti-goog"><div class="ti-review-text">Outro depoimento aprovado</div></div>',
    ]) {
      const nodes = htmlToDOM(changed);
      const before = serialize(nodes);
      restoreCapturedReviews(nodes);
      expect(serialize(nodes)).toBe(before);
    }
  });

  it('keeps repeated SSR calls stable and does not leak a mutated widget into the next render', () => {
    const nodes = originalWidget();
    restoreCapturedReviews(nodes);
    const restored = serialize(nodes);
    expect(restored).toContain('ti-read-more-active');
    restoreCapturedReviews(nodes);
    expect(serialize(nodes)).toBe(restored);
    elements(nodes, node => hasClass(node, 'ti-read-more'))[0].children = [];
    const next = originalWidget();
    restoreCapturedReviews(next);
    expect(serialize(next)).toBe(restored);
    for (const element of elements(next, () => true)) expect(element.children.every(child => child.parent === element)).toBe(true);
  });

  it('retains the styled label while expanding by keyboard, collapsing and moving the review carousel', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const widget = mountRestoredWidget();
    const list = widget.querySelector<HTMLElement>('.ti-reviews-container-wrapper')!;
    Object.defineProperty(list, 'clientWidth', { value: 300 });
    list.scrollBy = options => { list.scrollLeft += (options as ScrollToOptions).left || 0; };
    reactRoot = createRoot(document.querySelector('#mount')!);
    await act(async () => reactRoot!.render(createElement(PublicInteractions, { popup: { active: false, title: '', text: '', startsAt: null, endsAt: null, version: 1, updatedAt: '' } })));
    const more = widget.querySelector<HTMLElement>('.ti-read-more')!;
    const button = more.querySelector<HTMLElement>('.ti-read-more-active')!;
    const text = widget.querySelector<HTMLElement>('.ti-review-text')!;
    await act(async () => button.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })));
    expect(text.classList.contains('public-review-expanded')).toBe(true);
    expect(more.querySelector('.ti-read-more-active')?.textContent).toBe('Esconder');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await act(async () => button.click());
    expect(text.classList.contains('public-review-expanded')).toBe(false);
    expect(more.querySelector('.ti-read-more-active')?.textContent).toBe('Leia mais');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(button.tabIndex).toBe(0);
    expect(more.tabIndex).not.toBe(0);
    await act(async () => widget.querySelector<HTMLElement>('.ti-next')!.click());
    expect(list.scrollLeft).toBe(300);
    await act(async () => widget.querySelector<HTMLElement>('.ti-prev')!.click());
    expect(list.scrollLeft).toBe(0);
    const placeholders = Array.from(widget.querySelectorAll<HTMLElement>('.ti-read-more')).filter(button => !button.querySelector('.ti-read-more-active'));
    expect(placeholders.every(button => button.tabIndex !== 0)).toBe(true);
  });
});
