// Restores only public voice-note settings; never prints/copies credentials.
import {readFile,writeFile,rename} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const allowed=new Set(['GLOBO_AUDIO_TTS_VOICE_ID','GLOBO_AUDIO_TTS_MODEL','GLOBO_AUDIO_TTS_SPEED','GLOBO_AUDIO_TTS_STABILITY','GLOBO_AUDIO_TTS_SIMILARITY','GLOBO_AUDIO_TTS_STYLE']);
const {settings}=JSON.parse(await readFile(root+'.demo-data/tts-v2-rollback.json','utf8'));
if(settings.GLOBO_AUDIO_TTS_MODEL!=='eleven_multilingual_v2'||Object.entries(settings).some(([k,v])=>!allowed.has(k)||typeof v!=='string'||! /^[A-Za-z0-9_.]+$/.test(v)))throw Error('Invalid public rollback settings');
const path=root+'.env.local',original=await readFile(path,'utf8'),lines=original.split('\n');
for(const [k,v]of Object.entries(settings)){const i=lines.findIndex(l=>l.startsWith(k+'='));if(i<0)lines.push(k+'='+v);else lines[i]=k+'='+v;}
const restored=lines.join('\n');const calling=s=>s.split('\n').filter(l=>l.startsWith('GLOBO_TTS_')).join('\n');
if(calling(original)!==calling(restored))throw Error('Calling changed unexpectedly');
await writeFile(path+'.rollback-tmp',restored,{mode:0o600});await rename(path+'.rollback-tmp',path);
console.log('Voice-note v2 settings restored locally. Reload only the idle native server; Calling remains unchanged.');
