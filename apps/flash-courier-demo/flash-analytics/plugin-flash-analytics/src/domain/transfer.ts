import { findQueue, isBankId } from './catalog';
import type { BankId, QueueDef, Tower } from './types';

/**
 * Task attributes contract. bank_id must come from a trusted source (JALL / IVR /
 * integration that created the Task) — never from a browser-editable field.
 */
export interface FlashTaskAttributes {
  bank_id: BankId;
  tower: Tower;
  ticket_id: string;
  /** Bank that originated the interaction; immutable across transfers. */
  origin_bank_id?: BankId;
  transfer_history?: Array<{ from: Tower; to: Tower; at: string }>;
  [key: string]: unknown;
}

export class TransferError extends Error {}

export function buildTransferAttributes(
  attrs: FlashTaskAttributes,
  targetTower: Tower,
  at: Date = new Date(),
): FlashTaskAttributes {
  if (!isBankId(attrs.bank_id)) throw new TransferError('Task sem bank_id confiável: transferência bloqueada.');
  if (!attrs.ticket_id) throw new TransferError('Task sem ticket_id: transferência bloqueada.');
  const origin = attrs.origin_bank_id ?? attrs.bank_id;
  if (origin !== attrs.bank_id) throw new TransferError('bank_id divergente do banco de origem: transferência bloqueada.');
  return {
    ...attrs,
    bank_id: origin,
    origin_bank_id: origin,
    tower: targetTower,
    transfer_history: [...(attrs.transfer_history ?? []), { from: attrs.tower, to: targetTower, at: at.toISOString() }],
  };
}

/** Workflow-equivalent routing: a Task only ever lands in a queue of its own bank. */
export function routeTask(catalog: QueueDef[], attrs: FlashTaskAttributes): QueueDef {
  const queue = findQueue(catalog, attrs.bank_id, attrs.tower);
  if (!queue) throw new TransferError(`Nenhuma fila ${attrs.tower} para o banco ${attrs.bank_id}.`);
  return queue;
}

/** Workflow filter expression equivalent (for the TaskRouter Workflow proposal). */
export function workflowFilterExpression(bankId: BankId, tower: Tower): string {
  return `bank_id == "${bankId}" AND tower == "${tower}"`;
}
