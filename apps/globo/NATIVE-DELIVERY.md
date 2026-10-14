# Globo + EDX — variante nativa, 13/10/2026

Relatório do ponto de recuperação nativo preservado. Incremento posterior: [notas de voz dinâmicas](VOICE-NOTES.md), com síntese ElevenLabs, entrega de áudio e reprodução no WhatsApp comprovadas; ver incidente de recuperação e métricas no relatório incremental.

Apresentação: 14/10/2026, 14h30 Brasília. Ambiente de demonstração com Rafael, estúdios e pedidos fictícios. Execução Nimo/EDX/ServiceNow simulada, explicitamente identificada. Nenhuma política corporativa real ou entrega física é inferida.

## Execução e isolamento

Na raiz do workspace:

```sh
npm run build:native -w apps/globo
npm run start:all -w apps/globo
```

Gateway 3007: `/globo/` mantém o RH anterior; `/globo/native/` encaminha à variante em 3010. Ngrok existente continua em `https://gustsantos.ngrok.io`, upstream 3007. Não iniciar processos duplicados. `start:all` exige credenciais antigas no `.env` global para a contingência e credenciais alvo em `apps/globo/.env.local`. `start:native` executa só 3010. CLI default e `.env` global não foram alterados. A senha pública está no arquivo privado `.demo-data/panel-password.txt`; abrir localmente, nunca copiar para URL, chat ou Git.

| Rota | Controle |
|---|---|
| `/globo/native/`, `/api/globo/native/*` | Basic público, loopback restrito; POST exige Origin permitido, JSON e X-Globo-Demo |
| `/globo/native/voice` | Assinatura Twilio, AccountSid alvo, par de telefones autorizado, CallSid |
| `/globo/native/relay` | Assinatura WSS, nonce emitido no TwiML, setup AccountSid/CallSid; timeout e interrupções |
| `/globo/native/status`, `/globo/native/voice/end` | Assinatura e chamada emitida |
| `/globo/native/whatsapp` | Assinatura, conta e par exato de endereços; fila persistente antes de STT/execução |
| `/api/globo/native/audio/ingest-existing` | Administração autenticada; apenas a nota fictícia revisada, origem REST explicitamente marcada |

## Recursos e configuração efetiva

Conta alvo `<EXPECTED_TWILIO_ACCOUNT_SID>`, autenticada e ativa. Sender escolhido `+554123911383`, SID `XEc496946458a3be652864221c06287f19`, ONLINE. Verificação de Portfolio/Calling/Addendum foi confirmada pelo usuário; funcionamento Calling e Relay foi constatado em chamadas reais. Nenhum termo foi aceito pelo agente.

| Produto | Recurso dedicado / evidência |
|---|---|
| TwiML Application | `AP11ec840589bf26560ec6ea4a708926ed`, exclusivamente vinculada ao sender escolhido |
| Orchestrator | `conv_configuration_01m4vnny0vejbv8xscz6f3mphd`, ingestão ativa pelo atributo conversationConfiguration no Relay |
| Conversation Memory | `mem_store_01m4vngbszfd78hhmya032m0d9`, perfil `mem_profile_01m4vntg7ef6grzjaw3ayxcy70`; traits GloboOperations.referencesJson e Recall real |
| Intelligence v3 | `intelligence_configuration_01m4vnn1ebfcy9y775tphx8apf`, cinco operadores dedicados |
| ElevenLabs / Relay | `5p4THmLc2S6kXKO1pOM5-1.09_0.5_0.8`, ElevenLabs, pt-BR; variáveis GLOBO_TTS_*; testes auditivos anteriores em 1.06 |
| Nota de voz | OpenAI arquivo, GLOBO_AUDIO_MODEL=gpt-4o-mini-transcribe; texto e proveniência em Orchestrator, análise v3. Não é STT Twilio |
| Execução operacional | Mock persistente de ServiceNow; pedidos EQ-DEMO, confirmação, versões e idempotência. Não há integração EDX real |

Orchestrator usa GROUP_BY_PROFILE, o store dedicado e memoryExtractionEnabled. Identificadores phone e whatsapp apontam ao perfil fictício. Configurações de identidade protegidas padrão foram verificadas, não substituídas. Após dois minutos de fechamento, uma interação pode resultar em outro Conversation ID: continuidade é pelo mesmo Profile ID e referência do pedido, não pela promessa de um único ID eterno. CaptureRules de voz e WhatsApp ficam vazias: nenhuma captura passiva global. PATCH exclusivo de 13/10 concluiu status COMPLETED e adicionou WHATSAPP inactive=1 / closed=2 minutos, preservando VOICE. Snapshot anterior está em orchestrator-before-whatsapp-timeout.json; restaurar somente channelSettings desse recurso se necessário.

Intelligence: impacto operacional é regra on-demand; resolução, fricção, urgência/reincidência e governança executam em CONVERSATION_END. O botão de consulta solicita impacto uma vez por conversa e consulta resultados; atualize depois de alguns segundos. Resultados são aceitos somente se conta/configuração/operador/conversa e citações exatas correspondem às Communications. Não existe webhook externo de resultados configurado. Agregação/gráficos são código da aplicação, não Conversation Insights. Fixtures permanecem como opção explicitamente não nativa, nunca fallback silencioso. Classic intelligenceService está desligado nesta variante.

## Evidências já comprovadas

1. Calling real → TwiML → Relay HTTP/WSS autenticado e respostas OpenAI em streaming. Primeira chamada `CA57deddf7df0c0567861e068944937c35`, conversa `conv_conversation_01m4vpfcs2eq8bcy10tx0vewgt`. Cinco resultados v3 validados, com 20 citações vinculadas a Communications reais. Essa tentativa não criou pedido: reconhecimento de DEMO-RX foi corrigido e retestado.
2. Chamada corrigida, conversa `conv_conversation_01m4vqanbjffh91n6hjy41fvzj`: confirmação criou EQ-DEMO-1002 no executor simulado e gravou sua referência em Memory real. GET posterior de outro processo recuperou `["EQ-DEMO-1002"]`. Recall HTTP 200 recuperou observações, resumos e comunicações. Quatro resultados pós-chamada v3 foram validados.
3. Nova sessão real `CA236372bf3de05f3ad78dcdc6e3c18176`, conversa `conv_conversation_01m4vqxct1e9wsse16hgnt6m99`: recuperou Memory e selecionou EQ-DEMO-1002 para mudar ao estúdio 5. O STT retornou somente “a atualização”, portanto nenhuma mudança foi feita sem confirmação explícita. A resposta foi ajustada para pedir “sim”; não se converte uma frase incompleta em autorização.
4. Primeira nota de voz `MM8e36f0a3224bbe4667cceba1d4509400` foi interceptada pelo fluxo Classic antigo. Recuperação REST inicial diagnosticou HTTP 307 para mms.twiliocdn.com antes de STT; não houve cobrança OpenAI nessa tentativa. Downloader corrigido para o CDN exato, sem encaminhar Authorization. Recuperação posterior aprovada concluiu STT OpenAI, ingestion Orchestrator e resposta WhatsApp: conversa `conv_conversation_01m4vrvhdkftzb92e13az78zct`, entrada `conv_communication_01m4vs355peeqsdxdz7xgmfm7r`, saída `conv_communication_01m4vs35rwfqd9g4yfwdpbknew`, resposta `SMabf5738ac296fc8aedf063e75a189c43`, status delivered, errorCode null. Origem é authenticated-rest-recovery, não webhook.
5. Segunda nota `MM675fc4cea4482d2039ffa7f465b40e87` foi transcrita pela OpenAI, mas a primeira ingestão falhou: HTTP400 exigindo author.participantId e recipients[0].participantId. Embora a documentação marque esses campos opcionais, a API exige IDs reais. Correção recupera participantes via GET, valida CUSTOMER + Profile ID e AI_AGENT real de mensageria. STT dessa segunda nota não foi repetido automaticamente. Transcrições novas são persistidas antes de ingressar nas APIs subsequentes.
6. O operador operational_impact sobre a nota recuperada retornou um resultado v3 validado e uma citação exata de sua Communication real. Na validação final, a conversa integrada encerrou nativamente e seus cinco operadores foram consultados e validados: 15 citações vinculadas às Communications. O painel contém 23 resultados nativos de todas as interações de teste; não são 23 chamadas. Limite local de missing_information ajustado de 100 para 500 caracteres porque a API não aceita maxLength no esquema do operador; citações e origem continuam verificadas.
7. Nota nova `MM621f2eb1a954b9c9e3584cab5003eaf8` chegou automaticamente via sender-webhook (assinatura/account/par autorizado), completou STT OpenAI e ingestion nativa: `conv_communication_01m4vt0635e5cr81y8yxqeydgy`; resposta `SM14aeda8edfcf2babcd803b474071459c`, status delivered/errorCode null/messagingServiceSid null. Isso comprova o callback próprio sem Messaging Service.
8. Chamada posterior `CA599d82ecaeb96819dabc159a8a46f3a9` recuperou referências e as duas Communications da nota via Memory Recall, confirmou mudança do mesmo EQ-DEMO-1002 para estúdio 5, versão 2. EDX/ServiceNow continua simulado. A nota e a chamada estão na MESMA conversa nativa `conv_conversation_01m4vt05h1f0aa0vk7nwsqpr7j`, demonstrando continuidade WhatsApp Messaging → Calling pelo perfil. GET após chamada confirmou referência persistida no Memory. Não foram gerados outro pedido nem ETA. Após fechamento, Recall de outro processo retornou 5 observações, 2 resumos e 5 comunicações; as observações/resumos nativos contêm o estúdio 5. Evidência: final-native-recall-proof.json.
9. Após validação auditiva do usuário, velocidade foi solicitada ligeiramente maior: override local atual `5p4THmLc2S6kXKO1pOM5-1.09_0.5_0.8`. Voz/estabilidade/similaridade preservadas. As chamadas acima foram em 1.06; 1.09 validado por configuração/typecheck, aguardando avaliação auditiva na próxima ligação.

Evidências privadas em `.demo-data/`, ignoradas, modo 0600: ledger target-resources.json; snapshots de sender; gateway-public-proof.json; first-validated-native-analyses.json; namespace alvo com second-session-memory-proof.json, corrected-call-analyses.json, continuity-native-transcript.json, audio.json, execution.json e analyses.json. Nenhum segredo faz parte desses relatórios públicos.

## Dependência Classic identificada e autorizada

Regra `IG3f9c7fb286ee2f49c8d59ae7f825cdee` do sender criava Conversations Classic no serviço `IS8e56c869484741d98d52a62e75ae33be`, com Flow `FW559285806316e0777b8d2bdfb1bbf069`. Binding ativo do telefone de teste na conversa `CHa5f046276cfb4c908a5ebc8524876288`, participante `MBd720ad2d09be4116a9b8bfa97743bd76`, interceptou áudio e respondeu sobre outro programa. Usuário declarou que não usa mais esse binding e autorizou removê-lo.

Aplicado: autocreation desativada somente nesse endereço e removido somente esse participante. Conversa/histórico, Studio Flow e Messaging Service compartilhado preservados. A retirada apenas do proxy foi rejeitada pela API; autocreation foi restaurada antes de aplicar a remoção explicitamente autorizada. Snapshot privado permite recriar o binding, com novo Participant SID. Outros participantes e outros senders não foram modificados.

A segunda nota chegou ao Messaging Service antigo `MG5c24178938fc37fc088fa573fe477e8d`, cujo inboundRequestUrl é vazio e useInboundWebhookOnNumber=false. Foi criado o serviço dedicado `MG8f589ade9e3f28c0bf0db34af118142e`. ChannelSenders DELETE e CREATE retornaram HTTP500 / 20500. GET posterior confirmou remoção somente do sender escolhido do pool antigo; os outros dois senders e número permanecem e configurações do serviço antigo não mudaram. O serviço dedicado continua vazio: **não afirmar associação concluída**. Sender permanece ONLINE, App Voice e callback próprio preservados. Webhook próprio sem pool validado pela nova nota e resposta delivered; se a associação dedicada continuar necessária, o erro deve ser tratado com suporte/Console, sem mexer no serviço compartilhado. Ledger registra snapshot e operações. Rollback do membership: `node apps/globo/scripts/messaging-target.mjs rollback`, conferir estado por GET antes/depois; não repetir mutações após 500 sem inspecionar efeitos.

## Roteiro de cinco minutos

| Tempo | Cena |
|---|---|
| 0:00–0:40 | Apresentar Rafael fictício, identidade do perfil, separar integração nativa e executor simulado |
| 0:40–2:00 | WhatsApp Calling: dois kits no estúdio 4, receptor DEMO-RX, aguardar pergunta e dizer “sim” |
| 2:00–3:00 | Outra sessão recupera referência via Memory; mudar ao estúdio 5 e confirmar “sim”, mesmo pedido |
| 3:00–3:40 | Nota de voz: “Qual o status do meu pedido de microfones?”; mostrar STT OpenAI e Communication nativa |
| 3:40–5:00 | Resultados reais já processados, citações, resolução efetiva versus estado administrativo, limites e governança |

Não criar outro pedido se EQ-DEMO-1002 já existe: começar pela consulta e atualização do existente, ou preparar separadamente um cenário fictício autorizado. Não prometer resultados assíncronos instantâneos; usar os resultados reais da preparação se a análise nova ainda estiver processando. Dizer “sim” após a pergunta terminar evita cortar a confirmação no STT. Não inventar prazo que não foi reconhecido.

## Contingência e rollback

Backup aprovado `.demo-data/recovery/globo-functional-20261013.tar.gz`, SHA256 `d004bdb67c12ae2090a6c78673307ad2e2ffb19f9fa8b1f612442aa8f7a9ccc8`. Não extrair por cima da aplicação: restaurar em diretório separado e comparar manifest antes de promoção. Novo ponto de recuperação de código/build nativo em `.demo-data/recovery/globo-native-functional-20261013.tar.gz`, manifest separado; exclui credenciais, recursos remotos e dados de runtime. Restaurar em diretório separado, mantendo credenciais locais e recursos dedicados existentes. Fonte original, dist original e backup preservados; novas mudanças residem em native/ e gateway dedicado.

Se APIs/rede falharem, não anunciar recuperação Memory/análise real. Usar `/globo/` RH local ou fixtures explicitamente rotulados; variante nativa falha sem substituir Memory por storage local. Se ngrok falhar, apresentar painel em loopback e evidências já obtidas. Não reiniciar túnel nem consumidores externos automaticamente. Rotas antigas de outras demos que já retornavam 404 continuam com esse estado, sem alegar operação validada.

Somente após decidir restaurar roteamento:

```sh
node apps/globo/scripts/classic-routing-target.mjs rollback
node apps/globo/scripts/bind-target.mjs rollback
```

Primeiro comando recria o participante de teste na conversa preservada e restaura autocreation. Se existir binding novo conflitante, parar e investigar, sem removê-lo. Segundo restaura apenas Voice Application anterior `AP44e69a3ee2609eb3fc146a78f7c2d0b7`; mudanças do sender são assíncronas, confirmar por GET. Callback de mensagens anterior (vazio) está em messaging-webhook-before.json; restaurar somente o webhook desse sender, jamais o serviço MG compartilhado. Deletar recursos dedicados somente depois de desligar seus vínculos e obter decisão explícita; não fazer limpeza automática de recursos.

## Custos e validação

Consumo de desenvolvimento/testes aprovado, sem teto antigo US$5. Cada teste usa uma chamada de até 120s, Relay/TTS/LLM, memória/extração/análise e eventualmente STT de uma nota curta e resposta WhatsApp. Nenhuma nova assinatura externa paga foi provisionada. Não inferir total faturado a partir da quantidade de testes; billing tem atraso. Nenhum template Meta ou chamada outbound WhatsApp foi criado.

Comandos de qualidade:

```sh
npm run test -w apps/globo
npm run test:native -w apps/globo
npm run typecheck:native -w apps/globo
npm run build:native -w apps/globo
```

Última execução: baseline/gateway **51/51** (5 arquivos); variante **97/97** (10 arquivos), typecheck/build aprovados. Tentativa sem permissão para abrir sockets falhou com EPERM; executada novamente com acesso a loopback, passou. Cobertura inclui protocolo Relay, assinatura/acesso, ferramentas/memória, provenance/citações, dedup antes de cobrança, falha de ingestão sem executar ferramenta e CDN sem vazamento de credenciais. Testes mockados das APIs não são evidência de chamada real; evidências remotas acima são separadas.

O caminho Twilio Batch de dois canais para nota de um falante foi rejeitado pela revisão automática por fabricar um canal AI_AGENT silencioso. Não foi criado ou executado. A alternativa OpenAI STT foi autorizada explicitamente; o código da alternativa rejeitada foi removido.

Fontes: [ingestão ativa Orchestrator](https://www.twilio.com/docs/conversations/orchestrator/guides/active-creation), [Communication TEXT](https://www.twilio.com/docs/api/conversations/v2/communication/create-communication-in-conversation), [prioridade de bindings Classic](https://www.twilio.com/docs/conversations-classic/inbound-autocreation), [Senders API](https://www.twilio.com/docs/whatsapp/api/senders), [OpenAI transcriptions](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).
