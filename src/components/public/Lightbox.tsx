'use client';
import { useEffect, useRef, useState } from 'react';
import { lightboxIcons } from './lightbox-icons';

function Icon({ kind }: { kind: keyof typeof lightboxIcons }) {
  const icon = lightboxIcons[kind];
  return <svg viewBox={icon.viewBox} width="20" height="20" fill="currentColor" aria-hidden="true"><path d={icon.path}/></svg>;
}
function NavigationIcon({ previous }: { previous: boolean }) {
  return <svg viewBox="0 0 512 512" aria-hidden="true"><polygon points={previous ? '352,115.4 331.3,96 160,256 331.3,416 352,396.7 201.5,256' : '160,115.4 180.7,96 352,256 180.7,416 160,396.7 310.5,256'}/></svg>;
}
export function LightboxContent({ urls, index, caption, onMove, onClose }: { urls: string[]; index: number; caption: string; onMove: (delta: number) => void; onClose: () => void }) {
  const [zoomed, setZoomed] = useState(false), [sharing, setSharing] = useState(false), [feedback, setFeedback] = useState(''), [fullscreen, setFullscreen] = useState(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null), dragged = useRef(false);
  const viewerRef = useRef<HTMLDivElement>(null), stageRef = useRef<HTMLDivElement>(null), shareRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null), [zoomWidth, setZoomWidth] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true), [compact, setCompact] = useState(false);
  const swipe = useRef<{ x:number; y:number } | null>(null);
  useEffect(() => {
    // Original compact mode hides the side arrows below 500 px of available width.
    const update = () => setCompact(document.documentElement.clientWidth < 500);
    update(); window.addEventListener('resize', update); return () => window.removeEventListener('resize', update);
  }, []);
  useEffect(() => { setZoomed(false); setSharing(false); setFeedback(''); }, [index]);
  useEffect(() => { const update = () => setFullscreen(document.fullscreenElement === viewerRef.current); document.addEventListener('fullscreenchange', update); return () => document.removeEventListener('fullscreenchange', update); }, []);
  useEffect(() => { const viewer = viewerRef.current; return () => { if (viewer && document.fullscreenElement === viewer) void document.exitFullscreen().catch(() => {}); }; }, []);
  useEffect(() => {
    const stage = stageRef.current, image = imageRef.current;
    if (!zoomed || !stage || !image) return;
    stage.scrollLeft = Math.max(0, (zoomWidth - stage.clientWidth)/2);
    stage.scrollTop = Math.max(0, (zoomWidth * image.naturalHeight / image.naturalWidth - stage.clientHeight)/2);
  }, [zoomed, zoomWidth]);
  useEffect(() => {
    setControlsVisible(true);
    if (!zoomed) return;
    const dialog = stageRef.current?.closest('dialog'); if (!dialog) return;
    let timer: ReturnType<typeof setTimeout>;
    const reveal = () => { clearTimeout(timer); setControlsVisible(true); timer = setTimeout(() => setControlsVisible(false), 3000); };
    reveal(); dialog.addEventListener('mousemove', reveal);
    return () => { clearTimeout(timer); dialog.removeEventListener('mousemove', reveal); };
  }, [zoomed]);
  useEffect(() => {
    if (!sharing) return;
    const dialog = stageRef.current?.closest('dialog'); if (!dialog) return;
    const focus = document.activeElement as HTMLElement | null;
    const dismiss = (event: Event) => { event.preventDefault(); event.stopImmediatePropagation(); setSharing(false); };
    dialog.addEventListener('cancel', dismiss, { capture:true }); shareRef.current?.focus();
    return () => { dialog.removeEventListener('cancel', dismiss, { capture:true }); if (dialog.open && focus?.isConnected) focus.focus(); };
  }, [sharing]);
  function move(delta: number) { setZoomed(false); setSharing(false); setFeedback(''); onMove(delta); }
  function toggleZoom() {
    drag.current = null; dragged.current = false;
    if (zoomed) { setZoomed(false); return; }
    const image = imageRef.current, fitted = image?.getBoundingClientRect().width || 0;
    if (!image || !fitted || !image.naturalWidth) return;
    const naturalRatio = Math.min(4, image.naturalWidth / fitted);
    setZoomWidth(fitted * (Math.abs(naturalRatio - 1) < .3 ? 2 : naturalRatio)); setZoomed(true);
  }
  async function fullScreen() {
    const viewer = viewerRef.current;
    // Fullscreen API rejects <dialog>; request its ordinary HTML content instead.
    try { if (document.fullscreenElement === viewer) await document.exitFullscreen(); else if (viewer?.requestFullscreen) await viewer.requestFullscreen(); else setFeedback('Tela cheia indisponível neste navegador.'); }
    catch { setFeedback('Tela cheia indisponível neste navegador.'); }
  }
  function close() { if (viewerRef.current && document.fullscreenElement === viewerRef.current) void document.exitFullscreen().catch(() => {}); onClose(); }
  return <div ref={viewerRef} className={`public-lightbox-content${compact ? ' public-lightbox-compact' : ''}`}>
    <h2 id="public-dialog-title" className="public-visually-hidden">{caption}</h2>
    <div ref={stageRef} className={`public-lightbox-stage${zoomed ? ' public-lightbox-zoomed' : ''}`} onClick={event => { if (event.target === event.currentTarget && !zoomed) close(); }} onPointerDown={event => { if (!zoomed) { if (event.pointerType === 'touch' || event.pointerType === 'pen') swipe.current = { x:event.clientX, y:event.clientY }; return; } if (event.button !== 0) return; drag.current = { x:event.clientX, y:event.clientY, left:event.currentTarget.scrollLeft, top:event.currentTarget.scrollTop }; dragged.current = false; event.currentTarget.setPointerCapture?.(event.pointerId); }} onPointerMove={event => { if (!drag.current) return; const x = event.clientX - drag.current.x, y = event.clientY - drag.current.y; event.currentTarget.scrollLeft = drag.current.left - x; event.currentTarget.scrollTop = drag.current.top - y; if (Math.abs(x) + Math.abs(y) > 4) dragged.current = true; }} onPointerUp={event => {
      drag.current = null;
      const start = swipe.current; swipe.current = null;
      if (zoomed || !start || urls.length < 2) return;
      const x = event.clientX - start.x, y = event.clientY - start.y;
      if (Math.abs(x) >= 50 && Math.abs(x) > Math.abs(y) * 1.5) { dragged.current = true; move(x < 0 ? 1 : -1); }
    }} onPointerCancel={() => { drag.current = null; swipe.current = null; }}><img ref={imageRef} src={urls[index]} alt={caption} style={zoomed ? { width:zoomWidth } : undefined} draggable={false} onClick={() => { if (dragged.current) { dragged.current = false; return; } toggleZoom(); }} /></div>
    <div className={`public-lightbox-header${controlsVisible ? '' : ' public-lightbox-controls-hidden'}`}>
    <p className="public-lightbox-caption" aria-hidden="true">{caption}</p>
    <div className="public-lightbox-toolbar">
      <button type="button" aria-label="Zoom" title="Zoom" aria-pressed={zoomed} onClick={toggleZoom}><Icon kind={zoomed ? "zoomOut" : "zoom"}/></button>
      <button type="button" aria-label="Share" title="Share" aria-expanded={sharing} onClick={() => { setSharing(value => !value); setFeedback(''); }}><Icon kind="share"/></button>
      <button type="button" aria-label="Fullscreen" title="Fullscreen" aria-pressed={fullscreen} onClick={() => void fullScreen()}><Icon kind="fullscreen"/></button>
      <button type="button" aria-label="Close" title="Close" onClick={close}><Icon kind="close"/></button>
    </div>
    </div>
    {urls.length > 1 && <><button className={`public-lightbox-prev${controlsVisible ? '' : ' public-lightbox-controls-hidden'}`} type="button" aria-label="Imagem anterior" onClick={() => move(-1)}><NavigationIcon previous/></button><button className={`public-lightbox-next${controlsVisible ? '' : ' public-lightbox-controls-hidden'}`} type="button" aria-label="Próxima imagem" onClick={() => move(1)}><NavigationIcon previous={false}/></button></>}
    <span className="public-visually-hidden" aria-live="polite">{index + 1} / {urls.length}</span>
    {sharing && <div ref={shareRef} tabIndex={-1} className="public-lightbox-share pgc-rev-share-bar-light-view pgc-rev-share-bar-light-fixed pgc-rev-share-bar-light-activate" aria-label="Share" onKeyDown={event => { event.stopPropagation(); if (event.key === 'Escape') { event.preventDefault(); setSharing(false); } }}><div className="pgc-rev-share-bar-light-bg" onClick={() => setSharing(false)} /></div>}
    {feedback && <p className="public-lightbox-feedback" role="status">{feedback}</p>}
  </div>;
}
