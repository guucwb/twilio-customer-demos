import { loadConfig } from '../server/config';
import { HRSession } from '../server/agent';
import { LocalDemoMemory } from '../server/memory';
import { MockNimoServiceNow } from '../server/nimo';
import { OpenAIResponses } from '../server/openai';
import { demoTurns } from '../shared/model';
const c=loadConfig();
if(!c.apiKey||!c.model){console.info(JSON.stringify({realAI:false,reason:'configuration-missing'}));process.exitCode=1;}else{
 const s=await new HRSession(new LocalDemoMemory(),new MockNimoServiceNow(),new OpenAIResponses({apiKey:c.apiKey,model:c.model})).init();let chunks=0;await s.turn(demoTurns[0],(t,last)=>{if(t&&!last)chunks++;});
 const real=s.state.transcript.at(-1)?.source==='openai';console.info(JSON.stringify({realAI:real,streamChunks:chunks,firstTokenMs:s.state.quality.firstTokenMs,fallbacks:s.state.quality.fallbacks,synthetic:true}));if(!real)process.exitCode=1;
}
