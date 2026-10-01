import express from 'express';
import helmet from 'helmet';
import { z } from 'zod';
import { emailMessage, smsMessage, TEST_NOTICE, whatsappMessage, type ChannelId } from '../shared/journey';
import { isE164, isEmail, resolveReadiness, stripWa } from './capabilities';
import { createAdapters, isFinalTwilioStatus, presenterHint, ProviderError, type Adapters, type ProviderEvent } from './providers';

type Options = { env?: NodeJS.ProcessEnv; adapters?: Adapters; staticDir?: string; cooldownMs?: number; now?: () => number };

type Tracked = { ref: string; channel: 'whatsapp' | 'sms' | 'email'; events: ProviderEvent[]; lastFetch: number; startedAt: number };

const ORIGINS = ['http://127.0.0.1:5175', 'http://localhost:5175', 'http://127.0.0.1:3003', 'http://localhost:3003'];
const POLL_WINDOW_MS = 5 * 60_000;
const UNAVAILABLE = 'Não foi possível enviar esta mensagem neste momento.';

const sendSchema = z.object({
  channel: z.enum(['whatsapp', 'sms', 'email', 'rcs']),
  requestId: z.string().uuid(),
  confirmed: z.literal(true),
  recipient: z.discriminatedUnion('mode', [z.object({ mode: z.literal('configured') }), z.object({ mode: z.literal('custom'), value: z.string().trim().max(254) })]),
});

export function createApp(options: Options = {}) {
  const env = options.env ?? process.env;
  const adapters = options.adapters ?? createAdapters(env);
  const cooldownMs = options.cooldownMs ?? 20_000;
  const now = options.now ?? Date.now;

  // In-memory only. Reset clears tracked messages; the cooldown deliberately survives reset.
  let tracked = new Map<string, Tracked>();
  let requests = new Map<string, { status: number; body: unknown }>();
  let inFlight = false;
  const lastAttempt: Partial<Record<ChannelId, number>> = {};

  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null, 'frame-src': ["'self'", 'about:'] } } }));
  app.use('/api/ache', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/ache', (req, res, next) => {
    const origin = req.get('origin');
    if (origin && !ORIGINS.includes(origin)) {
      res.status(403).json({ error: 'Origem não permitida.' });
      return;
    }
    next();
  });
  app.use(express.json({ limit: '8kb' }));

  app.get('/api/ache/health', (_req, res) => res.json({ ok: true, demo: 'ache' }));

  // Presenter-safe readiness: statuses, masked addresses and missing variable NAMES only.
  app.get('/api/ache/readiness', (_req, res) => res.json(resolveReadiness(env)));

  app.post('/api/ache/send', async (req, res) => {
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Confirme o destino antes de enviar.' });
      return;
    }
    const { channel, requestId, recipient } = parsed.data;
    const previous = requests.get(requestId);
    if (previous) {
      res.status(previous.status).json(previous.body);
      return;
    }
    // RCS has no send path by design. It is never forwarded to any provider.
    if (channel === 'rcs') {
      res.status(409).json({ error: 'RCS não está provisionado neste ambiente. Nenhum envio foi realizado.' });
      return;
    }
    const readiness = resolveReadiness(env);
    const cap = readiness.channels[channel];
    if (cap.status !== 'LIVE') {
      res.status(409).json({ error: 'Envio real indisponível neste ambiente. A demonstração continua normalmente.' });
      return;
    }
    const to = resolveRecipient(channel, recipient, readiness.customRecipient, env);
    if (!to) {
      res.status(400).json({ error: 'Destino inválido ou não autorizado para este teste.' });
      return;
    }
    if (inFlight) {
      res.status(429).json({ error: 'Um envio já está em andamento.' });
      return;
    }
    const wait = (lastAttempt[channel] ?? -Infinity) + cooldownMs - now();
    if (wait > 0) {
      res.status(429).json({ error: `Aguarde ${Math.ceil(wait / 1000)} s antes de um novo teste neste canal.` });
      return;
    }

    inFlight = true;
    lastAttempt[channel] = now();
    const finish = (status: number, body: unknown) => {
      requests.set(requestId, { status, body });
      res.status(status).json(body);
    };
    try {
      let event: ProviderEvent;
      if (channel === 'email') {
        const mail = emailMessage(undefined, { test: true });
        event = await adapters.sendEmail({ from: env.ACHE_EMAIL_FROM!, to, subject: mail.subject, text: mail.text, html: mail.html });
      } else {
        const body = `${channel === 'whatsapp' ? whatsappMessage().body : smsMessage().body}\n\n${TEST_NOTICE}`;
        const from = channel === 'whatsapp' ? stripWa(env.ACHE_WHATSAPP_FROM)! : env.ACHE_SMS_FROM!;
        event = await adapters.sendMessage(channel, from, to, body);
      }
      const ref = crypto.randomUUID();
      tracked.set(ref, { ref, channel, events: [event], lastFetch: now(), startedAt: now() });
      if (tracked.size > 25) tracked.delete(tracked.keys().next().value!);
      console.info(`[ache] live send channel=${channel} provider=${event.provider} id=${event.id} status=${event.status}`);
      finish(200, { ref, events: [event], final: channel === 'email' || isFinalTwilioStatus(channel, event.status) });
    } catch (err) {
      const code = err instanceof ProviderError ? err.code : null;
      const http = err instanceof ProviderError ? err.httpStatus : null;
      // Diagnostics stay in the server log: channel and codes only, never message text or recipient.
      console.warn(`[ache] live send failed channel=${channel} code=${code ?? '-'} http=${http ?? '-'}`);
      finish(502, { error: UNAVAILABLE, hint: presenterHint(code, http), errorCode: code });
    } finally {
      inFlight = false;
    }
  });

  // Status as reported by Twilio for a message this server sent. Nothing is inferred.
  app.get('/api/ache/messages/:ref', async (req, res) => {
    const item = tracked.get(req.params.ref);
    if (!item) {
      res.status(404).json({ error: 'Envio não encontrado.' });
      return;
    }
    const last = item.events.at(-1)!;
    const expired = now() - item.startedAt > POLL_WINDOW_MS;
    if (item.channel === 'email' || expired || isFinalTwilioStatus(item.channel, last.status) || now() - item.lastFetch < 2_000) {
      res.json({ events: item.events, final: item.channel === 'email' || expired || isFinalTwilioStatus(item.channel, last.status) });
      return;
    }
    item.lastFetch = now();
    try {
      const current = await adapters.fetchMessage(item.channel, last.id);
      if (current.status !== last.status || current.errorCode !== last.errorCode) item.events.push(current);
      const final = isFinalTwilioStatus(item.channel, current.status);
      res.json({ events: item.events, final, hint: current.errorCode ? presenterHint(current.errorCode) : undefined });
    } catch (err) {
      console.warn(`[ache] status check failed code=${err instanceof ProviderError ? err.code ?? '-' : '-'}`);
      res.json({ events: item.events, final: false, unavailable: true });
    }
  });

  app.post('/api/ache/reset', (_req, res) => {
    tracked = new Map();
    requests = new Map();
    res.json({ ok: true });
  });

  if (options.staticDir) app.use(express.static(options.staticDir));
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    void err;
    void _next;
    res.status(400).json({ error: 'Não foi possível processar a solicitação.' });
  });
  return app;
}

function resolveRecipient(channel: 'whatsapp' | 'sms' | 'email', recipient: { mode: 'configured' } | { mode: 'custom'; value: string }, allowCustom: boolean, env: NodeJS.ProcessEnv) {
  if (recipient.mode === 'custom' && !allowCustom) return null;
  const value =
    recipient.mode === 'custom'
      ? recipient.value
      : channel === 'whatsapp' ? stripWa(env.ACHE_DEMO_RECIPIENT_WHATSAPP) : channel === 'sms' ? env.ACHE_DEMO_RECIPIENT_SMS : env.ACHE_DEMO_RECIPIENT_EMAIL;
  if (!value) return null;
  const clean = channel === 'email' ? value : stripWa(value)!;
  return (channel === 'email' ? isEmail(clean) : isE164(clean)) ? clean : null;
}
