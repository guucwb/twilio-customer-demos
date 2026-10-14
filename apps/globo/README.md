# Glô — demonstração Globo + EDX

Demonstração técnica em português brasileiro de continuidade entre notas de voz no WhatsApp e WhatsApp Business Calling. O personagem Gustavo trata um interesse fictício em férias e um pedido fictício de equipamentos. Não há acesso a dados de colaboradores nem execução em sistemas corporativos da Globo.

A implementação atual está em `native/` (React, Express e TypeScript). `server/` também hospeda o gateway e a versão RH anterior; `experiments/` contém variantes históricas. Não iniciar essas variantes como se fossem a demonstração nativa atual.

## Documentação atual

| Documento | Conteúdo |
| --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Fluxos, Mermaid, responsabilidades e fontes de verdade |
| [RUNBOOK.md](RUNBOOK.md) | Setup, variáveis, inicialização, cenários, validação e troubleshooting |
| [HANDOVER.md](HANDOVER.md) | Continuidade técnica, capacidades e requisitos genéricos de integração |
| [SECURITY-AUDIT.md](SECURITY-AUDIT.md) | Auditoria do Git público, controles, pendências e publicação |
| [RECOVERY.md](RECOVERY.md) | Preservação e recuperação segura |

Os documentos de execução anteriores são registros históricos, não o runbook atual. Quantidades de testes, vozes e métricas nesses documentos descrevem etapas diferentes. Arquivos de evidência reais ficam fora do Git. Contexto comercial, informações de conta e registros de operação não fazem parte desta documentação pública.

## O que é real e o que é simulado

| Componente | Implementação |
| --- | --- |
| WhatsApp Messaging | Recepção real por webhook e envio real via Twilio, limitado ao participante autorizado |
| Notas de voz | Download autenticado Twilio; STT de arquivo OpenAI; síntese ElevenLabs; conversão Ogg/Opus; entrega WhatsApp |
| WhatsApp Business Calling | Sender autorizado e Voice Application dedicada, com TwiML e Conversation Relay reais |
| Conversation Relay | WebSocket autenticado, prompts, interrupções e respostas de fala pelo protocolo Twilio |
| Conversation Orchestrator | Ingestão ativa de mensagens e transcrições de voz; agrupamento por perfil e configuração dedicada por cenário |
| Conversation Memory | Perfis, identificadores, referências de pedidos e Recall nativo da comunicação de férias |
| Conversation Intelligence v3 | Operadores nativos e consulta dos resultados existentes com evidência validada |
| Agente | Extração de intenções/entidades e execução determinísticas; OpenAI reformula respostas de equipamentos sob controles; RH usa contexto nativo delimitado |
| Nimo/ServiceNow | Adapter local **simulado**, com estado, versão, histórico e idempotência. Sem teste ou integração produtiva com EDX, Nimo, Now Assist ou ServiceNow |
| Rascunho do pedido | Persistência local do workflow, explicitamente distinta de Conversation Memory |

O painel de apresentação filtra resultados `twilio-intelligence-v3`. A visão técnica contém também fixtures marcados `non-native-simulation`; eles não comprovam análise nativa.

## Início rápido, após receber o ambiente privado autorizado

Executar na raiz do monorepo:

```sh
npm ci
npm run test:native -w apps/globo
npm run test -w apps/globo
npm run build:native -w apps/globo
```

Somente quando autorizado a iniciar serviços e com portas disponíveis:

```sh
npm run start:gateway -w apps/globo
npm run start:native -w apps/globo
npm run preflight:globo -w apps/globo
```

Painel local: `http://127.0.0.1:3007/globo/native/?presentation=1`. O ngrok encaminha HTTPS/WSS ao gateway 3007; o serviço nativo usa 3010. Confira dependências antes de tocar em processos existentes. Os comandos acima não foram executados durante este handover.

**Um clone não basta para operação real.** Credenciais, senha do painel, ledger de recursos dedicados e seletor de cenário são privados e não estão no repositório. A cópia candidata à publicação exige identificadores de implantação em configuração privada. Configurar somente outro Account SID não provisiona os recursos necessários. Leia o [RUNBOOK](RUNBOOK.md) antes de usar scripts de provisionamento ou binding.

## Preservação e validação

Cenários anteriores e evidências de execução permanecem privados. Não usá-los para uma demonstração do zero, nem publicar transcripts ou detalhes de operação. Resultados específicos devem ser consultados no registro autorizado do ambiente.

Os testes da aplicação usam mocks e verificam protocolo, entidades, confirmação, versão, idempotência e validação de resultados. Aceite real de áudio, Calling e memória entre sessões exige ensaio autorizado em cenário novo; HTTP 200 não é prova suficiente.

## Recuperação segura

Código/build e runtime têm recuperações distintas. Os snapshots e checksums são privados em `.demo-data/recovery/`; não contêm credenciais para reconstruir uma conta. Trocar o seletor não apaga os recursos nativos anteriores. Restaurar um backup nunca deve sobrescrever o cenário oficial ou disparar uma mensagem antiga. Consulte [RECOVERY.md](RECOVERY.md). Retorno à variante Rafael, apenas após revisão e com serviço ocioso: `node apps/globo/scripts/scenario.mjs rafael`; ela não substitui a experiência nativa Gustavo.

Não publicar `.env`, `.env.local`, dados de execução, URLs assinadas, gravações ou backups. A auditoria e as pendências de exposição estão em [SECURITY-AUDIT.md](SECURITY-AUDIT.md). Commit e push dependem de revisão e aprovação do proprietário.
