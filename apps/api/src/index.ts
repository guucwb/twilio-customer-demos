import './env.js';
import { createApp } from './app.js';
import { loadTwilio, validateTwilioContext } from './config.js';
import { TwilioVerify } from './verify.js';
import { safeError } from './errors.js';

const config = loadTwilio();
try {
  const context = await validateTwilioContext(config);
  console.log(JSON.stringify({ event: 'twilio-context-validated', ...context }));
  const gateway = new TwilioVerify(config.client, config.serviceSid, config.problem);
  createApp(gateway).listen(3001, '127.0.0.1', () => {
    console.log('CarePlus API: http://127.0.0.1:3001 (demo local; sem logs de payloads)');
  });
} catch (error) {
  console.error('CarePlus API não iniciada:', safeError(error).message);
  process.exitCode = 1;
}
