import { bankName } from './catalog';
import { HEADCOUNT_NOTE } from './metrics';
import type { BankId, DataSourceKind, HistoryDay, QueueRealtimeStats, RealtimeSnapshot, TrendPoint } from './types';

export function buildRealtimeSnapshot(args: {
  scope: BankId[];
  source: DataSourceKind;
  queues: QueueRealtimeStats[];
  uniqueEligible: number | null;
  uniqueAvailable: number | null;
  trend: TrendPoint[] | null;
  limitations: string[];
  now?: Date;
}): RealtimeSnapshot {
  const eligibilitySum = args.queues.reduce((s, q) => s + q.eligibleWorkers, 0);
  return {
    generatedAt: (args.now ?? new Date()).toISOString(),
    source: args.source,
    scope: args.scope,
    queues: args.queues,
    agents: {
      eligible: args.uniqueEligible,
      available: args.uniqueAvailable,
      eligibilitySum,
      note: HEADCOUNT_NOTE,
    },
    trend: args.trend,
    limitations: args.limitations,
  };
}

const CSV_HEADER = 'data,banco,torre,atendimentos,primeira_resposta_s,tempo_resolucao_min,sla_percent';

function csvCell(value: string | number): string {
  const s = String(value);
  // Neutralize spreadsheet formula injection and quote when needed.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function historyToCsv(days: HistoryDay[]): string {
  const rows = days.map((d) =>
    [d.date, bankName(d.bankId), d.tower, d.handled, d.firstResponseSeconds, d.resolutionMinutes, d.slaPercent]
      .map(csvCell)
      .join(','),
  );
  return [CSV_HEADER, ...rows].join('\n') + '\n';
}
