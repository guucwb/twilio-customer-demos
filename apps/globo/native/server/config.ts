import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
import {voiceConfig} from './voice';
export const appRoot=fileURLToPath(new URL('../../',import.meta.url));
export const targetAccount=existsSync(appRoot+'.env.local')?dotenv.parse(readFileSync(appRoot+'.env.local')).EXPECTED_TWILIO_ACCOUNT_SID??'':'';
export function loadConfig(){
 const local=dotenv.parse(readFileSync(appRoot+'.env.local'));
 const defaults=dotenv.parse(readFileSync(appRoot+'.env.example'));
 const root=dotenv.parse(readFileSync(new URL('../../../../.env',import.meta.url)));
 // Twilio credentials MUST be atomic and local; global values are only used for
 // the already authorized LLM adapter and the fictitious test customer's address.
 if(!/^AC[0-9a-f]{32}$/i.test(targetAccount)||local.TWILIO_ACCOUNT_SID!==targetAccount||local.EXPECTED_TWILIO_ACCOUNT_SID!==targetAccount||!local.TWILIO_AUTH_TOKEN)throw new Error('target-credentials-incomplete');
 const e={...defaults,...local};
 const resourcesPath=appRoot+'.demo-data/target-resources.json';
 let resources=existsSync(resourcesPath)?JSON.parse(readFileSync(resourcesPath,'utf8')):{};
 if(resources.targetAccount!==targetAccount)throw new Error('target-resource-account-mismatch');
 const originalDataRoot=appRoot+'.demo-data/'+targetAccount+'/';
 const scenePath=appRoot+'.demo-data/active-scenario.json';
 const scene=existsSync(scenePath)?JSON.parse(readFileSync(scenePath,'utf8')):undefined;
 if(scene&&(!/^gustavo-[a-z0-9-]{1,40}$/.test(scene.id)||scene.accountSid!==targetAccount||scene.identity!=='gustavo-demo'||!scene.prepared))throw new Error('invalid-active-scenario');
 if(scene)resources={...resources,memoryStoreId:scene.memoryStoreId,profileId:scene.profileId,orchestratorId:scene.orchestratorId};
 const identity:'gustavo-demo'|'rafael-demo'=scene?'gustavo-demo':'rafael-demo';const employeeName=scene?'Gustavo Santos':'Rafael';
 const dataRoot=scene?originalDataRoot+'scenarios/'+scene.id+'/':originalDataRoot;mkdirSync(dataRoot,{recursive:true,mode:0o700});
 const publicBase=new URL(e.GLOBO_PUBLIC_URL??'https://gustsantos.ngrok.io');if(publicBase.protocol!=='https:'||publicBase.pathname!=='/'||publicBase.search||publicBase.username||publicBase.password)throw new Error('invalid-public-base');
 return {resources,dataRoot,originalDataRoot,sceneId:scene?.id,identity,employeeName,port:3010,accountSid:targetAccount,authToken:local.TWILIO_AUTH_TOKEN,publicBase:publicBase.origin,panelPassword:readFileSync(appRoot+'.demo-data/panel-password.txt','utf8').trim(),voice:voiceConfig(e),audioModel:e.GLOBO_AUDIO_MODEL||'gpt-4o-mini-transcribe',audioTts:{apiKey:local.ELEVENLABS_API_KEY||root.ELEVENLABS_API_KEY,voiceId:e.GLOBO_AUDIO_TTS_VOICE_ID||'',model:e.GLOBO_AUDIO_TTS_MODEL||'',speed:Number(e.GLOBO_AUDIO_TTS_SPEED),stability:Number(e.GLOBO_AUDIO_TTS_STABILITY),similarity:Number(e.GLOBO_AUDIO_TTS_SIMILARITY),style:Number(e.GLOBO_AUDIO_TTS_STYLE??0),enabled:e.GLOBO_AUDIO_TTS_ENABLED!=='false',ttlSeconds:Number(e.GLOBO_AUDIO_MEDIA_TTL_SECONDS)},apiKey:root.OPENAI_API_KEY,model:e.GLOBO_OPENAI_MODEL||root.OPENAI_MODEL,aiEnabled:!!root.OPENAI_API_KEY,
  native:resources.orchestratorId?{conversationConfiguration:resources.orchestratorId}:{},allowedCalls:[] as string[],approvedTestCall:undefined,
  whatsappFrom:local.DEMO_CUSTOMER_WHATSAPP||root.DEMO_CUSTOMER_WHATSAPP||'',whatsappTo:'whatsapp:+554123911383',
  nativeOperatorIds:resources.operatorIds??{},nativeIntelligenceId:resources.intelligenceId??'',nativeConversationConfigurationId:resources.orchestratorId??'',
  opStore:resources.memoryStoreId??'',opProfile:resources.profileId??''};
}
