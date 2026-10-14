// Requires explicit authorization for the discovered legacy dependency.
// Never run automatically on startup. No Studio/Messaging Service modifications.
import fs from 'node:fs';
import dotenv from 'dotenv';
import twilio from 'twilio';
const root=new URL('../',import.meta.url),e=dotenv.parse(fs.readFileSync(new URL('.env.local',root)));
const target=e.EXPECTED_TWILIO_ACCOUNT_SID;
if(!/^AC[0-9a-f]{32}$/i.test(target??'')||e.TWILIO_ACCOUNT_SID!==target||e.EXPECTED_TWILIO_ACCOUNT_SID!==target)throw Error('scope');
const path=new URL('.demo-data/'+target+'/classic-routing-rollback-private.json',root);
const snapshot=JSON.parse(fs.readFileSync(path));
const {address,participant}=snapshot;
if(address.account_sid!==target||address.address!=='whatsapp:+554123911383'||participant.account_sid!==target||participant.messaging_binding.proxy_address!==address.address)throw Error('snapshot-scope');
const mode=process.argv[2];if(!['apply-approved','apply-remove-approved','rollback'].includes(mode))throw Error('use apply-approved only after explicit legacy-dependency authorization, or rollback');
const client=twilio(target,e.TWILIO_AUTH_TOKEN);
const p=client.conversations.v1.services(participant.chat_service_sid).conversations(participant.conversation_sid).participants(snapshot.restoredParticipantSid||participant.sid);
const a=client.conversations.v1.addressConfigurations(address.sid);
const currentA=await a.fetch();let currentP;try{currentP=await p.fetch();}catch(e){if(mode!=='rollback'||e.status!==404)throw e;}
if(currentA.address!==address.address||(currentP&&(currentP.messagingBinding?.address!==participant.messaging_binding.address||![address.address,null,undefined].includes(currentP.messagingBinding?.proxy_address))))throw Error('routing-changed-by-other-actor');
if(mode==='apply-remove-approved'){
 await a.update({'autoCreation.enabled':false});
 try{await p.remove({xTwilioWebhookEnabled:'false'});}catch(e){await a.update({'autoCreation.enabled':address.auto_creation.enabled});throw Error('participant-removal-rejected-'+e.code);}
}else if(mode==='apply-approved'){
 await a.update({'autoCreation.enabled':false});
 try{await p.update({'messagingBinding.proxyAddress':'null'});}catch{await a.update({'autoCreation.enabled':address.auto_creation.enabled});throw Error('proxy-detachment-rejected; autocreation restored; no participant deletion attempted');}
}else{
 if(currentP)await p.update({'messagingBinding.proxyAddress':participant.messaging_binding.proxy_address});else{const restored=await client.conversations.v1.services(participant.chat_service_sid).conversations(participant.conversation_sid).participants.create({'messagingBinding.address':participant.messaging_binding.address,'messagingBinding.proxyAddress':participant.messaging_binding.proxy_address,attributes:participant.attributes,roleSid:participant.role_sid,xTwilioWebhookEnabled:'false'});snapshot.restoredParticipantSid=restored.sid;fs.writeFileSync(path,JSON.stringify(snapshot),{mode:0o600});}
 await a.update({'autoCreation.enabled':address.auto_creation.enabled});
}
const afterA=await a.fetch();let afterP;try{afterP=await p.fetch();}catch(e){if(e.status!==404)throw e;}
const proof={at:new Date().toISOString(),mode,addressSid:address.sid,participantSid:participant.sid,conversationSid:participant.conversation_sid,autoCreationEnabled:afterA.autoCreation.enabled,proxyRestored:afterP?.messagingBinding?.proxy_address===address.address||afterP?.messagingBinding?.proxyAddress===address.address};
fs.writeFileSync(new URL('.demo-data/'+target+'/classic-routing-change.json',root),JSON.stringify(proof),{mode:0o600});console.log(JSON.stringify(proof));
