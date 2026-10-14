# Runbook — execução e validação

Este guia descreve comandos disponíveis, não autoriza provisionamento, alterações remotas ou consumo. Nada abaixo foi executado no cenário oficial durante o handover. Não inicializar uma segunda instância nem apontar testes para um cenário preservado.

## 1. Pré-requisitos

- Node.js compatível com Vite: linha 20 a partir de 20.19, ou linha 22 a partir de 22.12; npm e lockfile do monorepo.
- ffmpeg e ffprobe para converter/verificar as respostas de áudio.
- ngrok já instalado e domínio HTTPS autorizado. Credencial fica na configuração privada da ferramenta, não no repo.
- Conta Twilio autorizada, sender WhatsApp elegível com Calling, Voice Application dedicada e acesso a Relay, Orchestrator, Memory e Intelligence v3.
- Verificação Meta, onboarding e termos AI/ML confirmados pessoalmente pelo responsável. Não aceitar termos em nome de outra pessoa.
- Credenciais OpenAI autorizadas para IA/STT fictícios; conta ElevenLabs com créditos e acesso à voz/modelo aprovados.
- Acesso privado ao ledger e aos recursos da demo, ou novo provisionamento planejado e autorizado. CLI Twilio é opcional para diagnóstico; não trocar seu perfil padrão.

**Configuração da cópia candidata à publicação:** conta, sender, domínio e referências de implantação são privados. Configurá-los não cria nem autoriza recursos. Em outra conta/domínio/sender, revisar os guards, manifest e permissões antes de executar. Os scripts `bind-target.mjs`, `messaging-target.mjs` e `classic-routing-target.mjs` podem modificar roteamento: não são um bootstrap genérico para outro SE.

## 2. Instalação

Na raiz do clone sanitizado de `origin/main`:

```sh
npm ci
npm run test:native -w apps/globo
npm run test -w apps/globo
npm run typecheck:native -w apps/globo
npm run build:native -w apps/globo
```

Os testes unitários/protocolo usam mocks; não comprovam chamada ou reprodução real. Instalação limpa depende do registry e não foi repetida neste handover. Não instalar dentro de cada workspace alterando o lockfile sem necessidade.

## 3. Configuração privada e variáveis

Editar localmente os arquivos ignorados. Nunca enviar tokens pelo chat, Git, screenshots ou logs. O `.env` global atende outras aplicações: não sobrescrevê-lo.

| Variável | Local / finalidade |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | `.env.local` Globo: conta alvo usada pelo backend nativo |
| `EXPECTED_TWILIO_ACCOUNT_SID` | `.env.local` Globo: guard independente de conta; deve corresponder à conta e ao ledger autorizado |
| `TWILIO_AUTH_TOKEN` | `.env.local` Globo: autenticação e validação das assinaturas Twilio; somente servidor |
| `GLOBO_WHATSAPP_SENDER` | `.env.local` Globo: endereço WhatsApp do sender aprovado; obrigatório no backend nativo |
| `GLOBO_WHATSAPP_SENDER_SID` | `.env.local` Globo: SID do sender para scripts administrativos, conferido com snapshot privado |
| `GLOBO_PREVIOUS_MESSAGING_SERVICE_SID` | `.env.local` Globo: serviço anterior, somente para migração/rollback revisados |
| `GLOBO_REVIEWED_AUDIO_MESSAGE_SIDS` | `.env.local` Globo: allowlist explícita de notas previamente revisadas; vazia por padrão |
| `GLOBO_REVIEWED_CONFIRMATION_MESSAGE_SID` | `.env.local` Globo: confirmação histórica revisada; ausente por padrão |
| `DEMO_CUSTOMER_WHATSAPP` | `.env.local` Globo, com fallback global: endereço técnico único permitido; não equivale a identidade corporativa |
| `OPENAI_API_KEY` | `.env` global existente: STT e composer operacional; somente servidor |
| `OPENAI_MODEL` | `.env` global: modelo padrão do adapter de texto |
| `GLOBO_OPENAI_MODEL` | `.env.local` Globo: override do modelo de texto |
| `GLOBO_AUDIO_MODEL` | `.env.local` Globo: modelo de transcrição de arquivos |
| `ELEVENLABS_API_KEY` | `.env.local` Globo, com fallback global: síntese direta de notas de voz |
| `GLOBO_PUBLIC_URL` | `.env.local` Globo: origem HTTPS do túnel autorizado, sem path ou token |
| `GLOBO_TTS_PROVIDER`, `GLOBO_TTS_LANGUAGE`, `GLOBO_TTS_VOICE` | Overrides aprovados da síntese **Relay**, preservando o identificador completo da voz |
| `GLOBO_STT_PROVIDER`, `GLOBO_STT_LANGUAGE`, `GLOBO_STT_MODEL` | Reconhecimento de fala **Relay**, separado do STT de arquivo |
| `GLOBO_AUDIO_TTS_ENABLED` | Habilitação da síntese direta de notas; desabilitar resulta em fallback textual, não mock nativo |
| `GLOBO_AUDIO_TTS_VOICE_ID`, `GLOBO_AUDIO_TTS_MODEL` | Voz e modelo ElevenLabs das notas |
| `GLOBO_AUDIO_TTS_STABILITY`, `GLOBO_AUDIO_TTS_SIMILARITY` | Parâmetros enviados pelo ramo aprovado de notas |
| `GLOBO_AUDIO_TTS_SPEED`, `GLOBO_AUDIO_TTS_STYLE` | Mantidos para configuração/rollback v2; o ramo `eleven_v4` não os envia à API |
| `GLOBO_AUDIO_MEDIA_TTL_SECONDS` | Validade da mídia de resposta assinada; não controla a retenção de toda a transcrição |
| `NODE_EXTRA_CA_CERTS` | CA administrativa já autorizada, se necessária; nunca desligar verificação TLS |
| `GLOBO_GATEWAY_PORT` | Override de porta do gateway, dependente de revisão das rotas/túnel/preflight |
| `GLOBO_AI_ENABLED`, `GLOBO_PANEL_PASSWORD`, `GLOBO_ALLOWED_CALL_SIDS` | Opções da variante RH anterior; não presumir o mesmo efeito no bootstrap nativo |
| `TWILIO_VOICE_NUMBER`, `DEMO_CUSTOMER_VOICE_PHONE`, `GLOBO_TEST_CALL_APPROVED` | Apenas testes PSTN/variante anterior autorizados; não necessários para o roteiro Calling inbound |

A senha do painel nativo é lida de `.demo-data/panel-password.txt`; não há substituição automática pelo override da variante antiga. O bootstrap nativo habilita o composer quando encontra a chave global, não pelo flag legado `GLOBO_AI_ENABLED`. A voz Relay do exemplo de ambiente tem um valor histórico; o preflight exige a configuração prevista pelo código. Obter a configuração de implantação do responsável por canal privado, sem alterar vozes para resolver outro problema.

Artefatos privados necessários:

| Artefato | Uso |
| --- | --- |
| `.demo-data/target-resources.json` | Conta, sender/App, Intelligence e operadores autorizados; ledger de provisionamento |
| `.demo-data/<novo-cenario>-resources.json` | IDs e resultado da criação dedicada daquele cenário |
| `.demo-data/active-scenario.json` | Seletor local de Store/perfil/Orchestrator |
| `.demo-data/panel-password.txt` | Senha do painel público |
| `.demo-data/<conta>/scenarios/<cenario>/` | Estado e evidências daquele cenário, sem reutilizar os arquivos do oficial |

Um clone sem esse pacote privado falha intencionalmente. Não criar IDs inventados, copiar um token para templates, transformar referências de `.json` propostas em recursos “validados” ou compartilhar o pacote por GitHub. Para usar os recursos existentes, o proprietário precisa liberar acesso nominal e revisar a transferência dos artefatos. Para outra conta, desenhar o novo bootstrap antes de usar os scripts específicos.

## 4. Serviços e túnel

Primeiro conferir processos nas portas 3007, 3010 e a configuração atual do ngrok, sem encerrá-los. Inicialização futura autorizada, em terminais separados:

```sh
npm run start:gateway -w apps/globo
npm run start:native -w apps/globo
```

Alternativa disponível: `npm run start:all -w apps/globo`. O gateway também serve rotas da variante anterior. Encerrar somente o processo que foi identificado e autorizado; não usar `killall node`.

Túnel, apenas se não existir outro consumidor e houver autorização:

```sh
ngrok http http://127.0.0.1:3007 --url "$GLOBO_PUBLIC_URL"
```

O shell precisa receber a origem HTTPS autorizada; uma variável no `.env.local` não é exportada automaticamente ao terminal. Não reconfigurar o domínio existente nem imprimir sua credencial. O wrapper `start-native.mjs` utiliza somente a CA local já existente, se houver. Startup autentica APIs e pode fazer Recall nativo do cenário selecionado; **não é o preflight de leitura**.

Painel local: `http://127.0.0.1:3007/globo/native/?presentation=1`. Painel público: origem configurada + `/globo/native/?presentation=1`, com Basic Auth. A exceção local exige host/peer de loopback sem cabeçalhos de forwarding. Nunca enviar senha na URL.

## 5. Rotas remotas

Conferir os bindings existentes em leitura antes de mudar qualquer recurso. Roteamento da variante nativa:

| Recurso | Método / path na origem configurada |
| --- | --- |
| Sender WhatsApp Messaging | POST `/globo/native/whatsapp` |
| Voice Application do sender Calling | POST `/globo/native/voice` |
| Callback de status, quando configurado | POST `/globo/native/status` |
| Finalização de Connect | POST `/globo/native/voice/end` |
| Conversation Relay | WSS `/globo/native/relay`, emitido no TwiML |
| Resultados Intelligence, endpoint disponível | POST `/globo/native/intelligence/events`, com assinatura/body hash; presença da rota não comprova webhook remoto configurado |
| Busca de mídia assinada pela Twilio | GET `/globo/native/voice-notes/<id>.ogg`, URL efêmera; não versionar a URL completa |

Voice Application deve ser dedicada e ligada exclusivamente ao sender autorizado. O TwiML deve apontar `conversationConfiguration` ao cenário selecionado; não trocar para `intelligenceService` Classic. Assinatura usa a URL externa exata: divergência de origem/path ou Auth Token de outra conta causa rejeição. O endpoint de Calling não autoriza automaticamente qualquer From.

## 6. Preflight

```sh
npm run preflight:globo -w apps/globo
npm run --silent preflight:globo -w apps/globo -- --json
```

Exit 0: PRONTO; 2: ATENÇÃO; 1: BLOQUEADO. Código 2 também faz npm imprimir mensagem de lifecycle; não significa crash. O comando usa arquivos, TCP local e GET de metadados/configurações. Não faz Recall, síntese, inferência, chamadas, mensagens ou execução de operadores.

Em cenário novo, avisos de evidências prévias ausentes são esperados e devem ser apresentados como tal. Outros avisos/falhas não devem ser ignorados. Pré-condições e modelos acessíveis não comprovam nova execução, elegibilidade futura ou capacidade de inferência. O preflight também tem referências específicas ao ambiente autorizado.

## 7. Novo cenário isolado

Não executar esta seção agora no ambiente oficial. Solicitar autorização para o consumo e para recursos **novos**, sem mudar o sender ou operadores existentes. Nome exclusivo, iniciando com `gustavo-`, com no máximo 32 caracteres para atender ao `displayName` do Orchestrator. Não reutilizar os nomes dos cenários anteriores.

Exemplo fictício de execução futura, na raiz, com recursos/credenciais aprovados:

```sh
node --import tsx apps/globo/scripts/prepare-gustavo.ts gustavo-novo-demo
node apps/globo/scripts/scenario.mjs activate gustavo-novo-demo
```

`prepare-gustavo` cria Store, schemas, perfil e identificadores phone/whatsapp, além de Orchestrator dedicado. Reutiliza Intelligence do ledger sem mudar seus operadores. Se a rede exigir CA administrativa, passar `NODE_EXTRA_CA_CERTS` somente ao processo. Nome do exemplo não é reserva de recurso nem convite para executá-lo neste handover.

Antes de ativar, conferir `prepared`, conta, Store/perfil e canais/vínculos. O script de seleção verifica ociosidade; depois recarregar **somente** o serviço nativo autorizado. Confirmar zero pedidos, ledger de mensagens vazio, nenhuma chamada, ausência de ponteiro de férias e zero Conversations **da configuração nova**. Não assumir que filtros remotos eliminam todos os registros de outras configurações; conferir o ID exato e paginação.

O pedido pode ter o mesmo rótulo demonstrativo de outro cenário; o isolamento é pelo diretório, configuração e perfil, não só pelo texto do protocolo. Nunca sobrepor local 4 a um pedido anterior em 5. Criar outra configuração é diferente de limpar uma sessão do agente.

## 8. Jornada e aceite real

No cenário novo, participante autorizado, dados fictícios:

1. Nota de férias: mês desejado e datas indefinidas. Ouvir pergunta sobre início/fim, sem aprovação.
2. Nota com quantidade, item, estúdio e prazo declarado. Exemplo: dois kits completos ou três microfones individuais; não misturar as unidades. Informar compatibilidade fictícia quando faltante.
3. Confirmar abertura após ouvir a pergunta. Conferir protocolo, dono, versão e apenas uma criação no adapter **simulado**.
4. Pela chamada WhatsApp, pedir mudança de estúdio. Confirmar com “sim”, “confirmo”, “pode atualizar” ou “sim, eu confirmo”. Conferir mesmo ID, versão incrementada uma vez e local efetivamente atualizado.
5. Na mesma chamada, retomar férias. Conferir orientação a partir de Recall, sem transportar contexto RH para ferramentas de equipamentos.
6. Encerrar e aguardar ciclo de vida/processamento de Intelligence. Recarregar painel e expandir evidências. Não interpretar ausência de resultado como erro nem preencher com fixture.

Meta de cinco minutos é um roteiro, não SLA nem duração garantida. Pausas de STT/TTS, rede e processamento assíncrono podem exigir contingência.

## 9. Como comprovar cada integração

| Integração | Evidência necessária |
| --- | --- |
| Messaging/STT | Message/Media reais autorizados, transcript, hash, Communication nativa e estágio terminal |
| Resposta em áudio | TTS configurado, mídia enviada, status delivered/read e confirmação humana de reprodução |
| Calling/Relay | Call SID real, assinatura, nonce, Relay Session, prompts/text e encerramento; HTTP 200 não basta |
| Memory entre sessões | Agente/processo novo sem histórico local, Recall com Communication de origem, perfil/autor/canal corretos e fato recuperado |
| Orchestrator | Configuração do cenário, participantes/perfil, Communications reais e associação ao canal; uma chamada pode ter vários segmentos |
| Intelligence | IDs nativos de Operator Results, configuração/operadores corretos, input real e citações correspondentes; resultados rejeitados continuam separados |
| Pedido | Evento confirmado no executor mock, ID, versão e histórico; não comprova execução ServiceNow |

`prove-gustavo-recall.ts` faz Recall e grava evidência privada; não é GET-only e **não deve rodar no cenário oficial nesta etapa**. Em teste novo autorizado, o script permite conferir processo independente. Resultados históricos autorizados, quando disponíveis, não precisam ser reprocessados: o painel atual faz consulta GET com throttle e o botão de atualização não enfileira operadores.

## 10. Troubleshooting conhecido

| Sintoma | Causa comprovada / próximo passo seguro |
| --- | --- |
| `failed` com processamento aparentemente eterno | Erro terminal de STT/TTS/envio não é interação pendente. Ver estágio/código seguro. UI atual distingue falha e fallback; não repetir automaticamente processamento cobrado |
| Agente pede campos já informados | Bug corrigido de prioridade/mesclagem. Comparar transcript, operação e rascunhos antes/depois. Distinguir unidades de kits |
| “Sim, eu confirmo” cai em resposta genérica | Bug de normalização corrigido; conferir transcrição exata e ação pendente. Sem pendência, nenhuma alteração deve ocorrer |
| Studio 5 não atualiza | Conferir STT, entidade/local, versão esperada e resultado do adapter. Normalização suporta estúdio/Studio e números por extenso; fala ambígua continua exigindo esclarecimento |
| 409 no Orchestrator | Não criar outra conversa agrupada enquanto a existente está ACTIVE/INACTIVE. Código reutiliza/re-descobre por configuração, perfil e endereços; nunca fechar/deletar conversa compartilhada para contornar |
| Nota encaminhada ao Studio antigo | Dependência histórica de Conversations clássico/participante/pool. Foi tratada no sender autorizado; não generalizar a remoção a outras contas ou participantes |
| Insights ausentes, apesar de Operator Results | Coletor antigo rejeitava lote por uma citação; descoberta encerrava cedo; polling era cache-only. Versão atual preserva válidos, separa citação inválida e correlaciona segmentos por Call SID |
| Impacto operacional “Ainda não extraído” | Regra de impacto é on-demand. O botão atual não executa essa regra. Ausência deve ser preservada; um processamento pontual requer revisão/consumo autorizado, sem reprocessamento em massa |
| Prazo de RH aparece como urgência operacional | Resultado nativo pode ser semanticamente errado. Preservar origem e não usá-lo como sinal de equipamentos; revisar desenho do operador com autorização, não editar evidência |
| Evidência/página truncada | Coletor falha fechado quando há paginação; não declarar recuperação completa. Suporte a paginação é evolução técnica pendente |
| ElevenLabs rejeita acesso/síntese | Conferir status seguro, créditos, plano, acesso à voz/modelo e parâmetros. Não contratar plano ou alterar Calling para resolver notas |
| 401/403 ou erro TLS | Credencial/conta, URL pública, assinatura, Origin e CA autorizada. Não remover proteção nem usar `NODE_TLS_REJECT_UNAUTHORIZED=0` |
| Arquivos de recursos ausentes em clone | Pacote privado não é versionado. Obter do responsável ou planejar provisionamento dedicado; não inventar IDs |

Contingência: verificar GET/preflight e evidências já existentes sem iniciar novas interações. Se serviços/inferência falharem, apresentar arquitetura e resultados anteriores claramente datados. Não apresentar gravação ou fixture como nova execução. A variante antiga offline é outra experiência, não Memory/Intelligence nativo.
