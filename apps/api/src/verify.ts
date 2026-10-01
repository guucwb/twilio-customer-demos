import type { Twilio } from 'twilio';
import { DemoError, safeError } from './errors.js';

export type Channel = 'whatsapp' | 'sms' | 'call';
export interface Capabilities {
  ready: boolean;
  message: string;
  serviceSid?: string;
  channels: Record<Channel, { enabled: boolean; detail: string }>;
  totp: { enabled: boolean; detail: string };
  passkeys: { enabled: false; detail: string };
}
export interface VerifyGateway {
  capabilities(): Promise<Capabilities>;
  start(phone: string, channel: Channel): Promise<{ sid: string; status: string }>;
  check(sid: string, code: string): Promise<{ sid: string; status: string }>;
  enroll(identity: string): Promise<{ sid: string; status: string; uri: string }>;
  activate(identity: string, sid: string, code: string): Promise<{ sid: string; status: string }>;
  challenge(identity: string, sid: string, code: string): Promise<{ sid: string; status: string }>;
}

export function unavailable(message: string): Capabilities {
  return {
    ready: false, message,
    channels: {
      whatsapp: { enabled: false, detail: 'Aguardando configuração do Verify.' },
      sms: { enabled: false, detail: 'Aguardando configuração do Verify.' },
      call: { enabled: false, detail: 'Disponibilidade de voz não confirmada neste ambiente.' },
    },
    totp: { enabled: false, detail: 'Aguardando configuração do Verify.' },
    passkeys: { enabled: false, detail: 'Indisponível nesta demo: provisionamento do Twilio Verify Passkeys não confirmado.' },
  };
}

export class TwilioVerify implements VerifyGateway {
  private cached?: { at: number; value: Capabilities };
  constructor(private client?: Twilio, private sid?: string, private problem?: string) {}

  private service() {
    if (!this.client || !this.sid || !/^VA[0-9a-f]{32}$/i.test(this.sid)) {
      throw new DemoError(503, this.problem || 'Configure TWILIO_VERIFY_SERVICE_SID no backend. Nenhum serviço é selecionado automaticamente.');
    }
    return this.client.verify.v2.services(this.sid);
  }

  async capabilities(): Promise<Capabilities> {
    if (this.cached && Date.now() - this.cached.at < 30_000) return this.cached.value;
    try {
      const service = await this.service().fetch();
      const ready = service.codeLength === 6;
      const whatsapp = service.whatsapp as { msg_service_sid?: string } | null;
      const value = unavailable('');
      value.ready = ready;
      value.serviceSid = service.sid;
      value.message = ready ? 'Verify Service conectado. A disponibilidade de entrega será confirmada em cada tentativa.' : 'Este serviço não usa códigos de 6 dígitos. Configure Code Length = 6 no Console ou selecione outro serviço.';
      value.channels.sms = { enabled: ready, detail: 'Disponível para tentativa via Verify; entrega depende da conta, destino e permissões geográficas.' };
      value.channels.whatsapp = { enabled: ready && Boolean(whatsapp?.msg_service_sid), detail: whatsapp?.msg_service_sid ? 'Configuração de remetente encontrada. Disponibilidade será confirmada no envio.' : 'WhatsApp indisponível: configure um remetente no Verify Service. Você pode usar SMS.' };
      // Service metadata has no authoritative voice-enabled flag. Do not infer it from TTS/DTMF settings.
      value.totp = { enabled: ready, detail: 'Fluxo Verify TOTP integrado; acesso será confirmado ao cadastrar o autenticador.' };
      this.cached = { at: Date.now(), value };
      return value;
    } catch (error) {
      const value = unavailable(safeError(error).message);
      this.cached = { at: Date.now(), value };
      return value;
    }
  }

  async start(phone: string, channel: Channel) {
    const caps = await this.capabilities();
    if (!caps.channels[channel].enabled) throw new DemoError(503, caps.ready ? caps.channels[channel].detail : caps.message);
    const v = await this.service().verifications.create({ to: phone, channel, locale: channel === 'whatsapp' ? 'en' : 'pt-BR' });
    return { sid: v.sid, status: v.status };
  }
  async check(sid: string, code: string) {
    const v = await this.service().verificationChecks.create({ verificationSid: sid, code });
    return { sid: v.sid, status: v.status };
  }
  async enroll(identity: string) {
    const f = await this.service().entities(identity).newFactors.create({
      factorType: 'totp', friendlyName: 'CarePlus Demo',
      'config.codeLength': 6, 'config.timeStep': 30,
    });
    const binding = f.binding as { uri?: string };
    if (!binding?.uri?.startsWith('otpauth://totp/')) throw new DemoError(502, 'A Twilio não retornou os dados para configurar o autenticador. Tente novamente.');
    return { sid: f.sid, status: f.status, uri: binding.uri };
  }
  async activate(identity: string, sid: string, code: string) {
    const f = await this.service().entities(identity).factors(sid).update({ authPayload: code });
    return { sid: f.sid, status: f.status };
  }
  async challenge(identity: string, sid: string, code: string) {
    const c = await this.service().entities(identity).challenges.create({ factorSid: sid, authPayload: code });
    return { sid: c.sid, status: c.status };
  }
}
