import { describe, expect, it } from 'vitest';
import type { PlayerOrigin, PlayerStoryArc, ProspectBond } from '@mbd/contracts';
import {
  GameRNG,
  detectBreakoutCountdowns,
  generateDebutFlashback,
  generatePlayer,
  generatePressConference,
  type GeneratedPlayer,
} from '../src/index.js';

function makePlayer(
  seed: number,
  overrides: Partial<GeneratedPlayer> = {},
  position: GeneratedPlayer['position'] = 'SS',
  teamId: string = 'nym',
  rosterStatus: GeneratedPlayer['rosterStatus'] = 'MLB',
): GeneratedPlayer {
  return {
    ...generatePlayer(new GameRNG(seed), position, teamId, rosterStatus),
    ...overrides,
  };
}

describe('farm narratives', () => {
  it('captures draft provenance and journey highlights in a debut flashback', () => {
    const player = makePlayer(1, { overallRating: 346, firstName: 'Marco', lastName: 'Ascension', rosterStatus: 'MLB' }, 'SS', 'nym', 'MLB');
    const bond: ProspectBond = {
      prospectId: player.id,
      draftedSeason: 3,
      debutSeason: 6,
      currentLevel: 'MLB',
      bondStrength: 41,
      milestones: ['Drafted Round 1, 3', 'Promoted to AA, 4', 'Promoted to AAA, 5', 'MLB Debut, 6'],
      loyaltyModifier: 0.41,
    };
    const origin: PlayerOrigin = {
      playerId: player.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: 3,
      draftSeason: 3,
      draftRound: 1,
      draftPickNumber: 12,
      originalGrade: 64,
      bonusAmount: 5.4,
    };

    const flashback = generateDebutFlashback({
      season: 6,
      playerOrigins: new Map([[player.id, origin]]),
      debutFlashbacks: [],
    }, player, bond);

    expect(flashback).toMatchObject({
      playerId: player.id,
      playerName: 'Marco Ascension',
      draftSeason: 3,
      draftRound: 1,
      originalGrade: 64,
      debutSeason: 6,
      debutOverall: 58,
    });
    expect(flashback?.journeyHighlights).toContain('Promoted to AAA, 5');
  });

  it('detects up to three AA/AAA breakout countdowns', () => {
    const players = [
      makePlayer(2, { age: 21, firstName: 'Cal', lastName: 'Velez', overallRating: 332, ceiling: 410 }, 'SS', 'nym', 'AA'),
      makePlayer(3, { age: 22, firstName: 'Tom', lastName: 'Harbor', overallRating: 340, ceiling: 415 }, 'CF', 'nym', 'AAA'),
      makePlayer(4, { age: 23, firstName: 'Eli', lastName: 'Stone', overallRating: 336, ceiling: 408 }, 'SP', 'nym', 'AAA'),
      makePlayer(5, { age: 23, firstName: 'Nico', lastName: 'Lane', overallRating: 320, ceiling: 390 }, '3B', 'nym', 'AA'),
    ];
    const playerOrigins = new Map<string, PlayerOrigin>(players.map((player, index) => [player.id, {
      playerId: player.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      acquiredSeason: 5,
      draftSeason: 5,
      draftRound: index + 1,
      draftPickNumber: 10 + index,
      originalGrade: 60 + index,
      bonusAmount: 2 + index,
    }]));
    const storyArcs: PlayerStoryArc[] = [];
    const minorLeagueStatHistory = new Map(players.map((player, index) => [player.id, [{
      season: 6,
      level: player.rosterStatus,
      gamesPlayed: 42,
      pa: player.pitcherAttributes ? 0 : 168,
      hits: player.pitcherAttributes ? 0 : 58 - index,
      hr: player.pitcherAttributes ? 0 : 13 - index,
      rbi: player.pitcherAttributes ? 0 : 41 - index,
      avg: player.pitcherAttributes ? 0 : 0.345 - (index * 0.01),
      ip: player.pitcherAttributes ? 48 : 0,
      era: player.pitcherAttributes ? 2.42 : 0,
      k: player.pitcherAttributes ? 61 : 0,
      bb: player.pitcherAttributes ? 17 : 22 - index,
    }]]));

    const countdowns = detectBreakoutCountdowns(new GameRNG(77), {
      season: 6,
      day: 92,
      players,
      playerOrigins,
      playerStoryArcs: storyArcs,
      minorLeagueStatHistory,
    });

    expect(countdowns).toHaveLength(3);
    expect(countdowns[0]?.summary).toContain('could be next in line for a callup');
  });

  it.each([
    [
      'impatient rebuild',
      {
        season: 6,
        day: 92,
        userTeamId: 'nym',
        teamRecord: { wins: 38, losses: 54, divisionRank: 4, gamesBack: 11 },
        ownerTone: 'impatient' as const,
        recentTradeHeadline: null,
        farmStrength: 55,
        topProspectCount: 1,
      },
      'games back',
    ],
    [
      'farm pipeline',
      {
        season: 6,
        day: 92,
        userTeamId: 'nym',
        teamRecord: { wins: 47, losses: 45, divisionRank: 2, gamesBack: 3 },
        ownerTone: 'supportive' as const,
        recentTradeHeadline: null,
        farmStrength: 78,
        topProspectCount: 4,
      },
      'prospect pipeline',
    ],
  ])('builds context-aware press conference prompts for %s', (_label, context, expectedText) => {
    const item = generatePressConference(new GameRNG(11), context);
    expect(item?.category).toBe('press_conference');
    expect(item?.tag).toBe('ANALYSIS');
    expect(item?.body.toLowerCase()).toContain(expectedText);
  });
});
