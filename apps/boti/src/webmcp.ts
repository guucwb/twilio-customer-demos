import { useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean;untrustedContentHint:boolean};execute:(input:unknown)=>unknown};
type ModelContext={registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>};
/** Progressive enhancement: browsers without WebMCP use the same visible controls. */
export function useDemoTools(read:()=>unknown,reset:()=>void){
 const callbacks=useRef({read,reset});callbacks.current={read,reset};
 useEffect(()=>{
  const context=(document as Document&{modelContext?:ModelContext}).modelContext;
  if(!context?.registerTool)return;
  const lifecycle=new AbortController();
  const validate=(input:unknown)=>{if(input===null||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');};
  const tools:Tool[]=[
   {name:'boti_read_demo_state',description:'Read the current synthetic Boti presentation outcomes.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute(input){validate(input);return callbacks.current.read();}},
   {name:'boti_reset_demo',description:'Reset all synthetic Boti scenarios, drafts and operational action plans, returning to the customer view. No external systems are changed.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute(input){validate(input);flushSync(()=>callbacks.current.reset());return {reset:true};}}
  ];
  for(const tool of tools){try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>console.info('[boti] optional WebMCP registration unavailable'));}catch{console.info('[boti] optional WebMCP registration unavailable');}}
  return ()=>lifecycle.abort();
 },[]);
}
