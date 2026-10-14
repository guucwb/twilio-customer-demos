export class TargetAPI {
 constructor(private c:{accountSid:string;authToken:string;fetcher?:typeof fetch}){}
 async request(host:string,path:string,method='GET',body?:unknown){
  if(!['memory.twilio.com','conversations.twilio.com','intelligence.twilio.com','voice.twilio.com','api.twilio.com'].includes(host)||!path.startsWith('/'))throw new Error('untrusted-api');
  const r=await(this.c.fetcher??fetch)(`https://${host}${path}`,{method,headers:{Authorization:'Basic '+Buffer.from(this.c.accountSid+':'+this.c.authToken).toString('base64'),'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw new Error(`target-api-${r.status}`);const text=await r.text();return text?JSON.parse(text):{};
 }
 async verifyAccount(){const a=await this.request('api.twilio.com',`/2010-04-01/Accounts/${this.c.accountSid}.json`);if(a.sid!==this.c.accountSid||a.status!=='active')throw new Error('target-account-not-active');return true;}
}
