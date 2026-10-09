import { z } from 'zod';
export const inputSchema=z.object({sender:z.string().regex(/^whatsapp:\+[1-9]\d{7,14}$/),contentSid:z.string().regex(/^HX[0-9a-f]{32}$/i),phone:z.string().regex(/^\+[1-9]\d{7,14}$/),contactKey:z.string().min(1).max(200),variables:z.record(z.string().regex(/^\d+$/),z.string().max(1000)),attributes:z.record(z.string(),z.string().max(1000)).default({}),errorBehavior:z.enum(['stop','continue'])}).strict();
export type Input=z.infer<typeof inputSchema>;
export function parseInput(body:unknown):Input {
 const p=z.object({inArguments:z.array(z.record(z.string(),z.unknown())).min(1).max(20)}).passthrough().parse(body);
 const merged:Record<string,unknown>={};
 for(const part of p.inArguments)for(const [key,value] of Object.entries(part)){if(key in merged)throw new Error('Duplicate argument');merged[key]=value;}
 return inputSchema.parse(merged);
}
export function activityConfig(base:string,key:string){
 const endpoint=(name:string)=>({url:`${base}/api/activity/${name}`,useJwt:true});
 return {workflowApiVersion:'1.1',metaData:{icon:`${base}/activity/icon.svg`,category:'message',isConfigured:false,configOnDrop:true},type:'Rest',lang:{'pt-BR':{name:'Twilio WhatsApp',description:'Camada de comunicação WhatsApp — validação necessária no tenant'},'en-US':{name:'Twilio WhatsApp',description:'WhatsApp communication activity'}},arguments:{execute:{...endpoint('execute'),inArguments:[],outArguments:[{executionMode:''},{providerStatus:''}],timeout:20000,retryCount:0,retryDelay:1000,concurrentRequests:1}},configurationArguments:{applicationExtensionKey:key,save:endpoint('save'),validate:endpoint('validate'),publish:endpoint('publish'),unpublish:endpoint('unpublish'),stop:endpoint('stop')},userInterfaces:{configModal:{url:`${base}/activity/index.html`,height:780,width:900,fullscreen:false}},schema:{arguments:{execute:{inArguments:[],outArguments:[{executionMode:{dataType:'Text',direction:'out',access:'visible'}},{providerStatus:{dataType:'Text',direction:'out',access:'visible'}}]}}}};
}
