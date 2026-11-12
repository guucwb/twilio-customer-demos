import type {
  AgentsReport,
  AnalyticsDataProvider,
  ApiResult,
  HistoryReport,
  MeReport,
  RealtimeSnapshot,
} from '../domain/types';

/**
 * Architecture B client. Sends ONLY the Flex user token; the backend verifies it
 * and resolves the bank scope server-side. Nothing sent here (bankId included)
 * is trusted by the server as an authorization input — it is just a filter request.
 */
export interface ApiClientOptions {
  baseUrl: string;
  getToken: () => string | undefined;
  /** Demo "view as" profile → X-Flash-View-As. The server only lets a verified admin NARROW its scope. */
  getViewAs?: () => string | undefined;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export function createAnalyticsApiClient(opts: ApiClientOptions): AnalyticsDataProvider {
  const doFetch = opts.fetchImpl ?? ((input: RequestInfo, init?: RequestInit) => fetch(input, init));
  const base = opts.baseUrl.replace(/\/+$/, '');

  async function call<T>(path: string, parse: 'json' | 'text' = 'json'): Promise<ApiResult<T>> {
    const requestLine = `GET ${path}`;
    const token = opts.getToken();
    if (!token) return { ok: false, status: 401, error: 'missing_token', simulated: false, requestLine };
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : undefined;
    const timer = controller ? setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000) : undefined;
    try {
      const res = await doFetch(`${base}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: parse === 'json' ? 'application/json' : 'text/csv',
          ...(opts.getViewAs?.() ? { 'X-Flash-View-As': opts.getViewAs() as string } : {}),
        },
        signal: controller?.signal,
        credentials: 'omit',
      });
      if (!res.ok) {
        let error = `http_${res.status}`;
        try {
          const body = (await res.json()) as { error?: string };
          if (body && typeof body.error === 'string') error = body.error;
        } catch {
          /* non-JSON error body */
        }
        return { ok: false, status: res.status, error, simulated: false, requestLine };
      }
      const data = (parse === 'json' ? await res.json() : await res.text()) as T;
      return { ok: true, data };
    } catch (e) {
      return { ok: false, status: 0, error: (e as Error).name === 'AbortError' ? 'timeout' : 'network_error', simulated: false, requestLine };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  const qs = (bankId?: string, extra?: Record<string, string>) => {
    const p = new URLSearchParams();
    if (bankId) p.set('bankId', bankId);
    Object.entries(extra ?? {}).forEach(([k, v]) => p.set(k, v));
    const s = p.toString();
    return s ? `?${s}` : '';
  };

  return {
    kind: 'api',
    getMe: () => call<MeReport>('/api/analytics/me'),
    getRealtime: (bankId) => call<RealtimeSnapshot>(`/api/analytics/queues${qs(bankId)}`),
    getHistory: (bankId, days) =>
      call<HistoryReport>(`/api/analytics/history${qs(bankId, days ? { days: String(days) } : undefined)}`),
    getAgents: () => call<AgentsReport>('/api/analytics/agents'),
    exportHistoryCsv: (bankId) => call<string>(`/api/analytics/history/export.csv${qs(bankId)}`, 'text'),
  };
}
