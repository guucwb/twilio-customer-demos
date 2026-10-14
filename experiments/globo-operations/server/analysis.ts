import { z } from 'zod';
export const evidenceSchema=z.array(z.object({quote:z.string().min(1).max(500)}).strict()).max(8);
const nullable=z.string().max(400).nullable();
export const operatorSchemas={
 operational_impact:z.object({domain:z.enum(['production','unknown']),request_type:z.enum(['equipment_request','asset_failure','unknown']),equipment:nullable,quantity:z.number().int().min(1).max(10).nullable(),location:nullable,deadline_text:nullable,business_impact:nullable,recurrence_reported:z.boolean().nullable(),missing_information:z.array(z.string().max(100)).max(8),recommended_action:nullable,evidence:evidenceSchema}).strict(),
 resolution_integrity:z.object({reported_outcome:z.enum(['resolved','unresolved','workaround','unknown']),remaining_blocker:nullable,recontact_reported:z.boolean().nullable(),commitments:z.array(z.object({action:nullable,deadline_text:nullable,evidence:evidenceSchema}).strict()).max(8),recommended_follow_up:nullable,evidence:evidenceSchema}).strict(),
 operational_friction:z.object({friction_category:z.enum(['availability','compatibility','missing_accessory','repeated_failure','delivery_delay','other','unknown']),workaround_reported:nullable,equipment_reference:nullable,location_reference:nullable,improvement_hypothesis:nullable,evidence:evidenceSchema}).strict()
};
export type OperatorName=keyof typeof operatorSchemas;
export interface SourceCommunication {id:string;conversationId:string;text:string;input:'synthetic-demo'|'live-test';}
export interface AnalysisRecord {id:string;operator:OperatorName;executionId?:string;operatorId?:string;conversationId:string;time:string;source:'twilio-intelligence-v3'|'non-native-simulation';input:'synthetic-demo'|'live-test';result:Record<string,unknown>;evidence:{quote:string;communicationId:string}[];}
export function validateAnalysis(name:OperatorName,result:unknown,communications:SourceCommunication[],meta:Omit<AnalysisRecord,'result'|'evidence'|'operator'|'input'>):AnalysisRecord {
 const parsed=operatorSchemas[name].parse(result);const quotes=[...parsed.evidence,...('commitments' in parsed?parsed.commitments.flatMap(c=>c.evidence):[])];
 if(meta.source==='twilio-intelligence-v3'&&(!/^intelligence_operatorresult_[0-9a-z]{26}$/.test(meta.id)||!meta.operatorId||!/^conv_conversation_[0-9a-z]{26}$/.test(meta.conversationId)))throw new Error('native-provenance-missing');
 const linked=quotes.map(({quote})=>{const found=communications.find(c=>c.conversationId===meta.conversationId&&c.text.includes(quote));if(!found)throw new Error('evidence-not-found');return {quote,communicationId:found.id};});
 if(!communications.length)throw new Error('source-communications-missing');
 return {...meta,operator:name,input:communications.some(c=>c.input==='live-test')?'live-test':'synthetic-demo',result:parsed,evidence:linked};
}
export function resolutionCheck(outcome:string,status:string,events:{operation:string;confirmed:boolean}[]){if(outcome==='unresolved'&&status==='completed')return 'Divergência: fechamento administrativo e bloqueio relatado. Não atribui culpa.';if(!events.some(e=>e.confirmed&&e.operation==='create'))return 'Execução não comprovada; logs ausentes podem indicar integração incompleta.';return 'Conferir relato e eventos do executor; não inferir resolução física.';}
export function aggregate(records:AnalysisRecord[]){const friction=records.filter(r=>r.operator==='operational_friction');return Object.entries(friction.reduce<Record<string,number>>((acc,r)=>{const k=String(r.result.friction_category);acc[k]=(acc[k]??0)+1;return acc;},{})).map(([category,count])=>({category,count,source:'application-aggregation',records:friction.filter(r=>r.result.friction_category===category).map(r=>r.id)}));}
