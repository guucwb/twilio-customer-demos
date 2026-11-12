/**
 * Twilio Functions adapter for the Flash Analytics core (Architecture B).
 * Bundled by build.mjs into one public Function per route. Public because callers
 * authenticate with the Flex user token (validated against Twilio IAM), not with a
 * Twilio request signature.
 *
 * Env (Functions environment variables, server-side only):
 *   FA_API_KEY / FA_API_SECRET           least-privilege API key (TaskRouter read + IAM token validation)
 *   TASKROUTER_WORKSPACE_SID
 *   CORS_ORIGINS                         default https://flex.twilio.com,http://localhost:3000
 *   DEMO_VIEW_AS=true                    demo-only narrow "view as"
 *   DEMO_JWT_SECRET                      demo-only: also accept locally signed demo tokens
 * Private assets: /queue-map.json, /rbac.json
 */
import { createCore, type CoreRequest } from '../../analytics-backend/src/app';
import { createCompositeVerifier } from '../../analytics-backend/src/auth/compositeVerifier';
import { createDemoTokenVerifier } from '../../analytics-backend/src/auth/demoTokens';
import { createFlexTokenVerifier } from '../../analytics-backend/src/auth/flexTokenVerifier';
import { loadQueueCatalog } from '../../analytics-backend/src/config';
import { RbacStore } from '../../analytics-backend/src/rbac/rbacStore';
import { createMockHistorySource } from '../../analytics-backend/src/sources/mockSources';
import { createTaskRouterDataProvider } from '../../analytics-backend/src/sources/taskRouterDataProvider';

interface FnContext {
  ACCOUNT_SID: string;
  PATH: string;
  [key: string]: string | undefined | unknown;
}
type FnEvent = Record<string, unknown> & { request?: { headers?: Record<string, string> } };
type Callback = (err: unknown, response?: unknown) => void;

declare const Twilio: {
  Response: new () => {
    setStatusCode(code: number): void;
    appendHeader(key: string, value: string): void;
    setBody(body: string): void;
  };
};
declare const Runtime: { getAssets(): Record<string, { path: string }> };

let core: ReturnType<typeof createCore> | null = null;

function getCore(context: FnContext) {
  if (core) return core;
  const env = (k: string) => (typeof context[k] === 'string' ? (context[k] as string) : undefined);
  const apiKey = env('FA_API_KEY');
  const apiSecret = env('FA_API_SECRET');
  if (!apiKey || !apiSecret) throw new Error('FA_API_KEY/FA_API_SECRET not configured');
  const assets = Runtime.getAssets();
  const demoSecret = env('DEMO_JWT_SECRET');
  core = createCore({
    verifier: createCompositeVerifier(
      createFlexTokenVerifier({ accountSid: context.ACCOUNT_SID, apiKey, apiSecret }),
      demoSecret ? createDemoTokenVerifier(demoSecret) : null,
    ),
    rbac: RbacStore.fromFile(assets['/rbac.json'].path),
    catalog: loadQueueCatalog(assets['/queue-map.json'].path),
    realtime: createTaskRouterDataProvider({
      workspaceSid: env('TASKROUTER_WORKSPACE_SID') ?? '',
      username: apiKey,
      password: apiSecret,
      ttlMs: Number(env('CACHE_TTL_MS') ?? 10000),
    }),
    history: createMockHistorySource(),
    corsOrigins: (env('CORS_ORIGINS') ?? 'https://flex.twilio.com,http://localhost:3000').split(',').map((s) => s.trim()),
    demoViewAs: env('DEMO_VIEW_AS') === 'true',
  });
  return core;
}

export function makeHandler(routePath: string) {
  return async function handler(context: FnContext, event: FnEvent, callback: Callback) {
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(event.request?.headers ?? {})) headers[k.toLowerCase()] = String(v);
    const query = new URLSearchParams();
    for (const [k, v] of Object.entries(event)) {
      if (k === 'request') continue;
      if (Array.isArray(v)) v.forEach((x) => query.append(k, String(x)));
      else if (v !== undefined && v !== null && typeof v !== 'object') query.append(k, String(v));
    }
    // Functions do not expose the HTTP method; a CORS preflight is recognisable by its headers.
    const method = headers['access-control-request-method'] ? 'OPTIONS' : 'GET';
    const req: CoreRequest = { method, path: routePath, query, headers };
    const response = new Twilio.Response();
    try {
      const out = await getCore(context)(req);
      response.setStatusCode(out.status);
      for (const [k, v] of Object.entries(out.headers)) response.appendHeader(k, v);
      response.setBody(out.body);
    } catch (e) {
      console.error('flash-analytics configuration error', (e as Error).message);
      response.setStatusCode(500);
      response.appendHeader('Content-Type', 'application/json');
      response.setBody(JSON.stringify({ error: 'server_misconfigured' }));
    }
    return callback(null, response);
  };
}
