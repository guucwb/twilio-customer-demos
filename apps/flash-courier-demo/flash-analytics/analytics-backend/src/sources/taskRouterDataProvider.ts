import type { AgentEligibility, QueueDef, QueueRealtimeStats } from '../domain';
import { UpstreamError, type RealtimeSource } from './types';

/**
 * TaskRouter real-time source (read-only).
 *  - Bulk: POST /v1/Workspaces/{WS}/TaskQueues/RealTimeStatistics
 *    JSON body {"queueSids": [...]} — 1..50 SIDs per call, 5 req/s.
 *    (Verified against a dev account: form-encoded bodies return 415.)
 *  - Eligibility: GET /v1/Workspaces/{WS}/Workers?TaskQueueSid=WQ…
 * Only called with queues already authorized by the policy layer.
 * Per-SID cache with TTL to respect rate limits and absorb dashboards polling.
 */
export interface TaskRouterOptions {
  workspaceSid: string;
  /** API Key SID (SK…) + secret, or Account SID + Auth Token. Server-side only. */
  username: string;
  password: string;
  ttlMs?: number;
  fetchImpl?: typeof fetch;
  clock?: () => number;
  baseUrl?: string;
}

interface RawQueueStats {
  task_queue_sid: string;
  tasks_by_status?: Record<string, number>;
  total_eligible_workers?: number;
  total_available_workers?: number;
  longest_task_waiting_age?: number;
}

interface RawWorker {
  sid: string;
  friendly_name: string;
  activity_name?: string;
  available?: boolean;
}

const BULK_LIMIT = 50;

export function createTaskRouterDataProvider(opts: TaskRouterOptions): RealtimeSource & { readonly calls: { bulk: number; workers: number } } {
  if (!/^WS[0-9a-f]{32}$/.test(opts.workspaceSid)) throw new Error('TASKROUTER_WORKSPACE_SID invalid');
  const doFetch = opts.fetchImpl ?? fetch;
  const clock = opts.clock ?? Date.now;
  const ttl = opts.ttlMs ?? 10_000;
  const base = `${opts.baseUrl ?? 'https://taskrouter.twilio.com'}/v1/Workspaces/${opts.workspaceSid}`;
  const auth = `Basic ${Buffer.from(`${opts.username}:${opts.password}`).toString('base64')}`;
  const statsCache = new Map<string, { at: number; value: RawQueueStats }>();
  const workersCache = new Map<string, { at: number; value: RawWorker[] }>();
  const calls = { bulk: 0, workers: 0 };

  async function fetchBulk(sids: string[]): Promise<void> {
    for (let i = 0; i < sids.length; i += BULK_LIMIT) {
      const chunk = sids.slice(i, i + BULK_LIMIT);
      calls.bulk++;
      let res: Response;
      try {
        res = await doFetch(`${base}/TaskQueues/RealTimeStatistics`, {
          method: 'POST',
          headers: { Authorization: auth, 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ queueSids: chunk }),
        });
      } catch (e) {
        throw new UpstreamError(`taskrouter network error: ${(e as Error).message}`);
      }
      if (!res.ok) throw new UpstreamError(`taskrouter bulk stats HTTP ${res.status}`);
      const body = (await res.json()) as { task_queue_data?: RawQueueStats[] };
      const at = clock();
      for (const item of body.task_queue_data ?? []) {
        // Ignore anything we did not ask for (defense in depth).
        if (chunk.includes(item.task_queue_sid)) statsCache.set(item.task_queue_sid, { at, value: item });
      }
      for (const sid of chunk) if (!statsCache.has(sid)) throw new UpstreamError(`taskrouter returned no data for ${sid}`);
    }
  }

  async function workersFor(queueSid: string): Promise<RawWorker[]> {
    const hit = workersCache.get(queueSid);
    if (hit && clock() - hit.at < ttl) return hit.value;
    calls.workers++;
    let res: Response;
    try {
      res = await doFetch(`${base}/Workers?TaskQueueSid=${encodeURIComponent(queueSid)}&PageSize=1000`, {
        headers: { Authorization: auth, Accept: 'application/json' },
      });
    } catch (e) {
      throw new UpstreamError(`taskrouter network error: ${(e as Error).message}`);
    }
    if (!res.ok) throw new UpstreamError(`taskrouter workers HTTP ${res.status}`);
    const body = (await res.json()) as { workers?: RawWorker[] };
    const value = body.workers ?? [];
    workersCache.set(queueSid, { at: clock(), value });
    return value;
  }

  return {
    kind: 'taskrouter',
    calls,
    async getQueueStats(queues: QueueDef[]): Promise<QueueRealtimeStats[]> {
      const now = clock();
      const stale = queues.map((q) => q.sid).filter((sid) => {
        const hit = statsCache.get(sid);
        return !hit || now - hit.at >= ttl;
      });
      if (stale.length) await fetchBulk(stale);
      return queues.map((q) => {
        const raw = statsCache.get(q.sid)!.value;
        const s = raw.tasks_by_status ?? {};
        return {
          queueKey: q.key,
          queueSid: q.sid,
          bankId: q.bankId,
          tower: q.tower,
          label: q.label,
          tasksWaiting: s.pending ?? 0,
          tasksReserved: s.reserved ?? 0,
          tasksActive: (s.assigned ?? 0) + (s.wrapping ?? 0),
          eligibleWorkers: raw.total_eligible_workers ?? 0,
          availableWorkers: raw.total_available_workers ?? 0,
          longestWaitSeconds: raw.longest_task_waiting_age ?? 0,
          slaPercent: null, // not provided by RealTimeStatistics
          sharedAcrossBanks: Boolean(q.sharedAcrossBanks),
        };
      });
    },
    async getAgents(queues: QueueDef[]): Promise<AgentEligibility[]> {
      const byWorker = new Map<string, AgentEligibility>();
      for (const q of queues) {
        for (const w of await workersFor(q.sid)) {
          const entry = byWorker.get(w.sid) ?? {
            workerSid: w.sid,
            displayName: w.friendly_name,
            activity: w.activity_name ?? (w.available ? 'Available' : 'Unavailable'),
            eligibleQueueKeys: [],
          };
          entry.eligibleQueueKeys.push(q.key);
          byWorker.set(w.sid, entry);
        }
      }
      return Array.from(byWorker.values());
    },
  };
}
