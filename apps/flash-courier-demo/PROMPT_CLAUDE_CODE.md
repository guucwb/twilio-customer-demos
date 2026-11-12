# PROMPT PARA CLAUDE CODE — Flash Courier | Flash Analytics Flex Plugin

> **Copie este documento inteiro para o Claude Code.** Objetivo: implementar uma PoC demonstrável do plugin de supervisão segregada por banco em uma **única instância Twilio Flex**, sem realizar deploy ou alterações na conta de produção sem aprovação expressa.

Você é um engenheiro sênior especialista em Twilio Flex UI 2.x, TaskRouter, Flex Plugins, React, TypeScript, Twilio Functions, segurança multicliente e métricas em tempo real.

## Contexto real do projeto

Cliente final: **Flash Courier** (operação logística de entrega de cartões para bancos). Há duas torres de atendimento, **CX** (bancos/clientes) e **CQ** (retaguarda/franquias). Bancos de exemplo: **Itaú, Santander, Caixa e C6/PIP**. O cliente quer **uma operação Flex centralizada**, com **agentes compartilhados entre bancos**, mas com **dashboards operacionais e históricos segregados por banco**, de forma que um supervisor com atribuição exclusiva ao Itaú não consiga visualizar os dados de Santander ou Caixa. A gestão Flash precisa de visão consolidada.

A proposta de alguns participantes é dividir a solução em múltiplos Flex/contas. Queremos testar tecnicamente a alternativa **uma instância Flex + múltiplas TaskQueues + reporting segregado**, evitando fragmentar agentes, capacidade e operação. Não alegar que contas independentes necessariamente triplicam custos: isso depende de licenciamento e contrato.

ATENÇÃO: a segregação de filas no frontend não é uma fronteira de segurança. Precisamos demonstrar duas arquiteturas em uma mesma operação Flex:
- **Arquitetura A (visual/operacional):** filtrar a Real-Time Queues View por supervisor e exibir relatórios históricos próprios; não prometer isolamento técnico absoluto.
- **Arquitetura B (isolamento de reporting):** dashboard customizado via plugin, que chama um backend seguro. O backend autentica o usuário, obtém **no servidor** a lista de bancos/Queue SIDs permitidos e retorna apenas estatísticas e histórico autorizados. O usuário restrito não deve ter caminhos nativos alternativos para dados proibidos.

Há um **HTML offline** de demonstração fornecido pelo usuário, chamado `flash-conecta-demo.html`. Use-o como referência visual/funcional se estiver disponível no diretório; caso não esteja, implemente a partir desta especificação. O HTML é uma simulação com dados fictícios, não o plugin real.

## Regra obrigatória de segurança/alterações

1. **Não faça deploy, release, instalação, alteração de roles/SSO, criação de números, mudança de Workspace, atualização de filas ou qualquer mutação em uma conta Twilio sem autorização explícita.**
2. Pode executar checagens de ambiente **somente leitura** via Twilio CLI, como versão de CLI/plugin, perfis, listagem de Flex/Workspaces/TaskQueues e inspeção de projetos existentes, sempre evitando exibir secrets/PII. Informe qual `Account SID` está ativo (pode mascarar o identificador) e se é PROD/sandbox; não presumir que o ambiente ativo é DEV.
3. Não copiar Auth Token para frontend, logs, commits, screenshots ou chats. Não incluir dados reais de clientes nos mocks nem versionar `.env`.
4. Não quebrar plugins já instalados. Novo plugin isolado, desenvolvimento local; qualquer ajuste de Flex Settings deve ser proposto, não aplicado automaticamente.
5. Se o acesso ao ambiente real estiver indisponível ou for PROD, concluir **a PoC mockada local funcional**. Nunca bloquear o resultado aguardando credenciais.

## Etapa 0 — Discovery técnico e validação das APIs

- Inspecionar repositório atual, versões Node/npm, `twilio --version`, plugins CLI, versão de Flex UI 2.x, TypeScript e React compatíveis, sem executar comandos destrutivos.
- Verificar as APIs na documentação **atual** (links ao final), evitando copiar exemplos de Flex UI 1.x sem conferir tipos e suporte em 2.x.
- Confirmar disponibilidade de `Flex.QueuesStats.setFilter()` e `Flex.QueuesStats.setSubscriptionFilter()` no projeto. O primeiro seleciona filas exibidas; o segundo limita assinaturas de atualizações de filas. **Nenhum deles é controle de autorização de servidor.** A documentação também alerta que os filtros não ajustam necessariamente métricas globais de disponibilidade de agentes.
- Verificar os mecanismos para criar uma página no Flex com `Flex.ViewCollection.Content.add(...)` e item de navegação com `Flex.SideNav.Content.add(...)`, ou alternativa oficialmente suportada na versão detectada.
- Identificar como consumir TaskRouter TaskQueue Real-Time Statistics e Flex Insights Export API conforme documentação; não usar Insights como fonte de streaming em segundos.

## Etapa 1 — Plugin funcional com mock data (prioridade máxima)

Criar projeto independente em **React + TypeScript**, usando Flex Plugins CLI oficial (se precisar iniciar do zero, verificar comando do tipo `twilio flex:plugins:create plugin-flash-analytics --install --typescript`, com Flex UI 2.x), e implementar:

### Navegação

Nova página `Flash Analytics` na barra lateral do Flex, protegida por papel de supervisão/gestão; a lógica de autorização real será tratada separadamente. Não substituir funcionalidades existentes sem aprovação.

### UI do dashboard

Dashboard visualmente profissional, responsivo em desktop e tablet, estilo semelhante a Flex (sem depender de dados reais). Títulos em pt-BR, cards de métricas, tabelas de filas, gráfico simples de tendência, indicador de último refresh, estado carregando/erro, referência explícita `DEMO — DADOS FICTÍCIOS`.

Métricas simuladas por banco/fila:
- Tasks aguardando e em andamento;
- Agentes elegíveis/ocupados (com aviso de que elegibilidade em múltiplas filas não representa headcount único);
- Tempo de espera e SLA ilustrativos;
- Histórico de atendimentos, primeira resposta e tempo até resolução do ticket (histórico simulado; em produção combinar Insights/JALL quando aplicável).

Perfis mock para demonstração (switcher disponível **somente em modo demo**):
- `flash_admin` — todos os bancos e visão consolidada;
- `supervisor_itau` — somente Itaú;
- `supervisor_santander` — somente Santander;
- `supervisor_caixa` — somente Caixa;
- `supervisor_c6` — somente C6/PIP.

Filas de exemplo:
- `CX_ITAU`, `CQ_ITAU`;
- `CX_SANTANDER`, `CQ_SANTANDER`;
- `CX_CAIXA`, `CQ_CAIXA`;
- `CX_C6_PIP`, `CQ_C6_PIP`.

Demonstrar explicitamente um **único Worker elegível para CX_ITAU, CX_SANTANDER e CX_CAIXA**. Atribuições por atributos de Worker e expressões de roteamento. Não criar três identidades.

### Teste didático A versus B

Um painel `Segurança da segregação` deve mostrar:
- No modo A, o frontend apenas oculta as filas; explicar que não comprova impossibilidade de consultar dados de outras operações via API, deep link, export, componente nativo ou outra permissão.
- No modo B, demonstrar uma requisição `GET /api/analytics/queues?bankId=santander` feita por `supervisor_itau`, recebendo um **403 fictício** no mock e, no backend real, um 403 efetivo. Rotular claramente o resultado mock como simulado, não teste real.
- `flash_admin` recebe agregados autorizados dos bancos que administra.

### Construção e qualidade

- Separar `mockDataProvider`, `taskRouterDataProvider`, `insightsDataProvider` e `analyticsApiClient` sob interfaces TypeScript comuns, para alternar entre mocks e dados reais por flag de ambiente sem modificar a UI.
- Lint / typecheck / build, e testes básicos para escopo de acesso.
- Não usar bibliotecas desnecessárias; renderizar estado vazio e erros.
- README com comandos precisos para desenvolvimento local (não deploy) e instruções de demonstração.

## Etapa 2 — Integração real read-only (somente se seguro e viável)

### A: personalização de Real-Time Queues View

O plugin pode carregar a lista de `allowedQueueSids` conforme o usuário autenticado e aplicar `setFilter` e `setSubscriptionFilter` **por SID**. Se for necessário desabilitar uma tela global, modificar menus ou permissões, propor a mudança e aguardar autorização. Não confiar em atributos controlados livremente pelo navegador como fonte de segurança.

### B: reporting seguro por banco

Backend (Twilio Functions ou Node service próprio; selecionar de acordo com compatibilidade/segurança):
1. Autenticar a requisição do Flex com token verificável, checando expiração, issuer/audience/sig conforme mecanismo suportado no ambiente. Não confiar apenas em um `userId`, `role`, `bankId` ou lista de filas enviados no corpo/querystring.
2. Resolver `allowedBankIds`/`allowedQueueSids` **no servidor** a partir de cadastro confiável associado à identidade autenticada (SSO/IdP ou base RBAC gerenciada). Não devolver dados sem vínculo autenticado.
3. Negar por padrão. Rejeitar com 403 todas as tentativas de acesso a dados fora do escopo, incluindo exportações, gráficos, detalhes, paginação e buscas.
4. Consultar **TaskRouter TaskQueue RealTimeStatistics** somente para Queue SIDs autorizadas; usar endpoint bulk quando apropriado e cache com TTL (p.ex. 5–15 s), considerando limites e latência. Se a tela precisar de granularidade por `bank_id` em uma fila CQ compartilhada, NÃO fingir que métricas agregadas da fila resolvem isso: usar filas CQ segregadas por banco ou uma pipeline de eventos por Task com `bank_id` confiável.
5. Para histórico, não consultar a Export API do Flex Insights diretamente do navegador com credenciais. Usar um backend/ETL para exportar métricas necessárias para um data mart por banco, com Row-Level Security ou escopo equivalente e auditoria. Se não der para fazer na PoC, manter mock explicitamente identificado.
6. Preservar `bank_id`, `tower` (CX/CQ) e `ticket_id` nas Tasks e respectivas integrações. Confirmar origem confiável do `bank_id` via JALL/API/roteamento. Transferências CX→CQ mantêm o banco de origem; métricas por Task/etapa devem ser atribuídas corretamente.
7. Evitar vazamento por endpoints de detalhes, gravações, nomes de contatos, relatórios nativos, logs e exportações. Um plugin que esconde menus NÃO muda autorização das APIs; indicar caminhos nativos que precisariam ser removidos/restringidos para usuários externos ou supervisores com isolamento rígido.
8. Não contar agentes elegíveis de duas filas como duas pessoas diferentes nos totais globais.

## Etapa 3 — testes de aceite

Criar testes unitários/de integração (backend sem Twilio live, com mocks de usuário e fonte de dados). No mínimo:

| Cenário | Resultado esperado |
|---|---|
| Supervisor Itaú abre sua view | Somente filas e métricas Itaú |
| Supervisor Santander abre sua view | Somente filas e métricas Santander |
| Gestor Flash abre a view | Visão consolidada permitida |
| Agente fictício em três filas | Uma identidade, elegível em três TaskQueues |
| Supervisor Itaú tenta `?bankId=santander` no backend | **403 real no backend de teste**, sem corpo com dados de outro banco |
| Usuário sem vínculo de bancos | 403/empty por política deny-by-default |
| Transferência CX→CQ | Banco de origem preservado |
| Fila CQ compartilhada por bancos | Alerta de limitação no agregado por fila; sem números inventados por banco |
| Consulta de tempo real falha | Erro/tratamento; não mostrar dados de outro tenant como fallback |
| Exportação histórica fora do escopo | Bloqueada no backend de teste |

Os testes de um cenário mock não servem para certificar isolamento em uma conta Twilio real. Explicitar os testes manuais necessários em Flex para validar acesso por menus nativos e APIs.

## Entregáveis exigidos

- Código-fonte do plugin TypeScript pronto para executar em modo mock no Flex local;
- Arquitetura organizada em provider/API/UI; backend de exemplo para autorização (mock que faz enforcement real em Node local é aceitável);
- `README.md` com setup, documentação, limitações e roteiro de demo de 3 minutos;
- `SECURITY.md` com threat model curto (IDOR, acesso cruzado, export, drill-down, API tokens, dados de fila CQ compartilhada);
- Testes automatizados e output de typecheck/build/test;
- Lista de alterações propostas (se necessárias) em Roles, SSO, TaskQueues, Events, Functions e Insights, **sem aplicá-las**;
- Resultado claro: o que está rodando, o que é mock, o que está integrado e o que depende de aprovação.

## Diretrizes de execução

- Priorizar **um resultado visual funcional** e testes confiáveis, não uma apresentação conceitual.
- Criar arquivos e executar comandos locais. Não ficar apenas explicando o que seria feito.
- Na ausência de informações não essenciais, escolher valores fictícios e declarar premissas.
- Se houver falha de integração, seguir com mock e isolar a falha. Nunca inventar funcionalidades ou resultados.
- Não solicitar deploy de produção para comprovar a ideia. Use dev local ou um ambiente explicitamente autorizado.
- Não prometer isolamento de segurança apenas com `QueuesStats.setFilter` ou `setSubscriptionFilter`.
- **Não executar deploy/release sem minha confirmação explícita após mostrar o diff e a conta de destino.**

## Fontes oficiais para validação (conferir compatibilidade atual)

- Twilio Flex — Real-Time Queues View Programmability: https://www.twilio.com/docs/flex/developer/ui/queues-view-programmability
- Flex — Create Custom Views and Routes: https://www.twilio.com/docs/flex/developer/ui/custom-views-and-routes
- Flex Plugins CLI: https://www.twilio.com/docs/flex/developer/plugins/cli
- Flex Plugins Quickstart: https://www.twilio.com/docs/flex/quickstart/getting-started-plugin
- TaskRouter TaskQueue Statistics: https://www.twilio.com/docs/taskrouter/api/taskqueue-statistics
- Flex Insights Export API: https://www.twilio.com/docs/flex/developer/insights/api/export-data

## Roteiro final de demonstração desejado

1. Mostrar a conta Flex única e o agente elegível a múltiplas TaskQueues.
2. Alternar o perfil mock de Gestão Flash (todas as operações) para supervisor Itaú (somente Itaú) e Santander (somente Santander).
3. Exibir cards em tempo real com atualização simulada, histórico e a relação `bank_id` / CX / CQ.
4. Demonstrar a diferença entre o filtro nativo (A, UX) e a camada de autorização (B, backend) com teste cruzado 403.
5. Fechar com a tese: "Podemos separar a experiência e os dados de supervisão sem multiplicar as instâncias de atendimento; o requisito de segurança determina a camada de reporting necessária."

Implemente, valide e mostre os resultados. Prioridade: **plugin local funcional e testável; zero alteração no ambiente Twilio de produção sem permissão.**
