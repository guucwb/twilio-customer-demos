import type { NormalizedTurn } from '../shared/model';
export function normalizeOperation(raw:string):NormalizedTurn|undefined {
 const t=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const op=(operation:NonNullable<NormalizedTurn['operation']>,text:string):NormalizedTurn=>({intent:'operations',operation,text});
 if(/ferias|salario|diagnostico|cpf/.test(t)&&/microfone|equipamento|producao/.test(t))return op({kind:'forbidden'},'Tentativa de cruzar informações de RH com produção bloqueada.');
 if(/incompativel|nao conseguimos gravar/.test(t))return op({kind:'report'},'Entregaram, mas veio um kit incompatível. Ainda não conseguimos gravar.');
 if(/reabertura|reabrir/.test(t)&&/confirm|autoriz/.test(t))return op({kind:'reopen'},'Confirmo a continuidade do pedido de equipamento.');
 if(/confirm|autoriz/.test(t)&&/abertura|solicitacao|atualizacao|local/.test(t))return op({kind:'confirm'},'Confirmo a ação pendente da solicitação de equipamento.');
 if(/demo-rx/.test(t)&&! /nao|incompativel/.test(t))return op({kind:'compatible'},'Os kits devem ser compatíveis com o receptor DEMO-RX.');
 const location=t.match(/estudio\s*(\d|quatro|cinco)/);const place=location?(location[1]==='quatro'?4:location[1]==='cinco'?5:Number(location[1])):undefined;
 if(/mudamos|mudar|alterar|atualizar/.test(t)&&place)return op({kind:'move',location:place},`É sobre os microfones. Mudamos para o estúdio ${place}.`);
 const id=raw.match(/EQ-DEMO-\d{4}/i);if(id)return op({kind:'choose',requestId:id[0].toUpperCase()},`Seleciono o pedido ${id[0].toUpperCase()}.`);
 if(/microfone|equipamento|kit/.test(t)){
  const qty=t.match(/\b(\d{1,2}|dois|duas|um)\s*kits?\b/);const quantity=qty?(qty[1]==='dois'||qty[1]==='duas'?2:qty[1]==='um'?1:Number(qty[1])):undefined;
  const minutes=/meia hora/.test(t)?30:t.match(/(\d{1,2})\s*minutos?/)?.[1];const deadlineMinutes=minutes?Number(minutes):undefined;
  return op({kind:'request',location:place,quantity,deadlineMinutes,recurrence:/voltou.*falhar|novamente|reinciden/.test(t)},`Solicitação fictícia: ${quantity??'quantidade desconhecida'} kits de microfone sem fio, estúdio ${place??'desconhecido'}, gravação em ${deadlineMinutes??'prazo desconhecido'} minutos. ${/falhar|reinciden/.test(t)?'Falha reincidente relatada.':''}`);
 }
 if(/urgente/.test(t))return op({kind:'urgent'},'É urgente; impacto, item e prazo não informados.');
 return undefined;
}
