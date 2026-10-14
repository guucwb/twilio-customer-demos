# Globo RH — laboratório nativo isolado

Criado em 13/10/2026. A demo preservada permanece em `apps/globo`, porta 3007. Este laboratório usa porta 3008, estado e senha próprios. Nenhum arquivo da demo original, backup, dependência compartilhada ou recurso remoto foi alterado.

```sh
npm --prefix experiments/globo-native run build
GLOBO_AI_ENABLED=false npm --prefix experiments/globo-native start
# http://127.0.0.1:3008/globo/
npm --prefix experiments/globo-native test
npm --prefix experiments/globo-native run typecheck
npm --prefix experiments/globo-native run lint
```

As dependências já instaladas no workspace são reutilizadas; não é um teste de instalação limpa. O servidor do laboratório está iniciado com IA desligada para inspeção, sem expor outro túnel. Para usar OpenAI existente, reiniciar somente este laboratório sem `GLOBO_AI_ENABLED=false`. Não encerrar processos da demo preservada.

## Classic: implementação local pronta, aceite remoto pendente

Configurar somente após autorização, em `.env.local` ignorado desta cópia:

```dotenv
GLOBO_INTELLIGENCE_ENABLED=true
GLOBO_INTELLIGENCE_USE_APPROVED=true
GLOBO_INTELLIGENCE_SERVICE_SID=<serviço Classic autorizado>
GLOBO_PUBLIC_URL=<endpoint HTTPS exclusivo autorizado>
```

Ao iniciar, GET valida conta/idioma pt-BR. TwiML inclui `intelligenceService`; a transcrição segue nativamente para Twilio, sem POST artificial de transcript e sem gravação. O setup WSS autenticado vincula o sessionId VX ao painel. Após encerrar a sessão, `Consultar resultados Twilio` consulta Transcripts filtrados por serviço e VX, valida os vínculos e lê OperatorResults. A rota exige os mesmos controles de painel, sessão encerrada e intervalo de cinco segundos. Falha não gera resultado falso. Resultado e verificação temporal são salvos em `.demo-data/intelligence-VX….json`, ignorado pelo Git. Transcrição concluída não significa que todos os operadores terminaram; consulte novamente. Resultados acima de 50 são indicados como paginação pendente. Não há recuperação após reinício do vínculo VX nesta versão: exportar a evidência antes de trocar de sessão/reiniciar.

A UI mantém resumo e métricas locais separados dos outputs nativos. Ainda não há transcrição/resultado nativo de uma chamada deste laboratório. Testes de respostas API são mocks declarados, não evidência de execução Twilio.

## Orchestrator / v3

```dotenv
GLOBO_ORCHESTRATOR_ENABLED=true
GLOBO_ORCHESTRATOR_USE_APPROVED=true
GLOBO_CONVERSATION_CONFIGURATION_ID=<configuração exclusivamente autorizada>
```

Atributo `conversationConfiguration` emitido e testado localmente. Classic e Orchestrator são mutuamente exclusivos neste laboratório para evitar processamento/custos ambíguos durante o ensaio. Esta é uma decisão local, não afirmação de incompatibilidade da plataforma. Ainda não implementamos correlação da conversa Orchestrator nem painel v3. A análise dos recursos existentes e o trabalho restante estão em [NATIVE-AUDIT.md](NATIVE-AUDIT.md).

## Memory nativo — persistência factual

A seleção de runtime do adapter Twilio GET/PATCH está implementada. Requer store/perfil exclusivamente autorizados, Rafael sintético e schema `GloboDemo.contextJson` STRING previamente validado:

```dotenv
GLOBO_MEMORY_PROVIDER=twilio
GLOBO_MEMORY_STORE_ID=<store dedicado autorizado>
GLOBO_MEMORY_PROFILE_ID=<perfil fictício autorizado>
GLOBO_MEMORY_DEDICATED_VALIDATED=true
GLOBO_MEMORY_WRITES_APPROVED=true
```

Perfil inexistente/corrupto falha; não há fallback silencioso para memória local. Não cria perfil/schema automaticamente. Não usa Recall semântico e não comprova extração automática. No modo Twilio, o painel mostra traits nativos; o mock Nimo permanece mock. O teste de duas sessões usa HTTP mockado; **o aceite nativo de duas sessões não foi executado**. Roteiro de aceite: perfil inicial10 → sessão A altera15 via PATCH real → encerrar → nova instância/sessão B GET no mesmo perfil → comprovar15, IDs distintos, source nativo e evidências das respostas sem segredos. Para o aceite semântico: extrair observações na conversa A, aguardar conclusão e executar `/Recall` na sessão B; nenhum desses resultados foi fabricado.

## Chamada e túnel

O script de chamada foi ajustado para esta porta. Continua exigindo autorização individual, gate de número dedicado e `--approved-one-call`, com limite120s e `record:false`. Não houve nova chamada nesta etapa. O comando `tunnel` recusa inicialização automática: não tome o domínio/túnel da demo preservada. Autorizar um endpoint de teste separado, ou uma troca temporária explicitamente aprovada, antes do teste externo. Os scripts copiados de preflight e validação antigos documentam o baseline, não provam integrações nativas deste laboratório.

Para desfazer o laboratório: parar somente seu processo na porta3008; continuar com a demo preservada na3007. Nada precisa ser revertido na Twilio, pois só executamos GETs de metadados.
