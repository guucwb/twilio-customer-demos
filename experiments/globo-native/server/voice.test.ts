import { describe,it,expect } from 'vitest';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { voiceConfig,parseElevenLabsVoice } from './voice';
const env=dotenv.parse(readFileSync(new URL('../.env.example',import.meta.url)));
describe('environment-owned Globo voice',()=>{
 it('preserves the exact ElevenLabs voice identifier and settings',()=>{const c=voiceConfig(env);expect(c).toMatchObject({ttsProvider:'ElevenLabs',ttsLanguage:'pt-BR',voice:'5p4THmLc2S6kXKO1pOM5-1.06_0.5_0.8'});expect(parseElevenLabsVoice(c.voice)).toEqual({id:'5p4THmLc2S6kXKO1pOM5',speed:1.06,stability:.5,similarity:.8});});
 it('honors explicit environment overrides',()=>{expect(voiceConfig({...env,GLOBO_TTS_LANGUAGE:'pt-PT'}).ttsLanguage).toBe('pt-PT');});
 it('fails closed on invalid provider or voice settings',()=>{expect(()=>voiceConfig({...env,GLOBO_TTS_PROVIDER:'bad'})).toThrow();expect(()=>parseElevenLabsVoice('bad')).toThrow();expect(()=>parseElevenLabsVoice('5p4THmLc2S6kXKO1pOM5-2_0.6_0.8')).toThrow();});
});
