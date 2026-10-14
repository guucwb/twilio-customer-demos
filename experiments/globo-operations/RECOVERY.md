# Recuperação sem credenciais

A versão aprovada continua em apps/globo, porta3007. Arquivo aprovado: apps/globo/.demo-data/recovery/globo-functional-20261013.tar.gz; hash validado conforme manifest original. Não foi sobrescrito. Voltar para3007 exige apenas parar o laboratório3009 e abrir a aplicação anterior; o túnel reservado da demo não foi movido.

Novo snapshot local desta evolução: `.demo-data/recovery/globo-operations-local-20261013.tar.gz`, com código/configuração/fixtures/build e manifests existentes. Exclui `.env`, `.env.local`, senha, estado/ledger/runtime, node_modules e Git. Não executa provisionamento ao restaurar. Manifest de hashes acompanha o snapshot; usa mesmas dependências instaladas, não valida reinstalação limpa.

Para restaurar o novo código, extrair em diretório temporário isolado, conferir hashes e executar os comandos do README. Não extrair sobre apps/globo. Manter as credenciais no ambiente original do backend, sem copiá-las ao pacote. Todas as flags remotas false; senhas são geradas por instância. O snapshot não substitui backup de estado de uma transação ou resultados nativos.

Reset do ensaio: parar SOMENTE o processo cujo listener seja3009; mover `.demo-data/execution.json` para backup com nome único; iniciar o laboratório; sessão começa com histórico fictício EQ-DEMO-0901. Nova sessão preserva estado e não é reset. Não alterar rafael.json, senha, .env ou backups do baseline. Se só quiser continuidade, o laboratório recupera o pedido relevante pela consulta do executor mock; ambiguidade exige escolha do pedido.

Após futura autorização remota, rollback local não remove transcrições, perfis ou resultados Twilio: desligar ingestão/flags/túnel de teste, manter controle dos IDs exclusivos e solicitar instrução específica antes de apagar recursos remotos. Custos já incorridos não são revertidos.
