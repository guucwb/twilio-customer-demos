import express, { type ErrorRequestHandler } from 'express';
import helmet from 'helmet';
import { randomBytes, randomUUID, createHmac } from 'node:crypto';
import QRCode from 'qrcode';
import { z } from 'zod';
import { DemoError, providerCode, safeError } from './errors.js';
import type { Channel, VerifyGateway } from './verify.js';

type Activity = { id: string; timestamp: string; method: string; operation: string; status: string; latency: number; sid?: string; errorCode?: number; source: 'Twilio' | 'Demo' };
type Factor = { identity: string; sid?: string; verified: boolean; pendingUri?: string; pendingUntil?: number };
type Session = {
  expires: number; csrf: string; authenticated: boolean; busy: boolean;
  phone?: string; channel?: Channel; verificationSid?: string; sentAt?: number;
  factor?: Factor; stepUpUntil?: number; lastAttempt?: number; events: Activity[];
  reimbursement: string;
};
const codeSchema = z.object({ code: z.string().regex(/^\d{6}$/, 'Informe os 6 dígitos do código.') });
const startSchema = z.object({ phone: z.string().regex(/^\+55[1-9]{2}9\d{8}$/, 'Use um celular brasileiro no formato +5511999999999.'), channel: z.enum(['whatsapp', 'sms', 'call']) });
const SESSION_MS = 30 * 60_000;

export function createApp(gateway: VerifyGateway, now: () => number = Date.now) {
  const app = express();
  const sessions = new Map<string, Session>();
  const factors = new Map<string, Factor>();
  const phoneLimits = new Map<string, { at: number; count: number }>();
  const hashKey = randomBytes(32);
  const phoneKey = (phone: string) => createHmac('sha256', hashKey).update(phone).digest('hex');
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
  app.use(express.json({ limit: '4kb' }));
  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'demo' }));
  app.get('/api/capabilities', async (_req, res) => res.json(await gateway.capabilities()));

  function issue(res: express.Response): Session {
    const id = randomBytes(32).toString('hex');
    const s: Session = { expires: now() + SESSION_MS, csrf: randomBytes(24).toString('hex'), authenticated: false, busy: false, events: [], reimbursement: 'Conta demonstração •••• 2048' };
    sessions.set(id, s);
    res.cookie('careplus_session', id, { httpOnly: true, sameSite: 'strict', path: '/api', maxAge: SESSION_MS });
    return s;
  }
  app.use('/api', (req, res, next) => {
    for (const [key, s] of sessions) if (s.expires < now()) sessions.delete(key);
    for (const f of factors.values()) if (f.pendingUntil && f.pendingUntil < now()) f.pendingUri = undefined;
    const id = req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith('careplus_session='))?.slice('careplus_session='.length);
    let s = id ? sessions.get(id) : undefined;
    if (!s && req.method !== 'GET') return next(new DemoError(401, 'Sua sessão expirou. Atualize a página para continuar.'));
    if (!s) {
      if (sessions.size >= 200) return next(new DemoError(429, 'Muitas sessões abertas. Aguarde alguns minutos.'));
      s = issue(res);
    }
    res.locals.session = s;
    res.locals.sessionId = id;
    if (req.method !== 'GET') {
      const origin = req.get('origin');
      if (origin && !['http://127.0.0.1:5173', 'http://localhost:5173', 'http://127.0.0.1:3001'].includes(origin)) return next(new DemoError(403, 'Origem não permitida.'));
      if (req.get('x-demo-csrf') !== s.csrf) return next(new DemoError(403, 'Sessão inválida. Atualize a página.'));
      if (s.busy) return next(new DemoError(409, 'Há uma solicitação em andamento. Aguarde.'));
      s.busy = true;
      res.on('finish', () => { s.busy = false; });
    }
    next();
  });
  const session = (res: express.Response): Session => res.locals.session;
  function requireLogin(s: Session) {
    if (!s.authenticated) throw new DemoError(401, 'Entre no portal antes de continuar.');
  }
  function throttle(s: Session) {
    if (s.lastAttempt && now() - s.lastAttempt < 1500) throw new DemoError(429, 'Aguarde um instante antes de tentar novamente.');
    s.lastAttempt = now();
  }
  async function track<T extends { sid: string; status: string }>(s: Session, method: string, operation: string, action: () => Promise<T>): Promise<T> {
    const start = now();
    let event: Activity;
    try {
      const result = await action();
      event = { id: randomUUID(), timestamp: new Date(start).toISOString(), method, operation, status: result.status, sid: result.sid, latency: now() - start, source: 'Twilio' };
      s.events.unshift(event);
      return result;
    } catch (error) {
      event = { id: randomUUID(), timestamp: new Date(start).toISOString(), method, operation, status: 'erro', latency: now() - start, errorCode: providerCode(error), source: providerCode(error) ? 'Twilio' : 'Demo' };
      s.events.unshift(event);
      throw error;
    } finally { s.events.splice(100); }
  }
  app.get('/api/session', (_req, res) => {
    const s = session(res);
    res.json({ csrf: s.csrf, authenticated: s.authenticated, pendingOtp: Boolean(s.verificationSid && !s.authenticated), channel: s.channel,
      maskedPhone: s.phone ? `+55 •• ••••• ${s.phone.slice(-4)}` : undefined,
      totpVerified: Boolean(s.factor?.verified), totpPending: Boolean(s.factor?.pendingUri && s.factor.pendingUntil! > now()),
      stepUp: Boolean(s.stepUpUntil && s.stepUpUntil > now()), retryAfter: s.sentAt ? Math.max(0, Math.ceil((30_000 - now() + s.sentAt) / 1000)) : 0, events: s.events,
      ...(s.authenticated ? { beneficiary: { name: 'Marina Oliveira', plan: 'CarePlus Executivo', memberId: 'DEMO 0000 2048', reimbursement: s.reimbursement } } : {}),
    });
  });
  app.post(['/api/otp/start', '/api/otp/resend'], async (req, res) => {
    const s = session(res);
    if (s.authenticated) throw new DemoError(409, 'Você já está autenticado. Resete a demo para outro acesso.');
    const { phone, channel } = startSchema.parse(req.path.endsWith('/resend') ? { phone: s.phone, channel: req.body.channel } : req.body);
    const key = phoneKey(phone);
    const last = phoneLimits.get(key);
    if (s.sentAt && now() - s.sentAt < 30_000 || last && now() - last.at < 30_000) throw new DemoError(429, 'Aguarde 30 segundos entre os envios.');
    if (last && last.count >= 10 && now() - last.at < 10 * 60_000) throw new DemoError(429, 'Limite local de envios atingido. Aguarde 10 minutos.');
    if (phoneLimits.size > 1000) phoneLimits.clear();
    phoneLimits.set(key, { at: now(), count: last && now() - last.at < 10 * 60_000 ? last.count + 1 : 1 });
    s.sentAt = now();
    // Preserve a pending code on fallback failure, but never retain another phone's code.
    if (s.phone !== phone) { s.verificationSid = undefined; s.phone = phone; s.channel = channel; }
    const result = await track(s, channel, 'Solicitar código', () => gateway.start(phone, channel));
    if (result.status !== 'pending') throw new DemoError(502, 'O Verify não iniciou uma verificação pendente. Solicite um novo código.');
    s.verificationSid = result.sid; s.channel = channel;
    res.json({ ok: true });
  });
  app.post('/api/otp/check', async (req, res) => {
    const s = session(res);
    const { code } = codeSchema.parse(req.body);
    if (!s.verificationSid || !s.phone || s.authenticated) throw new DemoError(409, 'Solicite um código antes de validar.');
    throttle(s);
    const result = await track(s, s.channel!, 'Validar código', () => gateway.check(s.verificationSid!, code));
    if (result.status !== 'approved') throw new DemoError(400, 'Código não aprovado. Confira os dígitos ou solicite outro código.');
    const key = phoneKey(s.phone);
    let factor = factors.get(key);
    if (!factor) { factor = { identity: `careplus-demo-${randomUUID()}`, verified: false }; factors.set(key, factor); }
    s.factor = factor; s.authenticated = true; s.verificationSid = undefined;
    // Rotate the session identifier after authentication.
    sessions.delete(res.locals.sessionId);
    const fresh = issue(res);
    Object.assign(fresh, s, { csrf: fresh.csrf, expires: fresh.expires, busy: false });
    res.json({ ok: true });
  });
  app.post('/api/totp/enroll', async (_req, res) => {
    const s = session(res); requireLogin(s); throttle(s);
    const f = s.factor!;
    if (f.verified) throw new DemoError(409, 'Este autenticador já está ativo. Use o código para confirmar a operação.');
    if (!f.pendingUri || !f.pendingUntil || f.pendingUntil < now()) {
      const result = await track(s, 'totp', 'Cadastrar autenticador', () => gateway.enroll(f.identity));
      f.sid = result.sid; f.pendingUri = result.uri; f.pendingUntil = now() + 10 * 60_000;
    }
    // Enrollment URI/seed is never logged or included in audit. QR is generated locally.
    const qr = await QRCode.toDataURL(f.pendingUri, { width: 240, margin: 2, errorCorrectionLevel: 'M' });
    res.json({ qr });
  });
  app.post('/api/totp/activate', async (req, res) => {
    const s = session(res); requireLogin(s);
    const { code } = codeSchema.parse(req.body); throttle(s);
    const f = s.factor!;
    if (!f.sid || !f.pendingUri || !f.pendingUntil || f.pendingUntil < now()) throw new DemoError(409, 'A configuração expirou. Cadastre o autenticador novamente.');
    let result;
    try { result = await track(s, 'totp', 'Ativar autenticador', () => gateway.activate(f.identity, f.sid!, code)); }
    catch (error) {
      if ([20404, 60310, 60390, 60392].includes(providerCode(error) || 0)) { f.pendingUri = undefined; f.sid = undefined; }
      throw error;
    }
    if (result.status !== 'verified') throw new DemoError(400, 'Código não aprovado. Confira o código atual no aplicativo autenticador.');
    f.verified = true; f.pendingUri = undefined; f.pendingUntil = undefined;
    // Enrollment is not a step-up grant; a separate Challenge is required.
    res.json({ ok: true });
  });
  app.post('/api/totp/challenge', async (req, res) => {
    const s = session(res); requireLogin(s);
    const { code } = codeSchema.parse(req.body); throttle(s);
    const f = s.factor!;
    if (!f.verified || !f.sid) throw new DemoError(409, 'Configure e ative o autenticador primeiro.');
    let result;
    try { result = await track(s, 'totp', 'Confirmar operação', () => gateway.challenge(f.identity, f.sid!, code)); }
    catch (error) {
      if ([20404, 60318, 60383, 60390, 60392].includes(providerCode(error) || 0)) { f.verified = false; f.sid = undefined; }
      throw error;
    }
    if (result.status !== 'approved') throw new DemoError(400, 'Código não aprovado. Aguarde o próximo código do autenticador e tente novamente.');
    s.stepUpUntil = now() + 2 * 60_000;
    res.json({ ok: true });
  });
  app.post('/api/reimbursement', (req, res) => {
    const s = session(res); requireLogin(s);
    if (!s.stepUpUntil || s.stepUpUntil <= now()) throw new DemoError(403, 'Confirme sua identidade com o autenticador antes de alterar os dados.');
    const { account } = z.object({ account: z.enum(['demo-2048', 'demo-4096']) }).parse(req.body);
    s.reimbursement = account === 'demo-2048' ? 'Conta demonstração •••• 2048' : 'Conta demonstração •••• 4096';
    s.stepUpUntil = undefined;
    s.events.unshift({ id: randomUUID(), timestamp: new Date(now()).toISOString(), method: 'sessão', operation: 'Alterar reembolso fictício', status: 'concluído', latency: 0, source: 'Demo' });
    res.json({ ok: true });
  });
  app.post('/api/reset', (_req, res) => {
    const s = session(res);
    if (s.factor && !s.factor.verified) s.factor.pendingUri = undefined;
    sessions.delete(res.locals.sessionId);
    issue(res);
    res.json({ ok: true });
  });
  app.use('/api', (_req, _res, next) => next(new DemoError(404, 'Operação não encontrada.')));
  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    void _next;
    if (error instanceof z.ZodError) { res.status(400).json({ error: error.issues[0]?.message || 'Dados inválidos.' }); return; }
    if (error instanceof SyntaxError) { res.status(400).json({ error: 'Solicitação inválida.' }); return; }
    const safe = safeError(error);
    res.status(safe.status).json({ error: safe.message, ...(safe.code ? { code: safe.code } : {}) });
  };
  app.use(errorHandler);
  return app;
}
