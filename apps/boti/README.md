# Boti Experience Hub

Workspace demonstrativo de CX em português. Todas as pessoas, contas, lojas, pedidos, preços, estoques, SLAs e métricas são fictícios. Nenhuma conexão com sistemas do Grupo Boticário é representada como real.

## Iniciar

A partir da raiz do workspace:

```sh
npm run dev -w apps/boti
```

Abra http://127.0.0.1:5174. O servidor Boti usa 3002; o CarePlus continua usando seus próprios scripts e portas (5173 / 3001). Não execute uma segunda instância do Boti nas mesmas portas.

Para a reunião, pode usar o build local servido pelo próprio backend:

```sh
npm run build -w apps/boti
npm run start -w apps/boti
```

Abra http://127.0.0.1:3002. Se o servidor de desenvolvimento já está rodando, o mesmo endereço já serve o último build. Não é necessário túnel, webhook, banco, login ou acesso à internet. As fontes e os ícones são locais. O processo Node precisa continuar rodando e o computador não pode entrar em repouso.

## Roteiro de 5 minutos

1. **Cliente**: apresente Marina e BOT-84219. Mostre o histórico do chat conectado ao WhatsApp, a urgência do presente e o estoque próximo.
2. Clique **Oferecer retirada em loja**. A resposta e a linha do tempo mudam no mesmo atendimento.
3. Clique **Simular aceite e resolver**. A cliente aceita na simulação e o caso fica resolvido. O botão deixa explícito que não houve resposta externa.
4. **Franqueado**: selecione Ricardo / Curitiba Batel. Compare o contexto de loja, 12 transações afetadas, prioridade alta, SLA de 30 min e fila Sistemas / PDV com o atendimento ao consumidor.
5. **Enviar orientação**, **Abrir incidente N2**, **Escalar prioridade**. Observe o resumo, histórico completo anexado e SLA crítico de 15 min. O diagnóstico enviado não é apresentado como executado pela loja.
6. **CX Insights**: mostre intenções por público, sentimento, reincidência e os quatro sinais. Clique em um sinal para criar um plano operacional local. Métricas são uma amostra fixa de 240 conversas, separada do resumo da sessão.
7. **Arquitetura**, no rodapé: conexão conceitual com Conversations / WhatsApp, Flex, Segment / Unified Profiles, Agent Copilot e Conversation Intelligence.
8. **Reiniciar cenários**, no Modo Demo: restaura conversas, estados, análises, rascunhos, eventos e planos operacionais. Recarregar a página também reinicia o estado em memória.

## IA opcional

O modo padrão é determinístico. Para habilitar chamadas reais, pare a instância Boti e inicie:

```sh
BOTI_AI_ENABLED=true npm run dev -w apps/boti
```

O backend carrega `OPENAI_API_KEY` e `OPENAI_MODEL` do `.env` raiz em tempo de execução, sem imprimir valores. Nenhuma alteração do `.env` é necessária. Clique **Atualizar análise com IA**. A chave nunca entra no frontend; a chamada usa Responses API com saída estruturada e `store: false`. O modelo existente é preservado.

A API recebe somente o cenário e o histórico demonstrativo atual. Revise sugestões antes de usar no rascunho. As ações operacionais não dependem da IA e não são executadas pelo modelo. Falhas, timeout de 10 segundos, resposta incompleta ou inválida usam conteúdo determinístico; logs internos indicam `AI source=openai` ou `AI source=deterministic-fallback`, sem segredos ou detalhes de erro do provedor. Reset cancela a solicitação do navegador e ignora respostas antigas.

Dependências externas possíveis: somente IA opcional (rede, credencial, modelo acessível, quota e latência). O caminho real da API foi coberto com provedor simulado nos testes; não é necessária uma chamada paga para validar a apresentação. Não confundir o fallback com inferência real.

## WhatsApp / Twilio

Não há envio externo habilitado. Não há cliente Twilio, endpoint de envio ou alteração de recursos/Verify. `server/channel.ts` define uma interface isolada para eventual teste autorizado. Não foi possível confirmar segurança de reutilização de um remetente apenas pelos nomes de variáveis; portanto nenhum remetente ou destinatário foi reutilizado. Um adaptador futuro deve usar configuração explícita do Boti e retornar SID/status reais, sem inventar entrega ou leitura. A experiência principal sempre funciona sem ele.

## Isolamento e validação

Todo o código novo fica em `apps/boti`. O lockfile raiz registra o novo workspace; nenhum novo pacote externo foi necessário. O script `npm run dev` raiz continua iniciando apenas CarePlus. Não há importações de código CarePlus no Boti.

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

Testes HTTP usam sockets locais (Supertest). Em ambientes sandbox, precisam da permissão de rede local. Os testes cobrem resolução com aceite, idempotência, reset completo, handoff, validação de entrada, rejeição de origem externa, saída estruturada e fallback.

Referências: [O Boticário](https://www.boticario.com.br/), [Grupo Boticário](https://www.grupoboticario.com.br/), [OpenAI Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs). Identidade visual inspirada na marca; não é um produto oficial.

Validação nesta implementação: lint, typecheck, build e 31 testes aprovados. Walkthrough nativo no Safari validou as três visões, retirada/aceite, orientação, incidente N2, escalonamento, ação de sinal, modal e reset. A integração WebMCP opcional expõe leitura de estado e reset quando o navegador a suporta; não foi possível validar seu registro neste navegador. Não é necessária para a apresentação. O build raiz regenerou quatro artefatos existentes em `apps/api/dist`; fonte e configuração CarePlus não foram editadas. Nenhum commit ou push foi executado.
