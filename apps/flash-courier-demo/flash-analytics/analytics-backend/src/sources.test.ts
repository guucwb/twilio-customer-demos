import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createFlexTokenVerifier } from './auth/flexTokenVerifier';
import { AuthError } from './auth/types';
import { loadQueueCatalog } from './config';
import { generateHistory, type QueueDef } from './domain';
import { createInsightsDataProvider } from './sources/insightsDataProvider';
import { createTaskRouterDataProvider } from './sources/taskRouterDataProvider';
import { UpstreamError } from './sources/types';

const WS = 'WS' + 'a'.repeat(32);
const q = (i: number, bankId: 'itau' | 'santander' = 'itau'): QueueDef => ({
  key: `Q${i}`,
  sid: 'WQ' + i.toString(16).padStart(32, '0'),
  bankId,
  tower: 'CX',
  label: `Q${i}`,
  targetWorkers: '1==1',
});

function fakeTaskRouter() {
  const requests: Array<{ url: string; body: unknown; contentType: string | null }> = [];
  const fetchImpl = (async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    requests.push({ url, body, contentType: new Headers(init?.headers).get('Content-Type') });
    if (url.endsWith('/TaskQueues/RealTimeStatistics')) {
      return Response.json({
        task_queue_data: (body.queueSids as string[]).map((sid) => ({
          task_queue_sid: sid,
          tasks_by_status: { pending: 2, reserved: 1, assigned: 3, wrapping: 1 },
          total_eligible_workers: 4,
          total_available_workers: 1,
          longest_task_waiting_age: 75,
        })),
      });
    }
    if (url.includes('/Workers?')) {
      const sid = new URL(url).searchParams.get('TaskQueueSid');
      return Response.json({
        workers: [
          { sid: 'WKshared', friendly_name: 'shared', activity_name: 'Available' },
          { sid: `WK-${sid}`, friendly_name: 'solo', activity_name: 'Busy' },
        ],
      });
    }
    return new Response('not found', { status: 404 });
  }) as unknown as typeof fetch;
  return { requests, fetchImpl };
}

describe('taskRouterDataProvider (mocked HTTP, no live Twilio)', () => {
  it('uses the bulk endpoint with JSON {queueSids} and maps fields', async () => {
    const { requests, fetchImpl } = fakeTaskRouter();
    const tr = createTaskRouterDataProvider({ workspaceSid: WS, username: 'SKx', password: 'y', fetchImpl });
    const [s] = await tr.getQueueStats([q(1)]);
    expect(requests[0].url).toBe(`https://taskrouter.twilio.com/v1/Workspaces/${WS}/TaskQueues/RealTimeStatistics`);
    expect(requests[0].contentType).toBe('application/json');
    expect(requests[0].body).toEqual({ queueSids: [q(1).sid] });
    expect(s).toMatchObject({ tasksWaiting: 2, tasksReserved: 1, tasksActive: 4, eligibleWorkers: 4, availableWorkers: 1, longestWaitSeconds: 75, slaPercent: null });
  });

  it('only requests the authorized SIDs it was given, in chunks of 50', async () => {
    const { requests, fetchImpl } = fakeTaskRouter();
    const tr = createTaskRouterDataProvider({ workspaceSid: WS, username: 'SKx', password: 'y', fetchImpl });
    const queues = Array.from({ length: 120 }, (_, i) => q(i + 1));
    await tr.getQueueStats(queues);
    expect(requests.map((r) => (r.body as { queueSids: string[] }).queueSids.length)).toEqual([50, 50, 20]);
    const asked = requests.flatMap((r) => (r.body as { queueSids: string[] }).queueSids);
    expect(new Set(asked)).toEqual(new Set(queues.map((x) => x.sid)));
  });

  it('caches per SID with TTL', async () => {
    const { fetchImpl } = fakeTaskRouter();
    let now = 0;
    const tr = createTaskRouterDataProvider({ workspaceSid: WS, username: 'SKx', password: 'y', fetchImpl, ttlMs: 10_000, clock: () => now });
    await tr.getQueueStats([q(1), q(2)]);
    now = 5_000;
    await tr.getQueueStats([q(1), q(2)]);
    expect(tr.calls.bulk).toBe(1);
    now = 11_000;
    await tr.getQueueStats([q(1)]);
    expect(tr.calls.bulk).toBe(2);
  });

  it('unique headcount across queues does not double count shared workers', async () => {
    const { fetchImpl } = fakeTaskRouter();
    const tr = createTaskRouterDataProvider({ workspaceSid: WS, username: 'SKx', password: 'y', fetchImpl });
    const agents = await tr.getAgents([q(1), q(2), q(3)]);
    expect(agents).toHaveLength(4); // 1 shared + 3 solo
    expect(agents.find((a) => a.workerSid === 'WKshared')?.eligibleQueueKeys).toEqual(['Q1', 'Q2', 'Q3']);
  });

  it('upstream HTTP errors become UpstreamError', async () => {
    const tr = createTaskRouterDataProvider({
      workspaceSid: WS,
      username: 'SKx',
      password: 'y',
      fetchImpl: (async () => new Response('{}', { status: 429 })) as unknown as typeof fetch,
    });
    await expect(tr.getQueueStats([q(1)])).rejects.toBeInstanceOf(UpstreamError);
  });
});

describe('flexTokenVerifier (mocked IAM)', () => {
  const AC = 'AC' + 'b'.repeat(32);
  const make = (body: unknown, status = 200) =>
    createFlexTokenVerifier({
      accountSid: AC,
      authToken: 'secret',
      clock: () => Date.parse('2026-11-12T12:00:00Z'),
      fetchImpl: (async (url: string, init?: RequestInit) => {
        expect(url).toBe(`https://iam.twilio.com/v1/Accounts/${AC}/Tokens/validate`);
        expect(JSON.parse(String(init?.body))).toEqual({ token: 'flex-token' });
        return Response.json(body, { status });
      }) as unknown as typeof fetch,
    });

  it('accepts a valid, unexpired token', async () => {
    const id = await make({ valid: true, expiration: '2026-11-12T13:00:00Z', identity: 'sup.itau', roles: ['supervisor'], worker_sid: 'WK1' }).verify('flex-token');
    expect(id).toEqual({ identity: 'sup.itau', roles: ['supervisor'], workerSid: 'WK1' });
  });
  it('rejects invalid, expired or non-200 validations', async () => {
    await expect(make({ valid: false }).verify('flex-token')).rejects.toBeInstanceOf(AuthError);
    await expect(make({ valid: true, expiration: '2026-11-12T11:00:00Z', identity: 'x' }).verify('flex-token')).rejects.toThrow('token_expired');
    await expect(make({}, 401).verify('flex-token')).rejects.toThrow('invalid_token');
  });
});

describe('insightsDataProvider (data mart) and queue map loader', () => {
  it('returns only authorized banks inside the date window', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mart-'));
    const file = join(dir, 'mart.json');
    writeFileSync(file, JSON.stringify(generateHistory(['itau', 'santander'], 10, new Date('2026-11-12T00:00:00Z'))));
    const p = createInsightsDataProvider({ martFile: file });
    const rows = await p.getDaily(['itau'], 3, new Date('2026-11-12T00:00:00Z'));
    expect(new Set(rows.map((r) => r.bankId))).toEqual(new Set(['itau']));
    expect(new Set(rows.map((r) => r.date))).toEqual(new Set(['2026-11-10', '2026-11-11', '2026-11-12']));
  });
  it('missing mart → UpstreamError (no silent fallback)', async () => {
    await expect(createInsightsDataProvider({ martFile: '/nonexistent.json' }).getDaily(['itau'], 1, new Date())).rejects.toBeInstanceOf(UpstreamError);
  });
  it('queue map validation rejects malformed SIDs and unbanked non-shared queues', () => {
    const dir = mkdtempSync(join(tmpdir(), 'qm-'));
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ queues: [{ ...q(1), sid: 'WQnope' }] }));
    expect(() => loadQueueCatalog(bad)).toThrow(/Invalid queue SID/);
    writeFileSync(bad, JSON.stringify({ queues: [{ ...q(1), bankId: null }] }));
    expect(() => loadQueueCatalog(bad)).toThrow(/sharedAcrossBanks/);
  });
});
