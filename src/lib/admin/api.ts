export class AdminApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export interface AdminResult<T> { data: T; meta?: { publication?: { status: 'current' | 'pending'; message: string } }; }
export async function adminRequestDetailed<T>(url: string, init: RequestInit = {}): Promise<AdminResult<T>> {
  const timeout = new AbortController();
  const signal = init.signal ? AbortSignal.any([init.signal, timeout.signal]) : timeout.signal;
  const deadline = setTimeout(() => timeout.abort(), 45_000);
  try {
    const response = await fetch(url, { ...init, signal, credentials: 'same-origin', cache: 'no-store', headers: { ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...init.headers } });
    let payload: { data?: T; meta?: AdminResult<T>['meta']; error?: { code: string; message: string } };
    try { payload = await response.json(); } catch { throw new AdminApiError(response.status, 'INVALID_RESPONSE', 'Não foi possível ler a resposta. Tente novamente.'); }
    if (!response.ok || payload.error) throw new AdminApiError(response.status, payload.error?.code ?? 'REQUEST_FAILED', response.status === 401 && payload.error?.code !== 'invalid_login' ? 'Sua sessão expirou. Entre novamente para continuar.' : payload.error?.message ?? 'Não foi possível concluir a operação. Tente novamente.');
    if (!('data' in payload)) throw new AdminApiError(response.status, 'INVALID_RESPONSE', 'Resposta incompleta. Tente novamente.');
    return { data: payload.data as T, meta: payload.meta };
  } catch (error) {
    if (timeout.signal.aborted && signal.reason === timeout.signal.reason) {
      // Aborting the browser request cannot prove whether a server mutation
      // committed. Keep the editor's fields and never replay the write here.
      const mutation = !['GET', 'HEAD', 'OPTIONS'].includes((init.method ?? 'GET').toUpperCase());
      throw new AdminApiError(0, 'CONFIRMATION_TIMEOUT', mutation
        ? 'Não foi possível confirmar a operação a tempo. Ela pode ter sido salva. Consulte a versão atual antes de tentar novamente.'
        : 'Não foi possível carregar os dados a tempo. Tente recarregar.');
    }
    if (init.signal?.aborted && signal.reason === init.signal.reason) throw init.signal.reason;
    throw error;
  } finally { clearTimeout(deadline); }
}
export async function adminRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  return (await adminRequestDetailed<T>(url, init)).data;
}
