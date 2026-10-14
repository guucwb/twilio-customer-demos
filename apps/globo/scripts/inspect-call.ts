import twilio from 'twilio';
import { writeFile } from 'node:fs/promises';
import { appRoot,loadConfig } from '../server/config';
const c=loadConfig();
if(!c.approvedTestCall){console.info(JSON.stringify({inspection:false,reason:'No dedicated test context'}));process.exitCode=1;}else{
 try{const client=twilio(c.accountSid,c.authToken,{timeout:15000,logLevel:'silent',autoRetry:false});const calls=await client.calls.list({...c.approvedTestCall,limit:1});const call=calls[0];if(!call||Date.now()-call.dateCreated.getTime()>15*60*1000)throw new Error('test-call-not-found');
  const events=await client.calls(call.sid).events.list({limit:20});
  const result={status:call.status,durationSeconds:Number(call.duration??0),eventCount:events.length,webhooks:events.map(e=>({responseCode:e.response?.response_code,responseTime:e.response?.request_duration}))};
  await writeFile(appRoot+'.demo-data/last-call.json',JSON.stringify({sid:call.sid,...result}),{mode:0o600});console.info(JSON.stringify(result));
 }catch{console.info(JSON.stringify({inspection:false,details:'Provider details discarded'}));process.exitCode=1;}
}
