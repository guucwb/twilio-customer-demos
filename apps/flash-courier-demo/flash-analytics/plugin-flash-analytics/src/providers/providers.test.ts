import { describe, expect, it } from 'vitest';

import { getDemoProfile, type DemoProfileId } from '../domain/demoProfiles';
import type { RealtimeSnapshot } from '../domain/types';
import { applyQueuesFilter, makeQueuePredicates } from '../flex/queuesFilter';
import { canSeeAnalyticsNav, readPluginConfig } from '../flex/config';
import { createAnalyticsApiClient } from './analyticsApiClient';
import { createMockDataProvider } from './mockDataProvider';

function mock(profile: DemoProfileId, fail = false) {
  return createMockDataProvider({ getProfile: () => getDemoProfile(profile), shouldFail: () => fail, now: () => 1_762_950_000_000 });
}

describe('mockDataProvider (simulated policy)', () => {
  it('supervisor Itaú: only Itaú queues and metrics', async () => {
    const r = await mock('supervisor_itau').getRealtime();
    expect(r.ok).toBe(true);
    const data = (r as { data: RealtimeSnapshot }).data;
    expect(data.scope).toEqual(['itau']);
    expect(data.queues.map((q) => q.queueKey)).toEqual(['CX_ITAU', 'CQ_ITAU']);
    expect(data.queues.every((q) => q.bankId === 'itau')).toBe(true);
  });

  it('supervisor Santander: only Santander', async () => {
    const r = await mock('supervisor_santander').getRealtime();
    expect(r.ok && r.data.queues.map((q) => q.queueKey)).toEqual(['CX_SANTANDER', 'CQ_SANTANDER']);
  });

  it('flash_admin: consolidated view incl. flagged shared queue', async () => {
    const r = await mock('flash_admin').getRealtime();
    expect(r.ok && r.data.queues.length).toBe(9);
    expect(r.ok && r.data.limitations.length).toBeGreaterThan(0);
    // unique headcount < sum of eligibilities
    expect(r.ok && r.data.agents.eligible! < r.data.agents.eligibilitySum).toBe(true);
  });

  it('cross-bank request is a SIMULATED 403 with no data', async () => {
    const r = await mock('supervisor_itau').getRealtime('santander');
    expect(r).toEqual({ ok: false, status: 403, error: 'forbidden', simulated: true, requestLine: 'GET /api/analytics/queues?bankId=santander' });
  });

  it('cross-bank export is a simulated 403', async () => {
    const r = await mock('supervisor_itau').exportHistoryCsv('caixa');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.status).toBe(403);
  });

  it('user without binding → 403 everywhere', async () => {
    const p = mock('sem_vinculo');
    for (const r of [await p.getMe(), await p.getRealtime(), await p.getHistory(), await p.getAgents()]) {
      expect(r.ok).toBe(false);
      expect(!r.ok && r.status).toBe(403);
    }
  });

  it('real-time failure returns an error, never another scope as fallback', async () => {
    const r = await mock('supervisor_itau', true).getRealtime();
    expect(r).toMatchObject({ ok: false, status: 502, error: 'upstream_unavailable' });
    expect('data' in r).toBe(false);
  });

  it('history only contains authorized banks', async () => {
    const r = await mock('supervisor_caixa').getHistory(undefined, 7);
    expect(r.ok && new Set(r.data.days.map((d) => d.bankId))).toEqual(new Set(['caixa']));
  });
});

describe('analyticsApiClient', () => {
  it('sends only the bearer token and maps a real 403', async () => {
    const seen: Array<{ url: string; auth: string | null }> = [];
    const fetchImpl = (async (url: string, init?: RequestInit) => {
      seen.push({ url, auth: new Headers(init?.headers).get('Authorization') });
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }) as unknown as typeof fetch;
    const client = createAnalyticsApiClient({ baseUrl: 'http://api.local/', getToken: () => 'tok', fetchImpl });
    const r = await client.getRealtime('santander');
    expect(r).toEqual({ ok: false, status: 403, error: 'forbidden', simulated: false, requestLine: 'GET /api/analytics/queues?bankId=santander' });
    expect(seen).toEqual([{ url: 'http://api.local/api/analytics/queues?bankId=santander', auth: 'Bearer tok' }]);
  });

  it('does not call the server without a token', async () => {
    let called = false;
    const client = createAnalyticsApiClient({
      baseUrl: 'http://api.local',
      getToken: () => undefined,
      fetchImpl: (async () => {
        called = true;
        return new Response('{}');
      }) as unknown as typeof fetch,
    });
    expect(await client.getMe()).toMatchObject({ ok: false, status: 401 });
    expect(called).toBe(false);
  });

  it('network errors surface as errors (no fallback data)', async () => {
    const client = createAnalyticsApiClient({
      baseUrl: 'http://api.local',
      getToken: () => 't',
      fetchImpl: (async () => {
        throw new TypeError('down');
      }) as unknown as typeof fetch,
    });
    expect(await client.getRealtime()).toMatchObject({ ok: false, status: 0, error: 'network_error' });
  });
});

describe('Architecture A helpers', () => {
  it('queue predicates are deny-by-default and SID based', () => {
    const none = makeQueuePredicates(null);
    expect(none.display({ key: 'WQ1' })).toBe(false);
    expect(none.subscription({ sid: 'WQ1' })).toBe(false);
    const some = makeQueuePredicates(new Set(['WQ1']));
    expect(some.display({ key: 'WQ1' })).toBe(true);
    expect(some.subscription({ sid: 'WQ2' })).toBe(false);
  });

  it('applyQueuesFilter calls both Flex APIs', () => {
    const calls: string[] = [];
    applyQueuesFilter({ setFilter: () => calls.push('setFilter'), setSubscriptionFilter: () => calls.push('setSubscriptionFilter') }, new Set());
    expect(calls).toEqual(['setFilter', 'setSubscriptionFilter']);
  });

  it('config defaults to mock and nav is a UX gate by Flex role', () => {
    expect(readPluginConfig({})).toEqual({ source: 'mock', apiUrl: 'http://localhost:8787', enableQueuesFilter: false, demoViewAs: false });
    expect(canSeeAnalyticsNav(['agent'])).toBe(false);
    expect(canSeeAnalyticsNav(['supervisor'])).toBe(true);
  });
});
