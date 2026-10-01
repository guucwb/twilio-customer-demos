/** All fixtures and transitions are synthetic. This module has no network or credentials. */
export type CaseId = 'BET-18472' | 'BET-18491';
export type View = 'Inbox'|'Cases'|'Players'|'Knowledge'|'Supervisor';
export type Status = 'Em atendimento'|'Validação solicitada'|'Aguardando cliente'|'Resolvido';
export interface Article { id:string; title:string; category:string; updated:string; version:string; source:string; guidance:string[]; response:string; }
export interface Player { id:string; name:string; initials:string; email:string; phone:string; since:string; language:string; account:string; preferences:string; memory:string[]; payment?:string; }
export interface Interaction { id:string; channel:'Web Chat'|'Email'; ended:boolean; summary:string; messages:{author:'player'|'agent';body:string;time:string;agentName?:string}[]; }
export interface CaseRecord { id:CaseId; playerId:string; title:string; status:Status; priority:string; queue:string; owner:string; sla:number; reason:string; tags:string[]; notes:string[]; timeline:{time:string;text:string}[]; knowledge:string[]; interactions:Interaction[]; outcome:string; checklist:string[]; handoffSummary:string; }
export interface State { selected:CaseId; cases:Record<CaseId,CaseRecord>; notice:string; sequence:number; drafts:Record<CaseId,string>; }
export const players:Player[] = [
 {id:'BR-804219',name:'Lucas Ferreira',initials:'LF',email:'lucas.ferreira@example.test',phone:'+55 •• •••••-4219',since:'2026',language:'Português',account:'Verificação necessária',preferences:'Português · Email para acompanhamento',memory:['Entrou em contato há 21 dias sobre atualização cadastral.','Prefere atendimento em português.','Última interação resolvida no primeiro contato.'],payment:'EVT-PIX-300 · Pendente (fictício)'},
 {id:'BR-804391',name:'Ana Martins',initials:'AM',email:'ana.martins@example.test',phone:'+55 •• •••••-4391',since:'2026',language:'Português',account:'Solicitação de atendimento especializado',preferences:'Português · Respeitar o canal escolhido',memory:['Preferência por atendimento em português.','Nenhum histórico sensível disponível ao agente.']}
];
export const articles:Article[] = [
 {id:'KB-PIX-01',title:'Depósito via PIX não creditado — verificação de nova conta',category:'Pagamentos',updated:'29 set 2026',version:'2.1',source:'POL-PAY-014 · Política demonstrativa',guidance:['Reconheça a preocupação e confira apenas a referência operacional do evento.','Se a conta requer verificação, solicite validação no fluxo seguro.','Não prometa crédito ou prazo de liberação. Registre o acompanhamento no Case.'],response:'Lucas, entendo sua preocupação. Identifiquei um evento PIX pendente e uma verificação necessária na conta. Vou solicitar uma análise pelo fluxo seguro e manter o acompanhamento neste Case. Não é necessário enviar documentos ou dados bancários por aqui.'},
 {id:'KB-SEC-02',title:'Conta bloqueada — validação de segurança',category:'Segurança',updated:'28 set 2026',version:'1.3',source:'POL-SEC-008 · Política demonstrativa',guidance:['Explique que a conta precisa de validação adicional.','Encaminhe ao time especializado sem solicitar documentos no chat.','Nunca prometa desbloqueio antes da análise.'],response:'A conta precisa de uma validação adicional. O time especializado seguirá com a análise pelo canal seguro.'},
 {id:'KB-RG-03',title:'Procedimento de autoexclusão',category:'Jogo Responsável',updated:'30 set 2026',version:'3.0',source:'POL-RG-001 · Política demonstrativa, validar com BetMGM',guidance:['Acolher o pedido sem incentivar permanência ou oferecer benefícios.','Confirmar entendimento do pedido e encaminhar imediatamente ao atendimento especializado.','Registrar o encaminhamento e informar que a efetivação depende do sistema autorizado.'],response:'Ana, entendi seu pedido e vou priorizar seu atendimento com a equipe de Jogo Responsável. Ela dará continuidade pelo procedimento seguro. Não vou oferecer promoções ou tentar mudar sua decisão.'},
 {id:'KB-ACC-04',title:'Falha de acesso / recuperação de conta',category:'Acesso',updated:'27 set 2026',version:'1.2',source:'POL-ACC-004 · Política demonstrativa',guidance:['Verifique o tipo de erro sem pedir senha ou código de autenticação.','Oriente o fluxo oficial de recuperação.','Registre persistência da falha para investigação técnica.'],response:'Podemos seguir pelo fluxo oficial de recuperação. Não compartilhe sua senha ou códigos de autenticação no atendimento.'},
 {id:'KB-KYC-05',title:'Verificação documental',category:'Segurança',updated:'26 set 2026',version:'1.0',source:'POL-KYC-003 · Política demonstrativa',guidance:['Consulte apenas o rótulo operacional de verificação.','Direcione documentos exclusivamente ao ambiente seguro do sistema de origem.','Nunca copie documentos ou identificadores para notas do Case.'],response:'A verificação acontece no ambiente seguro. Este atendimento acompanha apenas o status do processo.'}
];
const startMessage = 'Oi, fiz um PIX de R$300 faz uns 20 minutos, o dinheiro não apareceu e agora minha conta está bloqueada. Conseguem me ajudar?';
export function initialState():State {
 const make=(id:CaseId,playerId:string,title:string,rg:boolean):CaseRecord=>({id,playerId,title,status:'Em atendimento',priority:rg?'Fluxo de política':'Alta',queue:rg?'Responsible Gaming':'Payments & Verification',owner:'Marina Costa',sla:18,reason:rg?'Responsible Gaming > Atendimento especializado':'Payments > PIX > Verification',tags:rg?['responsible-gaming','policy']:['pix','payments','verification'],notes:[],timeline:[{time:'10:42',text:'Contato iniciado'},{time:'10:42',text:rg?'Política especializada identificada':'Intenção identificada: Pagamentos > PIX'},{time:'10:42',text:`Case ${id} criado`}],knowledge:[],interactions:[{id:rg?'84931':'84912',channel:'Web Chat',ended:false,summary:rg?'Pedido de interrupção e bloqueio encaminhável ao atendimento especializado.':'PIX não creditado; conta requer verificação adicional. Evento operacional pendente.',messages:[{author:'player',body:rg?'Quero bloquear minha conta e parar de apostar.':startMessage,time:'10:42'}]}],outcome:'Ainda não definido',checklist:[],handoffSummary:''});
 return {selected:'BET-18472',cases:{'BET-18472':make('BET-18472','BR-804219','Depósito PIX não creditado',false),'BET-18491':make('BET-18491','BR-804391','Solicitação de Jogo Responsável',true)},notice:'',sequence:0,drafts:{'BET-18472':'','BET-18491':''}};
}
export const isResponsible=(c:CaseRecord)=>c.playerId==='BR-804391';
export const playerFor=(c:CaseRecord)=>players.find(p=>p.id===c.playerId)!;
export const articleFor=(c:CaseRecord)=>articles.find(a=>a.id===(isResponsible(c)?'KB-RG-03':'KB-PIX-01'))!;
export const currentInteraction=(c:CaseRecord)=>c.interactions[c.interactions.length-1];
export const routingFor=(c:CaseRecord)=>isResponsible(c)?{intent:'Jogo Responsável',secondary:'Atendimento especializado',sentiment:'Pedido de ajuda',policy:'Atendimento especializado',explanation:'Pedido de interrupção + Política de proteção + Português',attributes:{channel:'web',intent:'responsible_gaming',priority:'policy',language:'pt-BR'}}:{intent:'Pagamentos > PIX',secondary:'Verificação de conta',sentiment:'Frustrado',policy:'Validação em ambiente seguro',explanation:'Pagamentos + PIX + Verificação necessária + Português',attributes:{channel:'web',intent:'payments',subIntent:'pix',verificationRequired:true,priority:'high',language:'pt-BR'}};
export function handoffFor(c:CaseRecord):string {return isResponsible(c)?'Ana pediu para bloquear a conta e parar de apostar. Atendimento especializado necessário. Preservar o pedido e seguir a política de Jogo Responsável. Nenhum bloqueio real foi realizado.':`Lucas entrou em contato por PIX não creditado. Conta requer verificação adicional. Evento de pagamento identificado como pendente. ${c.knowledge.length?'Política consultada.':'Política sugerida, ainda não consultada.'} ${c.interactions.some(i=>i.messages.some(m=>m.author==='agent'))?'Orientação inicial fornecida.':'Orientação inicial ainda não enviada.'} Necessária validação.`;}
export const rgSteps=['Pedido acolhido sem oferta comercial','Entendimento do pedido confirmado','Encaminhamento especializado registrado'];
export type Action = {type:'select';id:CaseId}|{type:'reset'}|{type:'draft';id:CaseId;text:string}|{type:'note';id:CaseId;text:string}|{type:'knowledge';id:CaseId;articleId:string}|{type:'validate'|'transfer'|'wait'|'resolve'|'end'|'email'|'send';id:CaseId}|{type:'check';id:CaseId;step:string};
/** Replace this interface with a BetMGM-owned backend adapter in production. Flex is not the case database. */
export interface CaseService { getSnapshot():State; subscribe(listener:()=>void):()=>void; dispatch(action:Action):void; }
export class InMemoryCaseService implements CaseService {
 private state=initialState(); private listeners=new Set<()=>void>();
 getSnapshot=()=>this.state;
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 dispatch=(action:Action)=>{
  if(action.type==='reset') this.state=initialState();
  else {
   const next:State=JSON.parse(JSON.stringify(this.state)); next.notice='';
   if(action.type==='select') next.selected=action.id;
   else {const c=next.cases[action.id];const interaction=currentInteraction(c);const rg=isResponsible(c);
    const time=()=>{const minutes=642+next.sequence;return `${Math.floor(minutes/60)}:${String(minutes%60).padStart(2,'0')}`;};
    const event=(text:string)=>{next.sequence++;c.timeline.push({time:time(),text});};
    if(action.type==='draft') next.drafts[c.id]=action.text;
    if(action.type==='note'&&action.text.trim()){c.notes.push(action.text.trim());event('Nota interna adicionada');next.notice='Nota salva no Case';}
    if(action.type==='knowledge'&&articles.some(a=>a.id===action.articleId)&&(!rg||action.articleId==='KB-RG-03')){if(!c.knowledge.includes(action.articleId)){c.knowledge.push(action.articleId);event(`Knowledge consultado: ${action.articleId}`);}}
    if(action.type==='validate'&&!rg&&c.status!=='Resolvido'&&c.status!=='Validação solicitada'){c.status='Validação solicitada';event('Validação solicitada — evento demonstrativo');next.drafts[c.id]=articleFor(c).response;next.notice='Validação simulada registrada · resposta preparada';}
    if(action.type==='transfer'&&c.status!=='Resolvido'){const queue=rg?'Responsible Gaming':'Verification';if(c.owner!=='Rafael Lima'){c.handoffSummary=handoffFor(c);c.queue=queue;c.owner='Rafael Lima';event(`Contexto transferido para ${queue} · Rafael Lima`);next.notice='Contexto transferido. Troquei de agente, não de história.';}}
    if(action.type==='wait'&&c.status!=='Resolvido'){c.status='Aguardando cliente';event('Case aguardando cliente');}
    if(action.type==='check'&&rg&&rgSteps.includes(action.step)){c.checklist=c.checklist.includes(action.step)?c.checklist.filter(s=>s!==action.step):[...c.checklist,action.step];event('Checklist de política atualizado');}
    if(action.type==='resolve'&&c.status!=='Resolvido'){
     if(rg&&c.checklist.length!==rgSteps.length) next.notice='Conclua o checklist de política antes de resolver o Case.';
     else {c.status='Resolvido';c.outcome=rg?'Encaminhamento especializado registrado; nenhuma autoexclusão efetivada.':'Acompanhamento demonstrativo concluído; nenhum crédito ou desbloqueio realizado.';event('Case resolvido — desfecho demonstrativo');next.notice='Case resolvido. O histórico permanece disponível.';}
    }
    if(action.type==='end'&&!interaction.ended){interaction.ended=true;interaction.summary=handoffFor(c);event(`${interaction.channel} #${interaction.id} encerrado`);next.notice=c.status==='Resolvido'?'Interação encerrada. Histórico preservado.':'A interação pode terminar. O Case continua.';}
    if(action.type==='email'&&!rg){
     if(c.status==='Resolvido')next.notice='Este Case está resolvido. Reinicie a demo para demonstrar retorno a um Case aberto.';
     else if(!interaction.ended)next.notice='Encerre a interação atual antes de simular o retorno por Email.';
     else {next.sequence=Math.max(next.sequence,25);c.interactions.push({id:String(85000+c.interactions.length),channel:'Email',ended:false,summary:interaction.summary,messages:[{author:'player',body:'Olá, gostaria de acompanhar a validação do meu PIX. Já conversei com vocês pelo chat. Obrigado, Lucas.',time:time()}]});event('Novo Email vinculado ao Case existente — simulação');next.notice='Case aberto encontrado · O cliente mudou de canal. O contexto não recomeçou.';next.drafts[c.id]='';}
    }
    if(action.type==='send'&&next.drafts[c.id].trim()&&!interaction.ended){interaction.messages.push({author:'agent',body:next.drafts[c.id].trim(),time:time(),agentName:c.owner});next.drafts[c.id]='';event('Resposta adicionada à interação local');next.notice='Resposta registrada na demonstração';}
   }
   this.state=next;
  }
  this.listeners.forEach(l=>l());
 };
}
export const caseService=new InMemoryCaseService();
/** Deliberately disabled seam: no transport, API endpoint or credential exists in this demo. */
export const channelAdapter={mode:'offline' as const, liveEmailEnabled:false, liveAIEnabled:false};
