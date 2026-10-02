// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import postcss from 'postcss';
import { act, createElement, StrictMode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { PublicShell } from '@/components/public/PublicShell';
import { PublicInteractions } from '@/components/public/Interactions';
import { templates } from '@/lib/public/catalog';
import { snapshotSettings } from '@/lib/server/snapshot';

let reactRoot: Root | undefined;
afterEach(async () => {
  if (reactRoot) await act(async () => reactRoot?.unmount());
  reactRoot = undefined;
  document.body.innerHTML = ''; document.head.innerHTML = '';
  vi.unstubAllGlobals(); vi.restoreAllMocks();
});

// JSDOM does not evaluate viewport media queries. Apply the rules from the real
// captured stylesheet whose width conditions match this test's viewport.
function sourceHfeStyles(width: number) {
  const applicable: string[] = [];
  for (const file of [
    'public/legacy-assets/elementor-restored/9cdc8e6687798628/frontend.css',
    'public/legacy-assets/elementor-restored/8af7a853ff04c8f7/post-55.css',
  ]) postcss.parse(readFileSync(file, 'utf8')).walkRules(rule => {
    let current: typeof rule.parent | postcss.Document = rule.parent;
    while (current) {
      if (current.type === 'atrule' && current.name === 'media') {
        const max = current.params.match(/max-width\s*:\s*(\d+)px/), min = current.params.match(/min-width\s*:\s*(\d+)px/);
        if (max && width > Number(max[1]) || min && width < Number(min[1])) return;
      }
      current = current.parent;
    }
    applicable.push(rule.toString());
  });
  const style = document.head.querySelector<HTMLStyleElement>('#source-hfe-styles') || document.createElement('style');
  style.id = 'source-hfe-styles'; style.textContent = applicable.join('\n'); document.head.append(style);
}

async function mountShell(width = 390, measuredWidth = 335, strict = false) {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  const settings = snapshotSettings();
  const shell = await PublicShell({ path: '/', title: 'Clínica de Olhos Benchimol', template: templates.sample, html: '<h1>Clínica de Olhos Benchimol</h1>', settings });
  document.body.innerHTML = renderToStaticMarkup(shell);
  document.querySelector('dialog')?.remove();
  const nav = document.querySelector<HTMLElement>('footer .hfe-nav-menu__layout-vertical')!;
  // JSDOM has no layout engine. Supply the captured widget width rather than a
  // viewport width; the real browser obtains this from the menu's container.
  const measure = vi.spyOn(nav.parentElement!, 'getBoundingClientRect').mockImplementation(() => ({ width: measuredWidth } as DOMRect));
  const mount = document.createElement('div'); document.querySelector('.public-site')!.append(mount);
  sourceHfeStyles(width);
  reactRoot = createRoot(mount);
  const interactions = createElement(PublicInteractions, { popup: { ...settings.popup, active: false } });
  await act(async () => reactRoot!.render(strict ? createElement(StrictMode, null, interactions) : interactions));
  const toggle = document.querySelector<HTMLElement>('footer .hfe-nav-menu__toggle')!;
  const submenu = nav.querySelector<HTMLElement>('.hfe-has-submenu-container')!;
  return { toggle, nav, submenu, list: submenu.nextElementSibling as HTMLElement, measure };
}
async function resize(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  sourceHfeStyles(width);
  await act(async () => window.dispatchEvent(new Event('resize')));
}
async function key(control: HTMLElement, value: string) {
  await act(async () => control.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })));
}

describe('captured HFE footer navigation', () => {
  it.each([390, 768])('opens the source HFE dropdown overlay with Enter at %ipx', async width => {
    const { toggle, nav, submenu, list } = await mountShell(width);
    const home = nav.querySelector<HTMLAnchorElement>('a')!;
    expect(getComputedStyle(nav).visibility).toBe('hidden');
    await key(toggle, 'Enter');
    expect(toggle.classList.contains('hfe-active-menu')).toBe(true);
    expect(toggle.classList.contains('hfe-active-menu-full-width')).toBe(true);
    expect(nav.classList.contains('hfe-dropdown')).toBe(true);
    expect(nav.classList.contains('menu-is-active')).toBe(true);
    expect(toggle.getAttribute('aria-label')).toBe('Fechar menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    expect(getComputedStyle(nav).visibility).toBe('visible');
    expect(getComputedStyle(nav).opacity).toBe('1');
    expect(getComputedStyle(nav).height).toBe('auto');
    expect(getComputedStyle(nav).position).toBe('absolute');
    expect(getComputedStyle(nav).top).toBe('100%');
    expect(nav.style.width).toBe('335px');
    expect(nav.style.left).toBe('0px');
    expect(nav.style.zIndex).toBe('9999');
    const standardLink = Array.from(nav.querySelectorAll<HTMLAnchorElement>('a.hfe-menu-item')).find(link => !link.closest('.current-menu-item, .current-menu-ancestor'))!;
    expect(getComputedStyle(standardLink).color).toBe('rgb(52, 52, 52)');
    expect(getComputedStyle(home).paddingTop).toBe('8px');
    expect(getComputedStyle(home).paddingBottom).toBe('8px');
    expect(toggle.querySelector('i')?.className).toBe('far fa-window-close');
    expect(home.tabIndex).toBe(0); home.focus(); expect(document.activeElement).toBe(home);
    expect(submenu.tabIndex).toBe(0);
    expect(list.querySelector<HTMLAnchorElement>('a')?.tabIndex).toBe(-1);
  });

  it('starts collapsed without hidden links or submenu controls in the tab order', async () => {
    const { toggle, nav, submenu, list } = await mountShell();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-label')).toBe('Abrir menu');
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(nav.querySelectorAll('a')).every(link => link.tabIndex === -1)).toBe(true);
    expect(submenu.tabIndex).toBe(-1);
    expect(list.getAttribute('aria-hidden')).toBe('true');
    expect(nav.classList.contains('hfe-dropdown')).toBe(true);
    expect(nav.classList.contains('menu-is-active')).toBe(false);
    expect(nav.style.width).toBe('auto');
    expect(nav.style.zIndex).toBe('0');
  });

  it('keeps Especialidades in flow and preserves its source expansion when the parent menu closes', async () => {
    const { toggle, nav, submenu, list } = await mountShell();
    await key(toggle, 'Enter');
    await key(submenu, ' ');
    expect(submenu.getAttribute('aria-expanded')).toBe('true');
    expect(submenu.classList.contains('sub-menu-active')).toBe(true);
    expect(list.classList.contains('sub-menu-open')).toBe(true);
    expect(list.getAttribute('aria-hidden')).toBe('false');
    expect(getComputedStyle(list).visibility).toBe('visible');
    expect(getComputedStyle(list).height).toBe('auto');
    expect(getComputedStyle(list).opacity).toBe('1');
    expect(getComputedStyle(list).position).toBe('relative');
    expect(list.style.transition).toBe('0.3s');
    const catarata = list.querySelector<HTMLAnchorElement>('a')!;
    expect(catarata.tabIndex).toBe(0); catarata.focus(); expect(document.activeElement).toBe(catarata);
    await key(submenu, 'Enter');
    expect(submenu.getAttribute('aria-expanded')).toBe('false');
    expect(submenu.classList.contains('sub-menu-active')).toBe(false);
    expect(list.classList.contains('sub-menu-open')).toBe(false);
    expect(getComputedStyle(list).visibility).toBe('hidden');
    expect(getComputedStyle(list).height).toBe('0px');
    expect(catarata.tabIndex).toBe(-1); expect(document.activeElement).toBe(submenu);
    await key(submenu, ' '); catarata.focus();
    await key(toggle, ' ');
    expect(toggle.querySelector('i')?.className).toBe('fas fa-align-justify');
    expect(toggle.getAttribute('aria-label')).toBe('Abrir menu');
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(getComputedStyle(nav).visibility).toBe('hidden');
    expect(submenu.getAttribute('aria-expanded')).toBe('true');
    expect(submenu.classList.contains('sub-menu-active')).toBe(true);
    expect(list.classList.contains('sub-menu-open')).toBe(true);
    expect(getComputedStyle(list).position).toBe('relative');
    expect(getComputedStyle(list).height).toBe('auto');
    expect(list.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(nav.querySelectorAll('a')).every(link => link.tabIndex === -1)).toBe(true);
    expect(submenu.tabIndex).toBe(-1); expect(document.activeElement).toBe(toggle);
    await key(toggle, 'Enter');
    expect(list.getAttribute('aria-hidden')).toBe('false'); expect(catarata.tabIndex).toBe(0);
  });

  it('remeasures the widget when an open dropdown is resized', async () => {
    const { toggle, nav, measure } = await mountShell(390, 319);
    await key(toggle, 'Enter');
    expect(nav.style.width).toBe('319px');
    measure.mockImplementation(() => ({ width: 334 } as DOMRect));
    await resize(768);
    expect(nav.style.width).toBe('334px');
    expect(getComputedStyle(nav).position).toBe('absolute');
  });

  it('restores captured desktop inline styles after a StrictMode effect remount', async () => {
    const { nav } = await mountShell(390, 335, true);
    await resize(1440);
    expect(nav.style.width).toBe(''); expect(nav.style.left).toBe(''); expect(nav.style.zIndex).toBe('');
    expect(nav.classList.contains('hfe-dropdown')).toBe(false);
  });

  it('keeps the desktop footer usable and synchronizes hidden focus when resized to mobile', async () => {
    const { toggle, nav, submenu, list } = await mountShell(1440);
    const home = nav.querySelector<HTMLAnchorElement>('a')!;
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    expect(nav.classList.contains('hfe-dropdown')).toBe(false);
    expect(nav.classList.contains('menu-is-active')).toBe(false);
    expect(nav.style.width).toBe('');
    expect(nav.style.left).toBe('');
    expect(nav.style.zIndex).toBe('');
    expect(home.tabIndex).toBe(0); expect(submenu.tabIndex).toBe(0);
    home.focus();
    await resize(390);
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(home.tabIndex).toBe(-1); expect(document.activeElement).toBe(toggle);
    await key(toggle, 'Enter');
    await key(submenu, ' ');
    await resize(1440);
    expect(nav.getAttribute('aria-hidden')).toBe('false'); expect(home.tabIndex).toBe(0);
    expect(nav.classList.contains('hfe-dropdown')).toBe(false);
    expect(nav.classList.contains('menu-is-active')).toBe(false);
    expect(toggle.classList.contains('hfe-active-menu-full-width')).toBe(false);
    expect(nav.style.width).toBe(''); expect(nav.style.left).toBe(''); expect(nav.style.zIndex).toBe('');
    expect(getComputedStyle(nav).position).not.toBe('absolute');
    expect(list.style.position).toBe(''); expect(list.style.transition).toBe('');
    expect(list.classList.contains('sub-menu-open')).toBe(false);
    expect(getComputedStyle(list).position).toBe('absolute');
    expect(list.querySelector<HTMLAnchorElement>('a')?.tabIndex).toBe(0);
    await resize(390);
    expect(nav.classList.contains('hfe-dropdown')).toBe(true);
    expect(nav.classList.contains('menu-is-active')).toBe(true);
    expect(submenu.getAttribute('aria-expanded')).toBe('true');
    expect(list.classList.contains('sub-menu-open')).toBe(true);
    expect(list.style.position).toBe('relative'); expect(list.style.transition).toBe('0.3s');
    expect(nav.querySelector<HTMLAnchorElement>('.sub-menu a')?.tabIndex).toBe(0);
  });

  it.each([390, 768])('preserves the captured Elementor header and submenu at %ipx independently of the footer', async width => {
    const { toggle: footerToggle, nav: footerNav } = await mountShell(width);
    const toggle = document.querySelector<HTMLElement>('header .elementor-menu-toggle')!;
    const nav = toggle.closest('.elementor-widget')!.querySelector<HTMLElement>('nav.elementor-nav-menu--dropdown')!;
    await key(toggle, 'Enter');
    expect(toggle.classList.contains('elementor-active')).toBe(true);
    expect(nav.classList.contains('public-menu-open')).toBe(true);
    expect(nav.getAttribute('aria-hidden')).toBe('false');
    expect(nav.querySelector<HTMLAnchorElement>('a')?.tabIndex).toBe(0);
    expect(footerToggle.getAttribute('aria-expanded')).toBe('false');
    expect(footerNav.getAttribute('aria-hidden')).toBe('true');
    const item = nav.querySelector<HTMLElement>('.menu-item-has-children')!;
    const parent = item.querySelector<HTMLAnchorElement>(':scope > a')!;
    const list = item.querySelector<HTMLElement>(':scope > .sub-menu')!;
    const child = list.querySelector<HTMLAnchorElement>('a')!;
    expect(parent.tabIndex).toBe(0); expect(child.tabIndex).toBe(-1);
    await act(async () => parent.click());
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(list.getAttribute('aria-hidden')).toBe('false'); expect(child.tabIndex).toBe(0);
    child.focus(); expect(document.activeElement).toBe(child);
    await key(toggle, ' ');
    expect(toggle.classList.contains('elementor-active')).toBe(false);
    expect(nav.getAttribute('aria-hidden')).toBe('true');
    expect(parent.getAttribute('aria-expanded')).toBe('false'); expect(list.getAttribute('aria-hidden')).toBe('true');
    expect(Array.from(nav.querySelectorAll('a')).every(link => link.tabIndex === -1)).toBe(true);
    expect(document.activeElement).toBe(toggle);
  });
});
