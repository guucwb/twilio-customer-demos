import {
  buildAgentsReport,
  createRealtimeSimulator,
  generateHistory,
  DEMO_WORKERS,
  type BankId,
  type DemoWorker,
  type QueueDef,
} from '../domain';
import { UpstreamError, type HistorySource, type RealtimeSource } from './types';

/** DEMO — DADOS FICTÍCIOS. */
export function createMockRealtimeSource(opts: { workers?: DemoWorker[]; fail?: () => boolean; now?: () => number } = {}): RealtimeSource {
  const workers = opts.workers ?? DEMO_WORKERS;
  const sim = createRealtimeSimulator(workers);
  const now = opts.now ?? Date.now;
  return {
    kind: 'mock',
    async getQueueStats(queues: QueueDef[]) {
      if (opts.fail?.()) throw new UpstreamError('mock realtime failure');
      return sim.snapshot(queues, now());
    },
    async getAgents(queues: QueueDef[]) {
      if (opts.fail?.()) throw new UpstreamError('mock realtime failure');
      return buildAgentsReport(workers, queues, []).agents;
    },
    getTrend(queues: QueueDef[]) {
      return sim.trend(queues.filter((q) => !q.sharedAcrossBanks), now());
    },
  };
}

export function createMockHistorySource(opts: { fail?: () => boolean } = {}): HistorySource {
  return {
    kind: 'insights-mart-mock',
    async getDaily(banks: BankId[], days: number, end: Date) {
      if (opts.fail?.()) throw new UpstreamError('mock history failure');
      return generateHistory(banks, days, end);
    },
  };
}
