import { apiErrorSchema, statusResponseSchema, type ServiceStatus } from './index';

export class ApiClientError extends Error {
  constructor(readonly code: 'NETWORK_ERROR' | 'INVALID_RESPONSE' | 'HTTP_ERROR',
    readonly status?: number, readonly requestId?: string) {
    super(`API request failed: ${code}`);
    this.name = 'ApiClientError';
  }
}

export function createApiClient(options: {
  origin: string;
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
}) {
  const origin = new URL(options.origin);
  if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password
    || origin.pathname !== '/' || origin.search || origin.hash) throw new Error('Invalid API origin');
  const fetcher = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30000) throw new Error('Invalid API timeout');

  async function get(path: '/api/v1/status' | '/health/ready', signal?: AbortSignal): Promise<ServiceStatus> {
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(timeoutMs);
      response = await fetcher(new URL(path, origin), {
        method: 'GET', headers: { accept: 'application/json' }, cache: 'no-store',
        credentials: 'omit', redirect: 'error',
        signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      });
    } catch {
      throw new ApiClientError('NETWORK_ERROR');
    }
    if (!response.headers.get('content-type')?.includes('application/json')) {
      throw new ApiClientError('INVALID_RESPONSE', response.status);
    }
    let body: unknown;
    try { body = await response.json(); } catch { throw new ApiClientError('INVALID_RESPONSE', response.status); }
    if (!response.ok) {
      const error = apiErrorSchema.safeParse(body);
      throw new ApiClientError('HTTP_ERROR', response.status, error.success ? error.data.requestId : undefined);
    }
    const result = statusResponseSchema.safeParse(body);
    if (!result.success) throw new ApiClientError('INVALID_RESPONSE', response.status);
    return result.data.data;
  }

  return {
    getStatus: (signal?: AbortSignal) => get('/api/v1/status', signal),
    getReadiness: (signal?: AbortSignal) => get('/health/ready', signal),
  };
}
