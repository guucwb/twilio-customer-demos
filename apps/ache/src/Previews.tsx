import type { ReactNode } from 'react';
import { BatteryFull, ChevronLeft, Paperclip, Signal, Wifi } from 'lucide-react';
import { emailMessage, rcsPreview, smsMessage, whatsappMessage, type ChannelId } from '../shared/journey';

// Each preview renders the SAME intent through a different channel expression.

export function ChannelPreview({ channel }: { channel: ChannelId }) {
  switch (channel) {
    case 'whatsapp': return <WhatsAppPreview />;
    case 'sms': return <SmsPreview />;
    case 'email': return <EmailPreview />;
    case 'rcs': return <RcsPreview />;
  }
}

function Phone({ children, header, className = '' }: { children: ReactNode; header: ReactNode; className?: string }) {
  return (
    <div className={`phone ${className}`} aria-hidden="false">
      <div className="phone-status"><span>10:42</span><span className="phone-icons"><Signal size={13} /><Wifi size={13} /><BatteryFull size={15} /></span></div>
      <div className="phone-header"><ChevronLeft size={20} />{header}</div>
      <div className="phone-body">{children}</div>
    </div>
  );
}

function Sender({ name, caption, tone }: { name: string; caption: string; tone: 'wa' | 'sms' | 'rcs' }) {
  return (
    <div className="phone-sender">
      <span className={`sender-avatar ${tone}`}>A</span>
      <span><strong>{name}</strong><small>{caption}</small></span>
    </div>
  );
}

function WhatsAppPreview() {
  const { body } = whatsappMessage();
  return (
    <Phone className="wa" header={<Sender name="Atendimento Aché" caption="WhatsApp" tone="wa" />}>
      <div className="day-chip">Hoje</div>
      <div className="bubble wa-bubble">
        <p>{body}</p>
        <small>10:42</small>
      </div>
      <div className="composer-mock wa-composer"><span>Mensagem</span><Paperclip size={16} /></div>
    </Phone>
  );
}

function SmsPreview() {
  const { body } = smsMessage();
  return (
    <Phone className="sms" header={<Sender name="Aché" caption="Mensagem de texto" tone="sms" />}>
      <div className="day-chip">SMS · hoje 10:42</div>
      <div className="bubble sms-bubble"><p>{body}</p></div>
      <div className="composer-mock"><span>Mensagem de texto</span></div>
    </Phone>
  );
}

function EmailPreview() {
  const mail = emailMessage();
  return (
    <div className="email-client">
      <div className="email-meta">
        <span className="sender-avatar email">A</span>
        <div>
          <strong>{mail.subject}</strong>
          <span>Atendimento Aché · para Mariana Souza</span>
        </div>
      </div>
      <iframe title="Pré-visualização do email" srcDoc={mail.html} sandbox="" />
    </div>
  );
}

function RcsPreview() {
  const card = rcsPreview();
  return (
    <Phone className="rcs" header={<Sender name="Aché" caption="Mensagem avançada" tone="rcs" />}>
      <div className="day-chip">Hoje</div>
      <article className="rich-card">
        <div className="rich-media" role="img" aria-label="Área visual da mensagem">
          <span className="orb a" /><span className="orb b" /><span className="orb c" />
          <strong>Aché</strong>
        </div>
        <div className="rich-body">
          <h4>{card.title}</h4>
          <p>{card.body}</p>
        </div>
        {card.actions.map(a => <span className="rich-action" key={a}>{a}</span>)}
      </article>
      <div className="suggestions"><span>Continuar atendimento</span><span>Obrigada!</span></div>
    </Phone>
  );
}
