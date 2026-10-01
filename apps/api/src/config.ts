import twilio from 'twilio';
import { DemoError } from './errors.js';

export function loadTwilio(e: NodeJS.ProcessEnv = process.env) {
  const accountSid = e.TWILIO_ACCOUNT_SID;
  if (!accountSid || !/^AC[0-9a-f]{32}$/i.test(accountSid)) {
    return { problem: 'Configure TWILIO_ACCOUNT_SID no ambiente do backend.' };
  }
  if (e.EXPECTED_TWILIO_ACCOUNT_SID && e.EXPECTED_TWILIO_ACCOUNT_SID !== accountSid) {
    return { problem: 'A conta Twilio não corresponde à conta esperada. Revise a configuração.' };
  }
  const key = e.TWILIO_API_KEY_SID;
  const secret = e.TWILIO_API_KEY_SECRET;
  const authMode = e.TWILIO_AUTH_MODE || 'auth-token';
  if (authMode !== 'auth-token' && authMode !== 'api-key') return { problem: 'TWILIO_AUTH_MODE deve ser auth-token ou api-key.' };
  if (authMode === 'api-key' && (!key || !secret)) {
    return { problem: 'Complete TWILIO_API_KEY_SID e TWILIO_API_KEY_SECRET no backend.' };
  }
  if (authMode === 'auth-token' && !e.TWILIO_AUTH_TOKEN) return { problem: 'Configure TWILIO_AUTH_TOKEN para o modo auth-token. Não há fallback automático para API Key.' };
  return {
    client: twilio(authMode === 'api-key' ? key : accountSid, authMode === 'api-key' ? secret : e.TWILIO_AUTH_TOKEN, {
      accountSid, autoRetry: false, timeout: 15_000, logLevel: 'silent',
    }),
    authMode,
    accountSid,
    serviceSid: e.TWILIO_VERIFY_SERVICE_SID,
  };
}

export async function validateTwilioContext(config: ReturnType<typeof loadTwilio>) {
  if (!config.client) throw new DemoError(503, config.problem || 'Configuração Twilio inválida.');
  const { client, accountSid, authMode, serviceSid } = config;
  const mismatch = () => new DemoError(503, 'Inicialização bloqueada: as credenciais ou o Verify Service pertencem a outra conta. Revise TWILIO_AUTH_MODE e TWILIO_ACCOUNT_SID.');
  if (authMode === 'auth-token') {
    const account = await client.api.v2010.accounts(accountSid).fetch();
    if (account.sid !== accountSid) throw mismatch();
  }
  if (serviceSid) {
    if (!/^VA[0-9a-f]{32}$/i.test(serviceSid)) throw new DemoError(503, 'TWILIO_VERIFY_SERVICE_SID inválido.');
    const service = await client.verify.v2.services(serviceSid).fetch();
    if (service.accountSid !== accountSid) throw mismatch();
    return { authMode, accountSid, serviceSid: service.sid, serviceName: service.friendlyName };
  }
  // Standard API Keys cannot fetch Accounts. Verify resource ownership proves the effective context.
  if (authMode === 'api-key') {
    const page = await client.verify.v2.services.page({ pageSize: 1 });
    if (!page.instances.length) throw new DemoError(503, 'Não foi possível validar a conta da API Key: selecione um Verify Service ou use auth-token.');
    if (page.instances.some(s => s.accountSid !== accountSid)) throw mismatch();
  }
  return { authMode, accountSid };
}
