# BetMGM Player Care

Real Twilio Flex plugin + mandatory offline presentation shell. One shared customer-care workspace: conversation, Case, player context, knowledge and intelligence. Portuguese UI. All scenario data and actions are synthetic. No betting, payments, account changes, KYC processing, messages, or self-exclusion are executed.

## Start here

Run commands from the repository root (`twilio-customer-demos`). Dependencies are already installed on this machine. Do not run a workspace-wide install or build just for this demo.

### Primary: real Flex plugin

```sh
npm run plugin:start --prefix apps/betmgm
```

Open **http://localhost:3004/betmgm-inbox/** (recommended meeting bookmark), or **http://localhost:3004/**, which now lands in the BetMGM Inbox. Complete normal Twilio login if requested and use account/profile **GusFlex**. The first five Flex navigation items are **Inbox → Cases → Players → Knowledge → Supervisor** (expand the hamburger to see labels). **Inbox** renders Lucas and Ana without a real TaskRouter task. The native Agent Desktop remains available separately under **Live Tasks**; its empty state is expected and is not the demo Inbox. The CLI also starts a plugin asset server on **127.0.0.1:3104**. Keep the terminal running. After a source update, refresh the Flex tab once before rehearsal. No backend API is needed on port 3004; it is used by the local Flex shell instead.

This executes `twilio flex:plugins:start --profile GusFlex --port 3004 --include-remote` from `apps/betmgm/plugin-betmgm`. It includes currently active remote plugins for compatibility. No deployment or release is required. Do not use deploy/release/create-configuration commands.

Authenticated startup and the initial test plugin were validated on 2026-09-30. The existing remote plugins did not prevent the BetMGM custom view from loading. Flex displayed a nonblocking **InsightsService network/CORS error for localhost**. See [validation](docs/validation.md) for final checks.

### Meeting fallback

The prebuilt fallback requires no login, internet, Twilio, AI, database, Docker, Redis, tunnel, or API:

```sh
npm run start --prefix apps/betmgm
```

Open **http://127.0.0.1:5176/**. This serves `apps/betmgm/dist` using a dependency-free Node static server. Its Content Security Policy blocks all fetch/WebSocket connections (`connect-src none`) and permits scripts/fonts only from the local server. To rebuild locally before presenting:

```sh
npm run build --prefix apps/betmgm
npm run start --prefix apps/betmgm
```

For development instead of the offline server:

```sh
npm run dev --prefix apps/betmgm
```

Do not run development and the offline server simultaneously on 5176. Ports use strict matching: stop the previous BetMGM process if occupied. Other demos use their own existing ports and were not changed.

**Fallback procedure:** open the fallback tab, click **Reiniciar Demo → Reiniciar agora**, and start the same talk track. Plugin and fallback share source code, but have **separate in-memory sessions**. A switch does not copy the live presentation state. Refresh, dev hot-reload, or closing the tab resets state. Keep both tabs ready and avoid editing source during the meeting.

## Architecture and isolation

```text
apps/betmgm/
  shared/domain.ts          fixtures, deterministic routing, CaseService, transitions
  shared/Workspace.tsx      all five views, contextual tabs, presenter dialogs
  shared/styles.css        scoped .bmg theme; no generated Flex CSS overrides
  fallback/main.tsx        React 19 standalone entry
  plugin-betmgm/            official CLI scaffold, React 17 + Flex UI 2.18.0
    src/BetmgmPlugin.tsx    supported Flex views, SideLinks, local UI theme/header
    webpack.config.js      compile shared source with the plugin; React external
  docs/                    inspection, validation evidence
  dist/                    offline static build
```

`InMemoryCaseService` implements a small `CaseService` contract with `getSnapshot`, `subscribe`, and `dispatch`. Both shells import the same service and components. State includes Cases, messages, notes, assignments, SLA reference, Knowledge history, drafts, checklist and application events. All views share state **within the same shell**; navigating between native Flex views does not recreate the Case service. Supervisor metrics and Knowledge fixtures are immutable and deterministic, so reset restores the full scenario consistently.

Production persistence belongs to a **BetMGM-owned Case Service, CRM/data platform or custom datastore**, selected through architectural design. Flex is the agent workspace and orchestrates work; **Flex is not the Case database**. Conversations and Cases have different lifecycles and identifiers. Ending an interaction does not resolve the Case; resolving a Case does not erase its interaction history.

No imports, server routes or shared mutable state connect this demo to CarePlus, Boti or Aché. Root package files and lockfile remain unchanged. Plugin dependencies are isolated in its own node_modules and package-lock.json. The fallback uses dependencies already installed at the workspace root.

For reinstalling only the plugin dependencies, if necessary:

```sh
cd apps/betmgm/plugin-betmgm
npm ci --workspaces=false --no-audit --no-fund
```

Node 20.19.5 was used. The official scaffold uses TypeScript 4; Node type definitions are pinned to 18.19.0 for parser compatibility. Type definitions do not change the runtime Node version. The scaffold's transitive dependency warnings are recorded as a meeting risk; do not perform a broad upgrade before the meeting.

## Real Flex programmability

- Official `FlexPlugin` lifecycle and `loadPlugin` entrypoint.
- `ViewCollection.Content.add` registers Inbox, Cases, Players, Knowledge and Supervisor under `betmgm-*` routes.
- `SideNav.Content.add` / `SideLink` and `NavigateToView` implement native navigation; active view follows the public Flex view state. The five demo links sort first. The native `agent-desktop` navigation entry is replaced by a secondary **Live Tasks** link without replacing the native view.
- Supported `ViewCollection.defaultProps.defaultLocation` selects `/betmgm-inbox/` for root startup. A one-time mounted header extension redirects an initial `/agent-desktop/` landing to Inbox. Later clicks on Live Tasks are not intercepted; custom deep links remain intact.
- `Manager.updateConfig({theme: ...})` sets local supported MainHeader and SideNav theme overrides; this updates client configuration only, not the account Configuration REST resource.
- `MainHeader.Content.add` adds BetMGM Player Care while preserving recognizable Twilio Flex chrome.
- `FLEX_HOST` renders workspace content only: no standalone sidebar, duplicate application header or synthetic agent avatar. Presenter actions sit in a small content toolbar; native Flex branding and worker availability stay visible. `STANDALONE_HOST` retains the original full fallback shell.
- Scoped custom components style the synthetic task list, conversation, context tabs, buttons, Knowledge and Case screens. Host-only spacing lives in `plugin-betmgm/src/host.css` and cannot change the fallback CSS.
- Official webpack extension points include the shared sources. React remains the Flex host's React 17 in the plugin; the standalone uses React 19. No Flex core fork, compiled CSS patch, native TaskRouter action, or service write.

The synthetic Inbox is a **custom Flex view**, not real incoming Flex tasks. The displayed agent assignment is scenario data, separate from the logged-in Flex worker. Native outbound controls remain part of the existing Flex environment; they are not used by this demo. Local demo actions never invoke them.

References: [Custom views and routes](https://www.twilio.com/docs/flex/developer/ui/custom-views-and-routes), [supported theming](https://www.twilio.com/docs/flex/developer/ui-and-plugins/themes-branding-styling), [Plugin CLI](https://www.twilio.com/docs/flex/developer/plugins/cli/reference), [Flex Email setup](https://www.twilio.com/docs/flex/admin-guide/setup/email).

## Brand and visual choices

The public Brazil website was blocked by the corporate web policy; no bypass was attempted. This is a **temporary BetMGM-inspired palette, not verified exact brand compliance**.

- Header/navigation: charcoal `#171b18`.
- Selected states and small highlights: warm gold `#b69a58`; light gold `#f3eedf`.
- Canvas: warm off-white `#f6f7f3`; operational surfaces: white.
- Text: charcoal `#242724`; semantic green for positive/policy states, amber for attention.
- System fonts work offline. Restrained serif wordmark in the fallback is typographic branding, not an official logo asset.
- Conversation is central; right-side Player / Case / Assist / Knowledge tabs disclose one context at a time. Secondary detail stays inside scrollable panels and dialogs.
- No promotional, sportsbook, casino, odds, or game imagery.

## Presenter capability map

| Capability | Category | What actually runs here |
|---|---|---|
| Flex Agent UI, navigation, plugin lifecycle | NATIVE TWILIO | Authenticated Flex UI hosts the plugin; fallback is a local representation |
| Flex Plugins and UI customization | NATIVE platform + CUSTOM | Supported extensions, custom views, header, theme and components |
| TaskRouter | NATIVE TWILIO | Account workspace exists; displayed routing decisions are local deterministic fixtures, no tasks created |
| Twilio channels and Flex Email | NATIVE TWILIO | Email setup evidence exists; scenario channels and messages are local, no live delivery |
| Supervisor operations | NATIVE product + CUSTOM view | Custom operational view with synthetic metrics, not a live queue feed |
| Conversation Orchestrator | NATIVE product concept | Target architecture only; not connected or provisioned |
| Conversation Memory | NATIVE product concept + DEMO | Safe local historical summaries, not a Memory service connection |
| Enterprise Knowledge | NATIVE product concept + DEMO | Five local policy articles with synthetic approval/version/source data |
| Conversation Intelligence | NATIVE product concept + DEMO | Deterministic intent, sentiment, summary, policy and operational signals |
| Case Center / Player 360 | CUSTOM / FLEX PLUGIN | Fully programmed views and workflows |
| Case persistence | CUSTOM / BETMGM architecture | In-memory CaseService; not a native Flex ticket/Case object |
| Payment, KYC and account context | BETMGM SYSTEM INTEGRATION + DEMO | Synthetic operational labels only |
| Responsible Gaming action | DEMONSTRATIVE | Checklist and specialist handoff only; no account block or self-exclusion |
| Assist | DEMONSTRATIVE | Source-linked deterministic response, no model/API call |

**Do not say “this is a native Flex Case object,” “an email just arrived,” “AI classified a real conversation,” or “the account was blocked.”** Say “custom Case layer,” “simulated email return,” “demonstrative intelligence outputs,” and “specialized workflow.”

The `channelAdapter` seam is intentionally offline, with liveEmailEnabled and liveAIEnabled false. There is no operational live adapter to accidentally enable. A future live test requires a server-side adapter, explicit credentials/account selection, approval for sends, and separate tests. No OpenAI key is loaded or required.

## 9-minute talk track

| Time | Presenter action | Story |
|---|---|---|
| 0:00–0:45 | Open BetMGM Inbox. Show Lucas, queue, priority, visible intent/sentiment. Expand “Entender encaminhamento.” | **“Esse cliente não chegou como uma mensagem. Ele chegou como trabalho contextualizado.”** |
| 0:45–1:30 | Player tab: ID, safe verification label, preferences, Contexto anterior. | Minimum operational context reaches the agent; financial/KYC records remain in BetMGM systems. |
| 1:30–2:15 | Case tab: BET-18472, owner, 18-minute reference SLA, persistent history. | **“Até aqui eu não estou mostrando apenas chat. Estou mostrando interação + Case.”** |
| 2:15–3:15 | Knowledge tab → Ver fonte → close. Assist → Usar resposta → Enviar resposta. | **“O conhecimento participa da conversa.”** The response cites an approved-in-demo source and remains agent reviewed. |
| 3:15–4:00 | Case: add “Evento PIX pendente. Seguir validação pelo fluxo seguro.” Click Solicitar validação. | Demonstrative action updates the Case and prepares a response. Nothing reaches a payment/KYC system. |
| 4:00–4:45 | Transferir → review summary → Transferir para Verification. | **“Troquei de agente, não de história.”** Owner changes to Rafael; Case, notes, SLA and source history survive. |
| 4:45–5:30 | Encerrar interação. Open Cases, search Lucas, inspect Case timeline. | **“A interação pode terminar. O Case continua.”** Do not resolve Lucas yet. |
| 5:30–6:15 | Inbox → Simular novo contato → Email → Criar interação Email simulada. | **“O cliente mudou de canal. O contexto não recomeçou.”** Same BET-18472, new interaction, prior summary, notes and Knowledge recovered. |
| 6:15–7:15 | Select Ana. Show specialized routing, Assist/Knowledge, then Case checklist and specialist handoff. | **“Não estamos roteando um canal. Estamos roteando significado e política.”** No promotional/retention action or actual self-exclusion. |
| 7:15–8:00 | Supervisor → PIX signal → inspect anonymized example and suggested investigation. | **“As próprias conversas começam a explicar o que está acontecendo na operação.”** Metrics/signals are synthetic. |
| 8:00–9:00 | Architecture. Then optionally Players and full Knowledge library. | **“Um único workspace para a conversa, o caso, o contexto do jogador, conhecimento e inteligência.”** Explain native platform versus the BetMGM business layer. |

Always start with Reiniciar Demo. To replay email continuity, keep Lucas's Case open and end the current interaction before simulating a new contact. Case resolution has no dependency on a chat being active. Ana's Case requires the policy checklist before resolution. The 18-minute SLA is a scenario reference, not a live countdown. Timeline times are deterministic presentation time, not a clock or external audit feed.

## Likely customer questions

**Where does the Case live?** In this demo, memory in the app session. In production, in a BetMGM-owned case service or chosen CRM/data platform. Flex hosts the experience and routes work.

**Can the conversation end without losing work?** Yes. The Case ID and notes survive interaction closure and a new channel return within this session. Production needs durable persistence and identity/correlation rules.

**Is this real Twilio Flex?** The primary screen runs as a real local plugin inside authenticated Flex, using supported extension APIs. The scenario tasks/messages remain synthetic. The offline shell is separately identified as standalone.

**Is Email real?** Flex Email is a real capability and configuration evidence exists in this account. This demo never sends or receives email. Live operation needs domain/sender configuration, verified routing, permissions and delivery tests.

**Does the AI actually run?** No external AI is needed. Intent, sentiment, summaries and suggestions are deterministic demonstration outputs. Production outputs require configured Twilio products, grounding, access controls, evaluation and human review.

**Are these official policies?** No. Every Knowledge source and approval is synthetic. BetMGM must supply approved procedures, owners, versions and review cadence, especially Responsible Gaming and verification.

**Where is sensitive data?** Not in the fixtures. Production financial/KYC documents and credentials stay in BetMGM systems of record. Only allowlisted labels/references reach the workspace.

**Will existing tools/plugins be replaced by this installation?** Nothing is installed in the account. Local development loads this plugin alongside existing remote plugins. Account-side changes need a separate deployment plan and authorization.

**Does “Resolver caso” unblock or credit an account?** No. It only sets a demonstrative operational outcome. Real business actions require separate, authenticated system-of-record APIs and policy controls.

## Production integration requirements

1. Durable Case Service: access control, versioned updates, idempotency, assignment ownership, real SLA calculation, audit history, search and retention.
2. Player identity/correlation: trustworthy channel-to-player mapping, consent/preferences and open-Case matching; no identity inferred from unverified message text.
3. BetMGM payment/verification/account APIs: expose minimal operational state and secure action references; document handling stays outside chat/notes.
4. Responsible Gaming: validated policy, specialist capacity, audit controls, user-facing confirmation and authorized systems to execute any real restriction.
5. Twilio channels and TaskRouter: tested inbound routes, workers/skills, queues, workflow attributes, permissions and account/environment separation.
6. Flex Email: authenticated domains/addresses, lifecycle handling, delivery tests and attachment governance. Do not reuse a configured address without authorization.
7. Conversation layer: separately configure and validate Knowledge, Memory, Intelligence and orchestration products, including regional availability, entitlement, data retention and grounding.
8. Operational metrics: replace synthetic aggregates with authorized queue/intelligence feeds. Investigative suggestions do not prove root cause.
9. Deployment: staged plugin validation, compatibility testing, release/rollback, access controls and monitoring, only after explicit approval.

## Security and presentation boundaries

- No `.env` file is read by the fallback or shared modules (`envDir: false`). No Twilio/Auth/OpenAI credentials enter frontend code.
- `.test` contact addresses and masked phones are synthetic; no bank/card details, identity numbers, documents or gambling history exist.
- Notes and drafts use normal escaped React text. No arbitrary HTML rendering or remote source links in the Knowledge viewer.
- Reset clears the entire in-memory scenario. Browser refresh also resets; no sensitive data is persisted to localStorage.
- In the plugin, the real Flex shell still authenticates and communicates with Twilio as normal. The custom domain service itself makes no network calls.
- The installed CLI 7.1.2 **binds its static Flex shell on all interfaces on port 3004** despite HOST configuration. Its plugin asset server is set to loopback 3104. Do not treat the CLI dev server as production hosting. Use localhost, a trusted meeting network, and stop the process afterward. The standalone server binds only 127.0.0.1.
- No Twilio account resources were provisioned or changed by demo code; no send, deployment, release, commit or push was performed. Browser authentication has the normal session effects of entering Flex.

## Validation commands

```sh
npm run lint --prefix apps/betmgm
npm run typecheck --prefix apps/betmgm
npm run test --prefix apps/betmgm
npm run build --prefix apps/betmgm
npm run plugin:lint --prefix apps/betmgm
npm run plugin:typecheck --prefix apps/betmgm
npm run plugin:build --prefix apps/betmgm
```

Tests cover Case independence, handoff data preservation, source grounding, closed-interaction guards, email correlation, Responsible Gaming isolation, required checklist, draft isolation, reset, original message authorship, valid timeline timestamps and offline view rendering. Browser validation covers both shells; see [validation.md](docs/validation.md).

## Meeting risks

- Flex still depends on internet, CDN assets, Twilio login and existing remote plugins. Open it before the meeting. The fallback removes those dependencies.
- InsightsService CORS/network warning was visible on localhost; custom BetMGM views remained usable. Supervisor values are local synthetic data, not Insights.
- Existing remote plugins and native controls remain in the real shell. Expand native navigation and stay in BetMGM's five modules.
- Source edits/hot reload and browser refresh reset demo state. The production fallback build is more stable for a rehearsed walkthrough.
- The two shells do not synchronize session state; switching fallback means restarting the short story.
- Exact BetMGM brand values and policies remain unverified. Present as an illustrative future-state customer-care experience.
- No live customer contact, live routing, real financial action, or real Responsible Gaming restriction is demonstrated.

## Exact navigation for tomorrow

1. Open **http://localhost:3004/betmgm-inbox/**. Confirm the native TWILIO FLEX header and worker availability are visible. Expand the hamburger if labels are collapsed; **Inbox** is the first link.
2. **Reiniciar Demo → Reiniciar agora**. Lucas appears in Meu trabalho without a native Task.
3. **Player → Case → Knowledge → Assist → Usar resposta → Enviar resposta**.
4. **Case → Adicionar nota → Solicitar validação → Transferir → Transferir para Verification**.
5. **Encerrar interação → Cases**. Show the still-open BET-18472, note, SLA and timeline.
6. **Inbox → Simular novo contato → Email → Criar interação Email simulada**. Same Case, new interaction.
7. Select **Ana Martins → Knowledge / Assist → Case**. Show the policy checklist and **Encaminhar ao especialista**.
8. Use native **Players**, **Knowledge**, **Supervisor → PIX signal**, then **Arquitetura**.
9. **Live Tasks** is a secondary, real native desktop; it may show no active tasks. Return using the first **Inbox** link.

All these demo operations stay inside Flex and use the same local CaseService as the fallback. Neither a real Task nor a real message is required.
