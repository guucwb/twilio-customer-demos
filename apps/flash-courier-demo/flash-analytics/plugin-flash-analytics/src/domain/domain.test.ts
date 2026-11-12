import { describe, expect, it } from 'vitest';

import { allowedQueueSids, resolveScope, visibleQueues } from './accessPolicy';
import { DEMO_QUEUES, DEMO_WORKERS } from './catalog';
import { getDemoProfile } from './demoProfiles';
import { buildAgentsReport, eligibleQueuesFor, summarizeRealtime } from './metrics';
import { historyToCsv } from './reports';
import { evaluateExpression } from './routingExpression';
import { buildTransferAttributes, routeTask, TransferError, workflowFilterExpression } from './transfer';

const itau = getDemoProfile('supervisor_itau').principal;
const admin = getDemoProfile('flash_admin').principal;
const unbound = getDemoProfile('sem_vinculo').principal;

describe('accessPolicy (deny-by-default)', () => {
  it('supervisor Itaú resolves only Itaú', () => {
    expect(resolveScope(itau)).toEqual({ ok: true, banks: ['itau'] });
  });
  it('supervisor Itaú asking for Santander is 403', () => {
    expect(resolveScope(itau, 'santander')).toEqual({ ok: false, status: 403, error: 'forbidden' });
  });
  it('unknown bank id gets the same 403 as out-of-scope (no enumeration)', () => {
    expect(resolveScope(itau, 'bradesco')).toEqual({ ok: false, status: 403, error: 'forbidden' });
    expect(resolveScope(admin, 'bradesco')).toEqual({ ok: false, status: 403, error: 'forbidden' });
  });
  it('user without bank binding is denied', () => {
    expect(resolveScope(unbound)).toEqual({ ok: false, status: 403, error: 'no_bank_binding' });
    expect(resolveScope(null)).toEqual({ ok: false, status: 403, error: 'no_bank_binding' });
    expect(allowedQueueSids(unbound, DEMO_QUEUES)).toEqual([]);
  });
  it('flash_admin gets the consolidated view of the banks it administers', () => {
    const scope = resolveScope(admin);
    expect(scope.ok && scope.banks).toEqual(['itau', 'santander', 'caixa', 'c6_pip']);
  });
  it('visible queues for Itaú are only CX_ITAU and CQ_ITAU', () => {
    const { queues } = visibleQueues(itau, ['itau'], DEMO_QUEUES, true);
    expect(queues.map((q) => q.key)).toEqual(['CX_ITAU', 'CQ_ITAU']);
  });
  it('shared CQ queue: hidden from bank supervisors with a limitation, flagged for admin', () => {
    const sup = visibleQueues(itau, ['itau'], DEMO_QUEUES, true);
    expect(sup.queues.some((q) => q.sharedAcrossBanks)).toBe(false);
    expect(sup.limitations.join(' ')).toMatch(/compartilhadas/);
    const adm = visibleQueues(admin, ['itau', 'santander', 'caixa', 'c6_pip'], DEMO_QUEUES, true);
    expect(adm.queues.filter((q) => q.sharedAcrossBanks).map((q) => q.key)).toEqual(['CQ_FRANQUIAS_COMPARTILHADA']);
    expect(adm.limitations.join(' ')).toMatch(/não pode ser dividido por bank_id/);
    // A per-bank filtered admin request never includes the shared queue.
    const admItau = visibleQueues(admin, ['itau'], DEMO_QUEUES, false);
    expect(admItau.queues.some((q) => q.sharedAcrossBanks)).toBe(false);
  });
});

describe('routing expressions and shared agents', () => {
  it('evaluates HAS / == / AND / OR / 1==1', () => {
    const attrs = { routing: { banks: ['itau'], towers: ['CX'] }, shared: true };
    expect(evaluateExpression('routing.banks HAS "itau" AND routing.towers HAS "CX"', attrs)).toBe(true);
    expect(evaluateExpression('routing.banks HAS "caixa" OR shared == true', attrs)).toBe(true);
    expect(evaluateExpression('routing.banks HAS "caixa"', attrs)).toBe(false);
    expect(evaluateExpression('1==1', attrs)).toBe(true);
    expect(() => evaluateExpression('routing.banks IN ["x"]', attrs)).toThrow();
  });

  it('one Worker identity is eligible for CX_ITAU, CX_SANTANDER and CX_CAIXA', () => {
    const multi = DEMO_WORKERS.filter((w) => w.sid === 'WKdemo-multi-01');
    expect(multi).toHaveLength(1);
    expect(eligibleQueuesFor(multi[0], DEMO_QUEUES).map((q) => q.key)).toEqual(['CX_ITAU', 'CX_SANTANDER', 'CX_CAIXA']);
  });

  it('unique headcount does not double count multi-queue agents', () => {
    const report = buildAgentsReport(DEMO_WORKERS, DEMO_QUEUES, ['itau', 'santander', 'caixa', 'c6_pip']);
    expect(report.uniqueHeadcount).toBe(new Set(report.agents.map((a) => a.workerSid)).size);
    expect(report.eligibilitySum).toBeGreaterThan(report.uniqueHeadcount);
  });

  it('supervisor Itaú sees the shared agent only with Itaú queues (no cross-bank eligibility leak)', () => {
    const { queues } = visibleQueues(itau, ['itau'], DEMO_QUEUES, false);
    const report = buildAgentsReport(DEMO_WORKERS, queues, ['itau']);
    const multi = report.agents.find((a) => a.workerSid === 'WKdemo-multi-01');
    expect(multi?.eligibleQueueKeys).toEqual(['CX_ITAU']);
    expect(report.agents.flatMap((a) => a.eligibleQueueKeys).every((k) => k.endsWith('_ITAU'))).toBe(true);
  });
});

describe('CX → CQ transfer', () => {
  const task = { bank_id: 'santander' as const, tower: 'CX' as const, ticket_id: 'TCK-DEMO-0001' };

  it('preserves the originating bank and routes to the same bank CQ queue', () => {
    const moved = buildTransferAttributes(task, 'CQ', new Date('2026-11-12T12:00:00Z'));
    expect(moved.bank_id).toBe('santander');
    expect(moved.origin_bank_id).toBe('santander');
    expect(moved.ticket_id).toBe('TCK-DEMO-0001');
    expect(moved.tower).toBe('CQ');
    expect(moved.transfer_history).toEqual([{ from: 'CX', to: 'CQ', at: '2026-11-12T12:00:00.000Z' }]);
    expect(routeTask(DEMO_QUEUES, moved).key).toBe('CQ_SANTANDER');
  });

  it('blocks a transfer whose bank_id was altered away from the origin', () => {
    const tampered = { ...buildTransferAttributes(task, 'CQ'), bank_id: 'itau' as const };
    expect(() => buildTransferAttributes(tampered, 'CX')).toThrow(TransferError);
  });

  it('blocks tasks without trusted bank_id or ticket_id', () => {
    expect(() => buildTransferAttributes({ ...task, bank_id: 'x' as never }, 'CQ')).toThrow(TransferError);
    expect(() => buildTransferAttributes({ ...task, ticket_id: '' }, 'CQ')).toThrow(TransferError);
  });

  it('workflow filter expression is bank + tower', () => {
    expect(workflowFilterExpression('caixa', 'CQ')).toBe('bank_id == "caixa" AND tower == "CQ"');
  });
});

describe('metrics and export helpers', () => {
  it('SLA is null when the source does not provide it (TaskRouter)', () => {
    const t = summarizeRealtime([
      {
        queueKey: 'CX_ITAU', queueSid: 'WQ1', bankId: 'itau', tower: 'CX', label: '', tasksWaiting: 2, tasksReserved: 0,
        tasksActive: 3, eligibleWorkers: 1, availableWorkers: 1, longestWaitSeconds: 40, slaPercent: null, sharedAcrossBanks: false,
      },
    ]);
    expect(t).toMatchObject({ waiting: 2, active: 3, longestWaitSeconds: 40, slaPercent: null });
  });

  it('CSV export neutralizes formula injection', () => {
    const csv = historyToCsv([
      { date: '=cmd()', bankId: 'itau', tower: 'CX', handled: 1, firstResponseSeconds: 1, resolutionMinutes: 1, slaPercent: 90 },
    ]);
    expect(csv.split('\n')[1].startsWith("'=cmd()")).toBe(true);
  });
});
