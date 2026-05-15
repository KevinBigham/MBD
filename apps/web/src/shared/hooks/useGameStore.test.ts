import { beforeEach, describe, expect, it } from 'vitest';
import { GAME_STORE_STORAGE_KEY, useGameStore } from './useGameStore';

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
    resetGameStore();
    window.localStorage.clear();
  });

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
});
