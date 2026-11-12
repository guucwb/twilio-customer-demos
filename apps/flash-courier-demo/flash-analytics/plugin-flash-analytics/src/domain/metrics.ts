import { evaluateExpression } from './routingExpression';
import type { AgentsReport, BankId, DemoWorker, HistoryDay, QueueDef, QueueRealtimeStats } from './types';

export const HEADCOUNT_NOTE =
  'Elegibilidade em múltiplas filas não representa headcount: um mesmo Worker pode contar em várias filas.';

export function eligibleQueuesFor(worker: DemoWorker, queues: QueueDef[]): QueueDef[] {
  return queues.filter((q) => evaluateExpression(q.targetWorkers, worker.attributes as Record<string, unknown>));
}

/** Builds the agents view restricted to the given queues (already scope-filtered). */
export function buildAgentsReport(workers: DemoWorker[], queues: QueueDef[], scope: BankId[]): AgentsReport {
  const agents = workers
    .map((w) => ({
      workerSid: w.sid,
      displayName: w.displayName,
      activity: w.activity,
      eligibleQueueKeys: eligibleQueuesFor(w, queues).map((q) => q.key),
    }))
    .filter((a) => a.eligibleQueueKeys.length > 0);
  const eligibilitySum = agents.reduce((sum, a) => sum + a.eligibleQueueKeys.length, 0);
  return { scope, agents, uniqueHeadcount: agents.length, eligibilitySum, note: HEADCOUNT_NOTE };
}

export function countUniqueAgents(workers: DemoWorker[], queues: QueueDef[]) {
  const eligible = workers.filter((w) => eligibleQueuesFor(w, queues).length > 0);
  return {
    eligible: eligible.length,
    available: eligible.filter((w) => w.activity === 'Available').length,
    eligibilitySum: eligible.reduce((s, w) => s + eligibleQueuesFor(w, queues).length, 0),
  };
}

export interface RealtimeTotals {
  waiting: number;
  active: number;
  reserved: number;
  longestWaitSeconds: number;
  slaPercent: number | null;
}

export function summarizeRealtime(queues: QueueRealtimeStats[]): RealtimeTotals {
  const waiting = queues.reduce((s, q) => s + q.tasksWaiting, 0);
  const active = queues.reduce((s, q) => s + q.tasksActive, 0);
  const reserved = queues.reduce((s, q) => s + q.tasksReserved, 0);
  const longestWaitSeconds = queues.reduce((m, q) => Math.max(m, q.longestWaitSeconds), 0);
  const withSla = queues.filter((q) => q.slaPercent !== null);
  const weight = withSla.reduce((s, q) => s + q.tasksActive + q.tasksWaiting, 0);
  const slaPercent =
    withSla.length === 0
      ? null
      : weight === 0
        ? withSla.reduce((s, q) => s + (q.slaPercent ?? 0), 0) / withSla.length
        : withSla.reduce((s, q) => s + (q.slaPercent ?? 0) * (q.tasksActive + q.tasksWaiting), 0) / weight;
  return { waiting, active, reserved, longestWaitSeconds, slaPercent };
}

export interface HistoryTotals {
  handled: number;
  firstResponseSeconds: number;
  resolutionMinutes: number;
  slaPercent: number;
}

export function summarizeHistory(days: HistoryDay[]): HistoryTotals | null {
  const handled = days.reduce((s, d) => s + d.handled, 0);
  if (handled === 0) return null;
  const w = (pick: (d: HistoryDay) => number) => days.reduce((s, d) => s + pick(d) * d.handled, 0) / handled;
  return {
    handled,
    firstResponseSeconds: w((d) => d.firstResponseSeconds),
    resolutionMinutes: w((d) => d.resolutionMinutes),
    slaPercent: w((d) => d.slaPercent),
  };
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}h${pad(m)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatPercent(value: number | null): string {
  if (value === null || Number.isNaN(value)) return 'n/d';
  return `${value.toFixed(1).replace('.', ',')}%`;
}
