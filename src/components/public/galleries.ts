// Public Simply Gallery3.4.3 default autoPlayDelay=4 (seconds); no per-gallery override in the capture.
export const SOURCE_GALLERY_AUTOPLAY_DELAY_MS = 4000;
export function initializePublicGalleries(root: Element): () => void {
  const cleanups: (() => void)[] = [];
  root.querySelectorAll<HTMLElement>('.public-legacy-gallery').forEach(gallery => {
    const strip = gallery.querySelector<HTMLElement>('.sgb-gallery');
    const panels = Array.from(gallery.querySelectorAll<HTMLElement>('.sgb-item'));
    const thumbs = Array.from(gallery.querySelectorAll<HTMLElement>('.public-gallery-thumb'));
    if (!strip || !panels.length) return;
    let current = 0, paused = false, pendingGoal: number | null = null;
    const columns = () => {
      const spacing = panels.length > 1 ? panels[1].offsetLeft - panels[0].offsetLeft : strip.clientWidth;
      return Math.max(1, Math.min(3, Math.round(strip.clientWidth / spacing) || 1));
    };
    const select = () => { const count = columns(), first = Math.floor(current/count)*count; thumbs.forEach((thumb, index) => { const selected = index >= first && index < first + count; thumb.setAttribute('aria-pressed', String(selected)); thumb.classList.toggle('pgc-select', selected); }); };
    const syncScroll = () => {
      if (pendingGoal !== null) { if (Math.abs(strip.scrollLeft - pendingGoal) < 1) pendingGoal = null; return; }
      current = panels.reduce((closest, panel, index) => Math.abs(panel.offsetLeft - panels[0].offsetLeft - strip.scrollLeft) < Math.abs(panels[closest].offsetLeft - panels[0].offsetLeft - strip.scrollLeft) ? index : closest, 0);
      select();
    };
    const show = (index: number, smooth = true) => {
      const count = columns(); current = Math.floor(((index + panels.length) % panels.length)/count)*count;
      const left = panels[current].offsetLeft - panels[0].offsetLeft;
      const clamped = Math.min(Math.max(0, strip.scrollWidth - strip.clientWidth), left);
      pendingGoal = Math.abs(strip.scrollLeft - clamped) < 1 ? null : clamped;
      strip.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
      select();
    };
    const step = (delta: number) => { const count = columns(), next = Math.floor(current/count)*count + delta*count; show(next >= panels.length ? 0 : next < 0 ? Math.floor((panels.length - 1)/count)*count : next); };
    const click = (event: Event) => {
      const target = event.target as Element;
      const thumb = target.closest<HTMLElement>('.public-gallery-thumb');
      if (thumb) { show(Number(thumb.dataset.galleryIndex)); return; }
      if (target.closest('.public-gallery-prev')) step(-1);
      if (target.closest('.public-gallery-next')) step(1);
    };
    const pause = () => { paused = true; };
    const resume = () => { paused = gallery.matches(':hover') || gallery.contains(document.activeElement); };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const manual = () => { pendingGoal = null; };
    gallery.addEventListener('pointerdown', manual); strip.addEventListener('wheel', manual, { passive:true }); strip.addEventListener('touchstart', manual, { passive:true });
    gallery.addEventListener('click', click); gallery.addEventListener('pointerenter', pause); gallery.addEventListener('pointerleave', resume); gallery.addEventListener('focusin', pause); gallery.addEventListener('focusout', resume);
    strip.addEventListener('scroll', syncScroll, { passive: true });
    const timer = gallery.dataset.autoplay === 'true' ? window.setInterval(() => {
      if (!paused && !document.hidden && !reducedMotion.matches && !document.querySelector('dialog[open]')) step(1);
    }, SOURCE_GALLERY_AUTOPLAY_DELAY_MS) : null;
    select();
    cleanups.push(() => { if (timer !== null) window.clearInterval(timer); strip.removeEventListener('scroll', syncScroll); strip.removeEventListener('wheel', manual); strip.removeEventListener('touchstart', manual); gallery.removeEventListener('pointerdown', manual); gallery.removeEventListener('click', click); gallery.removeEventListener('pointerenter', pause); gallery.removeEventListener('pointerleave', resume); gallery.removeEventListener('focusin', pause); gallery.removeEventListener('focusout', resume); });
  });
  return () => cleanups.forEach(cleanup => cleanup());
}
