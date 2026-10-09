export type Classification = 'preserve' | 'replace' | 'validate';
export const nodes: {id:string;label:string;detail:string;x:number;y:number;kind:Classification}[] = [
{id:'entry',label:'Entrada / Audience',detail:'Entry Source sintético',x:100,y:110,kind:'preserve'},
{id:'data',label:'Data Extension',detail:'Relação com a audiência',x:325,y:110,kind:'preserve'},
{id:'consent',label:'Consentimento',detail:'Mapeamento de opt-in',x:550,y:110,kind:'validate'},
{id:'split',label:'Decision Split',detail:'Regra independente do canal',x:775,y:110,kind:'preserve'},
{id:'wait',label:'Wait',detail:'Espera de 1 dia',x:775,y:245,kind:'preserve'},
{id:'other',label:'Outro fluxo',detail:'Ramo sem WhatsApp',x:1020,y:110,kind:'preserve'},
{id:'wa',label:'WhatsApp atual',detail:'Atividade do provider',x:550,y:245,kind:'replace'},
{id:'engagement',label:'Engagement',detail:'Decisão por evento do canal',x:325,y:245,kind:'validate'},
{id:'rule',label:'Regra de negócio',detail:'Critério independente do canal',x:100,y:245,kind:'preserve'},
{id:'continue',label:'Continuação',detail:'Próxima etapa da jornada',x:100,y:380,kind:'preserve'},
{id:'end',label:'Saída principal',detail:'Conclusão do fluxo',x:325,y:380,kind:'preserve'},
{id:'otherEnd',label:'Saída alternativa',detail:'Conclusão do outro ramo',x:1020,y:245,kind:'preserve'}];
export const edges = [['entry','data'],['data','consent'],['consent','split'],['split','wait'],['split','other'],['wait','wa'],['wa','engagement'],['engagement','rule'],['rule','continue'],['continue','end'],['other','otherEnd']];
export const delta = () => nodes.reduce((a,n)=>({...a,[n.kind]:a[n.kind]+1}),{preserve:0,replace:0,validate:0});
export const checklist = ['Provider / atividade atual','Entry Source','Bindings de Data Extension','Atributos de personalização','Templates WhatsApp','Modelo de consentimento','Eventos delivered','Eventos read','Eventos click','Eventos reply','Decisões downstream','Custom Activities instaladas','Disponibilidade / downtime das Journeys'];
export const questions = ['Qual é o Entry Source?','Onde está a atividade de WhatsApp?','Qual provider/activity é utilizado atualmente?','Quais atributos alimentam o template?','Existem decisões depois do envio?','Elas dependem de delivered/read/click/reply?','Como o consentimento é tratado?','Existem Custom Activities?','Quais etapas não podem sofrer downtime?','Quantas Journeys semelhantes existem?'];
export type LocalState={statuses:string[];notes:string[];impact:string;impactReason:string};
export const initialState = ():LocalState=>({statuses:checklist.map(()=>'Desconhecido'),notes:questions.map(()=>''),impact:'',impactReason:''});
export const defaults = {sender:'whatsapp:+15005550006',contentSid:'HX00000000000000000000000000000000',phone:'{{Event.DEMO.Phone}}',contactKey:'{{Contact.Key}}',variables:{'1':'{{Event.DEMO.FirstName}}'},attributes:{journey:'{{Event.DEMO.JourneyName}}'},errorBehavior:'stop'};
export type ActivitySettings=typeof defaults;
export const syntheticContact = {phone:'+5500000000000',contactKey:'mariana-123',firstName:'Mariana',journey:'Jornada representativa'};
export function mapInput(settings:ActivitySettings,contact=syntheticContact){
 const values:Record<string,string>={'{{Event.DEMO.Phone}}':contact.phone,'{{Contact.Key}}':contact.contactKey,'{{Event.DEMO.FirstName}}':contact.firstName,'{{Event.DEMO.JourneyName}}':contact.journey};
 const resolve=(v:string)=>{if(v.includes('{{') && !values[v]) throw new Error(`Binding sem valor sintético: ${v}`);return values[v]??v;};
 return {inArguments:[{sender:settings.sender,contentSid:settings.contentSid,phone:resolve(settings.phone),contactKey:resolve(settings.contactKey),variables:Object.fromEntries(Object.entries(settings.variables).map(([k,v])=>[k,resolve(v)])),attributes:Object.fromEntries(Object.entries(settings.attributes).map(([k,v])=>[k,resolve(v)])),errorBehavior:settings.errorBehavior}]};
}
