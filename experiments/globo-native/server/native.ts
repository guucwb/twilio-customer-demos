import { z } from 'zod';
export interface NativeOptions {intelligenceService?:string;conversationConfiguration?:string;}
export function nativeOptions(e:Record<string,string|undefined>):NativeOptions {
 const classic=e.GLOBO_INTELLIGENCE_ENABLED==='true', orchestrator=e.GLOBO_ORCHESTRATOR_ENABLED==='true';
 if(classic&&orchestrator)throw new Error('native-paths-mutually-exclusive');
 if(classic){if(e.GLOBO_INTELLIGENCE_USE_APPROVED!=='true')throw new Error('intelligence-use-not-approved');return {intelligenceService:z.string().regex(/^GA[0-9a-f]{32}$/i).parse(e.GLOBO_INTELLIGENCE_SERVICE_SID)};}
 if(orchestrator){if(e.GLOBO_ORCHESTRATOR_USE_APPROVED!=='true')throw new Error('orchestrator-use-not-approved');return {conversationConfiguration:z.string().regex(/^conv_configuration_[0-9a-z]{26}$/).parse(e.GLOBO_CONVERSATION_CONFIGURATION_ID)};}
 return {};
}
