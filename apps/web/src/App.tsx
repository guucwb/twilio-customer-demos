import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Check, CheckCircle2, ChevronRight, Clock3, CreditCard, Fingerprint, HeartPulse, KeyRound, LoaderCircle, LockKeyhole, MessageCircle, MessageSquare, Phone, RefreshCw, ShieldCheck, Smartphone, UserRound, Wallet, X } from 'lucide-react';
import type { Capabilities, Channel, Session } from './types';

const labels: Record<Channel, string> = { whatsapp: 'WhatsApp', sms: 'SMS', call: 'Ligação' };
const icons = { whatsapp: MessageCircle, sms: MessageSquare, call: Phone };
const statuses: Record<string, string> = { pending: 'Pendente', approved: 'Aprovado', verified: 'Ativado', unverified: 'Aguardando ativação', denied: 'Não aprovado', expired: 'Expirado', erro: 'Erro', canceled: 'Cancelado', 'concluído': 'Concluído' };

async function read<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, { ...options, credentials: 'same-origin', cache: 'no-store' });
  const data = await response.json().catch(() => ({ error: 'O servidor não respondeu. Confira se a API está em execução.' }));
  if (!response.ok) throw new Error(data.error || 'Não foi possível concluir. Tente novamente.');
  return data;
}

function CodeInput({ value, onChange, disabled, label = 'Código de 6 dígitos' }: { value: string; onChange: (value: string) => void; disabled: boolean; label?: string }) {
  return <label className="code-label">{label}<span className="code-field">
    <span className="code-boxes" aria-hidden="true">{Array.from({ length: 6 }, (_, i) => <span key={i} className={i === value.length ? 'active' : ''}>{value[i] || '·'}</span>)}</span>
    <input autoFocus aria-label={label} autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={value} disabled={disabled} onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))} />
  </span></label>;
}

export default function App() {
  const [session, setSession] = useState<Session>();
  const [caps, setCaps] = useState<Capabilities>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [phone, setPhone] = useState('');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [code, setCode] = useState('');
  const [modal, setModal] = useState(false);
  const [qr, setQr] = useState('');
  const [account, setAccount] = useState('demo-4096');
  const [cooldown, setCooldown] = useState(0);
  const [showActivity, setShowActivity] = useState(true);
  const dialog = useRef<HTMLDialogElement>(null);

  const refresh = useCallback(async () => {
    const state = await read<Session>('/session'); setSession(state); setCooldown(state.retryAfter);
    return state;
  }, []);
  const initialize = useCallback(async () => {
    try { const [, capabilities] = await Promise.all([refresh(), read<Capabilities>('/capabilities')]); setCaps(capabilities); if (!capabilities.channels.whatsapp.enabled && capabilities.channels.sms.enabled) setChannel('sms'); }
    catch { setError('Não foi possível conectar ao portal. Confira se a API está em execução e tente atualizar.'); }
  }, [refresh]);
  useEffect(() => { void initialize(); }, [initialize]);
  useEffect(() => {
    const timer = window.setInterval(() => setCooldown(v => Math.max(0, v - 1)), 1000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (modal) dialog.current?.showModal(); else dialog.current?.close();
  }, [modal]);

  async function post<T = { ok: boolean }>(path: string, body: object = {}): Promise<T | undefined> {
    if (!session || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await read<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-demo-csrf': session.csrf }, body: JSON.stringify(body) });
      await refresh(); return result;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Conexão interrompida. Tente novamente.');
      const state = await refresh().catch(() => undefined);
      if (state && !state.totpPending && !state.totpVerified) setQr('');
      if (state && !state.authenticated) { setModal(false); setQr(''); }
    } finally { setBusy(false); }
  }
  async function start(event: FormEvent) {
    event.preventDefault();
    if (await post('/otp/start', { phone, channel })) { setCode(''); setNotice('Solicitação aceita pela Twilio. Confira o código no canal escolhido.'); }
  }
  async function check(event: FormEvent) {
    event.preventDefault();
    if (await post('/otp/check', { code })) { setCode(''); setNotice('Identidade confirmada. Bem-vinda ao seu portal.'); }
  }
  async function resend(next: Channel) {
    if (await post('/otp/resend', { channel: next })) { setChannel(next); setCode(''); setNotice(`Nova solicitação por ${labels[next]} aceita pela Twilio.`); }
  }
  async function reset() {
    if (await post('/reset')) { setPhone(''); setCode(''); setQr(''); setModal(false); setChannel('whatsapp'); setNotice('Demo reiniciada. O autenticador já ativado pode ser reutilizado nesta execução.'); }
  }
  async function enroll() {
    const data = await post<{ qr: string }>('/totp/enroll');
    if (data) { setQr(data.qr); setCode(''); }
  }
  async function confirmTotp(event: FormEvent) {
    event.preventDefault();
    if (await post(session?.totpVerified ? '/totp/challenge' : '/totp/activate', { code })) {
      setCode(''); setQr('');
      setNotice(session?.totpVerified ? 'Identidade confirmada. Você pode alterar a conta fictícia por 2 minutos.' : 'Autenticador ativado. Aguarde o próximo código para confirmar a operação.');
    }
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (await post('/reimbursement', { account })) { setModal(false); setNotice('Dados de reembolso fictícios atualizados com sucesso.'); }
  }
  const loadingIcon = busy ? <LoaderCircle className="spin" size={19} /> : <ArrowRight size={19} />;
  const beneficiary = session?.beneficiary;
  const feedback = <div aria-live="polite">{error && <div className="feedback error" role="alert">{error}</div>}{notice && <div className="feedback success"><CheckCircle2 size={18} />{notice}</div>}</div>;

  return <>
    <header className="header"><div className="header-inner">
      <a className="brand" href="/" aria-label="CarePlus início">CarePlus<span>+</span></a>
      <div className="header-title">Portal do Beneficiário</div>
      <div className="header-actions"><span className="demo-tag">Ambiente de demonstração</span><button className="reset" onClick={reset} disabled={busy || !session}><RefreshCw size={15} /> Resetar demo</button></div>
    </div></header>
    <main>
      {!session?.authenticated ? <section className="login-layout">
        <div className="welcome-panel">
          <div className="eyebrow"><span className="small-line" /> CUIDADO EM CADA CONEXÃO</div>
          <h1>Sua saúde.<br />Seu tempo.<br /><span>Seu portal.</span></h1>
          <p>Um acesso simples e seguro para cuidar<br className="desktop-only" /> do que mais importa: você.</p>
          <div className="welcome-benefits">
            <div><CreditCard size={21} /><span>Sua carteirinha, sempre por perto</span></div>
            <div><Wallet size={21} /><span>Reembolsos com mais praticidade</span></div>
            <div><ShieldCheck size={21} /><span>Proteção em cada etapa do acesso</span></div>
          </div>
          <div className="welcome-footer"><HeartPulse size={26} /><div>Cuidado que acompanha você.<small>Experiência digital do beneficiário</small></div></div>
        </div>
        <div className="login-side">
          <div className="login-card">
            <div className="section-icon"><LockKeyhole size={24} /></div>
            <div className="eyebrow muted">ACESSO SEGURO</div>
            <h2>{session?.pendingOtp ? 'Confira seu código' : 'Boas-vindas ao seu portal'}</h2>
            <p className="subtext">{session?.pendingOtp ? `Digite o código solicitado por ${labels[session.channel || channel]} para ${session.maskedPhone}.` : 'Entre com seu celular. Sem precisar lembrar de uma senha.'}</p>
            {feedback}
            {!caps ? <div className="setup-note">Conectando ao serviço de autenticação… <button className="text-button" onClick={() => void initialize()}>Atualizar</button></div> : !caps.ready && <div className="setup-note"><strong>Configuração necessária</strong><p>{caps.message}</p><button className="text-button" onClick={() => void initialize()}>Verificar novamente</button></div>}
            {session?.pendingOtp ? <form onSubmit={check} className="auth-form">
              <CodeInput value={code} onChange={setCode} disabled={busy} />
              <button className="primary" disabled={busy || code.length !== 6}>Confirmar e acessar {loadingIcon}</button>
              <div className="resend-actions">
                {session.channel === 'whatsapp' && <button type="button" className="text-button" disabled={busy || cooldown > 0} onClick={() => void resend('sms')}>Não recebeu? Enviar por SMS</button>}
                <button type="button" className="text-button secondary-text" disabled={busy || cooldown > 0} onClick={() => void resend(session.channel || channel)}>Reenviar por {labels[session.channel || channel]}{cooldown > 0 ? ` (${cooldown}s)` : ''}</button>
                <button type="button" className="text-button secondary-text" disabled={busy} onClick={reset}>Usar outro número</button>
              </div>
            </form> : <form onSubmit={start} className="auth-form">
              <label htmlFor="phone">Seu celular</label>
              <div className="phone-field"><Smartphone size={20} /><input id="phone" type="tel" autoComplete="tel" placeholder="+5511999999999" pattern="\+55[1-9]{2}9[0-9]{8}" required value={phone} onChange={e => setPhone(e.target.value.replace(/[\s()-]/g, ''))} disabled={busy} /></div>
              <small className="hint">Inclua +55, DDD e o número do celular.</small>
              <fieldset disabled={busy}><legend>Como prefere receber o código?</legend><div className="channel-options">
                {(['whatsapp', 'sms', 'call'] as Channel[]).filter(c => c !== 'call' || caps?.channels.call.enabled).map(c => { const Icon = icons[c]; return <label key={c} className={`channel ${channel === c ? 'selected' : ''} ${!caps?.channels[c].enabled ? 'disabled' : ''}`}><input type="radio" name="channel" value={c} checked={channel === c} disabled={!caps?.channels[c].enabled} onChange={() => setChannel(c)} /><Icon size={22} /><span>{labels[c]}</span>{channel === c && <Check size={14} className="selection-check" />}</label>; })}
              </div></fieldset>
              {caps?.ready && !caps.channels.whatsapp.enabled && <p className="channel-note">{caps.channels.whatsapp.detail}</p>}
              <button className="primary" disabled={busy || !caps?.ready || !caps.channels[channel].enabled}>{busy ? 'Solicitando código…' : 'Receber código'}{loadingIcon}</button>
              <p className="consent">Ao continuar, você solicita um código de acesso no canal selecionado. Use um número sob seu controle.</p>
            </form>}
            <div className="secure-caption"><ShieldCheck size={15} /> Autenticação com Twilio Verify</div>
          </div>
          <p className="fiction-note">Demonstração independente · Dados de beneficiário fictícios</p>
        </div>
      </section> : <section className="portal">
        <div className="portal-intro"><div><div className="eyebrow muted">SEU ESPAÇO DE CUIDADO</div><h1>Olá, {beneficiary?.name.split(' ')[0]}<span>.</span></h1><p>Tudo o que você precisa, com a tranquilidade que merece.</p></div><div className="authenticated"><ShieldCheck size={19} /><span>Identidade confirmada<small>Acesso por {labels[session.channel || 'sms']}</small></span></div></div>
        {feedback}
        <div className="portal-grid">
          <article className="member-card"><div className="member-top"><span className="brand">CarePlus<span>+</span></span><CreditCard size={25} /></div><div className="card-caption">CARTEIRINHA DIGITAL · FICTÍCIA</div><h2>{beneficiary?.name}</h2><p>{beneficiary?.plan}</p><div className="member-bottom"><div><small>NÚMERO DO BENEFICIÁRIO</small><strong>{beneficiary?.memberId}</strong></div><span className="member-chip">DEMO</span></div></article>
          <article className="portal-card"><div className="card-heading"><span className="section-icon"><Wallet size={23} /></span><span className="soft-tag">Exemplo fictício</span></div><h2>Status de reembolso</h2><div className="amount">R$ 350<span>,00</span></div><div className="reimbursement-status"><Clock3 size={16} /> Em análise <span>· Consulta fictícia</span></div><div className="card-foot">Previsão ilustrativa: até 5 dias úteis</div></article>
          <article className="portal-card"><div className="card-heading"><span className="section-icon"><UserRound size={23} /></span></div><h2>Dados pessoais</h2><dl><div><dt>Beneficiária</dt><dd>{beneficiary?.name}</dd></div><div><dt>Plano</dt><dd>{beneficiary?.plan}</dd></div><div><dt>Cadastro</dt><dd>Inteiramente fictício</dd></div></dl></article>
        </div>
        <article className="sensitive-card"><div className="sensitive-icon"><LockKeyhole size={25} /></div><div className="sensitive-copy"><div className="eyebrow muted">UMA CAMADA EXTRA DE PROTEÇÃO</div><h2>Seus reembolsos, com mais segurança</h2><p>{beneficiary?.reimbursement}. Confirme sua identidade para alterar.</p></div><button className="primary" disabled={busy} onClick={() => { setModal(true); setCode(''); setError(''); setNotice(''); }}>Alterar dados de reembolso <ArrowUpRight size={18} /></button></article>
        <div className="security-strip"><ShieldCheck size={19} /><p>Seu acesso foi validado. Operações sensíveis pedem uma nova confirmação.</p><span>Dados demonstrativos</span></div>
      </section>}

      <section className="activity-section">
        <div className="activity-heading"><div><div className="eyebrow muted">TRANSPARÊNCIA EM CADA ETAPA</div><h2>Atividade de autenticação <span className="event-count">{session?.events.length || 0}</span></h2><p>Somente eventos desta sessão da demo. Os status refletem respostas das APIs, não confirmação de entrega.</p></div><button className="text-button" onClick={() => setShowActivity(!showActivity)} aria-expanded={showActivity}>{showActivity ? 'Recolher' : 'Ver atividade'} <ChevronRight size={16} className={showActivity ? 'rotate' : ''} /></button></div>
        {showActivity && (session?.events.length ? <div className="table-scroll"><table><thead><tr><th>Horário</th><th>Método / operação</th><th>Status</th><th>Latência</th><th>Referência Twilio</th></tr></thead><tbody>{session.events.map(e => <tr key={e.id}><td>{new Date(e.timestamp).toLocaleTimeString('pt-BR')}<small>{new Date(e.timestamp).toLocaleDateString('pt-BR')}</small></td><td><strong>{labels[e.method as Channel] || (e.method === 'totp' ? 'TOTP' : 'Sessão')}</strong><small>{e.operation}</small></td><td><span className={`status ${['approved', 'verified', 'concluído'].includes(e.status) ? 'positive' : e.status === 'erro' ? 'negative' : ''}`}>{statuses[e.status] || e.status}</span><small>{e.source}{e.errorCode ? ` · ${e.errorCode}` : ''}</small></td><td>{e.latency} ms</td><td className="sid">{e.sid || '—'}</td></tr>)}</tbody></table></div> : <div className="empty-activity"><Clock3 size={23} /><div><strong>Seu próximo acesso começa esta história.</strong><p>Solicite um código para acompanhar as etapas de autenticação aqui.</p></div></div>)}
        <div className="capability-footer"><Fingerprint size={18} /><span><strong>Passkeys</strong> · {caps?.passkeys.detail || 'Disponibilidade não confirmada neste ambiente.'}</span></div>
      </section>
    </main>
    <footer className="footer"><span>CarePlus | Portal do Beneficiário</span><span>Demo de autenticação · Twilio Verify</span></footer>

    <dialog ref={dialog} onCancel={e => { if (busy) e.preventDefault(); else { setModal(false); setQr(''); setCode(''); } }} onClose={() => setModal(false)} aria-labelledby="stepup-title">
      <div className="modal-content"><button className="close-modal" aria-label="Fechar" disabled={busy} onClick={() => { setModal(false); setQr(''); setCode(''); }}><X size={21} /></button>
        <div className="section-icon"><KeyRound size={25} /></div><div className="eyebrow muted">PROTEÇÃO DOS SEUS DADOS</div>
        <h2 id="stepup-title">{session?.stepUp ? 'Alterar dados de reembolso' : session?.totpVerified ? 'Confirme que é você' : 'Configure seu autenticador'}</h2>
        <p className="subtext">{session?.stepUp ? 'Escolha uma conta fictícia. A autorização vale por 2 minutos e para uma única alteração.' : session?.totpVerified ? 'Digite um novo código do aplicativo autenticador para autorizar esta alteração.' : 'Vincule um aplicativo autenticador para proteger alterações nos seus reembolsos.'}</p>
        {feedback}
        {session?.stepUp ? <form onSubmit={save} className="auth-form"><label htmlFor="account">Conta de reembolso fictícia</label><select id="account" value={account} onChange={e => setAccount(e.target.value)} disabled={busy}><option value="demo-2048">Conta demonstração •••• 2048</option><option value="demo-4096">Conta demonstração •••• 4096</option></select><button className="primary" disabled={busy}>Salvar alteração {loadingIcon}</button></form> : <>
          {!session?.totpVerified && !qr && <><ol className="enrollment-steps"><li>Abra seu aplicativo autenticador.</li><li>Escaneie o QR code que aparecerá aqui.</li><li>Informe o código para ativar a proteção.</li></ol><button className="primary" disabled={busy || !caps?.totp.enabled} onClick={enroll}>{session?.totpPending ? 'Retomar configuração' : 'Configurar autenticador'} {loadingIcon}</button></>}
          {qr && !session?.totpVerified && <div className="qr-panel"><img src={qr} alt="QR code para vincular o autenticador desta sessão" /><p>Escaneie com seu aplicativo autenticador.<br />Exiba este código apenas durante a configuração.</p></div>}
          {(qr || session?.totpVerified) && <form onSubmit={confirmTotp} className="auth-form"><CodeInput value={code} onChange={setCode} disabled={busy} label="Código do autenticador" /><button className="primary" disabled={busy || code.length !== 6}>{session?.totpVerified ? 'Confirmar identidade' : 'Ativar autenticador'} {loadingIcon}</button></form>}
          {!session?.totpVerified && qr && <button className="text-button retry-enrollment" disabled={busy} onClick={enroll}>Retomar ou renovar configuração expirada</button>}
        </>}
        <div className="secure-caption"><ShieldCheck size={15} /> Validação real com Twilio Verify TOTP</div>
      </div>
    </dialog>
  </>;
}
