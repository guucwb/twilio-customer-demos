import { describe, it, expect, vi } from 'vitest';
import type { Twilio } from 'twilio';
import { TwilioVerify } from './verify.js';

function sdkFixture(codeLength = 6, whatsapp = { msg_service_sid: 'MG-test' }) {
  const fetch = vi.fn().mockResolvedValue({ sid: 'VA' + '0'.repeat(32), codeLength, whatsapp });
  const start = vi.fn().mockResolvedValue({ sid: 'VE-test', status: 'pending' });
  const check = vi.fn().mockResolvedValue({ sid: 'VE-test', status: 'approved' });
  const enroll = vi.fn().mockResolvedValue({ sid: 'YF-test', status: 'unverified', binding: { uri: 'otpauth://totp/Fixture?secret=TEST' } });
  const activate = vi.fn().mockResolvedValue({ sid: 'YF-test', status: 'verified' });
  const challenge = vi.fn().mockResolvedValue({ sid: 'YC-test', status: 'approved' });
  const factors = vi.fn().mockReturnValue({ update: activate });
  const entities = vi.fn().mockReturnValue({ newFactors: { create: enroll }, factors, challenges: { create: challenge } });
  const services = vi.fn().mockReturnValue({ fetch, verifications: { create: start }, verificationChecks: { create: check }, entities });
  const client = { verify: { v2: { services } } } as unknown as Twilio;
  return { gateway: new TwilioVerify(client, 'VA' + '0'.repeat(32)), fetch, start, check, enroll, activate, challenge, entities, factors };
}

describe('Twilio SDK boundary', () => {
  it('uses the real Verify OTP resources and a server-selected Verification SID', async () => {
    const f = sdkFixture();
    await f.gateway.start('+5511999999999', 'whatsapp');
    expect(f.start).toHaveBeenCalledWith({ to: '+5511999999999', channel: 'whatsapp', locale: 'en' });
    await f.gateway.start('+5511999999999', 'sms');
    expect(f.start).toHaveBeenLastCalledWith({ to: '+5511999999999', channel: 'sms', locale: 'pt-BR' });
    await f.gateway.check('VE-test', '123456');
    expect(f.check).toHaveBeenCalledWith({ verificationSid: 'VE-test', code: '123456' });
  });
  it('uses newFactors, Factor update, and Challenge creation for the TOTP lifecycle', async () => {
    const f = sdkFixture();
    await f.gateway.enroll('opaque-identity');
    expect(f.enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'CarePlus Demo', 'config.codeLength': 6, 'config.timeStep': 30 });
    await f.gateway.activate('opaque-identity', 'YF-test', '123456');
    expect(f.factors).toHaveBeenCalledWith('YF-test');
    expect(f.activate).toHaveBeenCalledWith({ authPayload: '123456' });
    await f.gateway.challenge('opaque-identity', 'YF-test', '654321');
    expect(f.challenge).toHaveBeenCalledWith({ factorSid: 'YF-test', authPayload: '654321' });
  });
  it('does not infer voice, delivery, or Passkeys provisioning from service metadata', async () => {
    const f = sdkFixture();
    const caps = await f.gateway.capabilities();
    expect(caps.ready).toBe(true);
    expect(caps.channels.call.enabled).toBe(false);
    expect(caps.passkeys.enabled).toBe(false);
    await expect(f.gateway.start('+5511999999999', 'call')).rejects.toThrow();
    expect(f.start).not.toHaveBeenCalled();
  });
  it('blocks incompatible code length and missing WhatsApp configuration', async () => {
    const badLength = sdkFixture(4);
    expect((await badLength.gateway.capabilities()).ready).toBe(false);
    await expect(badLength.gateway.start('+5511999999999', 'sms')).rejects.toThrow();
    const noSender = sdkFixture(6, { msg_service_sid: '' });
    const caps = await noSender.gateway.capabilities();
    expect(caps.channels.whatsapp.enabled).toBe(false);
    expect(caps.channels.sms.enabled).toBe(true);
  });
  it('fails gracefully without credentials/service and never echoes raw provider errors', async () => {
    expect((await new TwilioVerify().capabilities()).ready).toBe(false);
    const f = sdkFixture();
    f.fetch.mockRejectedValue({ code: 20003, message: 'SECRET_TEST_SENTINEL' });
    const caps = await f.gateway.capabilities();
    expect(caps.ready).toBe(false);
    expect(JSON.stringify(caps)).not.toContain('SECRET_TEST_SENTINEL');
  });
});
