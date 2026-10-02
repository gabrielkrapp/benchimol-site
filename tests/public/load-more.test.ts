// @vitest-environment jsdom
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initializePublicLoadMore } from '@/components/public/load-more';
import { paginationHtml, renderCapturedHtml } from '@/lib/public/render';
import { templates } from '@/lib/public/catalog';
import { snapshotPosts } from '@/lib/server/snapshot';
import type { Post } from '@/lib/domain/types';
import source from '../../docs/validation/visual-qa/source-blog-load-more.json';

let posts: Post[];
let cleanup: (() => void) | undefined;
beforeAll(async () => {
  const all = await snapshotPosts();
  const captured = source.after.entries.map(title => all.find(post => post.title.trim() === title.trim())!);
  expect(captured.every(Boolean)).toBe(true);
  posts = [...captured, ...all.filter(post => !captured.includes(post)).slice(0, 6)];
});
afterEach(() => { cleanup?.(); cleanup = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function archive(page: number, total = 15, base = '/blog/', template = templates.blog) {
  return `<div class="public-site">${renderCapturedHtml(template.html, { posts: posts.slice((page - 1) * 6, page * 6), recentPosts: posts.slice(0, 3), pagination: paginationHtml(base, page, total, 6) })}</div>`;
}
function mount() {
  document.body.innerHTML = archive(1);
  return document.querySelector<HTMLAnchorElement>('a.jkit-block-loadmore')!;
}
function entries() {
  return Array.from(document.querySelectorAll('.jkit-postblock .jkit-block-container > .jkit-posts > article .jkit-post-title')).map(title => title.textContent!.trim());
}
function click(button: HTMLAnchorElement, init: MouseEventInit = {}) {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
  // Observe the real handler, then stop JSDOM's unsupported document navigation.
  let defaultPrevented = false;
  button.addEventListener('click', observed => { defaultPrevented = observed.defaultPrevented; observed.preventDefault(); }, { once: true });
  button.dispatchEvent(event); return { defaultPrevented };
}
function htmlResponse(html: string, status = 200) { return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } }); }

describe('progressive original archive load-more behavior', () => {
  it('restores the source button role only while enhanced, preserving the SSR role on cleanup', () => {
    const button = mount(), originalRole = button.getAttribute('role');
    cleanup = initializePublicLoadMore(document.body);
    expect(button.getAttribute('role')).toBe('button');
    cleanup(); cleanup = undefined;
    expect(button.getAttribute('role')).toBe(originalRole);
  });

  it('marks each server-rendered archive without removing ordinary crawler links', () => {
    for (const [base, template] of [['/blog/', templates.blog], ['/category/oftalmologia/', templates.taxonomy], ['/simply_galleries/', templates.galleryArchive]] as const) {
      document.body.innerHTML = archive(1, 15, base, template);
      const marker = document.querySelector<HTMLElement>('nav.public-pagination[data-public-archive]')!;
      expect(marker?.dataset.publicArchive).toBe(base); expect(marker.dataset.publicPage).toBe('1');
      expect(document.querySelector<HTMLAnchorElement>('a.jkit-block-loadmore')?.getAttribute('href')).toBe(`${base}page/2/`);
      expect(entries()).toHaveLength(6);
    }
  });

  it('appends the exact three source titles per click without navigation, buffers the other three and reaches the end', async () => {
    const button = mount(), navigate = vi.fn(), originalUrl = window.location.href;
    const fetch = vi.fn().mockResolvedValueOnce(htmlResponse(archive(2))).mockResolvedValueOnce(htmlResponse(archive(3)));
    vi.stubGlobal('fetch', fetch); cleanup = initializePublicLoadMore(document.body, navigate);
    expect(entries()).toEqual(source.before.entries);
    expect(click(button).defaultPrevented).toBe(true);
    await vi.waitFor(() => expect(entries()).toEqual(source.after.entries));
    expect(window.location.href).toBe(originalUrl); expect(navigate).not.toHaveBeenCalled();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(new URL('/blog/page/2/', originalUrl).href);
    expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'GET', credentials: 'same-origin', redirect: 'error', headers: { Accept: 'text/html' } });
    expect(button.getAttribute('href')).toBe('/blog/page/2/');
    click(button); await vi.waitFor(() => expect(entries()).toHaveLength(12));
    expect(fetch).toHaveBeenCalledTimes(1); expect(button.getAttribute('href')).toBe('/blog/page/3/');
    button.focus(); click(button); await vi.waitFor(() => expect(entries()).toHaveLength(15));
    expect(entries()).toEqual(posts.map(post => post.title));
    expect(fetch).toHaveBeenCalledTimes(2); expect(button.isConnected).toBe(false);
    expect(document.querySelector('.public-pagination a[aria-label="Página 3"]')).not.toBeNull();
    expect(document.activeElement).toBe(document.querySelectorAll('.jkit-postblock .jkit-posts > article')[12].querySelector('a'));
    expect(document.querySelector('[role="status"]')?.textContent).toContain('3');
    expect(document.querySelectorAll('.jkit-postlist article')).toHaveLength(3);
  });

  it('locks repeated clicks during the request, restores source labels and aborts without appending or navigating after cleanup', async () => {
    const button = mount(), navigate = vi.fn(); let resolve!: (value: Response) => void;
    const fetch = vi.fn().mockImplementation(() => new Promise<Response>(done => { resolve = done; }));
    vi.stubGlobal('fetch', fetch); cleanup = initializePublicLoadMore(document.body, navigate);
    click(button); click(button);
    expect(fetch).toHaveBeenCalledTimes(1); expect(button.textContent).toBe('Carregando...');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.querySelector('.jkit-postblock .jkit-posts')?.getAttribute('aria-busy')).toBe('true');
    const signal = fetch.mock.calls[0][1].signal as AbortSignal;
    cleanup(); cleanup = undefined;
    expect(signal.aborted).toBe(true); expect(button.textContent).toBe('Carregar Mais');
    resolve(htmlResponse(archive(2))); await new Promise(done => setTimeout(done, 0));
    expect(entries()).toHaveLength(6); expect(navigate).not.toHaveBeenCalled();
    expect(click(button).defaultPrevented).toBe(false); expect(fetch).toHaveBeenCalledTimes(1);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }])('keeps ordinary modified-click navigation intact: %j', init => {
    const button = mount(), fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    cleanup = initializePublicLoadMore(document.body);
    expect(click(button, init).defaultPrevented).toBe(false); expect(fetch).not.toHaveBeenCalled();
  });

  it('leaves external next links unintercepted and never requests another origin', () => {
    const button = mount(), fetch = vi.fn(); button.href = 'https://outside.example/blog/page/2/';
    vi.stubGlobal('fetch', fetch); cleanup = initializePublicLoadMore(document.body);
    expect(click(button).defaultPrevented).toBe(false); expect(fetch).not.toHaveBeenCalled();
  });

  it.each(['network', 'http', 'unexpected-html', 'wrong-archive', 'wrong-successor'])('falls back to the ordinary SSR destination on %s failure', async reason => {
    const button = mount(), navigate = vi.fn();
    const fetch = reason === 'network' ? vi.fn().mockRejectedValue(new TypeError('Network unavailable')) : vi.fn().mockResolvedValue(
      reason === 'http' ? htmlResponse('Unavailable', 503) : reason === 'unexpected-html' ? htmlResponse('<h1>Login</h1>') : reason === 'wrong-archive' ? htmlResponse(archive(2, 15, '/category/other/')) : htmlResponse(archive(2).replace('href="/blog/page/3/" rel="next"', 'href="https://outside.example/blog/page/3/" rel="next"'))
    );
    vi.stubGlobal('fetch', fetch); cleanup = initializePublicLoadMore(document.body, navigate);
    click(button); await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith(new URL('/blog/page/2/', window.location.href).href));
    expect(entries()).toHaveLength(6); expect(button.textContent).toBe('Carregar Mais');
    expect(button.getAttribute('href')).toBe('/blog/page/2/'); expect(button.hasAttribute('aria-disabled')).toBe(false);
  });
});
