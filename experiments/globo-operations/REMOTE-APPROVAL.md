# Solicitação consolidada — recursos nativos de produção fictícia

**Ainda não autorizada.** O brief autoriza implementação local, não gasto, chamadas, sender/webhook compartilhado ou provisionamento. A autorização Classic anterior foi pausada pelo usuário e não será reutilizada.

## Pacote A — Orchestrator + Intelligence v3 + Memory

Recurso/impacto: criar1 Memory Store dedicado `globo-edx-operations-demo`,1 perfil Rafael fictício, schema GloboOperations/referencesJson, regras de identidade só deste store;3 operadores customizados dos JSONs gerados;1 configuração Intelligence v3 e1 Orchestrator ligadas. Sem editar recursos existentes. Sem RH, sem captura Voice passiva, sem regra global, sem custom measures Insights. Metadata/control-plane/templates devem ser conferidos com os IDs retornados e operações assíncronas aguardadas.

Dados: apenas roteiro de produção e4 conversas sintéticas de fixtures. Identificadores de canal serão os endereços de teste já autorizados, exclusivamente ligados ao perfil fictício neste store, não dados de colaboradores. Nenhum registro real ServiceNow. Nimo/EDX continua simulado.

Consumo de teste proposto: até2 chamadas PSTN de120s cada, TWILIO_VOICE_NUMBER dedicado → DEMO_CUSTOMER_VOICE_PHONE;4 históricos pequenos, no máximo18 execuções de operador entre históricos/chamadas,2 recalls semânticos, leituras/PATCH de referência do perfil sintético. Confirmar consumo/operadores antes de cada lote; sem retries automáticos pagos. Não há ingestão retroativa de chamadas anteriores.

Endpoint: túnel ngrok separado para3009, painel autenticado, sem parar/mover o túnel gustsantos.ngrok.io que expõe a demo preservada. Se o plano ngrok não permitir endpoint separado, informar bloqueio e solicitar escopo novo; não sobrescrever domínio/túnel atual.

Teste e evidência: conversationId/profileId, referência RequestID retornada pelo mock, dois sessionIds distintos, disponibilidade/latência Memory observada, API outputs com result/operatorId/dataCreated e quotes correspondentes a Communications. Native collector já está preparado. Não chamar produto pronto até esse registro existir.

Custos: Relay4min≈US$0,28; telefonia por destino adicional. Orchestrator US$0,0002/1k caracteres; custom operators US$0,002/1k input eUS$0,018/1k output; Memory geraçãoUS$0,0028/1k, recallUS$0,007 eperfil diárioUS$0,005, além de writes acima de franquias. Estimativa de ensaio pequeno:US$1–3, **não orçamento garantido**; prompts/sistema/outputs e contrato da conta alteram o total. Solicitação: limite aprovado deUS$5 para este pacote Twilio, sem aquisição de números/senders/serviços adicionais. Parar se estimativa do lote exceder teto; cobrança assíncrona não oferece garantia transacional de hard cap. [Tarifas](https://www.twilio.com/en-us/products/conversational-ai/pricing).

Rollback: desligar flags do laboratório e parar só3009/túnel novo. Baseline3007 permanece. Recursos exclusivos ficam sem novas ingestões; não apagar automaticamente sem instrução específica. Artefatos nativos já processados podem permanecer armazenados/cobrados conforme plano; interromper chamadas/processamento antes de restaurar. Nenhum compartilhado exige rollback porque não será alterado.

Prazo de trabalho estimado após aprovação:3–5h, sujeito a APIs/Console. Primeira meta: análise real de1 fixture + segunda sessão Memory factual; depois chamadas e extração/Recall. Autenticação JSON do webhook v3 ainda deve ser validada; polling autenticado é alternativa. Ingestão automática de nota de voz em Orchestrator não está aprovada neste pacote.

## Pacote B — Nota de voz WhatsApp

Recurso obrigatório: sender/test resource comprovadamente dedicado, autorizado pelo proprietário, e participante de teste. Sender ONLINE existente não é autorização. Precisamos identificar qual sender/sandbox é exclusivo; não modificar o webhook compartilhado para apontar aqui. Se nenhum existir, não provisionar ou registrar novo sender sem escopo específico.

Alteração proposta SOMENTE nesse recurso dedicado: webhook para endpoint separado `/globo/whatsapp`, após registrar configuração anterior. Teste:1 nota de voz sintética de até60s, no máximo3 textos fictícios de confirmação/atualização e4 respostas, no par exato de teste; repetir MessageSid localmente para provar idempotência sem novo envio/novo custo de transcrição. Consumo WhatsApp eOpenAI adicional: solicitar tetoUS$1. Sem templates fora da janela autorizada.

OpenAI: aprovar GET de metadados do modelo `gpt-4o-mini-transcribe` com credencial existente e1 transcrição de arquivo fictício de até60s, sem nova chave. A tentativa de GET foi rejeitada pela revisão automática por falta de aprovação específica de rede; não houve API executada. Disponibilidade na conta permanece não verificada. Modelo/codec/CDN serão verificados antes de inferência; não seguir URLs arbitrárias ou redirects inseguros.

Ingestão transcrita: TEXT Communication com resourceId estável e ledger MessageSid/MediaSid/hash; validar delivery/capture antes de qualquer POST real. Não presumir áudio analisado automaticamente; esse passo exige teste/escopo explícito após confirmar recurso. Não configurar capture rule e criar Communication redundante para a mesma entrada.

Rollback: restaurar somente webhook do recurso dedicado aprovado e parar o endpoint novo. Ledger local mantém resultados/retries. Nunca mudar Calling, sender compartilhado ou associação Voice. Estimativa1–2h depois de recurso/autorização prontos.

## EDX/ServiceNow e contingências

Real exige contrato da EDX, homologação, item catálogo/fila/ID/eventos e credenciais limitadas. Não foi solicitado provisionamento real EDX nem aberto ticket. Objetos ServiceNow não mapeados sem contrato. Estoque/ETA/permissões precisam vir dessa fonte, não Memory.

Calling fica pendente, sem contornar elegibilidade Meta. Classic fica desligado e separado; uso/provisionamento seria autorização adicional específica, sem substituir silenciosamente v3. Insights custom measures não fazem parte de nenhum pacote.
