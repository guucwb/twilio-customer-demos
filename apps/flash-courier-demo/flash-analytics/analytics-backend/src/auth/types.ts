export interface VerifiedIdentity {
  identity: string;
  roles: string[];
  workerSid?: string;
}

export class AuthError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

export interface TokenVerifier {
  readonly kind: 'flex' | 'demo-hmac';
  /** Must throw AuthError on any failure. Never returns a partially-trusted identity. */
  verify(token: string): Promise<VerifiedIdentity>;
}
