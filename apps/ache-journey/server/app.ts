import express from 'express';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { activityConfig, parseInput, type Input } from './contract';
export type Provider=(input:Input)=>Promise<{sid:string;status:string}>;
export function verifyJwt(token:string,secret:string){
 const parts=token.split('.');if(parts.length!==3)throw new Error('JWT');
 const header=JSON.parse(Buffer.from(parts[0],'base64url').toString());if(header.alg!=='HS256')throw new Error('Algorithm');
 const expected=createHmac('sha256',secret).update(`${parts[0]}.${parts[1]}`).digest();const actual=Buffer.from(parts[2],'base64url');
 if(actual.length!==expected.length||!timingSafeEqual(actual,expected))throw new Error('Signature');
 const payload=JSON.parse(Buffer.from(parts[1],'base64url').toString());const now=Date.now()/1000;
 if(typeof payload.exp!=='number'||payload.exp<=now||payload.nbf>now)throw new Error('Expiry');return payload;
}
export function createApp(env:NodeJS.ProcessEnv={},provider?:Provider,staticDir?:string){
 const app=express();app.disable('x-powered-by');
 app.use((req,res,next)=>{res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Cache-Control','no-store');
 const origin=req.headers.origin;if(req.method==='POST'&&origin&&!['http://127.0.0.1:5179','http://127.0.0.1:3004',env.ACHE_JOURNEY_PUBLIC_BASE_URL].includes(origin)){res.status(403).json({error:'Origem não autorizada'});return;}next();});
 app.use(express.text({type:['application/jwt','text/plain'],limit:'32kb'}));app.use(express.json({limit:'32kb'}));
 const configured=!!(env.TWILIO_ACCOUNT_SID&&env.TWILIO_AUTH_TOKEN&&env.ACHE_JOURNEY_WHATSAPP_FROM&&env.ACHE_JOURNEY_CONTENT_SID&&provider&&(!env.EXPECTED_TWILIO_ACCOUNT_SID||env.EXPECTED_TWILIO_ACCOUNT_SID===env.TWILIO_ACCOUNT_SID));
 const enabled=configured&&env.ACHE_JOURNEY_LIVE_ENABLED==='true';
 app.get('/api/readiness',(_req,res)=>res.json({configured,enabled,providerValidated:false,note:enabled?'Envio disponível mediante confirmação explícita.':'Demonstração offline. Envio real desativado; remetente e template específicos precisam de revisão.'}));
 app.get('/activity/config.json',(_req,res)=>res.json(activityConfig((env.ACHE_JOURNEY_PUBLIC_BASE_URL??'http://127.0.0.1:3004').replace(/\/$/,''),env.ACHE_JOURNEY_EXTENSION_KEY??'REPLACE_WITH_INSTALLED_PACKAGE_COMPONENT_KEY')));
 const simulate=(req:express.Request,res:express.Response)=>{try{const input=parseInput(req.body);if(req.body.scenario==='provider-failure'){res.status(input.errorBehavior==='continue'?200:502).json({executionMode:'simulation',providerStatus:'not_called',error:'Falha de provider simulada',continued:input.errorBehavior==='continue'});return;}res.json({executionMode:'simulation',providerStatus:'not_called',note:'Contrato recebido e validado. Nenhuma mensagem enviada.',mapped:input});}catch{res.status(400).json({error:'inArguments inválidos ou binding não resolvido'});}};
 app.post('/api/simulate',simulate);
 // Tenant-facing endpoints accept signed JWT only. They remain non-sending in this lab.
 app.use('/api/activity',(req,res,next)=>{try{if(!env.ACHE_JOURNEY_JWT_SECRET||typeof req.body!=='string')throw new Error('JWT required');req.body=verifyJwt(req.body,env.ACHE_JOURNEY_JWT_SECRET);next();}catch{res.status(401).json({error:'JWT assinado válido necessário'});}});
 app.post('/api/activity/execute',simulate);
 for(const action of ['save','validate','publish','unpublish','stop'])app.post(`/api/activity/${action}`,(req,res)=>{
 if(['save','validate','publish'].includes(action)){try{const args=req.body.arguments?.execute?.inArguments; if(!Array.isArray(args)||!args.length)throw new Error('Configuration');const merged=Object.assign({},...args);const phone=typeof merged.phone==='string'&&/^\{\{(?:Event|Contact)\.[^{}]+\}\}$/.test(merged.phone)?'+5500000000000':merged.phone;parseInput({inArguments:[{...merged,phone}]});res.json({valid:true});}catch{res.status(400).json({valid:false,error:'Configuração incompleta'});}}else res.json({accepted:true});});
 const pending=new Set<string>();const completed=new Map<string,{sid:string;status:string}>();
 app.post('/api/live',(req,res)=>{void(async()=>{if(!enabled){res.status(403).json({error:'Envio real desativado no servidor'});return;}if(req.body.confirmation!=='CONFIRMO ENVIO WHATSAPP'||req.body.optIn!==true){res.status(400).json({error:'Confirmação explícita e opt-in são necessários'});return;}
 let input:Input;try{input=parseInput(req.body);}catch{res.status(400).json({error:'Entrada inválida'});return;}
 if(input.sender!==env.ACHE_JOURNEY_WHATSAPP_FROM||input.contentSid!==env.ACHE_JOURNEY_CONTENT_SID){res.status(400).json({error:'Remetente/template diferentes da configuração revisada'});return;}
 const key=req.body.requestId;if(typeof key!=='string'||!/^[-\w]{8,100}$/.test(key)){res.status(400).json({error:'requestId necessário'});return;}
 if(completed.has(key)){res.json({executionMode:'real',...completed.get(key)});return;}if(pending.has(key)){res.status(409).json({error:'Envio em andamento'});return;}pending.add(key);
 try{const result=await provider!(input);if(!/^SM[0-9a-f]{32}$/i.test(result.sid)||!result.status)throw new Error('Provider response');completed.set(key,result);if(completed.size>100)completed.delete(completed.keys().next().value!);res.json({executionMode:'real',...result});}catch{res.status(502).json({error:'Provider não confirmou o envio. Resultado pode ser incerto; verifique Twilio antes de tentar novamente.'});}finally{pending.delete(key);}})();});
 if(staticDir){app.use(express.static(staticDir));app.get('/{*path}',(_req,res)=>res.sendFile(resolve(staticDir,'index.html')));}
 app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{void err;void _next;res.status(400).json({error:'Requisição inválida'});});return app;
}
