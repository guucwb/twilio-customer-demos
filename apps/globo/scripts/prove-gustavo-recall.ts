import {writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {loadConfig} from '../native/server/config';
import {TargetAPI} from '../native/server/target-api';
import {NativeVacationMemory} from '../native/server/vacation';
const c=loadConfig();if(!c.sceneId||c.identity!=='gustavo-demo')throw Error('Gustavo scenario not active');
// Fresh process: only resource identifiers are loaded. No local history or context.
const native=new NativeVacationMemory({api:new TargetAPI(c),storeId:c.opStore,profileId:c.opProfile});const agentSessionId=randomUUID();
if(native.context!==undefined)throw Error('Unexpected initial context');
await native.recall(agentSessionId);
const proof={at:new Date().toISOString(),scene:c.sceneId,freshProcess:true,localHistoryLoaded:false,context:native.context??null,evidence:native.evidence??null,error:native.lastError??null};
await writeFile(c.dataRoot+'vacation-independent-recall.json',JSON.stringify(proof,null,2),{mode:0o600});
console.log(JSON.stringify({freshProcess:true,localHistoryLoaded:false,recovered:!!native.evidence,month:native.context?.month,source:native.evidence?.source,agentSessionId}));
