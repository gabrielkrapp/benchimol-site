const STEP = 3;
const LIST = '.jkit-block-container > .jkit-posts';
const NEXT = 'a.jkit-block-loadmore[rel="next"]';

/** Enhances the existing SSR links; no new API or WordPress script is needed. */
export function initializePublicLoadMore(root: ParentNode, navigate: (href: string) => void = href => window.location.assign(href)): () => void {
  const cleanups: (() => void)[] = [];
  const origin = window.location.origin;
  for (const block of root.querySelectorAll<HTMLElement>('.jkit-postblock')) {
    const marker = block.querySelector<HTMLElement>('nav.public-pagination[data-public-archive]');
    const list = block.querySelector<HTMLElement>(LIST);
    const button = block.querySelector<HTMLAnchorElement>(NEXT);
    const base = marker?.dataset.publicArchive || '';
    const pageSize = Number(marker?.dataset.publicPageSize);
    let nextPage = Number(marker?.dataset.publicPage) + 1;
    if (!marker || !list || !button || !/^\/(?:blog|simply_galleries|(?:category|tag)\/[^/?#]+)\/$/.test(base) || !Number.isInteger(nextPage) || nextPage < 2 || !Number.isInteger(pageSize) || pageSize < 1) continue;
    const pageUrl = (href: string | null, page: number): URL | null => {
      if (!href) return null;
      try { const url = new URL(href, window.location.href); return url.origin === origin && url.pathname === `${base}page/${page}/` && !url.search && !url.hash ? url : null; } catch { return null; }
    };
    if (!pageUrl(button.getAttribute('href'), nextPage)) continue;
    const originalRole = button.getAttribute('role'); button.setAttribute('role', 'button');
    const label = button.querySelector<HTMLElement>('span[data-load]');
    const idleLabel = label?.dataset.load || label?.textContent || 'Carregar Mais';
    const status = document.createElement('span'); status.className = 'public-visually-hidden'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite'); block.append(status);
    let active = true, busy = false, controller: AbortController | null = null;
    let buffer: HTMLElement[] = [], successor: string | null = null;
    const restore = () => { if (label) label.textContent = idleLabel; button.removeAttribute('aria-disabled'); list.removeAttribute('aria-busy'); };
    const append = () => {
      const chunk = buffer.splice(0, STEP); list.append(...chunk); status.textContent = `${chunk.length} artigos carregados.`;
      if (buffer.length) return;
      if (successor) { button.setAttribute('href', successor); nextPage += 1; }
      else { const wasFocused = button.contains(document.activeElement); button.remove(); if (wasFocused) chunk[0]?.querySelector<HTMLAnchorElement>('a[href]')?.focus(); }
    };
    const load = async (url: URL) => {
      busy = true; controller = new AbortController();
      button.setAttribute('aria-disabled', 'true'); list.setAttribute('aria-busy', 'true'); if (label) label.textContent = label.dataset.loading || 'Carregando...';
      try {
        const response = await fetch(url.href, { method: 'GET', headers: { Accept: 'text/html' }, credentials: 'same-origin', redirect: 'error', signal: controller.signal });
        if (!active) return;
        if (!response.ok || !/^text\/html\b/i.test(response.headers.get('Content-Type') || '') || response.url && response.url !== url.href) throw new Error('Unexpected archive response');
        const documentPage = new DOMParser().parseFromString(await response.text(), 'text/html');
        if (!active) return;
        const remoteMarker = Array.from(documentPage.querySelectorAll<HTMLElement>('nav.public-pagination[data-public-archive]')).find(item => item.dataset.publicArchive === base && Number(item.dataset.publicPage) === nextPage && Number(item.dataset.publicPageSize) === pageSize);
        const remoteBlock = remoteMarker?.closest('.jkit-postblock');
        const remoteList = remoteBlock?.querySelector<HTMLElement>(LIST);
        const cards = Array.from(remoteList?.children || []).filter((child): child is HTMLElement => child.tagName === 'ARTICLE');
        const next = remoteBlock?.querySelector<HTMLAnchorElement>(NEXT)?.getAttribute('href') || null;
        if (!remoteMarker || !remoteList || !cards.length || cards.length > pageSize || next && !pageUrl(next, nextPage + 1)) throw new Error('Unexpected archive markup');
        const existing = new Set(Array.from(list.children).map(card => card.querySelector<HTMLAnchorElement>('a[href]')?.getAttribute('href')));
        const newCards: HTMLElement[] = [];
        for (const card of cards) {
          const href = card.querySelector<HTMLAnchorElement>('a[href]')?.getAttribute('href');
          if (!href) throw new Error('Missing archive card destination');
          if (existing.has(href)) continue;
          existing.add(href); newCards.push(document.importNode(card, true));
        }
        if (!newCards.length) throw new Error('No new archive entries');
        buffer = newCards; successor = next; append();
      } catch {
        if (active) { restore(); navigate(url.href); }
      } finally { if (active) restore(); busy = false; controller = null; }
    };
    const click = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || button.hasAttribute('download') || button.target && button.target !== '_self') return;
      const url = pageUrl(button.getAttribute('href'), nextPage); if (!url) return;
      event.preventDefault(); if (busy) return;
      if (buffer.length) append(); else void load(url);
    };
    button.addEventListener('click', click);
    cleanups.push(() => { active = false; controller?.abort(); button.removeEventListener('click', click); restore(); if (originalRole === null) button.removeAttribute('role'); else button.setAttribute('role', originalRole); status.remove(); buffer = []; });
  }
  return () => cleanups.forEach(cleanup => cleanup());
}
