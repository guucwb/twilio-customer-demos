# Obramax • Conversation Intelligence

Demo React + Vite, totalmente local e determinística. O bot existente atende; Twilio aparece como camada complementar de entendimento de negócio. Não usa credenciais, APIs, WhatsApp real, OpenAI, banco ou serviços externos. Fontes e ícones são empacotados localmente. Não lê o `.env` do workspace.

## Iniciar

Na raiz do workspace:

```sh
npm run dev -w apps/obramax
```

Abra http://127.0.0.1:5178. Mantenha o terminal aberto. A internet não é necessária durante a apresentação; somente o servidor local precisa continuar em execução.

Para apresentar o build estático:

```sh
npm run build -w apps/obramax
npm exec -w apps/obramax -- vite preview --host 127.0.0.1 --port 5178
```

Use apenas um dos servidores por vez. Em uma nova máquina, a instalação inicial das dependências requer npm e acesso ao registro; depois a demo funciona offline.

## Operação

- **Reiniciar demo**: volta à conversa vazia, etapa zero, sem playback, evidências abertas ou modal.
- **Próxima mensagem**: avança uma etapa exata. São oito mensagens; o nono evento consolida o resumo.
- **Auto Play**: avança a cada 3,2 segundos, parando automaticamente após a análise. **Pausar** preserva a etapa.
- É possível avançar manualmente durante o playback. Navegar para outra tela pausa o playback.
- Clique em um operador detectado para mostrar a evidência. Clique novamente para recolher.
- Revisão fica disponível após a análise completa. Business Insights pode ser aberto a qualquer momento.
- **Como isso se encaixa?** abre a arquitetura conceitual; feche pelo X, pelo fundo ou Escape.

## Roteiro recomendado · 3 a 4 minutos

1. **Conversa ao vivo**: “O bot atende a conversa. A Twilio entende o negócio por trás dela.” Avance manualmente até a terceira mensagem: projeto, volume e localização tornam-se dados.
2. Avance até a quinta mensagem. Destaque urgência, intenção de compra e sensibilidade a preço. Abra **Sinal de compra** para mostrar a evidência. Mostre a ação recomendada, sem afirmar que houve qualquer ativação.
3. Conclua as oito mensagens e a análise. Abra **Revisão da conversa**. Contraste solicitação encerrada com oportunidade comercial não explorada. A resolução é um estado simulado do bot, não uma venda confirmada.
4. Abra **Business Insights**. Apresente 1.247 conversas, 62% resolvidas e as **74 oportunidades potencialmente perdidas**. Mostre projetos e os três exemplos.
5. Abra a arquitetura. O bot permanece responsável pelo atendimento; uma ramificação paralela transforma conteúdo em sinais. Insider, VTEX e Integration Hub são destinos possíveis, sem integração real.
6. Encerre: “Vocês já automatizaram atendimento. Agora podemos ajudar a entender o resultado para o negócio.” Reinicie para repetir.

## Arquivos

- `src/main.tsx`: interface, navegação, autoplay e arquitetura.
- `src/demo.ts`: mensagens, sinais, operadores, resumo e máquina de estados.
- `src/styles.css`: visual, layout adaptável e animações.
- `src/demo.test.ts`: validação das transições e da liberação dos sinais.
- `vite.config.ts`: porta local fixa e ambiente isolado.

## Verificação

```sh
npm run test -w apps/obramax
npm run lint -w apps/obramax
npm run build -w apps/obramax
```

Métricas agregadas e avaliações são sintéticas e não calculadas sobre dados da Obramax. Não há inferência de IA real. A classificação do perfil é apenas potencial. Nenhuma recomendação dispara notificações, eventos ou workflows.
