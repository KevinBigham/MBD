// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('comlink', () => ({
  expose: () => {},
}));

import {
  TEAMS,
  advanceEntireOffseason,
  api,
  forceCompletedPlayoffBracket,
  jumpToLateSeasonCheckpoint,
  requireState,
  resetIntegrationState,
  seedRetiringHallOfFamer,
  startGame,
  validateRosterIntegrity,
} from './sim.worker.integration.helpers';

describe('worker rollover integration', () => {
  afterEach(() => {
    resetIntegrationState();
  });

  it('holds together across a seasonal rollover without orphaned players, negative salaries, or duplicate achievements', () => {
    startGame(3_104);

    jumpToLateSeasonCheckpoint(162);
    api.simToPlayoffs();
    if (!requireState().playoffBracket) {
      api.simDay();
    }
    forceCompletedPlayoffBracket();
    advanceEntireOffseason();
    api.startNextSeason();

    const state = requireState();
    const playerIds = state.players.map((player) => player.id);
    const uniqueIds = new Set(playerIds);
    const achievementIds = state.achievements.unlocked.map((achievement) => achievement.id);

    expect(state.season).toBe(2);
    expect(uniqueIds.size).toBe(playerIds.length);
    expect(state.players.every((player) => player.contract.annualSalary >= 0)).toBe(true);
    expect(state.rosterStates.size).toBe(TEAMS.length);
    validateRosterIntegrity();
    expect(new Set(achievementIds).size).toBe(achievementIds.length);
  }, 120_000);

  it('only inducts a legacy player into the Hall of Fame after the retirement rollover', () => {
    startGame(3_105);
    const iconId = seedRetiringHallOfFamer();

    jumpToLateSeasonCheckpoint(162);
    api.simToPlayoffs();
    api.simRemainingPlayoffs();
    advanceEntireOffseason();
    api.startNextSeason();

    const hallOfFame = api.getHallOfFame();
    expect(hallOfFame.some((entry) => entry.playerId === iconId)).toBe(true);
    expect(requireState().players.some((player) => player.id === iconId && player.teamId !== '')).toBe(false);
  }, 120_000);
});
