'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { AdminApiError, adminRequest } from '@/lib/admin/api';

export function useResource<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState<Error | null>(null), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!url) { setLoading(false); return; }
    const controller = new AbortController(); setLoading(true); setError(null);
    adminRequest<T>(url, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setData(value); }).catch(reason => { if (!controller.signal.aborted) setError(reason instanceof Error ? reason : new Error('Não foi possível carregar.')); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [url, revision]);
  return { data, setData, error, loading, reload: () => setRevision(value => value + 1) };
}
const HISTORY_POSITION = '__benchimol_history_position';
const HISTORY_GUARD = Symbol.for('benchimol.admin.history-guard');
const UNSAVED_MESSAGE = 'Há alterações não salvas. Sair desta tela e descartá-las?';
interface HistoryEntry { href: string; nativeIndex: number | null; trackedIndex: number | null; }
interface HistoryGuard { subscribe(checkDirty: () => boolean): () => void; dispose(): void; }

/** Only history coordinates are stored; private field values remain in React memory. */
export function installUnsavedHistoryGuard(win: Window): HistoryGuard {
  const registry = win as Window & { [key: symbol]: HistoryGuard | undefined };
  if (registry[HISTORY_GUARD]) return registry[HISTORY_GUARD]!;
  const owner = win.crypto.randomUUID();
  const subscribers = new Set<() => boolean>();
  const originalPush = win.history.pushState, originalReplace = win.history.replaceState;
  const marker = (state: unknown): number | null => {
    if (!state || typeof state !== 'object') return null;
    const value = (state as Record<string, unknown>)[HISTORY_POSITION];
    if (!value || typeof value !== 'object') return null;
    const position = value as { owner?: string; index?: number };
    return position.owner === owner && Number.isInteger(position.index) ? position.index! : null;
  };
  const nativeIndex = (): number | null => {
    const navigation = (win as Window & { navigation?: { currentEntry?: { index?: number } } }).navigation;
    const index = navigation?.currentEntry?.index;
    return typeof index === 'number' && index >= 0 ? index : null;
  };
  const snapshot = (): HistoryEntry => ({ href: win.location.href, nativeIndex: nativeIndex(), trackedIndex: marker(win.history.state) });
  const annotated = (data: unknown, index: number) => ({ ...(data && typeof data === 'object' ? data : {}), [HISTORY_POSITION]: { owner, index } });
  let current: HistoryEntry;
  let restoring: HistoryEntry | null = null;
  const push: History['pushState'] = function(data, unused, url) {
    originalPush.call(win.history, annotated(data, (current.trackedIndex ?? 0) + 1), unused, url);
    current = snapshot();
  };
  const replace: History['replaceState'] = function(data, unused, url) {
    originalReplace.call(win.history, annotated(data, current.trackedIndex ?? 0), unused, url);
    current = snapshot();
  };
  originalReplace.call(win.history, annotated(win.history.state, 0), '', win.location.href);
  current = snapshot();
  win.history.pushState = push; win.history.replaceState = replace;
  const sameEntry = (a: HistoryEntry, b: HistoryEntry) => a.href === b.href && (
    a.nativeIndex !== null && b.nativeIndex !== null ? a.nativeIndex === b.nativeIndex : a.trackedIndex !== null && a.trackedIndex === b.trackedIndex
  );
  const returnTo = (entry: HistoryEntry, from: HistoryEntry) => {
    const distance = entry.nativeIndex !== null && from.nativeIndex !== null ? entry.nativeIndex - from.nativeIndex : entry.trackedIndex !== null && from.trackedIndex !== null ? entry.trackedIndex - from.trackedIndex : null;
    // An untagged entry predates this administrative document. Walk forwards until
    // its original entry is reached; never overwrite a URL or trim forward history.
    win.history.go(distance && Number.isFinite(distance) ? distance : 1);
  };
  const traverse = (event: PopStateEvent) => {
    const destination = snapshot();
    if (restoring) {
      event.stopImmediatePropagation();
      if (sameEntry(destination, restoring)) { current = destination; restoring = null; }
      else returnTo(restoring, destination);
      return;
    }
    const fromUrl = new URL(current.href), toUrl = new URL(destination.href);
    const leavesPage = fromUrl.origin !== toUrl.origin || fromUrl.pathname !== toUrl.pathname || fromUrl.search !== toUrl.search;
    if (leavesPage && [...subscribers].some(isDirty => isDirty()) && !win.confirm(UNSAVED_MESSAGE)) {
      // popstate is not cancelable. Capture prevents Next's bubble listener from
      // unmounting the editor; the compensating traversal restores the same entry.
      event.stopImmediatePropagation(); restoring = current; returnTo(current, destination); return;
    }
    current = destination;
  };
  win.addEventListener('popstate', traverse, true);
  const guard: HistoryGuard = {
    subscribe(checkDirty) { subscribers.add(checkDirty); return () => { subscribers.delete(checkDirty); }; },
    dispose() {
      win.removeEventListener('popstate', traverse, true); subscribers.clear();
      if (win.history.pushState === push) win.history.pushState = originalPush;
      if (win.history.replaceState === replace) win.history.replaceState = originalReplace;
      delete registry[HISTORY_GUARD];
    },
  };
  registry[HISTORY_GUARD] = guard;
  return guard;
}
// Track from the first administrative module load, before navigating to an editor.
if (typeof window !== 'undefined') installUnsavedHistoryGuard(window);

export function useUnsavedChanges(dirty: boolean) {
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  useEffect(() => installUnsavedHistoryGuard(window).subscribe(() => dirtyRef.current), []);
  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const navigate = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !anchor.href || event.button !== 0) return;
      const destination = new URL(anchor.href), source = new URL(location.href);
      if (destination.origin === source.origin && destination.pathname === source.pathname && destination.search === source.search && destination.hash) return;
      if (!window.confirm(UNSAVED_MESSAGE)) { event.preventDefault(); event.stopPropagation(); }
    };
    const beforeLeave = (event: Event) => { if (!window.confirm(UNSAVED_MESSAGE)) event.preventDefault(); };
    window.addEventListener('beforeunload', unload); window.addEventListener('admin-before-leave', beforeLeave); document.addEventListener('click', navigate, true);
    return () => { window.removeEventListener('beforeunload', unload); window.removeEventListener('admin-before-leave', beforeLeave); document.removeEventListener('click', navigate, true); };
  }, [dirty]);
}
export function PageHeading({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) { return <div className="admin-page-heading"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>; }
export function Loading({ text = 'Carregando…' }: { text?: string }) { return <p className="admin-loading" role="status"><span className="admin-spinner" aria-hidden="true" />{text}</p>; }
export function ErrorPanel({ error, retry }: { error: Error; retry?: () => void }) { const auth = error instanceof AdminApiError && error.status === 401; return <div className="admin-notice admin-notice-error" role="alert"><p>{error.message}</p>{auth ? <Link className="admin-button" href="/admin/login">Entrar novamente</Link> : retry && <button className="admin-button admin-button-secondary" onClick={retry}>Tentar novamente</button>}</div>; }
export function Notice({ children, kind = 'success' }: { children: React.ReactNode; kind?: 'success' | 'warning' | 'error' }) { return <div className={`admin-notice admin-notice-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>{children}</div>; }
export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) { return <div className="admin-empty"><h2>{title}</h2>{children}</div>; }
export function ConfirmDialog({ open, title, children, confirmLabel, busy, danger, onConfirm, onClose }: { open: boolean; title: string; children: React.ReactNode; confirmLabel: string; busy?: boolean; danger?: boolean; onConfirm: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open && dialog.current && !dialog.current.open) dialog.current.showModal(); if (!open && dialog.current?.open) dialog.current.close(); }, [open]);
  return <dialog ref={dialog} className="admin-dialog" aria-labelledby="admin-confirm-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }} onClose={onClose}><h2 id="admin-confirm-title">{title}</h2><div className="admin-dialog-body">{children}</div><div className="admin-actions"><button type="button" className="admin-button admin-button-secondary" disabled={busy} onClick={onClose}>Cancelar</button><button type="button" className={`admin-button ${danger ? 'admin-button-danger' : ''}`} disabled={busy} onClick={onConfirm}>{busy ? 'Salvando…' : confirmLabel}</button></div></dialog>;
}
export function Pager({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (page: number) => void }) { const pages = Math.max(1, Math.ceil(total / pageSize)); return <nav className="admin-pager" aria-label="Paginação"><span>{total.toLocaleString('pt-BR')} {total === 1 ? 'item' : 'itens'} · Página {page} de {pages}</span><div><button className="admin-button admin-button-secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><button className="admin-button admin-button-secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</button></div></nav>; }
