/** Prints a local demo token: npm run token -- sup.itau@demo.flash.invalid supervisor */
import { signDemoToken } from '../auth/demoTokens';

const [sub = 'sup.itau@demo.flash.invalid', role = 'supervisor'] = process.argv.slice(2);
const secret = process.env.DEMO_JWT_SECRET ?? '';
if (secret.length < 32) {
  console.error('DEMO_JWT_SECRET (>=32 chars) is required');
  process.exit(1);
}
console.log(signDemoToken({ sub, roles: [role] }, secret, 3600));
