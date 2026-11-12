/**
 * Calls the RUNNING local backend with locally-signed demo tokens and prints the
 * real HTTP status codes. Requires AUTH_MODE=demo-hmac and the same DEMO_JWT_SECRET.
 *   npm run demo:cross-tenant
 */
import { signDemoToken } from '../auth/demoTokens';

const base = process.env.API_URL ?? 'http://127.0.0.1:8787';
const secret = process.env.DEMO_JWT_SECRET ?? '';
if (secret.length < 32) {
  console.error('DEMO_JWT_SECRET (>=32 chars) is required');
  process.exit(1);
}

const itau = signDemoToken({ sub: 'sup.itau@demo.flash.invalid', roles: ['supervisor'] }, secret);
const admin = signDemoToken({ sub: 'gestao@demo.flash.invalid', roles: ['admin'] }, secret);
const forged = signDemoToken({ sub: 'sup.itau@demo.flash.invalid', roles: ['supervisor'], banks: ['santander'] }, secret);
const unbound = signDemoToken({ sub: 'sem.vinculo@demo.flash.invalid', roles: ['supervisor'] }, secret);

const cases: Array<[string, string, string | null]> = [
  ['supervisor_itau → própria operação', '/api/analytics/queues?bankId=itau', itau],
  ['supervisor_itau → Santander', '/api/analytics/queues?bankId=santander', itau],
  ['supervisor_itau → export Santander', '/api/analytics/history/export.csv?bankId=santander', itau],
  ['supervisor_itau → drill-down CX_SANTANDER', '/api/analytics/queues/CX_SANTANDER', itau],
  ['supervisor_itau + claim forjado banks=[santander]', '/api/analytics/queues?bankId=santander', forged],
  ['supervisor_itau tenta queueSid na query', '/api/analytics/queues?queueSid=WQx', itau],
  ['usuário sem vínculo', '/api/analytics/queues', unbound],
  ['sem token', '/api/analytics/queues', null],
  ['flash_admin → consolidado', '/api/analytics/queues', admin],
];

for (const [label, path, token] of cases) {
  const res = await fetch(base + path, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const text = await res.text();
  let summary = text.slice(0, 120);
  try {
    const j = JSON.parse(text);
    summary = j.error ? JSON.stringify({ error: j.error }) : JSON.stringify({ scope: j.scope, queues: (j.queues ?? []).map((q: { queueKey: string }) => q.queueKey) });
  } catch {
    /* csv */
  }
  console.log(`${String(res.status).padEnd(4)} ${label.padEnd(48)} GET ${path}\n     ${summary}`);
}
