import { createServer } from 'node:http';

import { createApp } from './app';
import { createDemoTokenVerifier } from './auth/demoTokens';
import { createCompositeVerifier } from './auth/compositeVerifier';
import { createFlexTokenVerifier } from './auth/flexTokenVerifier';
import type { TokenVerifier } from './auth/types';
import { loadQueueCatalog, readConfig } from './config';
import { RbacStore } from './rbac/rbacStore';
import { createInsightsDataProvider } from './sources/insightsDataProvider';
import { createMockHistorySource, createMockRealtimeSource } from './sources/mockSources';
import { createTaskRouterDataProvider } from './sources/taskRouterDataProvider';
import type { HistorySource, RealtimeSource } from './sources/types';

const cfg = readConfig();

function buildVerifier(): TokenVerifier {
  if (cfg.authMode === 'flex') {
    const flex = createFlexTokenVerifier({
      accountSid: cfg.twilioAccountSid ?? '',
      authToken: cfg.twilioAuthToken,
      apiKey: cfg.twilioApiKey,
      apiSecret: cfg.twilioApiSecret,
    });
    return createCompositeVerifier(flex, cfg.demoJwtSecret ? createDemoTokenVerifier(cfg.demoJwtSecret) : null);
  }
  return createDemoTokenVerifier(cfg.demoJwtSecret ?? '');
}

function buildRealtime(): RealtimeSource {
  if (cfg.realtimeSource === 'taskrouter') {
    const username = cfg.twilioApiKey ?? cfg.twilioAccountSid;
    const password = cfg.twilioApiSecret ?? cfg.twilioAuthToken;
    if (!username || !password) throw new Error('REALTIME_SOURCE=taskrouter requires TWILIO_API_KEY/SECRET or ACCOUNT_SID/AUTH_TOKEN');
    return createTaskRouterDataProvider({ workspaceSid: cfg.workspaceSid ?? '', username, password, ttlMs: cfg.cacheTtlMs });
  }
  return createMockRealtimeSource();
}

function buildHistory(): HistorySource {
  if (cfg.historySource === 'insights-mart') return createInsightsDataProvider({ martFile: cfg.martFile ?? '' });
  return createMockHistorySource();
}

const app = createApp({
  verifier: buildVerifier(),
  rbac: cfg.rbacFile ? RbacStore.fromFile(cfg.rbacFile) : RbacStore.demo(),
  catalog: loadQueueCatalog(cfg.queueMapFile),
  realtime: buildRealtime(),
  history: buildHistory(),
  corsOrigins: cfg.corsOrigins,
  demoViewAs: cfg.demoViewAs,
});

createServer((req, res) => void app(req, res)).listen(cfg.port, cfg.host, () => {
  console.log(
    `[flash-analytics-backend] http://${cfg.host}:${cfg.port} auth=${cfg.authMode} realtime=${cfg.realtimeSource} history=${cfg.historySource} ` +
      `queues=${cfg.queueMapFile ? 'file' : 'demo'} rbac=${cfg.rbacFile ? 'file' : 'demo'}`,
  );
});
