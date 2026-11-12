import { readFileSync } from 'node:fs';

import { isBankId, type BankId, type HistoryDay } from '../domain';
import { UpstreamError, type HistorySource } from './types';

/**
 * Historical source = per-bank DATA MART fed by an ETL (Flex Insights Export API +
 * JALL), never the Insights API called from the browser.
 *
 * In this PoC the mart is a JSON file of daily rows (fictitious). The ETL job that
 * would populate it (SST/TT auth → execute/raw → poll CSV → load, with RLS by
 * bank_id and audit) is NOT implemented here — see README "Etapa 2 · Histórico".
 *
 * The query is always filtered by the already-authorized bank list (RLS equivalent).
 */
export function createInsightsDataProvider(opts: { martFile: string }): HistorySource {
  let rows: HistoryDay[] | null = null;
  const load = (): HistoryDay[] => {
    if (rows) return rows;
    try {
      const parsed = JSON.parse(readFileSync(opts.martFile, 'utf8')) as HistoryDay[];
      rows = parsed.filter((r) => isBankId(r.bankId));
      return rows;
    } catch (e) {
      throw new UpstreamError(`data mart unavailable: ${(e as Error).message}`);
    }
  };
  return {
    kind: 'insights-mart',
    async getDaily(banks: BankId[], days: number, end: Date) {
      const to = end.toISOString().slice(0, 10);
      const fromDate = new Date(end.getTime() - (days - 1) * 86400000).toISOString().slice(0, 10);
      return load().filter((r) => banks.includes(r.bankId) && r.date >= fromDate && r.date <= to);
    },
  };
}
