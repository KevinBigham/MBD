import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  createRule5Session,
  estimateBackfilledRule5EligibilityAfterSeason,
  generatePlayer,
  lockRule5ProtectionAudit,
  makeRule5Selection,
  passRule5DraftTurn,
  toggleRule5Protection,
  calculateRule5EligibleAfterSeason,
} from '../src/index.js';
import type { GeneratedPlayer, RosterState } from '../src/index.js';

function makePlayer(
  seed: number,
  teamId: string,
  rosterStatus: GeneratedPlayer['rosterStatus'],
  age: number,
  eligibleAfterSeason: number,
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), 'SS', teamId, rosterStatus),
    age,
    rosterStatus,
    rule5EligibleAfterSeason: eligibleAfterSeason,
  };
}

function makeRosterState(
  teamId: string,
  mlbRoster: string[] = [],
  fortyManRoster: string[] = mlbRoster,
): RosterState {
  return {
    teamId,
    mlbRoster,
    fortyManRoster,
    transactions: [],
  };
}

describe('calculateRule5EligibleAfterSeason', () => {
  it('gives players signed at age 18 or younger five exempt seasons', () => {
    expect(calculateRule5EligibleAfterSeason(1, 18)).toBe(5);
    expect(calculateRule5EligibleAfterSeason(3, 17)).toBe(7);
  });

  it('gives players signed at age 19 or older four exempt seasons', () => {
    expect(calculateRule5EligibleAfterSeason(1, 19)).toBe(4);
    expect(calculateRule5EligibleAfterSeason(3, 22)).toBe(6);
  });
});

describe('estimateBackfilledRule5EligibilityAfterSeason', () => {
  it('backfills old saves deterministically from age and roster level', () => {
    const player = makePlayer(10, 'nym', 'AAA', 25, 0);

    expect(estimateBackfilledRule5EligibilityAfterSeason(player, 7)).toBe(6);
    expect(estimateBackfilledRule5EligibilityAfterSeason(player, 7)).toBe(6);
  });
});

describe('createRule5Session', () => {
  it('includes only unprotected players who are eligible after the current season', () => {
    const protectedPlayer = makePlayer(1, 'nym', 'MLB', 22, 2);
    const exposedPlayer = makePlayer(2, 'nym', 'AA', 23, 2);
    const notYetEligible = makePlayer(3, 'nym', 'AA', 20, 4);

    const session = createRule5Session({
      season: 2,
      draftOrder: ['bos', 'nym'],
      players: [protectedPlayer, exposedPlayer, notYetEligible],
      rosterStates: new Map([
        ['nym', makeRosterState('nym', [protectedPlayer.id])],
        ['bos', makeRosterState('bos', [])],
      ]),
    });

    expect(session.phase).toBe('protection_audit');
    expect(session.eligiblePlayers.map((player) => player.playerId)).toEqual([exposedPlayer.id]);
    expect(session.protectedPlayerIdsByTeam.nym).toContain(protectedPlayer.id);
  });

  it('ignores legacy minor-league 40-man noise when building the initial eligible pool', () => {
    const exposedPlayer = makePlayer(12, 'nym', 'AA', 22, 2);

    const session = createRule5Session({
      season: 2,
      draftOrder: ['bos', 'nym'],
      players: [exposedPlayer],
      rosterStates: new Map([
        ['nym', makeRosterState('nym', [], [exposedPlayer.id])],
        ['bos', makeRosterState('bos', [])],
      ]),
    });

    expect(session.protectedPlayerIdsByTeam.nym).toEqual([]);
    expect(session.eligiblePlayers.map((player) => player.playerId)).toEqual([exposedPlayer.id]);
  });

  it('refuses to protect another player when the 40-man roster is already full', () => {
    const exposedPlayer = makePlayer(4, 'nym', 'AA', 23, 2);
    const fullFortyMan = Array.from({ length: 40 }, (_, index) => `forty-${index}`);
    const session = createRule5Session({
      season: 2,
      draftOrder: ['bos', 'nym'],
      players: [exposedPlayer],
      rosterStates: new Map([
        ['nym', makeRosterState('nym', fullFortyMan)],
        ['bos', makeRosterState('bos', [])],
      ]),
    });

    const result = toggleRule5Protection(session, 'nym', exposedPlayer.id);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/40-man/i);
  });

  it('round-trips a player between protected and exposed states', () => {
    const exposedPlayer = makePlayer(11, 'nym', 'AA', 23, 2);
    const session = createRule5Session({
      season: 2,
      draftOrder: ['bos', 'nym'],
      players: [exposedPlayer],
      rosterStates: new Map([
        ['nym', makeRosterState('nym', [])],
        ['bos', makeRosterState('bos', [])],
      ]),
    });

    const protectedResult = toggleRule5Protection(session, 'nym', exposedPlayer.id);
    const unprotectedResult = toggleRule5Protection(protectedResult.session, 'nym', exposedPlayer.id);

    expect(protectedResult.success).toBe(true);
    expect(protectedResult.session.protectedPlayerIdsByTeam.nym).toContain(exposedPlayer.id);
    expect(protectedResult.session.eligiblePlayers).toHaveLength(0);
    expect(unprotectedResult.success).toBe(true);
    expect(unprotectedResult.session.protectedPlayerIdsByTeam.nym).not.toContain(exposedPlayer.id);
    expect(unprotectedResult.session.eligiblePlayers.map((player) => player.playerId)).toEqual([exposedPlayer.id]);
  });
});

describe('rule 5 draft loop', () => {
  it('creates an active roster obligation for a drafted player', () => {
    const exposedPlayer = makePlayer(5, 'nym', 'AA', 23, 2);
    const session = lockRule5ProtectionAudit(createRule5Session({
      season: 2,
      draftOrder: ['bos', 'nym'],
      players: [exposedPlayer],
      rosterStates: new Map([
        ['nym', makeRosterState('nym', [])],
        ['bos', makeRosterState('bos', [])],
      ]),
    }));

    const result = makeRule5Selection(session, 'bos', exposedPlayer.id);

    expect(result.success).toBe(true);
    expect(result.session.phase).toBe('rule5_draft');
    expect(result.session.eligiblePlayers).toHaveLength(0);
    expect(result.session.obligations).toEqual([
      expect.objectContaining({
        playerId: exposedPlayer.id,
        draftingTeamId: 'bos',
        originalTeamId: 'nym',
        status: 'active',
      }),
    ]);
  });

  it('ends the draft after every team passes in sequence', () => {
    const session = lockRule5ProtectionAudit(createRule5Session({
      season: 2,
      draftOrder: ['bos', 'nym'],
      players: [],
      rosterStates: new Map([
        ['nym', makeRosterState('nym', [])],
        ['bos', makeRosterState('bos', [])],
      ]),
    }));

    const afterFirstPass = passRule5DraftTurn(session, 'bos');
    const afterSecondPass = passRule5DraftTurn(afterFirstPass.session, 'nym');

    expect(afterFirstPass.success).toBe(true);
    expect(afterSecondPass.success).toBe(true);
    expect(afterSecondPass.session.phase).toBe('complete');
  });
});
