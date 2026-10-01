import './env.js';
import { loadTwilio, validateTwilioContext } from './config.js';
import { safeError } from './errors.js';

const config = loadTwilio();
if (!config.client) {
  console.log(JSON.stringify({ problem: config.problem }));
  process.exitCode = 1;
} else {
  try {
    await validateTwilioContext(config);
    const services = await config.client.verify.v2.services.list({ limit: 100 });
    if (services.some(s => s.accountSid !== config.accountSid)) throw new Error('Account mismatch');
    // Explicit allowlist only. Never serialize SDK objects, bindings, env or raw errors.
    console.log(JSON.stringify({
      authMode: config.authMode,
      configuredService: Boolean(config.serviceSid),
      services: services.map(s => ({
        sid: s.sid, friendlyName: s.friendlyName, codeLength: s.codeLength,
        whatsappSenderConfigured: Boolean(s.whatsapp?.msg_service_sid),
        totpConfigurationPresent: Boolean(s.totp),
        voiceAvailability: 'not-confirmed-by-service-metadata',
      })),
      truncated: services.length === 100,
    }, null, 2));
  } catch (error) {
    console.log(JSON.stringify({ error: safeError(error) }));
    process.exitCode = 1;
  }
}
