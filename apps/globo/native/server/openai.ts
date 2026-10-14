// Reuses Boti's Responses API boundary: injected fetch, store:false, bounded output,
// server-only credentials, sanitized errors. Extended here as a reusable streaming adapter.
export interface TextProvider {readonly source:'openai'|'roteiro-local'; stream(input:{instructions:string;input:string},signal:AbortSignal):AsyncIterable<string>;}
export class OpenAIResponses implements TextProvider {
  readonly source='openai' as const;
  constructor(private options:{apiKey:string;model:string;fetcher?:typeof fetch;timeoutMs?:number}){}
  async *stream(input:{instructions:string;input:string},signal:AbortSignal){
    const response=await(this.options.fetcher??fetch)('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${this.options.apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.any([signal,AbortSignal.timeout(this.options.timeoutMs??20000)]),body:JSON.stringify({model:this.options.model,store:false,stream:true,max_output_tokens:700,...input})});
    if(!response.ok||!response.body)throw new Error('ai-provider-unavailable');
    const reader=response.body.getReader();const decoder=new TextDecoder();let buffer='';let completed=false;let received=false;
    try{
      while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true}).replace(/\r/g,'');if(buffer.length>100000)throw new Error('ai-frame-too-large');
        let boundary:number;
        while((boundary=buffer.indexOf('\n\n'))>=0){const frame=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);const data=frame.split('\n').filter(s=>s.startsWith('data:')).map(s=>s.slice(5).trimStart()).join('\n');if(!data||data==='[DONE]')continue;
          const event=JSON.parse(data) as {type:string;delta?:string};
          if(['error','response.failed','response.incomplete'].includes(event.type))throw new Error('ai-stream-failed');
          if(event.type==='response.output_text.delta'&&typeof event.delta==='string'){received=true;yield event.delta;}
          if(event.type==='response.completed')completed=true;
        }
      }
      if(!completed||!received)throw new Error('ai-stream-incomplete');
    }finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
  }
}
