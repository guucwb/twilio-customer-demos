import {describe,it,expect} from 'vitest';
import {nodes,edges,delta,mapInput,defaults,initialState,checklist,questions} from './model';
describe('representative Journey',()=>{
 it('classifies only the synthetic graph',()=>{expect(delta()).toEqual({preserve:9,replace:1,validate:2});expect(nodes.find(n=>n.id==='consent')?.kind).toBe('validate');expect(nodes.find(n=>n.id==='engagement')?.kind).toBe('validate');});
 it('keeps graph positions and edges for before/after',()=>{expect(nodes).toHaveLength(12);expect(edges).toHaveLength(11);expect(nodes.filter(n=>n.kind==='replace').map(n=>n.id)).toEqual(['wa']);});
 it('resolves synthetic personalization and rejects unknown bindings',()=>{expect(mapInput(defaults).inArguments[0]).toMatchObject({contactKey:'mariana-123',variables:{'1':'Mariana'}});expect(()=>mapInput({...defaults,phone:'{{Event.UNKNOWN.Phone}}'})).toThrow('Binding');});
 it('resets all assessment evidence and undetermined score',()=>{const a=initialState();a.statuses[0]='Confirmado';a.notes[0]='data';expect(initialState()).toEqual({statuses:checklist.map(()=>'Desconhecido'),notes:questions.map(()=>''),impact:'',impactReason:''});});
 it('has WhatsApp only',()=>expect(JSON.stringify({nodes,defaults})).not.toMatch(/rcs|sendgrid|sms|email/i));
});
