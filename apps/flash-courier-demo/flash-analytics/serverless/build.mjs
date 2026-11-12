// Bundles one Twilio Function per route from src/handler.ts (no runtime npm deps).
// Also copies the private assets (queue map + RBAC) from git-ignored local config files.
import { build } from 'esbuild';
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const routes = {
  'api/analytics/me': '/api/analytics/me',
  'api/analytics/queues': '/api/analytics/queues',
  'api/analytics/agents': '/api/analytics/agents',
  'api/analytics/history': '/api/analytics/history',
  'api/analytics/history/export.csv': '/api/analytics/history/export.csv',
};

rmSync(join(here, 'functions'), { recursive: true, force: true });
for (const [file, route] of Object.entries(routes)) {
  const entry = join(here, '.entry.ts');
  writeFileSync(entry, `import { makeHandler } from './src/handler';\nexport const handler = makeHandler(${JSON.stringify(route)});\n`);
  const out = join(here, 'functions', `${file}.js`);
  mkdirSync(dirname(out), { recursive: true });
  await build({ entryPoints: [entry], bundle: true, platform: 'node', target: 'node20', format: 'cjs', outfile: out, logLevel: 'warning' });
  rmSync(entry);
  console.log('function', route);
}

const cfg = join(here, '..', 'analytics-backend', 'config');
mkdirSync(join(here, 'assets'), { recursive: true });
for (const [src, dst] of [
  ['queue-map.local.json', 'queue-map.private.json'],
  ['rbac.local.json', 'rbac.private.json'],
]) {
  if (!existsSync(join(cfg, src))) throw new Error(`missing ${src} in analytics-backend/config (git-ignored local file)`);
  copyFileSync(join(cfg, src), join(here, 'assets', dst));
  console.log('private asset', dst);
}
