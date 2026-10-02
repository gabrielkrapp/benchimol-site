// Read-only DOM collector for use ONLY with CUA tab.playwright.evaluate.
// No navigation, network, event dispatch, or mutation. Returns no credentials.
() => {
  const rect = (e) => {
    const r = e.getBoundingClientRect();
    const s = getComputedStyle(e);
    return {
      x: r.x, y: r.y + scrollY, width: r.width, height: r.height,
      display: s.display, visibility: s.visibility,
      font: s.fontFamily, size: s.fontSize, color: s.color,
      background: s.backgroundColor,
    };
  };
  const publicNodes = (selector) => Array.from(document.querySelectorAll(selector))
    .filter((e) => !e.closest('#wpadminbar'));
  return {
    url: location.href,
    viewport: { width: innerWidth, height: innerHeight },
    clientWidth: document.documentElement.clientWidth,
    documentHeight: document.documentElement.scrollHeight,
    scrollWidth: document.documentElement.scrollWidth,
    adminBarHeight: document.getElementById('wpadminbar')?.getBoundingClientRect().height || 0,
    elementors: publicNodes('[data-elementor-id]').map((e) => ({ ...rect(e), id: e.getAttribute('data-elementor-id') })),
    headings: publicNodes('h1,h2,h3,h4').map((e) => ({ ...rect(e), tag: e.tagName, text: e.textContent?.trim() })),
    images: publicNodes('img').map((e) => ({ ...rect(e), alt: e.alt, src: e.currentSrc || e.src, loaded: e.complete && e.naturalWidth > 0 })),
    footerContainers: publicNodes('.elementor-55 .elementor-container').map(rect),
    maps: publicNodes('iframe').filter((e) => e.src.includes('maps.google.')).map((e) => ({ ...rect(e), src: e.src })),
    reviews: publicNodes('.ti-widget,.ti-review-item,.ti-review-content').map((e) => ({ ...rect(e), class: e.className, opacity: getComputedStyle(e).opacity, text: e.textContent?.trim().slice(0, 200) })),
    toc: publicNodes('.elementor-toc__list-item a').map((e) => ({ ...rect(e), text: e.textContent?.trim(), href: e.getAttribute('href'), class: e.className })),
    gallery: publicNodes('.public-legacy-gallery,.sgb-gallery,.sgb-item,.public-gallery-thumbs,.public-gallery-thumb').map((e) => ({ ...rect(e), class: e.className, pressed: e.getAttribute('aria-pressed') })),
  };
}
