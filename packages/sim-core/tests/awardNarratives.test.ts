import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/math/prng.js';
import {
  AWARD_NAMES,
  generateAwardCeremony,
  generateAwardNarrative,
  type AwardNarrativeContext,
} from '../src/league/awardNarratives.js';

function createContext(overrides: Partial<AwardNarrativeContext> = {}): AwardNarrativeContext {
  return {
    awardId: 'MVP_AL',
    winnerId: 'player-1',
    winnerName: 'Jordan Vale',
    winnerTeamId: 'nym',
    winnerStatLine: '.318/.409/.602, 42 HR, 7.8 WAR',
    runnerUpNames: ['Micah Stone', 'Luis Calder'],
    winnerAge: 28,
    isFirstAward: true,
    isRepeatWinner: false,
    reactionTone: 'humble',
    teamRecord: {
      wins: 98,
      losses: 64,
    },
    ...overrides,
  };
}

describe('generateAwardNarrative', () => {
  it('uses distinct headline styles across award families', () => {
    const mvp = generateAwardNarrative(new GameRNG(201), createContext({ awardId: 'MVP_AL' }));
    const cyYoung = generateAwardNarrative(new GameRNG(201), createContext({ awardId: 'CY_YOUNG_AL' }));
    const roy = generateAwardNarrative(new GameRNG(201), createContext({ awardId: 'ROY_AL' }));

    expect(mvp.headline).toContain('crown');
    expect(cyYoung.headline).toContain('arsenal');
    expect(roy.headline).toContain('rising star');
  });

  it('changes first-time and repeat-winner history', () => {
    const firstTime = generateAwardNarrative(
      new GameRNG(202),
      createContext({ isFirstAward: true, isRepeatWinner: false }),
    );
    const repeat = generateAwardNarrative(
      new GameRNG(202),
      createContext({ isFirstAward: false, isRepeatWinner: true }),
    );

    expect(firstTime.historicalContext).not.toEqual(repeat.historicalContext);
  });

  it('varies reaction quotes by tone', () => {
    const humble = generateAwardNarrative(new GameRNG(203), createContext({ reactionTone: 'humble' }));
    const confident = generateAwardNarrative(new GameRNG(203), createContext({ reactionTone: 'confident' }));
    const measured = generateAwardNarrative(new GameRNG(203), createContext({ reactionTone: 'measured' }));

    expect(new Set([humble.reactionQuote, confident.reactionQuote, measured.reactionQuote]).size).toBe(3);
  });

  it('includes runner-up names in the voting summary', () => {
    const narrative = generateAwardNarrative(new GameRNG(204), createContext());

    expect(narrative.votingSummary).toContain('Micah Stone');
    expect(narrative.votingSummary).toContain('Luis Calder');
  });

  it('is deterministic for the same seed and context', () => {
    const context = createContext({ awardId: 'SILVER_SLUGGER' });
    const first = generateAwardNarrative(new GameRNG(205), context);
    const second = generateAwardNarrative(new GameRNG(205), context);

    expect(second).toEqual(first);
  });

  it('changes historical context when the team record changes', () => {
    const contender = generateAwardNarrative(
      new GameRNG(206),
      createContext({ teamRecord: { wins: 102, losses: 60 } }),
    );
    const middling = generateAwardNarrative(
      new GameRNG(206),
      createContext({ teamRecord: { wins: 82, losses: 80 } }),
    );

    expect(contender.historicalContext).not.toEqual(middling.historicalContext);
  });

  it('does not invent explicit since-year historical claims', () => {
    const narrative = generateAwardNarrative(new GameRNG(207), createContext({ awardId: 'ROY_AL' }));

    expect(narrative.historicalContext).not.toMatch(/since \d{4}/i);
  });
});

describe('generateAwardCeremony', () => {
  it('builds a ceremony with opening and closing remarks', () => {
    const ceremony = generateAwardCeremony(
      new GameRNG(208),
      [createContext({ awardId: 'MVP_AL' }), createContext({ awardId: 'CY_YOUNG_AL' })],
      8,
    );

    expect(ceremony.openingRemarks.length).toBeGreaterThan(0);
    expect(ceremony.closingRemarks.length).toBeGreaterThan(0);
    expect(ceremony.awards).toHaveLength(2);
  });

  it('preserves input order in the ceremony script', () => {
    const ceremony = generateAwardCeremony(
      new GameRNG(209),
      [
        createContext({ awardId: 'ROY_AL', winnerId: 'rookie-1', winnerName: 'Rookie One' }),
        createContext({ awardId: 'MVP_AL', winnerId: 'mvp-1', winnerName: 'MVP One' }),
        createContext({ awardId: 'CY_YOUNG_AL', winnerId: 'ace-1', winnerName: 'Ace One' }),
      ],
      8,
    );

    expect(ceremony.awards.map((award) => award.winnerId)).toEqual(['rookie-1', 'mvp-1', 'ace-1']);
  });

  it('is deterministic for the same seed and context list', () => {
    const contexts = [createContext({ awardId: 'MVP_AL' }), createContext({ awardId: 'GOLD_GLOVE' })];
    const first = generateAwardCeremony(new GameRNG(210), contexts, 8);
    const second = generateAwardCeremony(new GameRNG(210), contexts, 8);

    expect(second).toEqual(first);
  });
});

describe('AWARD_NAMES', () => {
  it('covers every supported narrative award id', () => {
    expect(Object.keys(AWARD_NAMES).sort()).toEqual([
      'CY_YOUNG_AL',
      'CY_YOUNG_NL',
      'GOLD_GLOVE',
      'MVP_AL',
      'MVP_NL',
      'RELIEVER_OF_YEAR',
      'ROY_AL',
      'ROY_NL',
      'SILVER_SLUGGER',
    ]);
  });
});
