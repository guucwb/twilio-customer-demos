import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, ArrowLeft, Check, CheckCheck, ChevronRight, CircleHelp, Clock3, FileText, Layers, MessageCircle, RotateCcw, ShieldCheck, UserRound, X } from 'lucide-react';
import { orchestrationEvents, productFocus, pt, stack, stackStatus, statusLabels } from './presentation';
import { contextAt, initial, LAST, messagesAt, milestones, milestoneStatus, PAYMENT_CODE, reducer, replies, steps } from './journey';

function Badge({ children, amber = false }: { children: ReactNode; amber?: boolean }) {
  return <span className={`badge ${amber ? 'amber' : ''}`}>{typeof children === 'string' ? pt(children) : children}</span>;
}
function Fields({ rows, newKeys = [] }: { rows: [string, string][]; newKeys?: string[] }) {
  return <dl className="fields">{rows.map(([k, v]) => <div key={k} className={newKeys.includes(k) ? 'field-new' : undefined}><dt>{pt(k)}{newKeys.includes(k) && <span className="new-field">Novo</span>}</dt><dd>{pt(v)}</dd></div>)}</dl>;
}
function Card({ label, title, children }: { label: string; title: string; children: ReactNode }) {
  return <section className="detail-card"><p className="eyebrow">{pt(label)}</p><h3>{pt(title)}</h3>{children}</section>;
}
export default function App() {
  const [state, dispatch] = useReducer(reducer, initial);
  const { step } = state;
  const [consent, setConsent] = useState(true);
  const [code, setCode] = useState('123456');
  const [codeError, setCodeError] = useState('');
  const [modal, setModal] = useState<'proposal' | 'boleto' | 'question' | null>(null);
  const [copied, setCopied] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const systemScroll = useRef<HTMLDivElement>(null);
  const context = contextAt(step);
  const focus = productFocus(step);
  const newKeys = context.filter(([key]) => !contextAt(Math.max(0, step - 1)).some(([previous]) => previous === key)).map(([key]) => key);
  const latestContext = context[context.length - 1];
  const generation = useRef(0);
  const next = () => dispatch({ type: 'next' });
  function reset() { generation.current++; dispatch({ type: 'restart' }); setConsent(true); setCode('123456'); setModal(null); setCopied(''); setCodeError(''); }
  useEffect(() => {
    generation.current++; setModal(null); setCopied(''); setCodeError(''); setCode('123456');
    const el = transcript.current;
    if (el) el.scrollTop = el.scrollHeight;
    const system = systemScroll.current;
    if (system) {
      const reached = system.querySelectorAll<HTMLElement>('details[open] .active, details[open] .completed');
      const latest = reached[reached.length - 1];
      system.scrollTop = latest ? Math.max(0, system.scrollTop + latest.getBoundingClientRect().bottom - system.getBoundingClientRect().top - system.clientHeight + 55) : 0;
    }
  }, [step]);
  useEffect(() => { if (modal) dialog.current?.showModal(); else dialog.current?.close(); }, [modal]);
  async function copyCode() {
    const token = generation.current;
    try { await navigator.clipboard.writeText(PAYMENT_CODE); if (token === generation.current) setCopied('Copiado — código demonstrativo, não pagável'); }
    catch { if (token === generation.current) setCopied(`Selecione e copie: ${PAYMENT_CODE}`); }
  }
  function confirm() {
    if (code === '123456') next();
    else setCodeError('Use 123456 para esta simulação.');
  }
  const handoff = () => dispatch({ type: 'handoff' });
  const paymentActions = <div className="actions"><button onClick={() => setModal('boleto')}><FileText size={16} /> Ver boleto</button><button onClick={copyCode}>Copiar código</button><button onClick={handoff}>{step === 15 ? 'Preciso de ajuda' : 'Falar com alguém'}</button>{copied && <p role="status" className="notice">{copied}</p>}</div>;
  let action: ReactNode;
  if (step === 2) action = <button className="primary" onClick={next}>Vamos conversar <ArrowRight size={16} /></button>;
  if (step >= 3 && step <= 5) action = <button className="quick-reply" onClick={next}>{replies[step - 3]} <ChevronRight size={16} /></button>;
  if (step === 6) action = <button className="primary" onClick={next}>Ver CRM simulado <ArrowRight size={16} /></button>;
  if (step === 7) action = <button className="primary" onClick={next}>Continuar com proposta <ArrowRight size={16} /></button>;
  if (step === 8) action = <div className="actions"><button className="primary" onClick={next}>Ver proposta</button><button onClick={() => setModal('question')}>Tenho uma dúvida</button></div>;
  if (step === 9) action = <button className="primary" onClick={() => setModal('proposal')}><FileText size={16} /> Abrir documento</button>;
  if (step === 10) action = <button className="primary" onClick={next}><ShieldCheck size={16} /> Enviar código de verificação</button>;
  if (step === 11) action = <form className="verification" onSubmit={e => { e.preventDefault(); confirm(); }}><label htmlFor="code">Código de verificação demonstrativo</label><div><input id="code" inputMode="numeric" autoComplete="off" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} /><button className="primary" type="submit">Confirmar</button></div>{codeError && <p role="alert">{codeError}</p>}</form>;
  if (step === 12) action = <button className="primary" onClick={next}>Continuar para o aceite</button>;
  if (step === 13) action = <button className="primary" onClick={next}>Ver boleto <ArrowRight size={16} /></button>;
  if (step === 14 || step === 15) action = paymentActions;
  if (step === 16) action = <button className="primary" onClick={next}><UserRound size={16} /> Conectar especialista da EPS</button>;
  if (step === 17) action = <p className="success"><CheckCheck size={18} /> Contexto da conversa entregue</p>;

  let detail: ReactNode;
  if (step === 2) detail = <Card label="FIRST CONTACT" title="O interesse ainda está aqui."><div className="big-number">2<span>segundos</span></div><p>Formulário enviado → primeira conversa: <strong>2s</strong></p><Badge>Demo metric</Badge><p className="note">Tempo ilustrativo do roteiro. Não é um benchmark da Twilio.</p></Card>;
  if (step >= 3 && step <= 6) detail = <Card label={step === 6 ? 'LEAD SUMMARY' : 'QUALIFICATION'} title={step === 6 ? 'Qualified' : `${step - 2} de 3 perguntas`}><p>{step === 6 ? 'Concluído automaticamente — simulação' : 'Respostas rápidas, sem perder o fio da conversa.'}</p><Fields rows={context.filter(([k]) => ['Customer', 'Company', 'Employees', 'Current provider', 'Reason for change', 'Intent', 'Status'].includes(k))} /></Card>;
  if (step === 7) detail = <Card label="SALESFORCE · SIMULATION" title="Acme Brasil — Benefícios"><Badge>Oportunidade criada</Badge><Fields rows={[[ 'Lead', 'Lucas Martins'], ['Company', 'Acme Brasil'], ['Status', 'Qualified'], ['Stage', 'Discovery'], ['Source', 'WhatsApp']]} /><p className="success"><CheckCheck size={18} /> Resumo da conversa anexado</p></Card>;
  if (step === 8 || step === 9) detail = <Card label="COMMERCIAL PROPOSAL" title="Próximos passos claros."><FileText size={36} strokeWidth={1.3} /><p className="filename">Proposal_Acme_Brasil.pdf</p><Fields rows={[[ 'Product', 'Corporate benefits'], ['Employees', '120'], ['Document', 'Demo document'], ['Status', step === 9 ? 'Sent' : 'Ready to send']]} /><p className="note">Prévia local de documento fictício.</p></Card>;
  if (step === 10 || step === 11) detail = <Card label="TWILIO VERIFY · SIMULATION" title="Confirmar para continuar."><ShieldCheck size={44} strokeWidth={1.3} /><p>{step === 11 ? 'Código de verificação enviado' : 'Confirmação de identidade antes do aceite.'}</p><Badge>{step === 11 ? 'Demo code: 123456' : 'Ready to verify'}</Badge><p className="note">Fluxo de verificação simulado para demonstração.</p></Card>;
  if (step === 12 || step === 13) detail = <Card label="CONTRACT" title={step === 12 ? 'Ready for review' : 'Aceite registrado.'}><p className="success"><ShieldCheck size={19} /> Identidade verificada</p><Fields rows={[[ 'Company', 'Acme Brasil'], ['Employees', '120'], ['Status', step === 12 ? 'Ready for review' : 'Acceptance completed — simulation']]} /><p className="note">Fluxo final de aceite sujeito à validação jurídica e de segurança da VR.</p><p className="note">O canal de aceite em produção será definido no piloto.</p></Card>;
  if (step === 14 || step === 15) detail = <Card label="PAYMENT · SIMULATION" title="R$ 12.480,00"><Badge amber>Pending</Badge><Fields rows={[[ 'Due date', '15/10/2026'], ['Company', 'Acme Brasil'], ['Payment', 'Boleto generated — simulation']]} /><div className="reminder"><Clock3 size={18} /><p>{step === 15 ? 'Lembrete de pagamento enviado · 13/10/2026' : 'Lembrete agendado — 2 dias antes do vencimento'}</p></div>{step === 14 && <button className="primary" onClick={next}>Simular lembrete</button>}<p className="note">Lembrete utilitário — simulação. Sem aprovação real de template.</p></Card>;
  if (step >= 16) detail = <Card label="TRANSFERÊNCIA IA → ESPECIALISTA" title="Context preserved"><Badge amber>SIMULAÇÃO</Badge><div className="handoff-chain" aria-label="Transferência de contexto"><strong>Conversation Orchestrator</strong><span aria-hidden="true">↓</span><strong>Conversation Memory</strong><span aria-hidden="true">↓</span><strong className="partner-destination">EPS Partner A</strong></div><p className="handoff-caption">{step === 17 ? 'O mesmo contexto foi entregue à EPS.' : 'O mesmo contexto acompanha a transferência à EPS.'}</p><h4>CONTEXTO DO CLIENTE</h4><Fields rows={context} /></Card>;

  return <div className="app">
    <header className="topbar"><div className="brand"><span className="brand-icon"><Layers size={23} /></span><div><h1>VR Sales Journey</h1><p>Jornada comercial pelo WhatsApp — ambiente demonstrativo</p></div></div><div className="header-tags"><span className="offline"><span /> Local · funciona sem internet</span><Badge amber>DEMO — FICTITIOUS DATA</Badge></div></header>
    <div className="premise"><span>Twilio × VR Benefícios</span><p>Hipótese de experiência · arquitetura final a definir com a VR durante discovery / piloto.</p></div>
    <section className="twilio-stack" aria-label="Twilio Stack"><div className="stack-title"><strong>Twilio Stack</strong><small>TWILIO · SIMULAÇÃO</small></div><div className="stack-products">{stack.map(product => { const status = stackStatus(step, product); return <span key={product.id} data-product={product.id} className={`stack-product ${status}`} aria-label={`${product.name}: ${statusLabels[status]}`}><span className="stack-dot">{status === 'completed' && <Check size={11} />}</span><span>{product.name}</span><small>{statusLabels[status]}</small></span>; })}</div></section>
    <main>
      <section className="customer-panel" aria-label="Experiência do cliente">
        <header className="panel-title"><span className="eyebrow">01 / EXPERIÊNCIA DO CLIENTE</span><Badge>{pt(steps[step][0])}</Badge></header>
        <h2 className="scene-title">{steps[step][1]}</h2>
        {step === 0 ? <div className="intro"><div className="intro-symbol"><MessageCircle size={45} strokeWidth={1.4} /></div><p className="eyebrow">DO PRIMEIRO CONTATO À CONTINUIDADE</p><h2>Menos espera.<br />Mais conversa.</h2><p>Um lead, uma jornada comercial e todo o contexto<br className="desktop" /> junto — até quando uma pessoa assume.</p><div className="intro-path"><span>Interesse</span><ArrowRight size={16} /><span>Conversa</span><ArrowRight size={16} /><span>Continuidade</span></div><button className="primary start" onClick={next}>Iniciar demo <ArrowRight size={18} /></button><p className="note">~3 minutos · dados fictícios · nenhuma integração real</p></div> : step === 1 ? <div className="landing"><div className="landing-copy"><Badge>BENEFÍCIOS CORPORATIVOS</Badge><h2>Benefícios para<br />sua empresa</h2><p>Uma nova conversa sobre o cuidado com quem faz sua empresa acontecer.</p><div className="benefit"><Check size={18} /> Experiência para colaboradores</div><div className="benefit"><Check size={18} /> Gestão mais simples</div><p className="note">Landing page fictícia, sem identidade visual oficial da VR.</p></div><form onSubmit={e => { e.preventDefault(); if (consent) next(); }}><h3>Vamos conversar?</h3><p>Dados de exemplo, prontos para a demo.</p>{[['Name', 'Lucas Martins'], ['Company', 'Acme Brasil'], ['Employees', '120'], ['Phone', '+55 11 99999-0000'], ['Email', 'lucas@acme.example']].map(([label, value]) => <label className="form-field" key={label}>{pt(label)}<input value={value} readOnly /></label>)}<label className="consent"><input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} required />Concordo em receber informações sobre esta solicitação via WhatsApp.</label><button className="primary" disabled={!consent}>Continuar no WhatsApp <ArrowRight size={16} /></button></form></div> : <div className="experience"><div className="phone"><div className="phone-status"><span>09:41</span><span>● ● ● ▰</span></div><header className="chat-header"><span className="chat-avatar">{step === 17 ? <UserRound size={22} /> : <MessageCircle size={22} />}</span><div><strong>{step === 17 ? 'Mariana · EPS Partner A' : 'Benefícios · assistente'}</strong><small>{step === 17 ? 'HUMANO — EPS Partner A' : 'WhatsApp · agente de IA · simulação'}</small></div></header><div className="chat-log" ref={transcript} aria-label="Histórico da conversa" role="log" aria-live="polite"><div className="chat-date">{step >= 15 && state.reminded ? '13 OUT · LEMBRETE SIMULADO' : 'HOJE · DEMO'}</div>{messagesAt(state).map((m, i) => <article className={`bubble ${m.role}`} key={i}><small>{m.role === 'customer' ? 'Lucas' : m.role === 'human' ? 'Mariana · EPS' : 'Assistente'}</small><p>{pt(m.text)}</p><span className="ticks"><CheckCheck size={12} /></span></article>)}</div><div className="chat-actions">{action}</div><footer className="phone-footer">Conversa simulada · nenhum envio externo</footer></div><aside className="scene-detail" aria-label="Detalhes da etapa">{detail}{step >= 2 && <div className="contact-strip"><Clock3 size={16} /><span>PRIMEIRO CONTATO <strong>2 segundos</strong><small>Métrica demonstrativa</small></span></div>}</aside></div>}
      </section>
      <aside className="system-panel" aria-label="Twilio Orchestration">
        <header className="orchestration-heading"><div><p className="eyebrow">02 / TWILIO</p><h2>Twilio Orchestration</h2><p>O que acontece por trás da conversa</p></div><Badge amber>SIMULAÇÃO</Badge></header>
        <section className="product-focus" aria-label="Produto em destaque" aria-live="polite"><p className="eyebrow">{step < 2 ? 'HIPÓTESE DE PLATAFORMA' : 'NESTA ETAPA'}</p><h3>{focus.name}</h3><p>{focus.description}</p><strong>{focus.event}</strong>{step === 2 && <small>WhatsApp Business API · Conversa iniciada</small>}{step === 17 && <small>Nenhuma análise foi executada nesta demo.</small>}</section>
        <div className="system-scroll" ref={systemScroll}>
          <details className="twilio-events" aria-label="Eventos Twilio"><summary>Eventos Twilio <span>{orchestrationEvents.filter(event => step >= event.from).length} registrados</span></summary>{step < 2 ? <p className="waiting-event">Os eventos aparecem com o avanço da conversa.</p> : <ol>{orchestrationEvents.filter(event => step >= event.from).map(event => <li key={event.product} className={step === event.from ? 'active' : 'completed'}><CheckCheck size={15} /><span><strong>{event.product}</strong><small>{event.event}</small></span></li>)}</ol>}</details>
          <details className="business-progress"><summary>Jornada de negócio <span>{milestones.filter(m => milestoneStatus(step, m) === 'completed').length} / {milestones.length}</span></summary><ol className="timeline">{milestones.map((m, i) => { const status = milestoneStatus(step, m); return <li className={status} key={m.label} aria-label={`${pt(m.label)}: ${statusLabels[status]}`}><span className="milestone-dot">{status === 'completed' ? <Check size={13} /> : i + 1}</span><strong>{pt(m.label)}</strong></li>; })}</ol></details>
        </div>
        <section className="partner-systems" aria-label="VR / PARTNERS"><p className="eyebrow">VR / PARTNERS</p><div className={step >= 7 ? 'partner-used' : ''}><strong>Salesforce</strong><span>{step >= 7 ? 'Oportunidade criada' : 'CRM'} · simulação</span></div><div className={step >= 12 ? 'partner-used' : ''}><strong>VR Portal</strong><span>{step >= 14 ? 'Pagamento' : step >= 12 ? 'Aceite' : 'Aceite / pagamento'} · simulação</span></div><div className={step >= 16 ? 'partner-used' : ''}><strong>EPS Partner A</strong><span>{step >= 17 ? 'Contexto entregue' : step >= 16 ? 'Recebendo contexto' : 'Atendimento humano'} · simulação</span></div></section>
        <details className={`context ${step >= 16 ? 'memory-handoff' : ''}`} key={step >= 16 ? 'handoff' : 'journey'} open={step >= 16 || undefined}><summary><Layers size={16} /><span>Twilio Conversation Memory<small>Context simulation · simulação de contexto</small></span><Badge>{context.length} campos</Badge></summary>{context.length ? <><Fields rows={context} newKeys={newKeys} />{step >= 16 && <p className="success"><CheckCheck size={16} /> Mesmo contexto entregue à EPS Partner A.</p>}</> : <p>O contexto será construído ao longo da conversa.</p>}</details>
        {latestContext && <p className="memory-update" aria-live="polite"><span>{step >= 16 ? 'Context preserved' : newKeys.length ? `+${newKeys.length} ${newKeys.length === 1 ? 'campo' : 'campos'}` : `${context.length} campos preservados`}</span> {pt(latestContext[0])}: {pt(latestContext[1])}</p>}
        <p className="architecture-note">Integration architecture and ownership to be defined during the pilot.</p><p className="architecture-note">Mapeamento conceitual. Integrações e responsabilidades a definir no piloto; sem integração nativa Salesforce ou execução real dos produtos. Canal de aceite a validar com a VR.</p>
      </aside>
    </main>
    {step === 17 && <section className="metrics" aria-label="Métricas demonstrativas finais"><div><span>PRIMEIRO CONTATO</span><strong>2 segundos</strong></div><div><span>QUALIFICAÇÃO</span><strong>Concluída automaticamente</strong></div><div><span>CRM</span><strong>Oportunidade criada</strong></div><div><span>TRANSFERÊNCIA</span><strong>Context preserved</strong></div><p>Métricas demonstrativas — não são resultados de clientes</p></section>}
    <nav className="controls" aria-label="Controles de apresentação"><button onClick={reset}><RotateCcw size={16} /> Reiniciar demo</button><div className="jump"><span>Ir para</span>{[['Primeiro contato', 2], ['Qualificação', 3], ['CRM', 7], ['Pagamento', 14], ['Transferência', 16]].map(([label, target]) => <button key={label} onClick={() => dispatch({ type: 'jump', step: Number(target) })}>{label}</button>)}</div><div className="step-controls"><span>{String(step + 1).padStart(2, '0')} / {steps.length}</span><button aria-label="Etapa anterior" disabled={step === 0} onClick={() => dispatch({ type: 'previous' })}><ArrowLeft size={17} /><span>Etapa anterior</span></button><button className="primary" disabled={step === LAST || (step === 1 && !consent)} onClick={next}>Próxima etapa <ArrowRight size={17} /></button></div></nav>
    <dialog ref={dialog} onCancel={() => setModal(null)} onClick={e => { if (e.target === e.currentTarget) setModal(null); }}><div className="dialog-heading"><Badge>DEMO DOCUMENT</Badge><button aria-label="Fechar documento" onClick={() => setModal(null)}><X size={21} /></button></div>{modal === 'proposal' ? <><FileText size={40} /><h2>Proposal_Acme_Brasil.pdf</h2><p>Benefícios corporativos · Acme Brasil · 120 colaboradores</p><Fields rows={[[ 'Scope', 'Benefícios corporativos para alimentação e refeição'], ['Next steps', 'Confirmar identidade → revisar contrato → aceite'], ['Document', 'Prévia fictícia; sem valor contratual']]} /><button className="primary" onClick={() => { setModal(null); next(); }}>Continuar para verificação <ArrowRight size={16} /></button></> : modal === 'boleto' ? <><h2>Boleto demonstrativo</h2><p>Acme Brasil · R$ 12.480,00 · 15/10/2026</p><Badge amber>SEM VALOR · NÃO PAGÁVEL</Badge><p className="demo-code">{PAYMENT_CODE}</p><p>Documento visual fictício. Nenhum boleto foi emitido.</p><button onClick={copyCode}>Copiar código</button>{copied && <p role="status">{copied}</p>}</> : <><CircleHelp size={35} /><h2>O que acontece agora?</h2><p>Você revisa a proposta, confirma a identidade e segue para o aceite simulado. Depois mostramos o boleto e o acompanhamento.</p><p>Esta é uma hipótese de experiência. O fluxo final será definido com a VR.</p><button className="primary" onClick={() => setModal(null)}>Voltar à conversa</button></>}</dialog>
  </div>;
}
