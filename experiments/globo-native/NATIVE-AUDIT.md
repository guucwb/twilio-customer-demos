# Auditoria nativa Globo — 13/10/2026

A versão `apps/globo` e seu backup aprovado foram preservados. Cópia de implementação em `experiments/globo-native`, fora dos workspaces `apps/*`; porta3008 e dados próprios. Sem instalação/upgrade compartilhado, commit, criação remota, ingestão, alteração de webhooks ou nova chamada. A investigação usou GETs de control plane, sem buscar conversas, perfis de pessoas, gravações ou resultados de outros projetos.

## Conclusão

É tecnicamente suportado ligar Relay ao Orchestrator por `conversationConfiguration`, e o vínculo existente mais próximo conecta Memory e Intelligence v3. **Não autoriza reutilização e não comprova execução.** Dois operadores desse vínculo retornam404 e não aparecem no catálogo atual. Criar recursos exclusivos após aprovação é mais defensável que editar os compartilhados. Classic tem o menor caminho até resultado real hoje; Memory factual pode ser uma segunda extensão. Orchestrator+v3+Recall semântico é viável como ensaio condicionado, com maior risco de prazo.

## Inspeção de recursos existentes

Aliases abaixo evitam expor IDs, endereços de teste e destinos de callbacks. IDs candidatos e metadados integrais necessários ficam apenas em `.demo-data`, ignorado pelo Git. Não há credenciais nesses relatórios.

| Recurso | Leituras observadas | Adequação/limitação |
| --- | --- | --- |
| Orchestrator1 | GROUP_BY_PROFILE; Memory ACTIVE; extração false; channelSettings WHATSAPP com captureRules vazio;1 statusCallback; sem bridge; sem Intelligence | Identidade possível, mas não gera observações nem análises; callback externo existente requer avaliação de impacto antes de qualquer uso |
| Orchestrator2 | GROUP_BY_PROFILE; Memory ACTIVE; extração true; channelSettings vazio;0 statusCallbacks; sem bridge;1 Intelligence v3 vinculado | Melhor candidato arquitetural. Sem captura passiva de voz, mas sem exclusividade Globo comprovada e sem lifecycle VOICE explicitamente inspecionado/configurado |
| Intelligence v3 ligado | GET200; mesma conta;3 regras:2 CONVERSATION_END e1 CONVERSATION_INACTIVE;1 operador por regra; ações vazias; context null | Nenhum webhook/Memory context para operadores. Os2 IDs distintos de operadores respondem GET404 |
| Catálogo v3 atual | GET200;6 items; nenhum dos2 IDs antigos presente | Summary, Sentiment, Next-Best-Response, Script-Adherence e2 operadores com nome Fake-LLM-Test/Slow-Fake-LLM-Test. Excluir estes testes do desenho. Config list items vazio, embora linked config GET200; discrepância permanece |
| Memory1 |1 trait group;sem GloboDemo; schema identidade phone/whatsapp/email/chat/userId/pushUserID; matching exact | Não consultamos perfis. Schema permite desenhar resolução; não prova Rafael existente |
| Memory2 |2 trait groups;sem GloboDemo; phone/whatsapp/email/chat/segmentUserId/pushUserID; matching exact; phone normalizado phone e whatsapp trim; uniqueness true | userId não está nesta configuração. Label local rafael-demo não vincula por si só chamadas/WhatsApp ao mesmo perfil |
| Classic pt-BR |GET200; mesma conta;autoTranscribe true;dataLogging true;sem encryption credential | Não alterar essas opções. O campo redaction não foi retornado; não afirmar proteção PII validada |
| Classic operadores | Summarization; SentimentAnalysis;2 GenerativeJSON com prompt/schema legíveis | Um mede experiência/clareza/empatia; outro objeções/competidores/escalation_needed/next_best_action. Nenhum schema de governança RH ou política fictícia dedicado. Não apresentar estes como auditoria de compliance Globo |

O primeiro inventário anterior classificava canal WHATSAPP pela presença da configuração; leitura detalhada agora confirmou **zero capture rules**. O campo de listagem v3 é `items`:6 operadores atuais,0 configurações listadas. Não confundir existência de link com operador executável. 404 pode refletir referência obsoleta/inacessível; não atribuir causa definitiva sem Console/Support.

## Requisitos de ingestão ativa e identidade

[Ingestão ativa Twilio](https://www.twilio.com/docs/conversations/orchestrator/concepts/ingestion): `conversationConfiguration` resolve/cria conversa pelas regras; `conversationId` direciona conversa existente e prevalece se ambos estiverem presentes. Não combinar captura passiva VOICE com Relay ativo: duplica STT/custo. O laboratório já emite o atributo por opt-in, com XML validado no SDK instalado, sem atualizar dependências.

Usar novo ensaio: o TwiML já entregue às chamadas anteriores não continha esses atributos; não há ingestão retrospectiva implementada. Não atualizar uma chamada existente para fazê-la parecer analisada nativamente.

[Resolução de perfis](https://www.twilio.com/docs/conversations/orchestrator/concepts/profiles): CUSTOMER pode resolver perfil, agentes/UNKNOWN não. Criar conversa ativamente com tipos explícitos, ou validar a resolução feita pela ingestão TwiML. Para Voice a busca usa phone; WhatsApp usa whatsapp. Em store dedicado, associar ambos os endereços de teste autorizados ao **mesmo perfil sintético**, com traits/identifiers compatíveis, conferindo profileId real retornado. Não presumir equivalência de strings só por usarem o mesmo número. Não ler nem mesclar perfis de colaboradores.

Para controle forte, criar conversa com participante CUSTOMER fictício e AI_AGENT via POST v2 e direcionar a nova chamada com conversationId; suporte a esse segundo atributo ainda não implementado no laboratório. GROUP_BY_PROFILE pode manter continuidade enquanto a conversa está aberta, mas o mesmo perfil pode ter várias conversas. Nenhum ID de conversa unificada foi obtido neste ensaio.

[Lifecycle](https://www.twilio.com/docs/conversations/orchestrator/concepts/lifecycle): análise/extração dependem do encerramento/inatividade da conversa, não apenas do encerramento do WebSocket. Configurar VOICE statusTimeouts em recurso isolado e validar fechamento. Conversa CLOSED é imutável; sessão seguinte cria outra conversa com mesmo perfil. Para demonstrar memória entre sessões, esse comportamento é adequado. Para continuidade Voice→WhatsApp dentro da mesma conversa, definir janela de fechamento e validar IDs; pode atrasar resumo final. Preferir análise END no ensaio; gatilhos por COMMUNICATION podem executar em cada fragmento TTS.

## Comparação objetiva

| Critério | Classic `intelligenceService` | Orchestrator `conversationConfiguration` + v3 + Memory |
| --- | --- | --- |
| Unidade de integração | Serviço GA e sessão Relay VX; transcrição GT | Configuração conv_configuration; conversa conv_conversation; perfil mem_profile; configuração/operators/results v3 |
| Ingestão | Nativa de transcrição Relay, sem áudio | Communications de conversa, com agrupamento e perfil |
| Momento de análise | Pós-encerramento da sessão Relay | Conforme regras de lifecycle/communications/on-demand |
| Continuidade Memory | Não faz extração/vinculação Memory por esse atributo | Store ligado+identidade; extração quando habilitada; agente deve chamar Recall explicitamente |
| Multicanal | Este caminho é Voice | Desenho Voice+WhatsApp Messaging, com identidade e ingestão testadas |
| Outputs | v2 Transcripts/OperatorResults, já conectados ao painel local | v3 OperatorResults e conversa Orchestrator; painel/coleta ainda pendentes |
| Hoje | Teste remoto de menor esforço após autorização | Novos recursos isolados e operadores válidos necessários; ligação existente não basta |

[Classic nativo](https://www.twilio.com/docs/conversation-intelligence-classic/conversation-relay-integration) e [guia de comparação Twilio](https://www.twilio.com/docs/conversations/intelligence/guide-classic-users). Classic e v3 podem coexistir na conta; laboratório desabilita combinação por escolha de escopo/custo. Não trocar GA por intelligence_configuration no atributo Classic.

APIs necessárias: GET/POST v2 ControlPlane/Configurations; GET/POST v3 ControlPlane/Configurations e Operators; POST v2 Conversations, GET conversa/communications/participants para correlação; GET v3 OperatorResults filtrado por conversa/configuração e validação dos vínculos; Memory ControlPlane schema, IdentityResolutionSettings, perfil/identificadores e POST `/Recall`. As credenciais usadas permitem os GETs observados; escopos de escrita e execução não foram testados. [API v3](https://www.twilio.com/docs/api/intelligence/v3), [resultados v3](https://www.twilio.com/docs/api/intelligence/v3/operator-results/list-operator-results), [Memory APIs](https://www.twilio.com/docs/conversations/memory/api-quickstart).

## O que foi implementado e testado

- Classic opcional desligado por padrão; validação de conta/idioma, TwiML, vínculo VX autenticado, consulta de transcript/operator outputs no painel protegido, espera/erro explícitos e evidência JSON local.
- Atributo Orchestrator opcional desligado por padrão e testado na emissão XML; sem ingestão nativa comprovada ou exibição v3 implementada.
- Seleção de adapter Memory factual GET/PATCH no runtime, somente perfil dedicado validado; sem fallback local silencioso. Schema GloboDemo requerido apenas por este adapter factual, **não como requisito geral de extração semântica Orchestrator**.
- 62 testes locais em5 arquivos passaram; typecheck/build/lint passaram. Testes HTTP/WSS validam assinatura/nonce, opt-in, XML, controles do painel, scope e estados de resultado. Teste de2 sessões Memory usa HTTP mockado, não aprova aceite nativo.
- Servidor isolado local3008 inspecionado no Chrome com IA desligada. Painel mostra SEM RESULTADO NATIVO, sem inventar sucesso. Sem túnel novo, sem chamada.

Arquivos de evidência ignorados: ci-service-review.json, orchestrator-review.json, v3-operators-review.json, v3-access-review.json, v3-current-operators.json e native-panel.png. Relatórios de leitura têm timestamps reais. Nenhum resultado de execução remota foi produzido.

## Custos de referência, USD

Tarifas públicas consultadas em13/10/2026; contrato/franquias da conta e impostos não verificados. Voice PSTN por destino e OpenAI são adicionais; não há orçamento total confirmado.

| Medidor | Referência pública |
| --- | --- |
| Relay |0,07/min;4min de ensaio=0,28 |
| Orchestrator |0,0002/1.000 caracteres ingeridos |
| v3 operador Twilio |0,005/1.000 caracteres input+output, por execução |
| Operador custom |0,002/1.000 input;0,018/1.000 output |
| Memory geração |0,0028/1.000 input+output |
| Memory Recall |0,007 por recall bem-sucedido, inclusive sem matches |
| Perfil utilizado diariamente |0,005 por perfil/dia; escritas têm100mil operações mensais gratuitas, depois0,08/1.000 |
| Classic prebuilt text analysis no Relay |0,0035/min por operador;2min e2 prebuilt=0,014 adicionais;custom cobra caracteres |

[Conversations pricing](https://www.twilio.com/en-us/products/conversational-ai/pricing), [Classic/Voice pricing](https://www.twilio.com/en-us/voice/pricing/us), [integração e billing Classic](https://www.twilio.com/docs/conversation-intelligence-classic/conversation-relay-integration). Não adicionar batch STT a um Relay sem gravação; não abrir outra transcrição passiva. Para v3, incluir prompts/system/schema/tool results nos caracteres por execução; não contar só texto visível. [Billing v3](https://www.twilio.com/docs/conversations/intelligence/understanding-billing).

Exemplo de dimensionamento, não orçamento/fatura:4min Relay0,28;5.000 caracteres ingeridos0,001;2execuções de operador Twilio com6.000 caracteres cada0,06;20.000 caracteres de geração Memory0,056;2recalls0,014;1perfil diário0,005. Soma0,416 mais telefonia/IA e demais execuções. INACTIVE+END pode repetir análise/geração e elevar custo. Não provisionamos nada nem executamos medidores de ingestão/Recall; GETs desta investigação foram apenas control plane.

## Autorizações específicas e prazo estimado

Estimativas de trabalho após credenciais/autorizações prontas; não garantem tempo de processamento do serviço.

| Caminho | Próxima ação remota e impacto | Estimativa |
| --- | --- | --- |
| Classic existente | Aprovar uso do serviço pt-BR (dataLogging true e4 operadores atuais), persistência/análise de transcrição fictícia e1 chamada até120s do número dedicado para o destino de teste. Nenhuma configuração alterada |30–60min, após endpoint separado autorizado |
| Classic dedicado, preferido | Aprovar criar serviço exclusivo e operadores de resumo/classificação/governança do roteiro, sem mudar attachments existentes; ingestão e chamada pagas |1–2h incluindo teste |
| Memory factual | Aprovar store/schema/perfil exclusivo e GET/PATCH de dados sintéticos,2sessões e leituras faturáveis. Não alterar schema dos stores existentes |1–2h; aceite remoto pendente |
| Orchestrator+v3+Memory semântico | Aprovar criar store/perfil/identidade, Orchestrator exclusivo sem captura passiva, Intelligence exclusivo usando operadores atuais e geração/Recall/análises. Aprovar2 chamadas até120s e leitura de resultados exclusivamente desta demo |3–5h se APIs estiverem disponíveis; 404 antigos/listagem podem exigir Console/Support sem prazo garantido |
| WhatsApp Messaging contínuo | Sender exclusivamente autorizado, regra com par restrito sem wildcard, identidade vinculada; mensagem de teste e tarifa. Sem integração Nimo real |Adicionar1–2h após pré-requisitos |
| WhatsApp Calling | Sender dedicado/elegível não confirmado; senderBRonline tier250 abaixo mínimo2.000, outrooffline; ambos sem VoiceApplication |Sem prazo confiável hoje; manter PSTN |

Expor endpoint separado via ngrok também requer autorização; nenhum túnel da versão preservada foi movido/parado. Não usar o número aprovado PSTN como autorização para alterar sender WhatsApp. [Requisitos Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling).

Recomendação: Classic dedicado se houver1–2h disponíveis; Memory factual opcional para provar persistência nativa; manter Orchestrator/v3 como ensaio isolado até obter IDs/resultados/Recall reais. Nimo/ServiceNow permanece mock em todos os caminhos. Não promover qualquer extensão ao roteiro oficial sem teste remoto completo e evidência datada. A demo preservada continua a contingência.
