# Globo — preflight autenticado da nova conta

13/10/2026, leituras concluídas aproximadamente 18:43 BRT. Alvo: `<EXPECTED_TWILIO_ACCOUNT_SID>`. O anexo foi utilizado como brief de execução desta rodada, respeitando as restrições explícitas do pedido. Nenhuma escrita remota, chamada, mensagem, análise, Recall ou aceite de termos foi executado.

## Autenticação e preservação

Uma API Key existente em perfil CLI correspondente ao alvo autenticou as leituras. O alvo foi comprovado por `IncomingPhoneNumbers.account_sid`, `MessagingServices.account_sid` e `Flex.account_sid`. O perfil padrão não foi alterado. Accounts retornou **401 / 70004**; status, tipo, conta-mãe e tipo exato da chave não puderam ser confirmados. Uma restrição de Standard Key é compatível com esse resultado, mas não é causa única comprovada. Hosts padrão foram utilizados; a região não consta no perfil. Resposta bruta de Accounts não foi persistida. [API Keys](https://www.twilio.com/docs/iam/api-keys), [erro 70004](https://www.twilio.com/docs/api/errors/70004).

O `.env` global continua na conta anterior. `apps/globo/.env.local` não contém credenciais da nova conta. A chave REST **não substitui o Auth Token necessário à assinatura HTTP/WSS**. Hashes dos dois arquivos de ambiente e da configuração CLI permaneceram iguais durante o inventário. O processo público continua na configuração anterior.

Backup aprovado `.demo-data/recovery/globo-functional-20261013.tar.gz`: SHA-256 `d004bdb67c12ae2090a6c78673307ad2e2ffb19f9fa8b1f612442aa8f7a9ccc8`, confirmado. Os **45 arquivos não Markdown** de aplicação/build registrados no manifest permanecem idênticos. Nenhuma alteração no agente, painel, streaming, voz, dependências ou outras aplicações. Branch atual `demo/globo-edx-operations`; alterações preexistentes preservadas, sem commit/staging.

Arquivos novos desta rodada: este relatório, `scripts/preflight-new-account.mjs` e manifests em `migration/`. Evidências sanitizadas, ignoradas pelo Git: `.demo-data/new-account-preflight.json`, `.demo-data/new-account-additional.json`, `.demo-data/new-account-tunnel.json`. Sem números pessoais, conteúdo de conversas ou mídia. O script GET-only seleciona credenciais completas do alvo, sem utilizar o loader da conta anterior.

## Matriz de estado

| Componente | Estado | Evidência e limite |
| --- | --- | --- |
| Autenticação REST | FUNCIONAL NA CONTA ALVO | Recursos retornaram account_sid esperado; somente control plane comprovado |
| Status/tipo/parent da conta | BLOQUEADO COM EVIDÊNCIA | Accounts 401/70004; verificar pelo Console ou credencial autorizada com escopo adequado |
| WhatsApp Messaging | CONFIGURADO NÃO TESTADO | 4 senders WhatsApp; 3 ONLINE, 1 OFFLINE; sem tráfego de teste |
| Calling de 2 senders BR | CONFIGURADO NÃO TESTADO | ONLINE/HIGH/10K e voice_application_sid; sem chamada desta conta |
| Verificação Meta/botão/dedicação | NÃO VERIFICADO | API não expõe portfólio/verificação; Console encaminhou para login |
| Conversation Relay na conta alvo | NÃO VERIFICADO | Aceite/onboarding e chamada real não verificados |
| Orchestrator | ACESSÍVEL SEM CONFIGURAÇÃO | HTTP 200, zero configurações |
| Memory | ACESSÍVEL SEM CONFIGURAÇÃO | HTTP 200, zero stores; nenhum schema/identificador existente |
| Intelligence v3 | ACESSÍVEL SEM CONFIGURAÇÃO | HTTP 200, zero configurações; 6 operadores no catálogo |
| Batch Transcription | ACESSÍVEL SEM CONFIGURAÇÃO | HTTP 200, lista content vazia |
| Nota de voz WhatsApp end-to-end | NÃO VERIFICADO | Baseline não recebe áudio; codec/canais/roteamento ainda pendentes |
| Nimo/ServiceNow real | NÃO VERIFICADO | Adapter local SIMULADO; nenhuma homologação real |

Listas paginadas completas: 5 números Voice, 4 TwiML Apps, 4 senders WhatsApp, 3 Messaging Services, 33 flows Studio, 4 services Conversations classic. Todos HTTP 200, uma página; pools PhoneNumbers/ChannelSenders completos. Batch usa `content` e `meta.next_token`, sem próxima página. Listas vazias não significam indisponibilidade ou produto habilitado para processamento.

## Senders e mapa de dependências

WABA retornada: `496462670210149`. Portfólio e verificação empresarial não expostos. O antigo erro Meta 2593145 e o antigo limite 250 **não foram atribuídos a esta conta**.

| Sender | Status / qualidade / limite | Voice binding | Consumidor |
| --- | --- | --- | --- |
| `XEc496946458a3be652864221c06287f19` BR | ONLINE / HIGH / 10K Customers/24hr | `AP44e69a3ee2609eb3fc146a78f7c2d0b7` | ngrok `/voice/calllink/inbound`, callback `/voice/calllink/status` |
| `XEfc78c07d45e18389ca05331de0c8a539` BR | ONLINE / HIGH / 10K Customers/24hr | `AP827c03a7f02e95b2990d6a766362b27a` | TwiML Bin `EH95f5836fec2e0196df9e326d20139d8c` |
| `XE9072875b6d552e558a38b295bb5724b6` BR | OFFLINE / UNKNOWN / 10K | Mesma AP827 acima | App compartilhada com sender ONLINE |
| `XEe048825ec4037ebb3e673ec34fb7dd8f` US/CA | ONLINE / UNKNOWN / limite não informado | Nenhum | Mensageria Function timberwolf-mastiff-9776 `/demo-reply` |

**Nenhum sender foi comprovado exclusivo/livre.** Não usar recursos Initu; ausência de nome Initu/Globo na API não prova propriedade ou dedicação.

| Recurso | Consumidor/finalidade atual | Impacto de mudança |
| --- | --- | --- |
| `MG5c24178938fc37fc088fa573fe477e8d` | Pool contém os dois BR ONLINE, `PNaf335d695ae8b79d122030a8525a451f` e RCS `XE8ea242c00cebf34625d9c992a73c87e7` DRAFT | Alterar serviço afeta vários canais; não alterar |
| `MG88b279c651dbeacdf287a486c61e87ad` | ngrok `/webhooks/twilio/message`; pool vazio | Referência ao túnel; não considerar livre |
| `MG5cd7392e83435ed8fb20a6479f9e9b6d` | Function whatsapp-group-messaging-6486-dev `/joinConversation`; pool vazio | Preservar |
| `PNaf335d695ae8b79d122030a8525a451f` US/CA | TwiML Bin EH95 acima | Voice existente e pool compartilhado |
| `PN376127e40d8ce808452d5676b9a73785` BR | Studio `FW7f19cd2e4ae5371a713baf8fc9bacf6e` | Desviaria o flow existente |
| `PNd9cd8079bbd9a0a5041eee5fed2c4e9c` BR | Studio `FW9e81a01cbde4f26667bd2cc879a75986` | Desviaria o flow existente |
| `PNfce09bfcb89ee82dfbe7e73a63213e8f` BR | ngrok `/voice/marisa/inbound`, callback `/voice/marisa/status`, SMS `/webhooks/twilio/message` | Outro consumidor do túnel |
| `PNd61119d30ce343d14f0fb3ddc0fcde7c` BR | ngrok `/voice/bourbon/inbound`, callback `/voice/bourbon/status`, SMS Function `/joinConversation` | Outro consumidor do túnel |
| `APc7706bc7fb8cdf4afe502b1acfa92283` | paguemenos Railway `/voice/inbound` | Outra demo; preservar |
| `APa565adb7d9e594eca2ab951108a2048a` | Controlador interno voice-orchestrator-controller | Infraestrutura compartilhada; preservar |
| Flex | classic `IS8e56c869484741d98d52a62e75ae33be`, TaskRouter `WSfd443c10b86649fbc9697c25c777de91` | Não é Orchestrator v2; preservar |

Nos 3 Messaging Services, `use_inbound_webhook_on_number=false`. No pool dos candidatos, inbound URL/fallback/status callback são null; callbacks diretos de mensageria dos candidatos também null. **Não existe webhook de mensagens Globo configurado nesse caminho.** O roteamento efetivo não foi testado. Não alterar serviço/pool compartilhado para áudio sem um delta específico e isolado.

Foram lidos metadados dos flows/services, não conteúdo, execuções ou definições Studio. Dependências transitivas não verificadas; esses recursos ficam fora da migração. Um recurso sem tráfego conhecido não é livre.

## Calling e onboarding

10K supera o requisito documental de 2.000/24h, mas ONLINE não prova Business Verification, botão ou ausência de outras restrições. Gus precisa conferir Meta Business Settings → Business Info/Security Center: Portfolio vinculado à WABA e Business Verification; WhatsApp Manager → Phone numbers → sender escolhido: Calling/button, quality/restrictions. Nenhuma alteração Meta foi tentada. [Requisitos Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling).

1Console encaminhou para auth.twilio.com/login; sem sessão autenticada. Gus deve verificar na conta alvo Communications → Voice → Settings → Privacy & Security → Predictive and Generative AI/ML Features Addendum. Se faltar, ler/aceitar pessoalmente. Não houve aceite em seu nome. [Onboarding Relay](https://www.twilio.com/docs/voice/conversationrelay/onboarding).

A menor mudança Calling: criar uma TwiML App Globo e alterar **somente** voice_application_sid de **um sender explicitamente liberado como exclusivo**. Não editar App antiga nem webhook de mensagens para habilitar voz. Ligação iniciada pelo colaborador; sem outbound adicional ou ponte Calling→PSTN.

## Aplicação e migração nativa

Baseline implementa `/globo/voice`, `/globo/voice/end`, `/globo/relay`, `/globo/`, `/api/globo/state`, `/api/globo/health`. HTTP valida assinatura + AccountSid; WSS valida assinatura e nonce ligado ao CallSid/setup; streaming/interrupções presentes. O gate admite Call SIDs autorizados ou permit PSTN com From/To exatos: **Calling inbound não é automaticamente aceito**. É necessário gate novo, assinado e restrito a From/To WhatsApp de teste, com limite de duração, preservando as validações existentes.

Voz preservada: ElevenLabs `5p4THmLc2S6kXKO1pOM5-1.06_0.5_0.8`, TTS/STT pt-BR. Node 20.19.5 e CLI 6.2.0. Instalados: twilio 5.13.1, Express 5.2.1, ws 8.22.0, React 19.3.0, Vite 7.3.6, Vitest 4.1.11, TypeScript 5.9.3; engines compatíveis. Nenhuma dependência atualizada.

O loader mistura root/local/process; apenas trocar SID pode herdar token/números antigos. Antes de runtime alvo: bloco Twilio completo app-scoped, sem fallback global, guard de conta autenticada e namespaces separados por conta/domínio. Não copiar históricos. O adapter de memória existente usa GET/PATCH de traits; seu método chamado recall() **não é Recall semântico nativo**, e não está ativado no runtime. Não usar esse nome como prova de produto.

| Componente | Origem | Destino/delta | Autorização / rollback |
| --- | --- | --- | --- |
| Agente, painel, streaming, voz | apps/globo aprovado | Reutilizar integralmente | Local; backup intacto |
| Credenciais/números/senders/IDs | Conta anterior no loader global | Configurar conjunto alvo atomicamente; nenhum ID antigo migrado como válido | Local; voltar conjunto antigo privado |
| Jornada operacional | experiments/globo-operations local | Reusar módulos incrementalmente em apps/globo; Nimo permanece mock | Local; não substituir scaffold RH |
| Memory | Persistência local / adapter traits não ativado | 1 store dedicado operações + schema/identidade; Recall real | Criação/uso cobrado; desativar/remover só dedicado |
| Orchestrator | Timeline local | 1 config vinculada ao novo store/v3; Relay ativo | Sem captura VOICE passiva; rollback config nova |
| Intelligence | Insights locais; experimento Classic separado | 3 operadores v3 + 1 config dedicada | Não usar GA classic; remover só novos IDs |
| Calling | Apps atuais compartilhadas | 1 App nova + binding de sender exclusivo escolhido | Restaurar voice_application_sid original |
| Audio WhatsApp | Não implementado no baseline | Pipeline assinado/dedicado + batch se compatível | Condicional; não alterar pool compartilhado |

Proposta Memory: `GloboOperationsDemo.referencesJson: STRING`, um Rafael fictício como CUSTOMER, endereço E164 autorizado normalizado. Voz e mensagem resolvem o mesmo perfil; telefone não é autenticação de funcionário. RH permanece em domínio separado. Recall na segunda sessão deve recuperar informação da primeira **nativamente**, com IDs e latência visíveis. Nenhum profile GET/Recall cobrado foi feito nesta rodada.

Relay `conversationConfiguration` aplica agrupamento; `conversationId` aponta conversa existente, ignorando agrupamento. Escolher um por sessão; nunca ambos. Não usar captura passiva VOICE simultânea. Captura WhatsApp textual futura deve restringir os dois endereços autorizados, sem wildcard. [Ingestão](https://www.twilio.com/docs/conversations/orchestrator/concepts/ingestion), [TwiML](https://www.twilio.com/docs/voice/twiml/connect/conversationrelay).

Intelligence v3: propostas locais `operational_impact` (on-demand uma vez após contexto estabilizado), `resolution_integrity` e `operational_friction` (CONVERSATION_END). Outputs JSON com evidências; backend correlaciona eventos operacionais, sem inventar ServiceNow. Operadores/configs em migration/ possuem placeholders, não vínculos reais. Validar schema final e IDs antes de aplicação. Webhook v3 exige confirmar seu contrato específico de segurança; consulta autenticada de resultados dedicados é alternativa inicial. [Operadores customizados](https://www.twilio.com/docs/conversations/intelligence/create-custom-language-operators).

| Caminho | Integração | Escolha |
| --- | --- | --- |
| conversationConfiguration | Orchestrator → Memory + Intelligence v3 | Escolhido, recursos dedicados ainda não criados |
| intelligenceService | Service GA de Intelligence classic | Não selecionado; não recebe ID v3 nem integra Memory/Orchestrator por si só |

Agent Connect/TAC e Enterprise Knowledge não foram consultados remotamente: nenhuma lacuna atual justifica reescrever agente ou indexar conhecimento corporativo. Estado NÃO VERIFICADO, prioridade secundária.

## Notas de voz: opção Twilio e lacuna

Anexos WhatsApp não ingressam automaticamente no Orchestrator. Baseline não recebe mídia; o experimento contém pipeline/transcritor externo ainda não validado remotamente. [Canais](https://www.twilio.com/docs/conversations/orchestrator/concepts/channels).

Opção Twilio atual investigada: configurações `voice.twilio.com/v2/Configurations/Transcription` e jobs `POST voice.twilio.com/v3/Transcriptions`. Configuração GET200, vazia. Com conversationConfigurationId, a transcrição é armazenada como comunicação e retorna conversationId; pt-BR está documentado para deepgram/nova-2. Google/chirp_2 requer habilitação via suporte. Não é proposta de Service GA classic. [Configuração batch](https://www.twilio.com/docs/configurations/transcription-configuration-resource).

**Compatibilidade ainda pendente:** externos documentados são stereo PCM WAV/MP3/FLAC; OGG não listado. Configuração exige dois canais/participantes, um CUSTOMER e um agente. Uma nota de um só falante não comprova compatibilidade; confirmar representação suportada com Twilio antes do job, sem inventar voz/participante. Template batch é review-only, não executável. [Batch resource](https://www.twilio.com/docs/voice/api/batch-transcription-resource).

Pipeline futuro: assinatura Messaging com Auth Token alvo → From/To allowlist → ledger account+MessageSid → download Twilio autenticado, host/rota/MIME e limite 6MB, sem redirects → conversão/transcrição autorizada → ledger MessageSid/MediaSid/jobId/conversationId → agente/contexto/v3. mediaUrl temporária controlada; nunca URL arbitrária nem URL privada entregue sem auth. Origem WhatsApp no ledger verificável; não inventar metadata no schema nem usar CreateCommunication como envio acidental. Se batch fizer ingestão nativa, não ingerir manualmente a mesma fala. Callback batch documenta X-Twilio-Signature; validar URL e corpo JSON conforme helper. Nenhuma mídia foi baixada.

## ngrok e controles

GETs em 18:41 BRT: `https://gustsantos.ngrok.io` → `http://127.0.0.1:3007`. Painel anônimo 401, autenticado 200; `/api/globo/state` e `/api/globo/health` anônimos 401. Nenhuma senha exposta. Essas leituras comprovam o túnel/painel atual, não Relay da conta alvo.

GET autenticado `/api/globo/health` em `2026-10-13T21:59:13.015Z`: HTTP200, `ok=true`, `whatsapp=pending`, `onboarding=not-verified`. Nenhum POST ou LLM acionado. Os sete novos arquivos foram verificados contra os valores sensíveis locais sem imprimi-los: zero correspondências; manifests JSON válidos; env/evidências/backup cobertos por .gitignore.

Preservados: ngrok PID13155; node3007 PID24403 (apps/globo), node3008 PID35585 (globo-native), node3009 PID60786 (globo-operations). Configurações remotas Calllink/Marisa/Bourbon/Messaging referenciam o mesmo host. Implementações dessas rotas não foram encontradas na busca local pertinente; seu funcionamento atual e dependências transitivas não foram comprovados. Não trocar upstream/processo até preservar despacho dessas rotas ou aprovar endpoint separado. Nenhum processo parado/reiniciado.

## Validação desta rodada e comandos

- `npm run test -w apps/globo`: **48/48**, 4 arquivos, 13/10 18:41:29 BRT, 675ms; fixtures de agente/memória/adapters/assinaturas/WSS, sem IA remota.
- `npm run typecheck -w apps/globo`: passou, exit0.
- `node --check apps/globo/scripts/preflight-new-account.mjs`: passou.
- Backup e 45 arquivos de aplicação/build iguais ao manifest.
- Build não reexecutado para evitar regravar dist do processo preservado; histórico não comprova a nova conta.
- Sem chamadas, mensagens, ingestão/análise ou áudio novo. Nenhum resultado nativo inventado.

REST correto já disponível no CLI. Para runtime, configurar Auth Token correto **somente localmente**, depois de preparar loader isolado; não reiniciar agora nem sobrescrever variáveis de voz:

```dotenv
EXPECTED_TWILIO_ACCOUNT_SID=<EXPECTED_TWILIO_ACCOUNT_SID>
TWILIO_ACCOUNT_SID=<EXPECTED_TWILIO_ACCOUNT_SID>
TWILIO_AUTH_TOKEN=<preencher no arquivo local, nunca no chat>
# API Key REST correspondente pode continuar explicitamente selecionada.
```

```sh
node apps/globo/scripts/preflight-new-account.mjs # GET-only, não altera CLI default
npm run test -w apps/globo
npm run typecheck -w apps/globo
```

Não executar smoke:ai/test:call/verify:tunnel nesta rodada: incluem processamento/POST/chamada. Não há executor de migração nem flags de aprovação ativadas.

## Uma autorização consolidada proposta

Pré-condições: identificar UM sender exclusivo entre os dois BR ONLINE; Auth Token alvo local; verificação Meta e termos pelo próprio Gus; resolver consumidores do domínio. Sem essas condições, não executar escritas.

| Mudança | Recurso / impacto | Consumo / teste | Rollback |
| --- | --- | --- | --- |
| Isolamento runtime | apps/globo, namespace alvo; troca pública somente após resolver rotas | Fixtures/REST na preparação | Restaurar configuração/processo anterior, manter demais rotas |
| Pack nativo | 1 store/traitgroup/identidade, 3 operadores, 1 v3 config, 1 Orchestrator; sem captura global | 1 Rafael fictício, 2 sessões, até4 Recall e6 execuções | Desativar/remover só recursos novos após checar vínculos |
| Calling | 1 App nova; apenas voice_application_sid de sender exclusivo escolhido | 2 chamadas INBOUND iniciadas por Gus, ≤120s cada | Restaurar binding antigo; não editar App compartilhada |
| Áudio condicional | 1 config batch; codec/participantes e rota dedicada primeiro | Até2 notas fictícias ≤60s | Desligar pipeline novo/staging; cobrança já incorrida não reversível |

**Mensageria não tem delta aprovável completo ainda:** não mudar Messaging Service/pool/webhook compartilhado sob esta autorização. Antes disso, apresentar roteamento específico isolado e seu rollback. Se não houver caminho isolado suportado, áudio permanece bloqueado/arquitetural, sem substituição silenciosa.

Referência pública: Relay US$0,07/min; Orchestrator US$0,0002/1K chars; custom Intelligence US$0,002/1K input + US$0,018/1K output; Memory US$0,0028/1K geração, US$0,007/Recall e US$0,005/perfil-dia. Limites propostos: 4min Relay, 20K ingestão, 20K geração, 4Recall, 6 execuções com10K input/2K output cada → **US$0,709 estimados** nesses produtos. Não é cotação da conta nem teto duro; contexto/output/tentativas variam. [Preços atuais](https://www.twilio.com/en-us/products/conversational-ai/pricing).

Adicionar canal Calling Twilio US$0,005/min, eventual Voice e tarifas efetivas da conta; mensagens US$0,005/unidade + Meta aplicável; inbound Meta listado gratuito. Batch referência pública US$0,024/min (até2min ≈US$0,048), confirmar tarifa efetiva do engine/API. LLM tokens cobrados separadamente. Orçamento de planejamento proposto **US$5** para o ensaio, sem novos números nem serviços recorrentes; contadores não garantem teto instantâneo de faturamento. [WhatsApp](https://www.twilio.com/en-us/whatsapp/pricing), [Voice/batch](https://www.twilio.com/en-us/voice/pricing/us).

Após pré-condições: isolamento/gate inbound 1–2h; Calling/Relay 30–60min; pack nativo + duas sessões/evidências 2–4h; áudio 2–4h adicionais após compatibilidade/roteamento. Total **4–7h sem áudio, 6–11h com áudio**; esperas Meta/termos/permissões sem SLA. Priorizar Calling/Relay e nativos dedicados. Nota de voz fica arquitetural se canal único/roteamento não for comprovado hoje. Contingência atual preservada na conta anterior, claramente identificada; não conta como aceite alvo.

Detalhes revisáveis: `migration/new-account-plan.json`, `operators.proposed.json`, `intelligence.proposed.json`, `orchestrator.proposed.json`, `batch-transcription.proposed.json`. Nenhum aplicado.

## Evidências HTTP por requisição

| Timestamp UTC | Método / endpoint | HTTP |
| --- | --- | --- |
| 2026-10-13T21:41:03.297Z | GET https://api.twilio.com/2010-04-01/Accounts/<EXPECTED_TWILIO_ACCOUNT_SID>.json | 401 / 70004 |
| 2026-10-13T21:41:05.149Z | GET https://api.twilio.com/2010-04-01/Accounts/<EXPECTED_TWILIO_ACCOUNT_SID>/IncomingPhoneNumbers.json?PageSize=1 | 200 |
| 2026-10-13T21:41:06.695Z | GET https://api.twilio.com/2010-04-01/Accounts/<EXPECTED_TWILIO_ACCOUNT_SID>/IncomingPhoneNumbers.json?PageSize=100 | 200 |
| 2026-10-13T21:41:06.696Z | GET https://api.twilio.com/2010-04-01/Accounts/<EXPECTED_TWILIO_ACCOUNT_SID>/Applications.json?PageSize=100 | 200 |
| 2026-10-13T21:41:06.696Z | GET https://messaging.twilio.com/v2/Channels/Senders?Channel=whatsapp&PageSize=100 | 200 |
| 2026-10-13T21:41:06.698Z | GET https://messaging.twilio.com/v1/Services?PageSize=100 | 200 |
| 2026-10-13T21:41:06.699Z | GET https://conversations.twilio.com/v2/ControlPlane/Configurations?pageSize=100 | 200 |
| 2026-10-13T21:41:06.700Z | GET https://memory.twilio.com/v1/ControlPlane/Stores?pageSize=100 | 200 |
| 2026-10-13T21:41:06.701Z | GET https://intelligence.twilio.com/v3/ControlPlane/Configurations?pageSize=100 | 200 |
| 2026-10-13T21:41:06.702Z | GET https://intelligence.twilio.com/v3/ControlPlane/Operators?pageSize=100 | 200 |
| 2026-10-13T21:41:06.702Z | GET https://studio.twilio.com/v2/Flows?PageSize=100 | 200 |
| 2026-10-13T21:41:06.703Z | GET https://conversations.twilio.com/v1/Services?PageSize=100 | 200 |
| 2026-10-13T21:41:11.792Z | GET https://messaging.twilio.com/v2/Channels/Senders/XEe048825ec4037ebb3e673ec34fb7dd8f | 200 |
| 2026-10-13T21:41:12.225Z | GET https://messaging.twilio.com/v2/Channels/Senders/XEc496946458a3be652864221c06287f19 | 200 |
| 2026-10-13T21:41:15.253Z | GET https://messaging.twilio.com/v2/Channels/Senders/XEfc78c07d45e18389ca05331de0c8a539 | 200 |
| 2026-10-13T21:41:16.482Z | GET https://messaging.twilio.com/v2/Channels/Senders/XE9072875b6d552e558a38b295bb5724b6 | 200 |
| 2026-10-13T21:41:17.672Z | GET https://messaging.twilio.com/v1/Services/MG5c24178938fc37fc088fa573fe477e8d | 200 |
| 2026-10-13T21:41:18.060Z | GET https://messaging.twilio.com/v1/Services/MG5c24178938fc37fc088fa573fe477e8d/PhoneNumbers?PageSize=100 | 200 |
| 2026-10-13T21:41:18.461Z | GET https://messaging.twilio.com/v1/Services/MG5c24178938fc37fc088fa573fe477e8d/ChannelSenders?PageSize=100 | 200 |
| 2026-10-13T21:41:18.877Z | GET https://messaging.twilio.com/v1/Services/MG5cd7392e83435ed8fb20a6479f9e9b6d | 200 |
| 2026-10-13T21:41:19.232Z | GET https://messaging.twilio.com/v1/Services/MG5cd7392e83435ed8fb20a6479f9e9b6d/PhoneNumbers?PageSize=100 | 200 |
| 2026-10-13T21:41:19.587Z | GET https://messaging.twilio.com/v1/Services/MG5cd7392e83435ed8fb20a6479f9e9b6d/ChannelSenders?PageSize=100 | 200 |
| 2026-10-13T21:41:19.948Z | GET https://messaging.twilio.com/v1/Services/MG88b279c651dbeacdf287a486c61e87ad | 200 |
| 2026-10-13T21:41:20.303Z | GET https://messaging.twilio.com/v1/Services/MG88b279c651dbeacdf287a486c61e87ad/PhoneNumbers?PageSize=100 | 200 |
| 2026-10-13T21:41:20.641Z | GET https://messaging.twilio.com/v1/Services/MG88b279c651dbeacdf287a486c61e87ad/ChannelSenders?PageSize=100 | 200 |
| 2026-10-13T21:41:21.025Z | GET https://voice.twilio.com/v2/Configurations/Transcription?PageSize=100 | 200 |
| 2026-10-13T21:41:22.977Z | GET https://flex-api.twilio.com/v1/Configuration | 200 |
| 2026-10-13T21:42:14.204Z | GET https://voice.twilio.com/v2/Configurations/Transcription | 200 |
| 2026-10-13T21:42:15.342Z | GET https://messaging.twilio.com/v2/Channels/Senders/XE8ea242c00cebf34625d9c992a73c87e7 | 200 |
