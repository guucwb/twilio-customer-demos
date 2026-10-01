import { useState } from 'react';
import { Loader2, Send, TriangleAlert } from 'lucide-react';
import type { ChannelReadiness } from '../server/capabilities';
import { strategies, type ChannelId } from '../shared/journey';

// Presenter-only. A real send needs: LIVE readiness, an explicit destination confirmation,
// and a click. The button locks while a request is in flight; the server also deduplicates.

type Props = {
  channel: ChannelId;
  readiness?: ChannelReadiness;
  customAllowed: boolean;
  busy: boolean;
  onSend: (recipient: { mode: 'configured' } | { mode: 'custom'; value: string }) => void;
};

export function LiveSend({ channel, readiness, customAllowed, busy, onSend }: Props) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [custom, setCustom] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const name = strategies[channel].channel;

  if (!readiness) return <p className="presenter-note">Envio real indisponível no momento. A demonstração continua normalmente.</p>;
  if (readiness.status === 'NOT_PROVISIONED') return <p className="presenter-note">{readiness.note}</p>;
  if (readiness.status !== 'LIVE') {
    return (
      <p className="presenter-note">
        {readiness.note}
        {readiness.missing.length > 0 && <> Para envio real: <code>{readiness.missing.join(', ')}</code>.</>}
      </p>
    );
  }

  const destination = useCustom ? custom.trim() : readiness.recipient;
  const ready = confirmed && !busy && (!useCustom || custom.trim().length > 4) && (useCustom || !!readiness.recipient);

  if (!open) {
    return (
      <div className="live-entry">
        <button className="ghost-button" onClick={() => setOpen(true)} disabled={busy}><Send size={15} /> Enviar teste real</button>
        <span className="presenter-note inline">{name} disponível para teste real, mediante confirmação.</span>
      </div>
    );
  }

  return (
    <div className="live-panel" role="group" aria-label={`Enviar teste real por ${name}`}>
      <strong>Enviar teste real por {name}</strong>
      <ul className="caveats">
        {readiness.caveats.map(c => <li key={c}><TriangleAlert size={14} />{c}</li>)}
        <li><TriangleAlert size={14} />A mensagem inclui um aviso de que é um teste de demonstração.</li>
      </ul>
      {readiness.recipient && (
        <label className="radio"><input type="radio" checked={!useCustom} onChange={() => setUseCustom(false)} /> Destino configurado: <b>{readiness.recipient}</b></label>
      )}
      {customAllowed && (
        <label className="radio">
          <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} /> Outro destino
          <input className="text" value={custom} onChange={e => { setCustom(e.target.value); setUseCustom(true); }} placeholder={channel === 'email' ? 'nome@empresa.com' : '+5511999999999'} maxLength={254} />
        </label>
      )}
      <label className="check"><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} /> Confirmo que {destination || 'este destino'} autorizou receber este teste.</label>
      <div className="live-actions">
        <button className="primary small" disabled={!ready} onClick={() => onSend(useCustom ? { mode: 'custom', value: custom.trim() } : { mode: 'configured' })}>
          {busy ? <><Loader2 size={15} className="spin" /> Enviando…</> : <><Send size={15} /> Enviar agora</>}
        </button>
        <button className="text-button" onClick={() => { setOpen(false); setConfirmed(false); }} disabled={busy}>Cancelar</button>
      </div>
    </div>
  );
}
