// One business intent, expressed per channel. Shared by the browser (previews) and the
// server (real sends), so a preview is exactly what a live adapter would deliver.
// All people, cases and content are fictitious. Non-clinical by design.

export type ChannelId = 'whatsapp' | 'sms' | 'email' | 'rcs';
export type Capability = 'LIVE' | 'DEMO' | 'NOT_PROVISIONED';

export const CHANNELS: ChannelId[] = ['whatsapp', 'sms', 'email', 'rcs'];

/** Upstream business context. Represents a Service Cloud case; not connected to Salesforce. */
export const businessCase = {
  id: 'ACH-2841',
  customer: { name: 'Mariana Souza', firstName: 'Mariana', initials: 'MS', audience: 'Consumidora' },
  origin: 'Salesforce Service Cloud',
  representation: 'Representação demonstrativa',
  preferredChannel: 'WhatsApp',
  consent: 'Comunicação autorizada',
  previousInteraction: 'Mariana entrou em contato buscando informações sobre onde encontrar um produto.',
  update: 'As informações sobre onde encontrar o produto já estão disponíveis.',
} as const;

/** What the business process asks for. Channel-agnostic: no channel detail lives here. */
export const intent = {
  id: 'request-update',
  objective: 'Atualização de solicitação',
  caseId: businessCase.id,
  recipientFirstName: businessCase.customer.firstName,
  continuation: 'reply',
} as const;

export type Intent = typeof intent;

export const strategies: Record<ChannelId, { strategy: string; channel: string; promise: string; traits: string[] }> = {
  whatsapp: {
    strategy: 'Conversacional',
    channel: 'WhatsApp',
    promise: 'Uma conversa que Mariana pode continuar no mesmo lugar.',
    traits: ['Tom próximo e conversacional', 'Resposta continua o atendimento', 'Canal preferido de Mariana'],
  },
  sms: {
    strategy: 'Alta cobertura',
    channel: 'SMS',
    promise: 'A mesma atualização, curta, em qualquer celular.',
    traits: ['Mensagem curta e direta', 'Alcance em qualquer aparelho', 'Sem depender de aplicativo'],
  },
  email: {
    strategy: 'Conteúdo detalhado',
    channel: 'Email',
    promise: 'Mais espaço para contexto e um registro formal.',
    traits: ['Assunto e contexto completos', 'Registro para consulta posterior', 'Identidade visual institucional'],
  },
  rcs: {
    strategy: 'Experiência rica',
    channel: 'RCS',
    promise: 'Uma mensagem visual, com ações sugeridas.',
    traits: ['Cartão visual com marca', 'Ações sugeridas em um toque', 'Evolução natural do SMS'],
  },
};

/** Appended only to real test sends, so a recipient never mistakes a test for an official Aché message. */
export const TEST_NOTICE = 'Mensagem de teste de uma demonstração. Não é uma comunicação oficial da Aché.';

export function whatsappMessage(i: Intent = intent) {
  return {
    body:
      `Olá, ${i.recipientFirstName}! Aqui é o atendimento Aché.\n\n` +
      `Temos uma atualização sobre a sua solicitação ${i.caseId}: ${lower(businessCase.update)}\n\n` +
      'Se quiser continuar o atendimento, é só responder a esta mensagem.',
  };
}

export function smsMessage(i: Intent = intent) {
  return { body: `Aché: ${i.recipientFirstName}, sua solicitação ${i.caseId} foi atualizada. Para continuar o atendimento, responda esta mensagem.` };
}

export function emailMessage(i: Intent = intent, options: { test?: boolean } = {}) {
  const subject = 'Atualização sobre sua solicitação Aché';
  const preheader = `Sua solicitação ${i.caseId} tem uma atualização.`;
  const paragraphs = [
    `Olá, ${i.recipientFirstName},`,
    `Temos uma atualização sobre a solicitação que você fez ao atendimento Aché. ${businessCase.update}`,
    'Se precisar de mais alguma informação, basta responder a este email. Nossa equipe continua o atendimento a partir do histórico da sua solicitação, sem que você precise explicar tudo de novo.',
  ];
  const text = [...paragraphs, `Protocolo: ${i.caseId}`, 'Atendimento Aché', ...(options.test ? [TEST_NOTICE] : [])].join('\n\n');
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;background:#f6f2ee;font-family:Manrope,'Segoe UI',Arial,sans-serif;color:#332f2d">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f2ee;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#3f0221;padding:26px 36px"><span style="font-size:26px;font-weight:800;letter-spacing:-.5px;color:#ffffff">Aché</span><span style="display:block;margin-top:4px;font-size:12px;letter-spacing:1.6px;text-transform:uppercase;color:#f3b9d3">Atendimento</span></td></tr>
<tr><td style="height:4px;background:linear-gradient(90deg,#d7006c,#f0644b)"></td></tr>
<tr><td style="padding:36px 36px 8px">
<h1 style="margin:0 0 22px;font-size:23px;line-height:1.3;color:#3f0221">Sua solicitação foi atualizada</h1>
${paragraphs.map(p => `<p style="margin:0 0 16px;font-size:16px;line-height:1.65">${esc(p)}</p>`).join('\n')}
</td></tr>
<tr><td style="padding:8px 36px 32px"><table role="presentation" width="100%" style="background:#fdf4f9;border-radius:10px"><tr><td style="padding:18px 20px;font-size:14px;line-height:1.6;color:#5b4e40">
<strong style="display:block;color:#b41e64;font-size:12px;letter-spacing:1.2px;text-transform:uppercase;margin-bottom:4px">Protocolo</strong>${esc(i.caseId)} · Para continuar, responda a este email.</td></tr></table></td></tr>
<tr><td style="padding:22px 36px 30px;border-top:1px solid #efe8e2;font-size:12px;line-height:1.6;color:#89755f">Você recebeu esta mensagem porque entrou em contato com o atendimento Aché.<br>Aché Laboratórios Farmacêuticos${options.test ? `<br><strong style="color:#b41e64">${esc(TEST_NOTICE)}</strong>` : ''}</td></tr>
</table></td></tr></table></body></html>`;
  return { subject, preheader, text, html };
}

/** RCS exists only as an experience preview. There is intentionally no send path for it. */
export function rcsPreview(i: Intent = intent) {
  return {
    title: 'Sua solicitação foi atualizada',
    body: `Olá, ${i.recipientFirstName}. ${businessCase.update}`,
    actions: ['Continuar atendimento', 'Ver protocolo'],
  };
}

/** GSM-7 vs UCS-2 segment estimate, for the SMS channel detail. */
export function smsSegments(text: string) {
  const gsm = /^[@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !"#¤%&'()*+,\-./0-9:;<=>?¡A-ZÄÖÑÜ§¿a-zäöñüà]*$/.test(text);
  const single = gsm ? 160 : 70;
  const multi = gsm ? 153 : 67;
  return { encoding: gsm ? 'GSM-7' : 'Unicode', segments: text.length <= single ? 1 : Math.ceil(text.length / multi), length: text.length };
}

function lower(s: string) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function esc(s: string) {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
