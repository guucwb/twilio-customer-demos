export class DemoError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function providerCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'number') return error.code;
}

export function safeError(error: unknown): { status: number; message: string; code?: number } {
  if (error instanceof DemoError) return { status: error.status, message: error.message };
  const code = providerCode(error);
  const messages: Record<number, string> = {
    20003: 'A Twilio recusou as credenciais ou permissões. Revise a API Key no backend.',
    20404: 'O recurso expirou ou não foi encontrado na Twilio. Reinicie esta etapa.',
    60200: 'A Twilio recusou os parâmetros. Confira o número e a configuração do Verify Service.',
    60202: 'Limite de tentativas atingido. Aguarde e solicite um novo código.',
    60203: 'Limite de envios atingido. Aguarde antes de tentar novamente.',
    60204: 'Este Verify Service não oferece o recurso solicitado. Revise o provisionamento no Console.',
    60205: 'SMS indisponível para este número. Use um celular brasileiro válido.',
    60212: 'Muitas solicitações simultâneas. Aguarde um momento.',
    60223: 'O canal não está habilitado. Revise os canais do Verify Service.',
    60238: 'A Twilio bloqueou esta solicitação. Consulte o código 60238 no Console para investigar a causa.',
    60239: 'A Twilio recusou esta tentativa (60239). Consulte o Verify no Console para detalhes.',
    60308: 'Limite de tentativas do autenticador atingido. Aguarde e tente novamente.',
    60310: 'Limite de ativação atingido. Reinicie a configuração do autenticador.',
    60311: 'Código do autenticador não aprovado. Confira o código atual e tente novamente.',
    60313: 'Cadastro de autenticador não autorizado. Revise as permissões da API Key e o provisionamento TOTP.',
    60318: 'O autenticador ainda não foi ativado. Conclua a configuração primeiro.',
    60324: 'Código do autenticador não aprovado. Aguarde o próximo código e tente novamente.',
    60383: 'O autenticador ainda não foi ativado. Conclua a configuração primeiro.',
    60390: 'Autenticador não encontrado. Cadastre-o novamente.',
    60392: 'Cadastro de autenticação não encontrado. Configure o autenticador novamente.',
    68008: 'WhatsApp não configurado neste Verify Service. Use SMS ou configure o remetente WhatsApp no Console.',
    21608: 'Conta de teste: valide o número destinatário no Console da Twilio antes de continuar.',
    21408: 'Permissão de envio ao destino não habilitada. Revise as permissões geográficas no Console.',
  };
  return { status: 502, message: code && messages[code] || 'Não foi possível concluir a solicitação na Twilio. Confira a conexão e a configuração e tente novamente.', ...(code ? { code } : {}) };
}
