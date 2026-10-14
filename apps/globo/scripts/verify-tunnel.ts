import twilio from 'twilio';
import { once } from 'node:events';
import { WebSocket } from 'ws';
import { loadConfig } from '../server/config';
const c=loadConfig();const auth='Basic '+Buffer.from('demo:'+c.panelPassword).toString('base64');
const checks:Record<string,number|string|boolean>={};
async function get(path:string,authenticated=false,extra:Record<string,string>={}){return fetch(c.publicBase+path,{headers:{'ngrok-skip-browser-warning':'1',...(authenticated?{Authorization:auth}:{}),...extra},signal:AbortSignal.timeout(10000)});}
try{
 checks.panelUnauthenticated=(await get('/globo/')).status;checks.apiUnauthenticated=(await get('/api/globo/state')).status;checks.panelAuthenticated=(await get('/globo/',true)).status;checks.apiAuthenticated=(await get('/api/globo/state',true)).status;checks.crossOrigin=(await get('/api/globo/state',true,{Origin:'https://untrusted.example.com'})).status;
 const body={AccountSid:c.accountSid,CallSid:'CA'+'0'.repeat(32)};const url=c.publicBase+'/globo/voice';
 const voice=async(signature?:string)=>fetch(url,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',...(signature?{'X-Twilio-Signature':signature}:{})},body:new URLSearchParams(body).toString(),signal:AbortSignal.timeout(10000)});
 checks.unsignedWebhook=(await voice()).status;checks.invalidSignature=(await voice('invalid')).status;
 const signed=await voice(twilio.getExpectedTwilioSignature(c.authToken,url,body));checks.signedUnapprovedCall=signed.status;checks.signedReachedApprovalGate=(await signed.text()).includes('Call not approved');
 const wsURL=c.publicBase.replace('https:','wss:')+'/globo/relay';
 const invalid=new WebSocket(wsURL,{headers:{'X-Twilio-Signature':'invalid'},handshakeTimeout:10000});invalid.on('error',()=>{});checks.invalidWebSocket=await new Promise<number>((resolve,reject)=>{invalid.on('unexpected-response',(_req,res)=>{resolve(res.statusCode!);invalid.terminate();});invalid.on('open',()=>{invalid.close();reject(new Error('unexpected-access'));});invalid.on('error',reject);});
 const ws=new WebSocket(wsURL,{headers:{'X-Twilio-Signature':twilio.getExpectedTwilioSignature(c.authToken,wsURL,{})},handshakeTimeout:10000});await once(ws,'open');checks.signedWebSocketUpgrade=true;const closed=once(ws,'close');ws.send(JSON.stringify({type:'prompt',voicePrompt:'férias',last:true}));checks.webSocketWithoutSetup=(await closed)[0];
 const ok=checks.panelUnauthenticated===401&&checks.apiUnauthenticated===401&&checks.panelAuthenticated===200&&checks.apiAuthenticated===200&&checks.crossOrigin===403&&checks.unsignedWebhook===403&&checks.invalidSignature===403&&checks.signedUnapprovedCall===403&&checks.signedReachedApprovalGate===true&&checks.invalidWebSocket===403&&checks.signedWebSocketUpgrade===true&&checks.webSocketWithoutSetup===1008;
 console.info(JSON.stringify({publicTunnelVerified:ok,checks,signatureTests:'locally-signed synthetic requests; not a live Twilio call'},null,2));if(!ok)process.exitCode=1;
}catch{console.info(JSON.stringify({publicTunnelVerified:false,checks,error:'Network or access validation failed; provider details discarded'}));process.exitCode=1;}
