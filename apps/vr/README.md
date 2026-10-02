# VR Sales Journey

Hipótese de jornada comercial Twilio × VR Benefícios, inteiramente local e determinística. A arquitetura final será definida com a VR durante discovery/piloto. Sem logo oficial, dados reais, backend, autenticação, credenciais ou chamadas externas.

## Iniciar

Na raiz do repositório, com as dependências do workspace já instaladas:

```sh
npm run dev -w apps/vr
```

Abra **http://127.0.0.1:5177/**. Não é `/vr` no servidor da CarePlus: o padrão existente é uma aplicação Vite por porta. Não há setup adicional neste workspace. Em um clone novo, a instalação inicial das dependências requer `npm install`, como nas demais demos.

Para apresentar o build estático, sem hot reload:

```sh
npm run build -w apps/vr
npm run start -w apps/vr
```

Use apenas um dos servidores por vez: ambos usam 5177 com `strictPort`. Deixe o terminal iniciado antes da reunião e abra o navegador; durante a apresentação, tudo é controlado pela interface. Fontes, ícones e conteúdo são locais. Internet não é necessária; o servidor local precisa permanecer ligado. Atualizar a página volta ao início.

## Roteiro de aproximadamente 3 minutos

| Tempo | Clique exato | Narrativa |
| --- | --- | --- |
| 0:00–0:20 | **Iniciar demo** → **Continuar no WhatsApp** | “Um lead acabou de demonstrar interesse. Capturamos os dados e o consentimento.” Mostre o contato em 2 segundos e esclareça que é uma métrica ilustrativa. |
| 0:20–0:50 | **Vamos conversar** → **Sim, mas estamos avaliando trocar de fornecedor.** → **Queremos melhorar a experiência e simplificar a gestão.** → **Sim.** | “O agente qualifica a oportunidade com poucas perguntas.” Mostre o Resumo do lead e abra **Twilio Conversation Memory** para ver os campos acumulados. |
| 0:50–1:10 | **Ver CRM simulado** | “A experiência desejada inclui registrar a oportunidade e anexar o resumo.” Reforce que Salesforce é simulação e a integração será definida no piloto. |
| 1:10–1:30 | **Continuar com proposta** → **Ver proposta** → **Abrir documento** → **Continuar para verificação** | Mostre a prévia de proposta fictícia para 120 colaboradores. |
| 1:30–1:50 | **Enviar código de verificação** → **Confirmar** (123456 já preenchido) → **Continuar para o aceite** | “Confirmamos identidade e avançamos ao aceite.” Verify é simulado; canal e fluxo final de aceite dependem da validação jurídica e de segurança da VR. |
| 1:50–2:15 | **Ver boleto** → **Ver boleto** → botão **×** → **Simular lembrete** | Mostre valor, vencimento e lembrete em 13/10, dois dias antes de 15/10/2026. O documento não é pagável. |
| 2:15–2:45 | **Preciso de ajuda** → **Conectar especialista da EPS** | “Quando o cliente precisa de uma pessoa, a história vai junto.” Mostre o Contexto do cliente (rolável) e a mensagem da Mariana, da EPS Partner A. |
| 2:45–3:00 | Mostre as quatro métricas finais | “Primeiro contato, qualificação, CRM e continuidade com contexto.” São métricas da demo, não resultados de clientes. Encerre lembrando que é uma hipótese a refinar com a VR. |

## Controles de apresentação

- **Reiniciar demo:** limpa jornada, consentimento alterado, código, avisos e documento aberto; retorna ao início.
- **Próxima etapa / Etapa anterior:** avançam ou voltam uma interação do roteiro. São controles do apresentador, não validações produtivas. Próxima etapa também permite percorrer o roteiro completo sem abrir documentos; no formulário, respeita o checkbox de consentimento.
- **Ir para → Primeiro contato / Qualificação / CRM / Pagamento / Transferência:** reconstrói os pré-requisitos do cenário, inclusive histórico, qualificação e contexto. Um salto não executa integrações.
- **Ir para → Pagamento:** abre boleto pendente, com identidade verificada, aceite concluído e lembrete agendado; ainda não enviado.
- **Ir para → Transferência:** abre transferência preparada, após as etapas anteriores do roteiro. Clique **Conectar especialista da EPS** para concluir e mostrar métricas.
- **Falar com alguém:** transfere diretamente a partir do pagamento, sem inventar envio de lembrete. **Preciso de ajuda** transfere depois do lembrete.
- **Tenho uma dúvida:** explicação local dos próximos passos; feche com **Voltar à conversa**, **×** ou Escape.
- **Twilio Conversation Memory:** abre/fecha os dados acumulados. O mesmo seletor alimenta o contexto da EPS. Painéis são roláveis e a timeline acompanha o progresso.
- **Copiar código:** copia `DEMO-ACME-12480-NOT-PAYABLE`, nunca uma linha digitável real. Se o navegador negar acesso ao clipboard, mostra texto selecionável.

Não há Auto Play, timers assíncronos ou persistência. A métrica “2 segundos” é fixa no roteiro, sem espera artificial. Recomenda-se 1440×900 ou 1920×1080; 1280×720 e mobile também foram testados.

## Apresentação da plataforma Twilio

- **Twilio Orchestration:** mostra o produto relevante à etapa, sua função em uma frase e o evento simulado. Abra **Eventos Twilio** para o histórico de produtos ou **Jornada de negócio** para a timeline original.
- **Twilio Stack:** WhatsApp, Agent Connect, Orchestrator, Memory, Verify e Conversation Intelligence. Cinza = aguardando; vermelho = em uso na cena; verde = participação já demonstrada. São estados visuais da simulação, não telemetria real.
- **VR / PARTNERS:** Salesforce, VR Portal e EPS Partner A ficam em uma área distinta, identificados como simulação. Não representam produtos Twilio nem uma integração nativa Salesforce. O canal de aceite permanece a validar com a VR.
- **Twilio Conversation Memory:** mantém a contagem visível e destaca os novos campos ao abrir o contexto. No transbordo, o mesmo contexto é exibido no resumo da EPS.
- **Context preserved:** Conversation Orchestrator → Conversation Memory → EPS Partner A, junto do resumo transferido. Ao conectar a especialista, Conversation Intelligence apresenta a conversa como pronta para análise; nenhuma análise é executada.

Narre a participação dos produtos durante os mesmos cliques do roteiro: Agent Connect no primeiro contato; Memory na qualificação; Orchestrator na etapa de CRM/proposta; Verify na identidade; Messaging no lembrete; Orchestrator + Memory na transferência. Finalize em Intelligence, sem alegar análises ou integrações reais.

Esta evolução altera apenas a apresentação. `presentation.ts` deriva os destaques do passo existente e traduz os dados na renderização; `journey.ts`, as 18 posições, os eventos dos controles e as regras de navegação permanecem intactos.

## Real vs. simulado

**Real:** interface React navegável, estado em memória, controles, validação local de consentimento/código, prévias de documento e cópia local de texto.

**Simulado:** landing page comercial, WhatsApp, agente de IA (texto fixo, sem LLM), qualificação, CRM/Salesforce, identidade/Verify, aceite, proposta, boleto, lembrete, EPS, memória/contexto e métricas. Não existe PDF, boleto, contrato, mensagem, oportunidade ou verificação real. Agent Connect, Conversation Orchestrator, Conversation Memory e Conversation Intelligence são mapeamentos conceituais; nenhuma chamada a esses produtos é executada. Intelligence aparece como conversa pronta para análise, sem inventar resultados. Não há aprovação de template nem compromisso com arquitetura, SLA, benchmark ou resultados.

## Isolamento e arquitetura

A inspeção encontrou npm workspaces `apps/*`, React 19, TypeScript, Vite, CSS por aplicação, ícones Lucide e fontes empacotadas. CarePlus usa 5173 + API 3001; Boti usa 5174 + API 3002; Aché usa 5175 + API 3003; BetMGM tem fallback Vite 5176 e plugin Flex independente. Não há router/launcher compartilhado.

VR segue o fallback isolado do BetMGM e as convenções visuais/tipográficas das outras demos, com CSS próprio e paleta neutra azul. `envDir: false` evita leitura de `.env`. Não importa código de outras apps. `journey.ts` é a fonte única para roteiro, timeline, contexto e navegação reversível. As únicas alterações fora de `apps/vr` são a entrada documental no README raiz e duas entradas da VR no lockfile, sem atualizar versões existentes.

## Validação

```sh
npm run lint -w apps/vr
npm run typecheck -w apps/vr
npm run test -w apps/vr
npm run build -w apps/vr
```

Teste de navegador opcional, usando uma instalação existente de Playwright (não necessária para executar/apresentar):

```sh
PLAYWRIGHT_MODULE=/caminho/para/playwright/index.mjs node apps/vr/scripts/browser-smoke.mjs
```

Ver [registro de validação](docs/validation.md) para testes executados e limites da regressão.
