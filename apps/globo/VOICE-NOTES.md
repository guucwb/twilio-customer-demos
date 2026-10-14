# Evolução demonstrativa da Glô: nota de voz dinâmica

Incremento sobre apps/globo/native, sem substituir a Glô existente em produção. Calling, Relay, Memory, Orchestrator, Intelligence v3 e backups continuam no mesmo ambiente. Nimo/EDX/ServiceNow permanece um adapter demonstrativo explicitamente simulado.

## Estado em 13/10/2026

Recepção real, STT OpenAI de um falante, ingestão de texto em Orchestrator/Memory/Intelligence e resposta WhatsApp textual foram comprovados na rodada anterior. Acesso à voz Nayara Técia e ao modelo com português validados por GET autenticado. Após o usuário ativar o plano Starter existente, a síntese real funcionou: **amostra OGG/Opus de 14,078s, síntese em 3,768s, MessageSid MM8345c3420c841039f370197393016574 entregue (`delivered`)**. GET/HEAD pelo ngrok retornaram 200, com hash do arquivo conferido. O usuário confirmou que as notas apareceram com controle de reprodução e tocaram normalmente. A amostra é identificada como teste de TTS, não prova do fluxo dinâmico de entrada→saída nem memória nativa. Calling conserva a configuração aprovada.

Configurar somente em apps/globo/.env.local, ignorado pelo Git, usando uma conta ElevenLabs existente com acesso à voz e créditos; nunca enviar chave no chat. Não é necessário contratar outro serviço ou aceitar termos pelo agente. O servidor faz GET da voz e dos modelos para validar acesso e português antes de permitir síntese. Se o acesso falhar, informa bloqueio e usa fallback textual; não seleciona outra voz.

| Configuração | Arquivo de fala | Calling preservado |
|---|---|---|
| Voice ID | 5p4THmLc2S6kXKO1pOM5 | mesmo ID |
| Speed | 1.10 | 1.09 atualmente |
| Stability / Similarity | 0.35 / 0.85 | 0.50 / 0.80 |
| Style | 0.20 | configuração preservada |
| API | ElevenLabs direct TTS, voice_settings próprios | Twilio ConversationRelay, identificador composto |
| Idioma/modelo | eleven_multilingual_v2, suporte pt verificado | pt-BR / ElevenLabs |

Variáveis públicas de configuração em `.env.example`: GLOBO_AUDIO_TTS_ENABLED, GLOBO_AUDIO_TTS_VOICE_ID, GLOBO_AUDIO_TTS_MODEL, GLOBO_AUDIO_TTS_SPEED, GLOBO_AUDIO_TTS_STABILITY, GLOBO_AUDIO_TTS_SIMILARITY, GLOBO_AUDIO_TTS_STYLE, GLOBO_AUDIO_MEDIA_TTL_SECONDS. Credencial ELEVENLABS_API_KEY permanece só no servidor. Não há controle que transforme automaticamente a voz em sotaque carioca; naturalidade/sotaque dependem da voz e da avaliação auditiva. Nenhuma substituição/clonagem foi feita.

## Fluxo e evidências

1. Webhook verifica assinatura Twilio, conta alvo e par de endereços autorizado. MessageSid SM/MM é registrado antes de STT, ferramentas ou TTS. ACK vazio imediato; processamento serial assíncrono. Replay não repete cobrança ou ação.
2. Download autentica na API Twilio e valida conta/MessageSid/MediaSid, MIME, tamanho e timeout. Somente redirecionamento para mms.twiliocdn.com é permitido; Authorization não é encaminhado ao CDN. STT OpenAI recebe só áudio fictício autorizado com um falante. Não há canal silencioso artificial.
3. Metadata da mensagem real fornece occurredAt; receivedAt/createdAt local mede recebimento da fila. Transcrição e SHA256 são persistidos antes das etapas posteriores. Orchestrator recebe uma Communication TEXT por entrada, com participant IDs reais e perfil Rafael dedicado.
4. Intenções/correções canônicas usam contexto nativo para localizar referência e consultam o executor simulado. Pedido existente é revisado no mesmo protocolo; “kits completos” e mudança do estúdio preservam quantidade e prazo declarado. Não existe escrita antes de confirmação. Erro do adapter produz mensagem explícita de falha, nunca sucesso.
5. Adapter OpenAI existente reformula somente fatos sintéticos da resposta-base em fala curta. Texto livre não vai ao LLM de resposta. Falhas/modelo inválido usam roteiro contextual identificado. Nenhum modelo aprova prioridade, estoque ou ETA. Voz não lê protocolo; detalhes seguem em texto quando úteis.
6. ElevenLabs gera fala com Voice ID simples e voice_settings. A saída MP3 é convertida com ffmpeg para OGG/Opus mono 48kHz; ffprobe verifica container, codec, canais e duração máxima de 30s. Não se renomeia MP3. Preferência é 10–20s, conferida no teste real.
7. Arquivo privado sai por URL assinada HMAC com expiração padrão de uma hora. GET e HEAD servem audio/ogg; painel continua autenticado. Chave de assinatura e URLs privadas não aparecem no painel/logs. Cleanup a cada minuto remove arquivos expirados; startup também limpa. A rota serve apenas arquivos gerados no namespace dedicado.
8. Twilio Messaging envia mídia sem legenda; protocolo pode seguir como outra mensagem textual. O servidor consulta entrega. `delivered/read` confirma transporte, **não reprodução nem aparência de nota de voz**. `queued/sent` permanece aguardando entrega. Falha TTS/codec ou rejeição/entrega falha confirmada produz fallback textual. Criação de resultado incerto não é repetida automaticamente, para evitar duplicação.
9. Texto EXATAMENTE sintetizado é ingerido como TEXT, correlacionado ao MessageSid de áudio com resourceId `MessageSid:spoken-text`. A mensagem textual separada tem seu próprio SID/Communication, sem duplicar internamente um mesmo envio. Orchestrator não é tratado como transcritor automático de anexos. Operadores v3 existentes usam Communications reais e citações verificadas; não confundir prazo solicitado com prioridade aprovada pelo executor.

“Responda por texto” é reconhecido e evita TTS; preferência permanece para próximas mensagens. “Responda por áudio” restabelece áudio. Envio exige mensagem de entrada dentro da janela de atendimento; nenhuma notificação fora de janela ou template novo é criado.

Ledger privado `audio.json` registra MessageSid de entrada, MediaSid, hash, occurredAt, Conversation/Communication IDs, texto sintetizado, fonte do LLM/TTS, hash do OGG, duração, synthesisMs, SIDs de saída, status de entrega, fallback e endToEndMs. Não contém URL assinada ou credenciais. Roteamento HTTPS da mídia foi validado no ngrok real: GET/HEAD 200, assinatura adulterada 404 e Content-Type audio/ogg, usando apenas um tom gerado para teste técnico e removido após a verificação. Isso não é comprovação de TTS nem áudio recebido no WhatsApp. Evidência privada: signed-media-public-proof.json. Latência ponta a ponta é do timestamp da mensagem recebida até conclusão do processamento/consulta de entrega, não apenas latência do modelo.

## Teste real de resposta dinâmica

Após ouvir a amostra, enviar, enviar do telefone autorizado:

- “Preciso de dois kits de microfone no estúdio quatro. A gravação começa daqui a meia hora.”
- “São kits completos. E mudou para o estúdio cinco.”
- Confirmar a atualização após a pergunta; se precisar informar receptor, usar DEMO-RX.
- “Responda por texto. Qual o status do meu pedido?”

Aceite: responder dinamicamente ao conteúdo; a nota deve aparecer com controle de reprodução e tocar no WhatsApp; mesmo pedido após correção; operação confirmada pelo adapter simulado; conteúdo e horários registrados nativamente; métricas e SIDs reais no ledger. Confirmar audibilidade/naturalidade pessoalmente. Não inferir isso apenas de HTTP201 ou status delivered.

**Resultado local: 116/116 testes da variante e 51/51 da versão preservada; typecheck/build aprovados.** Os testes automatizados usam doubles das APIs: correção sem duplicação, replay antes de STT/TTS, falha do adapter, TTS/entrega com fallback, preferência por texto, service window, arquivo OGG/Opus verdadeiro e GET/HEAD assinado sem afrouxar proteção do painel. Não comprovam acesso real à voz nem áudio recebido no WhatsApp.

Execução da variante: `npm run build:native -w apps/globo` e `npm run start:all -w apps/globo`. Não iniciar processos duplicados; aplicar atualização somente sem chamada/job ativo. Ngrok e bindings remotos ficam preservados. Os pontos de recuperação aprovados continuam em `.demo-data/recovery/`; não são sobrescritos por este incremento.

Fontes: [ElevenLabs Create speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert?explorer=true), [Get voice](https://elevenlabs.io/docs/api-reference/voices/get), [OGG/Opus WhatsApp](https://www.twilio.com/docs/whatsapp/guidance-whatsapp-media-messages).

## Validação desta rodada

Voz consultada pela API: Nayara Técia, ID aprovado. Modelo `eleven_multilingual_v2` disponível com suporte `pt`. Conforme documentação ElevenLabs, `language_code` é omitido para este modelo; o texto é brasileiro. A rejeição 402 anterior foi superada após ação do usuário na conta ElevenLabs existente. Evidência sanitizada da síntese/entrega: `.demo-data/<conta>/note-tts-sample-proof.json`; registro histórico do bloqueio permanece em `note-tts-blocked-proof.json`. A amostra não foi ingerida como conversa de Rafael, para não contaminar o aceite do contexto dinâmico. A entrega não comprova reprodução, naturalidade ou sotaque; requer confirmação humana.

O Node 20 não reconhecia a cadeia TLS do proxy Zscaler. Foi exportado somente o certificado público Zscaler já confiado administrativamente pelo macOS para `.demo-data/macos-trusted-ca.pem`. `scripts/start-native.mjs` utiliza `NODE_EXTRA_CA_CERTS` somente no processo dedicado, respeitando uma configuração existente. TLS permanece validado; nenhum trust store global foi alterado. Este arquivo é local e não deve ser distribuído como autoridade para outras máquinas.

Retomada: `NODE_EXTRA_CA_CERTS="$PWD/apps/globo/.demo-data/macos-trusted-ca.pem" node --import tsx apps/globo/scripts/validate-note-tts.ts --send-sample`, executado da raiz do workspace, somente após resolver o bloqueio e dentro da janela de atendimento. O script impede repetir amostra já registrada, valida OGG/Opus e GET/HEAD públicos e consulta entrega. Uma amostra não conta como aceite do fluxo dinâmico: o aceite dinâmico exige áudio real de entrada e confirmação humana da reprodução, ambos realizados nesta rodada.

## Aceite real do fluxo dinâmico — 13/10, 22h11 BRT

O usuário confirmou: “Sim, apareceram e tocaram normalmente”. Esta confirmação comprova apresentação/reprodução das notas no aplicativo; não é uma avaliação formal de sotaque ou qualidade perceptual. Calling mantém `5p4THmLc2S6kXKO1pOM5-1.09_0.5_0.8`; síntese de arquivos usa as configurações separadas da tabela.

| Interação | Entrada real | Saída de áudio real | Entrega | Duração / ponta a ponta |
|---|---|---|---|---|
| Dois kits, estúdio quatro | MM1f85dc9b07ea9cab1b3c223e4113fbe3 | MM34bb0ba700b39921549cb0f722b00928 | delivered | 11,616s / 25,515s |
| Kits completos, estúdio cinco | MMa2d0b81677c0d6d3a36bc14e6e1b6006 | MMcfb661bb0222294c488ee04792c476fd | delivered | 11,570s / 20,683s |
| Confirmação real em texto: Sim | SM99dda5d1f02cd27637526b1dadb00534 | MMbf84d42110be2c97100f46a7255a190c | delivered | 12,267s / 494,933s com recuperação |

O protocolo separado SM18524524086bc2932e2b76c917668ab6 foi entregue. Mesmo pedido EQ-DEMO-1002, versão 3, dois kits completos, estúdio 5; não houve criação de novo pedido. Executor Nimo/ServiceNow continua simulado. O pedido inicial recebido **não incluiu “meia hora”** na transcrição: prazo permaneceu desconhecido, sem inventar deadline.

As primeiras notas entraram na conversa nativa conv_conversation_01m4vys9b3f9mtdpm6296ctwvf. A confirmação após encerramento entrou em conv_conversation_01m4vz28vkeywvxcg9kmeza8mh, mesmo Profile Rafael e referência Memory. Cinco operadores v3 da primeira conversa foram consultados e validados contra os textos reais. Evidência privada: dynamic-voice-notes-proof.json, audio.json, analyses.json e native-conversation-failure-* (audit trail).

**Incidente e limite do aceite:** a confirmação falhou antes de ingestão/ação, com conflito 409 na criação nativa durante o ciclo de vida da conversa agrupada. Corrigido reuso ACTIVE/INACTIVE e redescoberta por configuração, perfil e endereços. Uma criação diagnóstica dedicada foi posteriormente reutilizada pela confirmação real. A retomada administrativa consulta a mensagem original na Twilio, reconstitui apenas a intenção de correção já verificada nos Communications nativos e retoma antes da ingestão; não repete STT, ações ou envios incertos. Não existe retry automático geral. A latência da confirmação inclui cerca de oito minutos de diagnóstico e recuperação; não deve ser apresentada como fluxo sem falha ou confundida com a latência normal das duas notas. A correção do ciclo INACTIVE está coberta por teste local; um novo ciclo completo automático após timeout ainda não foi testado por usuário nesta rodada.

Referências de ciclo de vida: [Core concepts](https://www.twilio.com/docs/conversations/orchestrator/concepts/core) e [Create Conversation](https://www.twilio.com/docs/api/conversations/v2/conversation/create-conversation-with-config).

Validação de ingestão final: 7 Communications reais (4 na primeira conversa e 3 na segunda), perfil Rafael em ambas, uma entrada por MessageSid e uma saída por SID enviado. Recall final retornou 5 observações, 2 resumos e 3 Communications da conversa de confirmação. A consulta de referência em Memory recuperou EQ-DEMO-1002; os campos do pedido vêm do executor simulado.

Intelligence v3 final: **10 resultados reais**, cinco operadores em cada uma das duas conversas, consultados no painel e validados contra Communications. Reenvio HTTP assinado controlado do MessageSid real MM1f85dc9b07ea9cab1b3c223e4113fbe3 pelo ngrok: 200, ledger idêntico, seis registros antes/depois e mesmos SIDs de resposta. Não é um novo evento gerado pela Twilio nem uma nova fala humana; é evidência de deduplicação. Falhas de TTS/adapter são testadas com doubles nos testes automatizados, sem induzir falha remota artificial.

## Configuração atual aprovada — Eleven v4 sem tags

Após o A/B local, o usuário aprovou B. O TTS das notas de voz agora usa `eleven_v4`, Nayara Técia (`5p4THmLc2S6kXKO1pOM5`), estabilidade 0,35 e similaridade 0,85. Nenhuma tag é inserida; entrada com tags expressivas é rejeitada antes de chamar a API e segue o fallback textual existente. `speed` e `style` continuam disponíveis para rollback v2, mas não são enviados ao v4. A configuração Relay/Calling não foi alterada. Os resultados anteriores deste documento correspondem ao v2; o teste dinâmico v4 foi entregue e o usuário confirmou reprodução/ritmo com “deu boa”.

Rollback, da raiz: `node apps/globo/scripts/rollback-note-tts.mjs`; depois recarregar somente o servidor nativo ocioso. O script restaura apenas os parâmetros públicos `GLOBO_AUDIO_TTS_*` do snapshot `.demo-data/tts-v2-rollback.json`; não restaura/copia credenciais nem altera Calling. Os três backups funcionais anteriores permanecem intactos.

Validação local após a troca: **117/117 testes nativos**, typecheck e build aprovados. O teste v4 verifica Voice ID simples, texto sem tags, idioma `pt`, estabilidade/similaridade e ausência de parâmetros incompatíveis. O caminho v2 continua testado. Referência: [Eleven v4 voice settings](https://elevenlabs.io/docs/overview/capabilities/text-to-speech/eleven-v4).

Teste real v4 aprovado pelo usuário: entrada MM146071bc61bc72682c526aede2e0f4c4 (“Qual o status do meu pedido de microfones?”); áudio MM6606b2dc844a6d5013a634da1923b074 e texto SM817417112e225a574a57ceaaa371167d entregues. Ponta a ponta 27,526s; TTS/conversão/publicação 3,164s. Sem fallback ou recuperação manual. Consulta de status não atualizou EQ-DEMO-1002 (versão 3). Evidência privada: v4-whatsapp-proof.json.

**Bloqueio separado da validação final:** a segunda nota dessa rodada produziu “Studio 5” no STT; o interpretador reconhece “estúdio”, manteve 4 e respondeu 4. A confirmação final não foi executada, nenhum pedido foi alterado por essa proposta. Este problema não foi corrigido pela troca de TTS. Relatório sanitizado: final-validation-status.json. A demo de voz permanece aprovada como base; a jornada completa de três novas vozes ainda não tem aprovação final sem esse bloqueio ser resolvido.

## Correção de Studio/estúdio aprovada — jornada real de três áudios

Causa comprovada pelos registros: STT histórico preservou “Sobre o mesmo vigia de microfones, são kits completos e mudou para Studio 5.”. O normalizador antigo retornou correction/completeKit sem location, conservando 4 no rascunho e na resposta. Não era uma falha do TTS ou do vínculo do pedido.

Correção localizada: entidade única reconhece Studio/estúdio, dígitos completos, números por extenso e “número”; intenção aceita mudança explícita e indicação como “agora é no”. Estúdios autorizados da demo continuam 4/5 no adapter. Locais ambíguos/negados não reutilizam silenciosamente o anterior. Mudar local de um rascunho preserva quantidade, compatibilidade, prazo e versão. O guard da resposta usa a mesma extração de entidades, incluindo Studio, para recusar local divergente. O histórico do mock agora registra local/versão antes e depois; registros anteriores foram preservados.

| Etapa real | Entrada | Áudio entregue | Resultado | Total |
|---|---|---|---|---|
| Pedido de dois kits no estúdio 4, meia hora | MMcb459f6de0980cc4b1f5c319364191de | MM15801f19f1b2141f8b11d00ff1c1cba5 | mesmo EQ-DEMO-1002, rascunho 4/30min | 21,891s |
| “Sobre o mesmo pedido, agora é no estúdio cinco” | MMb101cfe97321fe759868d0ff4cd870f7 | MMe958b283723f9959c956ed7ac7e6a200 | move/location=5; resposta pediu confirmação para 5 | 24,342s |
| Confirmação falada | MM230629c7c10dafe2f4bfcf05e8a6785f | MM592b7ca403610589753fa4735fb644ac | EQ-DEMO-1002 versão 4; resposta confirmou 5 | 30,041s |

Protocolo textual SM2f1770b65d03b8930d62f2349f184aa3 também entregue. Todos os áudios: audio/ogg com Opus; usuário respondeu “feito, ouvi estudio 5”. Sem 409, fallback ou recuperação manual nas três interações. O backend nativo foi observado INACTIVE antes da terceira nota; quando a confirmação chegou, criou outra conversa após encerramento. Não apresentar esta rodada como prova de reuso INACTIVE no servidor: esse caso está coberto nos testes locais.

**Precisão sobre a alteração:** antes desta rodada o pedido já estava persistido em 5, versão 3. O colaborador propôs 4 e corrigiu para 5 antes da confirmação: rascunho 4→5; gravação confirmada 5→5, versão 3→4, agora com o prazo de 30 minutos preservado. Uma mudança persistida 4→5 é comprovada pelos testes automatizados do adapter, não por essa rodada real. Não houve pedido duplicado: um pedido registrado, mesmo ID, uma nova atualização.

Reenvio controlado assinado da confirmação real: HTTP200, ledger idêntico, versão 4 antes/depois e três eventos de update antes/depois. Não repetiu STT, envio nem atualização. É replay de verificação, não uma nova fala humana ou evento originado pela Twilio.

Identity/ingestão: três Conversation IDs, todos com Profile Rafael mem_profile_01m4vntg7ef6grzjaw3ayxcy70 e configuração dedicada. Sete Communications nativas verificadas por API, uma por entrada/SID de saída, com texto exatamente recebido/falado. Memory GET retornou a referência EQ-DEMO-1002; Recall em outro processo retornou uma observação ligada à última sessão contendo Studio 5 e suas três Communications. Os dois resumos recuperados não são da última sessão; não foram apresentados como resumo atual. Estado de execução e versão vêm do adapter Nimo/ServiceNow **simulado**, não de Memory.

Métricas de rede completas em studio-fix-proof.json. Valores STT/IA/TTS medem requisição até corpo completo; envio mede início da criação até entrega observada por polling, incluindo o texto de protocolo na terceira etapa. Total usa dateCreated Twilio (precisão de segundos) até ingestão final. Duração de gravação/reprodução do usuário e pausas entre mensagens não integram cada latência.

| Etapa | Recepção | STT | IA | TTS API | Envio até entrega observada |
|---|---:|---:|---:|---:|---:|
| 1 | 4,409s | 1,814s | 2,168s | 2,762s | 5,741s |
| 2 | 3,973s | 1,840s | 3,096s | 2,320s | 7,367s |
| 3 | 4,733s | 1,004s | 1,792s | 5,001s | 11,275s |

**142/142 testes nativos**, **51/51 da versão preservada**, typecheck/build aprovados. As quatro frases solicitadas estão cobertas, junto de números gerais, ambiguidade, histórico STT, ID, versão concorrente, confirmação e idempotência. Hashes confirmaram .envs, código TTS, configuração de voz, gateway, ledger de recursos e três backups inalterados. Nenhuma configuração remota foi modificada; observador de latência removido. Evidências privadas: studio-fix-proof.json, studio-fix-memory-proof.json, studio-fix-replay-proof.json e studio-fix-before.json, em .demo-data/<conta>/.
