# Flash Analytics — PoC de supervisão segregada por banco (Flash Courier)

**Uma instância Twilio Flex, agentes compartilhados, dashboards e histórico segregados por banco.**
PoC local, sem deploy. Dados de demonstração **100% fictícios**.

```
flash-analytics/
├── plugin-flash-analytics/      Flex UI 2.x plugin (React 17 + TypeScript) — criado com twilio flex:plugins:create --typescript --flexui2
│   ├── src/domain/              Domínio puro (tipos, catálogo, política de acesso, métricas, transferência) — compartilhado com o backend
│   ├── src/providers/           mockDataProvider + analyticsApiClient (interface comum AnalyticsDataProvider)
│   ├── src/components/          UI: FlashAnalyticsApp + painéis + gráficos SVG (sem libs de gráfico)
│   ├── src/flex/                Flags, gate de UX por role, filtro da Real-Time Queues View (Arquitetura A)
│   ├── src/FlashAnalyticsPlugin.tsx   View "flash-analytics" + SideLink
│   └── preview/                 Preview standalone da View fora do Flex (sem login)
└── analytics-backend/           API Node (Arquitetura B) — enforcement real: token verificado, RBAC no servidor, 403 por padrão
    ├── src/auth/                demo HS256 (local) | Flex token via Twilio IAM (produção)
    ├── src/rbac/                identidade → papel + bancos (servidor)
    ├── src/sources/             taskRouterDataProvider · insightsDataProvider (data mart) · mocks
    └── config/                  *.example.json versionados; *.local.json ignorados pelo git
```

## Pré-requisitos

- Node 20.6+ (testado com 20.19.5), npm 10
- Twilio CLI 6.x + `@twilio-labs/plugin-flex` 7.x (só para rodar dentro do Flex)
- As ferramentas de dev (vitest, tsx, esbuild, eslint, TS 5) vêm do `node_modules` da raiz do monorepo. Fora dele, rode `npm install` nesta pasta.

## Comandos (todos locais — nenhum faz deploy)

```bash
cd apps/flash-courier-demo/flash-analytics
(cd plugin-flash-analytics && npm install)   # deps do plugin (Flex UI 2.18.1)

npm run check          # lint + typecheck (backend TS5 + plugin TS4) + testes + build do plugin
npm test               # 69 testes (domínio, providers, backend HTTP real, TaskRouter/IAM mockados)
npm run preview        # gera plugin-flash-analytics/preview/dist (abrir index.html no navegador)

cp analytics-backend/.env.example analytics-backend/.env   # e troque DEMO_JWT_SECRET por um valor aleatório (>=32 chars)
npm run backend              # API em http://127.0.0.1:8787 (mock por padrão)
npm run demo:cross-tenant    # chama o backend rodando com tokens assinados e imprime 200/403/400/401 reais
npm run token -- sup.itau@demo.flash.invalid supervisor     # gera token demo (1h)
```

### Rodar dentro do Flex (local, sem deploy)

```bash
cd plugin-flash-analytics
cp .env.example .env          # FLEX_APP_ANALYTICS_SOURCE=mock por padrão
twilio flex:plugins:start     # abre http://localhost:3000 com login na conta do perfil ATIVO do CLI
```

O item **Flash Analytics** aparece na SideNav para usuários com role `admin` ou `supervisor`. Isso é só um gate de UX; a autorização é do backend.
Confira antes qual perfil está ativo (`twilio profiles:list`). `flex:plugins:start` não altera a conta, mas faz login nela.

### Preview fora do Flex

- Mock: `preview/dist/index.html?profile=supervisor_itau&tab=security` (perfis: `flash_admin`, `supervisor_itau`, `supervisor_santander`, `supervisor_caixa`, `supervisor_c6`, `sem_vinculo`; abas: `live`, `history`, `agents`, `security`, `architecture`).
- Contra o backend local (Arquitetura B, **403 real na UI**): sirva `preview/dist` em `http://localhost:3000` (ex.: `python3 -m http.server 3000 --bind 127.0.0.1`) e abra
  `http://localhost:3000/index.html?api=http://127.0.0.1:8787#token=<token>`. O token fica no fragmento `#`, que o navegador não envia a servidores.

## Flags

| Onde | Variável | Valores |
|---|---|---|
| plugin `.env` | `FLEX_APP_ANALYTICS_SOURCE` | `mock` (padrão, com seletor de perfil demo) · `api` |
| plugin `.env` | `FLEX_APP_ANALYTICS_API_URL` | URL do analytics-backend |
| plugin `.env` | `FLEX_APP_ENABLE_QUEUES_FILTER` | `true` aplica `setFilter`/`setSubscriptionFilter` por SID (exige `source=api`) |
| backend `.env` | `AUTH_MODE` | `demo-hmac` (bloqueado com `NODE_ENV=production`) · `flex` |
| backend `.env` | `REALTIME_SOURCE` | `mock` · `taskrouter` |
| backend `.env` | `HISTORY_SOURCE` | `mock` · `insights-mart` |
| backend `.env` | `QUEUE_MAP_FILE`, `RBAC_FILE`, `MART_FILE` | arquivos locais (ver `config/*.example.json`) |

Nunca coloque segredos no `.env` do plugin: ele vai para o bundle do navegador.

## Arquitetura de dados

| Interface | Implementação | Onde roda | Estado |
|---|---|---|---|
| `AnalyticsDataProvider` (UI) | `mockDataProvider` | navegador | ✅ funcional (403 **simulado**, rotulado) |
| `AnalyticsDataProvider` (UI) | `analyticsApiClient` | navegador → backend | ✅ funcional, testado com o backend local |
| `RealtimeSource` | `taskRouterDataProvider` | backend | ✅ **validado read-only na conta dev** (bulk `RealTimeStatistics` + Workers por `TaskQueueSid`, cache TTL por SID) |
| `HistorySource` | `insightsDataProvider` | backend | ⚠️ lê um data mart JSON; **o ETL do Insights não foi implementado** |
| `HistorySource` / `RealtimeSource` | mocks | backend | ✅ |
| `TokenVerifier` | demo HS256 | backend | ✅ verificação criptográfica real (local) |
| `TokenVerifier` | Flex/IAM | backend | ✅ IAM `Tokens/validate` com API Key verificado na conta demo (rejeita token inválido); token real validado ao abrir o plugin no Flex |
| `TokenVerifier` | composto (Flex + demo) | backend | ✅ só para deploy de demo (aceita tokens demo assinados para scripts); desligar em produção |
| "Ver como" | `X-Flash-View-As` | backend | ✅ demo; somente admin verificado, somente restringe; testes em `viewAs.test.ts` |

Achado da integração: o bulk `POST /v1/Workspaces/{WS}/TaskQueues/RealTimeStatistics` aceita apenas **JSON `{"queueSids":[…]}`**. Corpo form-encoded retorna HTTP 415. Limites da doc: 1–50 SIDs por chamada, 5 req/s. O RealTimeStatistics não traz SLA, então a UI mostra `n/d` em vez de inventar o número.

## Testes de aceite (automatizados)

| Cenário | Teste | Resultado |
|---|---|---|
| Supervisor Itaú abre a view | `app.test.ts`, `providers.test.ts` | só CX_ITAU/CQ_ITAU; corpo sem strings de outros bancos |
| Supervisor Santander abre a view | idem | só Santander |
| Gestor Flash | idem | consolidado dos 4 bancos + fila compartilhada sinalizada |
| Agente fictício em três filas | `app.test.ts`, `domain.test.ts` | 1 Worker, elegível a CX_ITAU/CX_SANTANDER/CX_CAIXA; headcount único < soma de elegibilidades |
| Itaú tenta `?bankId=santander` | `app.test.ts` | **403 real** do servidor HTTP, corpo `{"error":"forbidden"}` |
| Claim forjado `banks:[santander]` em token válido | `app.test.ts` | ignorado: 403 |
| `queueSid`/`role`/`userId` na query | `app.test.ts` | 400 `unsupported_parameter` |
| Drill-down em fila de outro banco / inexistente | `app.test.ts` | 403 (mesma resposta, sem oráculo) |
| Usuário sem vínculo / role `agent` | `app.test.ts` | 403 em todos os endpoints |
| Token ausente, adulterado, expirado, `alg:none`, outro segredo | `app.test.ts` | 401 |
| Transferência CX→CQ | `domain.test.ts` | `bank_id`/`origin_bank_id`/`ticket_id` preservados; rota para CQ do mesmo banco; adulteração bloqueada |
| Fila CQ compartilhada | `app.test.ts` | admin: `bankId:null` + alerta, sem números por banco; supervisor: omitida + aviso |
| Falha da fonte de tempo real | `app.test.ts`, `providers.test.ts` | 502 sem dados; UI limpa os dados anteriores |
| Export histórico fora do escopo | `app.test.ts` | 403; export próprio só com o próprio banco; CSV protegido contra injeção de fórmula |
| Auditoria | `app.test.ts` | decisão registrada com identidade em hash (sem e-mail) |

**Esses testes não certificam isolamento numa conta Twilio real.** Testes manuais necessários no Flex estão em [SECURITY.md](SECURITY.md#testes-manuais-obrigatórios-no-flex).

## Roteiro de demo (3 minutos)

1. **(0:00) Uma conta, um agente, várias filas.** Aba *Agentes e filas* como **Gestão Flash**: o Agente 01 é uma identidade elegível a CX_ITAU, CX_SANTANDER e CX_CAIXA por atributos e target expressions. Headcount único 8 vs. soma de elegibilidades 16.
2. **(0:40) Troca de perfil.** *Tempo real*: Gestão Flash (9 filas, consolidado e chips por banco) → **Supervisão Itaú** (só CX/CQ Itaú, e a fila compartilhada some com aviso) → **Supervisão Santander**.
3. **(1:20) Tempo real e histórico.** Cards atualizando a cada 4 s, tendência de 60 min, tabela de filas. *Histórico*: 7 dias CX + CQ, primeira resposta e resolução, exportação CSV do próprio escopo. Mostrar o aviso de que Insights não é fonte de tempo real.
4. **(2:00) A × B.** *Segurança da segregação*: o modo A explica o que `setFilter`/`setSubscriptionFilter` **não** protegem. No modo B, como Itaú, `GET /queues?bankId=santander` dá **403 SIMULADO**. Em seguida, no terminal, `npm run demo:cross-tenant` mostra **403 reais** do backend (ou o preview em modo `?api=` com token Itaú).
5. **(2:40) Tese:** *"Podemos separar a experiência e os dados de supervisão sem multiplicar as instâncias de atendimento; o requisito de segurança determina a camada de reporting necessária."*

## Demo com a conta Twilio real (conta demo, perfil CLI `GusFlex`)

### O que existe na conta (criado com autorização; tudo marcado e removível)

| Recurso | Detalhe |
|---|---|
| 10 TaskQueues | `CX_/CQ_` × Itaú, Santander, Caixa, C6_PIP; `CQ_FRANQUIAS_COMPARTILHADA` (multibanco); `TRIAGEM_FLASH_SEM_BANCO` (target `1==2`, default do Workflow) |
| 1 Workflow | `flash-demo — roteamento por bank_id + tower` (filtros `bank_id == "<banco>" AND tower == "<CX\|CQ>"`) |
| 8 Workers fictícios | `flash-demo-agente-01..08`, atributo `flash_demo: true`, `routing.banks/towers`; o **01 é elegível a CX_ITAU, CX_SANTANDER e CX_CAIXA** |
| ~36 Tasks fictícias | canal `default`, `flash_demo: true`, `bank_id`/`tower`/`ticket_id`; 11 aceitas (em andamento), o resto aguardando; 1 transferida CX_SANTANDER → CQ_SANTANDER mantendo `bank_id` |

Os Workers/usuários Flex reais **não** foram alterados (sem atributos `routing.*`, então não recebem reservas dessas Tasks). Nenhum plugin foi publicado.

```bash
# credenciais só no ambiente do processo (API Key do perfil do CLI ou outra de privilégio mínimo)
export TWILIO_API_KEY=SK… TWILIO_API_SECRET=… TASKROUTER_WORKSPACE_SID=WS…
npm run seed:demo        # idempotente: recria Workers/Tasks fictícios e regrava config/queue-map.local.json
npm run seed:cleanup     # remove Tasks/Workers/Workflow/filas extras do demo (adicione -- --all para remover também as 8 filas)
```

### Rodar a demo dentro do Flex (sem deploy)

1. **Backend local, modo real:** `AUTH_MODE=flex` valida o token Flex do usuário no Twilio IAM (aceita API Key), `REALTIME_SOURCE=taskrouter` e `DEMO_VIEW_AS=true`:
   ```bash
   export TWILIO_ACCOUNT_SID=AC… TWILIO_API_KEY=SK… TWILIO_API_SECRET=… TASKROUTER_WORKSPACE_SID=WS…
   AUTH_MODE=flex REALTIME_SOURCE=taskrouter DEMO_VIEW_AS=true CACHE_TTL_MS=5000 \
   QUEUE_MAP_FILE=analytics-backend/config/queue-map.local.json RBAC_FILE=analytics-backend/config/rbac.local.json \
   npm run backend
   ```
   `config/rbac.local.json` (fora do git) mapeia os usuários Flex reais da conta como `flash_admin` e mantém as identidades demo. Qualquer outro usuário recebe 403 (deny-by-default).
2. **Flex local com o plugin:** `plugin-flash-analytics/.env` com `FLEX_APP_ANALYTICS_SOURCE=api`, `FLEX_APP_ANALYTICS_API_URL=http://localhost:8787` e `FLEX_APP_DEMO_VIEW_AS=true`. Depois:
   ```bash
   cd plugin-flash-analytics && twilio flex:plugins:start   # http://localhost:3000/flash-analytics
   ```
3. Na tela:
   - **Fonte de dados:** Conta Twilio (TaskRouter real) ou Simulação offline (fallback para a apresentação).
   - **Ver como (aplicado no servidor):** troca para Supervisão Itaú/Santander. O backend só permite que um admin verificado **restrinja** o próprio escopo, nunca amplie. O teste cruzado na aba Segurança devolve **403 real**.
   - **Segurança → A → "Aplicar filtro A nesta sessão":** aplica `setFilter`/`setSubscriptionFilter` com os SIDs do escopo atual. Abra *Queues Stats* no menu do Flex para ver a Real-Time Queues View filtrada e use "Remover filtro" para voltar.

### Backend em Twilio Functions (preparado, NÃO publicado)

`serverless/` empacota o mesmo núcleo em uma Function pública por rota (`npm run serverless:build`). O mapa de filas e o RBAC vão como *private assets*, e as credenciais como variáveis da Function (`FA_API_KEY`/`FA_API_SECRET`). Com o backend em HTTPS, o plugin pode ser publicado e funciona em `flex.twilio.com` para qualquer usuário:

```bash
cd serverless && twilio serverless:deploy --service-name flash-analytics --environment demo --runtime node22 --env .env
# depois: FLEX_APP_ANALYTICS_API_URL=https://flash-analytics-XXXX-demo.twil.io no .env do plugin
cd ../plugin-flash-analytics && twilio flex:plugins:deploy --changelog "Flash Analytics PoC" && twilio flex:plugins:release --plugin plugin-flash-analytics@<versão> --name "Flash Analytics demo"
```

O deploy foi bloqueado pela política de permissões desta sessão e precisa ser executado/aprovado pelo usuário. O `release` cria uma configuração **a partir da release ativa** (mantém o plugin ativo existente) e afeta todos os usuários da conta.

## Mudanças propostas (NÃO aplicadas — requerem aprovação)

| Área | Proposta |
|---|---|
| **TaskRouter Workflow** | Filtros `bank_id == "<banco>" AND tower == "<CX\|CQ>"` → fila correspondente; default sem banco vai para fila de triagem, nunca para fila de outro banco |
| **Workers** | Atributos `routing.banks` / `routing.towers` (ex.: Agente multibanco `["itau","santander","caixa"]`, `["CX"]`), mantidos pelo SSO/admin, não pelo agente |
| **Tasks / integrações** | `bank_id`, `tower`, `ticket_id` definidos pela integração que cria a Task (JALL/URA/API); transferência CX→CQ preserva o banco de origem |
| **Event Streams** | Assinar eventos TaskRouter para métricas por Task/etapa com `bank_id` (necessário para qualquer quebra em fila compartilhada) |
| **Roles / SSO** | Claim de banco no IdP → RBAC do backend. Supervisores com isolamento rígido não devem ter role nativa com acesso irrestrito (ver SECURITY.md) |
| **Functions / backend** | Publicar o analytics-backend (Functions ou serviço próprio) com `AUTH_MODE=flex`, API Key de privilégio mínimo, rate limit e logs centralizados |
| **Insights** | Restringir acesso de supervisores de banco; ETL Export API → data mart com RLS por `bank_id` |
| **Flex plugin** | Deploy/release do plugin; opcionalmente ativar o filtro A |

## Limitações conhecidas

- O 403 da UI em modo mock é **simulado**. O 403 real está no backend (testes + `demo:cross-tenant` + preview `?api=`).
- O verificador de token Flex segue o contrato do `twilio-flex-token-validator`, mas não foi exercitado com token real.
- ETL do Insights, Event Streams, rate limiting e paginação do histórico não foram implementados.
- O filtro A não foi testado dentro do Flex. `setSubscriptionFilter` é aplicado no `init` antes do `/me` (deny-all) e reaplicado depois; validar no Flex se a reaplicação ressincroniza as assinaturas.
- O avaliador de target expressions cobre só `HAS`, `==`, `AND`, `OR`, `1==1` (usado no mock/testes; em modo TaskRouter a elegibilidade vem da própria API).
- O webpack do template exigiu `overrides` (`webpack@4.47.0`, `@types/node@20.19.25`) para o `flex-plugin-scripts@7.1.2` funcionar com o npm atual.
