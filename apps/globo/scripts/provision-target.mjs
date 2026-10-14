// Dedicated resources only. Sender mutation is a separate, guarded operation.
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
const root=new URL('../',import.meta.url);
const e=dotenv.parse(fs.readFileSync(new URL('.env.local',root)));
const target=e.EXPECTED_TWILIO_ACCOUNT_SID;
if(!/^AC[0-9a-f]{32}$/i.test(target??'')||e.TWILIO_ACCOUNT_SID!==target||e.EXPECTED_TWILIO_ACCOUNT_SID!==target||!e.TWILIO_AUTH_TOKEN)throw new Error('target-config-mismatch');
const file=new URL('.demo-data/target-resources.json',root);
const ledger=JSON.parse(fs.readFileSync(file));
if(ledger.targetAccount!==target)throw new Error('wrong-ledger-account');
ledger.operations??={};ledger.operatorIds??={};
const save=()=>fs.writeFileSync(file,JSON.stringify(ledger,null,2)+'\n',{mode:0o600});
const allowed=new Set(['api.twilio.com','memory.twilio.com','conversations.twilio.com','intelligence.twilio.com']);
async function request(url,method='GET',body,key){const u=new URL(url);if(u.protocol!=='https:'||!allowed.has(u.host)||u.username||u.password)throw new Error('untrusted-api');const r=await fetch(url,{method,headers:{Authorization:'Basic '+Buffer.from(target+':'+e.TWILIO_AUTH_TOKEN).toString('base64'),'Content-Type':'application/json',...(key?{'Idempotency-Key':key}:{})},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});const b=await r.json();ledger.evidence.push({method,endpoint:url,at:new Date().toISOString(),http:r.status,errorCode:r.ok?undefined:b.code});save();if(!r.ok){console.log(JSON.stringify({http:r.status,errorCode:b.code,message:typeof b.message==='string'?b.message.slice(0,300):undefined}));throw new Error('target-api-'+r.status);}return b;}
const account=await request(`https://api.twilio.com/2010-04-01/Accounts/${target}.json`);if(account.sid!==target||account.status!=='active')throw new Error('account-not-active');
async function create(name,url,body){if(ledger[name])return ledger[name];const operation=ledger.operations[name];if(operation?.statusUrl){const b=await request(operation.statusUrl);if(b.status==='COMPLETED'&&b.result?.id){ledger[name]=b.result.id;ledger.created.push({kind:name,id:b.result.id});save();}console.log(JSON.stringify({operation:name,status:b.status,fields:Object.keys(b),result:b.result,resource:b.resource}));return null;}const key=crypto.randomUUID();const b=await request(url,'POST',body,key);ledger.operations[name]={statusUrl:b.statusUrl,id:b.id,related:b.related};if(b.id){ledger[name]=b.id;ledger.created.push({kind:name,id:b.id});}save();console.log(JSON.stringify({created:name,id:b.id,statusUrl:b.statusUrl,related:b.related}));return b.id??null;}
const action=process.argv[2]??'store';
if(action==='store')await create('memoryStoreId','https://memory.twilio.com/v1/ControlPlane/Stores',{displayName:'globo-operations-20261014',description:'Dedicated synthetic equipment journey; no private HR data.'});
if(action==='poll')for(const [name,op] of Object.entries(ledger.operations)){if(!ledger[name]&&op.statusUrl){const b=await request(op.statusUrl);if(b.status==='COMPLETED'&&b.result?.id){ledger[name]=b.result.id;ledger.created.push({kind:name,id:b.result.id});save();}console.log(JSON.stringify({operation:name,status:b.status,fields:Object.keys(b),result:b.result,resource:b.resource,related:b.related}));}}
if(action==='operators'){
 const defs=JSON.parse(fs.readFileSync(new URL('migration/operators.proposed.json',root)));
 for(const definition of defs){const name=definition.displayName.replace('globo_demo_','');if(ledger.operatorIds[name])continue;const b=await request('https://intelligence.twilio.com/v3/ControlPlane/Operators','POST',definition);ledger.operatorIds[name]=b.id;ledger.created.push({kind:'operator',name,id:b.id});save();console.log(JSON.stringify({operator:name,id:b.id}));}
}
if(action==='schema'){
 if(!ledger.memoryStoreId)throw new Error('store-not-ready');
 await create('traitGroupReady',`https://memory.twilio.com/v1/ControlPlane/Stores/${ledger.memoryStoreId}/TraitGroups`,{displayName:'GloboOperations',description:'Only synthetic production request references',traits:{referencesJson:{dataType:'STRING'},phone:{dataType:'STRING'}}});
}
if(action==='identity'){
 if(!ledger.memoryStoreId)throw new Error('store-not-ready');
 const settings=await request(`https://memory.twilio.com/v1/ControlPlane/Stores/${ledger.memoryStoreId}/IdentityResolutionSettings`);
 const phone=settings.identifierConfigs.find(x=>x.idType==='phone');const whatsapp=settings.identifierConfigs.find(x=>x.idType==='whatsapp');
 if(phone?.matchingAlgo!=='exact'||phone?.normalization!=='phone'||whatsapp?.matchingAlgo!=='exact')throw new Error('identity-settings-not-compatible');
 ledger.identityVerified=true;save();console.log(JSON.stringify({identityVerified:true,protectedDefaultsPreserved:true}));
}
if(action==='profile'){
 if(!ledger.memoryStoreId||!ledger.traitGroupReady)throw new Error('schema-not-ready');
 const global=dotenv.parse(fs.readFileSync(new URL('../../.env',root)));
 const raw=e.DEMO_CUSTOMER_WHATSAPP||global.DEMO_CUSTOMER_WHATSAPP;const address=raw?.replace(/^whatsapp:/,'');
 if(!/^\+[1-9]\d{7,14}$/.test(address??''))throw new Error('test-customer-whatsapp-not-configured');
 if(!ledger.profileId){const b=await request(`https://memory.twilio.com/v1/Stores/${ledger.memoryStoreId}/Profiles`,'POST',{traits:{Contact:{phone:address,firstName:'Rafael',lastName:'Demo'},GloboOperations:{referencesJson:JSON.stringify({identity:'rafael-demo',domain:'production',requestIds:[]})}}});if(!b.id)throw new Error('profile-id-missing');ledger.profileId=b.id;ledger.created.push({kind:'profile',id:b.id});save();}
 if(!ledger.profileIdentifiersLinked){for(const [idType,value] of [['phone',address],['whatsapp','whatsapp:'+address]])await request(`https://memory.twilio.com/v1/Stores/${ledger.memoryStoreId}/Profiles/${ledger.profileId}/Identifiers`,'POST',{idType,value});ledger.profileIdentifiersLinked=true;save();}
 console.log(JSON.stringify({profileId:ledger.profileId,identifiersLinked:ledger.profileIdentifiersLinked,customerAddressNotLogged:true}));
}
if(action==='intelligence'){
 const ids=ledger.operatorIds;if(!ids.operational_impact||!ids.resolution_integrity||!ids.operational_friction)throw new Error('operators-not-ready');
 await create('intelligenceId','https://intelligence.twilio.com/v3/ControlPlane/Configurations',{displayName:'globo-operations-20261014',description:'Synthetic impact, urgency, recurrence, resolution and governance',rules:[{operators:[{id:ids.operational_impact}],triggers:[],actions:[]},{operators:Object.entries(ids).filter(([n])=>n!=='operational_impact').map(([,id])=>({id})),triggers:[{on:'CONVERSATION_END'}],actions:[]}]});
}
if(action==='orchestrator'){
 if(!ledger.memoryStoreId||!ledger.intelligenceId)throw new Error('dependencies-not-ready');
 await create('orchestratorId','https://conversations.twilio.com/v2/ControlPlane/Configurations',{displayName:'globo-operations-20261014',description:'Dedicated fictional operations; active Relay only; no passive voice capture',conversationGroupingType:'GROUP_BY_PROFILE',memoryStoreId:ledger.memoryStoreId,memoryExtractionEnabled:true,intelligenceConfigurationIds:[ledger.intelligenceId],channelSettings:{VOICE:{captureRules:[],statusTimeouts:{inactive:1,closed:2}}},statusCallbacks:[]});
}
