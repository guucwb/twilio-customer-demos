import type { Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import twilio from 'twilio';
import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';
import { HRSession, normalizeTurn } from './agent';
import { SpeechChunks } from './speech';
const messageSchema=z.discriminatedUnion('type',[
 z.object({type:z.literal('setup'),sessionId:z.string().min(1).max(80),callSid:z.string().regex(/^CA[0-9a-f]{32}$/i),accountSid:z.string(),customParameters:z.object({demoSession:z.string()})}),
 z.object({type:z.literal('prompt'),voicePrompt:z.string().max(2000),last:z.boolean(),lang:z.string().optional()}),
 z.object({type:z.literal('interrupt'),utteranceUntilInterrupt:z.string().max(4000).optional(),durationUntilInterruptMs:z.number().optional()}),
 z.object({type:z.literal('dtmf'),digit:z.string().max(1)}),
 z.object({type:z.literal('error'),description:z.string().max(5000).optional()})
]);
export class RelayRegistry {
 private tickets=new Map<string,{nonce:string;expires:number;session:HRSession;connected:boolean}>();
 constructor(private factory:()=>Promise<HRSession>){ }
 async issue(callSid:string){for(const [sid,t] of this.tickets)if(t.expires<Date.now()&&!t.connected)this.tickets.delete(sid);const existing=this.tickets.get(callSid);if(existing)return existing;if(this.tickets.size>=20)throw new Error('relay-capacity');const ticket={nonce:randomUUID(),expires:Date.now()+10*60*1000,session:await this.factory(),connected:false};ticket.session.state.status='conectando';this.tickets.set(callSid,ticket);return ticket;}
 claim(callSid:string,nonce:string){const ticket=this.tickets.get(callSid);if(!ticket||ticket.nonce!==nonce||ticket.expires<Date.now()||ticket.connected)throw new Error('invalid-session');ticket.connected=true;ticket.session.state.mode='voice';ticket.session.state.status='em conversa';ticket.session.state.integrations.relay='Twilio Voice · WebSocket autenticado';ticket.session.event('Relay conectado','Assinatura e vínculo CallSid/sessão validados.','twilio-voice');return ticket.session;}
 has(callSid:string){return this.tickets.has(callSid);}
 finish(callSid:string){this.tickets.get(callSid)?.session.finish('Callback de finalização recebido da Twilio.');}
}
export function attachRelay(server:Server,options:{authToken:string;accountSid:string;publicBase:string;registry:RelayRegistry;ttsLanguage:string;onSession:(s:HRSession)=>void}){
 const wss=new WebSocketServer({noServer:true,maxPayload:8192});
 server.on('upgrade',(req,socket,head)=>{
  const signature=req.headers['x-twilio-signature'];const path=req.url;
  const https=options.publicBase+'/globo/relay';const wssUrl=https.replace(/^https:/,'wss:');
  if(path!=='/globo/relay'||typeof signature!=='string'||!options.authToken||![https,wssUrl].some(url=>twilio.validateRequest(options.authToken,signature,url,{}))){socket.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');socket.destroy();return;}
  if(wss.clients.size>=4){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
 });
 wss.on('connection',ws=>{
  let session:HRSession|undefined;let prompt='';let alive=true;let speech:SpeechChunks|undefined;
  const timeout=setTimeout(()=>ws.close(1008,'Setup required'),5000);
  const maxDuration=setTimeout(()=>{session?.finish('Limite de duração da demonstração.');send({type:'end',handoffData:JSON.stringify({reasonCode:'demo-timeout'})});ws.close(1000);},10*60*1000);
  const heartbeat=setInterval(()=>{if(!alive){ws.terminate();return;}alive=false;ws.ping();},20000);
  ws.on('pong',()=>{alive=true;});
  const send=(data:unknown)=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify(data));};
  ws.on('message',raw=>{
   let parsed:ReturnType<typeof messageSchema.safeParse>;try{parsed=messageSchema.safeParse(JSON.parse(raw.toString()));}catch{ws.close(1008,'Invalid protocol');return;}
   if(!parsed.success){ws.close(1008,'Invalid protocol');return;}const message=parsed.data;
   if(message.type==='setup'){
    if(session||message.accountSid!==options.accountSid){ws.close(1008,'Invalid setup');return;}
    try{session=options.registry.claim(message.callSid,message.customParameters.demoSession);clearTimeout(timeout);options.onSession(session);}catch{ws.close(1008,'Unknown session');}return;
   }
   if(!session){ws.close(1008,'Setup required');return;}
   if(message.type==='interrupt'){speech?.cancel();session.interrupt(message.utteranceUntilInterrupt);prompt='';return;}
   if(message.type==='error'){session.fail();send({type:'end',handoffData:JSON.stringify({reasonCode:'relay-error'})});ws.close(1011,'Relay error');return;}
   if(message.type==='dtmf'){if(message.digit==='0'){session.interrupt();session.finish('Encerramento pelo teclado.');send({type:'end',handoffData:JSON.stringify({reasonCode:'demo-end'})});}return;}
   prompt+=message.voicePrompt+' ';if(prompt.length>2000){ws.close(1008,'Prompt too large');return;}
   if(!message.last)return;const turn=normalizeTurn(prompt.trim());prompt='';
   if(session.isBusy){speech?.cancel();session.interrupt();}const current=session;
   const turnStart=Date.now();let firstSpeech=true;const chunks=new SpeechChunks((token,last)=>{if(firstSpeech&&token){current.state.quality.firstSpeechChunkMs=Date.now()-turnStart;firstSpeech=false;}send({type:'text',token,last,lang:options.ttsLanguage,interruptible:true,preemptible:false});});speech=chunks;
   void current.turn(turn,(token,last)=>chunks.push(token,last)).then(()=>{
    if(current.state.status==='encerrada')send({type:'end',handoffData:JSON.stringify({reasonCode:'demo-end',summary:current.state.summary})});
   }).catch(()=>{current.fail();send({type:'end',handoffData:JSON.stringify({reasonCode:'agent-error'})});ws.close(1011,'Agent error');});
  });
  ws.on('error',()=>session?.fail());
  ws.on('close',()=>{speech?.cancel();clearTimeout(timeout);clearTimeout(maxDuration);clearInterval(heartbeat);if(session&&session.state.status!=='encerrada'&&session.state.status!=='erro')session.finish('WebSocket desconectado.');});
 });
 return wss;
}
