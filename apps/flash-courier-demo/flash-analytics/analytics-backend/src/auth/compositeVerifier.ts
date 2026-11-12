import { DEMO_ISSUER } from './demoTokens';
import { AuthError, type TokenVerifier } from './types';

/**
 * DEMO DEPLOYMENTS ONLY: accepts Flex user tokens (validated by Twilio IAM) and,
 * additionally, locally-signed demo tokens (iss=flash-analytics-demo). Lets the
 * cross-tenant script hit the deployed API. Disable (no DEMO_JWT_SECRET) in production.
 */
export function createCompositeVerifier(flex: TokenVerifier, demo: TokenVerifier | null): TokenVerifier {
  return {
    kind: 'flex',
    async verify(token: string) {
      if (demo) {
        let iss: unknown;
        try {
          iss = JSON.parse(Buffer.from(token.split('.')[1] ?? '', 'base64url').toString('utf8')).iss;
        } catch {
          iss = undefined;
        }
        if (iss === DEMO_ISSUER) return demo.verify(token);
      }
      if (!token) throw new AuthError('missing_token');
      return flex.verify(token);
    },
  };
}
