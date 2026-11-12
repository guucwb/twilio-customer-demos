import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createApp, type AuditEvent } from './app';
import { createDemoTokenVerifier, signDemoToken } from './auth/demoTokens';
import { DEMO_QUEUES, type AgentsReport, type QueueRealtimeStats, type RealtimeSnapshot } from './domain';
import { RbacStore } from './rbac/rbacStore';
import { createMockHistorySource, createMockRealtimeSource } from './sources/mockSources';

const SECRET = 'test-secret-0123456789-abcdefghijklmnop';
let failRealtime = false;
const audit: AuditEvent[] = [];
let server: Server;
let base = '';

const tok = (sub: string, roles: string[] = ['supervisor'], extra: Record<string, unknown> = {}) =>
  signDemoToken({ sub, roles, ...extra }, SECRET);
const ITAU = tok('sup.itau@demo.flash.invalid');
const SANT = tok('sup.santander@demo.flash.invalid');
const ADMIN = tok('gestao@demo.flash.invalid', ['admin']);

async function get(path: string, token?: string | null, headers: Record<string, string> = {}) {
  const res = await fetch(base + path, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers } });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* csv */
  }
  return { status: res.status, text, json: json as Record<string, unknown>, headers: res.headers };
}

beforeAll(async () => {
  const app = createApp({
    verifier: createDemoTokenVerifier(SECRET),
    rbac: RbacStore.demo(),
    catalog: DEMO_QUEUES,
    realtime: createMockRealtimeSource({ fail: () => failRealtime }),
    history: createMockHistorySource(),
    corsOrigins: ['https://flex.twilio.com'],
    audit: (e) => audit.push(e),
  });
  server = createServer((req, res) => void app(req, res));
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((r) => server.close(() => r())));
beforeEach(() => {
  failRealtime = false;
  audit.length = 0;
});

describe('Acceptance — scoped views', () => {
  it('Supervisor Itaú opens their view → only Itaú queues and metrics', async () => {
    const r = await get('/api/analytics/queues', ITAU);
    expect(r.status).toBe(200);
    const snap = r.json as unknown as RealtimeSnapshot;
    expect(snap.scope).toEqual(['itau']);
    expect(snap.queues.map((q) => q.queueKey)).toEqual(['CX_ITAU', 'CQ_ITAU']);
    expect(r.text).not.toMatch(/SANTANDER|CAIXA|C6_PIP|COMPARTILHADA/);
  });

  it('Supervisor Santander opens their view → only Santander', async () => {
    const r = await get('/api/analytics/queues', SANT);
    expect((r.json as unknown as RealtimeSnapshot).queues.map((q) => q.queueKey)).toEqual(['CX_SANTANDER', 'CQ_SANTANDER']);
    expect(r.text).not.toMatch(/ITAU|CAIXA/);
  });

  it('Flash manager → consolidated view allowed', async () => {
    const r = await get('/api/analytics/queues', ADMIN);
    const snap = r.json as unknown as RealtimeSnapshot;
    expect(r.status).toBe(200);
    expect(snap.scope).toEqual(['itau', 'santander', 'caixa', 'c6_pip']);
    expect(new Set(snap.queues.map((q) => q.bankId))).toEqual(new Set(['itau', 'santander', 'caixa', 'c6_pip', null]));
  });

  it('Fictitious agent in three queues → one identity eligible in three TaskQueues', async () => {
    const r = await get('/api/analytics/agents', ADMIN);
    const rep = r.json as unknown as AgentsReport;
    const multi = rep.agents.filter((a) => a.workerSid === 'WKdemo-multi-01');
    expect(multi).toHaveLength(1);
    expect(multi[0].eligibleQueueKeys).toEqual(['CX_ITAU', 'CX_SANTANDER', 'CX_CAIXA']);
    expect(rep.uniqueHeadcount).toBe(rep.agents.length);
    expect(rep.eligibilitySum).toBeGreaterThan(rep.uniqueHeadcount);
    // Supervisor Itaú sees the same worker, but only with the Itaú queue.
    const itau = (await get('/api/analytics/agents', ITAU)).json as unknown as AgentsReport;
    expect(itau.agents.find((a) => a.workerSid === 'WKdemo-multi-01')?.eligibleQueueKeys).toEqual(['CX_ITAU']);
  });
});

describe('Acceptance — cross-tenant attempts get a REAL 403', () => {
  it('Supervisor Itaú tries ?bankId=santander → 403 with no other-bank data', async () => {
    const r = await get('/api/analytics/queues?bankId=santander', ITAU);
    expect(r.status).toBe(403);
    expect(r.json).toEqual({ error: 'forbidden' });
    expect(r.text).not.toMatch(/SANTANDER|tasks|queues/i);
  });

  it('unknown bank → same 403 (no enumeration oracle)', async () => {
    expect((await get('/api/analytics/queues?bankId=bradesco', ITAU)).status).toBe(403);
  });

  it('forged bank claim inside a validly signed token is ignored', async () => {
    const forged = tok('sup.itau@demo.flash.invalid', ['supervisor'], { banks: ['santander'], role: 'flash_admin' });
    expect((await get('/api/analytics/queues?bankId=santander', forged)).status).toBe(403);
    const own = (await get('/api/analytics/queues', forged)).json as unknown as RealtimeSnapshot;
    expect(own.scope).toEqual(['itau']);
  });

  it('client-supplied scope parameters (queueSid, role, userId) are rejected', async () => {
    for (const p of ['queueSid=WQdemocxsantander', 'role=flash_admin', 'userId=gestao@demo.flash.invalid']) {
      const r = await get(`/api/analytics/queues?${p}`, ITAU);
      expect(r.status).toBe(400);
      expect(r.json).toEqual({ error: 'unsupported_parameter' });
    }
  });

  it('drill-down into another bank queue → 403; own queue → 200', async () => {
    expect((await get('/api/analytics/queues/CX_SANTANDER', ITAU)).status).toBe(403);
    expect((await get('/api/analytics/queues/DOES_NOT_EXIST', ITAU)).status).toBe(403);
    expect((await get('/api/analytics/queues/CQ_FRANQUIAS_COMPARTILHADA', ITAU)).status).toBe(403);
    const own = await get('/api/analytics/queues/CX_ITAU', ITAU);
    expect(own.status).toBe(200);
    expect((own.json as unknown as QueueRealtimeStats).bankId).toBe('itau');
  });

  it('historical export outside the scope is blocked; own export only has own bank', async () => {
    const denied = await get('/api/analytics/history/export.csv?bankId=caixa', ITAU);
    expect(denied.status).toBe(403);
    expect(denied.text).not.toMatch(/Caixa/);
    const own = await get('/api/analytics/history/export.csv', ITAU);
    expect(own.status).toBe(200);
    expect(own.headers.get('content-type')).toMatch(/text\/csv/);
    const banks = new Set(own.text.trim().split('\n').slice(1).map((l) => l.split(',')[1]));
    expect(banks).toEqual(new Set(['Itaú']));
  });

  it('history JSON out of scope → 403; in scope only own bank', async () => {
    expect((await get('/api/analytics/history?bankId=santander', ITAU)).status).toBe(403);
    const own = (await get('/api/analytics/history?days=3', ITAU)).json as { days: Array<{ bankId: string }> };
    expect(new Set(own.days.map((d) => d.bankId))).toEqual(new Set(['itau']));
    expect((await get('/api/analytics/history?days=999', ITAU)).status).toBe(400);
  });
});

describe('Acceptance — deny-by-default and authentication', () => {
  it('user without bank binding → 403 on every endpoint', async () => {
    const unbound = tok('sem.vinculo@demo.flash.invalid');
    const stranger = tok('nobody@example.invalid');
    for (const t of [unbound, stranger]) {
      for (const p of ['/api/analytics/me', '/api/analytics/queues', '/api/analytics/history', '/api/analytics/agents']) {
        const r = await get(p, t);
        expect(r.status).toBe(403);
        expect(r.json).toEqual({ error: 'no_bank_binding' });
      }
    }
  });

  it('valid RBAC binding but non-supervisory Flex role (agent) → 403', async () => {
    expect((await get('/api/analytics/queues', tok('sup.itau@demo.flash.invalid', ['agent']))).status).toBe(403);
  });

  it('missing / tampered / expired / alg=none tokens → 401', async () => {
    expect((await get('/api/analytics/queues', null)).status).toBe(401);
    const [h, p] = ITAU.split('.');
    const tamperedPayload = Buffer.from(
      JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), sub: 'gestao@demo.flash.invalid' }),
    ).toString('base64url');
    expect((await get('/api/analytics/queues', `${h}.${tamperedPayload}.${ITAU.split('.')[2]}`)).json).toEqual({ error: 'bad_signature' });
    const expired = signDemoToken({ sub: 'sup.itau@demo.flash.invalid', roles: ['supervisor'] }, SECRET, 60, Date.now() - 3600_000);
    expect((await get('/api/analytics/queues', expired)).json).toEqual({ error: 'token_expired' });
    const none = `${Buffer.from('{"alg":"none"}').toString('base64url')}.${p}.`;
    expect((await get('/api/analytics/queues', none)).status).toBe(401);
    const otherSecret = signDemoToken({ sub: 'gestao@demo.flash.invalid', roles: ['admin'] }, 'another-secret-0123456789-abcdefghijk');
    expect((await get('/api/analytics/queues', otherSecret)).status).toBe(401);
  });

  it('audit log records decisions with a hashed identity (no raw e-mail)', async () => {
    await get('/api/analytics/queues?bankId=santander', ITAU);
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({ status: 403, decision: 'deny', requestedBank: 'santander', reason: 'forbidden' });
    expect(audit[0].idHash).toMatch(/^[0-9a-f]{12}$/);
    expect(JSON.stringify(audit)).not.toMatch(/@demo/);
  });

  it('CORS only for allow-listed origins', async () => {
    const ok = await get('/api/analytics/me', ITAU, { Origin: 'https://flex.twilio.com' });
    expect(ok.headers.get('access-control-allow-origin')).toBe('https://flex.twilio.com');
    const evil = await get('/api/analytics/me', ITAU, { Origin: 'https://evil.example' });
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
    expect(ok.headers.get('cache-control')).toBe('no-store');
  });
});

describe('Acceptance — data-quality limitations and failures', () => {
  it('shared CQ queue: admin gets it flagged without per-bank numbers; supervisors never get it', async () => {
    const admin = (await get('/api/analytics/queues', ADMIN)).json as unknown as RealtimeSnapshot;
    const shared = admin.queues.filter((q) => q.sharedAcrossBanks);
    expect(shared).toHaveLength(1);
    expect(shared[0].bankId).toBeNull();
    expect(admin.limitations.join(' ')).toMatch(/não pode ser dividido por bank_id/);
    const itau = (await get('/api/analytics/queues', ITAU)).json as unknown as RealtimeSnapshot;
    expect(itau.queues.some((q) => q.sharedAcrossBanks)).toBe(false);
    expect(itau.limitations.join(' ')).toMatch(/omitidas/);
  });

  it('real-time source failure → 502, no fallback to cached data of another tenant', async () => {
    expect((await get('/api/analytics/queues', ADMIN)).status).toBe(200); // warm anything cacheable with admin data
    failRealtime = true;
    const r = await get('/api/analytics/queues', ITAU);
    expect(r.status).toBe(502);
    expect(r.json).toEqual({ error: 'upstream_unavailable' });
    expect(r.text).not.toMatch(/SANTANDER|CAIXA|ITAU/);
  });

  it('/me returns server-resolved scope and Queue SIDs for the Architecture A filter', async () => {
    const me = (await get('/api/analytics/me', ITAU)).json as { allowedBanks: string[]; allowedQueueSids: string[] };
    expect(me.allowedBanks).toEqual(['itau']);
    expect(me.allowedQueueSids).toEqual(DEMO_QUEUES.filter((q) => q.bankId === 'itau').map((q) => q.sid));
  });
});
