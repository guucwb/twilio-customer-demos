import { z } from 'zod';
import type { NativeIntelligence } from '../shared/model';
const sid=(prefix:string)=>z.string().regex(new RegExp('^'+prefix+'[0-9a-f]{32}$','i'));
const transcriptSchema=z.object({sid:sid('GT'),account_sid:sid('AC'),service_sid:sid('GA'),language_code:z.literal('pt-BR'),status:z.string(),channel:z.object({type:z.literal('voice'),media_properties:z.object({source:z.literal('ConversationRelay'),source_sid:sid('VX')})})});
const outputSchema=z.object({operator_sid:sid('LY'),name:z.string().max(150),operator_type:z.string().max(100),transcript_sid:sid('GT'),text_generation_results:z.unknown().optional(),json_results:z.unknown().optional(),predicted_label:z.string().max(100).nullish()});
export class ClassicIntelligence {
 constructor(private c:{accountSid:string;authToken:string;serviceSid:string;fetcher?:typeof fetch}){}
 private async get(path:string){const response=await(this.c.fetcher??fetch)('https://intelligence.twilio.com/v2/'+path,{headers:{Authorization:'Basic '+Buffer.from(this.c.accountSid+':'+this.c.authToken).toString('base64')},signal:AbortSignal.timeout(10000)});if(!response.ok)throw new Error('intelligence-read-failed');return response.json();}
 async validateService(){const s=await this.get('Services/'+this.c.serviceSid);if(s.account_sid!==this.c.accountSid||s.language_code!=='pt-BR')throw new Error('intelligence-service-mismatch');}
 async results(relaySessionId:string):Promise<NativeIntelligence>{
  sid('VX').parse(relaySessionId);
  const query=new URLSearchParams({ServiceSid:this.c.serviceSid,SourceSid:relaySessionId,PageSize:'50'});
  const list=await this.get('Transcripts?'+query);const candidates=z.array(transcriptSchema).parse(list.transcripts);
  const t=candidates.find(t=>t.account_sid===this.c.accountSid&&t.service_sid===this.c.serviceSid&&t.channel.media_properties.source_sid===relaySessionId);
  if(!t)return {source:'twilio-intelligence-classic',status:'awaiting-transcript',operators:[],checkedAt:new Date().toISOString()};
  if(candidates.some(x=>x.account_sid!==this.c.accountSid||x.service_sid!==this.c.serviceSid||x.channel.media_properties.source_sid!==relaySessionId))throw new Error('intelligence-scope-mismatch');
  if(t.status!=='completed')return {source:'twilio-intelligence-classic',status:['failed','canceled','error'].includes(t.status)?'failed':'processing',transcriptId:t.sid,operators:[],checkedAt:new Date().toISOString()};
  const payload=await this.get('Transcripts/'+t.sid+'/OperatorResults?PageSize=50');
  const rows=z.array(outputSchema).parse(payload.operator_results);
  if(rows.some(o=>o.transcript_sid!==t.sid))throw new Error('intelligence-scope-mismatch');
  return {source:'twilio-intelligence-classic',status:'transcript-completed',transcriptId:t.sid,operators:rows.map(o=>({name:o.name,type:o.operator_type,result:JSON.stringify(o.text_generation_results??o.json_results??o.predicted_label??null).slice(0,10000)})),moreOperators:Boolean(payload.meta?.next_page_url),checkedAt:new Date().toISOString()};
 }
}
