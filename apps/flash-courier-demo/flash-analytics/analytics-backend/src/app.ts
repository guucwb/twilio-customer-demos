import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  allowedQueueSids,
  buildRealtimeSnapshot,
  DEMO_PROFILES,
  historyToCsv,
  HEADCOUNT_NOTE,
  resolveScope,
  visibleQueues,
  type AgentsReport,
  type HistoryReport,
  type MeReport,
  type Principal,
  type QueueDef,
} from './domain';
import { AuthError, type TokenVerifier } from './auth/types';
import type { RbacStore } from './rbac/rbacStore';
import type { HistorySource, RealtimeSource } from './sources/types';

export interface AuditEvent {
  ts: string;
  idHash: string | null;
  method: string;
  path: string;
  requestedBank: string | null;
  viewAs?: string;
  status: number;
  decision: 'allow' | 'deny' | 'error';
  reason?: string;
}

export interface AppDeps {
  verifier: TokenVerifier;
  rbac: RbacStore;
  catalog: QueueDef[];
  realtime: RealtimeSource;
  history: HistorySource;
  corsOrigins: string[];
  /**
   * DEMO feature: a verified flash_admin may NARROW its own scope to a demo
   * supervisor profile with header X-Flash-View-As. Never broadens. Off by default.
   */
  demoViewAs?: boolean;
  audit?: (e: AuditEvent) => void;
  now?: () => Date;
}

/** Transport-agnostic request/response so the same core runs in Node http and Twilio Functions. */
export interface CoreRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  /** lower-cased header names */
  headers: Record<string, string | undefined>;
}

export interface CoreResponse {
  status: number;
  headers: Record<string, string>;
  body: string;
}

const ALLOWED_PARAMS: Record<string, string[]> = {
  '/api/analytics/me': [],
  '/api/analytics/queues': ['bankId'],
  '/api/analytics/queue': [],
  '/api/analytics/history': ['bankId', 'days'],
  '/api/analytics/history/export.csv': ['bankId'],
  '/api/analytics/agents': ['bankId'],
};

const VIEW_AS_HEADER = 'x-flash-view-as';
const hashId = (id: string) => createHash('sha256').update(id).digest('hex').slice(0, 12);

class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
  ) {
    super(code);
  }
}

export function createCore(deps: AppDeps) {
  const now = deps.now ?? (() => new Date());
  const audit = deps.audit ?? ((e: AuditEvent) => console.log(JSON.stringify({ audit: e })));

  function baseHeaders(origin: string | undefined, privateNetwork: boolean): Record<string, string> {
    const h: Record<string, string> = {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Origin',
    };
    if (origin && deps.corsOrigins.includes(origin)) {
      h['Access-Control-Allow-Origin'] = origin;
      h['Access-Control-Allow-Headers'] = 'Authorization, Accept, X-Flash-View-As';
      h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
      h['Access-Control-Max-Age'] = '600';
      // Chrome Private Network Access: public origin (flex.twilio.com) → localhost backend.
      if (privateNetwork) h['Access-Control-Allow-Private-Network'] = 'true';
    }
    return h;
  }

  function json(status: number, body: unknown, headers: Record<string, string>): CoreResponse {
    return { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
  }

  async function authenticate(req: CoreRequest, event: AuditEvent): Promise<{ principal: Principal; identity: string; viewAs?: string }> {
    const m = /^Bearer\s+(\S+)$/.exec(req.headers.authorization ?? '');
    if (!m) throw new HttpError(401, 'missing_token');
    let verified;
    try {
      verified = await deps.verifier.verify(m[1]);
    } catch (e) {
      throw new HttpError(401, e instanceof AuthError ? e.code : 'invalid_token');
    }
    event.idHash = hashId(verified.identity);
    const principal = deps.rbac.resolve(verified);
    if (!principal) throw new HttpError(403, 'no_bank_binding');

    const viewAs = req.headers[VIEW_AS_HEADER];
    if (!viewAs || viewAs === 'flash_admin') return { principal, identity: verified.identity };
    if (!deps.demoViewAs) throw new HttpError(400, 'view_as_disabled');
    if (principal.role !== 'flash_admin') throw new HttpError(403, 'view_as_not_allowed');
    const profile = DEMO_PROFILES.find((p) => p.id === viewAs);
    if (!profile) throw new HttpError(400, 'unknown_view_as');
    // Narrow only: intersection with the admin's own scope.
    const narrowed: Principal = {
      identity: `${principal.identity}#view-as:${profile.id}`,
      role: profile.principal.role,
      allowedBanks: profile.principal.allowedBanks.filter((b) => principal.allowedBanks.includes(b)),
    };
    return { principal: narrowed, identity: verified.identity, viewAs: profile.id };
  }

  function scopeOrThrow(principal: Principal, bankId: string | null) {
    const scope = resolveScope(principal, bankId);
    if (!scope.ok) throw new HttpError(scope.status, scope.error);
    return scope.banks;
  }

  async function route(path: string, params: URLSearchParams, principal: Principal): Promise<{ body: unknown; csv?: boolean }> {
    const bankId = params.get('bankId');
    switch (path) {
      case '/api/analytics/me': {
        const banks = scopeOrThrow(principal, null);
        const me: MeReport = {
          identity: principal.identity,
          role: principal.role,
          allowedBanks: banks,
          allowedQueueSids: allowedQueueSids(principal, deps.catalog),
        };
        return { body: me };
      }
      case '/api/analytics/queues': {
        const banks = scopeOrThrow(principal, bankId);
        const { queues, limitations } = visibleQueues(principal, banks, deps.catalog, !bankId);
        const [stats, agents] = await Promise.all([deps.realtime.getQueueStats(queues), deps.realtime.getAgents(queues)]);
        return {
          body: buildRealtimeSnapshot({
            scope: banks,
            source: deps.realtime.kind,
            queues: stats,
            uniqueEligible: agents.length,
            uniqueAvailable: agents.filter((a) => a.activity === 'Available').length,
            trend: deps.realtime.getTrend?.(queues) ?? null,
            limitations,
            now: now(),
          }),
        };
      }
      case '/api/analytics/agents': {
        const banks = scopeOrThrow(principal, bankId);
        const { queues } = visibleQueues(principal, banks, deps.catalog, false);
        const agents = await deps.realtime.getAgents(queues);
        const report: AgentsReport = {
          scope: banks,
          agents,
          uniqueHeadcount: agents.length,
          eligibilitySum: agents.reduce((s, a) => s + a.eligibleQueueKeys.length, 0),
          note: HEADCOUNT_NOTE,
        };
        return { body: report };
      }
      case '/api/analytics/history':
      case '/api/analytics/history/export.csv': {
        const banks = scopeOrThrow(principal, bankId);
        const daysRaw = params.get('days');
        const days = daysRaw === null ? 7 : Number(daysRaw);
        if (!Number.isInteger(days) || days < 1 || days > 31) throw new HttpError(400, 'invalid_days');
        const rows = await deps.history.getDaily(banks, days, now());
        // Defense in depth: drop any row outside the authorized banks even if the source misbehaves.
        const safe = rows.filter((r) => banks.includes(r.bankId));
        if (path.endsWith('.csv')) return { body: historyToCsv(safe), csv: true };
        const report: HistoryReport = {
          source: deps.history.kind,
          scope: banks,
          from: safe[0]?.date ?? '',
          to: safe[safe.length - 1]?.date ?? '',
          days: safe,
          limitations:
            deps.history.kind === 'insights-mart-mock'
              ? ['Histórico simulado (mock do data mart). Em produção: ETL Flex Insights + JALL com RLS por banco.']
              : [],
        };
        return { body: report };
      }
      default:
        throw new HttpError(404, 'not_found');
    }
  }

  return async function handle(req: CoreRequest): Promise<CoreResponse> {
    const headers = baseHeaders(req.headers.origin, req.headers['access-control-request-private-network'] === 'true');
    let path = req.path.replace(/\/+$/, '') || '/';
    const event: AuditEvent = {
      ts: now().toISOString(),
      idHash: null,
      method: req.method,
      path,
      requestedBank: req.query.get('bankId'),
      status: 0,
      decision: 'deny',
    };

    if (req.method === 'OPTIONS') return { status: 204, headers, body: '' };
    if (path === '/healthz') return json(200, { ok: true }, headers);
    if (req.method !== 'GET') return json(405, { error: 'method_not_allowed' }, headers);

    try {
      // Drill-down: /api/analytics/queues/:queueKey
      const drill = /^\/api\/analytics\/queues\/([A-Za-z0-9_]+)$/.exec(path);
      if (drill) path = '/api/analytics/queue';
      const allowedParams = ALLOWED_PARAMS[path];
      if (!allowedParams) throw new HttpError(404, 'not_found');
      for (const key of req.query.keys()) {
        // The server never accepts scope inputs like queueSid/role/userId from the client.
        if (!allowedParams.includes(key)) throw new HttpError(400, 'unsupported_parameter');
      }

      const { principal, identity, viewAs } = await authenticate(req, event);
      event.idHash = hashId(identity);
      if (viewAs) event.viewAs = viewAs;

      let result: { body: unknown; csv?: boolean };
      if (drill) {
        const queue = deps.catalog.find((q) => q.key === drill[1]);
        const banks = scopeOrThrow(principal, null);
        const visible = visibleQueues(principal, banks, deps.catalog, true).queues;
        // Unknown and out-of-scope keys get the same 403.
        if (!queue || !visible.some((q) => q.key === queue.key)) throw new HttpError(403, 'forbidden');
        const [stats] = await deps.realtime.getQueueStats([queue]);
        result = { body: stats };
      } else {
        result = await route(path, req.query, principal);
      }
      event.status = 200;
      event.decision = 'allow';
      audit(event);
      if (result.csv) {
        return { status: 200, headers: { ...headers, 'Content-Type': 'text/csv; charset=utf-8' }, body: result.body as string };
      }
      return json(200, result.body, headers);
    } catch (e) {
      if (e instanceof HttpError) {
        event.status = e.status;
        event.reason = e.code;
        audit(event);
        return json(e.status, { error: e.code }, headers);
      }
      // Upstream failure: never fall back to cached data of another scope.
      event.status = 502;
      event.decision = 'error';
      event.reason = 'upstream_unavailable';
      audit(event);
      return json(502, { error: 'upstream_unavailable' }, headers);
    }
  };
}

/** Node http adapter. */
export function createApp(deps: AppDeps) {
  const core = createCore(deps);
  return async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const headers: Record<string, string | undefined> = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
    const out = await core({ method: req.method ?? 'GET', path: url.pathname, query: url.searchParams, headers });
    res.statusCode = out.status;
    for (const [k, v] of Object.entries(out.headers)) res.setHeader(k, v);
    res.end(out.body);
  };
}
