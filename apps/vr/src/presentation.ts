// Presentation only: all highlights derive from the unchanged journey step.
// These mappings describe a pilot hypothesis, never live product activity.
export const statusLabels = { pending: 'Aguardando', active: 'Em uso', completed: 'Concluído' };
export const stack = [
  { id: 'whatsapp', name: 'WhatsApp', from: 2, active: [2, 15] },
  { id: 'agent', name: 'Agent Connect', from: 2, active: [2, 3, 4, 5, 6] },
  { id: 'orchestrator', name: 'Orchestrator', from: 7, active: [7, 8, 9, 13, 14, 16] },
  { id: 'memory', name: 'Memory', from: 2, active: [2, 4, 5, 6, 7, 9, 12, 13, 14, 16] },
  { id: 'verify', name: 'Verify', from: 10, active: [10, 11] },
  { id: 'intelligence', name: 'Conversation Intelligence', from: 17, active: [17] },
] as const;
export function stackStatus(step: number, product: typeof stack[number]) {
  return step < product.from ? 'pending' : (product.active as readonly number[]).includes(step) ? 'active' : 'completed';
}
export function productFocus(step: number) {
  if (step < 2) return { name: 'Da conversa à plataforma', description: 'Os produtos ganham destaque conforme participam da jornada.', event: 'Aguardando o consentimento e o início da conversa.' };
  if (step === 2 || step === 3) return { name: 'Agent Connect', description: 'Conecta o agente de IA à conversa', event: 'Agente de IA conectado' };
  if (step <= 6) return { name: 'Conversation Memory', description: 'Mantém o contexto do cliente ao longo da jornada', event: 'Contexto do cliente atualizado' };
  if (step <= 9) return { name: 'Conversation Orchestrator', description: 'Coordena ações e ferramentas', event: 'Próxima ação coordenada' };
  if (step <= 12) return { name: 'Verify', description: 'Verificação de identidade', event: step === 12 ? 'Identidade verificada · SIMULAÇÃO' : 'Confirmação de identidade · SIMULAÇÃO' };
  if (step === 13) return { name: 'Conversation Orchestrator', description: 'Coordena ações e ferramentas', event: 'Próxima ação coordenada: pagamento' };
  if (step <= 15) return { name: 'Messaging', description: 'Acompanha o cliente com o lembrete de pagamento', event: step === 15 ? 'Lembrete enviado · SIMULAÇÃO' : 'Lembrete de pagamento preparado' };
  if (step === 16) return { name: 'Orchestrator + Memory', description: 'Coordenação e contexto para a transferência à EPS', event: 'Context preserved' };
  return { name: 'Conversation Intelligence', description: 'Análise da conversa e insights', event: 'Conversa pronta para análise · SIMULAÇÃO' };
}
export const orchestrationEvents = [
  { from: 2, product: 'WhatsApp Business API', event: 'Conversa iniciada' },
  { from: 2, product: 'Agent Connect', event: 'Agente de IA conectado' },
  { from: 4, product: 'Conversation Memory', event: 'Contexto do cliente atualizado' },
  { from: 7, product: 'Conversation Orchestrator', event: 'Próxima ação coordenada' },
  { from: 12, product: 'Verify', event: 'Identidade verificada · SIMULAÇÃO' },
  { from: 14, product: 'Messaging', event: 'Lembrete de pagamento preparado' },
  { from: 16, product: 'Orchestrator + Memory', event: 'Transferência à EPS com contexto' },
  { from: 17, product: 'Conversation Intelligence', event: 'Conversa pronta para análise' },
];

// Translate rendered labels and data, keeping domain keys, fixtures and state intact.
const labels: Record<string, string> = {
  Start: 'Início', 'Landing page': 'Página de interesse', 'First contact': 'Primeiro contato', Qualification: 'Qualificação', Qualified: 'Qualificado', Proposal: 'Proposta', 'Identity verification': 'Verificação de identidade', Acceptance: 'Aceite', Payment: 'Pagamento', Reminder: 'Lembrete', 'EPS handoff': 'Transferência à EPS', 'Human connected': 'Especialista conectado',
  Customer: 'Cliente', Name: 'Nome', Company: 'Empresa', Employees: 'Colaboradores', Phone: 'Telefone', Email: 'E-mail', Need: 'Necessidade', 'Corporate benefits': 'Benefícios corporativos', 'Current provider': 'Fornecedor atual', 'Existing provider': 'Já possui fornecedor', 'Reason for change': 'Motivo da mudança', 'Experience + simpler management': 'Experiência e gestão mais simples', Intent: 'Intenção', High: 'Alta', Status: 'Situação', Opportunity: 'Oportunidade', Created: 'Criada', Sent: 'Enviada', Identity: 'Identidade', Verified: 'Verificada', Completed: 'Concluído', Pending: 'Pendente', 'Reason for handoff': 'Motivo da transferência', 'Customer requested human assistance': 'Cliente solicitou atendimento humano',
  Stage: 'Etapa', Discovery: 'Descoberta', Source: 'Origem', Product: 'Produto', Document: 'Documento', 'Demo document': 'Documento demonstrativo', 'Ready to send': 'Pronto para envio', 'Ready for review': 'Pronto para revisão', 'Due date': 'Vencimento', Scope: 'Escopo', 'Next steps': 'Próximos passos',
  'Lead captured': 'Lead recebido', 'WhatsApp started': 'Conversa iniciada', 'AI connected': 'Agente de IA conectado', 'CRM updated': 'CRM atualizado', 'Proposal sent': 'Proposta enviada', 'Identity verified': 'Identidade verificada', 'Acceptance completed': 'Aceite concluído', 'Payment created': 'Pagamento criado', 'Reminder scheduled': 'Lembrete agendado',
  'FIRST CONTACT': 'PRIMEIRO CONTATO', 'LEAD SUMMARY': 'RESUMO DO LEAD', QUALIFICATION: 'QUALIFICAÇÃO', 'SALESFORCE · SIMULATION': 'SALESFORCE · SIMULAÇÃO', 'COMMERCIAL PROPOSAL': 'PROPOSTA COMERCIAL', 'TWILIO VERIFY · SIMULATION': 'VERIFY · SIMULAÇÃO', CONTRACT: 'CONTRATO', 'PAYMENT · SIMULATION': 'PAGAMENTO · SIMULAÇÃO',
  'Demo metric': 'Métrica demonstrativa', 'Opportunity created': 'Oportunidade criada', 'Demo code: 123456': 'Código demonstrativo: 123456', 'Ready to verify': 'Pronto para verificar', 'DEMO — FICTITIOUS DATA': 'DEMO — DADOS FICTÍCIOS', 'DEMO DOCUMENT': 'DOCUMENTO DEMONSTRATIVO',
  'Verification code sent — simulation': 'Código de verificação enviado — simulação', 'Acceptance completed — simulation': 'Aceite concluído — simulação', 'Boleto generated — simulation': 'Boleto gerado — simulação',
  'Proposal_Acme_Brasil.pdf\nCorporate benefits · 120 employees\nDemo document': 'Proposal_Acme_Brasil.pdf\nBenefícios corporativos · 120 colaboradores\nDocumento demonstrativo',
};
export const pt = (text: string) => labels[text] ?? text;
