export type Channel = 'whatsapp' | 'sms' | 'call';
export interface Capabilities {
  ready: boolean; message: string; serviceSid?: string;
  channels: Record<Channel, { enabled: boolean; detail: string }>;
  totp: { enabled: boolean; detail: string };
  passkeys: { enabled: false; detail: string };
}
export interface Session {
  csrf: string; authenticated: boolean; pendingOtp: boolean; channel?: Channel;
  maskedPhone?: string; totpVerified: boolean; totpPending: boolean; stepUp: boolean; retryAfter: number;
  beneficiary?: { name: string; plan: string; memberId: string; reimbursement: string };
  events: { id: string; timestamp: string; method: string; operation: string; status: string; latency: number; sid?: string; errorCode?: number; source: 'Twilio' | 'Demo' }[];
}
