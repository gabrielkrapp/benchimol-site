import { afterEach, describe, expect, it, vi } from 'vitest';
import { JSDOM } from 'jsdom';
import { act, createElement, useEffect, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { installUnsavedHistoryGuard, useUnsavedChanges } from '../../src/components/admin/ui';

let dom: JSDOM | undefined, root: Root | undefined, guard: ReturnType<typeof installUnsavedHistoryGuard> | undefined;
afterEach(async () => { if (root) await act(async () => root!.unmount()); guard?.dispose(); dom?.window.close(); root = undefined; guard = undefined; dom = undefined; vi.unstubAllGlobals(); });
function setup(install = true) {
  dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'https://clinic.example/admin/posts/' });
  const win = dom.window as unknown as Window;
  vi.stubGlobal('window', win); vi.stubGlobal('document', win.document); vi.stubGlobal('location', win.location); vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  if (install) guard = installUnsavedHistoryGuard(win);
  win.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { route: 'list' }, testIndex: 0 }, '', '/admin/posts/');
  win.history.pushState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { route: 'editor' }, testIndex: 1 }, '', '/admin/posts/example/');
  return win;
}
async function mountEditor(win: Window) {
  let setDraft: ((value: string) => void) | undefined;
  function Editor() { const [value, setValue] = useState(''); setDraft = setValue; useUnsavedChanges(value !== ''); return createElement('textarea', { 'aria-label': 'Título em edição', value, readOnly: true }); }
  function RouterFixture() {
    const [route, setRoute] = useState(win.location.pathname);
    // Same popstate phase as the installed App Router: a canceled event must never reach it.
    useEffect(() => { const update = () => setRoute(win.location.pathname); win.addEventListener('popstate', update); return () => win.removeEventListener('popstate', update); }, []);
    return route === '/admin/posts/example/' ? createElement(Editor) : createElement('p', {}, 'Outra página');
  }
  root = createRoot(win.document.getElementById('root')!);
  await act(async () => root!.render(createElement(RouterFixture)));
  await act(async () => setDraft!('Rascunho privado ainda não salvo'));
  return Object.assign(() => win.document.querySelector('textarea')?.value, { markSaved: () => act(async () => setDraft!('')) });
}
async function settle(win: Window, predicate: () => boolean) {
  await act(async () => { await vi.waitFor(() => expect(predicate()).toBe(true), { timeout: 1500, interval: 10 }); });
}
describe('alterações não salvas e histórico', () => {
  it('cancelar Voltar preserva o formulário e as entradas; confirmar permite sair', async () => {
    const win = setup(), draft = await mountEditor(win), confirm = vi.fn(() => false); win.confirm = confirm;
    const state = structuredClone(win.history.state), length = win.history.length;
    win.history.back();
    await settle(win, () => confirm.mock.calls.length === 1 && win.location.pathname === '/admin/posts/example/');
    expect(draft()).toBe('Rascunho privado ainda não salvo'); expect(win.history.length).toBe(length); expect(win.history.state).toEqual(state);
    confirm.mockReturnValue(true); win.history.back();
    await settle(win, () => win.location.pathname === '/admin/posts/');
    expect(draft()).toBeUndefined(); expect(confirm).toHaveBeenCalledTimes(2);
  });
  it('cancelar Avançar preserva o formulário e a próxima entrada continua acessível', async () => {
    const win = setup(); win.history.pushState({ __NA: true, page: 'media' }, '', '/admin/midias/'); win.history.back();
    await vi.waitFor(() => expect(win.location.pathname).toBe('/admin/posts/example/'));
    const draft = await mountEditor(win), confirm = vi.fn(() => false); win.confirm = confirm; const length = win.history.length;
    win.history.forward(); await settle(win, () => confirm.mock.calls.length === 1 && win.location.pathname === '/admin/posts/example/');
    expect(draft()).toBe('Rascunho privado ainda não salvo'); expect(win.history.length).toBe(length);
    confirm.mockReturnValue(true); win.history.forward(); await settle(win, () => win.location.pathname === '/admin/midias/');
    expect(draft()).toBeUndefined(); expect(confirm).toHaveBeenCalledTimes(2);
  });
  it('cancelar um salto de várias entradas restaura o ponto de edição sem duplicar URLs', async () => {
    const win = setup(); win.history.pushState({ __NA: true }, '', '/admin/aviso/'); win.history.pushState({ __NA: true }, '', '/admin/posts/example/');
    const draft = await mountEditor(win), confirm = vi.fn(() => false); win.confirm = confirm; const length = win.history.length;
    win.history.go(-3); await settle(win, () => confirm.mock.calls.length === 1 && win.location.pathname === '/admin/posts/example/');
    expect(draft()).toBe('Rascunho privado ainda não salvo'); expect(win.history.length).toBe(length);
    confirm.mockReturnValue(true); win.history.go(-3); await settle(win, () => win.location.pathname === '/admin/posts/'); expect(draft()).toBeUndefined();
  });
  it('não persiste o conteúdo do formulário no histórico ou no storage', async () => {
    const win = setup(); await mountEditor(win); const confirm = vi.fn(() => false); win.confirm = confirm; win.history.back(); await settle(win, () => confirm.mock.calls.length === 1 && win.location.pathname === '/admin/posts/example/');
    expect(JSON.stringify(win.history.state)).not.toContain('Rascunho privado'); expect(win.localStorage.length).toBe(0); expect(win.sessionStorage.length).toBe(0);
    expect(win.history.state.__NA).toBe(true); expect(win.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({ route: 'editor' });
  });
  it('restaura Voltar e Avançar em entradas preexistentes usando o índice nativo', async () => {
    const win = setup(false); win.history.pushState({ __NA: true, testIndex: 2 }, '', '/admin/midias/'); win.history.back();
    await vi.waitFor(() => expect(win.location.pathname).toBe('/admin/posts/example/'));
    // JSDOM has real History traversal but no Navigation API. Supply only the
    // documented currentEntry.index interface; entries precede the guard.
    Object.defineProperty(win, 'navigation', { value: { get currentEntry() { return { index: win.history.state.testIndex }; } } });
    guard = installUnsavedHistoryGuard(win); const draft = await mountEditor(win), confirm = vi.fn(() => false); win.confirm = confirm;
    const state = structuredClone(win.history.state), length = win.history.length;
    win.history.back(); await settle(win, () => confirm.mock.calls.length === 1 && win.location.pathname === '/admin/posts/example/');
    expect(draft()).toBe('Rascunho privado ainda não salvo'); expect(win.history.state).toEqual(state);
    win.history.forward(); await settle(win, () => confirm.mock.calls.length === 2 && win.location.pathname === '/admin/posts/example/');
    expect(draft()).toBe('Rascunho privado ainda não salvo'); expect(win.history.length).toBe(length);
    confirm.mockReturnValue(true); win.history.forward(); await settle(win, () => win.location.pathname === '/admin/midias/'); expect(draft()).toBeUndefined();
  });
  it('libera a navegação depois de salvar e preserva a substituição de estado do Next', async () => {
    const win = setup(), draft = await mountEditor(win), confirm = vi.fn(() => false); win.confirm = confirm;
    win.history.replaceState({ __NA: true, __PRIVATE_NEXTJS_INTERNALS_TREE: { route: 'editor', revision: 2 } }, '', win.location.href);
    win.history.back(); await settle(win, () => confirm.mock.calls.length === 1 && win.location.pathname === '/admin/posts/example/');
    expect(draft()).toBe('Rascunho privado ainda não salvo'); expect(win.history.state.__PRIVATE_NEXTJS_INTERNALS_TREE).toEqual({ route: 'editor', revision: 2 });
    await draft.markSaved(); win.history.back(); await settle(win, () => win.location.pathname === '/admin/posts/');
    expect(draft()).toBeUndefined(); expect(confirm).toHaveBeenCalledTimes(1);
  });
});
