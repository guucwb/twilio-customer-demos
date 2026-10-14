export type Intent = 'history' | 'policy' | 'update' | 'summary' | 'handoff' | 'end' | 'unsupported';
export type Source = 'roteiro-local' | 'openai' | 'twilio-voice' | 'local-demo' | 'nimo-mock' | 'twilio-memory';
export interface EmployeeContext {
  identity: 'rafael-demo'; name: 'Rafael'; synthetic: true;
  request: { id: 'FER-DEMO-1042'; subject: 'Férias'; days: number; month: 'novembro'; status: 'Rascunho — aguarda RH'; };
  notes: string[]; version: number;
}
export const seedContext = (): EmployeeContext => ({identity:'rafael-demo',name:'Rafael',synthetic:true,request:{id:'FER-DEMO-1042',subject:'Férias',days:10,month:'novembro',status:'Rascunho — aguarda RH'},notes:['Na interação anterior, Rafael pediu 10 dias em novembro.','Preferência fictícia: receber retorno pelo canal desta sessão.'],version:1});
export const policy = {name:'Política fictícia de férias · RH Demo',facts:['Solicitações devem ser encaminhadas com 30 dias de antecedência nesta demonstração.','Datas e saldo precisam ser validados pelo RH humano.','O assistente prepara um rascunho; não aprova férias nem altera sistemas corporativos.']};
export interface NormalizedTurn {intent:Intent; text:string; days?:number;}
export interface Transcript {id:string;role:'employee'|'agent';text:string;source:Source;interrupted?:boolean;}
export interface TimelineEvent {id:string;time:string;name:string;detail:string;source:Source;}
export interface Snapshot {
  relaySessionId?:string; nativeIntelligence?:NativeIntelligence;
  sessionId:string; mode:'demo'|'voice'; status:'pronto'|'conectando'|'em conversa'|'respondendo'|'encerrada'|'erro';
  memorySource:Source; context:EmployeeContext; transcript:Transcript[]; events:TimelineEvent[]; summary:string; handoff?:{id:string;status:string};
  quality:{turns:number;fallbacks:number;interruptions:number;firstTokenMs?:number;firstSpeechChunkMs?:number;blockedInputs:number;};
  integrations:{relay:string;tts:string;ai:string;memory:string;orchestrator:string;intelligence:string;nimo:string;whatsapp:string;};
}
export const demoTurns: {intent:Intent;text:string;days?:number}[] = [
  {intent:'history',text:'Você lembra da minha solicitação de férias?'},
  {intent:'policy',text:'Qual é a antecedência para solicitar férias?'},
  {intent:'update',text:'Quero atualizar para quinze dias em novembro.',days:15},
  {intent:'summary',text:'Pode resumir a conversa e os próximos passos?'},
  {intent:'handoff',text:'Quero falar com o RH humano.'}
];

export interface NativeIntelligence {source:'twilio-intelligence-classic';status:'awaiting-transcript'|'processing'|'transcript-completed'|'failed';transcriptId?:string;checkedAt:string;operators:{name:string;type:string;result:string}[];moreOperators?:boolean;}
