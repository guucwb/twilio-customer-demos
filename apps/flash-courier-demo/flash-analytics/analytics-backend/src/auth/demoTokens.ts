import { createHmac, timingSafeEqual } from 'node:crypto';

import { AuthError, type TokenVerifier, type VerifiedIdentity } from './types';

/**
 * LOCAL DEMO / TEST tokens: compact JWS HS256 with exp/nbf/iss/aud checks.
 * Real crypto verification (not a stub), used so the 403 tests exercise a genuine
 * auth path without a live Twilio account. Production uses FlexTokenVerifier.
 *
 * NOTE: tokens carry identity + roles only. Any bank/queue claim is IGNORED —
 * scope is always resolved server-side from the RBAC store.
 */
export const DEMO_ISSUER = 'flash-analytics-demo';
export const DEMO_AUDIENCE = 'flash-analytics-api';

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

export interface DemoClaims {
  sub: string;
  roles: string[];
  iss?: string;
  aud?: string;
  iat?: number;
  nbf?: number;
  exp?: number;
  [extra: string]: unknown;
}

export function signDemoToken(claims: DemoClaims, secret: string, ttlSeconds = 3600, now = Date.now()): string {
  if (secret.length < 32) throw new Error('DEMO_JWT_SECRET must have at least 32 chars');
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(JSON.stringify({ iss: DEMO_ISSUER, aud: DEMO_AUDIENCE, iat, nbf: iat, exp: iat + ttlSeconds, ...claims }));
  const sig = b64url(createHmac('sha256', secret).update(`${header}.${payload}`).digest());
  return `${header}.${payload}.${sig}`;
}

export function createDemoTokenVerifier(secret: string, clock: () => number = Date.now): TokenVerifier {
  if (!secret || secret.length < 32) throw new Error('DEMO_JWT_SECRET must have at least 32 chars');
  return {
    kind: 'demo-hmac',
    async verify(token: string): Promise<VerifiedIdentity> {
      const parts = token.split('.');
      if (parts.length !== 3) throw new AuthError('malformed_token');
      const [h, p, s] = parts;
      let header: { alg?: string };
      let claims: DemoClaims;
      try {
        header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
        claims = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
      } catch {
        throw new AuthError('malformed_token');
      }
      if (header.alg !== 'HS256') throw new AuthError('unsupported_alg');
      const expected = createHmac('sha256', secret).update(`${h}.${p}`).digest();
      const given = Buffer.from(s, 'base64url');
      if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new AuthError('bad_signature');
      const nowSec = Math.floor(clock() / 1000);
      if (typeof claims.exp !== 'number' || claims.exp <= nowSec) throw new AuthError('token_expired');
      if (typeof claims.nbf === 'number' && claims.nbf > nowSec + 30) throw new AuthError('token_not_yet_valid');
      if (claims.iss !== DEMO_ISSUER) throw new AuthError('bad_issuer');
      if (claims.aud !== DEMO_AUDIENCE) throw new AuthError('bad_audience');
      if (typeof claims.sub !== 'string' || !claims.sub) throw new AuthError('missing_subject');
      const roles = Array.isArray(claims.roles) ? claims.roles.filter((r): r is string => typeof r === 'string') : [];
      return { identity: claims.sub, roles };
    },
  };
}
