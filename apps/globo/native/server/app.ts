import express from 'express';
import helmet from 'helmet';
import twilio from 'twilio';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { demoTurns } from '../shared/model';
import { HRSession } from './agent';
import { RelayRegistry } from './relay';
import { readFileSync } from 'node:fs';
import { operationSteps } from '../shared/operations';
import { normalizeTurn } from './agent';
import { validateAnalysis,aggregate,type AnalysisRecord,type OperatorName } from './analysis';
import type { MockEquipmentExecution } from './execution';
import type { OperationsJourney } from './operations';
import type { NativeAnalysisCollector } from './native-analysis';
import type { WhatsAppJourney } from './whatsapp';
import type { NativeOptions } from './native';
import type { ClassicIntelligence } from './intelligence';
import type { voiceConfig } from './voice';
import type {FileVoiceNotes} from './file-audio';
import type {SignedAudioStore} from './outgoing-media';
export interface AppOptions {employeeName?:string;experience?:()=>unknown;outgoingTtsStatus?:'not-configured'|'verified'|'unavailable';outgoingMedia?:SignedAudioStore;audio?:FileVoiceNotes;onAudioRecover?:(id:string)=>Promise<boolean>;initialNativeRecords?:AnalysisRecord[];onNativeRefresh?:(id:string)=>Promise<void>;inboundWhatsApp?:{from:string;to:string};onCallAdmitted?:(callSid:string)=>Promise<void>;nativeCollector?:NativeAnalysisCollector;nativeConversationIds?:string[];onNativeRecords?:(r:AnalysisRecord[])=>Promise<void>;execution?:MockEquipmentExecution;journey?:OperationsJourney;whatsapp?:WhatsAppJourney;native?:NativeOptions;intelligence?:ClassicIntelligence;localPort?:number;onIntelligence?:(s:HRSession)=>Promise<void>;approvedTestCall?:{from:string;to:string};voice:ReturnType<typeof voiceConfig>;authToken:string;accountSid:string;publicBase:string;panelPassword:string;allowedCalls:string[];session:HRSession;registry:RelayRegistry;getSession:()=>HRSession;createSession:()=>Promise<HRSession>;setSession:(s:HRSession)=>void;staticDir?:string;}
function equal(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function createApp(o:AppOptions){
 const nativeNotifications=new Set<string>();let notificationBusy=false;
 const nativeRecords=new Map<string,AnalysisRecord>((o.initialNativeRecords??[]).map(r=>[r.id,r]));
 let ciBusy=false,lastCIRead=0;
 let permit:{nonce:string;expires:number;callSid?:string}|undefined;
 const app=express();app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{'upgrade-insecure-requests':null}}}));app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 app.use('/globo/native',express.urlencoded({extended:false,limit:'12kb'}));
 const signed=(req:express.Request,res:express.Response,next:express.NextFunction)=>{const sig=req.get('x-twilio-signature');if(!sig||!o.authToken||!twilio.validateRequest(o.authToken,sig,o.publicBase+req.originalUrl,req.body)){res.sendStatus(403);return;}if(req.body.AccountSid!==o.accountSid){res.sendStatus(403);return;}next();};
 app.post('/globo/native/intelligence/events',express.text({type:'application/json',limit:'64kb'}),async(req,res)=>{
  const signature=req.get('x-twilio-signature');if(!o.nativeCollector||typeof req.body!=='string'||!signature||!req.query.bodySHA256||!twilio.validateRequestWithBody(o.authToken,signature,o.publicBase+req.originalUrl,req.body)){res.sendStatus(403);return;}
  let event:{accountId:string;conversationId:string;intelligenceConfiguration:{id:string}};try{event=z.object({accountId:z.literal(o.accountSid),conversationId:z.string(),intelligenceConfiguration:z.object({id:z.string()})}).parse(JSON.parse(req.body));}catch{res.sendStatus(400);return;}
  const key=req.query.bodySHA256 as string;if(nativeNotifications.has(key)){res.sendStatus(204);return;}if(notificationBusy){res.sendStatus(429);return;}notificationBusy=true;
  try{const records=await o.nativeCollector.collect(event.conversationId);for(const record of records)nativeRecords.set(record.id,record);await o.onNativeRecords?.([...nativeRecords.values()]);nativeNotifications.add(key);res.sendStatus(204);}catch{res.sendStatus(503);}finally{notificationBusy=false;}
 });
 app.get('/globo/native/voice-notes/:id.ogg',async(req,res)=>{const data=await o.outgoingMedia?.get(req.params.id,String(req.query.expires??''),String(req.query.sig??''));if(!data){res.sendStatus(404);return;}res.setHeader('Content-Type','audio/ogg');res.setHeader('Content-Length',String(data.length));res.setHeader('Content-Disposition','inline');res.send(data);});
 app.post('/globo/native/whatsapp',signed,async(req,res)=>{try{if(!o.audio){res.sendStatus(403);return;}await o.audio.accept(req.body);res.type('text/xml').send('<Response/>');}catch{res.status(403).type('text/xml').send('<Response/>');}});
 app.post('/globo/native/voice',signed,async(req,res)=>{
  const call=req.body.CallSid;
  if(o.inboundWhatsApp&&String(req.body.From).replace(/^whatsapp:/,'')===o.inboundWhatsApp.from.replace(/^whatsapp:/,'')&&String(req.body.To).replace(/^whatsapp:/,'')===o.inboundWhatsApp.to.replace(/^whatsapp:/,'')&&/^CA[0-9a-f]{32}$/i.test(call)){if(!o.allowedCalls.includes(call))o.allowedCalls.push(call);await o.onCallAdmitted?.(call);}
  if(permit&&o.approvedTestCall&&req.query.testPermit===permit.nonce&&permit.expires>Date.now()&&req.body.From===o.approvedTestCall.from&&req.body.To===o.approvedTestCall.to&&(!permit.callSid||permit.callSid===call)&&/^CA[0-9a-f]{32}$/i.test(call)){permit.callSid=call;if(!o.allowedCalls.includes(call))o.allowedCalls.push(call);}
  if(!o.allowedCalls.includes(call)){res.status(403).type('text/plain').send('Call not approved for isolated demo');return;}
  try{const ticket=await o.registry.issue(call);o.setSession(ticket.session);const r=new twilio.twiml.VoiceResponse();const connect=r.connect({action:o.publicBase+'/globo/native/voice/end',method:'POST'});const relay=connect.conversationRelay({url:o.publicBase.replace(/^https:/,'wss:')+'/globo/native/relay',...o.voice,...o.native,language:o.voice.transcriptionLanguage,interruptible:'any',welcomeGreeting:o.employeeName==='Gustavo Santos'?'Oi, Gustavo! Eu sou a Glô. Esta demo usa dados fictícios e a Twilio processa a conversa. Quer retomar o equipamento ou as férias?':'Olá, Rafael! Esta é uma demo com dados fictícios. A conversa será transcrita e processada pela Twilio. Vamos conversar sobre seu pedido de equipamento?',welcomeGreetingInterruptible:'any',partialPrompts:false,dtmfDetection:true});relay.parameter({name:'demoSession',value:ticket.nonce});res.type('text/xml').send(r.toString());}catch{res.status(503).type('text/xml').send('<Response><Hangup/></Response>');}
 });
 app.post('/globo/native/status',signed,(req,res)=>{if(o.allowedCalls.includes(req.body.CallSid)&&['completed','failed','busy','no-answer','canceled'].includes(req.body.CallStatus))o.registry.finish(req.body.CallSid);res.sendStatus(204);});
 app.post('/globo/native/voice/end',signed,(req,res)=>{if(!o.allowedCalls.includes(req.body.CallSid)||!o.registry.has(req.body.CallSid)){res.sendStatus(403);return;}o.registry.finish(req.body.CallSid);res.type('text/xml').send('<Response><Hangup/></Response>');});
 const protect=(req:express.Request,res:express.Response,next:express.NextFunction)=>{
  const localHosts=[`127.0.0.1:${o.localPort??3007}`,`localhost:${o.localPort??3007}`,'127.0.0.1:3007','localhost:3007','127.0.0.1:5177','localhost:5177','127.0.0.1:5178','localhost:5178','127.0.0.1:5179','localhost:5179'];
  const local=localHosts.includes(req.get('host')??'')&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'')&&!req.get('x-forwarded-for')&&!req.get('x-forwarded-host');
  // Tunnel requests can never take the local shortcut, even with Host rewriting.
  if(!local){let credentials='';try{if(req.get('authorization')?.startsWith('Basic '))credentials=Buffer.from(req.get('authorization')!.slice(6),'base64').toString();}catch{ /* Invalid encoding stays unauthorized. */ }
   if(!o.panelPassword||!equal(credentials,'demo:'+o.panelPassword)){res.setHeader('WWW-Authenticate','Basic realm="Globo demo", charset="UTF-8"');res.sendStatus(401);return;}}
  const origin=req.get('origin');const allowedOrigins=[`http://127.0.0.1:${o.localPort??3007}`,`http://localhost:${o.localPort??3007}`,'http://127.0.0.1:5177','http://localhost:5177','http://127.0.0.1:5178','http://localhost:5178','http://127.0.0.1:5179','http://localhost:5179','http://127.0.0.1:3007','http://localhost:3007',o.publicBase];
  if(origin&&!allowedOrigins.includes(origin)){res.sendStatus(403);return;}
  if(req.method==='POST'&&(!origin||!req.is('application/json')||req.get('x-globo-demo')!=='1')){res.sendStatus(403);return;}next();
 };
 app.use('/api/globo/native',protect,express.json({limit:'8kb'}));
 app.post('/api/globo/native/audio/ingest-existing',async(req,res)=>{const body=z.object({messageSid:z.string().regex(/^(?:SM|MM)[0-9a-f]{32}$/i)}).strict().safeParse(req.body);if(!body.success||!o.onAudioRecover){res.sendStatus(403);return;}try{res.json({accepted:await o.onAudioRecover(body.data.messageSid),ingress:'authenticated-rest-recovery'});}catch{res.status(503).json({error:'Authorized audio recovery not confirmed.'});}});
 app.get('/api/globo/native/audio/:sid/play',async(req,res)=>{const job=o.audio?.state().find(j=>j.messageSid===req.params.sid&&j.audioSha256);const data=job?.audioSha256?await o.outgoingMedia?.playback(job.audioSha256):undefined;if(!data){res.sendStatus(404);return;}res.type('audio/ogg').send(data);});
 app.get('/api/globo/native/audio',(_req,res)=>res.json({jobs:o.audio?.state()??[],provider:'STT OpenAI; ingestão/análise Twilio nativa',outboundTts:{provider:'ElevenLabs direct TTS',status:o.outgoingTtsStatus??'not-configured'},fallback:o.audio?.state().some(j=>!!j.fallback)??false}));
 app.post('/api/globo/native/prepare-test-call',(_req,res)=>{if(!o.approvedTestCall||permit){res.sendStatus(403);return;}permit={nonce:randomUUID(),expires:Date.now()+120000};res.json({url:o.publicBase+'/globo/native/voice?testPermit='+permit.nonce});});
 app.post('/api/globo/native/intelligence/refresh',async(_req,res)=>{
  const s=o.getSession();if(!o.intelligence||!s.state.relaySessionId||!['encerrada','erro'].includes(s.state.status)){res.status(409).json({error:'Consulta nativa requer uma sessão de voz encerrada e habilitação aprovada.'});return;}
  if(ciBusy||Date.now()-lastCIRead<5000){res.sendStatus(429);return;}ciBusy=true;lastCIRead=Date.now();
  try{const results=await o.intelligence.results(s.state.relaySessionId);s.state.nativeIntelligence=results;await o.onIntelligence?.(s);res.json({ok:true});}catch{res.status(503).json({error:'Resultados nativos indisponíveis. Nenhum resultado simulado foi substituído.'});}finally{ciBusy=false;}
 });
 app.post('/api/globo/native/native-analysis/refresh',async(req,res)=>{const input=z.object({conversationId:z.string()}).strict().safeParse(req.body);if(!input.success||!o.nativeCollector){res.sendStatus(409);return;}try{const records=await o.nativeCollector.collect(input.data.conversationId);for(const record of records)nativeRecords.set(record.id,record);await o.onNativeRecords?.([...nativeRecords.values()]);res.json({ok:true,count:records.length});}catch{res.status(503).json({error:'Análise nativa inválida/indisponível. Sem fallback para simulação.'});}});
 app.get('/api/globo/native/operations',async(_req,res)=>{try{const operations=await o.journey?.snapshot();res.json({operations});}catch{res.sendStatus(503);}});
 let nativeReadBusy=false,lastNativeRead=0;
 async function refreshExistingNativeResults(){if(!o.nativeCollector||nativeReadBusy||Date.now()-lastNativeRead<30000)return;nativeReadBusy=true;lastNativeRead=Date.now();try{for(const id of o.nativeConversationIds??[]){try{const records=await o.nativeCollector.collect(id);for(const record of records)nativeRecords.set(record.id,record);}catch{/* Keep verified results; never fabricate a replacement. */}}await o.onNativeRecords?.([...nativeRecords.values()]);}finally{nativeReadBusy=false;}}
 app.get('/api/globo/native/analytics',async(_req,res)=>{await refreshExistingNativeResults();const fixtures=JSON.parse(readFileSync(new URL('../fixtures/history.json',import.meta.url),'utf8')) as {id:string;operator:OperatorName;conversationId:string;time:string;result:unknown;communications:Parameters<typeof validateAnalysis>[2]}[];const simulated:AnalysisRecord[]=fixtures.map(f=>validateAnalysis(f.operator,f.result,f.communications,{id:f.id,conversationId:f.conversationId,time:f.time,source:'non-native-simulation'}));const records=[...nativeRecords.values(),...simulated];res.json({records,distribution:aggregate(records),aggregation:'application-aggregation',nativeReady:nativeRecords.size>0,authorizedNativeConversations:o.nativeConversationIds??[],rejectedNativeResults:[...(o.nativeCollector?.rejections.values()??[])]});});
 app.post('/api/globo/native/operation-step',async(req,res)=>{const input=z.object({step:z.number().int().min(0).max(operationSteps.length-1)}).strict().safeParse(req.body);const s=o.getSession();if(!input.success){res.sendStatus(400);return;}if(s.isBusy||s.state.mode==='voice'||['encerrada','erro'].includes(s.state.status)){res.sendStatus(409);return;}try{const turn=normalizeTurn(operationSteps[input.data.step].text);if([4,5].includes(input.data.step))turn.channel='whatsapp-text';await s.turn(turn);res.json({ok:true});}catch{res.status(503).json({error:'Execução não comprovada.'});}});
 app.post('/api/globo/native/execution-event',async(req,res)=>{const input=z.object({status:z.enum(['accepted','dispatched','completed']),eventId:z.string().min(1).max(80)}).strict().safeParse(req.body);if(!input.success||!o.execution||!o.journey){res.sendStatus(400);return;}try{const snapshot=await o.journey.snapshot();if(!snapshot.active){res.sendStatus(409);return;}await o.execution.event(o.journey.identity,snapshot.active.id,input.data.status,input.data.eventId);o.getSession().state.operations=await o.journey.snapshot();res.json({ok:true});}catch{res.status(503).json({error:'Evento mock não concluído.'});}});
 app.get('/api/globo/native/experience',(_req,res)=>res.json(o.experience?.()??{enabled:false}));
 app.get('/api/globo/native/state',(_req,res)=>res.json(o.getSession().state));
 app.get('/api/globo/native/health',(_req,res)=>res.json({ok:true,synthetic:true,approvedCalls:o.allowedCalls.length,voiceReady:Boolean(o.allowedCalls.length&&o.authToken&&o.accountSid),onboarding:o.getSession().state.events.some(e=>e.name==='Relay conectado')?'session-connected':'not-verified',whatsapp:'pending'}));
 app.post('/api/globo/native/turn',async(req,res)=>{const input=z.object({step:z.number().int().min(0).max(demoTurns.length-1)}).strict().safeParse(req.body);if(!input.success){res.sendStatus(400);return;}const s=o.getSession();if(s.state.mode==='voice'||s.isBusy||['encerrada','erro'].includes(s.state.status)){res.sendStatus(409);return;}try{await s.turn(demoTurns[input.data.step]);res.json({ok:true});}catch{res.status(503).json({error:'Operação não concluída.'});}});
 app.post('/api/globo/native/new-session',async(_req,res)=>{const s=o.getSession();if(s.isBusy||(s.state.mode==='voice'&&!['encerrada','erro'].includes(s.state.status))){res.sendStatus(409);return;}try{s.finish('Nova sessão demonstrativa.');o.setSession(await o.createSession());res.json({ok:true});}catch{res.status(503).json({error:'Memória indisponível.'});}});
 app.post('/api/globo/native/end',(_req,res)=>{if(o.getSession().state.mode==='voice'){res.sendStatus(409);return;}o.getSession().finish();res.json({ok:true});});
 app.use('/globo/native',protect);
 if(o.staticDir)app.use('/globo/native',express.static(o.staticDir));
 app.get('/',(_req,res)=>res.redirect('/globo/native/'));
 app.use((_req,res)=>res.sendStatus(404));
 app.use((_err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{void _next;res.status(400).json({error:'Solicitação inválida.'});});
 return app;
}
