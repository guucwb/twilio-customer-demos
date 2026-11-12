/**
 * Shared domain types — pure TypeScript (no React / Flex imports) so the same
 * contracts are used by the Flex plugin (UI + mock provider) and by the
 * analytics backend (authoritative enforcement).
 */

export type BankId = 'itau' | 'santander' | 'caixa' | 'c6_pip';
export type Tower = 'CX' | 'CQ';

export interface BankDef {
  id: BankId;
  name: string;
  color: string;
}

export interface QueueDef {
  /** Stable logical key, e.g. CX_ITAU (equals the TaskQueue friendly name). */
  key: string;
  /** TaskQueue SID (WQ…). Demo catalog uses obviously fake values. */
  sid: string;
  /** null only for queues shared by several banks (see sharedAcrossBanks). */
  bankId: BankId | null;
  tower: Tower;
  label: string;
  /** TaskQueue target-workers expression (routing by Worker attributes). */
  targetWorkers: string;
  /**
   * A queue that serves more than one bank. Its aggregate statistics mix banks,
   * so they must NEVER be shown to a bank-scoped supervisor nor split per bank
   * without a per-Task event pipeline carrying a trusted bank_id.
   */
  sharedAcrossBanks?: boolean;
}

export type PrincipalRole = 'flash_admin' | 'bank_supervisor';

/** Authenticated caller with its server-resolved scope. */
export interface Principal {
  identity: string;
  role: PrincipalRole;
  allowedBanks: BankId[];
}

export interface QueueRealtimeStats {
  queueKey: string;
  queueSid: string;
  bankId: BankId | null;
  tower: Tower;
  label: string;
  tasksWaiting: number;
  tasksReserved: number;
  tasksActive: number;
  eligibleWorkers: number;
  availableWorkers: number;
  longestWaitSeconds: number;
  /** Illustrative SLA (mock). TaskRouter real-time stats do not return SLA → null. */
  slaPercent: number | null;
  sharedAcrossBanks: boolean;
}

export interface UniqueAgentCount {
  /** Distinct Workers eligible for at least one visible queue (null = unknown). */
  eligible: number | null;
  available: number | null;
  /** Sum of per-queue eligibility — NOT a headcount. */
  eligibilitySum: number;
  note: string;
}

export type DataSourceKind = 'mock' | 'taskrouter' | 'insights-mart' | 'insights-mart-mock';

export interface RealtimeSnapshot {
  generatedAt: string;
  source: DataSourceKind;
  scope: BankId[];
  queues: QueueRealtimeStats[];
  agents: UniqueAgentCount;
  /** Active tasks over the last 60 min (mock only). null → UI accumulates its own polls. */
  trend: TrendPoint[] | null;
  limitations: string[];
}

export interface TrendPoint {
  minutesAgo: number;
  active: number;
  waiting: number;
}

export interface HistoryDay {
  date: string; // YYYY-MM-DD
  bankId: BankId;
  tower: Tower;
  handled: number;
  firstResponseSeconds: number;
  resolutionMinutes: number;
  slaPercent: number;
}

export interface HistoryReport {
  source: DataSourceKind;
  scope: BankId[];
  from: string;
  to: string;
  days: HistoryDay[];
  limitations: string[];
}

export interface WorkerRouting {
  banks: BankId[];
  towers: Tower[];
}

export interface DemoWorker {
  sid: string;
  displayName: string;
  activity: 'Available' | 'Busy' | 'Break' | 'Offline';
  attributes: { routing: WorkerRouting };
}

export interface AgentEligibility {
  workerSid: string;
  displayName: string;
  activity: string;
  /** Only queues inside the caller's scope are listed. */
  eligibleQueueKeys: string[];
}

export interface AgentsReport {
  scope: BankId[];
  agents: AgentEligibility[];
  uniqueHeadcount: number;
  eligibilitySum: number;
  note: string;
}

export interface MeReport {
  identity: string;
  role: PrincipalRole;
  allowedBanks: BankId[];
  /** SIDs for Queues View filtering (Architecture A). UX only, never a security boundary. */
  allowedQueueSids: string[];
}

export type ApiResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: number;
      error: string;
      /** true when the error was produced by the in-browser mock, not by a real server. */
      simulated: boolean;
      requestLine?: string;
    };

/** Common contract the UI depends on. Implementations: mockDataProvider, analyticsApiClient. */
export interface AnalyticsDataProvider {
  readonly kind: 'mock' | 'api';
  getMe(): Promise<ApiResult<MeReport>>;
  getRealtime(bankId?: string): Promise<ApiResult<RealtimeSnapshot>>;
  getHistory(bankId?: string, days?: number): Promise<ApiResult<HistoryReport>>;
  getAgents(): Promise<ApiResult<AgentsReport>>;
  exportHistoryCsv(bankId?: string): Promise<ApiResult<string>>;
}
