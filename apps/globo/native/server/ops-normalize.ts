import type { NormalizedTurn } from '../shared/model';
const units:Record<string,number>={zero:0,um:1,uma:1,dois:2,duas:2,tres:3,quatro:4,cinco:5,seis:6,sete:7,oito:8,nove:9,dez:10,onze:11,doze:12,treze:13,catorze:14,quatorze:14,quinze:15,dezesseis:16,dezessete:17,dezoito:18,dezenove:19};
const tens:Record<string,number>={vinte:20,trinta:30,quarenta:40,cinquenta:50,sessenta:60,setenta:70,oitenta:80,noventa:90};
export function extractStudioLocations(raw:string){
 const t=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const token='(?:\\d{1,3}|(?:'+Object.keys(tens).join('|')+')(?:\\s+e\\s+(?:'+Object.keys(units).filter(k=>units[k]<10).join('|')+'))?|'+Object.keys(units).join('|')+')';
 const pattern=new RegExp('\\b(?:estudio|studio)\\s*(?:(?:numero|n[º°.]?)\\s*)?('+token+')\\b(?![.,]\\d)','g');
 const values=[...t.matchAll(pattern)].map(m=>{const value=m[1];if(/^\d+$/.test(value))return Number(value);const parts=value.split(/\s+e\s+/);return tens[parts[0]]!==undefined?tens[parts[0]]+(units[parts[1]]??0):units[value];});
 return values;
}
function studioLocation(t:string){const unique=[...new Set(extractStudioLocations(t))];return {mentioned:/\b(?:estudio|studio)\b/.test(t),location:unique.length===1?unique[0]:undefined};
}
export function normalizeOperation(raw:string):NormalizedTurn|undefined {
 const t=raw.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const op=(operation:NonNullable<NormalizedTurn['operation']>,text:string):NormalizedTurn=>({intent:'operations',operation,text});
 if(/ferias|salario|diagnostico|cpf/.test(t)&&/microfone|equipamento|producao/.test(t))return op({kind:'forbidden'},'Tentativa de cruzar informações de RH com produção bloqueada.');
 if(/incompativel|nao conseguimos gravar/.test(t))return op({kind:'report'},'Entregaram, mas veio um kit incompatível. Ainda não conseguimos gravar.');
 if(/reabertura|reabrir/.test(t)&&/confirm|autoriz/.test(t))return op({kind:'reopen'},'Confirmo a continuidade do pedido de equipamento.');
 if(/\b(nao|nunca|cancela|cancelar)\b/.test(t)&&/confirm|autoriz|atualiz|abrir/.test(t))return undefined;
 const location=studioLocation(t),place=location.location;
 if(location.mentioned&&(place===undefined||/\b(?:nao|nunca)\b.*\b(?:estudio|studio)\b/.test(t)))return undefined;
 if(/kits? completos?/.test(t)&&!(/\b(?:preciso|solicito|quero)\b/.test(t)&&/microfone|equipamento|kit/.test(t)))return op({kind:'correction',location:place,completeKit:true},`Correção fictícia: kits completos${place?', estúdio '+place:''}.`);
 if(/\b(?:mudamos|mudou|mudar|mudaram|alterar|alterou|alteraram|atualizar|atualizou|trocou|trocar|trocaram|agora|na verdade)\b|\bgravacao\b.*\b(?:vai|sera|acontecer)\b/.test(t)&&place&&!(/\b(?:preciso|solicito|quero)\b/.test(t)&&/microfone|equipamento|kit/.test(t)))return op({kind:'move',location:place},`É sobre os microfones. Mudamos para o estúdio ${place}.`);
 const id=raw.match(/EQ-DEMO-\d{4}/i);if(id)return op({kind:'choose',requestId:id[0].toUpperCase()},`Seleciono o pedido ${id[0].toUpperCase()}.`);
 if(/status|situacao|andamento/.test(t)&&/pedido|solicitacao|microfone|equipamento/.test(t))return op({kind:'status'},'Qual o status do meu pedido fictício de equipamento?');
 const numberToken='(?:\\d{1,2}|'+Object.keys(units).join('|')+')';
 const qty=t.match(new RegExp('\\b('+numberToken+')\\s+(?:(?:kits?\\s+)?completos?\\s+)?(kits?|microfones?)\\b'));
 const quantity=qty?(/^\d+$/.test(qty[1])?Number(qty[1]):units[qty[1]]):undefined;
 const equipment=qty?(qty[2].startsWith('kit')?'kit de microfone sem fio' as const:'microfone' as const):/\bkits?\b/.test(t)?'kit de microfone sem fio' as const:undefined;
 const compatibility=/demo[\s-]*r[\s-]*x/.test(t)&&!/nao|incompativel/.test(t)?'DEMO-RX':undefined;
 const confirm=(/confirm|autoriz/.test(t)&&/abertura|solicitacao|atualizacao|local/.test(t))||/^(sim(?: (?:eu )?confirmo)?|(?:eu )?confirmo|pode (?:abrir|atualizar|mudar))$/.test(t.replace(/[.,!?]/g,' ').replace(/\s+/g,' ').trim());
 if(/microfone|equipamento|kit/.test(t)||quantity!==undefined||place!==undefined){
  const minutes=/meia hora/.test(t)?30:t.match(/(\d{1,2})\s*minutos?/)?.[1];const deadlineMinutes=minutes?Number(minutes):undefined;
  return op({kind:'request',equipment,completeKit:equipment==='microfone'?false:/kits? completos?/.test(t)||undefined,location:place,quantity,deadlineMinutes,recurrence:/voltou.*falhar|novamente|reinciden/.test(t)||undefined,compatibility,confirm:confirm||undefined},raw);
 }
 if(compatibility)return op({kind:'compatible',compatibility,confirm:confirm||undefined},raw);
 if(confirm)return op({kind:'confirm'},'Confirmo a ação pendente da solicitação de equipamento.');
 if(/urgente/.test(t))return op({kind:'urgent'},'É urgente; impacto, item e prazo não informados.');
 return undefined;
}
