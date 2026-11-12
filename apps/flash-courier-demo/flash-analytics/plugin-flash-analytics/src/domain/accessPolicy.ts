import { isBankId } from './catalog';
import type { BankId, Principal, QueueDef } from './types';

/**
 * Deny-by-default scope resolution. In production this runs on the BACKEND,
 * with `principal` resolved server-side from the verified identity. The plugin's
 * mock provider reuses it only to SIMULATE what the backend would answer.
 */

export type ScopeResult =
  | { ok: true; banks: BankId[] }
  | { ok: false; status: 403; error: 'no_bank_binding' | 'forbidden' };

export function resolveScope(principal: Principal | null | undefined, requestedBankId?: string | null): ScopeResult {
  const allowed = (principal?.allowedBanks ?? []).filter(isBankId);
  if (!principal || allowed.length === 0) return { ok: false, status: 403, error: 'no_bank_binding' };

  if (requestedBankId === undefined || requestedBankId === null || requestedBankId === '') {
    return { ok: true, banks: [...allowed] };
  }
  // Unknown ids and ids outside the scope get the SAME answer (no enumeration oracle).
  if (!isBankId(requestedBankId) || !allowed.includes(requestedBankId)) {
    return { ok: false, status: 403, error: 'forbidden' };
  }
  return { ok: true, banks: [requestedBankId] };
}

export interface VisibleQueues {
  queues: QueueDef[];
  limitations: string[];
}

export const SHARED_QUEUE_LIMITATION =
  'Fila(s) compartilhada(s) entre bancos: o agregado de TaskRouter mistura bancos e não pode ser dividido por bank_id. ' +
  'Para números por banco, use filas CQ segregadas ou um pipeline de eventos por Task com bank_id confiável.';

/**
 * Queues the principal may see for the resolved bank scope.
 * Shared (multi-bank) queues are only visible to flash_admin on an unfiltered
 * (consolidated) request, and always flagged — never split into invented per-bank numbers.
 */
export function visibleQueues(
  principal: Principal,
  banks: BankId[],
  catalog: QueueDef[],
  consolidatedRequest: boolean,
): VisibleQueues {
  const queues = catalog.filter((q) => !q.sharedAcrossBanks && q.bankId !== null && banks.includes(q.bankId));
  const shared = catalog.filter((q) => q.sharedAcrossBanks);
  const limitations: string[] = [];
  if (shared.length > 0) {
    if (principal.role === 'flash_admin' && consolidatedRequest) {
      queues.push(...shared);
      limitations.push(SHARED_QUEUE_LIMITATION);
    } else if (principal.role === 'bank_supervisor') {
      limitations.push(
        'Filas compartilhadas entre bancos foram omitidas deste escopo porque seu agregado contém dados de outros bancos.',
      );
    }
  }
  return { queues, limitations };
}

export function allowedQueueSids(principal: Principal, catalog: QueueDef[]): string[] {
  const scope = resolveScope(principal);
  if (!scope.ok) return [];
  return visibleQueues(principal, scope.banks, catalog, true).queues.map((q) => q.sid);
}
