import {describe,it,expect} from 'vitest';
import {initial,messages,operators,reducer,signals} from './demo';
describe('sequência da apresentação',()=>{
 it('exibe mensagens na ordem, conclui análise e impede ultrapassar o fim',()=>{let s={...initial};for(let i=1;i<=9;i++){s=reducer(s,{type:'next'});expect(s.step).toBe(i)}expect(messages).toHaveLength(8);expect(reducer(s,{type:'next'}).step).toBe(9);expect(operators.every(o=>o.at<=s.step)).toBe(true)});
 it('reset elimina progresso, playback e navegação',()=>{expect(reducer({step:7,playing:true,view:'insights'},{type:'reset'})).toEqual(initial)});
 it('pausa preserva progresso e navegar cancela autoplay',()=>{const s=reducer({...initial,step:4},{type:'play'});expect(s.playing).toBe(true);expect(reducer(s,{type:'pause'})).toEqual({...s,playing:false});expect(reducer(s,{type:'navigate',view:'review'})).toEqual({...s,playing:false,view:'review'})});
 it('autoplay para ao concluir e não reinicia no fim',()=>{const s=reducer({step:8,playing:true,view:'live'},{type:'next'});expect(s.playing).toBe(false);expect(reducer(s,{type:'play'}).playing).toBe(false)});
 it('urgência e intenção de compra só surgem após evidência da mensagem 5',()=>{for(const label of ['Urgência','Intenção de compra','Sensibilidade a preço'])expect(signals.find(s=>s.label===label)?.at).toBe(5);expect(operators.find(o=>o.name==='Sinal de compra')?.evidence).toContain('compro tudo')});
});
