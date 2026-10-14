export interface AudioProgressJob {status:string;stage?:string;transcript?:string;spokenText?:string;responseTurns?:{text?:string;kind:string;status:string}[];}
export function audioProgress(job:AudioProgressJob){
 const reply=job.spokenText??job.responseTurns?.map(t=>t.text).filter(Boolean).join(' ');
 const failed=job.status==='failed';
 return {transcript:job.transcript??(failed?'Transcrição não concluída.':'Transcrição em andamento'),reply:reply??(failed?`Interação interrompida na etapa ${job.stage??'não identificada'}. Nenhuma resposta confirmada.`:'Processando a interação')};
}
