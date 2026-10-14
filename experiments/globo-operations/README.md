# Globo + EDX — Da conversa à operação

Branch local `demo/globo-edx-operations`. Aplicação isolada em `experiments/globo-operations`, porta3009. A demo aprovada em `apps/globo` e o laboratório Classic em `experiments/globo-native` permanecem intactos. A voz permanece `5p4THmLc2S6kXKO1pOM5-1.06_0.5_0.8`, ElevenLabs, pt-BR, definida no ambiente.

```sh
npm --prefix experiments/globo-operations run build
GLOBO_AI_ENABLED=false npm --prefix experiments/globo-operations start
# http://127.0.0.1:3009/globo/
npm --prefix experiments/globo-operations test
npm --prefix experiments/globo-operations run typecheck
npm --prefix experiments/globo-operations run lint
npm --prefix experiments/globo-operations run prepare:config
```

Reutiliza dependências instaladas; não houve instalação/upgrade compartilhado. AI e integrações remotas ficam desligadas por padrão. Credenciais são lidas no backend do `.env` raiz; nunca copiadas. A senha desta cópia está em `.demo-data/panel-password.txt`, ignorado. Acesso público exige Basic; POSTs do painel exigem Origin, JSON e cabeçalho X-Globo-Demo. O atalho loopback não funciona via proxy/túnel.

## Jornada implementada

Selecione as cenas1–8. O roteiro [PRESENTATION.md](PRESENTATION.md) dura6–7min. RH é introdução local breve; produção não recebe dados RH. Normalização de falas e execução são determinísticas, limitadas à jornada fictícia; respostas operacionais usam diretamente o retorno da ferramenta para não inventar status/ETA. OpenAI streaming existente pode ser habilitado para RH autorizado, mas não foi executado nesta etapa. Não anunciar seleção autônoma de ferramentas pelo LLM.

O adapter simulado mantém o pedido anterior EQ-DEMO-0901. O novo pedido recebe o ID realmente retornado pelo adapter. Quantidade, estúdio, prazo declarado, compatibilidade e recorrência são extraídos; o fluxo exige modelo/compatibilidade e confirmação. Estoque não é inventado. Pedido registrado, aceito, despachado, concluído e relato não resolvido são distintos. Eventos de execução no painel são explicitamente mockados.

Após criação, clique Outra sessão e siga as cenas5–6; ambas simulam WhatsApp texto **no painel**, sem mensagem real. O mesmo pedido muda do estúdio4 para5. Clique os eventos mock de aceite/despacho/conclusão; cena7 registra kit incompatível e gravação bloqueada; cena8 confirma continuidade no mesmo pedido. Confirmações repetidas não abrem outro ticket. Estado/versão vêm do adapter, nunca de memória inferida.

## Produtos reais versus preparação

| Componente | Estado nesta evolução |
| --- | --- |
| Voice/Relay/ElevenLabs | Stack reaproveitada das chamadas anteriores; nova jornada não teve chamada real |
| Ferramentas EDX/ServiceNow | Mock tipado, consulta/criação/atualização/eventos/idempotência; nenhum endpoint EDX inventado |
| Memória RH | Local, separada; nunca selecionada como Memory operacional nativo |
| Memory operacional | GET/PATCH de referências implementado com opt-in aprovado; segunda sessão testada com HTTP mock, aceite nativo pendente |
| Recall semântico | Método de API preparado; não conectado como fonte de fatos/status e não executado |
| Orchestrator | TwiML conversationConfiguration/conversationId preparados; nenhum tráfego novo ingerido |
| Intelligence v3 |3 operadores JSON declarados; coletor API com escopo/evidência e UI preparados; zero análise nativa executada |
| Histórico operacional |4 fixtures sintéticos com saídas manuais, claramente simulação não nativa |
| Agregação | Aplicação própria; fontes nativas e fixtures filtradas separadamente |
| WhatsApp texto/nota de voz | Webhook e pipeline preparados; testes HTTP mockados; sender dedicado e ensaio remoto pendentes |
| Calling | Bloqueio de elegibilidade conhecido; não alterado |
| Classic | Contingência separada, desligada. Pode ter operadores generativos customizados; não substitui v3 automaticamente |

## Nota de voz: fluxo separado de Calling

`POST /globo/whatsapp` exige assinatura Twilio/AccountSid, gate de recurso autorizado e From/To exatos do teste. MessageSid é deduplicado em ledger durável antes de baixar/transcrever/executar. A mídia só pode ser HTTPS no endpoint api.twilio.com da mesma conta e da mesma mensagem. Download autenticado, sem redirects, com MIME permitido e limite6MB mesmo sem Content-Length. Isso bloqueia URLs arbitrárias; redirects reais para CDN ainda precisam de validação segura no ensaio. MIME é validado no cabeçalho, não há inspeção forense do codec.

Transcritor de arquivo é OpenAI Audio Transcriptions, com modelo configurável e autorização explícita. Não usa Relay para arquivo. A API documenta OGG e outros formatos; acesso ao modelo e decodificação do áudio WhatsApp ainda não comprovados nesta conta. Uma tentativa de GET de metadados foi recusada pela revisão automática; nenhum request foi executado. [API oficial](https://developers.openai.com/api/reference/resources/audio/subresources/transcriptions/methods/create).

Resposta de texto é TwiML MessagingResponse. Retries concluídos retornam vazio para evitar resposta/cobrança duplicada; falha/interrupção requer revisão, sem retentar inferência paga automaticamente. Não há garantia de redelivery de uma resposta perdida no caminho. A nota original não é salva; ledger guarda MessageSid/hash/origem da transcrição e resposta operacional canônica, sem arquivo de áudio.

`audio-ingestion.ts` prepara Communication TEXT com resourceId estável ligado ao MessageSid e evidência MediaSid/hash. **Não envia automaticamente ao Orchestrator.** API/delivery/captura de transcrição WhatsApp precisam de teste em recurso dedicado; áudio bruto não é analisado automaticamente. [Contrato Communication oficial](https://www.twilio.com/docs/api/conversations/v2/communication/create-communication-in-conversation).

## Intelligence v3: resultados e evidências

`config/operators.ts` e `config/generated/` contêm schemas/prompt/configuração, sem chamadas de provisionamento. Impacto operacional usa regra on-demand com `triggers:[]` (não existe enum ON_DEMAND no trigger). Integridade/fricção usam CONVERSATION_END. Não há * global, captura passiva VOICE ou custom measures Insights. [Operadores](https://www.twilio.com/docs/api/intelligence/v3/operators/create-operator), [on-demand](https://www.twilio.com/docs/conversations/intelligence/build-on-demand-workflows).

Coletor busca somente conversas explicitamente autorizadas por ID e configuração; confere conta, resultado/operador e compara cada quote com Communications da mesma conversa. Saída/schema inválido produz erro explícito. IDs e timestamps vêm da resposta API; não inventa executionId quando a API não retorna. Native e fixture nunca se substituem silenciosamente. Paginação não suportada gera erro explícito; ensaio pequeno limitado a100 registros/página.

`/globo/intelligence/events` é sink preparado que exige assinatura JSON com bodySHA256 e faz reconsulta API, sem confiar em outputs enviados pelo webhook. **Esse contrato de assinatura não foi comprovado para Rule Execution v3**; manter callback não configurado até teste autorizado. Polling pelo painel é alternativa. Nenhum output assíncrono autoriza automaticamente ferramenta ou SLA. Temporizadores de SLA/workflow não foram implementados; não atribuí-los ao Intelligence.

Todas as integrações desta evolução também exigem GLOBO_OPERATIONS_REMOTE_APPROVED=true, além de suas flags individuais; aprovações antigas não ativam o laboratório. Para ativação, consultar [REMOTE-APPROVAL.md](REMOTE-APPROVAL.md). Configurações existentes não serão modificadas: referência v3 antiga tinha operadores404. Criar recursos exclusivos é a proposta.

## Memory por domínio

Runtime RH continua local. NativeOperationalMemory só aceita perfil/stores dedicados aprovados, identidade rafael-demo, domain production e referências EQ-DEMO. Nunca recupera dados RH para produção. Referências não carregam estoque/status/ETA; o backend consulta o executor. Nova sessão recupera referências reais quando configurado; resultado inválido não vira fallback local silencioso. GET/PATCH de traits é persistência factual Twilio, distinta de extração/Recall semântico.

Aceite remoto exigido: sessãoA cria referência pelo executor → PATCH Memory aprovado → aguardar disponibilidade → sessãoB/novo objeto recupera pela API → consulta mesmo ID no executor → registrar profileId/latência/IDs das duas sessões. Para extração, confirmar conversa/participante/profileId no Orchestrator, aguardar lifecycle e consultar Recall; adaptar resposta para contexto autorizado sem tratá-la como fonte de estado transacional. Esses aceites não foram realizados.

## Limites de analytics e recuperação

Conversation Insights não foi usado; dados têm disponibilidade aproximada15min. Não registrar custom measures:3 slots permanentes, numéricos e não retroativos. [Insights](https://www.twilio.com/docs/conversations/intelligence/conversation-insights), [restrições](https://www.twilio.com/docs/conversations/intelligence/conversation-insights/define-custom-fields).

[VALIDATION.md](VALIDATION.md) registra testes e ensaio. [RECOVERY.md](RECOVERY.md) contém retorno à demo aprovada e reset isolado. O estado atual está na cena de divergência; Nova sessão preserva pedido e não é reset. Para nova apresentação do zero, parar apenas3009, mover execution.json para backup com nome único, reiniciar. Não mover .env, senha ou arquivos de apps/globo.
