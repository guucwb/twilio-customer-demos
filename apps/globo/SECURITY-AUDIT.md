# Revisão de segurança da versão pública

## Escopo e estado

A auditoria anterior examinou sete commits alcançáveis em `origin/main` e 341 blobs. Não encontrou valores das credenciais configuradas localmente, padrões de chaves privadas ou arquivos brutos de runtime versionados. Isso não comprova ausência de segredos desconhecidos, objetos órfãos, forks ou caches. Nenhuma credencial foi rotacionada e nenhuma operação remota foi executada nesta revisão.

Esta rodada prepara **rascunhos não commitados**: documentação pública, material privado separado e sanitização de implantação apenas na cópia de publicação baseada em `origin/main`. A implementação usada pelo ambiente preservado não foi recarregada nem sobreposta. Há conteúdo anterior no histórico público; limpar o arquivo atual não limpa esse histórico.

## Classificação dos metadados

| Informação | Classificação | Tratamento e impacto |
| --- | --- | --- |
| Rotas locais, portas, protocolo, schemas e nomes de variáveis | Pública | Necessários para entender/reproduzir o projeto; não concedem acesso |
| Fixtures e políticas explicitamente fictícios | Pública | Não apresentar como política do cliente ou execução real |
| IDs de voz/modelo comercial publicamente selecionáveis | Pública, sujeita ao acesso do provedor | Não são credenciais; não garantem licença ou disponibilidade |
| Account SID, sender, Voice App e demais IDs de implantação | Privada operacional | Parâmetros/ledgers privados, com guards de conta e recurso; remover literais da cópia candidata |
| Domínio pessoal de túnel e telefone de operação | Privada operacional | Origem e sender privados; exemplos usam domínio reservado. Exposição pode revelar ambiente ou induzir uso indevido |
| WABA, dependências legadas e autorizações de roteamento | Privada operacional | Apenas no pacote privado; nunca inferir autorização por um relatório público |
| IDs de mensagens de recuperação e outros rastros específicos | Privada operacional | Allowlist privada explícita; recuperação desabilitada por padrão na cópia candidata |
| Resultados/latências de uma apresentação, transcrições e áudio | Registro privado de execução | Não exportar ao Git. Há registros fictícios produzidos por execução real; não são fixtures genéricos |
| Stakeholders, percepções comerciais e estratégia de conta | Interna | Removidos dos documentos públicos; rascunho privado para handover/CRM, sem envio externo |
| Auth Tokens, API Keys, senha, chave de mídia, token ngrok e URLs assinadas | Segredo | Nunca publicar. Se houver exposição, revogar/rotacionar com o proprietário e planejar saneamento de histórico |

IDs operacionais não substituem um Auth Token. Não foi encontrada evidência de credencial exposta que justifique afirmar necessidade de rotação agora. Ainda assim, os IDs e o contexto operacional não devem permanecer no material público pretendido pelo proprietário.

## Sanitização candidata

- Sender, origem HTTPS, SID do sender/serviço legado e IDs de recuperação passam a vir de configuração privada; guards de sintaxe, conta, snapshot e recursos continuam exigidos.
- Defaults de ambiente apontam somente a domínio reservado de exemplo; não a um túnel pessoal. Um exemplo não é um deployment válido nem autoriza consumo.
- Recuperação histórica só aceita mensagens explicitamente revisadas na configuração privada; nada é repetido automaticamente.
- Plano de migração público passa a template não autorizado, sem dados de uma operação específica.
- Relatórios históricos públicos viram páginas de encaminhamento para os guias atuais. Originais permanecem em backup privado; não foram apagados do ambiente.
- README, arquitetura, runbook e handover públicos descrevem somente o demonstrador e requisitos genéricos. Não afirmam a arquitetura interna de um cliente.

Essa sanitização não foi aplicada aos serviços existentes nem às credenciais do ambiente. A cópia pública precisa das novas variáveis documentadas antes de operação futura. Sua ausência bloqueia os caminhos administrativos em vez de selecionar um recurso arbitrário.

## Números de outras aplicações

| Local | Verificação | Classificação / ação |
| --- | --- | --- |
| Modelo e atividade de `apps/ache-journey` | Contato declarado sintético no código; sender de exemplo corresponde a magic number documentado | Fixture de intenção fictícia e exemplo público. Magic number funciona em endpoints suportados com test credentials; não é um sender WhatsApp provisionado |
| Testes `apps/ache`, `apps/api`, `apps/globo` e experimentos | Chamadas usam adapters/fetchers mockados; números plausíveis servem à validação de formato | Fictícios por **uso no teste**, sem comprovação de titularidade/reserva. Não reutilizar em chamadas reais; confirmar origem ou planejar substituição sem mudar semântica dos testes |
| Placeholders de `apps/ache/src/LiveSend.tsx` e `apps/web/src/App.tsx` | Texto de exemplo em UI, não evidência de contato real | Rascunho público usa formato textual, sem número plausível específico; nenhuma integração ou recurso compartilhado alterado |
| Participante da implantação preservada | Configuração privada, sem correspondência encontrada nos arquivos públicos auditados | Contato real de teste; permanece fora do Git e não foi divulgado neste relatório |
| Sender do demonstrador | Uso real previamente verificado, não pessoa fictícia | Configuração empresarial real, removida dos literais da cópia candidata; guard permanece |

Uma sequência que parece telefone não prova que exista nem que seja de uma pessoa conhecida. Um comentário de fixture também não prova que a sequência seja reservada. Não foi feita consulta de titularidade, mensagem ou chamada para testar esses exemplos.

Fontes públicas: [Twilio Test Credentials](https://www.twilio.com/docs/iam/test-credentials) e [WhatsApp Sandbox](https://www.twilio.com/docs/whatsapp/sandbox). O Sandbox é um recurso compartilhado real; não confundir com um número magic de testes.

## Exclusões e histórico

`.env`, `.env.*`, logs e `.demo-data` estão ignorados; exemplos de ambiente são deliberadamente versionados e não devem conter segredos. Regras adicionais protegem dumps, backups, gravações, bancos, chaves, senha e nomes de estado da Glô fora do diretório canônico. `.gitignore` não remove conteúdo já rastreado.

O histórico público anterior ainda contém domínio, sender e IDs operacionais, além de relatórios de execução. Necessário decidir, **antes de publicação**, um plano aprovado de remoção de histórico e coordenação de clones/forks/caches, ou aceitação explícita do risco residual desses metadados. Esta tarefa não fez rebase, commit, force push, exclusão remota ou liberação de push protection.

Os commits funcionais locais anteriores não devem ser mesclados de volta ao histórico sanitizado. O código da implantação permanece privado no checkout preservado para recuperação.

## Pendências antes de aprovação

1. Revisar o diff de parametrização na cópia isolada e confirmar o pacote privado necessário a uma implantação futura.
2. Confirmar a origem/reserva dos números plausíveis em fixtures de outros workspaces, ou aprovar sua substituição com testes específicos. Nenhuma titularidade real foi inferida.
3. Aprovar um plano de saneamento do histórico público já existente, considerando cópias fora deste clone.
4. Rever classificação e controles de acesso do material privado antes de transferi-lo a CRM/SE; nenhum texto foi enviado ao Salesforce.

A documentação/código candidatos podem ser revisados localmente. **Não há commit ou push autorizado/executado nesta rodada.** O cenário preservado, evidências, backups e processos existentes não foram alterados.
