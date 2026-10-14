import {readFile,writeFile,rename,unlink} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import dotenv from 'dotenv';
const root=fileURLToPath(new URL('../',import.meta.url)),active=root+'.demo-data/active-scenario.json';
const mode=process.argv[2],id=process.argv[3];
const target=dotenv.parse(await readFile(root+'.env.local','utf8')).EXPECTED_TWILIO_ACCOUNT_SID;if(!/^AC[0-9a-f]{32}$/i.test(target??''))throw Error('target-account-not-configured');
// Refuse scene switching while the admitted agent or a voice-note job is active.
const [state,audio]=await Promise.all(['state','audio'].map(async p=>{try{const r=await fetch('http://127.0.0.1:3010/api/globo/native/'+p);if(!r.ok)throw Error();return r.json();}catch(e){if(e.cause?.code==='ECONNREFUSED')return;throw Error('Cannot verify native application is idle.');}}));
if(state?.isBusy||state?.status==='respondendo'||state?.mode==='voice'&&!['encerrada','erro'].includes(state.status)||audio?.jobs?.some(x=>['queued','processing','awaiting-delivery'].includes(x.status)))throw Error('Native application is not idle; finish the session first.');
if(mode==='rafael'){await unlink(active).catch(e=>{if(e.code!=='ENOENT')throw e;});console.log('Rafael selector restored; reload only native application. No remote resources deleted.');}
else if(mode==='activate'&&/^gustavo-[a-z0-9-]{1,40}$/.test(id??'')){const s=JSON.parse(await readFile(root+'.demo-data/'+id+'-resources.json','utf8'));if(!s.prepared||s.id!==id||s.identity!=='gustavo-demo'||s.accountSid!==target||!/^conv_configuration_[0-9a-z]{26}$/.test(s.orchestratorId)||!/^mem_store_[0-9a-z]{26}$/.test(s.memoryStoreId)||!/^mem_profile_[0-9a-z]{26}$/.test(s.profileId))throw Error('Unverified scene');await writeFile(active+'.tmp',JSON.stringify(s,null,2),{mode:0o600});await rename(active+'.tmp',active);console.log('Dedicated Gustavo selector written; reload only native application. No env/voice/sender changes.');}
else throw Error('Usage: node scripts/scenario.mjs activate gustavo-... | rafael');
