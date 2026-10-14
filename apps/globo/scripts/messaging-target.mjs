// Move ONLY the selected sender. Never alter the shared service configuration.
import fs from 'node:fs';
import dotenv from 'dotenv';
import twilio from 'twilio';
const root=new URL('../',import.meta.url),e=dotenv.parse(fs.readFileSync(new URL('.env.local',root))),target=e.EXPECTED_TWILIO_ACCOUNT_SID;
const selected='XEc496946458a3be652864221c06287f19',old='MG5c24178938fc37fc088fa573fe477e8d';
if(!/^AC[0-9a-f]{32}$/i.test(target??'')||e.TWILIO_ACCOUNT_SID!==target||e.EXPECTED_TWILIO_ACCOUNT_SID!==target)throw Error('scope');
const client=twilio(target,e.TWILIO_AUTH_TOKEN),path=new URL('.demo-data/target-resources.json',root),ledger=JSON.parse(fs.readFileSync(path));
if(ledger.targetAccount!==target)throw Error('ledger-scope');
const save=()=>fs.writeFileSync(path,JSON.stringify(ledger,null,2),{mode:0o600});
const before=await client.messaging.v1.services(old).fetch();if(before.accountSid!==target)throw Error('old-service-scope');
const oldSenders=await client.messaging.v1.services(old).channelSenders.list({limit:100});
const oldNumbers=await client.messaging.v1.services(old).phoneNumbers.list({limit:100});
const relevant=s=>({accountSid:s.accountSid,inboundRequestUrl:s.inboundRequestUrl,inboundMethod:s.inboundMethod,useInboundWebhookOnNumber:s.useInboundWebhookOnNumber,fallbackUrl:s.fallbackUrl,statusCallback:s.statusCallback});
ledger.messagingMigration??={oldServiceSid:old,senderSid:selected,before:relevant(before),otherSenderIds:oldSenders.filter(s=>s.sid!==selected).map(s=>s.sid).sort(),otherNumberIds:oldNumbers.map(s=>s.sid).sort(),snapshotAt:new Date().toISOString()};save();
if(process.argv[2]==='rollback'){
 if(!ledger.messagingServiceSid)throw Error('dedicated-service-missing');
 const own=await client.messaging.v1.services(ledger.messagingServiceSid).channelSenders.list({limit:100});if(own.some(s=>s.sid!==selected))throw Error('unexpected-dedicated-member');
 if(own.some(s=>s.sid===selected))await client.messaging.v1.services(ledger.messagingServiceSid).channelSenders(selected).remove();
 if(!oldSenders.some(s=>s.sid===selected))await client.messaging.v1.services(old).channelSenders.create({sid:selected});
 ledger.messagingMigration.state='ROLLED_BACK';save();console.log(JSON.stringify({state:'ROLLED_BACK',senderSid:selected}));process.exit(0);
}
if(process.argv[2]!=='apply-selected-approved')throw Error('explicit-selected-sender-authorization-required');
if(!ledger.messagingServiceSid){const s=await client.messaging.v1.services.create({friendlyName:'Globo isolated operations demo 20261014',inboundRequestUrl:'https://gustsantos.ngrok.io/globo/native/whatsapp',inboundMethod:'POST',useInboundWebhookOnNumber:false});if(s.accountSid!==target)throw Error('new-service-scope');ledger.messagingServiceSid=s.sid;ledger.created.push({kind:'messaging-service',id:s.sid});save();}
const own=await client.messaging.v1.services(ledger.messagingServiceSid).channelSenders.list({limit:100});if(own.some(s=>s.sid!==selected))throw Error('unexpected-dedicated-member');
if(!own.some(s=>s.sid===selected)){
 if(oldSenders.some(s=>s.sid===selected))await client.messaging.v1.services(old).channelSenders(selected).remove();
 try{await client.messaging.v1.services(ledger.messagingServiceSid).channelSenders.create({sid:selected});}catch(e){await client.messaging.v1.services(old).channelSenders.create({sid:selected});throw Error('sender-migration-rejected-'+e.code+'-old-membership-restored');}
}
const after=await client.messaging.v1.services(old).fetch(),senders=await client.messaging.v1.services(old).channelSenders.list({limit:100}),numbers=await client.messaging.v1.services(old).phoneNumbers.list({limit:100});
if(JSON.stringify(relevant(before))!==JSON.stringify(relevant(after))||JSON.stringify(senders.map(s=>s.sid).sort())!==JSON.stringify(ledger.messagingMigration.otherSenderIds)||JSON.stringify(numbers.map(s=>s.sid).sort())!==JSON.stringify(ledger.messagingMigration.otherNumberIds))throw Error('unexpected-shared-resource-delta');
const attached=await client.messaging.v1.services(ledger.messagingServiceSid).channelSenders(selected).fetch();if(attached.accountSid!==target)throw Error('sender-association-scope');
ledger.messagingMigration.state='APPLIED';ledger.messagingMigration.verifiedAt=new Date().toISOString();save();console.log(JSON.stringify({state:'APPLIED',dedicatedServiceSid:ledger.messagingServiceSid,senderSid:selected,sharedServiceConfigUnchanged:true,otherMembersUnchanged:true}));
