import express from 'express';
import helmet from 'helmet';
import twilio from 'twilio';
import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { demoTurns } from '../shared/model';
import { HRSession } from './agent';
import { RelayRegistry } from './relay';
import type { voiceConfig } from './voice';
export interface AppOptions {approvedTestCall?:{from:string;to:string};voice:ReturnType<typeof voiceConfig>;authToken:string;accountSid:string;publicBase:string;panelPassword:string;allowedCalls:string[];session:HRSession;registry:RelayRegistry;getSession:()=>HRSession;createSession:()=>Promise<HRSession>;setSession:(s:HRSession)=>void;staticDir?:string;}
function equal(a:string,b:string){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb);}
export function createApp(o:AppOptions){
 let permit:{nonce:string;expires:number;callSid?:string}|undefined;
 const app=express();app.disable('x-powered-by');app.use(helmet({contentSecurityPolicy:{directives:{'upgrade-insecure-requests':null}}}));app.use((_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
 app.use('/globo',express.urlencoded({extended:false,limit:'12kb'}));
 const signed=(req:express.Request,res:express.Response,next:express.NextFunction)=>{const sig=req.get('x-twilio-signature');if(!sig||!o.authToken||!twilio.validateRequest(o.authToken,sig,o.publicBase+req.originalUrl,req.body)){res.sendStatus(403);return;}if(req.body.AccountSid!==o.accountSid){res.sendStatus(403);return;}next();};
 app.post('/globo/voice',signed,async(req,res)=>{
  const call=req.body.CallSid;
  if(permit&&o.approvedTestCall&&req.query.testPermit===permit.nonce&&permit.expires>Date.now()&&req.body.From===o.approvedTestCall.from&&req.body.To===o.approvedTestCall.to&&(!permit.callSid||permit.callSid===call)&&/^CA[0-9a-f]{32}$/i.test(call)){permit.callSid=call;if(!o.allowedCalls.includes(call))o.allowedCalls.push(call);}
  if(!o.allowedCalls.includes(call)){res.status(403).type('text/plain').send('Call not approved for isolated demo');return;}
  try{const ticket=await o.registry.issue(call);o.setSession(ticket.session);const r=new twilio.twiml.VoiceResponse();const connect=r.connect({action:o.publicBase+'/globo/voice/end',method:'POST'});const relay=connect.conversationRelay({url:o.publicBase.replace(/^https:/,'wss:')+'/globo/relay',...o.voice,language:o.voice.transcriptionLanguage,interruptible:'any',welcomeGreeting:'Olá. Esta é uma demonstração com o perfil fictício de Rafael. Use apenas dados fictícios. Sua fala será transcrita pela Twilio e normalizada para o roteiro de férias. Como posso ajudar?',welcomeGreetingInterruptible:'any',partialPrompts:false,dtmfDetection:true});relay.parameter({name:'demoSession',value:ticket.nonce});res.type('text/xml').send(r.toString());}catch{res.status(503).type('text/xml').send('<Response><Hangup/></Response>');}
 });
 app.post('/globo/voice/end',signed,(req,res)=>{if(!o.allowedCalls.includes(req.body.CallSid)||!o.registry.has(req.body.CallSid)){res.sendStatus(403);return;}o.registry.finish(req.body.CallSid);res.type('text/xml').send('<Response><Hangup/></Response>');});
 const protect=(req:express.Request,res:express.Response,next:express.NextFunction)=>{
  const localHosts=['127.0.0.1:3007','localhost:3007','127.0.0.1:5177','localhost:5177'];
  const local=localHosts.includes(req.get('host')??'')&&['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress??'')&&!req.get('x-forwarded-for')&&!req.get('x-forwarded-host');
  // Tunnel requests can never take the local shortcut, even with Host rewriting.
  if(!local){let credentials='';try{if(req.get('authorization')?.startsWith('Basic '))credentials=Buffer.from(req.get('authorization')!.slice(6),'base64').toString();}catch{ /* Invalid encoding stays unauthorized. */ }
   if(!o.panelPassword||!equal(credentials,'demo:'+o.panelPassword)){res.setHeader('WWW-Authenticate','Basic realm="Globo demo", charset="UTF-8"');res.sendStatus(401);return;}}
  const origin=req.get('origin');const allowedOrigins=['http://127.0.0.1:5177','http://localhost:5177','http://127.0.0.1:3007','http://localhost:3007',o.publicBase];
  if(origin&&!allowedOrigins.includes(origin)){res.sendStatus(403);return;}
  if(req.method==='POST'&&(!origin||!req.is('application/json')||req.get('x-globo-demo')!=='1')){res.sendStatus(403);return;}next();
 };
 app.use('/api/globo',protect,express.json({limit:'8kb'}));
 app.post('/api/globo/prepare-test-call',(_req,res)=>{if(!o.approvedTestCall||permit){res.sendStatus(403);return;}permit={nonce:randomUUID(),expires:Date.now()+120000};res.json({url:o.publicBase+'/globo/voice?testPermit='+permit.nonce});});
 app.get('/api/globo/state',(_req,res)=>res.json(o.getSession().state));
 app.get('/api/globo/health',(_req,res)=>res.json({ok:true,synthetic:true,approvedCalls:o.allowedCalls.length,voiceReady:Boolean(o.allowedCalls.length&&o.authToken&&o.accountSid),onboarding:o.getSession().state.events.some(e=>e.name==='Relay conectado')?'session-connected':'not-verified',whatsapp:'pending'}));
 app.post('/api/globo/turn',async(req,res)=>{const input=z.object({step:z.number().int().min(0).max(demoTurns.length-1)}).strict().safeParse(req.body);if(!input.success){res.sendStatus(400);return;}const s=o.getSession();if(s.state.mode==='voice'||s.isBusy||['encerrada','erro'].includes(s.state.status)){res.sendStatus(409);return;}try{await s.turn(demoTurns[input.data.step]);res.json({ok:true});}catch{res.status(503).json({error:'Operação não concluída.'});}});
 app.post('/api/globo/new-session',async(_req,res)=>{const s=o.getSession();if(s.isBusy||(s.state.mode==='voice'&&!['encerrada','erro'].includes(s.state.status))){res.sendStatus(409);return;}try{s.finish('Nova sessão demonstrativa.');o.setSession(await o.createSession());res.json({ok:true});}catch{res.status(503).json({error:'Memória indisponível.'});}});
 app.post('/api/globo/end',(_req,res)=>{if(o.getSession().state.mode==='voice'){res.sendStatus(409);return;}o.getSession().finish();res.json({ok:true});});
 app.use('/globo',protect);
 if(o.staticDir)app.use('/globo',express.static(o.staticDir));
 app.get('/',(_req,res)=>res.redirect('/globo/'));
 app.use((_req,res)=>res.sendStatus(404));
 app.use((_err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{void _next;res.status(400).json({error:'Solicitação inválida.'});});
 return app;
}
