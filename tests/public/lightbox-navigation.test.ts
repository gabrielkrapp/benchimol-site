// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { LightboxContent } from '@/components/public/Lightbox';

let root: Root | undefined;
afterEach(async () => { if (root) await act(async () => root?.unmount()); root = undefined; document.body.innerHTML = ''; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
it('lets a compact touch viewer change images without triggering image zoom, including after resize', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  let width = 498; vi.spyOn(document.documentElement, 'clientWidth', 'get').mockImplementation(() => width);
  document.body.innerHTML = '<dialog></dialog>'; const dialog = document.querySelector('dialog')!;
  const move = vi.fn(); root = createRoot(dialog);
  await act(async () => root!.render(createElement(LightboxContent, { urls:['https://clinic.example/a.webp','https://clinic.example/b.webp'], index:0, caption:'Consultório', onClose:vi.fn(), onMove:move })));
  expect(dialog.querySelector('.public-lightbox-compact')).not.toBeNull();
  const image = dialog.querySelector<HTMLImageElement>('.public-lightbox-stage img')!;
  Object.defineProperty(image, 'naturalWidth', { value:980 }); image.getBoundingClientRect = () => ({ width:375, height:200 }) as DOMRect;
  const pointer = (type:string, x:number, y:number, pointerType='touch') => { const event = new MouseEvent(type,{ bubbles:true, clientX:x, clientY:y, button:0 }); Object.defineProperty(event,'pointerType',{value:pointerType}); return event; };
  await act(async () => { image.dispatchEvent(pointer('pointerdown',300,100)); image.dispatchEvent(pointer('pointerup',180,105)); image.click(); });
  expect(move).toHaveBeenLastCalledWith(1); expect(dialog.querySelector('.public-lightbox-zoomed')).toBeNull();
  await act(async () => { image.dispatchEvent(pointer('pointerdown',100,100)); image.dispatchEvent(pointer('pointerup',220,110)); image.click(); });
  expect(move).toHaveBeenLastCalledWith(-1); expect(move).toHaveBeenCalledTimes(2);
  await act(async () => { image.dispatchEvent(pointer('pointerdown',100,100)); image.dispatchEvent(pointer('pointerup',110,250)); });
  expect(move).toHaveBeenCalledTimes(2);
  await act(async () => { width=500; window.dispatchEvent(new Event('resize')); });
  expect(dialog.querySelector('.public-lightbox-compact')).toBeNull();
});
