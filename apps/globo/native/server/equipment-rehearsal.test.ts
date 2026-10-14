import {describe,it,expect,vi} from 'vitest';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {normalizeOperation} from './ops-normalize';
import {OperationsJourney} from './operations';
import {MockEquipmentExecution} from './execution';
import {AudioReplyComposer} from './voice-reply';
const turn=(j:OperationsJourney,text:string,id:string)=>j.execute(normalizeOperation(text)!.operation!,id,'whatsapp-audio');
const fixture=()=>{const adapter=new MockEquipmentExecution(undefined,{identity:'gustavo-demo',seedHistory:false,firstRequestNumber:2001});return {adapter,journey:new OperationsJourney(adapter,'gustavo-demo')};};
describe('14 October rehearsal regressions — local tools and mocked providers only',()=>{
 it.each([
 ['Preciso de 2 kits completos de microfone no estúdio 4, compatíveis com Demo RX.',2,'kit de microfone sem fio',true],
 ['Preciso de dois kits completos de microfone no estúdio quatro, compatíveis com Demo RX.',2,'kit de microfone sem fio',true],
 ['Preciso de 3 microfones no estúdio 4, compatíveis com Demo RX.',3,'microfone',false],
 ['Eu preciso de três microfones no estúdio 4 e ele precisa ser compatível com a demo RX.',3,'microfone',false]
 ])('retains all entities, requests confirmation and does not convert individual microphones: %s',async(text,quantity,equipment,completeKit)=>{
  const {adapter,journey}=fixture();const question=await turn(journey,text,'request');expect((await journey.snapshot()).draft).toMatchObject({quantity,equipment,completeKit,location:4,compatibility:'DEMO-RX'});expect(question).toContain('Confirma');expect(question).not.toContain('Informe apenas');expect(await adapter.history('gustavo-demo')).toHaveLength(0);
  const reply=await turn(journey,'Confirmo a abertura','confirm');expect(reply).toContain('estúdio 4');expect((await journey.snapshot()).active).toMatchObject({quantity,equipment,completeKit,location:4});expect(reply).toContain(equipment==='microfone'?'microfones individuais':'kits completos');
 });
 it('replays the real failed sequence, merging compatibility before the same-turn confirmation',async()=>{
  const {adapter,journey}=fixture();await turn(journey,'Agora eu preciso de dois kits completos de microfone sem fio para o estúdio 4. A gravação começa daqui meia hora.','initial');
  const result=await turn(journey,'São compatíveis com o sistema Demo RX. Pode confirmar a solicitação.','compat-confirm');expect(result).toContain('EQ-DEMO-2001');expect((await journey.snapshot()).active).toMatchObject({quantity:2,location:4,completeKit:true,compatibility:'DEMO-RX'});expect((await journey.snapshot()).active?.deadlineText).toContain('30 minutos');expect(await adapter.history('gustavo-demo')).toHaveLength(1);
 });
 it('asks only for missing fields and preserves partial input across independent turns',async()=>{
  const {journey}=fixture();let reply=await turn(journey,'Preciso de 3 microfones.','quantity');expect(reply).toContain('estúdio');expect(reply).not.toContain('quantidade');
  reply=await turn(journey,'No estúdio quatro','location');expect(reply).toContain('receptor');expect(reply).not.toContain('estúdio');expect(reply).not.toContain('quantidade');
  reply=await turn(journey,'Compatíveis com Demo RX','compat');expect(reply).toContain('3 microfones individuais');expect(reply).toContain('Confirma');await turn(journey,'sim','confirm');expect((await journey.snapshot()).active).toMatchObject({quantity:3,equipment:'microfone',location:4,compatibility:'DEMO-RX'});
 });
 it('corrects 2 kits to 3 individual units without erasing location, deadline or compatibility',async()=>{
  const {journey}=fixture();await turn(journey,'Preciso de dois kits completos no estúdio 4, Demo RX, em meia hora.','first');await turn(journey,'Preciso de 3 microfones.','correction');expect((await journey.snapshot()).draft).toMatchObject({quantity:3,equipment:'microfone',completeKit:false,location:4,compatibility:'DEMO-RX'});expect((await journey.snapshot()).draft?.deadlineText).toContain('30 minutos');
 });
 it('duplicates create/update events safely and preserves history and native-memory calls (mock only)',async()=>{
  const adapter=fixture().adapter;let refs:string[]=[];const memory={recover:vi.fn(async()=>({profileId:'test-profile',retrievedAt:new Date().toISOString(),references:refs})),remember:vi.fn(async(ids:string[])=>{refs=ids;})};const journey=new OperationsJourney(adapter,'gustavo-demo',true,memory as any);
  await turn(journey,'Preciso de três microfones no estúdio 4, Demo RX.','request');const replies=await Promise.all([turn(journey,'sim','confirm'),turn(journey,'sim','confirm')]);expect(replies[0]).toBe(replies[1]);const original=(await journey.snapshot()).active!;
  await turn(journey,'Mudou para o estúdio cinco.','move');const updated=await turn(journey,'Confirmo a atualização','update');await turn(journey,'Confirmo a atualização','update');expect(updated).toContain('estúdio 5');expect(await adapter.history('gustavo-demo')).toHaveLength(1);expect((await journey.snapshot()).active).toMatchObject({id:original.id,location:5,quantity:3,equipment:'microfone',version:2});expect(adapter.events.filter(e=>e.operation==='update')).toHaveLength(1);expect(adapter.events.find(e=>e.operation==='update')?.detail).toContain('estúdio 4 → 5');
  const second=await new OperationsJourney(adapter,'gustavo-demo',true,memory as any).recoverMemory();expect((await second.snapshot()).active).toMatchObject({id:original.id,location:5});expect(memory.remember).toHaveBeenLastCalledWith([original.id]);
 });
 it('restores the local workflow draft and deduplication after a process boundary, explicitly distinct from native Memory',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'glo-draft-'));try{const {adapter}=fixture();const path=join(dir,'draft.json');const first=new OperationsJourney(adapter,'gustavo-demo',true,undefined,path);await turn(first,'Preciso de três microfones no estúdio quatro em meia hora.','first');const second=await new OperationsJourney(adapter,'gustavo-demo',true,undefined,path).restoreDraft();await second.newSession();await turn(second,'Compatível com Demo RX','compat');await turn(second,'sim','confirm');const third=await new OperationsJourney(adapter,'gustavo-demo',true,undefined,path).restoreDraft();await third.recoverMemory();await turn(third,'sim','confirm');expect(await adapter.history('gustavo-demo')).toHaveLength(1);expect((await third.snapshot()).active).toMatchObject({quantity:3,equipment:'microfone',location:4});expect((await third.snapshot()).memorySource).toBe('local-reference');}finally{await rm(dir,{recursive:true,force:true});}
 });
 it('rejects a model rewrite that turns individual units into kits',async()=>{const provider={source:'openai' as const,stream:async function*(){yield JSON.stringify({speech:'Confirma a abertura de três kits para o estúdio quatro? Isso não confirma estoque nem prazo de entrega.'});}};const response=await new AudioReplyComposer(provider).compose('Anotei 3 microfones individuais para o estúdio 4, compatibilidade DEMO-RX. Confirma a abertura? Estoque e ETA não confirmados.');expect(response.source).toBe('roteiro-local');expect(response.speech).toContain('microfones individuais');});
});
