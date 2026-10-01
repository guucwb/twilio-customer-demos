import type { ChannelId } from './journey';

export type ProviderName = 'Twilio' | 'Twilio SendGrid';

/** A status exactly as reported by a provider. Only the server creates these, from real responses. */
export type ProviderEvent = {
  provider: ProviderName;
  /** Twilio Message SID or SendGrid X-Message-Id, exactly as returned. */
  id: string;
  status: string;
  errorCode: number | null;
  /** Timestamp reported by the provider (dateUpdated / Date header). */
  providerTime: string | null;
  /** When the server observed the status. */
  observedAt: string;
  requestedChannel: ChannelId;
  actualChannel: ChannelId | null;
};
