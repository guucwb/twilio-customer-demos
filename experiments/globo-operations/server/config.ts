import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { nativeOptions } from './native';
import { voiceConfig, parseElevenLabsVoice } from './voice';
export const appRoot=fileURLToPath(new URL('../',import.meta.url));
export function loadConfig(){
  const rootPath=fileURLToPath(new URL('../../../.env',import.meta.url));
  const root=existsSync(rootPath)?dotenv.parse(readFileSync(rootPath)):{};
  const localPath=appRoot+'.env.local';const local=existsSync(localPath)?dotenv.parse(readFileSync(localPath)):{};
  const defaults=dotenv.parse(readFileSync(appRoot+'.env.example'));
  const e={...defaults,...root,...local,...process.env};
  if(e.EXPECTED_TWILIO_ACCOUNT_SID&&e.TWILIO_ACCOUNT_SID!==e.EXPECTED_TWILIO_ACCOUNT_SID)throw new Error('twilio-account-mismatch');
  const voice=voiceConfig(e);if(voice.ttsProvider==='ElevenLabs')parseElevenLabsVoice(voice.voice);
  const path=appRoot+'.demo-data/panel-password.txt';mkdirSync(appRoot+'.demo-data',{recursive:true,mode:0o700});
  if(!existsSync(path))writeFileSync(path,randomBytes(32).toString('base64url'),{mode:0o600,flag:'wx'});
  if(e.GLOBO_OPERATIONS_REMOTE_APPROVED!=='true'&&['GLOBO_TEST_CALL_APPROVED','GLOBO_INTELLIGENCE_ENABLED','GLOBO_ORCHESTRATOR_ENABLED','GLOBO_OP_MEMORY_ENABLED','GLOBO_NATIVE_ANALYSIS_APPROVED','GLOBO_WHATSAPP_TEST_APPROVED','GLOBO_AUDIO_TRANSCRIPTION_APPROVED'].some(k=>e[k]==='true'))throw new Error('operations-remote-use-not-approved');
  const native=nativeOptions(e);const port=Number(e.GLOBO_PORT??3009);if(!Number.isInteger(port)||port<1024||port>65535)throw new Error('invalid-port');
  return {nativeAnalysisApproved:e.GLOBO_NATIVE_ANALYSIS_APPROVED==='true',nativeConversationConfigurationId:e.GLOBO_CONVERSATION_CONFIGURATION_ID??'',nativeIntelligenceId:e.GLOBO_NATIVE_INTELLIGENCE_CONFIGURATION_ID??'',nativeLiveConversationIds:(e.GLOBO_NATIVE_LIVE_CONVERSATION_IDS??'').split(',').filter(Boolean),nativeConversationIds:(e.GLOBO_NATIVE_CONVERSATION_IDS??'').split(',').filter(Boolean),nativeOperatorIds:{operational_impact:e.GLOBO_OPERATOR_IMPACT_ID??'',resolution_integrity:e.GLOBO_OPERATOR_INTEGRITY_ID??'',operational_friction:e.GLOBO_OPERATOR_FRICTION_ID??''},opMemoryEnabled:e.GLOBO_OP_MEMORY_ENABLED==='true',opMemoryApproved:e.GLOBO_OP_MEMORY_USE_APPROVED==='true',opMemoryWrites:e.GLOBO_OP_MEMORY_WRITES_APPROVED==='true',opStore:e.GLOBO_OP_MEMORY_STORE_ID??'',opProfile:e.GLOBO_OP_MEMORY_PROFILE_ID??'',whatsappEnabled:e.GLOBO_WHATSAPP_TEST_APPROVED==='true',whatsappFrom:e.DEMO_CUSTOMER_WHATSAPP??'',whatsappTo:e.GLOBO_DEDICATED_WHATSAPP_SENDER??'',audioApproved:e.GLOBO_AUDIO_TRANSCRIPTION_APPROVED==='true',audioModel:e.GLOBO_AUDIO_MODEL??'',memoryProvider:e.GLOBO_MEMORY_PROVIDER??'local',memoryStoreId:e.GLOBO_MEMORY_STORE_ID??'',memoryProfileId:e.GLOBO_MEMORY_PROFILE_ID??'',memoryValidated:e.GLOBO_MEMORY_DEDICATED_VALIDATED==='true',memoryWritesApproved:e.GLOBO_MEMORY_WRITES_APPROVED==='true',native,voice,approvedTestCall:e.GLOBO_TEST_CALL_APPROVED==='true'&&e.TWILIO_VOICE_NUMBER&&e.DEMO_CUSTOMER_VOICE_PHONE?{from:e.TWILIO_VOICE_NUMBER,to:e.DEMO_CUSTOMER_VOICE_PHONE}:undefined,accountSid:e.TWILIO_ACCOUNT_SID??'',authToken:e.TWILIO_AUTH_TOKEN??'',publicBase:validatePublicBase(e.GLOBO_PUBLIC_URL??'https://gustsantos.ngrok.io'),panelPassword:e.GLOBO_PANEL_PASSWORD||readFileSync(path,'utf8').trim(),allowedCalls:(e.GLOBO_ALLOWED_CALL_SIDS??'').split(',').filter(x=>/^CA[0-9a-f]{32}$/i.test(x)),apiKey:e.OPENAI_API_KEY,model:e.GLOBO_OPENAI_MODEL||e.OPENAI_MODEL,aiEnabled:e.GLOBO_AI_ENABLED!=='false',port};
}
export function validatePublicBase(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('invalid-public-url');return u.origin;}
export type DemoConfig=ReturnType<typeof loadConfig>;
