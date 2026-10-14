import { mkdir,writeFile } from 'node:fs/promises';
import { operatorDefinitions,intelligenceDefinition,orchestratorDefinition } from '../config/operators';
const target=new URL('../config/generated/',import.meta.url);await mkdir(target,{recursive:true});
await writeFile(new URL('operators.json',target),JSON.stringify(operatorDefinitions,null,2)+'\n');
await writeFile(new URL('intelligence.template.json',target),JSON.stringify(intelligenceDefinition({operational_impact:'REPLACE_IMPACT_OPERATOR_ID',resolution_integrity:'REPLACE_INTEGRITY_OPERATOR_ID',operational_friction:'REPLACE_FRICTION_OPERATOR_ID'},'https://REPLACE_DEDICATED_HOST/globo/intelligence/events'),null,2)+'\n');
await writeFile(new URL('orchestrator.template.json',target),JSON.stringify(orchestratorDefinition('REPLACE_DEDICATED_STORE_ID','REPLACE_DEDICATED_INTELLIGENCE_ID'),null,2)+'\n');
await writeFile(new URL('memory-store.json',target),JSON.stringify({displayName:'globo-edx-operations-demo',description:'Apenas dados fictícios de equipamentos. Sem dados privados de RH.'},null,2)+'\n');
await writeFile(new URL('memory-traits.json',target),JSON.stringify({displayName:'GloboOperations',description:'Referências operacionais fictícias, sem estado de execução ou RH.',traits:{referencesJson:{dataType:'STRING',description:'Referências de pedidos fictícios, sem informações RH.'}}},null,2)+'\n');
console.info('Definições locais geradas. Nenhuma chamada API. Templates exigem IDs reais e revisão antes de provisionamento.');
