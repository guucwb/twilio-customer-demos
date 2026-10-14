// Authorized fictional sample only; never logs SDK objects, secrets or signed URLs.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import twilio from 'twilio';
import {loadConfig} from '../native/server/config';
import {ElevenLabsSpeech,convertToOpus} from '../native/server/tts';
import {SignedAudioStore} from '../native/server/outgoing-media';
async function main(){
 const c=loadConfig(),path=c.dataRoot+'note-tts-sample-proof.json';
 try{await readFile(path);throw Error('sample-already-recorded');}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 if(!c.audioTts.apiKey)throw Error('credential-missing');
 const tts=new ElevenLabsSpeech({...c.audioTts,apiKey:c.audioTts.apiKey});const access=await tts.verify();
 const client=twilio(c.accountSid,c.authToken);
 const jobs=JSON.parse(await readFile(c.dataRoot+'audio.json','utf8'));const entries=Array.isArray(jobs)?jobs:Object.values(jobs);const last=entries.at(-1) as {messageSid:string};
 const inbound=await client.messages(last.messageSid).fetch();
 if(inbound.accountSid!==c.accountSid||inbound.from!==c.whatsappFrom||inbound.to!==c.whatsappTo||inbound.direction!=='inbound'||Date.now()-inbound.dateCreated.getTime()>23.9*3600000)throw Error('sample-window-or-scope');
 const text='Oi, Rafael! Esta é uma amostra da voz da demo. Dois kits completos de microfone para o estúdio cinco, certo? O prazo informado é de meia hora. A disponibilidade ainda precisa ser verificada.';
 const started=Date.now(),mp3=await tts.synthesize(text),synthesisMs=Date.now()-started,ogg=await convertToOpus(mp3);
 const media=await new SignedAudioStore({directory:c.dataRoot+'outgoing-audio',publicBase:c.publicBase,ttlSeconds:c.audioTts.ttlSeconds}).init();const published=await media.publish(ogg.bytes);
 const get=await fetch(published.url,{redirect:'error'}),bytes=new Uint8Array(await get.arrayBuffer());const head=await fetch(published.url,{method:'HEAD',redirect:'error'});
 if(get.status!==200||head.status!==200||get.headers.get('content-type')!=='audio/ogg'||createHash('sha256').update(bytes).digest('hex')!==published.sha256)throw Error('public-media-not-validated');
 let messageSid:string|undefined,status:string|undefined;
 if(process.argv.includes('--send-sample')){
  const m=await client.messages.create({from:c.whatsappTo,to:c.whatsappFrom,mediaUrl:[published.url]});messageSid=m.sid;
  // Persist acceptance before polling: rerun cannot send a duplicate sample.
  await writeFile(path,JSON.stringify({at:new Date().toISOString(),kind:'TTS sample, not dynamic inbound proof',messageSid,status:m.status}),{mode:0o600});
  for(let i=0;i<20;i++){const row=await client.messages(messageSid).fetch();if(row.accountSid!==c.accountSid||row.from!==c.whatsappTo||row.to!==c.whatsappFrom)throw Error('sample-message-scope');status=row.status;if(['delivered','read','failed','undelivered'].includes(status))break;await new Promise(r=>setTimeout(r,1500));}
 }
 const proof={at:new Date().toISOString(),kind:'TTS sample, not dynamic inbound proof',...access,settings:{speed:c.audioTts.speed,stability:c.audioTts.stability,similarity:c.audioTts.similarity,style:c.audioTts.style},text,synthesisMs,durationMs:ogg.durationMs,codec:ogg.codec,container:ogg.container,sha256:published.sha256,publicGet:get.status,publicHead:head.status,messageSid,status,humanPlaybackConfirmed:false};
 await writeFile(path,JSON.stringify(proof,null,2),{mode:0o600});console.log(JSON.stringify(proof));
}
main().catch(e=>{const msg=(e as Error).message;console.error(/^(sample-|elevenlabs-|tts-|public-media-|credential-)/.test(msg)?msg:'Sample validation failed; private details suppressed.');process.exitCode=1;});
