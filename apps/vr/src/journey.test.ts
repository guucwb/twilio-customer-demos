import { describe, expect, it } from 'vitest';
import { contextAt, initial, LAST, messagesAt, milestones, milestoneStatus, reducer } from './journey';

describe('isolated deterministic VR journey', () => {
  it('gathers qualification only after the corresponding answers', () => {
    expect(contextAt(1)).toEqual([]);
    expect(contextAt(3)).not.toContainEqual(['Current provider', 'Existing provider']);
    expect(contextAt(4)).toContainEqual(['Current provider', 'Existing provider']);
    expect(contextAt(5)).not.toContainEqual(['Intent', 'High']);
    expect(contextAt(6)).toContainEqual(['Intent', 'High']);
  });
  it('direct payment jump reconstructs all prerequisites, without sending the reminder', () => {
    const state = reducer(initial, { type: 'jump', step: 14 });
    expect(contextAt(state.step)).toEqual(expect.arrayContaining([['Opportunity', 'Created'], ['Identity', 'Verified'], ['Acceptance', 'Completed'], ['Payment', 'Pending']]));
    expect(messagesAt(state).some(m => m.at === 15)).toBe(false);
    expect(milestoneStatus(state.step, milestones[9])).toBe('completed');
  });
  it('early payment handoff keeps the unsent reminder out of conversation history', () => {
    const payment = reducer(initial, { type: 'jump', step: 14 });
    const human = reducer(reducer(payment, { type: 'handoff' }), { type: 'next' });
    expect(human.step).toBe(LAST);
    expect(messagesAt(human).some(m => m.at === 15)).toBe(false);
    expect(contextAt(human.step)).toContainEqual(['Reason for handoff', 'Customer requested human assistance']);
  });
  it('preserves sent reminder when escalating from reminder', () => {
    const reminder = reducer(initial, { type: 'jump', step: 15 });
    expect(messagesAt(reducer(reminder, { type: 'handoff' })).some(m => m.at === 15)).toBe(true);
  });
  it('next and jumps produce identical canonical snapshots; previous removes future facts', () => {
    let state = initial;
    for (let step = 1; step <= LAST; step++) {
      state = reducer(state, { type: 'next' });
      expect(state).toEqual(reducer(initial, { type: 'jump', step }));
    }
    while (state.step > 0) state = reducer(state, { type: 'previous' });
    expect(state).toEqual(initial);
    expect(contextAt(state.step)).toEqual([]);
    expect(messagesAt(state)).toEqual([]);
  });
  it('restart clears every scene, navigation stays bounded, handoff has active and completed states', () => {
    for (let step = 0; step <= LAST; step++) expect(reducer({ step, reminded: true }, { type: 'restart' })).toEqual(initial);
    expect(reducer(initial, { type: 'previous' })).toEqual(initial);
    expect(reducer({ step: LAST, reminded: true }, { type: 'next' }).step).toBe(LAST);
    expect(milestoneStatus(0, milestones[10])).toBe('pending');
    expect(milestoneStatus(16, milestones[10])).toBe('active');
    expect(milestoneStatus(17, milestones[10])).toBe('completed');
  });
});
