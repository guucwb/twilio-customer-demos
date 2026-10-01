import { describe, expect, it, vi } from 'vitest';
import { loadTwilio, validateTwilioContext } from './config.js';
import type { Twilio } from 'twilio';

const accountSid = 'AC' + '1'.repeat(32);
const serviceSid = 'VA' + '2'.repeat(32);
const env = { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: 'test-only-token', TWILIO_API_KEY_SID: 'SK' + '3'.repeat(32), TWILIO_API_KEY_SECRET: 'test-only-key-secret', TWILIO_VERIFY_SERVICE_SID: serviceSid };

describe('explicit credential selection and startup identity validation', () => {
  it('defaults to Account SID/Auth Token even when stale API Keys exist', () => {
    const config = loadTwilio(env);
    expect(config.authMode).toBe('auth-token');
    expect(config.client?.username).toBe(accountSid);
    expect(config.client?.password === env.TWILIO_AUTH_TOKEN).toBe(true);
  });
  it('requires intentional API Key selection and both fields', () => {
    expect(loadTwilio({ ...env, TWILIO_AUTH_MODE: 'api-key' }).authMode).toBe('api-key');
    expect(loadTwilio({ ...env, TWILIO_AUTH_MODE: 'api-key', TWILIO_API_KEY_SECRET: '' }).client).toBeUndefined();
    expect(loadTwilio({ ...env, TWILIO_AUTH_MODE: 'unknown' }).client).toBeUndefined();
  });
  it('never falls back to API Key when the token is missing', () => {
    expect(loadTwilio({ ...env, TWILIO_AUTH_TOKEN: '' }).client).toBeUndefined();
    expect(loadTwilio({ ...env, TWILIO_API_KEY_SECRET: '' }).authMode).toBe('auth-token');
  });
  it('checks account and configured Verify ownership before startup', async () => {
    const config = loadTwilio(env);
    const account = vi.fn().mockResolvedValue({ sid: accountSid });
    const fetchService = vi.fn().mockResolvedValue({ accountSid, sid: serviceSid, friendlyName: 'Fixture' });
    config.client = { api: { v2010: { accounts: () => ({ fetch: account }) } }, verify: { v2: { services: () => ({ fetch: fetchService }) } } } as unknown as Twilio;
    expect(await validateTwilioContext(config)).toEqual({ authMode: 'auth-token', accountSid, serviceSid, serviceName: 'Fixture' });
    fetchService.mockResolvedValue({ accountSid: 'AC' + '9'.repeat(32) });
    await expect(validateTwilioContext(config)).rejects.toThrow('outra conta');
    account.mockRejectedValue({ code: 20003 });
    await expect(validateTwilioContext(config)).rejects.toEqual({ code: 20003 });
  });
  it('rejects API Keys bound to another account without using Accounts permissions', async () => {
    const config = loadTwilio({ ...env, TWILIO_AUTH_MODE: 'api-key' });
    const fetchService = vi.fn().mockResolvedValue({ accountSid: 'AC' + '9'.repeat(32) });
    config.client = { verify: { v2: { services: () => ({ fetch: fetchService }) } } } as unknown as Twilio;
    await expect(validateTwilioContext(config)).rejects.toThrow('outra conta');
    fetchService.mockResolvedValue({ accountSid, sid: serviceSid, friendlyName: 'Fixture' });
    expect((await validateTwilioContext(config)).accountSid).toBe(accountSid);
  });
});
