import twilio from 'twilio';
import type { ChannelId } from '../shared/journey';
import type { ProviderEvent } from '../shared/events';
import { twilioCredentials } from './capabilities';

// Provider adapters. Every value returned here came from a provider response; nothing is synthesized.

export type { ProviderEvent, ProviderName } from '../shared/events';

export class ProviderError extends Error {
  constructor(public readonly code: number | null, public readonly httpStatus: number | null) {
    super('provider-error');
  }
}

type TwilioMessage = { sid: string; status: string; errorCode: number | null; dateUpdated: Date | null; dateCreated: Date | null; from?: string | null };

export type TwilioLike = {
  messages: {
    create(params: { from: string; to: string; body: string }): Promise<TwilioMessage>;
    get(sid: string): { fetch(): Promise<TwilioMessage> };
  };
};

export type Adapters = {
  sendMessage(channel: 'whatsapp' | 'sms', from: string, to: string, body: string): Promise<ProviderEvent>;
  fetchMessage(channel: 'whatsapp' | 'sms', sid: string): Promise<ProviderEvent>;
  sendEmail(params: { from: string; to: string; subject: string; text: string; html: string }): Promise<ProviderEvent>;
};

export function createAdapters(e: NodeJS.ProcessEnv, deps: { twilioClient?: TwilioLike; fetcher?: typeof fetch } = {}): Adapters {
  let client: TwilioLike | undefined = deps.twilioClient;
  const getClient = () => {
    if (client) return client;
    const creds = twilioCredentials(e);
    if (!creds) throw new ProviderError(null, null);
    client = twilio(creds.accountSid, creds.authToken, { accountSid: creds.accountSid, autoRetry: false, timeout: 15_000, logLevel: 'silent' }) as unknown as TwilioLike;
    return client;
  };
  const address = (channel: 'whatsapp' | 'sms', v: string) => (channel === 'whatsapp' ? `whatsapp:${v.replace(/^whatsapp:/, '')}` : v);
  const fromTwilio = (channel: ChannelId, m: TwilioMessage): ProviderEvent => ({
    provider: 'Twilio',
    id: m.sid,
    status: m.status,
    errorCode: m.errorCode ?? null,
    providerTime: (m.dateUpdated ?? m.dateCreated)?.toISOString() ?? null,
    observedAt: new Date().toISOString(),
    requestedChannel: channel,
    actualChannel: m.from ? (m.from.startsWith('whatsapp:') ? 'whatsapp' : 'sms') : null,
  });
  const wrap = async <T>(fn: () => Promise<T>) => {
    try {
      return await fn();
    } catch (err) {
      if (err instanceof ProviderError) throw err;
      const x = err as { code?: number; status?: number };
      throw new ProviderError(typeof x.code === 'number' ? x.code : null, typeof x.status === 'number' ? x.status : null);
    }
  };

  return {
    // The same adapter serves WhatsApp and SMS: only the address format changes, never the business logic.
    sendMessage: (channel, from, to, body) =>
      wrap(async () => fromTwilio(channel, await getClient().messages.create({ from: address(channel, from), to: address(channel, to), body }))),
    fetchMessage: (channel, sid) => wrap(async () => fromTwilio(channel, await getClient().messages.get(sid).fetch())),
    sendEmail: ({ from, to, subject, text, html }) =>
      wrap(async () => {
        const res = await (deps.fetcher ?? fetch)('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          signal: AbortSignal.timeout(10_000),
          headers: { Authorization: `Bearer ${e.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: from, name: 'Aché Communication Hub (demo)' },
            subject,
            content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }],
            tracking_settings: { click_tracking: { enable: false } },
          }),
        });
        if (res.status !== 202) throw new ProviderError(null, res.status);
        const id = res.headers.get('x-message-id');
        if (!id) throw new ProviderError(null, res.status);
        const date = res.headers.get('date');
        return {
          provider: 'Twilio SendGrid',
          id,
          status: 'accepted',
          errorCode: null,
          providerTime: date ? new Date(date).toISOString() : null,
          observedAt: new Date().toISOString(),
          requestedChannel: 'email',
          actualChannel: 'email',
        } satisfies ProviderEvent;
      }),
  };
}

/** Presenter-safe hint for a provider error code. Never includes provider message text. */
export function presenterHint(code: number | null, httpStatus: number | null = null): string {
  switch (code) {
    case 63016: return 'Fora da janela de 24 h do WhatsApp. Envie uma mensagem ao remetente a partir do número de teste e tente novamente.';
    case 21211: case 21614: case 63003: return 'Destino inválido para este canal.';
    case 21608: case 21610: case 63024: return 'Destino não autorizado a receber mensagens deste remetente.';
    case 63007: return 'Remetente WhatsApp não encontrado nesta conta.';
    case 21606: case 21661: return 'O remetente configurado não suporta este canal.';
    case 21408: return 'Permissão geográfica não habilitada para este destino.';
    case 20003: return 'Credenciais do provedor não aceitas.';
    case 30003: case 30005: return 'Aparelho de destino indisponível ou número inexistente.';
    case 30007: return 'Mensagem filtrada pela operadora.';
    case 63032: case 63049: return 'Mensagem não entregue por política do WhatsApp.';
  }
  if (httpStatus === 401 || httpStatus === 403) return 'Credenciais do provedor não aceitas.';
  if (httpStatus && httpStatus >= 400 && httpStatus < 500) return 'O provedor recusou a solicitação.';
  return 'Provedor indisponível ou sem conexão.';
}

/** Twilio statuses after which polling stops. WhatsApp can still move from delivered to read. */
export function isFinalTwilioStatus(channel: 'whatsapp' | 'sms', status: string) {
  if (['undelivered', 'failed', 'canceled', 'read'].includes(status)) return true;
  return channel === 'sms' && status === 'delivered';
}
