import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GAME_STORE_SESSION_RESUME_KEY,
  GAME_STORE_STORAGE_KEY,
  useGameStore,
} from './useGameStore';

function resetGameStore() {
  useGameStore.setState({
    season: 1,
    day: 1,
    phase: 'preseason',
    isSimulating: false,
    isInitialized: false,
    userTeamId: 'nym',
    teamName: 'Tycoons',
    gmName: 'General Manager',
    difficulty: 'standard',
    activeSaveId: null,
    activeSaveSlot: null,
    playerCount: 0,
    gamesPlayed: 0,
  });
}

describe('useGameStore persistence', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resetGameStore();
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  function persistFallbackTarget(activeSaveId: string | null, activeSaveSlot: number | null) {
    window.localStorage.setItem(GAME_STORE_STORAGE_KEY, JSON.stringify({
      state: {
        activeSaveId,
        activeSaveSlot,
        season: 7,
        day: 44,
      },
      version: 1,
    }));
  }

  async function rehydrate() {
    await useGameStore.persist.rehydrate();
  }

  it('persists only the active-save shell state needed to resume after reload', () => {
    useGameStore.getState().initializeGame({
      season: 4,
      day: 88,
      phase: 'regular',
      playerCount: 780,
      userTeamId: 'nym',
      teamName: 'New York Tycoons',
      gmName: 'General Manager',
      difficulty: 'hard',
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
    });
    useGameStore.getState().updateFromSim({
      season: 4,
      day: 89,
      phase: 'regular',
      gamesPlayed: 5,
    });
    useGameStore.getState().setSimulating(true);

    const persisted = JSON.parse(window.localStorage.getItem(GAME_STORE_STORAGE_KEY) ?? '{}') as {
      state?: Record<string, unknown>;
      version?: number;
    };

    expect(persisted.version).toBe(1);
    expect(persisted.state).toMatchObject({
      activeSaveId: 'save-slot-1',
      activeSaveSlot: 1,
      userTeamId: 'nym',
      season: 4,
      day: 89,
      phase: 'regular',
      teamName: 'New York Tycoons',
      gmName: 'General Manager',
      difficulty: 'hard',
    });
    expect(persisted.state).not.toHaveProperty('isInitialized');
    expect(persisted.state).not.toHaveProperty('isSimulating');
    expect(persisted.state).not.toHaveProperty('playerCount');
    expect(persisted.state).not.toHaveProperty('gamesPlayed');
    expect(persisted.state).not.toHaveProperty('initializeGame');
  });

  it('uses the same-document session hint over the shared last-opened fallback', async () => {
    persistFallbackTarget('save-slot-1', 1);
    window.sessionStorage.setItem(GAME_STORE_SESSION_RESUME_KEY, JSON.stringify({
      activeSaveId: 'branch-document-two',
      activeSaveSlot: null,
    }));

    await rehydrate();

    expect(useGameStore.getState()).toMatchObject({
      activeSaveId: 'branch-document-two',
      activeSaveSlot: null,
      season: 7,
      day: 44,
    });
  });

  it('uses the shared last-opened target when this document has no session hint', async () => {
    persistFallbackTarget('save-slot-3', 3);

    await rehydrate();

    expect(useGameStore.getState()).toMatchObject({
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
    });
  });

  it('honors an explicit null session hint instead of reopening the shared fallback', async () => {
    persistFallbackTarget('save-slot-4', 4);
    window.sessionStorage.setItem(GAME_STORE_SESSION_RESUME_KEY, JSON.stringify({
      activeSaveId: null,
      activeSaveSlot: null,
    }));

    await rehydrate();

    expect(useGameStore.getState()).toMatchObject({
      activeSaveId: null,
      activeSaveSlot: null,
    });
  });

  it.each([
    ['malformed JSON', '{not-json'],
    ['invalid fields', JSON.stringify({ activeSaveId: 42, activeSaveSlot: 'one' })],
  ])('falls back safely when the session hint contains %s', async (_label, hint) => {
    persistFallbackTarget('save-slot-2', 2);
    window.sessionStorage.setItem(GAME_STORE_SESSION_RESUME_KEY, hint);

    await rehydrate();

    expect(useGameStore.getState()).toMatchObject({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
    });
  });

  it('falls back safely when sessionStorage cannot be read', async () => {
    persistFallbackTarget('save-slot-5', 5);
    const originalGetItem = Storage.prototype.getItem;
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(function getItem(this: Storage, key) {
      if (this === window.sessionStorage) {
        throw new DOMException('Session storage unavailable', 'SecurityError');
      }
      return originalGetItem.call(this, key);
    });

    await rehydrate();

    expect(useGameStore.getState()).toMatchObject({
      activeSaveId: 'save-slot-5',
      activeSaveSlot: 5,
    });
  });

  it('updates the session hint from each active-target action without inventing a tab id', () => {
    useGameStore.getState().setActiveSave('branch-action', null);
    expect(JSON.parse(window.sessionStorage.getItem(GAME_STORE_SESSION_RESUME_KEY) ?? '{}')).toEqual({
      activeSaveId: 'branch-action',
      activeSaveSlot: null,
    });

    useGameStore.getState().setActiveSaveSlot(2);
    expect(JSON.parse(window.sessionStorage.getItem(GAME_STORE_SESSION_RESUME_KEY) ?? '{}')).toEqual({
      activeSaveId: 'save-slot-2',
      activeSaveSlot: 2,
    });

    useGameStore.getState().initializeGame({
      season: 2,
      day: 10,
      phase: 'regular',
      playerCount: 800,
      userTeamId: 'nym',
      activeSaveId: 'branch-initialize',
      activeSaveSlot: null,
    });
    expect(JSON.parse(window.sessionStorage.getItem(GAME_STORE_SESSION_RESUME_KEY) ?? '{}')).toEqual({
      activeSaveId: 'branch-initialize',
      activeSaveSlot: null,
    });
  });

  it('persists an explicit null hint and still updates state when sessionStorage cannot be written', () => {
    useGameStore.getState().setActiveSave(null, null);
    expect(JSON.parse(window.sessionStorage.getItem(GAME_STORE_SESSION_RESUME_KEY) ?? '{}')).toEqual({
      activeSaveId: null,
      activeSaveSlot: null,
    });

    const originalSetItem = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function setItem(this: Storage, key, value) {
      if (this === window.sessionStorage) {
        throw new DOMException('Session storage unavailable', 'SecurityError');
      }
      return originalSetItem.call(this, key, value);
    });

    useGameStore.getState().setActiveSaveSlot(3);
    expect(useGameStore.getState()).toMatchObject({
      activeSaveId: 'save-slot-3',
      activeSaveSlot: 3,
    });
  });
});
