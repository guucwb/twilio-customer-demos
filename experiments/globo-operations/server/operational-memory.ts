import { z } from 'zod';
const refs=z.object({identity:z.literal('rafael-demo'),domain:z.literal('production'),requestIds:z.array(z.string().regex(/^EQ-DEMO-\d{4}$/)).max(10)}).strict();
export class NativeOperationalMemory {
 readonly source='twilio-memory' as const;
 constructor(private c:{storeId:string;profileId:string;accountSid:string;authToken:string;useApproved:boolean;writesApproved:boolean;fetcher?:typeof fetch}){if(!c.useApproved||!/^mem_store_[0-9a-z]{26}$/.test(c.storeId)||!/^mem_profile_[0-9a-z]{26}$/.test(c.profileId))throw new Error('operational-memory-not-approved');}
 private async request(method:string,body?:unknown,suffix=''){const r=await(this.c.fetcher??fetch)(`https://memory.twilio.com/v1/Stores/${this.c.storeId}/Profiles/${this.c.profileId}${suffix}`,{method,headers:{Authorization:'Basic '+Buffer.from(this.c.accountSid+':'+this.c.authToken).toString('base64'),'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});if(!r.ok)throw new Error('operational-memory-unavailable');return r.json();}
 async recover(){const profile=await this.request('GET');const value=refs.parse(JSON.parse(profile.traits?.GloboOperations?.referencesJson??'null'));return {profileId:this.c.profileId,retrievedAt:new Date().toISOString(),references:value.requestIds};}
 async remember(requestIds:string[]){if(!this.c.writesApproved)throw new Error('operational-memory-write-not-approved');await this.request('PATCH',{traits:{GloboOperations:{referencesJson:JSON.stringify(refs.parse({identity:'rafael-demo',domain:'production',requestIds}))}}});}
 async semanticRecall(query:string){if(!this.c.useApproved||query!=='Solicitação fictícia de microfones e mudança do estúdio 4 para 5')throw new Error('recall-outside-production');return this.request('POST',{query,communicationsLimit:5,observationsLimit:5,summariesLimit:2},'/Recall');}
}
