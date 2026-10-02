'use client';
import { useEffect, useRef, useState } from 'react';
import type { PopupSettings } from '@/lib/domain/types';
import { initializePublicGalleries } from './galleries';
import { initializePublicLoadMore } from './load-more';
import { LightboxContent } from './Lightbox';
import { popupIsCurrent } from '@/lib/domain/popup';
export { popupIsCurrent } from '@/lib/domain/popup';

export function PublicInteractions({ popup, initialPopupCurrent = false }: { popup: PopupSettings; initialPopupCurrent?: boolean }) {
  const [notice, setNotice] = useState(false);
  const [currentPopup, setCurrentPopup] = useState(initialPopupCurrent);
  const [lightbox, setLightbox] = useState<{ urls: string[]; captions: string[]; index: number; caption: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const evaluate = () => {
      const current = popupIsCurrent(popup, Date.now());
      setCurrentPopup(current);
      let seen = false; try { seen = sessionStorage.getItem(`benchimol-popup:${popup.version}`) === 'seen'; } catch {}
      if (!seen && current) { setNotice(true); try { sessionStorage.setItem(`benchimol-popup:${popup.version}`, 'seen'); } catch {} }
      if (!current) setNotice(false);
    };
    evaluate(); const timer = window.setInterval(evaluate, 15000); return () => window.clearInterval(timer);
  }, [popup]);
  const modalOpen = notice || Boolean(lightbox);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (modalOpen) { previousFocus.current = document.activeElement as HTMLElement; if (!dialog.open) dialog.showModal(); dialog.querySelector<HTMLButtonElement>('button')?.focus(); }
    else if (dialog.open) { dialog.close(); previousFocus.current?.focus(); }
  }, [modalOpen]);
  useEffect(() => {
    const root = document.querySelector('.public-site'); if (!root) return;
    const cleanupGalleries = initializePublicGalleries(root);
    const cleanupLoadMore = initializePublicLoadMore(root);
    const menuSelector = 'nav.elementor-nav-menu--dropdown, .hfe-nav-menu__layout-horizontal, .hfe-nav-menu__layout-vertical';
    const menus = Array.from(root.querySelectorAll<HTMLElement>('.elementor-menu-toggle, .hfe-nav-menu__toggle')).flatMap(toggle => {
      const widget = toggle.closest('.elementor-widget') || toggle.parentElement;
      const nav = widget?.querySelector<HTMLElement>(menuSelector);
      if (!nav) return [];
      const icon = toggle.querySelector<HTMLElement>('.hfe-nav-menu-icon i');
      return [{ toggle, nav, icon, iconClass: icon?.className, hfe: toggle.classList.contains('hfe-nav-menu__toggle'), navStyles: { width: nav.style.width, left: nav.style.left, zIndex: nav.style.zIndex }, breakpoint: widget?.classList.contains('hfe-nav-menu__breakpoint-mobile') || widget?.classList.contains('elementor-nav-menu--dropdown-mobile') ? 767 : 1024 }];
    });
    const hfeSubmenuStyles = new Map<HTMLElement, { height: string; visibility: string; opacity: string; position: string; transition: string }>();
    root.querySelectorAll<HTMLElement>('.hfe-has-submenu-container').forEach(control => {
      const list = control.parentElement?.querySelector<HTMLElement>(':scope > .sub-menu');
      if (!list) return;
      hfeSubmenuStyles.set(list, { height: list.style.height, visibility: list.style.visibility, opacity: list.style.opacity, position: list.style.position, transition: list.style.transition });
      list.setAttribute('aria-hidden', 'true'); control.setAttribute('aria-expanded', 'false');
    });
    const syncMenu = (menu: typeof menus[number]) => {
      const expanded = menu.toggle.getAttribute('aria-expanded') === 'true';
      const collapsedLayout = window.innerWidth <= menu.breakpoint;
      const visible = expanded || !collapsedLayout;
      if (menu.hfe) {
        // These HFE states activate the captured widget CSS. The full-width
        // toggle class supplies absolute positioning/top:100% in that CSS.
        menu.nav.classList.toggle('hfe-dropdown', collapsedLayout);
        menu.nav.classList.toggle('menu-is-active', collapsedLayout && expanded);
        menu.toggle.classList.toggle('hfe-active-menu-full-width', collapsedLayout && expanded);
        if (collapsedLayout) {
          const width = menu.nav.parentElement?.getBoundingClientRect().width;
          menu.nav.style.width = expanded ? width ? `${width}px` : '100%' : 'auto';
          menu.nav.style.left = '0px'; menu.nav.style.zIndex = expanded ? '9999' : '0';
        } else {
          menu.nav.style.width = menu.navStyles.width; menu.nav.style.left = menu.navStyles.left; menu.nav.style.zIndex = menu.navStyles.zIndex;
        }
        menu.nav.querySelectorAll<HTMLElement>('.sub-menu').forEach(list => {
          const original = hfeSubmenuStyles.get(list); if (!original) return;
          const submenuExpanded = Boolean(list.parentElement?.classList.contains('public-submenu-open'));
          list.classList.toggle('sub-menu-open', collapsedLayout && submenuExpanded);
          list.style.position = collapsedLayout && submenuExpanded ? 'relative' : original.position;
          list.style.transition = collapsedLayout && submenuExpanded ? '0.3s' : original.transition;
          list.setAttribute('aria-hidden', String(!visible || !submenuExpanded));
        });
      }
      menu.nav.setAttribute('aria-hidden', String(!visible));
      menu.nav.querySelectorAll<HTMLElement>('a, .hfe-has-submenu-container').forEach(link => {
        let enabled = visible;
        for (let list = link.closest<HTMLElement>('.sub-menu'); list && menu.nav.contains(list); list = list.parentElement?.closest<HTMLElement>('.sub-menu') || null) {
          if ((collapsedLayout || list.closest('.hfe-nav-menu')) && !list.parentElement?.classList.contains('public-submenu-open')) enabled = false;
        }
        link.tabIndex = enabled ? 0 : -1;
      });
      if (!visible && menu.nav.contains(document.activeElement)) menu.toggle.focus();
    };
    const setSubmenu = (item: HTMLElement, expanded: boolean) => {
      const control = item.querySelector<HTMLElement>(':scope > .hfe-has-submenu-container');
      const link = item.querySelector<HTMLAnchorElement>(':scope > a, :scope > .hfe-has-submenu-container > a');
      const list = item.querySelector<HTMLElement>(':scope > .sub-menu');
      item.classList.toggle('public-submenu-open', expanded);
      control?.classList.toggle('sub-menu-active', expanded);
      control?.setAttribute('aria-expanded', String(expanded)); link?.setAttribute('aria-expanded', String(expanded));
      if (list) {
        list.setAttribute('aria-hidden', String(!expanded));
        const original = hfeSubmenuStyles.get(list);
        if (original) { list.style.height = expanded ? 'auto' : original.height; list.style.visibility = expanded ? 'visible' : original.visibility; list.style.opacity = expanded ? '1' : original.opacity; }
        if (!expanded && list.contains(document.activeElement)) (control || link)?.focus();
      }
    };
    const syncMenus = () => menus.forEach(syncMenu);
    menus.forEach(menu => { menu.toggle.setAttribute('aria-expanded', 'false'); menu.toggle.setAttribute('aria-label', 'Abrir menu'); });
    syncMenus();
    root.querySelectorAll<HTMLElement>('.ti-read-more').forEach(wrapper => { wrapper.removeAttribute('tabindex'); wrapper.removeAttribute('role'); wrapper.removeAttribute('aria-label'); });
    const toggles = root.querySelectorAll<HTMLElement>('.elementor-menu-toggle, .hfe-nav-menu__toggle, .ti-next, .ti-prev, .ti-read-more-active, .elementor-toc__toggle-button');
    toggles.forEach(toggle => { toggle.tabIndex = 0; toggle.setAttribute('role', 'button'); if (toggle.classList.contains('ti-read-more-active')) toggle.setAttribute('aria-expanded', 'false'); if (!toggle.getAttribute('aria-label')) toggle.setAttribute('aria-label', toggle.classList.contains('ti-prev') ? 'Avaliações anteriores' : toggle.classList.contains('ti-next') ? 'Próximas avaliações' : toggle.classList.contains('ti-read-more-active') ? toggle.textContent || 'Leia mais' : toggle.classList.contains('elementor-toc__toggle-button') ? 'Recolher ou expandir índice' : 'Abrir menu'); });
    const click = (event: Event) => {
      const target = event.target as Element;
      const toggle = target.closest<HTMLElement>('.elementor-menu-toggle, .hfe-nav-menu__toggle');
      if (toggle) {
        const expanded = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(expanded)); toggle.setAttribute('aria-label', expanded ? 'Fechar menu' : 'Abrir menu');
        toggle.classList.toggle(toggle.classList.contains('hfe-nav-menu__toggle') ? 'hfe-active-menu' : 'elementor-active', expanded);
        const menu = menus.find(item => item.toggle === toggle);
        if (menu) {
          menu.nav.classList.toggle('public-menu-open', expanded);
          if (menu.icon) menu.icon.className = expanded ? 'far fa-window-close' : menu.iconClass || 'fas fa-align-justify';
          // HFE preserves its open submenu when the main dropdown is folded.
          // syncMenu still removes every hidden descendant from the tab order.
          if (!expanded && !menu.hfe) menu.nav.querySelectorAll<HTMLElement>('.menu-item-has-children').forEach(item => setSubmenu(item, false));
          syncMenu(menu);
        }
        event.preventDefault(); return;
      }
      const submenu = target.closest<HTMLElement>('.sub-arrow, .hfe-menu-toggle');
      const hfeControl = target.closest<HTMLElement>('.hfe-has-submenu-container');
      const parentLink = target.closest<HTMLAnchorElement>('.menu-item-has-children > a');
      const hfeMenu = hfeControl && menus.find(menu => menu.nav.contains(hfeControl));
      if (submenu || hfeControl && (!target.closest('a') || window.innerWidth <= (hfeMenu?.breakpoint || 1024)) || parentLink && window.innerWidth <= 1024) {
        const item = (submenu || hfeControl || parentLink)?.closest<HTMLElement>('.menu-item-has-children');
        if (item) {
          const expanded = !item.classList.contains('public-submenu-open'); setSubmenu(item, expanded);
          if (!expanded) item.querySelectorAll<HTMLElement>('.menu-item-has-children').forEach(child => setSubmenu(child, false));
          syncMenus(); event.preventDefault(); return;
        }
      }
      const faq = target.closest<HTMLAnchorElement>('.card-header-button, .elementor-tab-title');
      if (faq) {
        const card = faq.closest<HTMLElement>('.card-wrapper') || faq.parentElement;
        const body = card?.querySelector<HTMLElement>('.card-expand, .elementor-tab-content');
        if (body) { const expanded = faq.getAttribute('aria-expanded') !== 'true'; faq.setAttribute('aria-expanded', String(expanded)); card?.classList.toggle('expand', expanded); body.style.display = expanded ? 'block' : 'none'; event.preventDefault(); return; }
      }
      const tab = target.closest<HTMLElement>('.tab-nav-list .tab-nav, .tab-heading, .elementor-tab-title[data-tab]');
      if (tab) {
        const tabs = tab.closest<HTMLElement>('.jkit-tabs, .elementor-tabs');
        if (tabs) { const index = tab.dataset.tab || tab.dataset.tabId || tab.getAttribute('data-target'); tabs.querySelectorAll<HTMLElement>('[data-tab], [data-tab-id], .tab-content').forEach(item => { const selected = (item.dataset.tab || item.dataset.tabId || `#${item.id}`) === index; item.classList.toggle('active', selected); if (item.classList.contains('tab-content') || item.classList.contains('elementor-tab-content')) item.hidden = !selected; else item.setAttribute('aria-selected', String(selected)); }); event.preventDefault(); return; }
      }
      const reviews = target.closest<HTMLElement>('.ti-next, .ti-prev');
      if (reviews) { const list = reviews.closest('.ti-widget')?.querySelector<HTMLElement>('.ti-reviews-container-wrapper'); if (list) list.scrollBy({ left: (reviews.classList.contains('ti-prev') ? -1 : 1) * list.clientWidth, behavior: 'smooth' }); event.preventDefault(); return; }
      const more = target.closest<HTMLElement>('.ti-read-more');
      if (more) { const text = more.parentElement?.querySelector<HTMLElement>('.ti-review-text'); const label = more.querySelector<HTMLElement>('.ti-read-more-active'); if (text && label) { const expanded = text.classList.toggle('public-review-expanded'); label.textContent = expanded ? more.dataset.collapseText || 'Esconder' : more.dataset.openText || 'Leia mais'; label.setAttribute('aria-label', label.textContent); label.setAttribute('aria-expanded', String(expanded)); } event.preventDefault(); return; }
      const gallery = target.closest<HTMLAnchorElement>('.e-gallery-item, .jkit-gallery .gallery-link, .gallery-item a, .sgb-gallery a');
      if (gallery && /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(gallery.href)) {
        const container = gallery.closest('.elementor-gallery__container, .jkit-gallery, .gallery, .sgb-gallery') || gallery.parentElement;
        const images = Array.from(container?.querySelectorAll<HTMLAnchorElement>('a') || []).filter(anchor => /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(anchor.href));
        const title = (anchor: HTMLAnchorElement) => anchor.dataset.galleryCaption || anchor.getAttribute('data-elementor-lightbox-title') || anchor.querySelector('img')?.alt || 'Imagem da clínica';
        const urls = images.map(anchor => anchor.href), captions = images.map(title);
        setLightbox({ urls: urls.length ? urls : [gallery.href], captions: captions.length ? captions : [title(gallery)], index: Math.max(0, urls.indexOf(gallery.href)), caption: title(gallery) }); event.preventDefault(); return;
      }
      const toc = target.closest<HTMLElement>('.elementor-toc__toggle-button');
      if (toc) { const widget = toc.closest('.elementor-widget-table-of-contents'); const minimized = widget?.classList.toggle('public-toc-minimized'); widget?.classList.toggle('elementor-toc--collapsed', Boolean(minimized)); widget?.querySelectorAll('.elementor-toc__toggle-button').forEach(button => button.setAttribute('aria-expanded', String(!minimized))); event.preventDefault(); }
    };
    const keydown = (event: Event) => { const key = event as KeyboardEvent; const target = key.target as HTMLElement; if (['Enter', ' '].includes(key.key) && target.matches('[role="button"]') && target.tagName !== 'BUTTON') { key.preventDefault(); target.click(); } };
    root.addEventListener('click', click); root.addEventListener('keydown', keydown); window.addEventListener('resize', syncMenus);
    const galleries = root.querySelectorAll<HTMLElement>('.sgb-gallery');
    galleries.forEach(gallery => { for (const link of gallery.querySelectorAll<HTMLAnchorElement>('a')) { const image = link.querySelector<HTMLImageElement>('img'); if (image && link.search.includes('attachment_id=')) { const candidates = (image.srcset || '').split(',').map(item => item.trim().split(/\s+/)[0]).filter(Boolean); link.href = candidates.at(-1) || image.src; } } });
    return () => {
      cleanupGalleries(); cleanupLoadMore();
      // React's development remount must capture the source styles again,
      // rather than treating this effect's mobile inline styles as desktop.
      menus.filter(menu => menu.hfe).forEach(menu => Object.assign(menu.nav.style, menu.navStyles));
      hfeSubmenuStyles.forEach((styles, list) => Object.assign(list.style, styles));
      root.removeEventListener('click', click); root.removeEventListener('keydown', keydown); window.removeEventListener('resize', syncMenus);
    };
  }, []);
  function close() { setNotice(false); setLightbox(null); }
  function move(delta: number) { setLightbox(current => { if (!current) return null; const index = (current.index + delta + current.urls.length) % current.urls.length; return { ...current, index, caption:current.captions[index] || current.caption }; }); }
  return <dialog ref={dialogRef} className={`public-dialog${lightbox ? ' public-lightbox' : ''}`} aria-labelledby="public-dialog-title" onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialogRef.current) close(); }} onKeyDown={event => { if (lightbox && event.key === 'ArrowLeft') move(-1); if (lightbox && event.key === 'ArrowRight') move(1); }}>
    {!lightbox && <button type="button" className="public-dialog-close" onClick={close} aria-label="Fechar">×</button>}
    {lightbox ? <LightboxContent {...lightbox} onMove={move} onClose={close} /> : currentPopup ? <><h2 id="public-dialog-title">{popup.title}</h2><p className="public-notice-text">{popup.text}</p></> : null}
  </dialog>;
}
