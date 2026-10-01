import type { Capability, ChannelId } from '../shared/journey';

// Channel readiness is decided here, on the server, from explicit Aché-specific variables only.
// Nothing is inferred from other demos' variables. No value is ever returned, only names and masks.

export type ChannelReadiness = {
  status: Capability;
  /** Adapter has everything it needs, even if ACHE_LIVE_ENABLED keeps it in DEMO. */
  configured: boolean;
  provider: 'Twilio' | 'Twilio SendGrid' | null;
  /** Presenter-facing explanation, Portuguese, no secrets. */
  note: string;
  missing: string[];
  sender?: string;
  recipient?: string;
  caveats: string[];
};

export type Readiness = { liveEnabled: boolean; customRecipient: boolean; channels: Record<ChannelId, ChannelReadiness> };

const E164 = /^\+[1-9]\d{7,14}$/;
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

export function twilioCredentials(e: NodeJS.ProcessEnv) {
  const sid = e.TWILIO_ACCOUNT_SID;
  if (!sid || !/^AC[0-9a-f]{32}$/i.test(sid) || !e.TWILIO_AUTH_TOKEN) return null;
  if (e.EXPECTED_TWILIO_ACCOUNT_SID && e.EXPECTED_TWILIO_ACCOUNT_SID !== sid) return null;
  return { accountSid: sid, authToken: e.TWILIO_AUTH_TOKEN };
}

export function resolveReadiness(e: NodeJS.ProcessEnv): Readiness {
  const liveEnabled = e.ACHE_LIVE_ENABLED === 'true';
  const customRecipient = e.ACHE_ALLOW_CUSTOM_RECIPIENT === 'true';
  const twilio = twilioCredentials(e) !== null;

  const decide = (configured: boolean, missing: string[]): Pick<ChannelReadiness, 'status' | 'configured' | 'missing'> => ({
    status: configured && liveEnabled ? 'LIVE' : 'DEMO',
    configured,
    missing: configured && !liveEnabled ? ['ACHE_LIVE_ENABLED=true'] : missing,
  });

  const waFrom = stripWa(e.ACHE_WHATSAPP_FROM);
  const waTo = stripWa(e.ACHE_DEMO_RECIPIENT_WHATSAPP);
  const waMissing = [
    ...(twilio ? [] : ['TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN']),
    ...(waFrom && E164.test(waFrom) ? [] : ['ACHE_WHATSAPP_FROM']),
    ...(waTo && E164.test(waTo) || customRecipient ? [] : ['ACHE_DEMO_RECIPIENT_WHATSAPP']),
  ];
  const wa = decide(waMissing.length === 0, waMissing);

  const smsFrom = e.ACHE_SMS_FROM;
  const smsTo = e.ACHE_DEMO_RECIPIENT_SMS;
  const smsMissing = [
    ...(twilio ? [] : ['TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN']),
    ...(smsFrom && E164.test(smsFrom) ? [] : ['ACHE_SMS_FROM']),
    ...(smsTo && E164.test(smsTo) || customRecipient ? [] : ['ACHE_DEMO_RECIPIENT_SMS']),
  ];
  const sms = decide(smsMissing.length === 0, smsMissing);

  const mailMissing = [
    ...(e.SENDGRID_API_KEY?.startsWith('SG.') ? [] : ['SENDGRID_API_KEY']),
    ...(e.ACHE_EMAIL_FROM && EMAIL.test(e.ACHE_EMAIL_FROM) ? [] : ['ACHE_EMAIL_FROM']),
    ...(e.ACHE_DEMO_RECIPIENT_EMAIL && EMAIL.test(e.ACHE_DEMO_RECIPIENT_EMAIL) || customRecipient ? [] : ['ACHE_DEMO_RECIPIENT_EMAIL']),
  ];
  const mail = decide(mailMissing.length === 0, mailMissing);

  const note = (r: { status: Capability; configured: boolean }, what: string) =>
    r.status === 'LIVE' ? `${what}: envio real disponível mediante confirmação.`
      : r.configured ? `${what}: adaptador configurado; envio real desativado (ACHE_LIVE_ENABLED=false).`
        : `${what}: modo demonstração. Nenhum envio externo.`;

  return {
    liveEnabled,
    customRecipient,
    channels: {
      whatsapp: {
        ...wa,
        provider: 'Twilio',
        note: note(wa, 'WhatsApp'),
        sender: waFrom && E164.test(waFrom) ? mask(waFrom) : undefined,
        recipient: waTo && E164.test(waTo) ? mask(waTo) : undefined,
        caveats: [
          'O perfil do remetente de teste não é da marca Aché.',
          'Mensagem livre exige janela de atendimento de 24 h aberta: o número de teste precisa ter enviado uma mensagem ao remetente.',
        ],
      },
      sms: {
        ...sms,
        provider: 'Twilio',
        note: sms.configured ? note(sms, 'SMS') : 'SMS: modo demonstração. Nenhum remetente SMS atribuído a esta demo.',
        sender: smsFrom && E164.test(smsFrom) ? mask(smsFrom) : undefined,
        recipient: smsTo && E164.test(smsTo) ? mask(smsTo) : undefined,
        caveats: [],
      },
      email: {
        ...mail,
        provider: 'Twilio SendGrid',
        note: mail.configured ? note(mail, 'Email') : 'Email: modo demonstração. SendGrid não configurado neste ambiente.',
        sender: e.ACHE_EMAIL_FROM && EMAIL.test(e.ACHE_EMAIL_FROM) ? maskEmail(e.ACHE_EMAIL_FROM) : undefined,
        recipient: e.ACHE_DEMO_RECIPIENT_EMAIL && EMAIL.test(e.ACHE_DEMO_RECIPIENT_EMAIL) ? maskEmail(e.ACHE_DEMO_RECIPIENT_EMAIL) : undefined,
        caveats: mail.configured ? ['A SendGrid confirma o aceite da mensagem; a entrega não é acompanhada nesta demonstração.'] : [],
      },
      rcs: {
        status: 'NOT_PROVISIONED',
        configured: false,
        provider: null,
        note: 'RCS não provisionado neste ambiente. Somente preview de experiência; não existe caminho de envio.',
        missing: [],
        caveats: [],
      },
    },
  };
}

export function stripWa(v?: string) {
  return v?.replace(/^whatsapp:/, '');
}

export function mask(phone: string) {
  return phone.slice(0, 3) + ' •••• ' + phone.slice(-4);
}

export function maskEmail(email: string) {
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}•••@${domain}`;
}

export const isE164 = (v: string) => E164.test(v);
export const isEmail = (v: string) => EMAIL.test(v);
