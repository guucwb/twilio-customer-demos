import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Check, CircleAlert, Cloud, Lock, Mail, MessageCircle, MessageSquareText, Network, RotateCcw, Sparkles, X } from 'lucide-react';
import type { Readiness } from '../server/capabilities';
import type { ProviderEvent } from '../shared/events';
import { businessCase, CHANNELS, intent, smsMessage, smsSegments, strategies, type ChannelId } from '../shared/journey';
import { Architecture } from './Architecture';
import { LiveSend } from './LiveSend';
import { ChannelPreview } from './Previews';
import { initialState, reducer } from './state';
import { Timeline } from './Timeline';

const ICONS: Record<ChannelId, typeof Mail> = { whatsapp: MessageCircle, sms: MessageSquareText, email: Mail, rcs: Sparkles };
const READINESS_LABEL = { LIVE: 'Envio real disponível', DEMO: 'Demonstração', NOT_PROVISIONED: 'Não provisionado' } as const;

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const [presenter, setPresenter] = useState(false);
  const [architecture, setArchitecture] = useState(false);
  const [readiness, setReadiness] = useState<Readiness>();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [sendCount, setSendCount] = useState(0);
  const generation = useRef(0);
  const polls = useRef<number[]>([]);

  const loadReadiness = useCallback(() => {
    fetch('/api/ache/readiness').then(r => (r.ok ? r.json() : undefined)).then(setReadiness).catch(() => setReadiness(undefined));
  }, []);
  useEffect(loadReadiness, [loadReadiness]);
  useEffect(() => () => polls.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const channel = state.channel;
  const strategy = strategies[channel];
  const prepared = state.prepared.includes(channel);

  function reset() {
    generation.current++;
    polls.current.forEach(clearTimeout);
    polls.current = [];
    dispatch({ type: 'reset' });
    setBusy(false);
    setSendCount(c => c + 1);
    setArchitecture(false);
    fetch('/api/ache/reset', { method: 'POST' }).catch(() => undefined);
    loadReadiness();
    setNotice({ text: 'Demo reiniciada. Pronta para uma nova apresentação.', tone: 'ok' });
  }

  function poll(ref: string, token: number, startedAt: number) {
    const id = window.setTimeout(async () => {
      if (token !== generation.current) return;
      try {
        const res = await fetch(`/api/ache/messages/${ref}`);
        if (!res.ok || token !== generation.current) return;
        const data: { events: ProviderEvent[]; final: boolean } = await res.json();
        dispatch({ type: 'providerEvents', events: data.events });
        if (!data.final && Date.now() - startedAt < 5 * 60_000) poll(ref, token, startedAt);
      } catch {
        if (token === generation.current && Date.now() - startedAt < 5 * 60_000) poll(ref, token, startedAt);
      }
    }, 3000);
    polls.current.push(id);
  }

  async function sendReal(sendChannel: ChannelId, recipient: { mode: 'configured' } | { mode: 'custom'; value: string }) {
    if (busy) return;
    setBusy(true);
    const token = generation.current;
    dispatch({ type: 'liveRequested', channel: sendChannel });
    try {
      const res = await fetch('/api/ache/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: sendChannel, requestId: crypto.randomUUID(), confirmed: true, recipient }),
      });
      const data = await res.json().catch(() => ({}));
      if (token !== generation.current) return;
      if (res.ok) {
        dispatch({ type: 'providerEvents', events: data.events });
        if (!data.final) poll(data.ref, token, Date.now());
        setNotice({ text: 'Solicitação aceita pelo provedor. Acompanhe o status na linha do tempo.', tone: 'ok' });
      } else {
        dispatch({ type: 'liveFailed', channel: sendChannel, hint: data.hint ?? data.error ?? 'Não foi possível enviar esta mensagem neste momento.', errorCode: data.errorCode });
        setNotice({ text: data.error ?? 'Não foi possível enviar esta mensagem neste momento.', tone: 'error' });
      }
    } catch {
      if (token !== generation.current) return;
      dispatch({ type: 'liveFailed', channel: sendChannel, hint: 'Sem conexão com o servidor da demonstração.' });
      setNotice({ text: 'Não foi possível enviar esta mensagem neste momento.', tone: 'error' });
    } finally {
      if (token === generation.current) {
        setBusy(false);
        setSendCount(c => c + 1);
      }
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand"><span className="wordmark">Aché</span><span className="product">Communication Hub</span></div>
        <div className="top-actions">
          <button className="quiet" onClick={() => setArchitecture(true)}><Network size={15} /> Arquitetura</button>
          <button className={`quiet toggle ${presenter ? 'on' : ''}`} onClick={() => setPresenter(p => !p)} aria-pressed={presenter}>Modo Demo</button>
          <button className="quiet" onClick={reset}><RotateCcw size={14} /> Reiniciar demo</button>
        </div>
      </header>

      {presenter && <PresenterStrip readiness={readiness} />}

      <section className="hero">
        <p className="eyebrow">Jornada de atendimento · Caso {businessCase.id}</p>
        <h1>Uma atualização para Mariana.</h1>
        <p className="lede">Uma única jornada de negócio, expressa no canal certo — sem duplicar a lógica da aplicação.</p>
      </section>

      <main className="workspace">
        <aside className="what" aria-labelledby="what-title">
          <header className="column-title">
            <span className="step">1</span>
            <div><h2 id="what-title">O que comunicar</h2><p>Definido pelo processo de negócio</p></div>
          </header>
          <div className="person">
            <span className="avatar">{businessCase.customer.initials}</span>
            <div><strong>{businessCase.customer.name}</strong><span>{businessCase.customer.audience}</span></div>
          </div>
          <dl className="facts">
            <dt>Caso</dt><dd>{businessCase.id}</dd>
            <dt>Origem</dt><dd><Cloud size={15} /> {businessCase.origin}<small>{businessCase.representation}</small></dd>
            <dt>Canal preferido</dt><dd>{businessCase.preferredChannel}</dd>
            <dt>Preferência</dt><dd className="consent"><Check size={15} /> {businessCase.consent}</dd>
          </dl>
          <div className="context">
            <span>Contexto</span>
            <p>{businessCase.previousInteraction}</p>
          </div>
          <div className="objective">
            <span>Objetivo</span>
            <strong>{intent.objective}</strong>
            <p>Informar a novidade e oferecer um caminho simples para continuar o atendimento.</p>
          </div>
          <p className="invariant"><Lock size={14} /> Permanece igual em qualquer canal</p>
        </aside>

        <section className="how" aria-labelledby="how-title">
          <header className="column-title">
            <span className="step">2</span>
            <div><h2 id="how-title">Como comunicar</h2><p>Estratégia de comunicação · camada Twilio</p></div>
          </header>

          <div className="strategies" role="radiogroup" aria-label="Estratégia de comunicação">
            {CHANNELS.map(c => {
              const Icon = ICONS[c];
              const s = strategies[c];
              const r = readiness?.channels[c];
              return (
                <button key={c} role="radio" aria-checked={channel === c} className={`strategy ${channel === c ? 'selected' : ''} ${c}`} onClick={() => dispatch({ type: 'select', channel: c })}>
                  <Icon size={20} />
                  <span className="strategy-name">{s.strategy}</span>
                  <span className="strategy-channel">{s.channel}{c === 'rcs' && <em>Preview de experiência</em>}</span>
                  {presenter && r && <span className={`readiness ${r.status.toLowerCase()}`}>{READINESS_LABEL[r.status]}</span>}
                </button>
              );
            })}
          </div>

          <div className="stage">
            <div className="intent-pin" aria-label="Intenção de negócio inalterada">
              <Lock size={13} />
              <span>{businessCase.customer.name}</span><i />
              <span>{businessCase.id}</span><i />
              <span>{intent.objective}</span>
              <b>mesma intenção</b>
            </div>
            <div className="stage-body" key={channel}>
              <div className="preview-frame"><ChannelPreview channel={channel} /></div>
              <div className="expression">
                <p className="eyebrow">{channel === 'rcs' ? 'Preview de experiência' : 'Como Mariana recebe'}</p>
                <h3>{strategy.strategy}<span>{strategy.channel}</span></h3>
                <p className="promise">{strategy.promise}</p>
                <ul className="traits">{strategy.traits.map(t => <li key={t}>{t}</li>)}</ul>
                {presenter && channel === 'sms' && <SmsDetail />}
                <div className="stage-actions">
                  <button className="primary" onClick={() => dispatch({ type: 'prepare', channel })} disabled={prepared}>
                    {prepared ? <><Check size={17} /> {channel === 'rcs' ? 'Preview gerado' : 'Comunicação preparada'}</> : channel === 'rcs' ? 'Gerar preview' : 'Preparar comunicação'}
                  </button>
                  {prepared && channel !== 'rcs' && <span className="outcome">Pronta no canal {strategy.channel}. Simulação, sem envio externo.</span>}
                  {prepared && channel === 'rcs' && <span className="outcome">Somente visualização. Nenhuma mensagem enviada.</span>}
                </div>
                {presenter && channel !== 'rcs' && (
                  <LiveSend key={`${channel}-${sendCount}`} channel={channel} readiness={readiness?.channels[channel]} customAllowed={!!readiness?.customRecipient} busy={busy} onSend={r => sendReal(channel, r)} />
                )}
                {presenter && channel === 'rcs' && <p className="presenter-note">{readiness?.channels.rcs.note ?? 'RCS não provisionado neste ambiente.'}</p>}
              </div>
            </div>
          </div>
        </section>

        <Timeline events={state.events} presenter={presenter} />
      </main>

      <footer className="footer">
        <span>Demonstração com pessoas e casos fictícios. Não conectada ao Salesforce nem a sistemas da Aché.</span>
        <span>Powered by <b>Twilio</b></span>
      </footer>

      {notice && <div className={`toast ${notice.tone}`} role="status">{notice.tone === 'ok' ? <Check size={17} /> : <CircleAlert size={17} />}{notice.text}<button className="icon-button" onClick={() => setNotice(null)} aria-label="Fechar aviso"><X size={15} /></button></div>}
      <Architecture open={architecture} onClose={() => setArchitecture(false)} />
    </div>
  );
}

function PresenterStrip({ readiness }: { readiness?: Readiness }) {
  return (
    <div className="presenter-strip" role="region" aria-label="Modo Demo: prontidão dos canais">
      <strong>Modo Demo</strong>
      {!readiness && <span>Servidor da demo indisponível. A apresentação continua em modo demonstração.</span>}
      {readiness && CHANNELS.map(c => {
        const r = readiness.channels[c];
        return <span key={c} className={`chip ${r.status.toLowerCase()}`} title={r.note}>{strategies[c].channel}: {READINESS_LABEL[r.status]}</span>;
      })}
      {readiness && <span className="muted">Envio real {readiness.liveEnabled ? 'habilitado' : 'desativado'} · Salesforce: representação</span>}
    </div>
  );
}

function SmsDetail() {
  const s = smsSegments(smsMessage().body);
  return <p className="presenter-note">{s.length} caracteres · {s.encoding} · {s.segments} {s.segments === 1 ? 'segmento' : 'segmentos'}</p>;
}
