export type OpKind='request'|'correction'|'compatible'|'confirm'|'move'|'choose'|'report'|'reopen'|'status'|'urgent'|'forbidden';
export interface OpInput {kind:OpKind;completeKit?:boolean;location?:number;quantity?:number;deadlineMinutes?:number;recurrence?:boolean;requestId?:string;}
export type Channel='panel'|'voice'|'whatsapp-text'|'whatsapp-audio';
export type ExecutionStatus='registered'|'accepted'|'dispatched'|'completed'|'unknown';
export interface EquipmentRequest {id:string;owner:'rafael-demo'|'gustavo-demo';type:'equipment-service-request';equipment:'kit de microfone sem fio';completeKit?:boolean;quantity:number;location:number;compatibility:string;deadlineText:string;status:ExecutionStatus;version:number;executor:string|null;eta:string|null;reportedOutcome:'unknown'|'unresolved'|'resolved';blocker?:string;recurrenceReported:boolean;}
export interface ToolEvent {id:string;time:string;operation:string;requestId?:string;source:'adapter-simulated';confirmed:boolean;detail:string;}
export interface OperationalSnapshot {identity:string;authentication:string;authorization:string;requests:EquipmentRequest[];active?:EquipmentRequest;draft?:Partial<EquipmentRequest>;pending?:'create'|'move'|'revise'|'reopen';impact:string;nextAction:string;events:ToolEvent[];channels:Channel[];memorySource:'local-reference'|'twilio-memory';memoryEvidence?:{profileId:string;retrievedAt:string;references:string[]};}
export const operationSteps=[
 {label:'1 · Retomar RH',text:'Você lembra da minha solicitação de férias?'},
 {label:'2 · Pedido no set',text:'Estou no estúdio 4. Preciso de dois kits de microfone sem fio. A gravação começa em meia hora. Um dos kits que vieram ontem voltou a falhar.'},
 {label:'3 · Confirmar compatibilidade',text:'Os kits devem ser compatíveis com o receptor DEMO-RX.'},
 {label:'4 · Autorizar abertura',text:'Confirmo a abertura da solicitação.'},
 {label:'5 · Outro canal, mesmo pedido',text:'É sobre os microfones. Mudamos para o estúdio 5.'},
 {label:'6 · Autorizar atualização',text:'Confirmo a atualização do local.'},
 {label:'7 · Desfecho relatado',text:'Entregaram, mas veio um kit incompatível. Ainda não conseguimos gravar.'},
 {label:'8 · Autorizar continuidade',text:'Confirmo a reabertura do pedido.'}
];
