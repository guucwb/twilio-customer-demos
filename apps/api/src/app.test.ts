import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from './app.js';
import { unavailable, type VerifyGateway } from './verify.js';

// Deterministic provider doubles exist ONLY in tests. The application always uses TwilioVerify.
const verificationSid = 'VE' + '1'.repeat(32);
const factorSid = 'YF' + '2'.repeat(32);
const challengeSid = 'YC' + '3'.repeat(32);
const phone = '+5511999999999';
let gateway: VerifyGateway;
let clock: number;
beforeEach(() => {
  clock = 1_800_000_000_000;
  gateway = {
    capabilities: vi.fn().mockResolvedValue(unavailable('Configuração necessária')),
    start: vi.fn().mockResolvedValue({ sid: verificationSid, status: 'pending' }),
    check: vi.fn().mockResolvedValue({ sid: verificationSid, status: 'approved' }),
    enroll: vi.fn().mockResolvedValue({ sid: factorSid, status: 'unverified', uri: 'otpauth://totp/Fixture?secret=JBSWY3DPEHPK3PXP&issuer=Test' }),
    activate: vi.fn().mockResolvedValue({ sid: factorSid, status: 'verified' }),
    challenge: vi.fn().mockResolvedValue({ sid: challengeSid, status: 'approved' }),
  };
});

async function setup() {
  const agent = request.agent(createApp(gateway, () => clock));
  let csrf = (await agent.get('/api/session')).body.csrf as string;
  const post = (path: string, body: object = {}) => agent.post(`/api${path}`).set('x-demo-csrf', csrf).set('Origin', 'http://127.0.0.1:5173').send(body);
  const refresh = async () => { const r = await agent.get('/api/session'); csrf = r.body.csrf; return r; };
  const login = async () => {
    expect((await post('/otp/start', { phone, channel: 'whatsapp' })).status).toBe(200);
    expect((await post('/otp/check', { code: '123456' })).status).toBe(200);
    await refresh();
  };
  return { agent, post, refresh, login };
}

describe('server-controlled authentication', () => {
  it('blocks forged sessions, invalid inputs, origins and missing CSRF before provider calls', async () => {
    const { agent, post } = await setup();
    expect((await agent.post('/api/otp/start').send({ phone, channel: 'sms' })).status).toBe(403);
    expect((await post('/otp/start', { phone: '11999999999', channel: 'sms' })).status).toBe(400);
    expect((await post('/otp/start', { phone, channel: 'push' })).status).toBe(400);
    expect((await post('/otp/start', { phone, channel: 'sms' }).set('Origin', 'https://evil.example')).status).toBe(403);
    expect((await post('/reimbursement', { account: 'demo-4096', authenticated: true, stepUp: true })).status).toBe(401);
    expect(gateway.start).not.toHaveBeenCalled();
  });

  it('never logs in on a pending verification check, and hides beneficiary data', async () => {
    vi.mocked(gateway.check).mockResolvedValue({ sid: verificationSid, status: 'pending' });
    const { post, refresh } = await setup();
    await post('/otp/start', { phone, channel: 'whatsapp' });
    expect((await post('/otp/check', { code: '123456' })).status).toBe(400);
    const s = (await refresh()).body;
    expect(s.authenticated).toBe(false);
    expect(s.beneficiary).toBeUndefined();
    expect(s.events[0].status).toBe('pending');
  });

  it('performs fallback on the server-bound phone and records actual provider statuses', async () => {
    const { post, refresh } = await setup();
    await post('/otp/start', { phone, channel: 'whatsapp' });
    expect((await post('/otp/resend', { channel: 'sms' })).status).toBe(429);
    clock += 31_000;
    expect((await post('/otp/resend', { channel: 'sms', phone: '+5521999999999' })).status).toBe(200);
    expect(gateway.start).toHaveBeenLastCalledWith(phone, 'sms');
    const s = (await refresh()).body;
    expect(s.events.map((e: { method: string }) => e.method)).toEqual(['sms', 'whatsapp']);
    expect(s.events[0].sid).toBe(verificationSid);
    expect(JSON.stringify(s)).not.toContain(phone);
  });

  it('preserves the original code when the SMS fallback fails', async () => {
    const { post, refresh } = await setup();
    await post('/otp/start', { phone, channel: 'whatsapp' });
    vi.mocked(gateway.start).mockRejectedValue({ code: 60223, message: 'untrusted provider payload' });
    clock += 31_000;
    expect((await post('/otp/resend', { channel: 'sms' })).status).toBe(502);
    expect((await refresh()).body.channel).toBe('whatsapp');
    expect((await post('/otp/check', { code: '123456' })).status).toBe(200);
  });

  it('requires factor activation AND an approved Challenge, with one-use step-up', async () => {
    const { post, refresh, login } = await setup();
    await login(); clock += 2000;
    expect((await post('/reimbursement', { account: 'demo-4096' })).status).toBe(403);
    expect((await post('/totp/enroll')).body.qr).toMatch(/^data:image\/png;base64,/);
    const state = JSON.stringify((await refresh()).body);
    expect(state).not.toContain('otpauth'); expect(state).not.toContain('JBSWY');
    clock += 2000;
    expect((await post('/totp/activate', { code: '123456' })).status).toBe(200);
    expect((await post('/reimbursement', { account: 'demo-4096' })).status).toBe(403);
    clock += 2000;
    vi.mocked(gateway.challenge).mockResolvedValueOnce({ sid: challengeSid, status: 'pending' });
    expect((await post('/totp/challenge', { code: '123456' })).status).toBe(400);
    expect((await refresh()).body.stepUp).toBe(false);
    clock += 2000;
    expect((await post('/totp/challenge', { code: '654321' })).status).toBe(200);
    expect((await post('/reimbursement', { account: 'demo-4096' })).status).toBe(200);
    expect((await refresh()).body.beneficiary.reimbursement).toContain('4096');
    expect((await post('/reimbursement', { account: 'demo-2048' })).status).toBe(403);
    expect(gateway.challenge).toHaveBeenLastCalledWith(expect.stringMatching(/^careplus-demo-/), factorSid, '654321');
  });

  it('expires step-up authorization and prevents direct factor/challenge injection', async () => {
    const { post, login } = await setup(); await login(); clock += 2000;
    expect((await post('/totp/challenge', { code: '123456', factorSid, verified: true })).status).toBe(409);
    clock += 2000; await post('/totp/enroll');
    clock += 2000; await post('/totp/activate', { code: '123456' });
    clock += 2000; await post('/totp/challenge', { code: '654321' });
    clock += 121_000;
    expect((await post('/reimbursement', { account: 'demo-4096' })).status).toBe(403);
  });

  it('returns to enrollment when the factor no longer exists', async () => {
    const { post, refresh, login } = await setup(); await login(); clock += 2000;
    await post('/totp/enroll'); clock += 2000;
    await post('/totp/activate', { code: '123456' }); clock += 2000;
    vi.mocked(gateway.challenge).mockRejectedValue({ code: 20404, message: 'provider debug details' });
    expect((await post('/totp/challenge', { code: '123456' })).status).toBe(502);
    expect((await refresh()).body.totpVerified).toBe(false);
  });

  it('resets authentication and audit, retaining verified factor for this process only', async () => {
    const { post, refresh, login } = await setup(); await login(); clock += 2000;
    await post('/totp/enroll'); clock += 2000;
    await post('/totp/activate', { code: '123456' });
    await post('/reset');
    const s = (await refresh()).body;
    expect(s.authenticated).toBe(false); expect(s.events).toEqual([]);
    clock += 31_000; await login();
    expect((await refresh()).body.totpVerified).toBe(true);
  });

  it('sanitizes provider errors and never exposes raw exception data', async () => {
    vi.mocked(gateway.start).mockRejectedValue({ code: 20003, message: 'SECRET_TEST_SENTINEL', request: { auth: 'SECRET_TEST_SENTINEL' } });
    const { post, refresh } = await setup();
    const response = await post('/otp/start', { phone, channel: 'sms' });
    expect(response.status).toBe(502);
    expect(response.text).not.toContain('SECRET_TEST_SENTINEL');
    expect(JSON.stringify((await refresh()).body)).not.toContain('SECRET_TEST_SENTINEL');
  });

  it('expires sessions instead of accepting stale authentication', async () => {
    const { post, login, refresh } = await setup(); await login();
    clock += 31 * 60_000;
    expect((await post('/reimbursement', { account: 'demo-4096' })).status).toBe(401);
    expect((await refresh()).body.authenticated).toBe(false);
  });
});
