# Validation — 2026-09-30

## Automated checks

| Check | Result |
|---|---|
| Fallback/shared/server lint | PASS |
| Fallback/shared TypeScript | PASS |
| Domain, host rendering and navigation tests | PASS — 22 tests, 2 files |
| Fallback production build | PASS — local HTML, CSS and JS only |
| Plugin lint | PASS |
| Plugin TypeScript | PASS after pinning compatible Node types |
| Official `twilio flex:plugins:build` | PASS — plugin-betmgm.js, approximately 140.6 KB |
| Existing workspace integrity | PASS — SHA-256 comparison of pre-existing files, zero changes |

The initial generated TypeScript 4 scaffold pulled newer Node types with unsupported syntax. A plugin-local @types/node 18.19.0 pin fixed typecheck/build. The running dev typechecker had to be restarted to discard its stale diagnostics. The final server compiled successfully and browser walkthrough proceeded without the compilation overlay. No type checking was disabled.

## Real Flex phase 0

- Official CLI generated the isolated TypeScript/Flex 2 plugin under apps/betmgm/plugin-betmgm.
- Ran supported `twilio flex:plugins:start --profile GusFlex --port 3004 --include-remote`.
- User completed browser login; authenticated local Flex loaded successfully.
- Opened the custom native navigation entry and observed **“BetMGM Player Care — plugin loaded”**.
- Existing remote plugins were included: Voice Intelligence Plugin 0.8.0, plugin-flex-ts-template-v2 0.0.1, plibo-queue-stats-groups 1.0.0, plibo-activity-skill-filter 1.3.2.
- They did not block the test view or subsequent full workspace.
- Native Flex debugger displayed **InsightsService: Network Error likely due to CORS policy for localhost**. Left visible; did not change account configuration to suppress it.

## Final real Flex browser walkthrough

Verified in Chrome at http://localhost:3004/:

- Fresh root navigation opened `/betmgm-inbox/` with Lucas, without any native Task. The five BetMGM destinations precede native links.
- Inbox opens the shared deterministic workspace; secondary **Live Tasks** opens the preserved native Agent Desktop and its expected “No active tasks” state. Returning to Inbox restores the scenario.
- `FLEX_HOST` omits the standalone sidebar, header and synthetic avatar. Native TWILIO FLEX branding and worker availability remain visible. Compact workspace controls retain Architecture, Modo Demo and reset.
- BetMGM header/theme inside recognizable Twilio Flex chrome.
- Native SideNav entries and ViewCollection routes: Inbox, Cases, Players, Knowledge, Supervisor.
- Lucas initial message, safe Player 360, Case creation and routing context.
- Relevant Knowledge article, Assist summary, cited suggestion, response insertion and local send.
- Internal note, validation status/event/draft, handoff review, transfer to Verification/Rafael Lima.
- Case notes, 18-minute SLA reference, Knowledge and interactions preserved across native view navigation.
- Web Chat closed while Case remained open in Cases.
- New synthetic Email recovered BET-18472, prior summary, note, Knowledge history and assignment.
- Players displayed both linked channel interactions.
- Standalone Knowledge library loaded within the Flex view.
- Ana specialized intent/policy, Responsible Gaming Assist, Case checklist and absence of payment action.
- Supervisor queues and PIX signal drilldown with linked Case, anonymized example and investigation guidance.
- Architecture and Modo Demo capability boundaries.
- Reset returned to Lucas, Web Chat #84912, original owner/queue, empty notes/drafts and original scenario.

The navigation/host revision was checked through the complete Lucas flow, Ana's checklist guard and specialist handoff, all five destinations, and reset. Default routing uses the public ViewCollection defaultLocation plus a once-per-mount NavigateToView action for the initial root/native landing; later Live Tasks navigation is preserved. Deep links to other views are not redirected.

## Final fallback browser walkthrough

Verified against the **production build**, served by `node scripts/serve.mjs` at http://127.0.0.1:5176/:

- Full Lucas workflow: Knowledge → Assist response → note → validation → handoff → end chat → Email → persisted Case.
- Cases search and detail: linked interactions, notes, timeline, source history, handoff summary, SLA and outcome.
- Status, priority, queue and owner filters were exercised during browser QA; each narrowed to Lucas's Case.
- Player ID search selected Ana; profile, preferences and history displayed.
- Ana's Knowledge was policy-only; resolving before checklist completion produced the expected guard. Checklist completion and specialist handoff worked.
- Knowledge search for “documental” returned the correct article; source viewer showed source, version and synthetic approval/history.
- Supervisor metrics and PIX signal detail worked.
- Architecture opened correctly; reset restored the opening scenario.
- Desktop visual review completed for both shells. Narrow-height layout keeps the conversation and composer central; contextual content scrolls independently. Mobile-scale rules exist, but a full mobile walkthrough was not performed.

The browser emitted nonblocking asynchronous message-channel listener errors during testing (consistent with browser-extension messaging). No related application failure was observed; do not claim a zero-error browser console.

After the host revision, the rebuilt fallback was reloaded and its original sidebar/header, Lucas, Assist insertion, local response and reset were checked again. The scenario engine and shared stylesheet are byte-for-byte unchanged; Flex spacing overrides are imported only by the plugin.

## Offline behavior

- Production fallback startup uses Node built-ins only and already-built local assets.
- GET / returned HTTP 200 with CSP:
  `default-src 'self'; connect-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'`.
- The full final fallback walkthrough passed under that CSP. API/WebSocket connections and external scripts/fonts are disallowed; the shared scenario code has no network transport.
- System fonts and inline SVG icons require no external asset fetches.
- The machine's internet connection itself was not disabled; offline reliability was verified through local-only assets, enforced connection policy, and the complete local workflow.
- Real Flex is not offline-capable; it is not the fallback.

## Scope and remaining risks

- All new artifacts are under apps/betmgm. CarePlus, Boti, Aché and root manifests/lockfile matched the original hashes.
- No deploy/release commands, resource mutation API requests, live message sends, commits or pushes were performed.
- No real BetMGM APIs, external AI or Conversation-layer resources were configured.
- Flex CLI static shell binds port 3004 on all interfaces; its plugin asset server binds 127.0.0.1:3104. Fallback binds 127.0.0.1:5176. This CLI behavior is documented, not silently represented as loopback-only.
- Exact brand assets/colors could not be verified due to the corporate site-category block.
- Flex authentication, CDN/network availability and the existing Insights warning remain primary-shell risks.
- An existing remote plugin also displayed an activity skill-filter configuration notification during testing. It did not block the BetMGM views; no account configuration was changed.
- State is intentionally in memory: refresh, source hot reload or shell switching does not preserve the session. Both deliverable tabs were reset at completion.
