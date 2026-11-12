/**
 * Re-export of the shared, framework-free domain module that lives in the plugin
 * (Flex's webpack only compiles files under plugin src/). The backend is the
 * AUTHORITY: it imports the same pure functions but feeds them a server-resolved principal.
 */
export * from '../../plugin-flash-analytics/src/domain/types';
export * from '../../plugin-flash-analytics/src/domain/catalog';
export * from '../../plugin-flash-analytics/src/domain/accessPolicy';
export * from '../../plugin-flash-analytics/src/domain/metrics';
export * from '../../plugin-flash-analytics/src/domain/reports';
export * from '../../plugin-flash-analytics/src/domain/simulation';
export * from '../../plugin-flash-analytics/src/domain/routingExpression';
export * from '../../plugin-flash-analytics/src/domain/transfer';
export { DEMO_PROFILES } from '../../plugin-flash-analytics/src/domain/demoProfiles';
