import { eligibleQueuesFor } from './metrics';
import type { BankId, DemoWorker, HistoryDay, QueueDef, QueueRealtimeStats, Tower, TrendPoint } from './types';

/** DEMO — DADOS FICTÍCIOS. Deterministic pseudo-random simulation (no real data). */

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand(seed: string): number {
  return (hash(seed) % 10000) / 10000;
}

const TICK_MS = 4000;

interface QueueState {
  base: number;
  waiting: number;
  active: number;
  reserved: number;
  longestWait: number;
  sla: number;
}

export interface RealtimeSimulator {
  snapshot(queues: QueueDef[], now?: number): QueueRealtimeStats[];
  trend(queues: QueueDef[], now?: number): TrendPoint[];
}

export function createRealtimeSimulator(workers: DemoWorker[], seed = 'flash-demo'): RealtimeSimulator {
  const stateFor = (q: QueueDef, tick: number): QueueState => {
    const base = 3 + Math.floor(rand(`${seed}:${q.key}:base`) * 12) + (q.tower === 'CX' ? 6 : 0);
    const wave = Math.sin((tick + rand(`${seed}:${q.key}:phase`) * 20) / 6);
    const noise = rand(`${seed}:${q.key}:${tick}`) - 0.5;
    const active = Math.max(0, Math.round(base * (1 + 0.35 * wave) + noise * 4));
    const waiting = Math.max(0, Math.round(base * 0.45 * (1 + 0.6 * wave) + noise * 3));
    const reserved = Math.max(0, Math.round(waiting * 0.2));
    const longestWait = waiting === 0 ? 0 : Math.round(30 + waiting * 38 + rand(`${seed}:${q.key}:lw:${tick}`) * 90);
    const sla = Math.min(99.5, Math.max(78, 97 - waiting * 1.4 + noise * 3));
    return { base, waiting, active, reserved, longestWait, sla };
  };

  const toStats = (q: QueueDef, s: QueueState): QueueRealtimeStats => {
    const eligible = workers.filter((w) => eligibleQueuesFor(w, [q]).length > 0);
    return {
      queueKey: q.key,
      queueSid: q.sid,
      bankId: q.bankId,
      tower: q.tower,
      label: q.label,
      tasksWaiting: s.waiting,
      tasksReserved: s.reserved,
      tasksActive: s.active,
      eligibleWorkers: eligible.length,
      availableWorkers: eligible.filter((w) => w.activity === 'Available').length,
      longestWaitSeconds: s.longestWait,
      slaPercent: Math.round(s.sla * 10) / 10,
      sharedAcrossBanks: Boolean(q.sharedAcrossBanks),
    };
  };

  return {
    snapshot(queues, now = Date.now()) {
      const tick = Math.floor(now / TICK_MS);
      return queues.map((q) => toStats(q, stateFor(q, tick)));
    },
    trend(queues, now = Date.now()) {
      const tick = Math.floor(now / TICK_MS);
      const points: TrendPoint[] = [];
      for (let m = 60; m >= 0; m -= 5) {
        // 5 minutes = 75 ticks; scale down so the curve is smooth but alive.
        const t = tick - Math.round((m * 60000) / TICK_MS / 15);
        const states = queues.map((q) => stateFor(q, t));
        points.push({
          minutesAgo: m,
          active: states.reduce((s, x) => s + x.active, 0),
          waiting: states.reduce((s, x) => s + x.waiting, 0),
        });
      }
      return points;
    },
  };
}

export function generateHistory(banks: BankId[], days: number, end: Date = new Date()): HistoryDay[] {
  const out: HistoryDay[] = [];
  const towers: Tower[] = ['CX', 'CQ'];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - i));
    const date = d.toISOString().slice(0, 10);
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    for (const bankId of banks) {
      for (const tower of towers) {
        const r = rand(`${bankId}:${tower}:${date}`);
        const size = { itau: 1.3, santander: 1.1, caixa: 1.0, c6_pip: 0.6 }[bankId];
        const handled = Math.round((tower === 'CX' ? 180 : 70) * size * (weekend ? 0.45 : 1) * (0.85 + r * 0.3));
        out.push({
          date,
          bankId,
          tower,
          handled,
          firstResponseSeconds: Math.round((tower === 'CX' ? 45 : 240) * (0.8 + r * 0.5)),
          resolutionMinutes: Math.round((tower === 'CX' ? 38 : 410) * (0.75 + rand(`${bankId}:${tower}:${date}:res`) * 0.6)),
          slaPercent: Math.round((88 + r * 10) * 10) / 10,
        });
      }
    }
  }
  return out;
}
