export const messages = [
 {role:'customer',text:'Oi, preciso levantar um muro aqui em casa. Acho que vou precisar de uns 500 blocos e cimento.'},
 {role:'bot',text:'Claro! Posso te ajudar com isso. Você já sabe qual tipo de bloco pretende utilizar?'},
 {role:'customer',text:'Bloco de concreto. São uns 20 metros de muro. Vocês entregam em Guarulhos?'},
 {role:'bot',text:'Sim, atendemos Guarulhos. Posso consultar produtos e condições de entrega para você.'},
 {role:'customer',text:'Precisava entregar amanhã. Se conseguir um preço bom eu compro tudo com vocês.'},
 {role:'bot',text:'Entendi. Vou verificar as opções disponíveis.'},
 {role:'bot',text:'Separei as opções de blocos e cimento para consulta. A disponibilidade, o preço e a entrega precisam ser confirmados antes do pedido.'},
 {role:'customer',text:'Obrigado! Vou olhar as opções.'},
];
export const summary = 'Cliente pretende construir um muro de aproximadamente 20 metros em Guarulhos e procura cerca de 500 blocos de concreto e cimento. Solicitou entrega para o dia seguinte e demonstrou forte intenção de compra condicionada a preço competitivo.';
export const signals = [
 {label:'Intenção',value:'Compra para obra',at:1}, {label:'Projeto',value:'Construção de muro',at:1},
 {label:'Produtos',value:'Blocos e cimento',at:1},{label:'Quantidade',value:'~500 blocos',at:1},
 {label:'Produto confirmado',value:'Bloco de concreto',at:3},{label:'Localização',value:'Guarulhos, SP',at:3},
 {label:'Urgência',value:'Alta',at:5},{label:'Entrega desejada',value:'Amanhã',at:5},
 {label:'Intenção de compra',value:'Alta',at:5},{label:'Sensibilidade a preço',value:'Alta',at:5},
 {label:'Perfil potencial¹',value:'Profissional / varejo de alto valor',at:5},{label:'Sentimento',value:'Positivo',at:8},
];
export const operators = [
 {name:'Detecção de intenção',value:'Compra para obra',at:1,evidence:messages[0].text},
 {name:'Detecção de projeto',value:'Construção de muro',at:1,evidence:'preciso levantar um muro'},
 {name:'Extração de produtos',value:'Bloco de concreto · cimento',at:3,evidence:'Bloco de concreto. São uns 20 metros de muro.'},
 {name:'Sinal de compra',value:'ALTO',at:5,evidence:'Se conseguir um preço bom eu compro tudo com vocês.'},
 {name:'Detecção de urgência',value:'ALTA · entrega amanhã',at:5,evidence:'Precisava entregar amanhã.'},
 {name:'Oportunidade comercial',value:'ALTA',at:5,evidence:'~500 blocos + cimento · compra concentrada'},
 {name:'Sentimento',value:'POSITIVO',at:8,evidence:'Obrigado! Vou olhar as opções.'},
 {name:'Resumo da conversa',value:'Contexto consolidado',at:9,evidence:summary},
];
export type View = 'live'|'review'|'insights';
export type State = {step:number;playing:boolean;view:View};
export const initial:State = {step:0,playing:false,view:'live'};
export type Event = {type:'reset'|'next'|'play'|'pause'}|{type:'navigate';view:View};
export function reducer(state:State,event:Event):State {
 if(event.type==='reset') return {...initial};
 if(event.type==='next') {const step=Math.min(9,state.step+1);return {...state,step,playing:step===9?false:state.playing};}
 if(event.type==='play')return {...state,playing:state.step<9,view:'live'};
 if(event.type==='pause')return {...state,playing:false};
 if(event.type==='navigate')return {...state,view:event.view,playing:false};
 return state;
}
