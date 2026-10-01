import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {beforeEach,describe,it,expect} from 'vitest';
import {Workspace} from './Workspace';
import {shouldOpenDemoOnMount} from '../plugin-betmgm/src/navigation';
import {caseService,InMemoryCaseService,currentInteraction} from './domain';
beforeEach(()=>caseService.dispatch({type:'reset'}));
describe('workspace contracts',()=>{
 it('renders Lucas inside Flex without a duplicate application shell',()=>{const html=renderToStaticMarkup(React.createElement(Workspace,{host:'FLEX_HOST'}));expect(html).toContain('Lucas Ferreira');expect(html).toContain('Meu trabalho');expect(html).toContain('BET-18472');expect(html).not.toContain('class="sidebar"');expect(html).not.toContain('class="topbar"');expect(html).not.toContain('Agente demonstrativo');expect(html).not.toContain('<iframe');expect(html).toContain('Reiniciar Demo');});
 it('preserves the full standalone shell',()=>{const html=renderToStaticMarkup(React.createElement(Workspace));expect(html).toContain('class="sidebar"');expect(html).toContain('class="topbar"');expect(html).toContain('Agente demonstrativo');expect(html).not.toContain('flex-page-tools');});
 it('enters the demo from the default desktop without overriding custom deep links',()=>{for(const path of ['/','/agent-desktop','/agent-desktop/'])expect(shouldOpenDemoOnMount(path)).toBe(true);for(const path of ['/betmgm-inbox/','/betmgm-cases/','/betmgm-players/','/teams/'])expect(shouldOpenDemoOnMount(path)).toBe(false);});
 it('renders each core module without external services',()=>{for(const view of ['Inbox','Cases','Players','Knowledge','Supervisor'] as const){const html=renderToStaticMarkup(React.createElement(Workspace,{view}));expect(html).toContain('BetMGM Player Care');expect(html).not.toMatch(/<iframe|https?:\/\//);expect(html).not.toMatch(/zendesk/i);}});
 it('shows only specialized context for Ana',()=>{caseService.dispatch({type:'select',id:'BET-18491'});const html=renderToStaticMarkup(React.createElement(Workspace));expect(html).toContain('Pedido de interrupção + Política de proteção + Português');expect(html).not.toContain('Solicitar validação');expect(html).not.toContain('EVT-PIX-300');});
 it('retains original agent attribution in messages after transfer',()=>{const service=new InMemoryCaseService();service.dispatch({type:'draft',id:'BET-18472',text:'Orientação inicial'});service.dispatch({type:'send',id:'BET-18472'});service.dispatch({type:'transfer',id:'BET-18472'});const c=service.getSnapshot().cases['BET-18472'];expect(c.owner).toBe('Rafael Lima');expect(currentInteraction(c).messages[1].agentName).toBe('Marina Costa');expect(c.handoffSummary).toContain('Orientação inicial fornecida');});
 it('keeps event timestamps valid across longer walkthroughs',()=>{const service=new InMemoryCaseService();for(let n=0;n<30;n++)service.dispatch({type:'note',id:'BET-18472',text:`Nota ${n}`});const events=service.getSnapshot().cases['BET-18472'].timeline;expect(events.at(-1)?.time).toBe('11:12');expect(events.every(e=>Number(e.time.split(':')[1])<60)).toBe(true);});
});
