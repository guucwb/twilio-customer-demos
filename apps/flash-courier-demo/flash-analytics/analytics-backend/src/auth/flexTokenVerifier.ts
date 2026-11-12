import { AuthError, type TokenVerifier, type VerifiedIdentity } from './types';

/**
 * Production verifier for the Flex user token (manager.user.token).
 * Flex tokens are validated by Twilio's IAM endpoint — the same call made by the
 * official `twilio-flex-token-validator` package used in Twilio Functions:
 *   POST https://iam.twilio.com/v1/Accounts/{AccountSid}/Tokens/validate  {"token": "..."}
 *   Basic auth: AccountSid:AuthToken, or an API Key SID:secret (verified to be accepted
 *   by this endpoint on the demo account). Server-side secret only.
 * Response fields used: valid, expiration, identity, roles, worker_sid, realm_user_id.
 *
 * Live check on the demo account: the endpoint accepts API Key auth and rejects
 * invalid tokens (valid:false). Real Flex user tokens are validated when the plugin
 * runs inside Flex. Unit tests cover the contract with a mocked fetch. Before
 * production, compare with `twilio-flex-token-validator` or adopt the package directly.
 */
export interface FlexVerifierOptions {
  accountSid: string;
  /** Auth Token, or omit and pass apiKey/apiSecret. */
  authToken?: string;
  apiKey?: string;
  apiSecret?: string;
  fetchImpl?: typeof fetch;
  clock?: () => number;
}

interface ValidateResponse {
  valid?: boolean;
  code?: number;
  message?: string;
  expiration?: string;
  identity?: string;
  roles?: string[];
  worker_sid?: string;
}

export function createFlexTokenVerifier(opts: FlexVerifierOptions): TokenVerifier {
  if (!/^AC[0-9a-f]{32}$/.test(opts.accountSid)) throw new Error('TWILIO_ACCOUNT_SID invalid');
  const user = opts.apiKey && opts.apiSecret ? opts.apiKey : opts.accountSid;
  const pass = opts.apiKey && opts.apiSecret ? opts.apiSecret : opts.authToken;
  if (!pass) throw new Error('flex auth mode requires TWILIO_AUTH_TOKEN or TWILIO_API_KEY/TWILIO_API_SECRET');
  const doFetch = opts.fetchImpl ?? fetch;
  const clock = opts.clock ?? Date.now;
  const basic = Buffer.from(`${user}:${pass}`).toString('base64');

  return {
    kind: 'flex',
    async verify(token: string): Promise<VerifiedIdentity> {
      let res: Response;
      try {
        res = await doFetch(`https://iam.twilio.com/v1/Accounts/${opts.accountSid}/Tokens/validate`, {
          method: 'POST',
          headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
      } catch {
        throw new AuthError('token_validation_unavailable');
      }
      if (!res.ok) throw new AuthError('invalid_token');
      const body = (await res.json()) as ValidateResponse;
      if (body.valid !== true) throw new AuthError('invalid_token');
      if (!body.expiration || Date.parse(body.expiration) <= clock()) throw new AuthError('token_expired');
      if (!body.identity) throw new AuthError('missing_subject');
      return { identity: body.identity, roles: Array.isArray(body.roles) ? body.roles : [], workerSid: body.worker_sid };
    },
  };
}
