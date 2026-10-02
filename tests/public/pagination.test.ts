// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { paginationHtml, renderCapturedHtml } from '@/lib/public/render';
import { templates } from '@/lib/public/catalog';

afterEach(() => { document.body.innerHTML = ''; document.head.innerHTML = ''; });

describe('public archive pagination fidelity', () => {
  it('keeps the original load-more classes and label as the only visible next-page link', () => {
    document.body.innerHTML = paginationHtml('/blog/', 1, 154, 6);
    const button = document.querySelector<HTMLAnchorElement>('a.jkit-pagination-button.jkit-block-loadmore.icon-position-before')!;
    expect(button).not.toBeNull();
    expect(button.getAttribute('href')).toBe('/blog/page/2/');
    expect(button.rel).toBe('next');
    expect(button.querySelector('span[data-load="Carregar Mais"][data-loading="Carregando..."]')?.textContent).toBe('Carregar Mais');
    expect(button.closest('.public-visually-hidden')).toBeNull();
    const links = Array.from(document.querySelectorAll('a')).filter(link => !link.closest('.public-visually-hidden'));
    expect(links).toEqual([button]);
  });

  it('keeps the current page, previous link and page indices accessible without adding a visible row', () => {
    document.body.innerHTML = paginationHtml('/category/oftalmologia/', 2, 154, 6);
    const navigation = document.querySelector('nav.public-pagination.public-visually-hidden')!;
    expect(navigation).not.toBeNull();
    expect(navigation.getAttribute('aria-label')).toBe('Paginação do blog');
    expect(navigation.querySelector<HTMLAnchorElement>('a[rel="prev"]')?.getAttribute('href')).toBe('/category/oftalmologia/');
    expect(navigation.querySelector('[aria-current="page"]')?.textContent).toBe('2');
    expect(navigation.querySelector('a[aria-label="Página 26"]')?.getAttribute('href')).toBe('/category/oftalmologia/page/26/');
    expect(document.querySelector<HTMLAnchorElement>('a[rel="next"]')?.getAttribute('href')).toBe('/category/oftalmologia/page/3/');
    document.head.innerHTML = `<style>${readFileSync('src/components/public/public.css', 'utf8')}</style>`;
    const style = getComputedStyle(navigation);
    expect(style.position).toBe('absolute');
    expect(style.width).toBe('1px');
    expect(style.height).toBe('1px');
    expect(style.overflow).toBe('hidden');
  });

  it('exposes the complete archive through ordinary next-page links without JavaScript', () => {
    const visited: number[] = [];
    let page = 1;
    while (page <= 26) {
      visited.push(page);
      document.body.innerHTML = paginationHtml('/blog/', page, 154, 6);
      const next = document.querySelector<HTMLAnchorElement>('a.jkit-block-loadmore[rel="next"]');
      if (!next) break;
      const nextPage = Number(next.getAttribute('href')?.match(/\/page\/(\d+)\//)?.[1]);
      expect(nextPage).toBe(page + 1);
      page = nextPage;
    }
    expect(visited).toEqual(Array.from({ length: 26 }, (_, index) => index + 1));
    expect(document.querySelector('[aria-current="page"]')?.textContent).toBe('26');
    expect(document.querySelector<HTMLAnchorElement>('a[rel="prev"]')?.getAttribute('href')).toBe('/blog/page/25/');
    expect(document.querySelector('a[rel="next"]')).toBeNull();
    expect(paginationHtml('/blog/', 1, 6, 6)).toBe('');
    expect(paginationHtml('/blog/', 1, 0, 6)).toBe('');
  });

  it('preserves each archive template wrapper that supplies the source button styles', () => {
    for (const template of [templates.blog, templates.taxonomy, templates.galleryArchive]) {
      document.body.innerHTML = renderCapturedHtml(template.html, { posts: [], pagination: paginationHtml('/blog/', 1, 154, 6) });
      const button = document.querySelector('a.jkit-pagination-button.jkit-block-loadmore');
      expect(button).not.toBeNull();
      expect(button?.closest('.elementor-3567 .elementor-element-4bcdf2a0 .jeg-elementor-kit.jkit-postblock .jkit-block-pagination')).not.toBeNull();
      expect(document.querySelectorAll('.public-pagination')).toHaveLength(1);
      expect(document.querySelectorAll('.jkit-block-pagination > a.jkit-block-loadmore')).toHaveLength(1);
    }
  });
});
