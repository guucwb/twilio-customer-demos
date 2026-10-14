import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';
import { seedContext, type EmployeeContext } from '../shared/model';
const contextSchema=z.object({identity:z.literal('rafael-demo'),name:z.literal('Rafael'),synthetic:z.literal(true),request:z.object({id:z.literal('FER-DEMO-1042'),subject:z.literal('Férias'),days:z.number().int().min(1).max(30),month:z.literal('novembro'),status:z.literal('Rascunho — aguarda RH')}),notes:z.array(z.string().max(250)).max(20),version:z.number().int().positive()});
export interface MemoryAdapter {readonly source:'local-demo'|'twilio-memory'; recall():Promise<EmployeeContext>; update(context:EmployeeContext):Promise<void>;}
export class LocalDemoMemory implements MemoryAdapter {
  readonly source='local-demo' as const;
  private chain=Promise.resolve();
  constructor(private path?:string, private value=seedContext()){}
  async recall(){await this.chain; if(this.path){try{this.value=contextSchema.parse(JSON.parse(await readFile(this.path,'utf8')));}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw new Error('memory-read-failed');}}return structuredClone(this.value);}
  update(context:EmployeeContext){const copy=contextSchema.parse(context);const pending=this.chain.then(async()=>{if(this.path){await mkdir(dirname(this.path),{recursive:true,mode:0o700});await writeFile(this.path+'.tmp',JSON.stringify(copy),{mode:0o600});await rename(this.path+'.tmp',this.path);}this.value=structuredClone(copy);});this.chain=pending.catch(()=>{});return pending;}
}
// Explicit opt-in only. No auto-selection or writes to existing Twilio stores.
// The profile must be a validated, dedicated synthetic profile created separately.
export class TwilioConversationMemory implements MemoryAdapter {
  readonly source='twilio-memory' as const;
  constructor(private config:{storeId:string;profileId:string;username:string;password:string;validated:boolean;writesApproved:boolean;fetcher?:typeof fetch}){
    if(!config.validated||!/^mem_store_[0-9a-z]{26}$/.test(config.storeId)||!/^mem_profile_[0-9a-z]{26}$/.test(config.profileId))throw new Error('memory-not-validated');
  }
  private async request(path:string,method='GET',body?:unknown){const c=this.config;const r=await(c.fetcher??fetch)(`https://memory.twilio.com/v1/Stores/${c.storeId}/Profiles/${c.profileId}${path}`,{method,headers:{Authorization:`Basic ${Buffer.from(`${c.username}:${c.password}`).toString('base64')}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(8000)});if(!r.ok)throw new Error('memory-provider-unavailable');return r.json();}
  async recall(){const profile=await this.request('') as {traits?:{GloboDemo?:{contextJson?:string}}};return contextSchema.parse(JSON.parse(profile.traits?.GloboDemo?.contextJson??'null'));}
  async update(context:EmployeeContext){if(!this.config.writesApproved)throw new Error('memory-write-not-approved');await this.request('','PATCH',{traits:{GloboDemo:{contextJson:JSON.stringify(contextSchema.parse(context))}}});}
}
