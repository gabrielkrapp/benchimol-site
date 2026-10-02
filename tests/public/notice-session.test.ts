// @vitest-environment jsdom
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicInteractions } from '@/components/public/Interactions';

let root: Root | undefined;
const now = Date.parse('2026-10-02T12:00:00Z');
const popup = { active: true, title: 'Aviso de feriado', text: 'Retorno em 13/10.', startsAt: null, endsAt: new Date(now + 30000).toISOString(), version: 3, updatedAt: '' };
const originalShow = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(now); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.open = true; } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.open = false; } });
  sessionStorage.clear(); document.body.innerHTML = '<div class="public-site"><button id="before">Antes</button><div id="mount"></div></div>';
  document.querySelector<HTMLButtonElement>('#before')!.focus();
  root = createRoot(document.querySelector('#mount')!);
});
afterEach(async () => {
  if (root) await act(async () => root!.unmount()); root = undefined;
  document.body.innerHTML = ''; sessionStorage.clear(); vi.useRealTimers(); vi.unstubAllGlobals();
  if (originalShow) Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShow); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
  if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose); else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
});

describe('notice session and schedule after server rendering', () => {
  it('shows the current notice once per version, closes with Escape and restores focus', async () => {
    await act(async () => root!.render(createElement(PublicInteractions, { popup, initialPopupCurrent: true })));
    const dialog = document.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('h2')?.textContent).toBe(popup.title);
    expect(sessionStorage.getItem('benchimol-popup:3')).toBe('seen');
    await act(async () => dialog.dispatchEvent(new Event('cancel', { cancelable: true })));
    expect(dialog.open).toBe(false);
    expect(document.activeElement?.id).toBe('before');
    await act(async () => vi.advanceTimersByTime(15000));
    expect(dialog.open).toBe(false);
    await act(async () => root!.unmount()); root = createRoot(document.querySelector('#mount')!);
    await act(async () => root!.render(createElement(PublicInteractions, { popup, initialPopupCurrent: true })));
    expect(document.querySelector('dialog')!.open).toBe(false);
    expect(document.querySelector('dialog h2')?.textContent).toBe(popup.title);
  });

  it('opens when its schedule starts, removes expired content, and shows a newly published version', async () => {
    await act(async () => root!.render(createElement(PublicInteractions, { popup: { ...popup, startsAt: new Date(now + 15000).toISOString() }, initialPopupCurrent: false })));
    const dialog = document.querySelector('dialog')!;
    expect(dialog.open).toBe(false); expect(dialog.querySelector('h2')).toBeNull();
    await act(async () => vi.advanceTimersByTime(15000));
    expect(dialog.open).toBe(true); expect(dialog.querySelector('h2')?.textContent).toBe(popup.title);
    await act(async () => vi.advanceTimersByTime(15000));
    expect(dialog.open).toBe(false); expect(dialog.querySelector('h2')).toBeNull();
    await act(async () => root!.render(createElement(PublicInteractions, { popup: { ...popup, endsAt: null, version: 4, title: 'Aviso atualizado' }, initialPopupCurrent: true })));
    expect(dialog.open).toBe(true); expect(dialog.querySelector('h2')?.textContent).toBe('Aviso atualizado');
    expect(sessionStorage.getItem('benchimol-popup:4')).toBe('seen');
  });
});
