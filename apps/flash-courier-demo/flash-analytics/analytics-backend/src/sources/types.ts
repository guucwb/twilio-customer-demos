import type { AgentEligibility, BankId, DataSourceKind, HistoryDay, QueueDef, QueueRealtimeStats, TrendPoint } from '../domain';

/**
 * Server-side data sources. They receive ONLY already-authorized queues/banks;
 * they never decide scope themselves.
 */
export interface RealtimeSource {
  readonly kind: DataSourceKind;
  getQueueStats(queues: QueueDef[]): Promise<QueueRealtimeStats[]>;
  /** Eligibility restricted to the given queues (union → unique headcount). */
  getAgents(queues: QueueDef[]): Promise<AgentEligibility[]>;
  /** Optional synthetic trend (mock only). */
  getTrend?(queues: QueueDef[]): TrendPoint[] | null;
}

export interface HistorySource {
  readonly kind: DataSourceKind;
  getDaily(banks: BankId[], days: number, end: Date): Promise<HistoryDay[]>;
}

export class UpstreamError extends Error {}
