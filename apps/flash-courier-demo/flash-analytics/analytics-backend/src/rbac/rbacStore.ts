import { readFileSync } from 'node:fs';

import { DEMO_PROFILES, isBankId, type BankId, type Principal, type PrincipalRole } from '../domain';
import type { VerifiedIdentity } from '../auth/types';

/**
 * Server-side RBAC: verified identity → role + banks. In production this is the
 * IdP group mapping (SSO) or a managed RBAC table, never data sent by the browser
 * nor Worker attributes editable from the client.
 */
export interface RbacEntry {
  identity: string;
  /** Optional binding by TaskRouter Worker SID (returned by Twilio IAM for Flex tokens). */
  workerSid?: string;
  role: PrincipalRole;
  banks: BankId[];
}

/** Flex roles required in the verified token in addition to the RBAC binding. */
const FLEX_ROLES_ALLOWED = ['admin', 'supervisor'];

export class RbacStore {
  private readonly byIdentity: Map<string, RbacEntry>;
  private readonly byWorker = new Map<string, RbacEntry>();

  constructor(entries: RbacEntry[]) {
    this.byIdentity = new Map();
    for (const e of entries) {
      if (e.role !== 'flash_admin' && e.role !== 'bank_supervisor') throw new Error(`Invalid role for ${e.identity}`);
      const banks = e.banks.filter(isBankId);
      if (banks.length !== e.banks.length) throw new Error(`Invalid bank in RBAC entry ${e.identity}`);
      this.byIdentity.set(e.identity.toLowerCase(), { ...e, banks });
      if (e.workerSid) {
        if (!/^WK[0-9a-f]{32}$/.test(e.workerSid)) throw new Error(`Invalid workerSid for ${e.identity}`);
        this.byWorker.set(e.workerSid, { ...e, banks });
      }
    }
  }

  static fromFile(path: string): RbacStore {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as { entries: RbacEntry[] };
    return new RbacStore(raw.entries);
  }

  static demo(): RbacStore {
    return new RbacStore(
      DEMO_PROFILES.map((p) => ({ identity: p.principal.identity, role: p.principal.role, banks: p.principal.allowedBanks })),
    );
  }

  /** Returns null (→ 403) when there is no binding or the Flex role is not supervisory. */
  resolve(verified: VerifiedIdentity): Principal | null {
    if (!verified.roles.some((r) => FLEX_ROLES_ALLOWED.includes(r))) return null;
    const entry =
      this.byIdentity.get(verified.identity.toLowerCase()) ?? (verified.workerSid ? this.byWorker.get(verified.workerSid) : undefined);
    if (!entry || entry.banks.length === 0) return null;
    return { identity: entry.identity, role: entry.role, allowedBanks: [...entry.banks] };
  }
}
