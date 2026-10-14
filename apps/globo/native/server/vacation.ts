import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {TargetAPI} from './target-api';
import type {NormalizedTurn} from '../shared/model';
import {normalizeOperation} from './ops-normalize';
const months=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const plain=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function vacationIntent(raw:string):NormalizedTurn['vacation']{
 const t=plain(raw);if(!/ferias/.test(t))return;
 const mentioned=months.filter(m=>new RegExp('\\b'+plain(m)+'\\b').test(t));
 if(mentioned.length>1)return;
 if(mentioned.length===1)return {kind:'interest',month:mentioned[0]};
 return {kind:'resume'};
}
export function normalizeGloTurn(raw:string):NormalizedTurn{
 const t=plain(raw);
 if(raw.length>2000||/@|\b\d{6,}\b/.test(raw)||/cpf|salario|diagnostico|senha|token|ignore|system|prompt|segredo/.test(t))return {intent:'unsupported',text:'Entrada fora do roteiro fictício bloqueada.'};
 if(/ferias/.test(t)&&/microfone|equipamento|kit/.test(t))return {intent:'unsupported',text:'Vamos tratar um assunto por vez, sem compartilhar o contexto de RH com equipamentos.'};
 const vacation=vacationIntent(raw);if(vacation)return {intent:'history',text:raw,vacation};
 const op=normalizeOperation(raw);if(op)return {...op,text:raw};
 return {intent:/tchau|encerrar|desligar/.test(t)?'end':'unsupported',text:raw};
}
const pointer=z.object({identity:z.literal('gustavo-demo'),subject:z.literal('vacation'),conversationId:z.string().regex(/^conv_conversation_[0-9a-z]{26}$/),communicationId:z.string().regex(/^conv_communication_[0-9a-z]{26}$/),channelId:z.string().regex(/^(MM|SM)[0-9a-f]{32}$/i)}).strict();
export interface VacationContext {subject:'vacation';month:string;dates:'não definidas';status:'interesse · sem solicitação ou aprovação';nextStep:string;}
export interface VacationEvidence {source:'twilio-memory';profileId:string;conversationId:string;communicationId:string;channelId:string;retrievedAt:string;agentSessionId:string;query:string;selectedText:string;}
export class NativeVacationMemory {
 context?:VacationContext;evidence?:VacationEvidence;lastError?:string;currentTopic:'vacation'|'equipment'='vacation';
 constructor(private c:{api:TargetAPI;storeId:string;profileId:string;onEvidence?:(e:VacationEvidence)=>Promise<void>}){}
 private path(){return `/v1/Stores/${this.c.storeId}/Profiles/${this.c.profileId}`;}
 snapshot(){return {enabled:true,identity:'gustavo-demo',employeeName:'Gustavo Santos',synthetic:true,currentTopic:this.currentTopic,vacation:this.context??null,recall:this.evidence??null,memoryStatus:this.evidence?'recuperado via Recall':this.lastError?'Recall indisponível; pedir esclarecimento':'aguarda interação nativa',nimo:'Nimo/ServiceNow simulado',policy:'Política fictícia da demo; nenhuma política real da Globo'};}
 async capture(input:{text:string;conversationId:string;communicationId:string;channelId:string}){
  if(!vacationIntent(input.text)?.month)throw Error('vacation-no-bounded-month');
  const origin=pointer.parse({identity:'gustavo-demo',subject:'vacation',conversationId:input.conversationId,communicationId:input.communicationId,channelId:input.channelId});
  // Only an origin pointer is a trait. Month must come back from native Recall.
  await this.c.api.request('memory.twilio.com',this.path(),'PATCH',{traits:{GloboVacation:{originJson:JSON.stringify(origin)}}});
  this.context=undefined;this.evidence=undefined;
 }
 async recall(agentSessionId:string=randomUUID()){
  this.context=undefined;this.evidence=undefined;this.lastError=undefined;
  try{
   const p=await this.c.api.request('memory.twilio.com',this.path());
   if(!p.traits?.GloboVacation?.originJson)return;
   const origin=pointer.parse(JSON.parse(p.traits.GloboVacation.originJson));
   const query='Interesse fictício em férias: mês mencionado, datas ainda indefinidas e próximo passo. Recuperar a comunicação de origem, sem aprovar férias.';
   const r=await this.c.api.request('memory.twilio.com',this.path()+'/Recall','POST',{query,conversationId:origin.conversationId,communicationsLimit:20,observationsLimit:5,summariesLimit:2});
   const comm=r.communications?.find((x:any)=>x.id===origin.communicationId&&x.channelId===origin.channelId&&x.author?.type==='CUSTOMER'&&x.author?.profileId===this.c.profileId);
   const text=comm?.content?.text;if(typeof text!=='string'||!vacationIntent(text)?.month)throw Error('origin-not-returned-by-native-recall');
   // Demo accepts only interest with unspecified dates, not approval or exact dates.
   if(/\b\d{1,2}[/-]\d{1,2}\b|aprovad|confirmad|\b\d{1,2}\s*dias/i.test(text))throw Error('unsupported-vacation-dates');
   this.context={subject:'vacation',month:vacationIntent(text)!.month!,dates:'não definidas',status:'interesse · sem solicitação ou aprovação',nextStep:'Informar data inicial e final; RH humano validar saldo, datas e antecedência fictícia de 30 dias.'};
   this.evidence={source:'twilio-memory',profileId:this.c.profileId,conversationId:origin.conversationId,communicationId:origin.communicationId,channelId:origin.channelId,retrievedAt:new Date().toISOString(),agentSessionId,query,selectedText:text};await this.c.onEvidence?.(this.evidence);return this.context;
  }catch{this.context=undefined;this.evidence=undefined;this.lastError='Recuperação nativa não comprovada';return;}
 }
 async respond(turn:NonNullable<NormalizedTurn['vacation']>,agentSessionId:string){
  this.currentTopic='vacation';const c=await this.recall(agentSessionId);
  if(!c)return 'Não consegui recuperar seu interesse de férias pela memória nativa. Qual mês você tem em mente? Nenhuma solicitação ou aprovação foi registrada.';
  if(turn.kind==='interest'&&turn.month!==c.month)return 'Ainda não confirmei essa nova preferência na memória nativa. Pode enviar o mês em uma nota de voz, com as datas ainda indefinidas?';
  return `Gustavo, você mencionou férias em ${c.month}, ainda sem datas definidas. Para avançar, informe a data inicial e a final. O RH humano precisa validar saldo e datas; na política fictícia desta demo, usamos 30 dias de antecedência. Isso é apenas um interesse, sem solicitação aberta ou aprovação.`;
 }
}
