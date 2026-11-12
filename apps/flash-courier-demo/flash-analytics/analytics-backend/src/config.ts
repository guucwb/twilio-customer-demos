import { readFileSync } from 'node:fs';

import { DEMO_QUEUES, isBankId, type QueueDef } from './domain';

export interface BackendConfig {
  port: number;
  host: string;
  authMode: 'demo-hmac' | 'flex';
  demoJwtSecret?: string;
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioApiKey?: string;
  twilioApiSecret?: string;
  workspaceSid?: string;
  realtimeSource: 'mock' | 'taskrouter';
  historySource: 'mock' | 'insights-mart';
  martFile?: string;
  queueMapFile?: string;
  rbacFile?: string;
  corsOrigins: string[];
  cacheTtlMs: number;
  demoViewAs: boolean;
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): BackendConfig {
  const authMode = env.AUTH_MODE === 'flex' ? 'flex' : 'demo-hmac';
  if (authMode === 'demo-hmac' && env.NODE_ENV === 'production') {
    throw new Error('AUTH_MODE=demo-hmac is not allowed with NODE_ENV=production');
  }
  return {
    port: Number(env.PORT ?? 8787),
    host: env.HOST ?? '127.0.0.1',
    authMode,
    demoJwtSecret: env.DEMO_JWT_SECRET,
    twilioAccountSid: env.TWILIO_ACCOUNT_SID,
    twilioAuthToken: env.TWILIO_AUTH_TOKEN,
    twilioApiKey: env.TWILIO_API_KEY,
    twilioApiSecret: env.TWILIO_API_SECRET,
    workspaceSid: env.TASKROUTER_WORKSPACE_SID,
    realtimeSource: env.REALTIME_SOURCE === 'taskrouter' ? 'taskrouter' : 'mock',
    historySource: env.HISTORY_SOURCE === 'insights-mart' ? 'insights-mart' : 'mock',
    martFile: env.MART_FILE,
    queueMapFile: env.QUEUE_MAP_FILE,
    rbacFile: env.RBAC_FILE,
    corsOrigins: (env.CORS_ORIGINS ?? 'http://localhost:3000,https://flex.twilio.com')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    cacheTtlMs: Number(env.CACHE_TTL_MS ?? 10000),
    demoViewAs: env.DEMO_VIEW_AS === 'true',
  };
}

/** Queue catalog: real SIDs come from a local, git-ignored file; default = demo catalog. */
export function loadQueueCatalog(file?: string): QueueDef[] {
  if (!file) return DEMO_QUEUES;
  const raw = JSON.parse(readFileSync(file, 'utf8')) as { queues: QueueDef[] };
  for (const q of raw.queues) {
    if (!/^WQ[0-9a-f]{32}$/.test(q.sid)) throw new Error(`Invalid queue SID for ${q.key}`);
    if (q.bankId !== null && !isBankId(q.bankId)) throw new Error(`Invalid bankId for ${q.key}`);
    if (q.bankId === null && !q.sharedAcrossBanks) throw new Error(`Queue ${q.key} without bankId must be sharedAcrossBanks`);
    if (q.tower !== 'CX' && q.tower !== 'CQ') throw new Error(`Invalid tower for ${q.key}`);
  }
  return raw.queues;
}
