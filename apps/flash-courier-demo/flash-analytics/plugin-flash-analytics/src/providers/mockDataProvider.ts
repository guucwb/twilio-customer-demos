import { allowedQueueSids, resolveScope, visibleQueues } from '../domain/accessPolicy';
import { DEMO_QUEUES, DEMO_WORKERS } from '../domain/catalog';
import type { DemoProfile } from '../domain/demoProfiles';
import { buildAgentsReport, countUniqueAgents } from '../domain/metrics';
import { buildRealtimeSnapshot, historyToCsv } from '../domain/reports';
import { createRealtimeSimulator, generateHistory } from '../domain/simulation';
import type { AnalyticsDataProvider, ApiResult, QueueDef } from '../domain/types';

/**
 * DEMO — DADOS FICTÍCIOS.
 * In-browser simulation of what the analytics backend answers. Every 403 here is
 * SIMULATED (`simulated: true`): it illustrates the backend policy, it does not
 * prove isolation. Real enforcement lives in analytics-backend.
 */
export interface MockProviderOptions {
  getProfile: () => DemoProfile;
  /** Toggle to demonstrate the "real-time source failed" path. */
  shouldFail?: () => boolean;
  latencyMs?: number;
  now?: () => number;
}

export function createMockDataProvider(opts: MockProviderOptions): AnalyticsDataProvider {
  const catalog: QueueDef[] = DEMO_QUEUES;
  const simulator = createRealtimeSimulator(DEMO_WORKERS);
  const now = opts.now ?? (() => Date.now());
  const delay = <T>(value: T): Promise<T> =>
    opts.latencyMs ? new Promise((r) => setTimeout(() => r(value), opts.latencyMs)) : Promise.resolve(value);

  const deny = <T>(status: number, error: string, requestLine: string): Promise<ApiResult<T>> =>
    delay({ ok: false as const, status, error, simulated: true, requestLine });

  const qs = (bankId?: string) => (bankId ? `?bankId=${encodeURIComponent(bankId)}` : '');

  return {
    kind: 'mock',

    async getMe() {
      const { principal } = opts.getProfile();
      const scope = resolveScope(principal);
      if (!scope.ok) return deny(scope.status, scope.error, 'GET /api/analytics/me');
      return delay({
        ok: true as const,
        data: {
          identity: principal.identity,
          role: principal.role,
          allowedBanks: scope.banks,
          allowedQueueSids: allowedQueueSids(principal, catalog),
        },
      });
    },

    async getRealtime(bankId) {
      const line = `GET /api/analytics/queues${qs(bankId)}`;
      const { principal } = opts.getProfile();
      const scope = resolveScope(principal, bankId);
      if (!scope.ok) return deny(scope.status, scope.error, line);
      if (opts.shouldFail?.()) return deny(502, 'upstream_unavailable', line);
      const { queues, limitations } = visibleQueues(principal, scope.banks, catalog, !bankId);
      const unique = countUniqueAgents(DEMO_WORKERS, queues);
      const t = now();
      return delay({
        ok: true as const,
        data: buildRealtimeSnapshot({
          scope: scope.banks,
          source: 'mock',
          queues: simulator.snapshot(queues, t),
          uniqueEligible: unique.eligible,
          uniqueAvailable: unique.available,
          trend: simulator.trend(queues.filter((q) => !q.sharedAcrossBanks), t),
          limitations,
          now: new Date(t),
        }),
      });
    },

    async getHistory(bankId, days = 7) {
      const line = `GET /api/analytics/history${qs(bankId)}`;
      const scope = resolveScope(opts.getProfile().principal, bankId);
      if (!scope.ok) return deny(scope.status, scope.error, line);
      const end = new Date(now());
      const list = generateHistory(scope.banks, days, end);
      return delay({
        ok: true as const,
        data: {
          source: 'insights-mart-mock' as const,
          scope: scope.banks,
          from: list[0]?.date ?? '',
          to: list[list.length - 1]?.date ?? '',
          days: list,
          limitations: [
            'Histórico simulado. Em produção: Flex Insights (export via backend/ETL) + JALL para SLA de resolução do ticket.',
          ],
        },
      });
    },

    async getAgents() {
      const { principal } = opts.getProfile();
      const scope = resolveScope(principal);
      if (!scope.ok) return deny(scope.status, scope.error, 'GET /api/analytics/agents');
      const { queues } = visibleQueues(principal, scope.banks, catalog, false);
      return delay({ ok: true as const, data: buildAgentsReport(DEMO_WORKERS, queues, scope.banks) });
    },

    async exportHistoryCsv(bankId) {
      const line = `GET /api/analytics/history/export.csv${qs(bankId)}`;
      const scope = resolveScope(opts.getProfile().principal, bankId);
      if (!scope.ok) return deny(scope.status, scope.error, line);
      return delay({ ok: true as const, data: historyToCsv(generateHistory(scope.banks, 7, new Date(now()))) });
    },
  };
}
