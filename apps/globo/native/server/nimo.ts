import { seedContext, type EmployeeContext } from '../shared/model';
export interface NimoAdapter {
  readonly source:'nimo-mock';
  authorizedHistory(identity:'rafael-demo'):Promise<{authorized:true;context:EmployeeContext}>;
  updateContext(identity:'rafael-demo',context:EmployeeContext):Promise<{status:'simulado'}>;
  registerHandoff(identity:'rafael-demo',summary:string):Promise<{id:string;status:string}>;
}
export class MockNimoServiceNow implements NimoAdapter {
  readonly source='nimo-mock' as const;
  private count=0;
  async authorizedHistory(identity:'rafael-demo'){if(identity!=='rafael-demo')throw new Error('unauthorized-demo-identity');return {authorized:true as const,context:seedContext()};}
  async updateContext(identity:'rafael-demo',context:EmployeeContext){if(identity!==context.identity||!context.synthetic)throw new Error('non-synthetic-context');return {status:'simulado' as const};}
  async registerHandoff(identity:'rafael-demo',summary:string){if(identity!=='rafael-demo'||!summary)throw new Error('invalid-handoff');return {id:`RH-DEMO-${++this.count}`,status:'Preparado no mock — nenhum RH real acionado'};}
}
