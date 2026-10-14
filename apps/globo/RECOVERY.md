# Recuperação da versão funcional Globo

Snapshot criado em 13/10/2026 antes desta auditoria:

`apps/globo/.demo-data/recovery/globo-functional-20261013.tar.gz`

Manifest e checksums: `apps/globo/.demo-data/recovery/manifest.json`.

O arquivo foi extraído em diretório separado, 53 checksums de arquivos passaram e 48/48 testes Globo passaram na cópia restaurada. O teste usou as dependências já instaladas; não comprova uma instalação limpa ou disponibilidade futura do registry npm. Este ponto de recuperação é local e ignorado pelo Git. Não substitui backup externo do MacBook.

Conteúdo: código e build Globo, `.env.example` público, package manifests/lock e configuração de testes do workspace. Excluídos: segredos, `.env.local`, senha do painel, memória/transcrições de runtime, `node_modules` e histórico Git. O `.env` existente da raiz permanece no local original, fora do pacote.

## Procedimento

1. Encerrar apenas o backend Globo, após confirmar que a porta 3007 pertence ao processo Globo. Preservar os outros projetos e túneis.
2. Extrair o arquivo em diretório separado e verificar checksums do manifest.
3. Fazer backup da pasta Globo atual e restaurar `apps/globo` a partir da cópia verificada. Os arquivos de credenciais existentes permanecem separados.
4. Usar os manifests do snapshot para conferir versões. Restaurar o lockfile somente após verificar compatibilidade com os demais workspaces; a auditoria não alterou dependências ou código executável.
5. Reaplicar os overrides públicos a partir de `.env.example`, mantendo a voz `5p4THmLc2S6kXKO1pOM5-1.06_0.5_0.8`. Manter autorização de chamadas desligada.
6. Executar os testes Globo e build; iniciar o backend e abrir o painel local. A recuperação sem dados de runtime inicia Rafael com 10 dias. Conferir política fictícia e fontes antes de usar ngrok.
7. Validar o túnel com `npm run verify:tunnel -w apps/globo`. Uma ligação adicional exige autorização específica, como antes.

```sh
npm run test -w apps/globo
npm run build -w apps/globo
npm run start -w apps/globo
```

Para contingência de rede/modelo: iniciar com `GLOBO_AI_ENABLED=false`; o roteiro local é identificado na interface. Recuperação de runtime é separada da recuperação de código: “Nova sessão” retém memória; preparar 10 dias exige parar o backend e mover o arquivo de memória fictícia para um backup com nome único antes de reiniciar.
