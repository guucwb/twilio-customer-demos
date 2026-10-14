# Recuperação segura da Glô

Recuperação de código, seleção de cenário e recuperação de execução são operações diferentes. Este guia substitui instruções antigas de restaurar automaticamente a variante Rafael. Nada foi restaurado ou reiniciado neste handover.

## Estado que deve ser preservado

- Cenário preservado, seus recursos nativos, pedidos, ledgers e resultados da apresentação.
- Cenários anteriores, sem apagar perfis/Conversations ou alterar seus pedidos para repetir o roteiro.
- Credenciais globais/locais, configurações ngrok e perfis CLI, separados dos backups de código.
- Arquivos privados em `.demo-data/recovery/`, manifests e sidecars `.sha256` existentes.

Identificar os processos existentes antes de uma operação autorizada. Este guia não afirma o estado atual dos serviços e não autoriza encerrá-los.

## Recuperação preferida: seletor, sem restauração de dados

Somente com autorização e serviço nativo ocioso, selecionar um cenário anterior preparado:

```sh
node apps/globo/scripts/scenario.mjs activate gustavo-cenario-existente
```

Recarregar apenas o serviço nativo autorizado com `npm run start:native -w apps/globo`, depois conferir conta, perfil, configuração, pedido/versão e preflight. Gateway/ngrok não devem ser encerrados ou reconfigurados se houver outros consumidores. O comando não apaga recursos remotos.

Retorno à variante Rafael é outra experiência: `node apps/globo/scripts/scenario.mjs rafael`, seguido de recarga nativa autorizada. Não apresentá-la como Memory RH nativo de Gustavo. Não ativar o oficial para um novo ensaio: preparar outro cenário com nome exclusivo.

## Restaurar código/build

1. Identificar o ponto de recuperação correto; snapshots antigos da variante RH não são equivalentes ao código nativo atual.
2. Verificar checksum do arquivo e, quando disponível, manifest de arquivos. Extrair em pasta nova e privada, nunca diretamente sobre a aplicação ou sobre o cenário oficial.
3. Inspecionar os membros do arquivo. Alguns snapshots guardam source/build; outros contêm evidências/cenários privados. Não publicar arquivos restaurados nem confundir evidências com credenciais de setup.
4. Fazer backup do código atual e obter autorização para a troca. Preservar `.env`, `.env.local`, `.demo-data` e outras aplicações. Não substituir o lockfile global indiscriminadamente.
5. Validar a cópia restaurada com testes locais mockados e build. Só então recarregar o serviço alvo autorizado e executar preflight.

O ponto local anterior à preparação oficial contém a versão aprovada e os cenários anteriores. Os arquivos de recuperação mais antigos têm escopos e vozes históricas diferentes. Não copiar parâmetros antigos por cima das vozes atualmente aprovadas. Credenciais precisam continuar provisionadas separadamente.

## Falha de processamento ou estado divergente

Não repetir automaticamente STT, TTS, envio incerto, ingestão ou criação do pedido. Conferir Message SID, Communication, chave de idempotência, versão do executor e referência Memory antes de qualquer recuperação pontual. Preservar ledger e falha originais; nunca fabricar uma confirmação de sucesso.

Código atual de consulta de Intelligence pode recuperar resultados existentes por GET. Resultado com citação inválida permanece separado, não é reprocessado em massa para “passar” no validador. Uma nova análise precisa de autorização e revisão do input real.

## Contingência de apresentação

Se rede/provedor falhar, apresentar arquitetura e evidências anteriores datadas, indicando sua origem. A variante antiga com roteiro local pode servir como outra experiência explicitamente simulada, não como substituta silenciosa de Memory/Orchestrator/Intelligence nativos. Não editar o oficial, importar um fixture como insight ou prometer que o modelo voltou apenas porque respondeu HTTP 200.

Checksums comprovam integridade do arquivo comparado, não confidencialidade, disponibilidade remota ou restauração completa em outro Mac. Os backups locais devem ter uma política privada de cópia/retencão; não são enviados ao GitHub.
