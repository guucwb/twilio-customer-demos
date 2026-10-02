# Validação — 02/10/2026

## Evolução visual da plataforma Twilio

Nova rodada de validação em 02/10/2026, após a apresentação de Twilio Orchestration, Twilio Stack, Memory e separação VR / PARTNERS:

- `journey.ts` comparado byte a byte com a versão anterior à evolução: idêntico. Permanecem as 18 posições, reducer, contexto, mensagens e regras de navegação. Traduções são aplicadas somente ao renderizar.
- Lint, typecheck e build VR: passaram; 6 testes existentes VR passaram sem alterações.
- Suíte completa: novamente 88 testes em 10 arquivos passaram.
- Browser smoke VR atualizado para os rótulos PT-BR: repetiu o fluxo completo, os cinco atalhos, voltar/avançar, reset, consentimento, código inválido/correto, documentos, cópia, lembrete, transbordo e refresh.
- Novas verificações no navegador: seis produtos neutros no início/reset; ativação de Agent Connect e Verify; Verify concluído após confirmação; Intelligence neutro no pagamento e em destaque somente quando a conversa está pronta para análise; nenhuma análise real alegada.
- Campos Memory evoluem de 4 a 8 durante a qualificação, com dois novos campos destacados ao concluí-la. O resumo da EPS e os valores de Memory são iguais no transbordo. Cadeia visual validada: Conversation Orchestrator → Conversation Memory → EPS Partner A.
- Salesforce aparece na área de parceiros, sem entrar na barra de produtos Twilio. Histórico de produtos e a timeline original continuam inspecionáveis pelos detalhes do painel.
- Offline após carregamento: passou, com zero tentativas externas e zero erros de console/runtime. A fonte local de peso 500 passou a ser usada já na barra inicial para não precisar carregar uma nova fonte ao navegar após desconexão total do navegador.
- Layout revisado em 1440×900, 1280×720 e 390×844. Em 1280×720, o teste também verifica que os controles de apresentação não cobrem as ações da conversa. Os painéis longos continuam roláveis.
- Smoke das outras demos repetido: CarePlus, Boti, Aché e BetMGM passaram; também passou novamente `npm run smoke` da CarePlus. Mesmos limites descritos abaixo: provedores externos desabilitados, sem OTP real nem plugin Flex remoto.
- Nenhuma nova dependência, API ou alteração fora de `apps/vr` nesta evolução visual.


## VR

- Build, TypeScript e lint da aplicação: passaram.
- 6 testes do modelo de jornada: qualificação progressiva, salto canônico, pré-requisitos de pagamento, transbordo antes/depois do lembrete, reversão, limites e reset.
- Chromium/Playwright: fluxo inteiro por cliques; todos os botões e cinco jumps; Next, Previous e Restart; consentimento desmarcado; OTP inválido e correto; proposta e boleto; modal por ×/Escape; pergunta; clipboard; handoff direto do pagamento e após lembrete; mensagem humana e métricas.
- Refresh retorna ao Start; navegação completa com navegador offline após carregamento passou.
- Todas as requisições não locais bloqueadas durante o teste: **zero tentativas externas**. Fontes e ícones servidos pelo próprio app.
- Console e runtime: zero erros na VR.
- Layout inspecionado em screenshots; 1440×900, 1280×720 e 390×844; sem overflow horizontal. Painéis longos têm rolagem; controles ficam no rodapé e notas de arquitetura continuam visíveis.
- Os testes de navegador estão em `scripts/browser-smoke.mjs`; screenshots temporárias em `/tmp/vr-*.png` não são artefatos necessários para a demo.

## Regressão das aplicações anteriores

Nenhum fonte, rota, configuração ou dependência das outras demos foi alterado.

| Aplicação | Smoke executado | Resultado |
| --- | --- | --- |
| CarePlus | Interface/login, envio desabilitado sem provedor, refresh; script HTTP existente: frontend, health, capabilities, sessão, validação, CSRF, autorização e reset | Passou |
| Boti | Abrir, oferecer retirada, simular aceite, mudar para franquia, orientar, abrir incidente, escalar, reset e refresh | Passou |
| Aché | Preparar comunicação nas estratégias/canais, gerar preview RCS, reset e refresh | Passou |
| BetMGM | Fallback local: Inbox, Cases, Players, Knowledge, Supervisor e refresh | Passou |

Navegador bloqueou tráfego externo, sem erros de console/runtime nessas passagens. Backends de regressão criados temporariamente com as factories existentes: CarePlus sem cliente Verify, Boti sem chave, Aché com ambiente vazio. Nenhum `.env` foi alterado ou credencial usada nesses testes. O login real OTP da CarePlus e o plugin Flex remoto BetMGM **não** foram executados; não se afirma validação dessas integrações.

- `npm test`: **88 testes / 10 arquivos passaram**, incluindo 6 novos testes da VR.
- `npm run typecheck`: passou em todos os workspaces.
- `npm run build`: passou em todos os workspaces.
- `npm run smoke`: passou com o backend CarePlus sem provedor.
- `npm run lint -w apps/vr`: passou.
- `npm run lint` da raiz: **116 erros preexistentes** na árvore do plugin BetMGM (build/configurações e arquivos do plugin). Esse escopo não foi alterado para evitar refactor/configuração global. A VR não introduziu erros de lint.

A primeira execução dentro do sandbox bloqueou Chromium e portas dos testes de servidor. As execuções repetidas com permissão apropriada passaram; não houve mudança no código das outras demos para contornar essas restrições.
