import type { DshRpcResult } from '../types/dsh.js';

export async function callClewRpc<T>(
  endpoint: string,
  payload: unknown = {},
  signal?: AbortSignal,
): Promise<DshRpcResult<T>> {
  try {
    const res = await fetch('/api/clew/rpc', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint, payload }),
      signal,
    });
    if (!res.ok) {
      return {
        ok: false,
        error: {
          code: `HTTP_${res.status}`,
          message: `Request failed with HTTP ${res.status}`,
          details: {},
        },
      };
    }
    return (await res.json()) as DshRpcResult<T>;
  } catch (err) {
    return {
      ok: false,
      error: {
        code: err instanceof Error && err.name === 'AbortError' ? 'CLEW_CANCELLED' : 'CLEW_TRANSPORT_ERROR',
        message: err instanceof Error ? err.message : 'Network error',
        details: {},
      },
    };
  }
}
