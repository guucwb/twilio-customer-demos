# SECURITY — Flash Analytics (threat model curto)

**Ativo protegido:** métricas operacionais e históricas de cada banco (filas, volumes, tempos, agentes, tickets).
**Fronteira de confiança:** o navegador (plugin Flex) **não** é confiável. A autorização acontece no `analytics-backend`.

## Princípios

1. **Deny-by-default:** sem vínculo RBAC, ou sem role Flex `admin`/`supervisor`, a resposta é 403.
2. **Escopo resolvido no servidor** a partir da identidade verificada. `bankId` na query é apenas um *filtro solicitado* dentro do escopo; `queueSid`, `role` e `userId` são rejeitados (400). Claims extras no token (ex.: `banks`) são ignorados.
3. **Mesma resposta** para banco inexistente e banco fora do escopo (403 `forbidden`), sem oráculo de enumeração.
4. **Sem fallback:** falha upstream retorna 502 sem dados. A UI limpa os dados exibidos e descarta respostas atrasadas de outro perfil (contador de geração).
5. **Segredos só no servidor:** API Key/Auth Token nunca vão para o bundle, os logs ou o git (`.env` e `*.local.json` estão no `.gitignore`).

## Ameaças e mitigações

| Ameaça | Exemplo | Mitigação na PoC | Pendente para produção |
|---|---|---|---|
| **IDOR / acesso cruzado** | Supervisor Itaú chama `/queues?bankId=santander` | `resolveScope` no backend → 403; testado via HTTP real | Pentest com tokens reais |
| **Parâmetros de escopo forjados** | `?queueSid=WQ…`, `?role=flash_admin`, claim `banks` | Allowlist de parâmetros (400); claims ignorados; RBAC no servidor | — |
| **Drill-down** | `/queues/CX_SANTANDER` | Fila precisa estar no conjunto visível do principal | Aplicar a qualquer endpoint novo (detalhe de Task, gravação, transcrição) |
| **Export** | CSV de outro banco | Mesmo `resolveScope` + filtro defensivo de linhas; CSV com proteção contra injeção de fórmula | Watermark/auditoria por arquivo |
| **Paginação / busca** | Paginar além do escopo | Endpoints atuais não paginam; filtro por banco antes de qualquer corte | Paginação sempre *após* aplicar o escopo |
| **Tokens** | Token adulterado/expirado/`alg:none` | HS256 com `timingSafeEqual`, `exp`/`nbf`/`iss`/`aud`; modo demo proibido com `NODE_ENV=production` | `AUTH_MODE=flex` (Twilio IAM / `twilio-flex-token-validator`), TTL curto, CORS restrito |
| **Credenciais Twilio** | Auth Token no front | Backend usa API Key; nada no `.env` do plugin | API Key dedicada de privilégio mínimo; rotação; secret manager |
| **Fila CQ compartilhada** | Agregado de fila mistura bancos | Supervisores não recebem a fila; admin recebe com `bankId:null` e alerta, **sem número por banco** | Filas CQ segregadas **ou** pipeline por Task com `bank_id` confiável |
| **Headcount enganoso** | Somar elegíveis de várias filas como pessoas | Headcount único (união de Workers) separado da soma de elegibilidades | — |
| **Vazamento lateral de elegibilidade** | Supervisor Itaú vê que o agente também atende Santander | Elegibilidade filtrada às filas do escopo | Revisar nomes de agentes visíveis a supervisores externos |
| **`bank_id` não confiável** | Atributo alterado no navegador/Worker | `bank_id` definido pela integração; transferência bloqueia divergência de origem | Validar origem em JALL/URA; não usar Worker attributes editáveis como fonte de RBAC |
| **Cache cruzado** | Resposta de admin servida a supervisor | Cache só por **Queue SID** (dado bruto), a montagem do escopo acontece por request; `Cache-Control: no-store` | Idem se houver CDN/proxy |
| **Logs** | E-mail/PII em log | Auditoria com hash da identidade; sem tokens nos logs | Retenção e acesso controlado aos logs |

## Recursos exclusivos de demo (desligar em produção)

- **"Ver como" (`X-Flash-View-As`, `DEMO_VIEW_AS=true`):** só é aceito de um `flash_admin` com token verificado, e o escopo resultante é a **interseção** do perfil demo com o escopo do admin, ou seja, nunca amplia. Supervisor tentando usar: 403. Desligado por padrão: 400. Fica registrado na auditoria (`viewAs`).
- **Verificador composto:** com `DEMO_JWT_SECRET` definido em `AUTH_MODE=flex`, o backend também aceita tokens demo assinados localmente (`iss=flash-analytics-demo`). Isso serve para os scripts de teste contra o backend real. Um token com esse issuer e assinatura errada é rejeitado e não cai no IAM. **Em produção, não definir `DEMO_JWT_SECRET`.**
- **API Key:** a demo usa a API Key do perfil do CLI. Em produção, use uma API Key dedicada e de privilégio mínimo (TaskRouter read + validação de token), guardada só no backend/Functions.

## Arquitetura A não é fronteira de segurança

`Flex.QueuesStats.setFilter` e `setSubscriptionFilter` rodam no navegador. Eles **não** mudam o que as APIs retornam, e a própria doc Twilio avisa que não ajustam os totais globais de agentes. Um supervisor com role nativa de Flex ainda pode alcançar dados de outros bancos por estes caminhos, entre outros:

- Real-Time Queues View e Teams View sem o plugin (outro navegador, plugin desabilitado, DevTools);
- Flex Insights (dashboards, Analyze, Export, conversas e gravações) conforme as roles de Insights;
- Supervisão de Tasks/conversas, monitoramento de chamadas, transcrições e gravações;
- Token Flex/TaskRouter do supervisor usado diretamente contra o SDK/APIs do Workspace;
- Deep links para Tasks/Workers e outros plugins instalados.

**Para isolamento rígido** (ex.: supervisor externo de um banco), esse usuário não deve ter role nativa de supervisor com escopo de Workspace. Ele deve consumir apenas o dashboard B, por meio de uma role restrita/customizada ou de um portal fora do Flex, e o acesso ao Insights deve ser removido ou restringido. Isso exige decisão sobre Roles/SSO e **não foi aplicado**.

## Testes manuais obrigatórios no Flex

Executar numa conta não produtiva, com usuários SSO reais de cada perfil:

1. Login como supervisor Itaú: a SideNav mostra Flash Analytics; o dashboard só tem Itaú.
2. No DevTools do mesmo usuário, chamar o backend com `?bankId=santander`, `/queues/CX_SANTANDER` e `export.csv?bankId=caixa`: esperado 403.
3. Desabilitar o plugin (ou usar outro navegador) e abrir Real-Time Queues View e Teams View: registrar o que fica visível de outros bancos.
4. Abrir Flex Insights com o mesmo usuário: registrar dashboards, conversas e gravações acessíveis.
5. Com o token do supervisor, usar o SDK TaskRouter/Flex no console para listar filas e Workers do Workspace: registrar o resultado.
6. Tentar abrir deep links de Tasks/Workers de outro banco.
7. Usuário sem claim de banco: dashboard com 403 e filtro A sem filas.
8. Expirar ou revogar a sessão: o backend retorna 401.
9. Transferir uma Task CX_SANTANDER para CQ: ela precisa cair em CQ_SANTANDER, com `bank_id` preservado.

Os itens 3 a 6 tendem a mostrar acesso nativo amplo. É esse resultado que decide se a Arquitetura A basta (supervisão interna) ou se B mais restrição de roles é obrigatória (supervisão externa/isolamento rígido).
