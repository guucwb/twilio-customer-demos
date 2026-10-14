# Globo RH AI Demo

## Preflight operacional para a apresentação

Executar na raiz do workspace:

```sh
npm run preflight:globo -w apps/globo
# Saída estruturada, também sem segredos ou payloads:
npm run preflight:globo -w apps/globo -- --json
```

O comando verifica gateway 3007, serviço 3010, ngrok existente, painel local/público, autenticação, conta alvo, sender/binding da Voice Application, Orchestrator, Memory, Intelligence v3, credenciais por GET de metadados, modelos/voz/português, parâmetros aprovados, estado do cenário, evidências de execução anteriores e checksums dos backups. Não altera `.env`, perfis CLI, sender, recursos remotos, processos, histórico ou seleção do cenário. Não gera áudio, Recall, inferência, chamadas, mensagens ou execução de operadores.

Cada teste informa categoria, resultado, descrição segura e duração em milissegundos. **CONFIGURAÇÃO** verifica parâmetros/vínculos; **DISPONIBILIDADE** verifica acesso nesta execução; **EXECUÇÃO PRÉVIA** valida os artefatos e recursos persistidos do ensaio anterior. HTTP 200 não comprova uma chamada nova. O script não afirma disponibilidade atual de inferência com base no catálogo dos modelos, nem verifica novamente elegibilidade Meta por uma API que não a expõe; distingue confirmação manual anterior e ensaio real documentado.

| Resultado | Exit code | Significado |
| --- | ---: | --- |
| PRONTO | 0 | Requisitos críticos e evidências verificados no escopo de leitura; sem ressalvas detectadas. |
| ATENÇÃO | 2 | Sistema pode operar, mas há condição a revisar; automação deve tratar separadamente. |
| BLOQUEADO | 1 | Requisito crítico ausente, incoerente ou indisponível; não iniciar a demo até revisar. |

`npm` imprime sua mensagem de lifecycle quando o exit é diferente de zero, inclusive ATENÇÃO; isso é esperado. A saída JSON do script é segura, mas `npm` adiciona seu cabeçalho; para JSON puro usar `npm run --silent preflight:globo -w apps/globo -- --json`.

Timeout de rede de 8 segundos por GET, conexão local de 2 segundos e codecs de 2,5 segundos. Respostas são limitadas a 4 MiB. Redirecionamentos são rejeitados para evitar encaminhar autorização a outro destino. TLS permanece obrigatório. O wrapper reutiliza somente a CA administrativa existente, com escopo no processo filho, sem mudar certificados globais. Falhas são sanitizadas e nenhuma resposta bruta, telefone do participante, senha ou token aparece no terminal. Backups e origens de memória são lidos, nunca restaurados ou reprocessados. O script não importa o bootstrap/config do servidor para evitar criação de diretórios ou inicialização de integrações.

**Execução autenticada em 14/10:** ATENÇÃO, exit 2, 5,2 segundos; 23 checks PRONTO e 2 ATENÇÃO. Serviços, túnel, controles de acesso (401/200), conta, sender/Voice App, três produtos nativos, modelos/voz, saldo ElevenLabs por metadados, provas reais anteriores e backups conferidos. As ressalvas são: EQ-DEMO-2001 já no estúdio 5 e resultado semântico inadequado de urgência da chamada mista. Nenhum bloqueio crítico permaneceu. 163 testes nativos passaram (incluindo 12 do preflight), assim como o typecheck. Não foi executado teste cobrado de conversa. Não usar o pedido atual para alegar nova mudança 4 → 5; o mecanismo de cenário novo está documentado abaixo e não foi acionado nesta rodada.

### Parecer de participação por QR Code

**NO-GO para participação na apresentação de hoje.** Um QR Code não cria isolamento; a aplicação atual é restrita ao apresentador. Nenhum QR Code, whitelist adicional, endpoint público ou alteração de sender foi implementado.

| Critério | Evidência na aplicação atual | Parecer |
| --- | --- | --- |
| Texto livre | WhatsApp aceita `NumMedia=0`/`Body` do remetente autorizado; normalização restringe férias/equipamentos. Não é um assistente geral. `native/server/file-audio.ts:18` e `:52`; `vacation.ts:15`. | Parcial, somente dentro do roteiro. |
| Outros números | Comparação exata `From`/`To` na mensageria; Calling admite exclusivamente o par autorizado e depois exige CallSid aprovado. `file-audio.ts:19`; `app.ts:42`. | Não suportado. |
| Perfil/Memory por participante | Um `config.opProfile`, `NativeOperationalMemory`, `NativeVacationMemory` e adapter por processo/cenário. `index.ts:27`, `:29`, `:43`, `:68`. Não há resolução dinâmica autorizada por participante no backend. | Isolamento ausente para audiência. |
| Concorrência | Notas têm fila global `chain`; cada chamada ganha `HRSession`, mas todas usam o mesmo `journey` e `vacation`; `newSession` limpa draft/confirmação globais. `file-audio.ts:13`; `index.ts:45`; `operations.ts:9`. | Risco de interferência se a allowlist fosse aberta. |
| Fora do escopo | Calling devolve orientação restrita com resposta-base controlada. Mensageria lança `outside-demo-scope`, registra falha e pode ficar sem resposta, após STT no caso de áudio. `glo-session.ts:30`; `file-audio.ts:49`, `:52`. | Não garante experiência geral nem resposta útil a toda mensagem; não houve teste público. |
| Abuso e ações | Assinatura Twilio, conta, allowlist, nonce, idempotência, dono/versão e confirmação; limites de mídia/HTTP, 4 sockets, 20 tickets e chamada de 10 minutos. Não há quota por participante, rate limiting temporal ou orçamento global de inferência/TTS. `app.ts:31`; `relay.ts:18`, `:24`, `:29`, `:35`; `execution.ts:19`; `operations.ts:23`. | Proteções de demo existentes, insuficientes para abertura a desconhecidos. |
| Modo demonstrativo separado | Existe isolamento Rafael/Gustavo por cenário, não um sandbox por visitante. Saída das mensagens é enviada ao telefone configurado; painel possui estado único e ações administrativas. `index.ts:59`, `:66`, `:70`. | Abrir o mesmo sender/estado consumiria a demo principal; NO-GO. |

Apenas remover a restrição de telefone não basta: o perfil e as referências continuariam sendo os do Gustavo, e respostas permaneceriam direcionadas ao telefone fixo. Assinatura Twilio autentica o webhook, não concede autorização corporativa ao participante.

**Estimativa para implementação futura, um engenheiro:** piloto de poucos participantes previamente autorizados, aproximadamente **2–3 dias úteis (16–24 h)** para resolução de identidade, perfis e estado por participante, destinatário dinâmico, filas/locks independentes, allowlist com expiração, limite de consumo, respostas fora do escopo e testes reais de concorrência/continuidade/replay. Acesso aberto por QR Code, aproximadamente **4–7 dias úteis**, incluindo controles de abuso/consentimento/retenção, observabilidade e ensaio de carga. São estimativas técnicas, não recursos implementados ou consumo aprovado nesta rodada. Integração compartilhada do sender exigiria desenho de roteamento e autorização próprios; preferir uma configuração/experiência dedicada para preservar o apresentador. Para hoje, manter a jornada validada com o único telefone autorizado.


## Ensaio Gustavo com memória nativa e painel claro

Esta é a evolução atual da demonstração. Rafael, EQ-DEMO-1002 e os arquivos de recuperação anteriores permanecem preservados. O cenário `gustavo-20261014-01` usa Memory Store, perfil e Orchestrator próprios, com Voice e WhatsApp associados à mesma identidade fictícia. Reutiliza Intelligence v3 dedicado sem modificar seus operadores. Nimo/ServiceNow continua simulado.

Painel de apresentação: **https://gustsantos.ngrok.io/globo/native/?presentation=1** (autenticação existente). No Mac: **http://127.0.0.1:3010/globo/native/?presentation=1**. O painel claro apresenta interação, contextos e resultados nativos; IDs, JSON, versões e proveniência ficam em evidências recolhidas. Nenhum fixture é exibido como análise nativa nesse modo.

Se os processos já estiverem executando, não inicie duplicatas. `npm run start:native -w apps/globo` inicia somente o serviço da porta 3010. `npm run start:gateway -w apps/globo` inicia o gateway 3007; `npm run start:all -w apps/globo` inicia ambos. O ngrok existente aponta para o gateway 3007 e seus outros consumidores devem ser preservados. `npm run build:native -w apps/globo` gera os assets do painel.

### Roteiro de cinco minutos

1. **0:00–1:00:** enviar nota de férias com um mês e datas indefinidas. Mostrar orientação fictícia, sem solicitação ou aprovação. Nenhum mês vem pré-carregado.
2. **1:00–2:30:** enviar nota dos dois kits completos no estúdio quatro, gravação em meia hora; responder “Compatível com demo RX” e confirmar a abertura. Só prosseguir quando o adapter simulado confirmar um novo pedido em estúdio 4.
3. **2:30–4:00:** ligar pelo WhatsApp ao sender autorizado. Pedir mudança dos microfones para estúdio cinco; ouvir a pergunta e confirmar. Mostrar mesmo pedido, local 4 → 5 e execução explicitamente simulada.
4. **4:00–4:40:** na mesma chamada, retomar férias: “O que falta eu informar?”. Glô deve recuperar o mês pela API Memory e pedir início/fim e validação humana, sem enviar RH às ferramentas de equipamento.
5. **4:40–5:00:** mostrar resultados disponíveis do Intelligence v3 e abrir uma evidência. Extração assíncrona pode exigir espera após encerramento; resultados ausentes permanecem ausentes. Não apresentar prazo declarado como SLA, estoque ou entrega confirmada.

A velocidade real depende da rede e do áudio do participante. Não acelerar o aceite omitindo compatibilidade, confirmação ou evidência de mudança efetiva.

### Como Memory é comprovado

O backend ingere o texto STT como Communication nativa vinculada ao recurso WhatsApp e ao perfil Gustavo. Depois grava em `GloboVacation.originJson` **somente identidade, assunto e referências da comunicação**, sem o mês. Cada agente novo consulta o perfil e faz Recall nativo com a Conversation de origem. Usa exclusivamente a Communication retornada com ID, canal e autor/perfil correspondentes. O mês é derivado desse conteúdo; datas permanecem indefinidas neste roteiro restrito. Uma falha de Recall remove o contexto e pede esclarecimento. O agente não recebe todo o histórico via LLM nem lê arquivos de evidência para responder.

Os arquivos privados `vacation-recall-last.json` e `vacation-independent-recall.json` registram consulta, origem, fatos retornados e sessões distintas. `NODE_EXTRA_CA_CERTS="$PWD/apps/globo/.demo-data/macos-trusted-ca.pem" node --import tsx apps/globo/scripts/prove-gustavo-recall.ts` valida um processo novo sem histórico local, por leitura. Comunicação, observações e resumo podem ter tempos diferentes de disponibilidade; a recuperação deste roteiro usa o texto da comunicação retornado pelo Recall e não alega extração automática de um trait de mês.

Equipamentos usam apenas referências nativas de pedido. Quantidade, local, status e versão são consultados no adapter simulado, que preserva histórico e idempotência. Observação antiga em Memory nunca sobrescreve o pedido atual. O cenário começa sem pedido; EQ-DEMO-2001 é o primeiro protocolo esperado, separado de EQ-DEMO-1002.

### Recuperação segura

Antes da evolução, foram preservados source/build em `.demo-data/recovery/globo-before-gustavo-20261014.tar.gz` com checksum. Todos os backups anteriores permanecem intactos; `.env` global/local, voz Relay, TTS v4 e ledger Rafael não foram sobrescritos. O seletor `.demo-data/active-scenario.json` é a única ativação local de recursos novos.

Para voltar ao cenário Rafael: com aplicação ociosa, executar `node apps/globo/scripts/scenario.mjs rafael` e recarregar **apenas** a aplicação nativa. Não parar gateway/ngrok ou remover recursos remotos. Para reativar Gustavo: `node apps/globo/scripts/scenario.mjs activate gustavo-20261014-01`, seguido de recarga nativa ociosa. Os arquivos de cada cenário ficam separados em `.demo-data/<conta>/scenarios/<cenário>/`.

Para um ensaio do zero, criar outra configuração dedicada com nome novo: `NODE_EXTRA_CA_CERTS="$PWD/apps/globo/.demo-data/macos-trusted-ca.pem" node --import tsx apps/globo/scripts/prepare-gustavo.ts gustavo-20261014-02`; verificar `prepared=true`, ativar esse nome e recarregar somente o nativo ocioso. Isso cria novos recursos nativos, com consumo de demo aprovado; não apaga nem reescreve histórico. Repetir as notas reais. **Não restaurar artificialmente local 4 sobre o pedido já alterado para 5 nem usar uma gravação como se fosse um evento novo.**

### Controles e limites

Assinaturas HTTP/WSS, vínculo CallSid/nonce, allowlist do telefone de teste, perfil próprio por Store, sessão fictícia e confirmação são controles demonstrativos. Tags RH/equipment são roteamento, não autorização corporativa. Entradas com informações sensíveis são bloqueadas; RH não invoca o adapter de equipamentos. Produção precisaria identidade corporativa, autorização por domínio e pedido, consentimento, retenção, auditoria e contrato real EDX/Nimo/ServiceNow.

O painel público sem autenticação retorna 401; webhook sem assinatura retorna 403. As notas saem via URLs temporárias assinadas, e reprodução no painel exige autenticação. O TTS das notas continua Eleven v4/Nayara, sem tags; os parâmetros Calling/Relay aprovados não são alterados para esta narrativa.

**Ensaio real concluído em 14/10:** quatro notas de entrada pelo webhook, quatro respostas em áudio entregues e reprodução confirmada pelo usuário; protocolo de abertura também entregue. EQ-DEMO-2001 criado no estúdio 4/versão 1 e alterado após confirmação para estúdio 5/versão 2 na ligação, com uma criação e uma atualização. Na mesma chamada, a Glô recuperou dezembro pelo Recall da comunicação original e orientou sobre datas e RH. O usuário confirmou ouvir os dois assuntos. Zero falhas, zero recuperação manual e replay assinado sem novo envio ou atualização. As três Conversations encerradas têm o mesmo perfil Gustavo e a configuração dedicada.

151 testes nativos, 51 testes da aplicação original, typecheck e build passaram. Os testes automatizados também cobrem março/agosto/dezembro, agente novo, Recall sem origem, entrada mista bloqueada e nenhum contexto RH enviado ao composer/equipment tools. **Outro mês foi validado em testes automatizados, não em áudio real.** O ensaio incluiu pausas para comprovação independente e recarga; não é uma medição de cinco minutos corridos.

Intelligence v3 retornou 15 resultados nativos (5 operadores em 3 Conversations). A nota inicial contém extração de dois kits completos, DEMO-RX, estúdio 4, prazo declarado de meia hora e urgência. A chamada contém “microfones” e “Estúdio 5”, sem quantidade/prazo extraídos nessa execução. Sem comprovação nativa de estoque, entrega, reincidência ou resolução física. O operador de urgência da chamada mista retornou a antecedência de férias de 30 dias como prazo e a retomada de férias como atividade bloqueada: isso é um erro semântico, embora os trechos sejam reais. Foi preservado nas evidências e **não usado nos cartões operacionais**, que explicitamente analisam a nota inicial. Não foi alterado o operador dedicado existente.

Latências medidas, em segundos:

| Interação | Total até conclusão | Download | STT | IA/adapter/Memory | TTS + codec | Envio + entrega |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Férias | 25,56 | 1,91 | 1,66 | 1,62 | 4,85 | 7,42 |
| Pedido dos kits | 24,02 | 1,92 | 1,72 | 1,41 | 3,38 | 7,39 |
| Compatibilidade | 21,52 | 1,35 | 2,34 | 1,63 | 3,22 | 7,44 |
| Abertura | 26,35 | 1,27 | 1,73 | 1,75 | 3,60 | 11,25 |

Total usa `occurredAt` Twilio até conclusão da ingestão nativa da resposta; inclui recepção/fila, consultas e saída nativa. Não é latência até o primeiro som ouvido. Envio/entrega é TTS+envio menos TTS+codec, incluindo a mensagem textual de protocolo quando existe. IA, adapter e Memory foram instrumentados juntos; a resposta RH é determinística a partir do Recall e não faz chamada LLM. A duração dos áudios foi 21,13 / 12,49 / 9,93 / 13,85 segundos. As etapas não cobrem todo o total individualmente, e não foram inventadas medidas faltantes.

Evidências privadas no diretório do cenário: `rehearsal-before-calling.json`, `gustavo-rehearsal-proof.json`, `vacation-independent-recall.json`, `vacation-recall-last.json`, `gustavo-replay-proof.json`, `gustavo-native-intelligence-proof.json`, além dos ledgers `audio.json` e `execution.json`. O painel disponibiliza as evidências autenticadas, recolhidas por padrão. HTTP público sem autenticação: 401; webhook sem assinatura: 403; WSS sem assinatura: 403; replay HTTP assinado: 200, estado e ledger inalterados.


Incremento Glô: [nota de voz dinâmica, setup e aceite](VOICE-NOTES.md). TTS ElevenLabs, resposta dinâmica e reprodução no WhatsApp validados. Calling permanece preservado; veja métricas e recuperação da confirmação no relatório incremental.

## Variante nativa na nova conta — execução atual

A demo atual usa `native/`, isolada da versão RH preservada. Leia [NATIVE-DELIVERY.md](NATIVE-DELIVERY.md) para recursos, evidências, roteiro e rollback. As seções abaixo descrevem a versão RH original e sua contingência; não representam o estado das integrações da variante nativa.

```sh
npm run build:native -w apps/globo
npm run start:all -w apps/globo
```

Painel atual: `http://127.0.0.1:3007/globo/native/` ou `https://gustsantos.ngrok.io/globo/native/` com autenticação. Não inicie outro servidor nas portas 3007/3010 enquanto os processos atuais estiverem ativos. O gateway preserva `/globo/`; a variante usa credenciais da conta alvo em `.env.local`, sem sobrescrever `.env` global. Voz aprovada preservada. Não reinicie nem recrie o ngrok existente.

Demo isolada em português brasileiro para 14/10/2026, 14h30 (Brasília). Rafael, a solicitação FER-DEMO-1042 e todas as políticas são fictícios. A aplicação nunca aprova férias nem altera sistemas corporativos.

## Executar

Na raiz do workspace:

```sh
npm install --ignore-scripts
npm run build -w apps/globo
npm run start -w apps/globo
```

Abra `http://127.0.0.1:3007/globo/`. Para desenvolvimento com atualização automática: `npm run dev -w apps/globo` e `http://127.0.0.1:5177/globo/`. Os comandos CarePlus da raiz continuam iguais.

Credenciais são carregadas somente no servidor a partir do `.env` existente da raiz. Overrides opcionais ficam em `apps/globo/.env.local`, ignorado pelo Git. `.env.example` fornece os valores públicos padrão. Não copie credenciais para o frontend ou comandos de terminal.

O agente usa a credencial OpenAI e o modelo já configurados no ambiente. `GLOBO_OPENAI_MODEL` permite override. Para executar sem rede/modelo, use `GLOBO_AI_ENABLED=false`; a mesma jornada funciona com respostas determinísticas claramente marcadas como roteiro. Falhas do modelo ativam essa contingência e incrementam o contador de qualidade.

## Domínio ngrok e acesso

```sh
npm run tunnel -w apps/globo
npm run verify:tunnel -w apps/globo
```

O wrapper usa a configuração local ngrok existente, solicita `https://gustsantos.ngrok.io` e nunca encerra túneis preexistentes. Se houver um agente com túneis ativos, ele falha com uma mensagem curta. A inspeção de tráfego ngrok está desativada. A URL só deve ser considerada funcional depois de `verify:tunnel` passar.

| Rota | Uso | Proteção |
| --- | --- | --- |
| `/globo/` | Painel de apresentação e assets | HTTP Basic no domínio público |
| `/api/globo/state` | Estado e transcrição normalizada | Mesmo controle do painel |
| `/api/globo/turn` | Turno do roteiro fictício | Basic público, origem permitida, JSON e header da demo |
| `/globo/voice` | Webhook que retorna Connect > ConversationRelay | Assinatura Twilio, conta e CallSid aprovado |
| `/globo/relay` | Upgrade WSS e mensagens Relay | Assinatura Twilio, setup com conta, CallSid e nonce |
| `/globo/voice/end` | Callback Connect / Hangup | Assinatura, conta e sessão emitida |

No domínio público, usuário **demo** e senha gerada em `apps/globo/.demo-data/panel-password.txt`. Abra esse arquivo localmente no editor; não compartilhe seu conteúdo em logs, chat ou Git. O arquivo tem permissão 0600. O painel local permite acesso de loopback com Host conhecido; requests de proxy/túnel não podem usar essa exceção. Uma substituição opcional pode ser definida em `GLOBO_PANEL_PASSWORD`.

## Voz padrão

Configuração centralizada em ambiente:

```dotenv
GLOBO_TTS_PROVIDER=ElevenLabs
GLOBO_TTS_LANGUAGE=pt-BR
GLOBO_TTS_VOICE=5p4THmLc2S6kXKO1pOM5-1.06_0.5_0.8
GLOBO_STT_PROVIDER=Google
GLOBO_STT_LANGUAGE=pt-BR
GLOBO_STT_MODEL=telephony
```

O identificador completo é preservado: velocidade 1.06, estabilidade 0.5, similaridade 0.8. Nenhuma voz é hardcoded no endpoint. O formato é validado antes de iniciar o servidor. A Twilio documenta ElevenLabs Flash 2.5 como modelo padrão e suporte a pt-BR; isso não comprova a disponibilidade individual desta voz. Não usamos SSML/phoneme, cujo suporte ElevenLabs no Relay é restrito a en-US.

Fontes: [configuração de voz Conversation Relay](https://www.twilio.com/docs/voice/conversationrelay/voice-configuration), [vozes multilíngues ElevenLabs](https://elevenlabs.io/docs/overview/capabilities/voices).

## Uma chamada real autorizada

Nenhuma chamada é iniciada pela interface, pelo start, pelo build ou pelos testes automatizados. O webhook nega CallSids fora de `GLOBO_ALLOWED_CALL_SIDS`. Nunca substitua webhooks de um número existente para testar esta demo.

O teste dedicado usa uma URL específica na criação de UMA chamada de saída, sem alterar a configuração do número. Ele exige autorização explícita do usuário de que `TWILIO_VOICE_NUMBER` é dedicado e que `DEMO_CUSTOMER_VOICE_PHONE` é o destinatário autorizado. Somente após essa autorização, habilite temporariamente `GLOBO_TEST_CALL_APPROVED=true` em `.env.local`, reinicie o servidor e execute:

```sh
npm run test:call -w apps/globo -- --approved-one-call
```

A permissão HTTP é emitida uma vez por execução do servidor, expira em 120 segundos e vincula From, To, conta, assinatura e um único CallSid. O teste limita a chamada a 120 segundos, não grava áudio, não altera webhooks e não faz retry de criação. Remova a flag temporária e reinicie o servidor ao terminar. O teste pode gerar cobrança Twilio. Não execute novamente sem autorização para outra chamada.

Na ligação, represente apenas Rafael fictício. Diga: “Você lembra da minha solicitação de férias?”, “Qual a antecedência?”, “Quero quinze dias em novembro”, “Resuma os próximos passos”, “Quero falar com o RH humano”. Diga “encerrar” ou pressione 0 para devolver controle ao callback que desliga.

Onboarding: no Console Twilio, confirme a habilitação de Conversation Relay e o aceite existente do Predictive and Generative AI/ML Features Addendum. A demo não aceita termos ou modifica a conta automaticamente. Uma conexão Relay efetiva e a fala no telefone são as provas operacionais; testes de assinatura local não comprovam onboarding.

Avaliação de áudio: anote se “Rafael”, “férias”, “novembro” e “RH” foram pronunciados naturalmente; teste uma interrupção; compare o intervalo do fim da pergunta ao primeiro áudio ouvido. A métrica do painel mede o primeiro token do agente, não a latência total de STT + LLM + TTS + telefonia. Pronúncia e naturalidade dependem de avaliação de quem ouviu a chamada.

## Memória, orquestração e Nimo

`MemoryAdapter` define `recall()` e `update()`. `LocalDemoMemory` persiste apenas o contexto fictício em `.demo-data/rafael.json`, com escrita atômica e validação. “Nova sessão” limpa a conversa atual, recuperando o contexto persistente. Ela não reseta os dias para 10. Se um arquivo estiver corrompido, a aplicação falha sem inventar recuperação. Para restaurar o cenário inicial, pare o servidor e mova esse arquivo para um backup ignorado antes de reiniciar.

`TwilioConversationMemory` fornece GET de perfil e PATCH de traits segundo o contrato oficial. Ele está **desativado no runtime padrão**, exige store/profile de demonstração validados, trait group `GloboDemo` e trait string `contextJson` previamente configurados, além de autorização explícita para escrita. Nenhum store existente é selecionado automaticamente. Os testes desse adapter usam respostas mockadas; não comprovam escrita remota. [Contrato oficial de PATCH de perfil](https://www.twilio.com/docs/api/memory/profile/patch-profile-traits).

`npm run preflight -w apps/globo` faz somente GET de metadados: conta, stores, configs de Orchestrator e Intelligence v3. Não consulta perfis ou comunicações. Não cria nem altera recursos. Os stores existentes foram investigados, mas sua exclusividade e os perfis fictícios não foram validados; por isso não são usados pela demo.

A timeline é **orquestração local da aplicação**, não Conversation Orchestrator Twilio. Resumo e métricas são derivados localmente, não resultados de operadores Twilio Intelligence. Integrações nativas permanecem pendentes até recursos dedicados e contratos validados.

`NimoAdapter` define `authorizedHistory`, `updateContext` e `registerHandoff`. `MockNimoServiceNow` aceita somente `rafael-demo`, retorna histórico fictício e identifica encaminhamentos como simulados. Não há chamadas à EDX, Nimo ou ServiceNow nem abertura real de ticket.

## Governança

O modelo recebe apenas contexto sintético, política fictícia, intenção canônica e resposta-base. Texto livre da fala não é enviado à OpenAI. O normalizador extrai somente uma intenção suportada e uma quantidade de dias entre 1 e 30; outras informações não entram na memória. CPF, e-mail, sequências longas de números, temas sensíveis e instruções de mudança de prompt são bloqueados. Isso é uma restrição de roteiro de demonstração, não uma solução de DLP para produção.

A transcrição mostrada para chamadas é normalizada, identificada no painel; não é a fala literal. Áudio é transcrito pela Twilio somente em chamadas autorizadas. Use dados fictícios também ao falar no telefone. Respostas OpenAI são transmitidas em streaming com `store:false`. Credenciais, números reais, objetos SDK e erros brutos nunca entram no estado público ou logs.

## Testes

```sh
npm run test -w apps/globo
npm run typecheck -w apps/globo
npm run build -w apps/globo
npm run lint -w apps/globo
npm test
npm run smoke:ai -w apps/globo
```

`smoke:ai` faz uma requisição real ao modelo usando Rafael fictício e imprime apenas métricas. HTTP/WebSocket e adapters são testados localmente sem chamadas ou dados reais. Em ambiente restrito que bloqueia sockets (`EPERM`), execute os testes fora dessa restrição; não interprete esse bloqueio como resultado funcional do código. Resultados observados estão em [VALIDATION.md](VALIDATION.md).

## Apresentação em cinco minutos

| Tempo | Demonstração |
| --- | --- |
| 0:00–0:40 | Apresente Rafael, o pedido anterior de 10 dias e os indicadores de origem. Explique que a política é fictícia. |
| 0:40–1:40 | Retome o histórico e pergunte a antecedência. Use ligação validada ou o roteiro do painel. Mostre resposta em streaming e transcrição. |
| 1:40–2:40 | Atualize para 15 dias em novembro. Mostre memória e timeline; destaque que aprovação permanece pendente. |
| 2:40–3:30 | Em modo demonstrativo, clique Nova sessão e retome o histórico. Mostre que os 15 dias foram recuperados. |
| 3:30–4:30 | Gere resumo e prepare handoff. Mostre contrato Nimo/ServiceNow identificado como mock. |
| 4:30–5:00 | Mostre qualidade e governança; identifique Memory, Orchestrator, Intelligence nativos e WhatsApp Calling como pendentes quando não conectados. |

## Contingência

- Falha OpenAI: continue com fallback identificado como roteiro; para ensaio totalmente offline, reinicie com `GLOBO_AI_ENABLED=false`.
- Falha ngrok/rede: use `http://127.0.0.1:3007/globo/`. O painel, memória, resumo e handoff mock continuam disponíveis localmente.
- Falha de voz/onboarding: encerre o teste e use o modo demonstrativo. Não troque números ou webhooks existentes para contornar a falha.
- WhatsApp Business Calling: permaneça como pendente; sender online ainda sem configuração Voice e elegibilidade Meta não comprovada. Alteração exige autorização específica.
- Ao encerrar o ensaio: pare apenas os processos Globo e seu túnel, remova autorização temporária de chamada. Nenhum deploy de produção é necessário.

### Ajuste de entonação

Após a avaliação do usuário, o agente passou a formular respostas mais acolhedoras, com frases curtas, ritmo variado e perguntas naturais. `SpeechChunks` reúne o texto em trechos com pontuação e contexto (45 a 200 caracteres) antes de enviá-lo ao Relay, mantendo streaming sem aguardar a resposta inteira. Tokens do modelo continuam aparecendo progressivamente no painel. Interrupções descartam os trechos ainda não enviados.

Esse agrupamento é um experimento de prosódia da aplicação. Não garante emoção e não altera por si só os parâmetros de voz. Após feedback de ritmo lento, a velocidade foi comparada em 1.05 e 1.15; após feedback de fala rápida, a voz aceita pelo usuário foi fixada com velocidade 1.06 e estabilidade 0.50; similaridade 0.80 foi mantida. A combinação final foi validada em configuração e aprovada pelo usuário em chamada real. O painel distingue primeiro token do modelo de primeiro trecho enviado ao Relay. Nenhum deles é uma medição do áudio ouvido. Não adicionamos tags de emoção ou SSML incompatíveis com esta integração. [Orientações ElevenLabs para texto, pontuação e entrega](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/best-practices).

Configuração final escolhida: velocidade **1.06**, estabilidade **0.50**, similaridade **0.80**, voz **5p4THmLc2S6kXKO1pOM5**. O usuário aprovou esse timbre no telefone e autorizou ajustar estabilidade/similaridade. Estabilidade 0.50 é um ponto inicial equilibrado para variar entonação; similaridade 0.80 mantém o timbre escolhido. A recomendação não substitui avaliação do áudio. [Guia oficial ElevenLabs de estabilidade e similaridade](https://elevenlabs.io/docs/eleven-creative/playground/text-to-speech).

## Preparação da apresentação

Auditoria, recomendação de integrações, APIs/permissões e roteiro: [PRESENTATION-AUDIT.md](PRESENTATION-AUDIT.md). Versão funcional preservada e restauração testada: [RECOVERY.md](RECOVERY.md). O relatório de auditoria atualiza a interpretação do vínculo Intelligence v3: GET por ID passou, embora a listagem esteja vazia.

### Correção do ensaio de 14/10 — cenário Gustavo 02

Falhas comprovadas: regras de confirmação/compatibilidade descartavam outras entidades na mesma frase; extração aceitava quantidade de kits, mas não “três microfones”; novos turnos substituíam o rascunho por campos incompletos. O painel mostrava processamento em andamento mesmo após erro terminal. A última nota falhou em `openai-stt`, depois do download; o código HTTP antigo não foi registrado e a causa específica do provedor permanece desconhecida. As respostas anteriores constam como entregues; nenhum pedido foi criado neste ensaio antes da correção.

Correção localizada: extração e combinação de quantidade/item/local/compatibilidade; distinção explícita de microfones individuais e kits; pergunta somente por campos ausentes; confirmação e idempotência mantidas. O rascunho de workflow é persistido em `workflow-draft.json` dentro do cenário, identificado como armazenamento local de workflow, **não Conversation Memory**. Referências de pedidos confirmados continuam usando o adapter nativo existente. O ledger registra entidades e rascunho antes/depois das novas interações; erros terminais têm horário e código sanitizado. Falha de síntese mantém o fallback textual existente, sem exibir processamento indefinido.

Validação local: 183 testes nativos, 51 testes da aplicação original, typecheck e build passaram. STT, TTS e APIs nativas são mockados nos testes automatizados; isso não constitui novo aceite de áudio real. GET local 200, painel público 401 sem autenticação e 200 autenticado, com TLS verificado. Gateway e ngrok mantiveram seus processos; somente o serviço nativo ocioso foi reiniciado. Cenário, ledger histórico, vozes, operadores e recursos nativos preservados. Nenhuma chamada ou mensagem foi disparada nesta correção.

Evidências privadas: `.demo-data/<EXPECTED_TWILIO_ACCOUNT_SID>/scenarios/gustavo-20261014-02/failure-before-equipment-repair/` e `equipment-repair-validation.json`. Código/build anterior: `.demo-data/recovery/globo-before-equipment-repair-20261014.tar.gz`. Para rollback, pare somente o serviço nativo quando ocioso, restaure `native/` e `native-dist/` do arquivo nos respectivos caminhos (`native/` e `.demo-data/native-dist/`) e inicie `npm run start:native -w apps/globo`. Preserve ledgers e cenários; não restaure credenciais nem configurações remotas. O novo teste real depende de envio manual do participante.
