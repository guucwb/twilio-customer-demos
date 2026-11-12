import type { BankDef, BankId, DemoWorker, QueueDef, Tower } from './types';

/** DEMO — DADOS FICTÍCIOS. Nenhum dado real de cliente. */

export const BANKS: BankDef[] = [
  { id: 'itau', name: 'Itaú', color: '#EC7000' },
  { id: 'santander', name: 'Santander', color: '#CC0000' },
  { id: 'caixa', name: 'Caixa', color: '#005CA9' },
  { id: 'c6_pip', name: 'C6 / PIP', color: '#3A3A3A' },
];

export const BANK_IDS: BankId[] = BANKS.map((b) => b.id);

export function isBankId(value: unknown): value is BankId {
  return typeof value === 'string' && (BANK_IDS as string[]).includes(value);
}

export function bankName(id: BankId | null): string {
  if (id === null) return 'Compartilhada';
  return BANKS.find((b) => b.id === id)?.name ?? id;
}

function bankQueue(bankId: BankId, tower: Tower): QueueDef {
  const upper = bankId.toUpperCase();
  return {
    key: `${tower}_${upper}`,
    // Obviously fictitious placeholder SIDs for the mock catalog.
    sid: `WQdemo${tower.toLowerCase()}${bankId.replace('_', '')}`.padEnd(34, '0'),
    bankId,
    tower,
    label: `${tower} · ${bankName(bankId)}`,
    targetWorkers: `routing.banks HAS "${bankId}" AND routing.towers HAS "${tower}"`,
  };
}

export const DEMO_QUEUES: QueueDef[] = [
  ...BANK_IDS.flatMap((b) => [bankQueue(b, 'CX'), bankQueue(b, 'CQ')]),
  {
    key: 'CQ_FRANQUIAS_COMPARTILHADA',
    sid: 'WQdemocqcompartilhada'.padEnd(34, '0'),
    bankId: null,
    tower: 'CQ',
    label: 'CQ · Franquias (compartilhada)',
    targetWorkers: 'routing.towers HAS "CQ" AND routing.shared_backoffice == true',
    sharedAcrossBanks: true,
  },
];

/**
 * Fictitious Workers. `w-multi-01` is THE demonstration: one identity eligible
 * for CX_ITAU, CX_SANTANDER and CX_CAIXA through Worker attributes only.
 */
export const DEMO_WORKERS: DemoWorker[] = [
  {
    sid: 'WKdemo-multi-01',
    displayName: 'Agente 01 (fictício) — multibanco CX',
    activity: 'Available',
    attributes: { routing: { banks: ['itau', 'santander', 'caixa'], towers: ['CX'] } },
  },
  {
    sid: 'WKdemo-itau-02',
    displayName: 'Agente 02 (fictício)',
    activity: 'Busy',
    attributes: { routing: { banks: ['itau'], towers: ['CX', 'CQ'] } },
  },
  {
    sid: 'WKdemo-itau-03',
    displayName: 'Agente 03 (fictício)',
    activity: 'Available',
    attributes: { routing: { banks: ['itau'], towers: ['CX'] } },
  },
  {
    sid: 'WKdemo-sant-04',
    displayName: 'Agente 04 (fictício)',
    activity: 'Busy',
    attributes: { routing: { banks: ['santander'], towers: ['CX', 'CQ'] } },
  },
  {
    sid: 'WKdemo-sant-05',
    displayName: 'Agente 05 (fictício)',
    activity: 'Break',
    attributes: { routing: { banks: ['santander', 'c6_pip'], towers: ['CQ'] } },
  },
  {
    sid: 'WKdemo-caixa-06',
    displayName: 'Agente 06 (fictício)',
    activity: 'Available',
    attributes: { routing: { banks: ['caixa'], towers: ['CX', 'CQ'] } },
  },
  {
    sid: 'WKdemo-c6-07',
    displayName: 'Agente 07 (fictício)',
    activity: 'Busy',
    attributes: { routing: { banks: ['c6_pip'], towers: ['CX'] } },
  },
  {
    sid: 'WKdemo-cq-08',
    displayName: 'Agente 08 (fictício) — retaguarda',
    activity: 'Available',
    attributes: { routing: { banks: ['itau', 'caixa', 'c6_pip'], towers: ['CQ'] } },
  },
];

export function findQueue(catalog: QueueDef[], bankId: BankId, tower: Tower): QueueDef | undefined {
  return catalog.find((q) => q.bankId === bankId && q.tower === tower && !q.sharedAcrossBanks);
}
