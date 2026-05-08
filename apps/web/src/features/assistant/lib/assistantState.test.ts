import { describe, expect, it } from 'vitest';
import {
  ASSISTANT_STORAGE_VERSION,
  assistantStorageKey,
  createInitialAssistantState,
  reduceAssistantState,
  sanitizeAssistantState,
} from './assistantState';

describe('assistantState', () => {
  it('creates save-scoped localStorage keys without touching GameSnapshot', () => {
    expect(assistantStorageKey(null)).toBe('mbd:assistant:v1:global');
    expect(assistantStorageKey('save-slot-2')).toBe('mbd:assistant:v1:save-slot-2');
    expect(assistantStorageKey(3)).toBe('mbd:assistant:v1:save-slot-3');
  });

  it('sanitizes persisted state and defaults invalid mode to newcomer', () => {
    expect(sanitizeAssistantState(null)).toEqual(createInitialAssistantState());
    expect(sanitizeAssistantState({
      version: ASSISTANT_STORAGE_VERSION,
      mode: 'invalid',
      dismissedRoutes: { dashboard: true, trade: false },
      completedRoutes: { roster: true },
      seenStoryCallbacks: { 'ticker-1': true, 'ticker-2': 'yes' },
    })).toEqual({
      version: ASSISTANT_STORAGE_VERSION,
      mode: 'newcomer',
      dismissedRoutes: { dashboard: true },
      completedRoutes: { roster: true },
      seenStoryCallbacks: { 'ticker-1': true },
    });
  });

  it('tracks dismiss, complete, replay, story callback, and mode transitions', () => {
    let state = createInitialAssistantState();

    state = reduceAssistantState(state, { type: 'setMode', mode: 'hardcore' });
    expect(state.mode).toBe('hardcore');

    state = reduceAssistantState(state, { type: 'dismissRoute', routeKey: 'dashboard' });
    expect(state.dismissedRoutes.dashboard).toBe(true);
    expect(state.completedRoutes.dashboard).toBeUndefined();

    state = reduceAssistantState(state, { type: 'completeRoute', routeKey: 'dashboard' });
    expect(state.dismissedRoutes.dashboard).toBe(true);
    expect(state.completedRoutes.dashboard).toBe(true);

    state = reduceAssistantState(state, { type: 'replayRoute', routeKey: 'dashboard' });
    expect(state.dismissedRoutes.dashboard).toBeUndefined();
    expect(state.completedRoutes.dashboard).toBeUndefined();

    state = reduceAssistantState(state, { type: 'markStorySeen', callbackId: 'trade-ticker' });
    expect(state.seenStoryCallbacks['trade-ticker']).toBe(true);
  });
});
