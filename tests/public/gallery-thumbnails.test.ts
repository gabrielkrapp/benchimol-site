// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { galleries } from '@/lib/public/catalog';
import { pageTemplate, renderCapturedHtml } from '@/lib/public/render';
import { initializePublicGalleries } from '@/components/public/galleries';
import source from '../../docs/validation/visual-qa/source-final-controls.json';

let cleanup: (() => void) | undefined;
afterEach(() => { cleanup?.(); cleanup = undefined; document.body.innerHTML = ''; document.head.innerHTML = ''; vi.unstubAllGlobals(); });
function renderGallery() {
  document.body.innerHTML = `<div class="public-site">${renderCapturedHtml(pageTemplate(galleries[0]).html)}</div>`;
  return Array.from(document.querySelectorAll<HTMLButtonElement>('.public-gallery-thumb'));
}
describe('captured Simply Gallery thumbnail frames', () => {
  it('preserves captured frame, overlay and all initially selected desktop photos in SSR', () => {
    const thumbs = renderGallery();
    const sourceSelected = source.thumbs.flatMap((thumb, index) => thumb.outer.className.includes('pgc-select') ? [index] : []);
    expect(thumbs.flatMap((thumb, index) => thumb.getAttribute('aria-pressed') === 'true' ? [index] : [])).toEqual(sourceSelected);
    for (const thumb of thumbs) {
      expect(thumb.classList.contains('pgc-rev-scroll-bar-thumb-simple-border')).toBe(true);
      expect(thumb.querySelector('.pgc-rev-scroll-bar-thumb-item-wrap img')).not.toBeNull();
      expect(thumb.querySelector('.pgc-rev-scroll-bar-thumb-item-inner')?.getAttribute('aria-hidden')).toBe('true');
      expect(thumb.querySelector('.pgc-rev-scroll-bar-thumb-item-hover')?.getAttribute('aria-hidden')).toBe('true');
      expect(thumb.classList.contains('pgc-select')).toBe(thumb.getAttribute('aria-pressed') === 'true');
    }
  });

  it.each([3, 1])('keeps accessible and visual selection on exactly the visible group of %i photos', columns => {
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    const thumbs = renderGallery(), strip = document.querySelector<HTMLElement>('.sgb-gallery')!;
    Object.defineProperty(strip, 'clientWidth', { value: columns * 100 });
    Object.defineProperty(strip, 'scrollWidth', { value: thumbs.length * 100 });
    document.querySelectorAll('.sgb-item').forEach((panel, index) => Object.defineProperty(panel, 'offsetLeft', { value: index * 100 }));
    strip.scrollTo = vi.fn(options => { strip.scrollLeft = (options as ScrollToOptions).left || 0; strip.dispatchEvent(new Event('scroll')); });
    cleanup = initializePublicGalleries(document.body);
    const selected = () => thumbs.flatMap((thumb, index) => thumb.getAttribute('aria-pressed') === 'true' ? [index] : []);
    expect(selected()).toEqual(columns === 3 ? [0, 1, 2] : [0]);
    thumbs[5].click();
    expect(selected()).toEqual(columns === 3 ? [3, 4, 5] : [5]);
    expect(thumbs.map(thumb => thumb.classList.contains('pgc-select'))).toEqual(thumbs.map(thumb => thumb.getAttribute('aria-pressed') === 'true'));
    document.querySelector<HTMLButtonElement>('.public-gallery-next')!.click();
    expect(selected()).toEqual(columns === 3 ? [6, 7, 8] : [6]);
  });

  it('applies the captured white-frame and dimming states through the real source and migration styles', () => {
    const thumbs = renderGallery();
    const style = document.createElement('style');
    style.textContent = readFileSync('public/legacy-assets/elementor-restored/931443d510846952/pgc_sgb_lightbox.min.style.css', 'utf8') + readFileSync('src/components/public/gallery.css', 'utf8');
    document.head.append(style);
    const selected = getComputedStyle(thumbs[0]), inactive = getComputedStyle(thumbs[3]);
    expect(selected.width).toBe(`${source.thumbs[0].outer.rect.width}px`);
    expect(selected.height).toBe(`${source.thumbs[0].outer.rect.height}px`);
    expect(selected.padding).toBe(source.thumbs[0].outer.padding);
    expect(selected.borderRadius).toBe(source.thumbs[0].outer.borderRadius);
    expect(inactive.width).toBe(selected.width);
    const inner = getComputedStyle(thumbs[0].querySelector('.pgc-rev-scroll-bar-thumb-item-inner')!);
    const activeOverlay = getComputedStyle(thumbs[0].querySelector('.pgc-rev-scroll-bar-thumb-item-hover')!);
    const inactiveOverlay = getComputedStyle(thumbs[3].querySelector('.pgc-rev-scroll-bar-thumb-item-hover')!);
    expect(inner.border).toBe(source.thumbs[0].border.border);
    expect(activeOverlay.opacity).toBe(source.thumbs[0].overlay.opacity);
    expect(inactiveOverlay.opacity).toBe(source.thumbs[3].overlay.opacity);
    expect(inactiveOverlay.backgroundColor).toBe(source.thumbs[3].overlay.background);
  });
});
