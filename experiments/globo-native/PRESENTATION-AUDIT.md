# Globo RH — prontidão para 14/10/2026, 14h30 (Brasília)

Auditoria em 13/10/2026. Recomendação: apresentar Voice + Conversation Relay + OpenAI + ElevenLabs reais, continuidade de contexto local e Nimo/ServiceNow mock. Congelar essa versão. Considerar somente Conversation Intelligence clássico como extensão opcional, após autorização e um ensaio com resultado real. WhatsApp Calling e Memory/Orchestrator nativos ficam como arquitetura até cumprir seus requisitos.

Nenhum recurso Twilio foi criado, configurado ou alterado nesta auditoria. Não houve chamada telefônica, gravação, envio WhatsApp, escrita Memory, ingestão Orchestrator ou execução de operadores. A jornada local usou apenas Rafael fictício e a integração OpenAI já autorizada.

## Ponto de recuperação

[Procedimento de recuperação](RECOVERY.md). Snapshot local ignorado pelo Git:

- `.demo-data/recovery/globo-functional-20261013.tar.gz`
- `.demo-data/recovery/manifest.json`

O pacote contém 53 arquivos de código, build e manifests. SHA-256 do pacote e de cada arquivo verificados após extração isolada. Os 48 testes Globo passaram na cópia restaurada, usando as mesmas dependências locais. Credenciais, `.env.local`, senha do painel, dados de runtime e `node_modules` foram excluídos. A recuperação do código inicia o cenário fictício padrão; não representa backup de estado de chamada ou memória atual.

## Jornada auditada

O painel foi inspecionado no Chrome: badges de origem, política fictícia, status, transcrição, memória, resumo e handoff mock estavam visíveis. O registro existente mostrava mudança de 10 para 15 dias e handoff. Ao clicar Nova sessão, os 15 dias foram recuperados; o histórico de conversa foi limpo.

Nas mesmas rotas HTTP usadas pelos botões do painel, os cinco passos foram executados com OpenAI real. Isso foi um teste das rotas e do fluxo, não uma cronometragem de fala humana nem um teste telefônico completo.

| Passo | Tempo observado | Resultado |
| --- | --- | --- |
| Recuperar pedido anterior | 1,203 s | Contexto de Rafael recuperado |
| Explicar política fictícia | 1,274 s | Antecedência e aprovação humana preservadas |
| Atualizar para 15 dias | 1,455 s | Memória local escrita; atualização enviada ao mock |
| Resumir | 1,780 s | Resumo com 15 dias e próximos passos |
| Preparar RH humano | 1,636 s | Handoff Nimo mock preparado, sem ticket real |

Total técnico com a nova sessão: **7,354 s**, cinco respostas OpenAI reais, zero fallback. Nova sessão confirmou retenção dos 15 dias. Evidência local: `.demo-data/presentation-audit.json`.

A auditoria começou com 15 dias já persistidos. Portanto, esse ensaio confirmou escrita/versão e retenção, mas não uma nova mudança numérica de 10 para 15; essa mudança estava visível no registro anterior do painel. Para amanhã, preparar o seed de 10 dias antes de abrir a demo.

## Roteiro de cinco minutos

| Tempo | Ação e fala defensável |
| --- | --- |
| 0:00–0:40 | Rafael fictício, solicitação anterior de 10 dias. “Voz e IA são reais; os dados e a política são fictícios.” |
| 0:40–1:35 | Retomar histórico e consultar antecedência. Mostrar texto em streaming. Se usar telefone, uma nova chamada precisa ser autorizada; o ensaio atual não iniciou chamadas. |
| 1:35–2:25 | Atualizar para 15 dias. Mostrar memória local e versão. “Registramos uma preferência; não aprovamos férias.” |
| 2:25–3:10 | Nova sessão e retomada. Mostrar 15 dias recuperados. “Continuidade persistente demonstrativa; ainda não é Conversation Memory.” |
| 3:10–4:10 | Resumo e handoff. “O contrato Nimo/ServiceNow está mockado; nenhum RH real foi acionado.” |
| 4:10–5:00 | Qualidade e governança, depois arquitetura dos produtos pendentes. Se CI real não estiver validado, manter os insights identificados como locais. |

Preparação: parar somente o backend Globo; mover `apps/globo/.demo-data/rafael.json` para um backup local com nome único; iniciar o backend novamente. Sem esse arquivo, a memória inicia com 10 dias. A senha do painel e `.env` permanecem no local original. Nova sessão preserva memória e não serve como reset do seed.

Contingência: painel local `http://127.0.0.1:3007/globo/`; reiniciar com `GLOBO_AI_ENABLED=false` se for necessário operar totalmente sem rede. O roteiro, resumo, memória e handoff mock funcionam sem OpenAI. Falhas do provedor ativam fallback identificado. Aguardar a conclusão de cada turno antes do próximo clique. Em voz, usar as frases sugeridas: o fluxo reconhece intenções por regras e normaliza a fala antes de enviar contexto fictício ao modelo. A OpenAI gera linguagem a partir de fatos/resposta-base; não escolhe ferramentas nem executa ações corporativas. Perguntas abertas fora desse roteiro podem ser bloqueadas. Após o quinto passo, o botão ainda permite repetir handoff; avançar para resumo/qualidade, sem novos cliques.

## WhatsApp Business Calling

Leitura atual: dois senders, um offline com prefixo norte-americano e um online brasileiro correspondente ao sender configurado. Nenhum tem Voice Application. O sender brasileiro retorna limite de **250 Customers/24hr**, abaixo do mínimo de 2.000 da documentação de Calling. Não foi comprovada exclusividade para Globo ou verificação Meta. Esse metadado não sustenta elegibilidade; confirmar o tier no Console antes de habilitar qualquer recurso. Um número autorizado para testes PSTN não implica autorização para registrar ou alterar um sender WhatsApp.

Caminho seguro: sender exclusivamente de demonstração, WABA elegível, aplicação TwiML dedicada apontando para `/globo/voice`, associação Voice somente nesse sender e teste com participante autorizado. Priorizar chamada iniciada pelo usuário; chamada iniciada pela empresa acrescenta requisito de permissão WhatsApp. A documentação exige verificação empresarial e limite mínimo de 2.000 conversas iniciadas pela empresa em 24 horas. [Twilio — WhatsApp Calling](https://www.twilio.com/docs/voice/whatsapp-business-calling).

O backend também precisa de testes dos endereços `whatsapp:` e da autorização de chamada inbound; o gate atual de teste é feito para a chamada PSTN dedicada. Não basta apontar o sender ao webhook. Decisão: **arquitetura para amanhã**, salvo comprovação imediata de sender dedicado/elegível e autorização específica. Registrar outro sender na mesma WABA de tier insuficiente não resolve, por si só, esse requisito. Não reutilizar o sender online de finalidade não comprovada nem trocar webhooks existentes.

## Conversation Memory e Orchestrator

Leituras GET: dois Memory Stores ACTIVE; um tem um trait group e outro dois. Nenhum tem `GloboDemo`. Duas configurações Orchestrator têm vínculos Memory válidos e não têm capture rules de voz; uma possui captura WhatsApp sem extração, outra possui extração e vínculo Intelligence. Nenhum recurso tem identificação Globo nos metadados consultados; isso não prova compartilhamento, mas também não comprova exclusividade.

A referência Intelligence v3 da segunda configuração respondeu GET 200. A listagem v3 continua vazia. O vínculo não deve ser tratado como quebrado; a diferença entre listagem e fetch requer investigação antes de usar ou criar outra configuração.

O adapter atual `TwilioConversationMemory` lê um perfil e faz PATCH de traits. `recall()` nessa interface não é Recall semântico, extração de observações ou resolução de identidade. O runtime continua instanciando `LocalDemoMemory`; integrar o adapter exige seleção explícita e novos testes. Não basta preencher um SID.

| API/operação necessária | Finalidade | Autorização/validação pendente |
| --- | --- | --- |
| GET `/v1/ControlPlane/Stores` e `/.../{storeId}/TraitGroups` | Inventário e schema | Leituras passaram |
| POST `/v1/ControlPlane/Stores` | Novo store dedicado, caso necessário | Provisionamento específico aprovado |
| POST `/v1/ControlPlane/Stores/{storeId}/TraitGroups` | `GloboDemo.contextJson`, tipo STRING | Escrita em store exclusivamente autorizado; aguardar operação assíncrona |
| POST `/v1/Stores/{storeId}/Profiles` | Perfil Rafael fictício | Autorização de escrita e schema válido |
| GET/PATCH `/v1/Stores/{storeId}/Profiles/{profileId}` | Snapshot persistente de contexto | GET/PATCH permitidos, perfil sintético validado e read-after-write |
| POST `/v1/Stores/{storeId}/Profiles/Lookup` e identificadores | Resolução de identidade entre canais | Identificador fictício e regras isoladas; não usar identidades de colaboradores |
| POST `/v1/Stores/{storeId}/Profiles/{profileId}/Recall` | Memória semântica, se desejada | Autorização de processamento/custo; ainda não implementado |
| POST `/v2/ControlPlane/Configurations` em conversations.twilio.com | Orchestrator dedicado com Memory | Aprovação para criação, polling da operação e configuração ativa |
| `conversationConfiguration` no TwiML Relay | Ingestão somente nas chamadas da demo | Configuração dedicada aprovada e novo teste de chamada |

Autenticação e GETs foram comprovados; escrita, processamento e escopos de uma futura chave restrita não foram testados. A aprovação do usuário é distinta do acesso técnico da credencial. [Schemas de traits](https://www.twilio.com/docs/api/memory/trait-group/create-trait-group), [PATCH de perfil](https://www.twilio.com/docs/api/memory/profile/patch-profile-traits), [APIs Memory](https://www.twilio.com/docs/conversations/memory/api-quickstart).

Preferir ingestão ativa por TwiML, sem capture rules de voz: combinações com captura passiva podem duplicar transcrição e cobrança. O SDK instalado não declara `conversationConfiguration` no tipo de atributos do Relay; qualquer extensão precisa validar o XML emitido sem atualizar dependências compartilhadas à pressa. [Ingestão Orchestrator](https://www.twilio.com/docs/conversations/orchestrator/concepts/ingestion).

Decisão: **arquitetura para amanhã**. Criar schema, perfil, identidade, configuração, conexão no runtime e provar continuidade multicanal acrescenta risco maior que a melhoria visual em cinco minutos. Após aprovação, pode ser desenvolvido em cópia isolada, mantendo a versão congelada.

## Conversation Intelligence real

Há dois serviços clássicos na mesma conta. O serviço pt-BR tem quatro operadores: dois GenerativeJSON, um SentimentAnalysis e um Summarization. As leituras de serviço, attachments e metadados dos quatro operadores passaram. Seus prompts customizados, finalidade e exclusividade não foram validados. Não alterar `autoTranscribe` ou attachments de serviços existentes.

O caminho mais curto é adicionar `intelligenceService` ao TwiML de uma chamada aprovada. Não depende de Memory/Orchestrator. O Relay envia transcrição, sem áudio; os operadores executam ao finalizar a sessão. Idioma do serviço deve coincidir com o STT. Confirmar transcript finalizado e resultados reais pela API, com associação ao sessionId VX da chamada. O app ainda não guarda esse identificador no estado de observabilidade. [Integração nativa Relay/Intelligence clássico](https://www.twilio.com/docs/conversation-intelligence-classic/conversation-relay-integration).

A última chamada da demo não tem gravação, confirmado por GET 200 e zero recordings. O TwiML atual não define `intelligenceService` nem `conversationConfiguration`. Não presumir que um CallSid antigo possa gerar análise retrospectiva. Recomenda-se novo ensaio, após aprovar serviço/processamento/custo e chamada. A captura nativa incluirá falas transcritas antes da normalização local; manter estritamente o roteiro fictício.

Decisão: **única extensão nativa recomendada para tentar hoje**, condicionada a: autorização para usar um serviço dedicado ou reutilização explicitamente aprovada; revisão dos dois operadores customizados; integração local opcional com default desligado; teste de chamada e resultados concluídos. Se algum gate falhar, deixar CI arquitetural e continuar exibindo resumo/métricas locais. Resultados assíncronos não devem bloquear a apresentação; uma interação previamente processada pode ser mostrada como registro real datado.

## O que está pronto, simulado e sujeito a autorização

| Componente | Estado defensável |
| --- | --- |
| Voice, Relay, OpenAI, ElevenLabs | Reais, chamadas anteriores e voz final aprovadas pelo usuário |
| Cinco passos no painel | Auditados nas rotas locais com IA real, sem fallback |
| Identidade e política de Rafael | Fictícias, sem autenticação corporativa ou aprovação automática |
| Persistência | Local demonstrativa; retenção entre sessões comprovada |
| Nimo/EDX/ServiceNow e handoff | Mock; nenhum ticket, mensagem ou transferência real |
| Timeline, resumo do painel e métricas | Locais; não são outputs de produtos nativos Twilio |
| CI clássico | Metadados disponíveis; ingestão e análise desta demo ainda não implementadas/testadas |
| Memory/Orchestrator | APIs e recursos legíveis; não conectados à demo |
| WhatsApp Calling | Caminho técnico identificado; sender dedicado/elegível não comprovado |

Viável hoje sem mudanças remotas: preparação de seed, ensaio cronometrado, materiais arquiteturais e contingência. Com autorização e validação: CI clássico opcional. Não recomendar hoje: habilitação WhatsApp sem WABA pronta, migração Memory/Orchestrator completa, integração EDX real ou mudança de dependências/recursos compartilhados.

Critério para promover uma extensão: ensaio completo, origem real visível, permissão e custos aprovados, nova evidência registrada e rollback ao snapshot. Sem isso, a versão congelada é a versão da apresentação.
