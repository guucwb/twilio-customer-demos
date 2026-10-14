import { describe,it,expect } from 'vitest';
import { SpeechChunks } from './speech';
describe('punctuation and context for ElevenLabs',()=>{
 it('buffers token fragments and preserves punctuation, accents and spaces exactly',()=>{const out:{token:string;last:boolean}[]=[];const b=new SpeechChunks((token,last)=>out.push({token,last}),20,100);const text='Oi, Rafael! Lembro da sua solicitação de férias. Quer revisar as datas?';for(const token of text.match(/.{1,3}/g)!)b.push(token);b.push('',true);expect(out.length).toBeLessThan(6);expect(out.map(x=>x.token).join('')).toBe(text);expect(out[0].token).toContain('Oi, Rafael! Lembro');expect(out.at(-1)?.last).toBe(true);});
 it('never emits stale buffered speech after an interruption',()=>{const tokens:string[]=[];const b=new SpeechChunks(t=>tokens.push(t));b.push('Um texto incompleto');b.cancel();b.push('não emitir',true);expect(tokens).toEqual([]);});
 it('does not interpret decimal points as sentence boundaries',()=>{const out:string[]=[];const b=new SpeechChunks(t=>out.push(t),10,100);b.push('Velocidade 1.05 e estabilidade 0.6. ');b.push('Tudo certo?',true);expect(out[0]).toBe('Velocidade 1.05 e estabilidade 0.6. ');});
 it('bounds latency for long sentences by splitting at word boundaries',()=>{const out:string[]=[];const b=new SpeechChunks(t=>out.push(t),10,30);const text='Esta frase longa usa várias palavras sem pontuação até seu encerramento';b.push(text);b.push('',true);expect(out.length).toBeGreaterThan(1);expect(out.map(t=>t).join('')).toBe(text);expect(out[0].length).toBeLessThanOrEqual(31);});
});
