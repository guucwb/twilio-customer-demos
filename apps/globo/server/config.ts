import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
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
  return {voice,approvedTestCall:e.GLOBO_TEST_CALL_APPROVED==='true'&&e.TWILIO_VOICE_NUMBER&&e.DEMO_CUSTOMER_VOICE_PHONE?{from:e.TWILIO_VOICE_NUMBER,to:e.DEMO_CUSTOMER_VOICE_PHONE}:undefined,accountSid:e.TWILIO_ACCOUNT_SID??'',authToken:e.TWILIO_AUTH_TOKEN??'',publicBase:validatePublicBase(e.GLOBO_PUBLIC_URL??'https://gustsantos.ngrok.io'),panelPassword:e.GLOBO_PANEL_PASSWORD||readFileSync(path,'utf8').trim(),allowedCalls:(e.GLOBO_ALLOWED_CALL_SIDS??'').split(',').filter(x=>/^CA[0-9a-f]{32}$/i.test(x)),apiKey:e.OPENAI_API_KEY,model:e.GLOBO_OPENAI_MODEL||e.OPENAI_MODEL,aiEnabled:e.GLOBO_AI_ENABLED!=='false',port:3007};
}
export function validatePublicBase(value:string){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash||u.pathname!=='/')throw new Error('invalid-public-url');return u.origin;}
export type DemoConfig=ReturnType<typeof loadConfig>;
