# Aché Communication Hub

Demonstração em português: **uma única jornada de negócio, múltiplos canais de comunicação, sem duplicar a lógica da aplicação.**

Pessoas, casos e conteúdos são fictícios. A demo **não está conectada ao Salesforce** nem a sistemas da Aché; o caso ACH-2841 é uma representação demonstrativa de um processo do Service Cloud. O conteúdo é não clínico.

## Iniciar

A partir da raiz do workspace:

```sh
npm run dev -w apps/ache        # http://127.0.0.1:5175 (API em 3003)
```

Para a reunião, prefira o build servido pelo próprio backend:

```sh
npm run build -w apps/ache
npm run start -w apps/ache      # http://127.0.0.1:3003
```

Portas: CarePlus 5173/3001, Boti 5174/3002, Aché 5175/3003. Nada é enviado ao carregar a página. Sem banco, túnel, webhook ou login. Fontes e ícones são locais: a apresentação funciona sem internet.

## Estados dos canais

O backend decide o estado de cada canal a partir de variáveis **específicas do Aché** (nunca de variáveis de outras demos). A API expõe só estados, endereços mascarados e **nomes** de variáveis ausentes.

| Canal | Estado padrão | Como fica LIVE |
|---|---|---|
| WhatsApp · Conversacional | DEMO | `ACHE_WHATSAPP_FROM` + `ACHE_DEMO_RECIPIENT_WHATSAPP` + `ACHE_LIVE_ENABLED=true` |
| SMS · Alta cobertura | DEMO | Mantido em demonstração. Só com `ACHE_SMS_FROM` + `ACHE_DEMO_RECIPIENT_SMS` atribuídos deliberadamente |
| Email · Conteúdo detalhado | DEMO | `SENDGRID_API_KEY` + `ACHE_EMAIL_FROM` (remetente verificado) + `ACHE_DEMO_RECIPIENT_EMAIL` |
| RCS · Experiência rica | NOT_PROVISIONED | Nunca. Não existe caminho de envio; só preview de experiência |

`ACHE_WHATSAPP_FROM` aponta para o remetente WhatsApp online já existente na conta. **O perfil desse remetente não é da marca Aché**, e mensagens livres exigem uma **janela de atendimento de 24 h aberta** (o número de teste precisa ter enviado uma mensagem ao remetente antes). Não há template aprovado para Aché; nenhum recurso Twilio foi criado ou alterado. Veja `.env.example`.

Os estados aparecem somente em **Modo Demo** (faixa superior, cartões de estratégia e painel de envio). A tela normal fala de intenção, canal, experiência e resultado.

## Validar o WhatsApp real antes da reunião (privado)

1. No telefone de teste, envie qualquer mensagem ao remetente (abre a janela de 24 h).
2. No `.env` raiz: `ACHE_DEMO_RECIPIENT_WHATSAPP=whatsapp:+55...` e `ACHE_LIVE_ENABLED=true`. Reinicie o servidor.
3. Ative **Modo Demo** → Conversacional · WhatsApp → **Enviar teste real** → confirme o destino → **Enviar agora**.
4. A linha do tempo mostra eventos **Twilio** reais (Message SID, status, horários) consultados pelo servidor a cada 3 s, por até 5 min. Sem túnel público, o status vem de consulta ao recurso Message, não de webhook.
5. Volte `ACHE_LIVE_ENABLED=false` se não pretende usar envio real na apresentação.

Cada envio real inclui o aviso: “Mensagem de teste de uma demonstração. Não é uma comunicação oficial da Aché.” Proteções: confirmação explícita, botão bloqueado durante o envio, `requestId` idempotente, um envio por vez e intervalo de 20 s por canal (mantido mesmo após reiniciar). Destinos digitados só com `ACHE_ALLOW_CUSTOM_RECIPIENT=true`.

## O que é real e o que é demonstração

- **Aplicação** (linha do tempo): eventos gerados pela demo — processo solicitou comunicação, estratégia selecionada, mensagem preparada, alternativa definida. Em Modo Demo aparecem como “Simulação” ou “Teste real”.
- **Twilio / SendGrid**: aparecem **somente** com dados vindos de uma resposta real do provedor. `queued`/`accepted` nunca são tratados como entrega. Para email, a SendGrid confirma aceite; a entrega não é acompanhada.
- Falhas aparecem como evento de aplicação (“Envio de teste não realizado”) com orientação curta e o código informado pelo provedor. Diagnóstico técnico fica só no log do servidor (canal e códigos, sem destino nem texto do provedor).

## Roteiro (5–7 min)

1. **Contexto de negócio** — coluna “O que comunicar”. *“Esse processo nasceu no Salesforce. O objetivo aqui não é mostrar Salesforce, mas mostrar o que acontece depois que o processo decide que precisa se comunicar com Mariana.”* Aponte Mariana, ACH-2841, origem (representação), consentimento e objetivo.
2. **Intenção × canal** — a faixa escura “mesma intenção” sobre a prévia. *“O processo sabe o que precisa comunicar. Ele não deveria precisar conhecer todos os detalhes de WhatsApp, SMS, email ou canais futuros.”*
3. **WhatsApp** — Conversacional. Mostre a prévia e clique **Preparar comunicação**. Opcional (Modo Demo, se validado antes): **Enviar teste real** e mostre o resultado real do provedor. Lembre que o remetente de teste não é da marca Aché.
4. **Trocar de canal** — Alta cobertura · SMS. Caso, cliente, origem e objetivo não mudam; só a expressão. Prepare e mostre “Estratégia alterada… Mesmo caso, mesmo objetivo” na linha do tempo.
5. **Email** — Conteúdo detalhado: assunto, contexto completo, protocolo, rodapé institucional.
6. **RCS** — Experiência rica. *“Este ambiente não possui RCS provisionado, então aqui estamos mostrando apenas como esse canal entraria na mesma arquitetura.”*
7. **Linha do tempo** — eventos de Aplicação × eventos Twilio. Sem envio real, nenhum evento Twilio aparece — e isso é intencional.
8. **Arquitetura** — botão no topo. A: esta demo. B: integração documentada Salesforce BYOC for CCaaS com Twilio **SMS e WhatsApp**. C: RCS como possibilidade futura (não faz parte dessa integração). *“O processo define o que comunicar. A Twilio resolve como essa comunicação acontece.”*
9. **Fechamento** — *“A ideia não é colocar mais canais dentro do Salesforce. É evitar que cada novo canal crie uma nova lógica de negócio.”*

**Reiniciar demo** restaura canal, prévias, linha do tempo e envios acompanhados.

## Estrutura

```
apps/ache/
  shared/journey.ts   intenção única + expressão por canal (usada pela prévia e pelo envio real)
  shared/events.ts    formato de evento do provedor
  server/             capacidades, adaptadores Twilio/SendGrid, API Express
  src/                React: contexto, estratégia, prévias, linha do tempo, arquitetura
```

O mesmo adaptador Twilio atende WhatsApp e SMS; só muda o formato do endereço. Nenhum pacote novo foi adicionado ao workspace.

## Validação

```sh
npm run lint && npm run typecheck && npm test && npm run build
```

Fonte da integração documentada: [Set up Salesforce BYOC CCaaS with Twilio SMS and WhatsApp Channels](https://www.twilio.com/docs/flex/admin-guide/integrations/salesforce-byoccaas). Identidade visual inspirada no site público da Aché (cores e tipografia, sem uso de ativos); não é um produto oficial.
