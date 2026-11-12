/**
 * Standalone preview of the plugin view OUTSIDE Flex (no Flex login, no Twilio calls).
 *   default                      → mock mode with demo profile switcher
 *   ?api=http://127.0.0.1:8787#token=<demo token>  → Architecture B against the LOCAL backend
 * The token goes in the URL fragment (never sent to any server by the browser).
 */
import React from 'react';
import ReactDOM from 'react-dom';

import { FlashAnalyticsApp } from '../src/components/FlashAnalyticsApp';
import { createAnalyticsApiClient } from '../src/providers/analyticsApiClient';

const params = new URLSearchParams(window.location.search);
const api = params.get('api');
const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? undefined;

const root = document.getElementById('root');
if (api) {
  const factory = (getViewAs: () => string | undefined) => createAnalyticsApiClient({ baseUrl: api, getToken: () => token, getViewAs });
  ReactDOM.render(
    <FlashAnalyticsApp
      source="api"
      apiProviderFactory={factory}
      demoViewAs={params.get('viewAs') === 'true'}
      queuesFilter={null}
      initialProfile={(params.get('profile') ?? undefined) as never}
      initialTab={params.get('tab') ?? undefined}
    />,
    root,
  );
} else {
  ReactDOM.render(
    <FlashAnalyticsApp
      source="mock"
      queuesFilter={null}
      initialProfile={(params.get('profile') ?? undefined) as never}
      initialTab={params.get('tab') ?? undefined}
    />,
    root,
  );
}
