# CarePlus | Portal do Beneficiário

Demo local de autenticação com **Twilio Verify**, interface em português e dados de beneficiário inteiramente fictícios. O número de celular informado para receber OTP é real; ele não é usado para preencher o cadastro fictício.

## Executar

Requisitos: Node.js 20.19+ e npm. Mantenha o arquivo `.env` existente na raiz. Não o substitua pelo exemplo.

```sh
npm install
npm run discover
TWILIO_AUTH_MODE=auth-token TWILIO_VERIFY_SERVICE_SID=VA_SUBSTITUA_PELO_SID_DO_SERVICO npm run dev
```

Abra **http://127.0.0.1:5173**. A API escuta somente em `127.0.0.1:3001`; o Vite encaminha `/api`. Use a mesma origem durante toda a apresentação. O SID do serviço é um identificador de recurso, não uma credencial. Pode ser passado no ambiente do processo, sem editar `.env`. Se você preferir persistir a seleção, configure `TWILIO_VERIFY_SERVICE_SID` manualmente no ambiente do backend e reinicie a API.

Sem serviço configurado, o portal abre com instruções de configuração e o envio fica bloqueado. O app nunca escolhe, cria ou altera um Verify Service automaticamente.

## Ambiente e descoberta

Na inicialização, antes de abrir a porta da API, o backend valida a conta autenticada e a propriedade do Verify Service selecionado. Erros de autenticação ou conta divergente interrompem a inicialização, sem fallback para outra credencial e sem logs de segredos. Ao trocar de conta, reinicie a API com o novo SID de serviço também no ambiente do processo.

O backend usa `dotenv` para carregar exclusivamente o `.env` da raiz. Variáveis do processo têm precedência. O frontend tem `envDir: false` e não importa a configuração do backend.

| Variável | Uso |
| --- | --- |
| `TWILIO_ACCOUNT_SID` | Conta Twilio |
| `EXPECTED_TWILIO_ACCOUNT_SID` | Verificação opcional de correspondência da conta |
| `TWILIO_AUTH_MODE` | `auth-token` por padrão; `api-key` somente por seleção explícita. Sem fallback automático. |
| `TWILIO_API_KEY_SID` + `TWILIO_API_KEY_SECRET` | Usadas somente no modo `api-key`; ambas são necessárias |
| `TWILIO_AUTH_TOKEN` | Usado no modo `auth-token`, mesmo se houver campos de API Key antigos |
| `TWILIO_VERIFY_SERVICE_SID` | Serviço explicitamente selecionado para esta demo |

`.env.example` contém apenas nomes vazios. As outras variáveis preexistentes não são necessárias. Números de Programmable Messaging/Voice e `TWILIO_WHATSAPP_FROM` não substituem a configuração de canais do Verify Service.

`npm run discover` valida primeiro a identidade da conta e faz consultas GET aos serviços usando o mecanismo explicitamente selecionado, e imprime uma lista permitida de metadados não secretos: SID, nome, tamanho do código e presença de configuração WhatsApp/TOTP. Não imprime objetos completos da SDK, erros brutos ou credenciais. A lista é limitada a 100 serviços e sinaliza possível truncamento.

Na inspeção deste workspace foi encontrado **um serviço, `verify-otp`, com seis dígitos, remetente WhatsApp configurado e configuração TOTP presente**. Nenhum serviço foi criado ou modificado. Sua leitura funcionou usando API Key. Isso não comprova as permissões de escrita da chave nem entrega de mensagens.

## Canais e provisionamento

| Capacidade | Comportamento |
| --- | --- |
| WhatsApp OTP | Habilitado para tentativa quando há configuração de remetente no serviço. Aprovação do remetente/template e entrega precisam ser validadas no primeiro envio real. |
| SMS OTP | Habilitado para tentativa quando o serviço está acessível e usa seis dígitos. Conta, saldo, permissões geográficas e destino ainda podem impedir envio. |
| Voice OTP | Oculto e rejeitado pelo backend: a API de metadados consultada não confirma habilitação de voz. TTS/DTMF não são tratados como prova. |
| TOTP | Integração real de cadastro, ativação e Challenge. Permissão de criação será confirmada quando o usuário cadastrar o autenticador. |
| Passkeys | Indisponível na demo, com provisionamento **não confirmado**. Não há WebAuthn local, detecção fictícia ou afirmação de indisponibilidade definitiva da conta. Investigação adicional fica para depois da validação real de P0–P4. |
| Push / Silent Device Approval / SNA | Não implementados; somente discussão durante a apresentação. |

Se precisar ajustar a conta manualmente: selecione um Verify Service de demonstração com `Code Length = 6`, configure o remetente WhatsApp no serviço, verifique acesso a SMS no Brasil e permissões da API Key para Verify Services, Verifications, Verification Checks, Factors e Challenges. Contas trial podem exigir validação prévia do número destinatário. Use o Console para investigar o código de erro retornado; a demo não inventa decisões de Fraud Guard ou dados de entrega.

## Primeiro teste real

1. Com a aplicação aberta e o serviço selecionado, informe **seu** celular em E.164, por exemplo no formato `+55DD9XXXXXXXX`.
2. Escolha **WhatsApp** e clique **Receber código**. Esse clique faz uma chamada real e pode gerar cobrança Twilio.
3. Digite o código recebido. Somente `status = approved` abre o portal.
4. Para testar fallback, inicie outro acesso com **Resetar demo**, solicite WhatsApp e aguarde o intervalo de 30 segundos. Antes de validar, clique **Não recebeu? Enviar por SMS**. Não é preciso provocar uma falha de entrega; explique que está demonstrando uma alternativa solicitada pelo usuário.
5. Após entrar, escolha **Alterar dados de reembolso**, cadastre o autenticador e escaneie o QR. Digite o código para ativar o Factor. Aguarde o próximo código e digite-o para gerar um Challenge separado. Somente um Challenge aprovado libera uma alteração fictícia.

Não envie OTPs ou QR codes no chat. Digite os códigos diretamente na aplicação. O QR contém material de cadastro TOTP e deve ser escaneado em particular antes de projetar o restante do fluxo.

## APIs Twilio

Base: `https://verify.twilio.com/v2`. Todas as chamadas saem do backend através da SDK `twilio`, com timeout de 15 segundos, logs desligados e sem retries automáticos.

| Ação | API efetivamente integrada |
| --- | --- |
| Descoberta | `GET /Services` |
| Capabilities | `GET /Services/{ServiceSid}` (cache de 30 segundos) |
| OTP / fallback | `POST /Services/{ServiceSid}/Verifications` com `To`, `Channel=whatsapp` ou `sms`, `Locale=en` para WhatsApp e `pt-BR` para SMS |
| Verificar OTP | `POST /Services/{ServiceSid}/VerificationCheck` com `VerificationSid` controlado pelo servidor e `Code` |
| Cadastrar TOTP | `POST /Services/{ServiceSid}/Entities/{Identity}/Factors` via `newFactors.create`, `FactorType=totp`, seis dígitos e período de 30 segundos |
| Ativar TOTP | `POST /Services/{ServiceSid}/Entities/{Identity}/Factors/{FactorSid}` com `AuthPayload` |
| Step-up | `POST /Services/{ServiceSid}/Entities/{Identity}/Challenges` com `FactorSid` e `AuthPayload`; exige `status=approved` |

A criação de um Factor pode criar a Entity associada automaticamente. Isso só acontece quando o usuário aciona o cadastro do autenticador. A identidade é aleatória, sem telefone ou dados pessoais. Não há endpoint para criar/excluir serviços nem limpeza automática de recursos da conta.

Até a entrega inicial, as chamadas reais executadas foram **apenas leitura de serviços**. Os POSTs estão implementados e cobertos por testes com dublês isolados; sua validação real requer o celular/autenticador do apresentador.

Referências oficiais: [Verify WhatsApp](https://www.twilio.com/docs/verify/whatsapp), [Verifications](https://www.twilio.com/docs/verify/api/verification), [TOTP quickstart](https://www.twilio.com/docs/verify/quickstarts/totp), [Challenges](https://www.twilio.com/docs/verify/api/challenge), [códigos de erro](https://www.twilio.com/docs/verify/api/error-codes).

## Sessões, reset e atividade

- Sessões de 30 minutos em memória, cookie opaco `HttpOnly`/`SameSite=Strict`, rotação após login, CSRF e validação de origem. HTTP é restrito ao loopback local; não publique este servidor como uma solução de produção.
- Nenhum sinal de aprovação do frontend autoriza acesso. Beneficiário só é retornado pelo backend após OTP aprovado. Reembolso exige step-up válido por dois minutos, consumido após uma única alteração.
- Dados de reembolso são escolhas fixas fictícias; a interface não coleta dados bancários reais.
- Intervalo mínimo de 30 segundos entre envios, limite local por telefone e intervalo entre tentativas de validação. Esses limites não substituem os controles Twilio.
- Enrollment TOTP fica em memória por até dez minutos. O QR é gerado localmente, nunca enviado a um serviço externo e nunca incluído nos logs/audit. Após ativação, o material de enrollment é descartado.
- **Resetar demo** limpa sessão, atividade e dados fictícios. Um Factor já ativado é reutilizado para o mesmo celular enquanto o processo da API continuar ativo. Reset não exclui recursos Twilio. Enrollment incompleto pode ser reiniciado, deixando o Factor anterior na conta.
- Reiniciar a API perde os vínculos locais com Factors; um novo cadastro cria uma nova identidade da demo. Recursos Twilio permanecem até gestão manual no Console/API. Não reinicie o backend no meio da apresentação se quiser reutilizar o autenticador.
- A atividade contém até 100 eventos desta sessão: horário, método solicitado, operação, status recebido, latência medida pelo backend e SID quando retornado. `pending` significa verificação pendente, **não entregue**. Em fallback, o método exibido é o último canal solicitado; ele não prova em qual canal o usuário leu o código.
- A gravação do reembolso fictício é identificada como evento local `Demo`; sua latência zero não representa uma chamada Twilio. Erros de rede não são classificados como decisões do provedor.

## Estrutura

```text
apps/web/src/App.tsx       Interface e estados de interação
apps/web/src/styles.css   Visual responsivo
apps/api/src/config.ts    Carregamento seguro do ambiente
apps/api/src/verify.ts    Integração Twilio e capabilities
apps/api/src/app.ts       Sessões, autorização e rotas
apps/api/src/errors.ts    Erros sanitizados em português
apps/api/src/discover.ts  Inspeção somente leitura
```

Sem banco, Redis, Docker, framework externo de autenticação ou persistência de beneficiários. Não existe modo mock selecionável na aplicação. Dublês de provedor existem somente nos testes.

## Validação

```sh
npm run lint
npm run typecheck
npm test
npm run build
# Com a demo em execução:
npm run smoke
```

Os testes verificam autorização, CSRF, entrada inválida, fallback, falhas de provedor, sanitização, cadastro TOTP, Challenge separado, expiração, uso único e reset. Não enviam mensagens, não criam Factors reais e não leem `.env`. A checagem smoke exercita a aplicação local sem enviar OTP.

O workspace inicial não continha testes. Lint, typecheck, testes e build foram executados. A verificação HTTP da interface e a leitura real de capabilities funcionaram. A inspeção visual por navegador ficou bloqueada pelas permissões de controle do computador; responsividade, aparência no projetor e fluxo completo com celular ainda precisam de conferência humana. A aprovação real OTP/TOTP não é alegada como concluída.

## Demo Script

Roteiro de aproximadamente **9 minutos**. Antes da reunião, valide o número destinatário e a entrega dos dois canais, configure o autenticador em particular e mantenha a API em execução. Se quiser demonstrar enrollment ao vivo, evite projetar o QR para terceiros.

| Tempo | Ação e narrativa |
| --- | --- |
| 0:00–1:30 | **Login WhatsApp:** apresente o portal, informe seu celular e solicite o código. Mostre que a sessão só se abre após aprovação real. Explique que todo o cadastro do beneficiário é fictício. |
| 1:30–3:00 | **SMS fallback:** resete, solicite WhatsApp novamente e espere o intervalo mínimo. Clique “Não recebeu? Enviar por SMS” antes de validar o código. Explique que é fallback manual real, não simulação nem prova de falha do WhatsApp. Entre com o código recebido. |
| 3:00–4:00 | **Portal:** mostre carteirinha, reembolso em análise e dados pessoais fictícios. Diferencie conveniência de acesso e proteção de alterações sensíveis. |
| 4:00–5:00 | **Operação sensível:** clique “Alterar dados de reembolso”. Mostre que uma sessão autenticada ainda precisa confirmar essa operação. |
| 5:00–7:00 | **TOTP:** se necessário, cadastre o aplicativo pelo QR e ative o Factor. Aguarde o próximo código. Envie o código para criar um Challenge real e, após aprovação, salve uma conta fictícia. Explique validade curta e uso único da autorização. |
| 7:00–8:00 | **Atividade:** examine eventos desta sessão, status, latência e SIDs de Verification, Factor e Challenge. Deixe claro que não são logs globais da conta nem telemetria de entrega/Fraud Guard. |
| 8:00–9:00 | **Discussão opcional:** Passkeys dependem de confirmar acesso ao Twilio Verify e serão avaliadas após os fluxos centrais. Push/Silent Device Approval e SNA são próximos tópicos, não capacidades executadas nesta demo. Encerre com reset se necessário. |

Se um canal falhar, mantenha o erro real visível, use SMS quando possível e explique a configuração pendente. Não há bypass de autenticação para entrar no portal durante uma indisponibilidade.
