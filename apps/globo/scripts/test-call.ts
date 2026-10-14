import twilio from 'twilio';
import { loadConfig } from '../server/config';
const c=loadConfig();
if(!process.argv.includes('--approved-one-call')||!c.approvedTestCall){console.info(JSON.stringify({callCreated:false,reason:'Explicit single-call authorization and dedicated test resource required'}));process.exitCode=1;}else{
 let callSid:string|undefined;
 const client=twilio(c.accountSid,c.authToken,{timeout:15000,logLevel:'silent',autoRetry:false});
 try{
  const r=await fetch('http://127.0.0.1:3007/api/globo/prepare-test-call',{method:'POST',headers:{Authorization:'Basic '+Buffer.from('demo:'+c.panelPassword).toString('base64'),Origin:'http://127.0.0.1:3007','X-Globo-Demo':'1','Content-Type':'application/json'},body:'{}'});
  if(!r.ok)throw new Error('permit-denied');const {url}=await r.json() as {url:string};
  const call=await client.calls.create({...c.approvedTestCall,url,method:'POST',timeLimit:120,timeout:25,record:false});callSid=call.sid;
  console.info(JSON.stringify({callCreated:true,status:call.status,timeLimitSeconds:120,webhooksModified:false,recording:false}));
  let last='';const start=Date.now();
  while(Date.now()-start<150000){const current=await client.calls(callSid).fetch();if(current.status!==last){last=current.status;console.info(JSON.stringify({callStatus:last}));}if(['completed','busy','failed','no-answer','canceled'].includes(last))break;await new Promise(r=>setTimeout(r,2000));}
  if(!['completed','busy','failed','no-answer','canceled'].includes(last))await client.calls(callSid).update({status:'completed'});
  const state=await(await fetch('http://127.0.0.1:3007/api/globo/state',{headers:{Authorization:'Basic '+Buffer.from('demo:'+c.panelPassword).toString('base64')}})).json();
  console.info(JSON.stringify({callStatus:last,relayConnected:state.events?.some((e:{name:string})=>e.name==='Relay conectado'),agentTurns:state.quality?.turns,lastAgentSource:state.transcript?.at(-1)?.source,firstAgentTokenMs:state.quality?.firstTokenMs,firstSpeechChunkMs:state.quality?.firstSpeechChunkMs,voiceConfigured:c.voice.ttsProvider,language:c.voice.ttsLanguage,audioQuality:'Requires listener feedback; no subjective score invented'}));
 }catch(error){console.info(JSON.stringify({callCreated:Boolean(callSid),errorCode:typeof (error as {code?:number}).code==='number'?(error as {code:number}).code:undefined,status:(error as {status?:number}).status,details:'Call test failed; provider details discarded'}));process.exitCode=1;if(callSid)await client.calls(callSid).update({status:'completed'}).catch(()=>{});}
}
