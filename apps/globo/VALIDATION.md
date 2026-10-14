# Validação — Globo RH

Execuções reais em 13/10/2026. Dados da jornada são fictícios. Nenhum webhook, número, sender, Memory Store ou configuração Twilio compartilhada foi alterado. Nenhum deploy em produção foi realizado.

## Verificações locais

| Verificação | Resultado observado |
| --- | --- |
| Testes Globo | 48/48 passaram em 4 arquivos |
| Regressões do workspace | 155/155 passaram em 17 arquivos |
| Typecheck de todos os workspaces | Passou |
| Build Globo | Passou; bundle React em `dist/` |
| Lint Globo | Passou |
| Git diff check | Passou |
| Dependências | Workspaces vinculados; versões compatíveis de concurrently/shell-quote e source-map-js atualizadas; npm reportou 0 vulnerabilidades |
| Segredos | Verificação de arquivos da demo sem correspondências com credenciais existentes; `.env`, `.env.local`, `.demo-data/` e `dist/` ignorados |

Os primeiros testes HTTP/WebSocket dentro do sandbox falharam com `EPERM` ao abrir sockets. A execução fora dessa restrição passou. Os testes usam fixtures fictícias e adapters fake, não números reais.

Cobertura: agente e política fictícia, recuperação de histórico, escrita e leitura de memória entre instâncias/sessões, falha de persistência, contratos Nimo, gating do adapter Twilio Memory, Responses SSE fragmentado/UTF-8/truncado, fallback, cancelamento de geração, preservação de pontuação, agregação de prompts, protocolo setup/prompt/interrupt/dtmf/error/end, assinatura HTTP/WSS, conta/CallSid/nonce, replay, limites de entrada, origem e painel autenticado, permissão de uma chamada vinculada a From/To e finalização idempotente.

## OpenAI real

Smoke com a credencial existente, modelo configurado e apenas Rafael fictício: resposta real em 52 fragmentos, primeiro token em 2167 ms, zero fallback. Isso comprova streaming de texto; não é uma medida de latência de áudio.

## ngrok real

Antes de iniciar, `gustsantos.ngrok.io` retornou 404 com domínio offline. Configuração ngrok local válida, autenticada e sem túneis ativos; o domínio não estava gravado como named tunnel. O wrapper conseguiu conectar o domínio reservado à porta 3007.

`verify:tunnel` passou:

| Caso público | Resultado |
| --- | --- |
| Painel/API sem autenticação | 401 |
| Painel/API autenticados | 200 |
| Origem externa não permitida | 403 |
| Webhook sem assinatura / assinatura inválida | 403 |
| Webhook sintético assinado, CallSid não aprovado | 403, alcançando o gate de aprovação |
| Upgrade WSS sem assinatura válida | 403 |
| Upgrade WSS sintético com assinatura válida | Conectou |
| Prompt antes de setup | Fechou com código 1008 |

Os testes sintéticos usam assinaturas calculadas localmente. As chamadas abaixo adicionaram validação com handshakes e webhooks efetivamente enviados pela Twilio.

## Chamadas Voice autorizadas

Todas usam número dedicado e destinatário que o usuário autorizou, limite de 120 segundos e `record:false`. Os testes não alteram webhooks. CallSids e metadados locais ficam somente em arquivo ignorado; números e credenciais não são impressos.

| Ensaio | Resultado |
| --- | --- |
| Voz inicial `PznTnBc8X6pvixs9UkQm`, primeira chamada | Completada, 21 s, Relay autenticado, zero turnos. Usuário informou que caiu na caixa postal; não conta como avaliação humana de áudio. |
| Mesma voz, segunda chamada | Completada, 36 s, Relay autenticado, um turno com OpenAI real, primeiro token 2109 ms. Usuário ouviu a ligação e relatou boa voz, mas pouca entonação. |
| Mesma voz após envio por frases e ajuste de estilo | Completada, Relay autenticado, um turno real; primeiro token 1137 ms e primeiro trecho enviado ao Relay 1307 ms. Não se atribui qualidade subjetiva sem feedback. |
| Voz `ybT9EL9NMy8gLjKo6TCr`, velocidade 1.05 | Completada, 50 s, Relay autenticado, dois turnos registrados. Usuário avaliou a voz como melhor, mas lenta. O último turno foi roteiro local, portanto não se usa seu primeiro token como medida de IA. |
| Voz `ybT9EL9NMy8gLjKo6TCr`, velocidade 1.15 | Completada, 44 s, Relay autenticado e dois turnos. Último turno foi roteiro local; não se atribui latência de IA a ele. |
| Voz `NnghtNzFFqbH9ECPBIar`, velocidade 1.15 | Completada, 38 s, Relay autenticado e dois turnos; usuário avaliou a voz como boa, porém rápida. |
| Voz `5p4THmLc2S6kXKO1pOM5`, velocidade 1.05 / estabilidade 0.6 | Completada; Twilio reportou 121 s com limite configurado de 120 s. Relay autenticado e 7 turnos, zero fallback. Último turno de IA: primeiro token 1128 ms, primeiro trecho ao Relay 1452 ms. Usuário aprovou a voz e pediu um pequeno aumento de velocidade. |
| Configuração final `5p4THmLc2S6kXKO1pOM5-1.06_0.5_0.8` | Chamada completada, 116 s, Relay autenticado, 7 turnos, 2 respostas OpenAI reais, 5 entradas fora do roteiro bloqueadas e zero fallback. Usuário aprovou a configuração e pediu mantê-la. Atualização de memória e handoff não foram exercitados nessa chamada; permanecem comprovados nos testes locais. |

A configuração atual é ElevenLabs / pt-BR / voz 5p4THmLc2S6kXKO1pOM5 / velocidade 1.06 / estabilidade 0.50 / similaridade 0.8. As vozes anteriores foram ouvidas em português pelo usuário. Velocidades 1.05 e 1.15 foram comparadas. A voz atual foi aprovada pelo usuário em 1.05/0.6/0.8. Ele escolheu velocidade 1.06 e autorizou ajustes de estabilidade/similaridade; o padrão final é 1.06/0.50/0.80. O ensaio dessa combinação final foi realizado após a conclusão dos checks e aprovado pelo usuário. A autorização temporária foi removida de .env.local; o permit do processo já foi consumido. Nenhuma nova chamada é iniciada automaticamente. Latência fim da pergunta → áudio ouvido e pronúncia/naturalidade dependem de avaliação do ouvinte; não foram inventadas.

## Recursos existentes investigados por GET

- Conta ativa e identidade correspondente.
- Dois Memory Stores ACTIVE; leitura de metadados individuais passou.
- Duas configurações Orchestrator com links de Memory resolvidos. Uma captura WhatsApp sem extração; outra tem extração e referência a Intelligence. Nenhuma foi selecionada para escrita.
- Listagem Intelligence v3 sem configurações; vínculo existente de Intelligence ainda precisa ser conciliado.
- Preflight anterior: três números Voice, seis aplicações e dois serviços Intelligence clássico, um pt-BR.
- Sender WhatsApp online encontrado, sem Voice Application configurada. Elegibilidade Calling ainda não validada.
- Onboarding Relay operacional comprovado pela conexão e resposta na chamada autorizada; nenhum termo ou configuração foi aceito/alterado pelo agente.

## Reais, demonstrativos e pendentes

| Funcionalidade | Estado |
| --- | --- |
| Voice + Relay HTTP/WSS | Real, chamada e assinaturas comprovadas |
| OpenAI Responses streaming | Real, smoke e turno telefônico comprovados |
| ElevenLabs pt-BR | Real, vozes anteriores ouvidas; voz atual ouvida e aprovada; combinação final 1.06/0.50/0.80 testada em chamada e aprovada pelo usuário |
| Jornada de férias, identidade e políticas | Fictícias; comportamento local testado |
| Memória persistente | Local demonstrativa, testada; não é Conversation Memory |
| Adapter Conversation Memory | Implementado, contrato testado com mock, desativado no runtime; falta recurso/perfil dedicado validado e autorização de escrita |
| Timeline de orquestração | Local demonstrativa; não é Conversation Orchestrator |
| Resumo e métricas de qualidade | Derivados localmente; não são operadores Conversation Intelligence |
| Nimo/EDX/ServiceNow | Mock explícito; nenhum ticket real aberto |
| WhatsApp Business Calling | Pendente de elegibilidade e autorização para alterar sender |
| Transferência humana | Preparação de handoff mock; nenhuma transferência para RH real |

Roteiro e contingência: [README.md](README.md).
