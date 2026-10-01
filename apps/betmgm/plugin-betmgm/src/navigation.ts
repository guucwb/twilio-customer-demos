import type { View } from '../../shared/domain';

export const demoViews: View[] = ['Inbox', 'Cases', 'Players', 'Knowledge', 'Supervisor'];
export const viewName = (view: View): string => `betmgm-${view.toLowerCase()}`;
export const inboxLocation = '/betmgm-inbox/';

// Only the initial native landing page is redirected. Explicit custom deep links
// and subsequent presenter navigation to Live Tasks remain available.
export function shouldOpenDemoOnMount(pathname: string): boolean {
  return ['/', '/agent-desktop', '/agent-desktop/'].includes(pathname);
}
