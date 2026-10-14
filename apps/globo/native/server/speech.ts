// Stream short complete phrases so punctuation reaches TTS with its surrounding context.
// This is an application-level prosody experiment, not a provider emotion guarantee.
export class SpeechChunks {
 private buffer=''; private canceled=false;
 constructor(private send:(token:string,last:boolean)=>void,private minChars=45,private maxChars=200){}
 push(token:string,last=false){
  if(this.canceled)return;this.buffer+=token;
  if(last){this.send(this.buffer,true);this.buffer='';return;}
  while(this.buffer.length>=this.minChars){
   const boundaries=[...this.buffer.matchAll(/[.!?;:]["”’)]*\s+/g)].map(m=>m.index!+m[0].length);
   const end=boundaries.find(n=>n>=this.minChars&&n<=this.maxChars);
   if(end!==undefined){this.send(this.buffer.slice(0,end),false);this.buffer=this.buffer.slice(end);continue;}
   if(this.buffer.length>this.maxChars){const space=this.buffer.lastIndexOf(' ',this.maxChars);const split=space>=this.minChars?space+1:this.maxChars;this.send(this.buffer.slice(0,split),false);this.buffer=this.buffer.slice(split);continue;}
   break;
  }
 }
 cancel(){this.canceled=true;this.buffer='';}
}
