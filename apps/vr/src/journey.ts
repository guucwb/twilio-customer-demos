// A fixed, local script. Position is the source of truth for the transcript,
// timeline and shared context, including when presenting a scene out of order.
export const steps = [
  ['Start', 'Uma conversa que acompanha o cliente.'],
  ['Landing page', 'O interesse é o início da conversa.'],
  ['First contact', 'Primeiro contato, sem perder o momento.'],
  ['Qualification', 'Poucas perguntas. Mais contexto.'],
  ['Qualification', 'Entender o que precisa mudar.'],
  ['Qualification', 'Confirmar a intenção de avançar.'],
  ['Qualified', 'Informação suficiente para o próximo passo.'],
  ['Salesforce', 'A conversa se transforma em oportunidade.'],
  ['Proposal', 'Do interesse à proposta.'],
  ['Proposal', 'Próximos passos, na mesma conversa.'],
  ['Identity verification', 'Uma confirmação antes de continuar.'],
  ['Identity verification', 'Verificação simples, aqui simulada.'],
  ['Acceptance', 'Identidade confirmada. Próximo passo: aceite.'],
  ['Acceptance', 'Mais uma etapa concluída.'],
  ['Payment', 'O boleto chega com acompanhamento.'],
  ['Reminder', 'A jornada continua depois do envio.'],
  ['EPS handoff', 'Quando precisa de uma pessoa, a história vai junto.'],
  ['Human connected', 'Continuidade para o cliente. Contexto para a EPS.'],
] as const;
export const LAST = steps.length - 1;
export type Journey = { step: number; reminded: boolean };
export const initial: Journey = { step: 0, reminded: false };
export type Action = { type: 'next' | 'previous' | 'restart' } | { type: 'jump'; step: number } | { type: 'handoff' };
export function reducer(state: Journey, action: Action): Journey {
  if (action.type === 'restart') return { ...initial };
  if (action.type === 'handoff') return { ...state, step: 16 };
  const step = action.type === 'jump' ? action.step : state.step + (action.type === 'next' ? 1 : -1);
  const bounded = Math.max(0, Math.min(LAST, Number.isFinite(step) ? Math.floor(step) : 0));
  return { step: bounded, reminded: bounded < 15 ? false : bounded === 15 || action.type === 'jump' ? true : state.reminded };
}
export const milestones = [
  { label: 'Lead captured', product: 'Landing Page', from: 1, done: 2 },
  { label: 'WhatsApp started', product: 'WhatsApp', from: 2, done: 2 },
  { label: 'AI connected', product: 'AI Agent', from: 2, done: 2 },
  { label: 'Qualified', product: 'Qualification', from: 3, done: 6 },
  { label: 'CRM updated', product: 'Salesforce', from: 7, done: 7 },
  { label: 'Proposal sent', product: 'Proposal', from: 8, done: 9 },
  { label: 'Identity verified', product: 'Verify', from: 10, done: 12 },
  { label: 'Acceptance completed', product: 'Contract', from: 12, done: 13 },
  { label: 'Payment created', product: 'Payment', from: 14, done: 14 },
  { label: 'Reminder scheduled', product: 'Reminder', from: 14, done: 14 },
  { label: 'EPS handoff', product: 'EPS', from: 16, done: 17 },
];
export function milestoneStatus(step: number, m: typeof milestones[number]) {
  return step >= m.done ? 'completed' : step >= m.from ? 'active' : 'pending';
}
export function contextAt(step: number): [string, string][] {
  const fields: [string, string][] = [];
  if (step >= 2) fields.push(['Customer', 'Lucas Martins'], ['Company', 'Acme Brasil'], ['Employees', '120'], ['Need', 'Corporate benefits']);
  if (step >= 4) fields.push(['Current provider', 'Existing provider']);
  if (step >= 5) fields.push(['Reason for change', 'Experience + simpler management']);
  if (step >= 6) fields.push(['Intent', 'High'], ['Status', 'Qualified']);
  if (step >= 7) fields.push(['Opportunity', 'Created']);
  if (step >= 9) fields.push(['Proposal', 'Sent']);
  if (step >= 12) fields.push(['Identity', 'Verified']);
  if (step >= 13) fields.push(['Acceptance', 'Completed']);
  if (step >= 14) fields.push(['Payment', 'Pending']);
  if (step >= 16) fields.push(['Reason for handoff', 'Customer requested human assistance']);
  return fields;
}
export const replies = [
  'Sim, mas estamos avaliando trocar de fornecedor.',
  'Queremos melhorar a experiência e simplificar a gestão.',
  'Sim.',
];
export type Message = { at: number; role: 'agent' | 'customer' | 'human'; text: string };
const script: Message[] = [
  { at: 2, role: 'agent', text: 'Olá, Lucas! 👋\n\nRecebi seu pedido sobre benefícios para a Acme Brasil.\n\nVi que vocês têm aproximadamente 120 colaboradores.\n\nPosso fazer algumas perguntas rápidas para entender o que vocês precisam?' },
  { at: 3, role: 'agent', text: 'Hoje vocês já oferecem vale-refeição ou alimentação aos colaboradores?' },
  { at: 4, role: 'customer', text: replies[0] },
  { at: 4, role: 'agent', text: 'Qual é o principal motivo da avaliação?' },
  { at: 5, role: 'customer', text: replies[1] },
  { at: 5, role: 'agent', text: 'Entendi. Vocês gostariam de avançar com uma proposta para aproximadamente 120 colaboradores?' },
  { at: 6, role: 'customer', text: replies[2] },
  { at: 6, role: 'agent', text: 'Perfeito. Já tenho informação suficiente para avançarmos.' },
  { at: 8, role: 'agent', text: 'Lucas, com base nas informações que você compartilhou, preparei os próximos passos para a Acme Brasil.\n\nPosso enviar o documento para revisão?' },
  { at: 9, role: 'agent', text: 'Proposal_Acme_Brasil.pdf\nCorporate benefits · 120 employees\nDemo document' },
  { at: 10, role: 'agent', text: 'Para continuar com segurança, vou confirmar sua identidade.' },
  { at: 11, role: 'agent', text: 'Verification code sent — simulation' },
  { at: 12, role: 'agent', text: 'Identidade confirmada ✅\n\nVocê pode agora revisar e seguir com o aceite.' },
  { at: 13, role: 'agent', text: 'Acceptance completed — simulation' },
  { at: 14, role: 'agent', text: 'Processo concluído. Seu boleto está disponível.' },
  { at: 15, role: 'agent', text: 'Olá, Lucas. Passando para lembrar que o boleto da Acme Brasil vence em 2 dias.\n\nSe você já realizou o pagamento, pode desconsiderar esta mensagem.' },
  { at: 16, role: 'agent', text: 'Claro. Vou transferir você para um especialista.\n\nJá vou compartilhar o contexto da conversa para que você não precise repetir tudo.' },
  { at: 17, role: 'human', text: 'Oi Lucas, sou a Mariana 👋\n\nRecebi o contexto da conversa e já vi as informações da Acme Brasil.\n\nComo posso te ajudar?' },
];
export function messagesAt(state: Journey) {
  return script.filter(m => m.at <= state.step && (m.at !== 15 || state.reminded));
}
export const PAYMENT_CODE = 'DEMO-ACME-12480-NOT-PAYABLE';
