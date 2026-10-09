import dotenv from 'dotenv';
import twilio from 'twilio';
import { fileURLToPath } from 'node:url';
import { createApp, type Provider } from './app';
dotenv.config({path:fileURLToPath(new URL('../../../.env',import.meta.url)),quiet:true});
dotenv.config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
const env=process.env;
let provider:Provider|undefined;
if(env.TWILIO_ACCOUNT_SID&&env.TWILIO_AUTH_TOKEN){const client=twilio(env.TWILIO_ACCOUNT_SID,env.TWILIO_AUTH_TOKEN,{timeout:12000,autoRetry:false});provider=async i=>{const m=await client.messages.create({from:i.sender,to:`whatsapp:${i.phone}`,contentSid:i.contentSid,contentVariables:JSON.stringify(i.variables)});return {sid:m.sid,status:m.status};};}
createApp(env,provider,fileURLToPath(new URL('../dist',import.meta.url))).listen(3004,'127.0.0.1',()=>console.info('Aché Journey Migration Lab · http://127.0.0.1:3004'));
