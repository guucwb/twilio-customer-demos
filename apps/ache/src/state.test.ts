import { describe, expect, it } from 'vitest';
import { CHANNELS, emailMessage, intent, rcsPreview, smsMessage, smsSegments, whatsappMessage } from '../shared/journey';
import type { ProviderEvent } from '../shared/events';
import { initialState, reducer } from './state';

const providerEvent = (status: string): ProviderEvent => ({
  provider: 'Twilio', id: 'SM' + 'b'.repeat(32), status, errorCode: null, providerTime: null,
  observedAt: '2026-09-28T13:00:00.000Z', requestedChannel: 'whatsapp', actualChannel: 'whatsapp',
});

describe('demo journey state', () => {
  it('produces only application events for the full demo flow', () => {
    let s = initialState();
    for (const channel of CHANNELS) {
      s = reducer(s, { type: 'select', channel });
      s = reducer(s, { type: 'prepare', channel });
    }
    expect(s.events.every(e => e.kind === 'application' && e.mode === 'DEMO')).toBe(true);
    expect(JSON.stringify(s.events)).not.toMatch(/SM[0-9a-f]{32}|entregue|delivered|lida/i);
  });

  it('selecting a channel changes only the expression, not the case', () => {
    const s = reducer(initialState(), { type: 'select', channel: 'email' });
    expect(s.channel).toBe('email');
    expect(s.events).toEqual(initialState().events.map(e => ({ ...e, id: expect.any(String), at: expect.any(String) })));
  });

  it('prepares each channel once and describes channel changes as the same intent', () => {
    let s = reducer(initialState(), { type: 'prepare', channel: 'whatsapp' });
    const count = s.events.length;
    expect(reducer(s, { type: 'prepare', channel: 'whatsapp' })).toBe(s);
    s = reducer(s, { type: 'prepare', channel: 'sms' });
    expect(s.events.length).toBeGreaterThan(count);
    expect(s.events.find(e => e.kind === 'application' && e.title.startsWith('Estratégia alterada'))).toMatchObject({ detail: expect.stringContaining('Mesmo caso') });
  });

  it('never creates a live request for RCS', () => {
    const s = initialState();
    expect(reducer(s, { type: 'liveRequested', channel: 'rcs' })).toBe(s);
  });

  it('adds provider events only from provider data, deduplicated', () => {
    let s = reducer(initialState(), { type: 'providerEvents', events: [providerEvent('queued')] });
    s = reducer(s, { type: 'providerEvents', events: [providerEvent('queued'), providerEvent('sent')] });
    expect(s.events.filter(e => e.kind === 'provider').map(e => e.kind === 'provider' && e.event.status)).toEqual(['queued', 'sent']);
  });

  it('reset restores the initial journey', () => {
    let s = reducer(initialState(), { type: 'prepare', channel: 'email' });
    s = reducer(s, { type: 'providerEvents', events: [providerEvent('queued')] });
    s = reducer(s, { type: 'reset' });
    expect(s.channel).toBe('whatsapp');
    expect(s.prepared).toEqual([]);
    expect(s.events).toHaveLength(1);
  });
});

describe('one intent, four expressions', () => {
  it('every channel carries the same case and recipient', () => {
    const texts = [whatsappMessage().body, smsMessage().body, emailMessage().text, rcsPreview().body];
    for (const t of texts) expect(t).toContain(intent.recipientFirstName);
    for (const t of [whatsappMessage().body, smsMessage().body, emailMessage().text]) expect(t).toContain(intent.caseId);
  });

  it('keeps SMS short and marks only test emails as tests', () => {
    expect(smsSegments(smsMessage().body).segments).toBeLessThanOrEqual(2);
    expect(emailMessage().html).not.toContain('Mensagem de teste');
    expect(emailMessage(undefined, { test: true }).html).toContain('Mensagem de teste');
  });

  it('stays non-clinical', () => {
    const all = [whatsappMessage().body, smsMessage().body, emailMessage().text, rcsPreview().body].join(' ').toLowerCase();
    for (const word of ['diagnóstico', 'tratamento', 'dose', 'sintoma', 'receita', 'medicamento']) expect(all).not.toContain(word);
  });
});
