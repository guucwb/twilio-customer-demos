import { describe,it,expect } from 'vitest';
import request from 'supertest';
import twilio from 'twilio';
import { createApp } from './app';
import { HRSession } from './agent';
import { LocalDemoMemory } from './memory';
import { MockNimoServiceNow } from './nimo';
import { MockEquipmentExecution } from './execution';
import { OperationsJourney } from './operations';
import { RelayRegistry } from './relay';
import { voiceConfig } from './voice';
import dotenv from 'dotenv';
import { readFileSync } from 'node:fs';
const base='https://demo.example.com',account='AC'+'0'.repeat(32),token='test-private';
async function fixture(){const execution=await new MockEquipmentExecution().init();const journey=new OperationsJourney(execution);const factory=()=>new HRSession(new LocalDemoMemory(),new MockNimoServiceNow(),undefined,'demo',journey).init();let s=await factory();const app=createApp({localPort:3009,voice:voiceConfig(dotenv.parse(readFileSync(new URL('../.env.example',import.meta.url)))),authToken:token,accountSid:account,publicBase:base,panelPassword:'test',allowedCalls:[],session:s,registry:new RelayRegistry(factory),getSession:()=>s,setSession:x=>{s=x},createSession:factory,journey,execution});const post=(path:string,body:object)=>request(app).post('/api/globo/native/'+path).auth('demo','test').set('Origin',base).set('X-Globo-Demo','1').send(body);return {app,journey,post};}
describe('Operational panel and signed endpoints',()=>{
 it('runs RH → equipment → confirmation → new session → same ID → administrative divergence',async()=>{const f=await fixture();for(const step of [0,1,2,3])expect((await f.post('operation-step',{step})).status).toBe(200);const id=(await f.journey.snapshot()).active!.id;expect((await f.post('new-session',{})).status).toBe(200);for(const step of [4,5])expect((await f.post('operation-step',{step})).status).toBe(200);expect((await f.journey.snapshot()).active).toMatchObject({id,location:5});expect((await f.post('execution-event',{status:'completed',eventId:'closure-1'})).status).toBe(200);expect((await f.post('operation-step',{step:6})).status).toBe(200);expect((await f.journey.snapshot()).active).toMatchObject({id,status:'completed',reportedOutcome:'unresolved'});});
 it('keeps analytics protected, identified and no native fallback',async()=>{const f=await fixture();expect((await request(f.app).get('/api/globo/native/analytics')).status).toBe(401);const r=await request(f.app).get('/api/globo/native/analytics').auth('demo','test');expect(r.body.nativeReady).toBe(false);expect(r.body.records.every((r:{source:string})=>r.source==='non-native-simulation')).toBe(true);expect((await f.post('native-analysis/refresh',{conversationId:'arbitrary'})).status).toBe(409);});
 it('rejects extra/free-text fields and arbitrary execution objects',async()=>{const f=await fixture();expect((await f.post('operation-step',{step:2,employee:'other'})).status).toBe(400);expect((await f.post('execution-event',{status:'completed',eventId:'x',requestId:'other'})).status).toBe(400);});
 it('requires signature and explicit WhatsApp resource authorization; v3 webhook is closed by default',async()=>{const f=await fixture();const body={AccountSid:account,MessageSid:'SM'+'0'.repeat(32),From:'whatsapp:+550000000001',To:'whatsapp:+550000000002'};expect((await request(f.app).post('/globo/native/whatsapp').type('form').send(body)).status).toBe(403);expect((await request(f.app).post('/globo/native/whatsapp').set('X-Twilio-Signature',twilio.getExpectedTwilioSignature(token,base+'/globo/native/whatsapp',body)).type('form').send(body)).status).toBe(403);expect((await request(f.app).post('/globo/native/intelligence/events').send({accountId:account})).status).toBe(403);});
});
