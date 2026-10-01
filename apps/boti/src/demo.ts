export type Scenario = 'customer' | 'franchise';
export type View = Scenario | 'insights';
export type Analysis = { intent: string; sentiment: string; summary: string; response: string; handoff: string };
export type Message = { role: 'customer' | 'agent'; text: string; time: string };
export type CaseState = { messages: Message[]; events: string[]; pickup: boolean; resolved: boolean; guidance: boolean; incident: boolean; escalated: boolean; analysis: Analysis };
export type DemoState = Record<Scenario, CaseState> & { signals: string[] };
export const customerMessage = 'Oi! Comprei um presente para amanhã e meu pedido ainda não chegou. Vocês conseguem me ajudar?';
export const franchiseMessage = 'A campanha de lançamento está ativa, mas o desconto não está entrando no PDV. Já tivemos algumas vendas afetadas.';
export const pickupResponse = 'Marina, entendo como esse presente é importante para amanhã. Encontrei o kit disponível na loja Curitiba Batel, a 1,2 km de você. Podemos seguir com a retirada hoje, sem custo adicional. Essa alternativa funciona para você?';
export const guidanceResponse = 'Ricardo, vamos verificar a campanha Primavera em Flor: confirme a versão 24.09 do PDV, sincronize a tabela promocional e simule o kit elegível sem concluir a venda. Se o desconto não aparecer, envie o código do PDV e o horário da tentativa. Não altere preços manualmente; vamos preservar os registros das vendas afetadas.';
export const defaults: Record<Scenario, Analysis> = {
 customer: {intent:'Entrega atrasada / presente urgente',sentiment:'Frustrada · urgência detectada',summary:'Cliente comprou um presente para entrega antes de amanhã. Pedido está atrasado. Já consultou o status anteriormente. Existe disponibilidade do item em loja próxima.',response:'Marina, sinto muito pelo atraso. Já tenho o contexto do pedido BOT-84219 e vou te ajudar a encontrar uma alternativa para o presente chegar a tempo.',handoff:'Marina Oliveira · pedido BOT-84219 atrasado; presente para amanhã. Consulta anterior por chat. Kit disponível na loja Curitiba Batel, a 1,2 km. Oferecer retirada e aguardar aceite.'},
 franchise: {intent:'PDV / campanha promocional',sentiment:'Preocupado · impacto em vendas',summary:'Ricardo relata campanha ativa sem desconto no PDV da loja BOT-PR-0142. O cenário registra 12 transações afetadas e R$ 2.340 em vendas potencialmente impactadas. Encaminhar para Franquias > Sistemas / PDV.',response:'Ricardo, entendi o impacto nas vendas da Curitiba Batel. Vou conduzir a verificação da campanha e manter os registros neste atendimento para o time de Sistemas / PDV.',handoff:'Loja O Boticário — Curitiba Batel · BOT-PR-0142 · Ricardo Almeida. Campanha Primavera em Flor ativa; desconto não aplicado no PDV. 12 transações / R$ 2.340 potencialmente impactados. Encaminhamento: Franquias > Sistemas / PDV. Validar versão, sincronização e regra promocional. Resultados do diagnóstico ainda não confirmados.'}
};
export function initialState(): DemoState {
 const make = (s: Scenario): CaseState => ({messages:[{role:'customer',text:s==='customer'?customerMessage:franchiseMessage,time:'10:42'}],events:s==='customer'?['Hoje, 10:42 · Conversa retomada no WhatsApp; contexto preservado.','Ontem, 16:20 · Consulta sobre entrega no chat do site.','25 set. · Pedido BOT-84219 aprovado.']:['Hoje, 10:42 · Identificado suporte a franqueado; fila Sistemas / PDV.','Hoje, 09:00 · Campanha Primavera em Flor ativada.','22 set. · Incidente de sincronização resolvido.'],pickup:false,resolved:false,guidance:false,incident:false,escalated:false,analysis:{...defaults[s]}});
 return {customer:make('customer'),franchise:make('franchise'),signals:[]};
}
export type Action = {type:'reset'} | {type:'signal';id:string} | {type:'analysis';scenario:Scenario;analysis:Analysis} | {type:'send';scenario:Scenario;text:string} | {type:'pickup'|'resolve'|'guidance'|'incident'|'escalate'};
export function reducer(state:DemoState, action:Action): DemoState {
 if(action.type==='reset') return initialState();
 if(action.type==='signal') return state.signals.includes(action.id)?state:{...state,signals:[...state.signals,action.id]};
 const scenario:Scenario = 'scenario' in action?action.scenario:action.type==='pickup'||action.type==='resolve'?'customer':'franchise';
 const c={...state[scenario],messages:[...state[scenario].messages],events:[...state[scenario].events]};
 const add=(text:string)=>c.messages.push({role:'agent',text,time:'Agora'});
 const event=(text:string)=>c.events.unshift('Agora · '+text);
 switch(action.type){
 case 'analysis': c.analysis=action.analysis; break;
 case 'send': if(!action.text.trim()||c.resolved) return state; add(action.text.trim()); event('Resposta do agente adicionada à conversa.'); break;
 case 'pickup': if(c.pickup) return state; c.pickup=true; add(pickupResponse);event('Retirada em Curitiba Batel oferecida; aguardando aceite.');break;
 case 'resolve': if(!c.pickup||c.resolved) return state; c.resolved=true;c.messages.push({role:'customer',text:'Sim, consigo retirar hoje! Muito obrigada por resolver sem eu precisar explicar tudo de novo.',time:'Agora'});add('Combinado, Marina! Na nossa simulação, seu kit fica reservado na Curitiba Batel para retirada hoje até as 20h. Seu atendimento continua por aqui, se precisar.');event('Aceite simulado; retirada combinada e caso resolvido no mesmo atendimento.');break;
 case 'guidance': if(c.guidance) return state; c.guidance=true;add(guidanceResponse);event('Orientação diagnóstica enviada; aguardando resultado da loja.');break;
 case 'incident': if(c.incident) return state;c.incident=true;event('Incidente N2 INC-0142 criado com conversa e contexto anexados.');break;
 case 'escalate': if(c.escalated) return state;c.incident=true;c.escalated=true;add('Ricardo, encaminhei o incidente INC-0142 para Sistemas / PDV com prioridade crítica. O time recebe a conversa e o contexto das 12 transações afetadas. Seguimos por aqui; a meta de retorno deste cenário é de 15 minutos.');event('Prioridade crítica · INC-0142 encaminhado ao N2; contexto preservado.');break;
 }
 if(c.resolved)c.analysis={...c.analysis,sentiment:'Aliviada · solução aceita',summary:'Marina aceitou a retirada do presente na Curitiba Batel, hoje até 20h. O caso foi resolvido no mesmo atendimento, com histórico preservado. Aceite e reserva simulados.',response:'Marina, a retirada está combinada neste cenário. Seguimos à disposição por esta mesma conversa.'};
 else if(c.pickup)c.analysis={...c.analysis,summary:'Retirada em Curitiba Batel oferecida para o pedido BOT-84219. O presente está disponível no cenário; aguardando aceite de Marina para combinar a retirada.',response:'Marina, a alternativa de retirada hoje funciona para você?'};
 if(c.escalated)c.analysis={...c.analysis,summary:'INC-0142 escalado com prioridade crítica para Sistemas / PDV. Contexto de 12 transações e histórico preservados. Meta de retorno: 15 minutos; diagnóstico da loja ainda não confirmado.'};
 return {...state,[scenario]:c};
}
export function handoff(c:CaseState):string {return `${c.analysis.handoff}\n${c.guidance?'Orientação enviada; resultados aguardando confirmação.':'Orientação ainda não enviada.'} ${c.incident?'Incidente INC-0142 aberto.':''} ${c.escalated?'Prioridade crítica · SLA de retorno: 15 min.':'Prioridade alta · SLA de retorno: 30 min.'}\nHistórico: ${c.messages.map(m=>`${m.role==='agent'?'Agente':'Ricardo'}: ${m.text}`).join('\n')}`;}
export const signals = [
 {id:'delivery',title:'Atrasos de entrega em alta',change:'+28%',detail:'42 conversas nesta semana. Maior concentração na região Sul.',action:'Acionar logística',owner:'Logística · revisar prazos e comunicação proativa'},
 {id:'pos',title:'PDV após início da campanha',change:'+36%',detail:'18 chamados de franquias sobre desconto. Possível impacto na conversão.',action:'Acionar Sistemas / PDV',owner:'Sistemas / PDV · investigar regra da campanha'},
 {id:'repeat',title:'O mesmo pedido, outra conversa',change:'23 casos',detail:'Clientes retornam sem uma nova previsão. O contexto deve acompanhar o contato.',action:'Criar plano de acompanhamento',owner:'CX · consolidar contatos e oferecer atualização proativa'},
 {id:'sentiment',title:'Sentimento negativo em crescimento',change:'+8 p.p.',detail:'De 20% para 28% em sete dias; entrega é o principal tema associado.',action:'Revisar jornada de entrega',owner:'Experiência · revisar comunicação e alternativas de resolução'}
];
