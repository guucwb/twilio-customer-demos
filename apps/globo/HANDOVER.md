# Handover técnico público — Glô

Este documento descreve a implementação demonstrativa e requisitos técnicos para continuidade. Não contém contexto comercial, arquitetura interna confirmada de cliente, stakeholders ou estratégia de conta. O projeto usa dados fictícios; não é implantação produtiva.

## Leitura inicial

[README](README.md), [ARCHITECTURE](ARCHITECTURE.md), [RUNBOOK](RUNBOOK.md), [SECURITY-AUDIT](SECURITY-AUDIT.md) e [RECOVERY](RECOVERY.md). A árvore usada para revisão pública é baseada em `origin/main`; a versão funcional preservada não deve ser sobreposta nem mesclada sem revisão.

## Decisões implementadas

- Um participante técnico autorizado representa um personagem fictício. Telefone não é autenticação corporativa.
- Gateway e variante nativa têm responsabilidades separadas; a versão RH antiga não substitui o fluxo nativo.
- Messaging e Calling usam a configuração/perfil do cenário, mas conservam identificadores e pipelines de áudio distintos.
- Notas: STT de arquivo OpenAI, TTS ElevenLabs e Ogg/Opus. Calling: Conversation Relay. As configurações das vozes são independentes.
- Orchestrator recebe conteúdo por ingestão ativa; não captura indiscriminadamente mensagens de um sender compartilhado.
- Memory de férias recupera uma origem nativa delimitada. Memory operacional armazena referências; o estado do pedido pertence ao executor simulado.
- Intenções, campos, autorização da ação, versão e idempotência são controlados pelo workflow. OpenAI reformula respostas operacionais sob validação.
- Intelligence v3 fornece resultados nativos; citações sem correspondência são separadas. Fixtures não substituem resultados ausentes.
- Scripts administrativos requerem configuração privada e revisão de conta, recurso e dependências. Não são executados automaticamente na inicialização.

## Capacidades e limites

| Área | Capacidade da implementação | Não implica |
| --- | --- | --- |
| WhatsApp | Notas de voz e texto do participante autorizado; respostas reais | Acesso aberto, isolamento por visitante ou envio irrestrito |
| Calling | TwiML, Relay, assinatura, sessão e interrupções | Disponibilidade garantida, elegibilidade permanente ou SSO |
| Memory | Referências e recuperação da comunicação de férias entre agentes/sessões | Saldo, aprovação de férias ou autorização de dados corporativos |
| Equipamentos | Pedido mock com confirmação, versão, histórico e deduplicação | Ticket ServiceNow, estoque, despacho, SLA ou entrega física |
| Intelligence | Consulta de operadores e associação à transcrição | Execução de toda regra em todo segmento ou ausência de erros semânticos |
| Segurança | Assinatura, conta/nonce/Call SID, restrição de participante e painel protegido | IAM corporativo, HA, rate limiting completo ou ambiente produtivo |

Resultados e aceites de execuções específicas pertencem ao registro privado do ambiente. O roteiro não prova o estado atual de um pedido. Testes locais mockados não comprovam áudio, Calling ou Memory remoto no ambiente de outro operador.

## Receber um ambiente autorizado

Obter por canal privado: acesso nominal aos produtos/conta; credenciais; inventário mínimo de recursos aprovados; manifest/seletor; configuração das vozes; confirmação de permissões e termos; autorização de consumo; e dependências de roteamento/rollback. Não transferir transcripts, mídia ou backups completos por padrão.

Identificadores de implantação vêm do ambiente privado e dos ledgers, não de exemplos públicos. Conferir que a conta, sender, Voice Application, perfil e configuração correspondem entre si antes de executar scripts. Criar outro ambiente exige autorização e provisionamento dedicado; não reutilizar um recurso apenas porque seu ID está disponível.

## Nova demonstração

Seguir o [RUNBOOK](RUNBOOK.md): nome exclusivo, Store/perfil/Orchestrator dedicados, serviço ocioso e verificação de estado vazio. Preservar todos os cenários anteriores. Não apagar Memory, fechar Conversations compartilhadas, limpar ledgers ou mover artificialmente um pedido antigo para repetir a apresentação.

Aceite: origem real do áudio, entrega/reprodução, sessão autenticada, contexto recuperado em outro agente, pedido confirmado uma vez e resultado nativo associado à evidência. Identificar explicitamente o executor simulado.

## Integrações futuras — possibilidades genéricas

Nenhuma integração produtiva com Now Assist/Nimo/ServiceNow foi implementada ou testada. Para conectar o demonstrador a qualquer plataforma corporativa:

1. Obter documentação, permissões, tenancy e interfaces suportadas do sistema de destino.
2. Mapear identidade corporativa e autorização por usuário/domínio; não usar apenas telefone.
3. Definir contrato mínimo de contexto, origem, consentimento, retenção e exclusão.
4. Definir sistema de registro de cada ação, confirmação, idempotência, versão e reconciliação de falhas.
5. Implementar handoff com aceite humano e resumo rastreável, sem presumir encaminhamento real pelo mock.
6. Validar com dados sintéticos em ambiente isolado, antes de qualquer piloto com dados reais.

Não assumir licença, API, conector ou feature de uma plataforma sem validar seu suporte. Memory não transforma um fato em autorizado e não substitui o estado do sistema de registro.

## Pendências técnicas

Parametrização de implantação proposta na cópia pública; paginação; reconciliação de executor/Memory; autenticação corporativa; concorrência/isolamento por participante; quotas; política de retenção e revisão dos operadores por domínio. QR Code aberto permanece fora do escopo seguro do demonstrador atual.

A auditoria informa o que pode ser publicado e o que ainda exige decisão sobre histórico e exemplos. O material público não inclui o handover comercial privado, e nenhum envio ao CRM é realizado por estes scripts.
