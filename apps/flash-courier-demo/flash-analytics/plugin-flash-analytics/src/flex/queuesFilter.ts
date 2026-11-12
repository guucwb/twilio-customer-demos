/**
 * Architecture A — Real-Time Queues View filter by Queue SID.
 * UX/performance only. NOT an authorization control: it runs in the browser and
 * does not change what TaskRouter/Flex APIs, Insights, exports or deep links return.
 *
 * Deny-by-default: until the allowed set is known (or if loading it fails) no
 * queue is shown or subscribed.
 */

interface QueuesStatsApi {
  setFilter: (fn: (queue: { key: string }) => boolean) => void;
  setSubscriptionFilter: (fn: (queue: { sid: string }) => boolean) => void;
}

export function makeQueuePredicates(allowed: ReadonlySet<string> | null) {
  return {
    // WorkerQueue.key is the TaskQueue SID in Flex UI 2.x state.
    display: (queue: { key: string }) => allowed !== null && allowed.has(queue.key),
    subscription: (queue: { sid: string }) => allowed !== null && allowed.has(queue.sid),
  };
}

export function applyQueuesFilter(queuesStats: QueuesStatsApi, allowed: ReadonlySet<string> | null): void {
  const p = makeQueuePredicates(allowed);
  queuesStats.setFilter(p.display);
  queuesStats.setSubscriptionFilter(p.subscription);
}

/** Removes the filter (demo "remove" button): show and subscribe to every queue again. */
export function clearQueuesFilter(queuesStats: QueuesStatsApi): void {
  queuesStats.setFilter(() => true);
  queuesStats.setSubscriptionFilter(() => true);
}
