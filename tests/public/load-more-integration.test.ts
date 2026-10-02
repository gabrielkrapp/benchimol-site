// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicInteractions } from '@/components/public/Interactions';
import { PublicShell } from '@/components/public/PublicShell';
import { templates } from '@/lib/public/catalog';
import { paginationHtml, renderCapturedHtml } from '@/lib/public/render';
import { snapshotPosts, snapshotSettings } from '@/lib/server/snapshot';
import source from '../../docs/validation/visual-qa/source-blog-load-more.json';

let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.innerHTML = ''; vi.unstubAllGlobals(); });

it('wires the real public client to append one three-post group per Space/Enter without duplicate activation', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true); vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const all = await snapshotPosts(), settings = snapshotSettings();
  const firstNine = source.after.entries.map(title => all.find(post => post.title.trim() === title.trim())!);
  const posts = [...firstNine, ...all.filter(post => !firstNine.includes(post)).slice(0, 3)];
  const page = (number: number) => renderCapturedHtml(templates.blog.html, { posts: posts.slice((number - 1) * 6, number * 6), recentPosts: posts.slice(0, 3), pagination: paginationHtml('/blog/', number, 12, 6) });
  const shell = await PublicShell({ path: '/blog/', title: 'Blog', template: templates.blog, html: page(1), settings });
  document.body.innerHTML = renderToStaticMarkup(shell); document.querySelector('dialog')?.remove();
  const mount = document.createElement('div'); document.querySelector('.public-site')!.append(mount);
  const fetch = vi.fn().mockResolvedValue(new Response(page(2), { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  vi.stubGlobal('fetch', fetch);
  root = createRoot(mount); await act(async () => root!.render(createElement(PublicInteractions, { popup: settings.popup })));
  const button = document.querySelector<HTMLAnchorElement>('a.jkit-block-loadmore')!;
  const entries = () => Array.from(document.querySelectorAll('.jkit-postblock .jkit-block-container > .jkit-posts > article .jkit-post-title')).map(item => item.textContent!.trim());
  const space = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
  button.focus(); await act(async () => button.dispatchEvent(space));
  expect(space.defaultPrevented).toBe(true);
  await vi.waitFor(() => expect(entries()).toEqual(source.after.entries));
  expect(fetch).toHaveBeenCalledTimes(1);
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  await act(async () => button.dispatchEvent(enter));
  expect(enter.defaultPrevented).toBe(true); expect(entries()).toHaveLength(12);
  expect(fetch).toHaveBeenCalledTimes(1); expect(button.isConnected).toBe(false);
  expect(document.querySelectorAll('.jkit-postlist article')).toHaveLength(3);
});
