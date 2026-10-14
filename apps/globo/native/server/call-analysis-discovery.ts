import type {TargetAPI} from './target-api';
// List filters can return unrelated conversations. Verify scope and actual CallSid evidence.
export async function callAnalysisConversations(api:TargetAPI,accountId:string,configurationId:string,callSid:string):Promise<{id:string}[]>{
 const list=await api.request('conversations.twilio.com','/v2/Conversations?'+new URLSearchParams({channelId:callSid,pageSize:'100'}));
 if(list.meta?.nextToken)throw Error('native-discovery-pagination-needed');
 const matched:{id:string}[]=[];
 for(const row of list.conversations??[]){
  if(row.accountId!==accountId||row.configurationId!==configurationId)continue;
  const evidence=await api.request('conversations.twilio.com',`/v2/Conversations/${row.id}/Communications?pageSize=100`);
  if(evidence.meta?.nextToken)throw Error('native-evidence-pagination-required');
  if(evidence.communications?.some((m:{accountId:string;conversationId:string;channelId:string})=>m.accountId===accountId&&m.conversationId===row.id&&m.channelId===callSid))matched.push({id:row.id});
 }
 return matched;
}
