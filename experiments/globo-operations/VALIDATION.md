# Validação factual — 13/10/2026

98 testes em10 arquivos passaram em13/10/2026 às18h22 Brasília. Suíte Vitest local, incluindo servidores HTTP/WSS loopback; respostas Twilio/OpenAI/Memory simuladas nos unit tests. Typecheck, build e lint passaram. Dependências locais existentes reutilizadas; não é instalação limpa.

Cobertura nova: extração de pedido, lacunas/urgência, compatibilidade explícita, confirmação, mesmo ID entre canais, fechamento administrativo/relato não resolvido, reabertura, dois pedidos ambíguos, versão concorrente, erro de ferramenta, autorização/identidade, bloqueio RH, idempotência de criação/evento/mensagem, URL arbitrária/mídia de outra mensagem, MIME/tamanho, transcrição com aprovação, quote inexistente/de outra conversa, schema nativo inválido, escopo conta/configuração/operador, WebSocket operacional autenticado, conversationId e fixture sem selo nativo.

Ensaio local HTTP real do backend3009, IA desligada: cenas1–7; criação retorna EQ-DEMO-1002; nova sessão; mesmo pedido atualizado estúdio4→5; eventos mock aceito/despachado/concluído; relato não resolvido por incompatibilidade. Execução registrada em `.demo-data/rehearsal.json`. Processamento técnico0,029s, sem medir fala humana, latência de áudio ou serviços externos. Renderização e drill-down conferidos no Chrome; screenshot `.demo-data/operations-panel.png`.

Não executados: chamadas telefônicas da nova jornada, envio/recebimento WhatsApp, áudio válido transcrito por API, provisionamento, análise v3, ingestão Orchestrator, Memory remoto em duas sessões, Recall, ServiceNow homologação. O critério “ao menos uma análise nativa e segunda sessão nativa” **permanece pendente**. Histórico da operação é fixture manual, não resultado de Intelligence.

Metadados OpenAI: request autenticado pretendido foi recusado pela revisão automática antes de execução, por ausência de autorização de rede no brief. Não houve inferência/GET externo nessa tentativa; não contornar o bloqueio.

Baseline apps/globo e laboratório experiments/globo-native comparados por SHA-256 contra cópias anteriores às alterações; arquivos de fonte/build não modificados. Backup aprovado conferido pelo hash do manifest. Dados runtime/segredos do baseline não foram copiados. Nenhuma configuração Twilio, sender, webhook ou serviço existente mudou. O servidor operacional só está em loopback3009; nenhum túnel novo foi aberto.
