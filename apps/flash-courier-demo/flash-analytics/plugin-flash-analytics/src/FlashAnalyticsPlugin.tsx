import React from 'react';
import * as Flex from '@twilio/flex-ui';
import { FlexPlugin } from '@twilio/flex-plugin';

import { FlashAnalyticsApp } from './components/FlashAnalyticsApp';
import { canSeeAnalyticsNav, readPluginConfig } from './flex/config';
import { applyQueuesFilter, clearQueuesFilter } from './flex/queuesFilter';
import { createAnalyticsApiClient } from './providers/analyticsApiClient';

const PLUGIN_NAME = 'FlashAnalyticsPlugin';
export const VIEW_NAME = 'flash-analytics';

/** SideNav injects `activeView` into its children. */
function FlashAnalyticsSideLink(props: { activeView?: string }): JSX.Element {
  return (
    <Flex.SideLink
      showLabel
      icon="Data"
      iconActive="DataBold"
      isActive={props.activeView === VIEW_NAME}
      onClick={() => Flex.Actions.invokeAction('NavigateToView', { viewName: VIEW_NAME })}
    >
      Flash Analytics
    </Flex.SideLink>
  );
}

export default class FlashAnalyticsPlugin extends FlexPlugin {
  constructor() {
    super(PLUGIN_NAME);
  }

  async init(flex: typeof Flex, manager: Flex.Manager): Promise<void> {
    const config = readPluginConfig({
      FLEX_APP_ANALYTICS_SOURCE: process.env.FLEX_APP_ANALYTICS_SOURCE,
      FLEX_APP_ANALYTICS_API_URL: process.env.FLEX_APP_ANALYTICS_API_URL,
      FLEX_APP_ENABLE_QUEUES_FILTER: process.env.FLEX_APP_ENABLE_QUEUES_FILTER,
      FLEX_APP_DEMO_VIEW_AS: process.env.FLEX_APP_DEMO_VIEW_AS,
    });

    // Only the Flex user token leaves the browser; scope is resolved by the backend.
    const apiProviderFactory =
      config.source === 'api'
        ? (getViewAs: () => string | undefined) =>
            createAnalyticsApiClient({ baseUrl: config.apiUrl, getToken: () => manager.user?.token, getViewAs })
        : undefined;

    let queuesFilterState: { applied: boolean; sidCount: number } = { applied: false, sidCount: 0 };

    // Architecture A at startup (opt-in): filter the native Real-Time Queues View by SID.
    if (config.enableQueuesFilter) {
      if (!apiProviderFactory) {
        // Mock SIDs never match real queues; refuse rather than hide everything silently.
        console.warn(`[${PLUGIN_NAME}] FLEX_APP_ENABLE_QUEUES_FILTER requires FLEX_APP_ANALYTICS_SOURCE=api. Filter not applied.`);
      } else {
        applyQueuesFilter(flex.QueuesStats, null); // deny-by-default until scope is known
        const me = await apiProviderFactory(() => undefined).getMe();
        const allowed = me.ok ? new Set(me.data.allowedQueueSids) : new Set<string>();
        applyQueuesFilter(flex.QueuesStats, allowed);
        queuesFilterState = { applied: true, sidCount: allowed.size };
      }
    }

    // UX gate only: hides the nav item for agents. The backend still authorizes every request.
    if (!canSeeAnalyticsNav(manager.user?.roles)) return;

    const onApplyQueuesFilter = (sids: string[] | null) => {
      if (sids === null) clearQueuesFilter(flex.QueuesStats);
      else applyQueuesFilter(flex.QueuesStats, new Set(sids));
    };

    flex.ViewCollection.Content.add(
      <flex.View name={VIEW_NAME} key="flash-analytics-view">
        <FlashAnalyticsApp
          source={config.source}
          apiProviderFactory={apiProviderFactory}
          demoViewAs={config.demoViewAs}
          onApplyQueuesFilter={apiProviderFactory ? onApplyQueuesFilter : undefined}
          queuesFilter={queuesFilterState}
          flexIdentity={manager.user?.identity}
        />
      </flex.View>,
    );
    flex.SideNav.Content.add(<FlashAnalyticsSideLink key="flash-analytics-sidelink" />, { sortOrder: 100 });
  }
}
