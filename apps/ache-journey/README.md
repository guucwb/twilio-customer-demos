# Aché Journey Migration Lab

Preservar a jornada. Trocar a camada de comunicação.

Lab isolado em `apps/ache-journey`, com UI pt-BR e direção visual reaproveitada do Aché existente. Nenhum aplicativo existente, arquivo raiz, recurso Twilio ou ambiente Salesforce foi alterado. Nenhum commit/push.

## Executar localmente

Com as dependências já presentes neste workspace:

```sh
npm run dev --prefix apps/ache-journey
```

- Demo: http://127.0.0.1:5179
- API e versão construída: http://127.0.0.1:3004 (após build)
- Configuração standalone: http://127.0.0.1:5179/activity/index.html
- Contrato dinâmico: http://127.0.0.1:3004/activity/config.json

Portas 5179/3004 são exclusivas deste lab, com Vite em strictPort. `npm run build --prefix apps/ache-journey` e `npm run start --prefix apps/ache-journey` servem a aplicação construída sem Vite. Tudo que o núcleo precisa está local: fontes, Postmonger e assets; sem Salesforce, banco ou chamadas externas. Um checkout novo precisa instalar dependências antes de trabalhar offline. O lockfile raiz existente não foi alterado; estas dependências já existem no workspace.

## Experiências

Journey antes/depois usa exatamente os mesmos nós, posições e conexões. Apenas o título da atividade WhatsApp muda. Análise: 12 componentes sintéticos, 9 hipóteses de preservação, 1 substituição, 2 validações (consentimento e engagement). Isso não é uma estimativa de migração de Aché.

Assessment: 10 perguntas guiadas, notas, exportação JSON e impacto manual BAIXO/MÉDIO/ALTO, inicialmente não determinado. Checklist: 13 itens, status editáveis. Dados ficam no navegador; reiniciar apaga notas, checklist, configuração local, resultado, destinatário e confirmações. Sem envio de notas ao Salesforce.

## Contrato Salesforce

`server/contract.ts` gera o config.json servido pelo backend. `public/activity/config.json` é um exemplo para revisão, com host e chave placeholders; hospedagem deve usar o contrato dinâmico ou substituir os placeholders do exemplo. Estrutura: workflowApiVersion 1.1, Rest, metaData/message, lang pt-BR/en-US, arguments.execute, inArguments/outArguments, userInterfaces.configModal e configurationArguments com applicationExtensionKey e save/validate/publish/unpublish/stop.

Timeout 20s, retryCount 0 (para evitar duplicação de mensagens por retries automáticos), retryDelay 1s, concorrência 1. OutArguments executionMode/providerStatus representam resultado de execução, nunca delivered/read inventados. O execute responde um objeto com esses campos. Não há integração de callbacks de entrega/leitura/resposta/clique nem garantia de uso desses campos em splits sem validação no tenant.

`public/activity/customActivity.js` usa Postmonger real vendorizado (0.0.14, fonte indicada por Salesforce, licença junto ao arquivo): ready, initActivity, updateButton, clickedNext, clickedBack, gotoStep, updateActivity; preserva a definição recebida e grava inArguments/metaData.isConfigured. Não solicita tokens Salesforce, pois este lab não chama APIs do tenant.

POST `/api/activity/execute` e os cinco endpoints de lifecycle exigem JWT HS256 com assinatura válida e expiração, usando segredo apenas no backend. Save/validate/publish fazem validação básica de configuração; não validam existência de atributos, templates ou consentimento no cliente. `/api/simulate` recebe JSON local separado. Todos os endpoints de atividade permanecem em demonstração neste lab, inclusive quando o envio opcional do apresentador estiver habilitado.

Bindings `{{Contact.Key}}` e `{{Event.DEMO.*}}` são exemplos. O simulador resolve somente os valores sintéticos conhecidos. Outro binding sem valor gera erro, sem fingir resolução Salesforce. Phone e contactKey reais deverão ser escolhidos com Aché, usando o Event Definition Key real, dados e contexto do tenant.

Fontes oficiais consultadas:
- [Custom Activity Configuration](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/custom-activity-config.html)
- [Build Custom Activities and Events](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/creating-activities.html)
- [Postmonger Events Reference](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/using-postmonger.html)
- [Encode Custom Activities Using a JWT](https://developer.salesforce.com/docs/marketing/marketing-cloud/guide/encode-custom-activities-using-jwt.html)
- [Twilio: envio de templates](https://www.twilio.com/docs/content/send-templates-created-with-the-content-template-builder)

## Twilio: real versus simulado

Nomes de variáveis do `.env` raiz foram inspecionados sem imprimir valores. Há configuração de sender WhatsApp, mas nenhuma configuração específica de template deste lab; existência/aprovação de recursos no provider não foi verificada e nenhum recurso foi modificado. O sender do exemplo e Content SID de zeros são placeholders; o destinatário sintético não é destino pessoal.

Backend carrega root `.env` e, opcionalmente, `.env` local. Credenciais nunca usam prefixo VITE_ nem são retornadas à UI. Variáveis de outros demos não habilitam live aqui.

Para envio opcional, criar `.env` local a partir de `.env.example` e configurar no servidor:
- ACHE_JOURNEY_LIVE_ENABLED=true (default false)
- ACHE_JOURNEY_WHATSAPP_FROM: sender revisado e autorizado
- ACHE_JOURNEY_CONTENT_SID: template WhatsApp aprovado e revisado
- TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN backend-only; EXPECTED_TWILIO_ACCOUNT_SID, quando presente, deve corresponder.

Configurar a atividade com os mesmos sender/template. Informar destinatário demo em E.164 na UI, confirmar opt-in/template e confirmar explicitamente envio para esse destinatário. Nenhum destinatário é lido do root `.env` ou hardcoded para live. Endpoint separado `/api/live` usa SDK Twilio messages.create com from, to, contentSid, contentVariables. Não usa body livre. Apenas SID/status realmente retornados aparecem; queued não significa delivered ou read.

Deduplicação em memória por requestId evita repetição de uma mesma requisição no processo; não é garantia durável exactly-once. Em falha/timeout, o resultado pode ser incerto: verificar Twilio antes de tentar outro envio. Não há retry automático. Erros externos são sanitizados. Nenhum envio real foi realizado para validar este lab.

Antes de publicar: remover/proteger as rotas locais simulator/live/readiness, adicionar autenticação de apresentador se o live for exposto, HTTPS, política CSP/frame-ancestors adequada ao tenant, limites de taxa e armazenamento durável de idempotência/observabilidade sem segredos. O servidor atual escuta somente loopback; não foi publicado. Segredo JWT do Installed Package deve ser configurado com Aché. Validação JWT local não comprova compatibilidade com tokens do tenant.

## Runbook de instalação: Aché executa no próprio tenant

Twilio pode orientar por compartilhamento de tela; nenhum acesso de Twilio ao ambiente do cliente é presumido.

1. Aprovar hospedagem pública HTTPS e preparar endpoint `/activity/`, chave do componente e segredo JWT backend. Revisar controles acima. Manter execução em demonstração no primeiro teste.
2. Aché cria/abre um Installed Package adequado ao ambiente de teste.
3. Aché adiciona componente Journey Builder Activity e informa URL pública da aplicação (`https://host/activity/`, com config.json/index disponíveis). Copiar a chave real do componente para ACHE_JOURNEY_EXTENSION_KEY; nunca inventar chave/API.
4. Confirmar config.json, assets, iframe e comunicação Postmonger no Journey Builder real; revisar JWT usando o mecanismo de assinatura do package conforme documentação Salesforce.
5. Aché clona uma Journey representativa para teste. Não alterar Journey ativa.
6. Na cópia, substituir somente a atividade específica de WhatsApp pela atividade Twilio. Inventariar qualquer comportamento dependente do canal antes de afirmar preservação.
7. Configurar Contact Key, destinatário, Event Definition Key, atributos, template e consentimento reais; revalidar bindings após cópia.
8. Aché valida a Journey e corrige configurações/lifecycle, observando a resposta de validação no tenant.
9. Aché executa com contato de teste autorizado. Nesta versão, execute do tenant valida e simula; para provar envio iniciado por Journey Builder, adaptar explicitamente o backend de execute para o provider com autenticação, consentimento, idempotência durável e política aprovada. O endpoint live do apresentador não prova execução por Journey Builder.
10. Comparar regras, waits, splits, personalização, consentimento, resultados e dependências de eventos. Documentar componente por componente o delta real e necessidades de downtime/rollback. Só depois planejar migração das demais Journeys.

## Entradas necessárias de Aché

Solicitar durante screen share ou por material aprovado, sem credenciais ou dados pessoais de produção:
- Captura/exportação sanitizada do grafo representativo e configurações da atividade atual; nome/provider/versão e Custom Activities instaladas.
- Entry Source, Event Definition Key, nomes/tipos dos campos das Data Extensions e relacionamento com Contact Key; exemplos sintéticos dos bindings.
- Templates atuais, idioma, variáveis, URLs/tracking, estado de aprovação e requisitos de migração.
- Consentimento/opt-in/opt-out, origem, armazenamento, revogação e responsável pelas regras.
- Configuração de decisões downstream e dependências delivered/read/click/reply; payloads sanitizados dos eventos, automações e integrações atuais.
- Quantidade de Journeys semelhantes, criticidade, restrições de disponibilidade e janela de mudança/rollback.
- Responsável Aché por Installed Package, publicação e testes; critérios de aceitação e contato de teste autorizado.

## Talk track (6 minutos)

1. 0:00–0:45 — Enunciar a pergunta de migração e hipótese. Identificar grafo como representativo, sem garantia de zero alterações.
2. 0:45–1:45 — Journey antes, depois e Comparar. Mostrar mesmas posições/conexões e troca da atividade WhatsApp.
3. 1:45–2:30 — Analisar impacto: números sintéticos 9/1/2, consentimento/engagement e dependências de eventos.
4. 2:30–3:45 — Configurar Custom Activity, salvar e simular execução. Inspecionar inArguments; explicar que providerStatus=not_called não é delivery e não é execução no tenant.
5. 3:45–4:30 — Arquitetura: Salesforce retém lógica, Twilio executa mensageria; discutir retorno de eventos ainda sujeito a projeto/validação.
6. 4:30–5:30 — Assessment/checklist: perguntar provider, dados, consentimento e decisões downstream; manter impacto não determinado até obter evidências.
7. 5:30–6:00 — Painel de evidências e próximos passos: Aché clona/testa no tenant, documenta delta; Twilio orienta. Reiniciar para próxima conversa.

## Verificação

```sh
npm run lint --prefix apps/ache-journey
npm run typecheck --prefix apps/ache-journey
npm run test --prefix apps/ache-journey
npm run build --prefix apps/ache-journey
```

14 testes: contrato, classificação, mapping, reset, offline, canal único WhatsApp, entradas inválidas, JWT, falha do provider, ausência de delivery/SID simulados, segredos, confirmação/live e resposta/deduplicação do provider substituto. Testes HTTP precisam de bind local (o sandbox pode requerer execução autorizada).

Validação manual em Firefox: renderização, antes/depois/comparação, configuração iframe, save local, payload/resultados do simulador, assessment editável, live desativado e reset de notas/impacto. A validação local não prova registro, rendering Postmonger, bindings, templates, consentimento, feedback de eventos ou compatibilidade no tenant Aché.
