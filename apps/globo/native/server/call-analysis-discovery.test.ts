import {it,expect,vi} from 'vitest';
import {callAnalysisConversations} from './call-analysis-discovery';
import type {TargetAPI} from './target-api';
it('ignores unrelated list rows and finds all call segments including a late-created conversation',async()=>{
 const rows=[{id:'other-account',accountId:'other',configurationId:'config'},{id:'other-scene',accountId:'account',configurationId:'old'},{id:'whatsapp',accountId:'account',configurationId:'config'},{id:'first',accountId:'account',configurationId:'config'}];
 const request=vi.fn(async(_h:string,p:string)=>p.startsWith('/v2/Conversations?')?{conversations:rows}:{communications:[{accountId:'account',conversationId:p.split('/')[3],channelId:p.includes('whatsapp')?'MM-test':'CA-test'}]});
 const api={request}as unknown as TargetAPI;expect(await callAnalysisConversations(api,'account','config','CA-test')).toEqual([{id:'first'}]);rows.push({id:'late',accountId:'account',configurationId:'config'});expect(await callAnalysisConversations(api,'account','config','CA-test')).toEqual([{id:'first'},{id:'late'}]);expect(request.mock.calls.some(c=>c[1].includes('other-account')||c[1].includes('other-scene'))).toBe(false);
});
it('refuses truncated discovery instead of claiming complete recovery',async()=>{const api={request:async()=>({conversations:[],meta:{nextToken:'more'}})} as unknown as TargetAPI;await expect(callAnalysisConversations(api,'a','c','CA')).rejects.toThrow('pagination');});
