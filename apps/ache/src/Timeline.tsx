import { describeProvider, type TimelineEvent } from './state';
import { strategies } from '../shared/journey';

const time = (iso: string) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export function Timeline({ events, presenter }: { events: TimelineEvent[]; presenter: boolean }) {
  const hasProvider = events.some(e => e.kind === 'provider');
  return (
    <section className="timeline" aria-labelledby="timeline-title">
      <header className="column-title">
        <span className="step">3</span>
        <div><h2 id="timeline-title">O que aconteceu</h2><p>Eventos da jornada, em ordem</p></div>
      </header>
      <ol aria-live="polite">
        {events.map(e => (e.kind === 'application' ? (
          <li key={e.id} className={`event app-event ${e.mode === 'LIVE' ? 'live' : ''}`}>
            <span className="event-dot" />
            <div className="event-top"><span className="source application">Aplicação</span>{presenter && <span className="mode">{e.mode === 'LIVE' ? 'Teste real' : 'Simulação'}</span>}<time>{time(e.at)}</time></div>
            <strong>{e.title}</strong>
            {e.detail && <p>{e.detail}</p>}
            {e.errorCode ? <p className="code">Código informado pelo provedor: {e.errorCode}</p> : null}
          </li>
        ) : (
          <ProviderItem key={e.id} item={e} />
        )))}
      </ol>
      {!hasProvider && <p className="timeline-note">Eventos da Twilio aparecem aqui somente quando vêm de um envio real.</p>}
    </section>
  );
}

function ProviderItem({ item }: { item: Extract<TimelineEvent, { kind: 'provider' }> }) {
  const e = item.event;
  const d = describeProvider(e);
  const sendgrid = e.provider === 'Twilio SendGrid';
  return (
    <li className={`event provider ${d.tone}`}>
      <span className="event-dot" />
      <div className="event-top"><span className={`source ${sendgrid ? 'sendgrid' : 'twilio'}`}>{sendgrid ? 'SendGrid' : 'Twilio'}</span><time>{time(item.at)}</time></div>
      <strong>{d.title}</strong>
      {d.note && <p>{d.note}</p>}
      <details>
        <summary>Detalhes do provedor</summary>
        <dl>
          <dt>{sendgrid ? 'Message ID' : 'Message SID'}</dt><dd className="mono">{e.id}</dd>
          <dt>Status</dt><dd className="mono">{e.status}</dd>
          <dt>Canal solicitado</dt><dd>{strategies[e.requestedChannel].channel}</dd>
          <dt>Canal efetivo</dt><dd>{e.actualChannel ? strategies[e.actualChannel].channel : 'não informado'}</dd>
          <dt>Fallback</dt><dd>não acionado</dd>
          {e.errorCode ? <><dt>Código de erro</dt><dd className="mono">{e.errorCode}</dd></> : null}
          <dt>Horário do provedor</dt><dd>{e.providerTime ? time(e.providerTime) : 'não informado'}</dd>
          <dt>Observado em</dt><dd>{time(e.observedAt)}</dd>
        </dl>
      </details>
    </li>
  );
}
