import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from './app';
import { resolveReadiness } from './capabilities';
import { createAdapters, ProviderError, type Adapters, type TwilioLike } from './providers';
import type { ProviderEvent } from '../shared/events';

const SID = 'AC' + '0'.repeat(32);
const liveEnv = {
  TWILIO_ACCOUNT_SID: SID,
  TWILIO_AUTH_TOKEN: 'test-token-not-real',
  ACHE_LIVE_ENABLED: 'true',
  ACHE_WHATSAPP_FROM: 'whatsapp:+15550001111',
  ACHE_DEMO_RECIPIENT_WHATSAPP: 'whatsapp:+5511999990000',
} as NodeJS.ProcessEnv;

const event = (status: string, extra: Partial<ProviderEvent> = {}): ProviderEvent => ({
  provider: 'Twilio', id: 'SM' + 'a'.repeat(32), status, errorCode: null, providerTime: '2026-09-28T13:00:00.000Z',
  observedAt: '2026-09-28T13:00:01.000Z', requestedChannel: 'whatsapp', actualChannel: 'whatsapp', ...extra,
});

function fakeAdapters(overrides: Partial<Adapters> = {}): Adapters {
  return {
    sendMessage: vi.fn().mockResolvedValue(event('queued')),
    fetchMessage: vi.fn().mockResolvedValue(event('delivered')),
    sendEmail: vi.fn(),
    ...overrides,
  };
}

const send = (body: Record<string, unknown> = {}) => ({
  channel: 'whatsapp', requestId: crypto.randomUUID(), confirmed: true, recipient: { mode: 'configured' }, ...body,
});

describe('readiness', () => {
  it('defaults every channel to DEMO and RCS to NOT_PROVISIONED with an empty environment', () => {
    const r = resolveReadiness({});
    expect(r.liveEnabled).toBe(false);
    expect(r.channels.whatsapp.status).toBe('DEMO');
    expect(r.channels.sms.status).toBe('DEMO');
    expect(r.channels.email.status).toBe('DEMO');
    expect(r.channels.email.missing).toEqual(expect.arrayContaining(['SENDGRID_API_KEY', 'ACHE_EMAIL_FROM']));
    expect(r.channels.rcs.status).toBe('NOT_PROVISIONED');
  });

  it('keeps a configured WhatsApp adapter in DEMO until ACHE_LIVE_ENABLED=true', () => {
    const r = resolveReadiness({ ...liveEnv, ACHE_LIVE_ENABLED: 'false' });
    expect(r.channels.whatsapp).toMatchObject({ status: 'DEMO', configured: true, missing: ['ACHE_LIVE_ENABLED=true'] });
    expect(resolveReadiness(liveEnv).channels.whatsapp.status).toBe('LIVE');
  });

  it('never infers Aché senders from other demos variables', () => {
    const r = resolveReadiness({ ...liveEnv, ACHE_WHATSAPP_FROM: undefined, TWILIO_WHATSAPP_FROM: 'whatsapp:+15550001111', TWILIO_DEMO_NUMBER: '+15550001111' });
    expect(r.channels.whatsapp.status).toBe('DEMO');
    expect(r.channels.sms.status).toBe('DEMO');
  });

  it('exposes masks and variable names only, never values or secrets', async () => {
    const env = { ...liveEnv, SENDGRID_API_KEY: 'SG.secret-value', ACHE_EMAIL_FROM: 'demo@example.com' };
    const res = await request(createApp({ env, adapters: fakeAdapters() })).get('/api/ache/readiness');
    const text = JSON.stringify(res.body);
    for (const secret of ['test-token-not-real', 'SG.secret-value', SID, '5511999990000', '15550001111', 'demo@example.com']) expect(text).not.toContain(secret);
    expect(res.body.channels.whatsapp.recipient).toBe('+55 •••• 0000');
  });

  it('rejects a mismatched EXPECTED_TWILIO_ACCOUNT_SID', () => {
    expect(resolveReadiness({ ...liveEnv, EXPECTED_TWILIO_ACCOUNT_SID: 'AC' + '1'.repeat(32) }).channels.whatsapp.status).toBe('DEMO');
  });
});

describe('send boundary', () => {
  it('never contacts a provider in DEMO mode', async () => {
    const adapters = fakeAdapters();
    const res = await request(createApp({ env: {}, adapters })).post('/api/ache/send').send(send());
    expect(res.status).toBe(409);
    expect(adapters.sendMessage).not.toHaveBeenCalled();
  });

  it('has no RCS send path, even with everything else live', async () => {
    const adapters = fakeAdapters();
    const res = await request(createApp({ env: liveEnv, adapters })).post('/api/ache/send').send(send({ channel: 'rcs' }));
    expect(res.status).toBe(409);
    expect(res.body.error).toContain('RCS');
    expect(JSON.stringify(res.body)).not.toMatch(/SM[0-9a-f]{32}|delivered|sent/);
    expect(adapters.sendMessage).not.toHaveBeenCalled();
    expect(adapters.sendEmail).not.toHaveBeenCalled();
  });

  it('requires explicit confirmation', async () => {
    const adapters = fakeAdapters();
    const res = await request(createApp({ env: liveEnv, adapters })).post('/api/ache/send').send(send({ confirmed: false }));
    expect(res.status).toBe(400);
    expect(adapters.sendMessage).not.toHaveBeenCalled();
  });

  it('refuses custom recipients unless explicitly allowed', async () => {
    const adapters = fakeAdapters();
    const res = await request(createApp({ env: liveEnv, adapters })).post('/api/ache/send').send(send({ recipient: { mode: 'custom', value: '+5511911112222' } }));
    expect(res.status).toBe(400);
    expect(adapters.sendMessage).not.toHaveBeenCalled();
  });

  it('sends the shared WhatsApp copy with a test notice and returns only the provider result', async () => {
    const adapters = fakeAdapters();
    const res = await request(createApp({ env: liveEnv, adapters })).post('/api/ache/send').send(send());
    expect(res.status).toBe(200);
    expect(adapters.sendMessage).toHaveBeenCalledWith('whatsapp', '+15550001111', '+5511999990000', expect.stringContaining('Não é uma comunicação oficial da Aché'));
    expect(res.body.events).toEqual([event('queued')]);
    expect(res.body.final).toBe(false);
  });

  it('is idempotent per requestId and blocks repeated sends during the cooldown', async () => {
    const adapters = fakeAdapters();
    const app = createApp({ env: liveEnv, adapters });
    const body = send();
    const first = await request(app).post('/api/ache/send').send(body);
    const replay = await request(app).post('/api/ache/send').send(body);
    const second = await request(app).post('/api/ache/send').send(send());
    expect(replay.body).toEqual(first.body);
    expect(second.status).toBe(429);
    expect(adapters.sendMessage).toHaveBeenCalledTimes(1);
  });

  it('rejects a concurrent send while one is in flight', async () => {
    let release!: (e: ProviderEvent) => void;
    const adapters = fakeAdapters({ sendMessage: vi.fn(() => new Promise<ProviderEvent>(r => { release = r; })) });
    const app = createApp({ env: { ...liveEnv, ACHE_SMS_FROM: '+15550002222', ACHE_DEMO_RECIPIENT_SMS: '+5511999990000' }, adapters });
    const pending = request(app).post('/api/ache/send').send(send()).then(r => r);
    await vi.waitFor(() => expect(adapters.sendMessage).toHaveBeenCalledTimes(1));
    const concurrent = await request(app).post('/api/ache/send').send(send({ channel: 'sms' }));
    expect(concurrent.status).toBe(429);
    release(event('queued'));
    expect((await pending).status).toBe(200);
  });

  it('turns provider failures into concise Portuguese without leaking provider text', async () => {
    const adapters = fakeAdapters({ sendMessage: vi.fn().mockRejectedValue(new ProviderError(63016, 400)) });
    const res = await request(createApp({ env: liveEnv, adapters })).post('/api/ache/send').send(send());
    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: 'Não foi possível enviar esta mensagem neste momento.', hint: expect.stringContaining('24 h'), errorCode: 63016 });
  });

  it('maps raw SDK errors without exposing their message', async () => {
    const client: TwilioLike = { messages: { create: vi.fn().mockRejectedValue(Object.assign(new Error('secret provider detail +5511999990000'), { code: 21211, status: 400 })), get: vi.fn() } };
    const res = await request(createApp({ env: liveEnv, adapters: createAdapters(liveEnv, { twilioClient: client }) })).post('/api/ache/send').send(send());
    expect(res.status).toBe(502);
    expect(JSON.stringify(res.body)).not.toContain('secret provider detail');
    expect(res.body.hint).toBe('Destino inválido para este canal.');
  });

  it('rejects external browser origins', async () => {
    const res = await request(createApp({ env: liveEnv, adapters: fakeAdapters() })).post('/api/ache/send').set('Origin', 'https://example.com').send(send());
    expect(res.status).toBe(403);
  });
});

describe('status polling', () => {
  it('reports only statuses returned by the provider and stops at a final status', async () => {
    let t = 0;
    const adapters = fakeAdapters({ fetchMessage: vi.fn().mockResolvedValueOnce(event('queued')).mockResolvedValueOnce(event('failed', { errorCode: 63016 })) });
    const app = createApp({ env: liveEnv, adapters, now: () => t });
    const { body } = await request(app).post('/api/ache/send').send(send());
    t += 3000;
    const unchanged = await request(app).get(`/api/ache/messages/${body.ref}`);
    expect(unchanged.body.events.map((e: ProviderEvent) => e.status)).toEqual(['queued']);
    t += 3000;
    const failed = await request(app).get(`/api/ache/messages/${body.ref}`);
    expect(failed.body.events.map((e: ProviderEvent) => e.status)).toEqual(['queued', 'failed']);
    expect(failed.body.final).toBe(true);
    expect(failed.body.hint).toContain('24 h');
    t += 3000;
    await request(app).get(`/api/ache/messages/${body.ref}`);
    expect(adapters.fetchMessage).toHaveBeenCalledTimes(2);
  });

  it('keeps the known history when the provider is unreachable', async () => {
    let t = 0;
    const adapters = fakeAdapters({ fetchMessage: vi.fn().mockRejectedValue(new ProviderError(null, null)) });
    const app = createApp({ env: liveEnv, adapters, now: () => t });
    const { body } = await request(app).post('/api/ache/send').send(send());
    t += 3000;
    const res = await request(app).get(`/api/ache/messages/${body.ref}`);
    expect(res.body).toMatchObject({ final: false, unavailable: true });
    expect(res.body.events).toHaveLength(1);
  });

  it('reset forgets tracked sends but keeps the cooldown', async () => {
    const adapters = fakeAdapters();
    const app = createApp({ env: liveEnv, adapters });
    const { body } = await request(app).post('/api/ache/send').send(send());
    await request(app).post('/api/ache/reset');
    expect((await request(app).get(`/api/ache/messages/${body.ref}`)).status).toBe(404);
    expect((await request(app).post('/api/ache/send').send(send())).status).toBe(429);
  });
});

describe('email adapter', () => {
  const mailEnv = { SENDGRID_API_KEY: 'SG.test-only', ACHE_EMAIL_FROM: 'demo@example.com', ACHE_DEMO_RECIPIENT_EMAIL: 'dest@example.com', ACHE_LIVE_ENABLED: 'true' } as NodeJS.ProcessEnv;

  it('reports SendGrid acceptance, not delivery, from the real response headers', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 202, headers: { 'x-message-id': 'sg-123', date: 'Mon, 28 Sep 2026 13:00:00 GMT' } }));
    const res = await request(createApp({ env: mailEnv, adapters: createAdapters(mailEnv, { fetcher }) })).post('/api/ache/send').send(send({ channel: 'email' }));
    expect(res.status).toBe(200);
    expect(res.body.events[0]).toMatchObject({ provider: 'Twilio SendGrid', id: 'sg-123', status: 'accepted' });
    expect(res.body.final).toBe(true);
    const [, init] = fetcher.mock.calls[0];
    expect(JSON.parse(init.body).subject).toBe('Atualização sobre sua solicitação Aché');
  });

  it('fails cleanly when SendGrid rejects the request', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"errors":[{"message":"secret"}]}', { status: 401 }));
    const res = await request(createApp({ env: mailEnv, adapters: createAdapters(mailEnv, { fetcher }) })).post('/api/ache/send').send(send({ channel: 'email' }));
    expect(res.status).toBe(502);
    expect(res.body.hint).toBe('Credenciais do provedor não aceitas.');
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
