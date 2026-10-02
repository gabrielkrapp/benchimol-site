import { afterEach, describe, expect, it, vi } from 'vitest';
import { adminRequestDetailed } from '@/lib/admin/api';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

function pendingFetch() {
  return vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
    const signal = init.signal;
    if (!signal) return;
    if (signal.aborted) reject(signal.reason);
    else signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  }));
}

describe('admin request confirmation deadline', () => {
  it('ends a stalled save with an unknown-result warning and never repeats the mutation', async () => {
    vi.useFakeTimers(); const fetch = pendingFetch(); vi.stubGlobal('fetch', fetch);
    let outcome: unknown;
    const operation = adminRequestDetailed('/api/admin/posts/fixture', { method: 'PATCH', body: '{"version":1}' });
    operation.catch(error => { outcome = error; });
    await vi.advanceTimersByTimeAsync(45_001);
    expect(outcome).toMatchObject({ status: 0, code: 'CONFIRMATION_TIMEOUT' });
    expect((outcome as Error).message).toContain('pode ter sido salva');
    expect((outcome as Error).message).toContain('Consulte a versão atual');
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('covers a stalled response body after headers have arrived', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => new Response(new ReadableStream({
      start(controller) { init.signal?.addEventListener('abort', () => controller.error(init.signal!.reason), { once: true }); },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    let outcome: unknown;
    adminRequestDetailed('/api/admin/posts/fixture', { method: 'PATCH', body: '{}' }).catch(error => { outcome = error; });
    await vi.advanceTimersByTimeAsync(45_001);
    expect(outcome).toMatchObject({ status: 0, code: 'CONFIRMATION_TIMEOUT' });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('retains caller cancellation without relabeling it as a save timeout', async () => {
    vi.useFakeTimers(); vi.stubGlobal('fetch', pendingFetch());
    const controller = new AbortController();
    const operation = adminRequestDetailed('/api/admin/posts', { signal: controller.signal });
    const rejection = expect(operation).rejects.toMatchObject({ name: 'AbortError' });
    controller.abort(); await rejection;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('clears its deadline after a successful request', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', async () => new Response('{"data":{"version":2}}', { status: 200 }));
    expect(await adminRequestDetailed('/api/admin/posts/fixture')).toEqual({ data: { version: 2 }, meta: undefined });
    expect(vi.getTimerCount()).toBe(0);
  });

  it('gives a load-specific error for a timed-out read', async () => {
    vi.useFakeTimers(); vi.stubGlobal('fetch', pendingFetch());
    let outcome: unknown;
    adminRequestDetailed('/api/admin/posts/fixture').catch(error => { outcome = error; });
    await vi.advanceTimersByTimeAsync(45_001);
    expect(outcome).toMatchObject({ status: 0, code: 'CONFIRMATION_TIMEOUT' });
    expect((outcome as Error).message).toContain('carregar os dados');
    expect((outcome as Error).message).not.toContain('salva');
  });
});
