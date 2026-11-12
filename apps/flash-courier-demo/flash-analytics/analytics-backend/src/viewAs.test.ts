import { describe, expect, it } from 'vitest';

import { createCore, type CoreRequest } from './app';
import { createCompositeVerifier } from './auth/compositeVerifier';
import { createDemoTokenVerifier, signDemoToken } from './auth/demoTokens';
import { AuthError, type TokenVerifier } from './auth/types';
import { DEMO_QUEUES, type RealtimeSnapshot } from './domain';
import { RbacStore } from './rbac/rbacStore';
import { createMockHistorySource, createMockRealtimeSource } from './sources/mockSources';

const SECRET = 'view-as-secret-0123456789-abcdefghijk';
const ADMIN = signDemoToken({ sub: 'gestao@demo.flash.invalid', roles: ['admin'] }, SECRET);
const ITAU = signDemoToken({ sub: 'sup.itau@demo.flash.invalid', roles: ['supervisor'] }, SECRET);

function core(demoViewAs: boolean, rbac = RbacStore.demo()) {
  return createCore({
    verifier: createDemoTokenVerifier(SECRET),
    rbac,
    catalog: DEMO_QUEUES,
    realtime: createMockRealtimeSource(),
    history: createMockHistorySource(),
    corsOrigins: ['https://flex.twilio.com'],
    demoViewAs,
    audit: () => undefined,
  });
}

function req(path: string, token: string, extra: Record<string, string> = {}): CoreRequest {
  const url = new URL(path, 'http://x');
  return { method: 'GET', path: url.pathname, query: url.searchParams, headers: { authorization: `Bearer ${token}`, ...extra } };
}

describe('server-side "view as" (demo, narrow-only)', () => {
  it('admin viewing as supervisor_itau gets only Itaú and a REAL 403 for Santander', async () => {
    const c = core(true);
    const own = await c(req('/api/analytics/queues', ADMIN, { 'x-flash-view-as': 'supervisor_itau' }));
    expect(own.status).toBe(200);
    expect((JSON.parse(own.body) as RealtimeSnapshot).queues.map((q) => q.queueKey)).toEqual(['CX_ITAU', 'CQ_ITAU']);
    const cross = await c(req('/api/analytics/queues?bankId=santander', ADMIN, { 'x-flash-view-as': 'supervisor_itau' }));
    expect(cross.status).toBe(403);
    expect(JSON.parse(cross.body)).toEqual({ error: 'forbidden' });
  });

  it('view-as sem_vinculo → deny-by-default', async () => {
    const r = await core(true)(req('/api/analytics/queues', ADMIN, { 'x-flash-view-as': 'sem_vinculo' }));
    expect(r.status).toBe(403);
  });

  it('a bank supervisor cannot use view-as (cannot escalate)', async () => {
    const r = await core(true)(req('/api/analytics/queues', ITAU, { 'x-flash-view-as': 'supervisor_santander' }));
    expect(r.status).toBe(403);
    expect(JSON.parse(r.body)).toEqual({ error: 'view_as_not_allowed' });
  });

  it('view-as never broadens beyond the admin own banks', async () => {
    const rbac = new RbacStore([{ identity: 'gestao@demo.flash.invalid', role: 'flash_admin', banks: ['itau'] }]);
    const r = await core(true, rbac)(req('/api/analytics/queues', ADMIN, { 'x-flash-view-as': 'supervisor_santander' }));
    expect(r.status).toBe(403); // intersection is empty
  });

  it('disabled by default; unknown profile rejected', async () => {
    expect((await core(false)(req('/api/analytics/me', ADMIN, { 'x-flash-view-as': 'supervisor_itau' }))).status).toBe(400);
    expect((await core(true)(req('/api/analytics/me', ADMIN, { 'x-flash-view-as': 'root' }))).status).toBe(400);
  });

  it('CORS preflight allows the view-as header and Private Network Access', async () => {
    const r = await core(true)({
      method: 'OPTIONS',
      path: '/api/analytics/queues',
      query: new URLSearchParams(),
      headers: { origin: 'https://flex.twilio.com', 'access-control-request-private-network': 'true' },
    });
    expect(r.status).toBe(204);
    expect(r.headers['Access-Control-Allow-Headers']).toMatch(/X-Flash-View-As/);
    expect(r.headers['Access-Control-Allow-Private-Network']).toBe('true');
  });
});

describe('composite verifier', () => {
  const flexCalls: string[] = [];
  const flex: TokenVerifier = {
    kind: 'flex',
    async verify(t) {
      flexCalls.push(t);
      if (t === 'good-flex') return { identity: 'real.user', roles: ['admin'] };
      throw new AuthError('invalid_token');
    },
  };

  it('routes demo-issued tokens to the demo verifier and the rest to Flex/IAM', async () => {
    const v = createCompositeVerifier(flex, createDemoTokenVerifier(SECRET));
    expect((await v.verify(ADMIN)).identity).toBe('gestao@demo.flash.invalid');
    expect((await v.verify('good-flex')).identity).toBe('real.user');
    expect(flexCalls).toEqual(['good-flex']);
  });

  it('without demo secret, demo tokens go to Flex/IAM (and fail there)', async () => {
    const v = createCompositeVerifier(flex, null);
    await expect(v.verify(ADMIN)).rejects.toBeInstanceOf(AuthError);
  });

  it('a demo-issuer token signed with another secret is rejected (no fallthrough to Flex)', async () => {
    const forged = signDemoToken({ sub: 'gestao@demo.flash.invalid', roles: ['admin'] }, 'attacker-secret-0123456789-abcdefgh');
    const v = createCompositeVerifier(flex, createDemoTokenVerifier(SECRET));
    await expect(v.verify(forged)).rejects.toThrow('bad_signature');
  });
});

describe('RBAC binding by Worker SID (Flex tokens)', () => {
  it('resolves a principal by workerSid when the identity is not listed', () => {
    const rbac = new RbacStore([{ identity: 'someone@x', workerSid: 'WK' + 'a'.repeat(32), role: 'flash_admin', banks: ['itau'] }]);
    expect(rbac.resolve({ identity: 'opaque-flex-identity', roles: ['admin'], workerSid: 'WK' + 'a'.repeat(32) })?.allowedBanks).toEqual(['itau']);
    expect(rbac.resolve({ identity: 'opaque-flex-identity', roles: ['admin'], workerSid: 'WK' + 'b'.repeat(32) })).toBeNull();
    expect(rbac.resolve({ identity: 'opaque-flex-identity', roles: ['agent'], workerSid: 'WK' + 'a'.repeat(32) })).toBeNull();
  });
});
