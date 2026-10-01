import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';
import { resolveReadiness } from './capabilities';

// Loads the shared root .env inside this server process only. No value is printed or bundled.
dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)), quiet: true });

const readiness = resolveReadiness(process.env);
const summary = Object.entries(readiness.channels).map(([channel, r]) => `${channel}=${r.status}`).join(' ');
createApp({ staticDir: fileURLToPath(new URL('../dist', import.meta.url)) }).listen(3003, '127.0.0.1', () =>
  console.info(`Aché API + built demo: http://127.0.0.1:3003 · ${summary} · live=${readiness.liveEnabled}`),
);
