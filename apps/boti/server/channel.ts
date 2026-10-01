/** Optional transport boundary. Implement only for an explicitly authorized test.
 * Never use Verify, modify provider resources, or infer delivered/read from a send.
 * The presentation never depends on this adapter.
 */
export interface OptionalWhatsAppTransport {
 sendTest(input:{to:string;text:string}):Promise<{sid:string;providerStatus:string}>;
}
export const channelPolicy={mode:'simulated',externalSendingEnabled:false,requiresWebhook:false} as const;
