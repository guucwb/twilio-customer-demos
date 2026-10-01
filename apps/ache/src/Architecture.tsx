import { useEffect, useRef } from 'react';
import { ArrowDown, Cloud, Mail, MessageCircle, MessageSquareText, Sparkles, Workflow, X } from 'lucide-react';

export function Architecture({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  return (
    <dialog ref={ref} className="architecture" onCancel={onClose} onClose={onClose} aria-labelledby="arch-title">
      <button className="icon-button close" onClick={onClose} aria-label="Fechar arquitetura"><X size={20} /></button>
      <p className="eyebrow">Arquitetura conceitual</p>
      <h2 id="arch-title">O processo define <em>o que</em> comunicar.<br />A Twilio resolve <em>como</em> essa comunicação acontece.</h2>

      <div className="arch-grid">
        <section>
          <h3><span>A</span> Nesta demonstração</h3>
          <div className="flow">
            <div className="node what"><Cloud size={18} /><div><strong>Salesforce Service Cloud</strong><small>Caso ACH-2841 · representação demonstrativa</small></div></div>
            <div className="edge"><ArrowDown size={16} /><span>intenção: “Atualizar solicitação”</span></div>
            <div className="node what"><Workflow size={18} /><div><strong>Processo de negócio Aché</strong><small>Uma única lógica, sem regra por canal</small></div></div>
            <div className="edge"><ArrowDown size={16} /><span>o que comunicar, para quem</span></div>
            <div className="node how"><strong>Camada de comunicação Twilio</strong><small>Escolhe e executa o canal</small></div>
            <div className="fan">
              <span><MessageCircle size={16} />WhatsApp</span>
              <span><MessageSquareText size={16} />SMS</span>
              <span><Mail size={16} />Email · SendGrid</span>
              <span className="future"><Sparkles size={16} />RCS · preview</span>
            </div>
          </div>
          <p className="fine">Esta demo não está conectada a um ambiente Salesforce. O caso e a intenção são representações locais.</p>
        </section>

        <section>
          <h3><span>B</span> Integrações documentadas</h3>
          <p>A integração <strong>Salesforce Bring Your Own Channel (BYOC) for CCaaS</strong> com a Twilio disponibiliza canais <strong>SMS</strong> e <strong>WhatsApp</strong> da Twilio no Salesforce Messaging, para que agentes atendam essas conversas dentro do Service Cloud.</p>
          <p className="fine">Requer Twilio Flex, Service Cloud com Messaging habilitado e um número SMS ou remetente WhatsApp configurado na Twilio. Fonte: documentação Twilio “Set up Salesforce BYOC CCaaS with Twilio SMS and WhatsApp Channels”.</p>

          <h3><span>C</span> Possibilidades futuras</h3>
          <p>Canais mais ricos, como <strong>RCS</strong>, podem ser incorporados na camada de comunicação sem levar a complexidade de cada canal para a lógica de negócio no Salesforce.</p>
          <p className="fine">RCS não está provisionado neste ambiente e não faz parte da integração BYOC descrita acima. Aqui aparece apenas como preview de experiência.</p>
        </section>
      </div>
    </dialog>
  );
}
