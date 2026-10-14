import {HRSession} from './agent';
import {MockNimoServiceNow} from './nimo';
import {randomUUID} from 'node:crypto';
import type {NormalizedTurn} from '../shared/model';
import type {OperationsJourney} from './operations';
import type {NativeVacationMemory} from './vacation';
import type {AudioReplyComposer} from './voice-reply';
// Dedicated narrative session. Does not invoke Rafael's local RH seed or Nimo RH tools.
export class GloSession extends HRSession {
 private working=false;private epoch=0;
 constructor(private journey:OperationsJourney,private vacation:NativeVacationMemory,private composer:AudioReplyComposer,mode:'demo'|'voice'='demo'){
  super({source:'twilio-memory',recall:async()=>{throw Error('Use native vacation Recall');},update:async()=>{throw Error('Use native vacation origin');}},new MockNimoServiceNow(),undefined,mode,undefined,{identity:'gustavo-demo',name:'Gustavo Santos',synthetic:true,request:{id:null,subject:'Férias',days:null,month:null,status:'Nenhum interesse recuperado'},notes:[],version:0});
  this.state.memorySource='twilio-memory';this.state.integrations.memory='Conversation Memory nativo · origem verificada por Recall';this.state.integrations.nimo='Nimo/ServiceNow mock; execução de equipamentos simulada';
 }
 override async init(){await this.journey.newSession();await this.vacation.recall(this.state.sessionId);this.sync();this.event('Identidade isolada','Gustavo Santos · perfil fictício próprio; Rafael preservado.');return this;}
 private sync(){const c=this.vacation.context;this.state.context.request.month=c?.month??null;this.state.context.request.status=c?.status??'Nenhum interesse recuperado';this.state.context.notes=c?[c.nextStep]:[];this.state.summary=c?`Interesse em férias em ${c.month}; informar início e fim, validar com RH. Sem aprovação.`:'';}
 override get isBusy(){return this.working;}
 override interrupt(){this.epoch++;this.working=false;this.state.quality.interruptions++;this.state.status='em conversa';}
 override finish(reason='Sessão encerrada'){this.epoch++;this.working=false;this.state.status='encerrada';this.event('Chamada finalizada',reason,'twilio-voice');}
 override fail(){this.epoch++;this.working=false;this.state.status='erro';}
 override async turn(turn:NormalizedTurn,onToken:(token:string,last:boolean)=>void=()=>{}){
  if(this.working)throw Error('session-busy');if(['encerrada','erro'].includes(this.state.status))throw Error('session-ended');this.working=true;const epoch=++this.epoch;
  try{this.state.status='respondendo';this.state.quality.turns++;this.state.transcript.push({id:randomUUID(),role:'employee',text:turn.text,source:this.state.mode==='voice'?'twilio-voice':'roteiro-local'});let base:string;
   if(turn.vacation){base=await this.vacation.respond(turn.vacation,this.state.sessionId);this.sync();if(this.vacation.evidence)this.event('Contexto RH recuperado','Comunicação de origem retornada pela API Recall; apenas os fatos selecionados alimentam a resposta.','twilio-memory');}
   else if(turn.intent==='operations'&&turn.operation){this.vacation.currentTopic='equipment';try{base=await this.journey.execute(turn.operation,randomUUID(),this.state.mode==='voice'?'voice':'panel');}catch{base='Não consegui confirmar a atualização no adapter simulado. Nenhum sucesso foi anunciado.';}this.state.operations=await this.journey.snapshot();}
   else base=turn.intent==='end'?'Até logo, Gustavo. Obrigada por conversar com a Glô.':'Posso orientar sobre o interesse fictício em férias ou retomar seu pedido de equipamento. Vamos tratar um assunto por vez?';
   // HR response is deterministic from bounded native context. Equipment uses the existing guarded AI composer.
   const reply=turn.vacation?{speech:base,source:'roteiro-local'}:await this.composer.compose(base);
   if(epoch!==this.epoch)return;this.state.transcript.push({id:randomUUID(),role:'agent',text:reply.speech,source:reply.source==='openai'?'openai':'roteiro-local'});onToken(reply.speech,true);this.state.status='em conversa';if(turn.intent==='end')this.finish();
  }finally{if(epoch===this.epoch)this.working=false;}
 }
}
