import type { ProviderEvent } from '../shared/events';
import { businessCase, intent, strategies, type ChannelId } from '../shared/journey';

// Timeline events have two origins that must never be confused:
// - application: produced by this demo (always DEMO unless tied to a real presenter send)
// - provider: copied verbatim from a server response that came from Twilio / SendGrid
export type AppEvent = { kind: 'application'; id: string; at: string; mode: 'DEMO' | 'LIVE'; channel?: ChannelId; title: string; detail?: string; errorCode?: number | null };
export type ProviderTimelineEvent = { kind: 'provider'; id: string; at: string; event: ProviderEvent };
export type TimelineEvent = AppEvent | ProviderTimelineEvent;

export type DemoState = { channel: ChannelId; prepared: ChannelId[]; events: TimelineEvent[] };

export type Action =
  | { type: 'select'; channel: ChannelId }
  | { type: 'prepare'; channel: ChannelId }
  | { type: 'liveRequested'; channel: ChannelId }
  | { type: 'liveFailed'; channel: ChannelId; hint: string; errorCode?: number | null }
  | { type: 'providerEvents'; events: ProviderEvent[] }
  | { type: 'reset' };

let seq = 0;
const nextId = () => `e${++seq}`;
const stamp = () => new Date().toISOString();

function app(title: string, extra: Partial<AppEvent> = {}): AppEvent {
  return { kind: 'application', id: nextId(), at: stamp(), mode: 'DEMO', title, ...extra };
}

export function initialState(): DemoState {
  return {
    channel: 'whatsapp',
    prepared: [],
    events: [app('Processo de negócio solicitou uma comunicação', { detail: `${intent.objective} · Caso ${businessCase.id} · ${businessCase.origin} (representação)` })],
  };
}

export function reducer(state: DemoState, action: Action): DemoState {
  switch (action.type) {
    case 'select':
      return action.channel === state.channel ? state : { ...state, channel: action.channel };
    case 'prepare': {
      const { channel } = action;
      if (state.prepared.includes(channel)) return state;
      const s = strategies[channel];
      const changed = state.prepared.length > 0;
      const events: AppEvent[] = [app(`${changed ? 'Estratégia alterada para' : 'Estratégia selecionada:'} ${s.strategy} · ${s.channel}`, { channel, detail: changed ? 'Mesmo caso, mesmo objetivo. Só a expressão do canal muda.' : undefined })];
      if (channel === 'rcs') {
        events.push(app('Preview de experiência RCS gerado', { channel, detail: 'Somente visualização. Nenhuma mensagem é enviada por este canal.' }));
      } else {
        events.push(app(`Mensagem preparada para ${s.channel}`, { channel, detail: 'Simulação: nenhum envio externo.' }));
      }
      if (channel === 'whatsapp') events.push(app('Alternativa definida pelo processo: Alta cobertura · SMS', { channel, detail: 'Política de continuidade. Não é acionada nesta simulação.' }));
      return { ...state, channel, prepared: [...state.prepared, channel], events: [...state.events, ...events] };
    }
    case 'liveRequested':
      if (action.channel === 'rcs') return state;
      return { ...state, events: [...state.events, app(`Envio de teste real solicitado · ${strategies[action.channel].channel}`, { channel: action.channel, mode: 'LIVE', detail: 'Destino confirmado pelo apresentador.' })] };
    case 'liveFailed':
      return { ...state, events: [...state.events, app('Envio de teste não realizado', { channel: action.channel, mode: 'LIVE', detail: action.hint, errorCode: action.errorCode ?? null })] };
    case 'providerEvents': {
      const known = new Set(state.events.flatMap(e => (e.kind === 'provider' ? [`${e.event.id}:${e.event.status}:${e.event.errorCode}`] : [])));
      const fresh = action.events
        .filter(e => !known.has(`${e.id}:${e.status}:${e.errorCode}`))
        .map<ProviderTimelineEvent>(event => ({ kind: 'provider', id: nextId(), at: event.providerTime ?? event.observedAt, event }));
      return fresh.length ? { ...state, events: [...state.events, ...fresh] } : state;
    }
    case 'reset':
      return initialState();
  }
}

const STATUS: Record<string, { title: string; note?: string; tone: 'progress' | 'success' | 'problem' }> = {
  queued: { title: 'Mensagem aceita pela Twilio', note: 'Na fila de envio. Aceite não significa entrega.', tone: 'progress' },
  accepted: { title: 'Solicitação aceita pela Twilio', note: 'Aceite não significa entrega.', tone: 'progress' },
  sending: { title: 'Em envio pela Twilio', tone: 'progress' },
  sent: { title: 'Enviada ao canal', note: 'A Twilio entregou a mensagem ao canal; confirmação de entrega pendente.', tone: 'progress' },
  delivered: { title: 'Entrega confirmada', tone: 'success' },
  read: { title: 'Leitura confirmada pelo WhatsApp', tone: 'success' },
  undelivered: { title: 'Mensagem não entregue', tone: 'problem' },
  failed: { title: 'Falha no envio', tone: 'problem' },
  canceled: { title: 'Envio cancelado', tone: 'problem' },
};

export function describeProvider(e: ProviderEvent) {
  if (e.provider === 'Twilio SendGrid') return { title: 'Email aceito pela SendGrid', note: 'Aceito para processamento. A entrega não é acompanhada nesta demonstração.', tone: 'progress' as const };
  return STATUS[e.status] ?? { title: `Status informado pela Twilio: ${e.status}`, tone: 'progress' as const };
}
