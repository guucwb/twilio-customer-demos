/**
 * Build-time flags (Flex Plugins CLI exposes FLEX_APP_* from .env files).
 *   FLEX_APP_ANALYTICS_SOURCE      mock (default) | api
 *   FLEX_APP_ANALYTICS_API_URL     base URL of analytics-backend (api mode)
 *   FLEX_APP_ENABLE_QUEUES_FILTER  true → apply Architecture A filter on the Real-Time Queues View at startup
 *   FLEX_APP_DEMO_VIEW_AS          true → show the server-enforced "view as" switcher (backend must have DEMO_VIEW_AS=true)
 */
export interface PluginConfig {
  source: 'mock' | 'api';
  apiUrl: string;
  enableQueuesFilter: boolean;
  demoViewAs: boolean;
}

export function readPluginConfig(env: Record<string, string | undefined>): PluginConfig {
  const source = env.FLEX_APP_ANALYTICS_SOURCE === 'api' ? 'api' : 'mock';
  return {
    source,
    apiUrl: env.FLEX_APP_ANALYTICS_API_URL ?? 'http://localhost:8787',
    enableQueuesFilter: env.FLEX_APP_ENABLE_QUEUES_FILTER === 'true',
    demoViewAs: env.FLEX_APP_DEMO_VIEW_AS === 'true',
  };
}

/** UX gate only (who sees the nav item). Authorization is enforced by the backend. */
export const ANALYTICS_UI_ROLES = ['admin', 'supervisor'];

export function canSeeAnalyticsNav(roles: string[] | undefined): boolean {
  return (roles ?? []).some((r) => ANALYTICS_UI_ROLES.includes(r));
}
