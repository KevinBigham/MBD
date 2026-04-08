import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer } from '../src/index.js';
import {
  findSimilarPlayers,
  getPlayerArchetype,
} from '../src/index.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  const position = overrides.position ?? 'CF';
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';

  return {
    id: 'player-1',
    firstName: 'Evan',
    lastName: 'Cole',
    age: 25,
    position,
    hitterAttributes: {
      contact: 320,
      power: 315,
      eye: 305,
      speed: 320,
      defense: 315,
      durability: 325,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 330,
      control: 315,
      stamina: 325,
      velocity: 320,
      movement: 310,
    } : null,
    personality: {
      workEthic: 75,
      mentalToughness: 71,
      leadership: 58,
      competitiveness: 80,
    },
    contract: {
      years: 2,
      annualSalary: 7,
      totalValue: 14,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    rosterStatus: 'MLB',
    developmentPhase: 'Prime',
    teamId: 'kc',
    nationality: 'american',
    overallRating: isPitcher ? 320 : 318,
    rule5EligibleAfterSeason: 0,
    serviceTimeDays: 700,
    optionYearsUsed: 0,
    isOutOfOptions: true,
    minorLeagueLevel: null,
    extensionHistory: [],
    personalityTraits: [],
    ...overrides,
  };
}

function makePitcher(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return makePlayer({
    id: 'pitcher-1',
    firstName: 'Noah',
    lastName: 'Reed',
    position: 'SP',
    hitterAttributes: {
      contact: 110,
      power: 95,
      eye: 100,
      speed: 120,
      defense: 135,
      durability: 250,
    },
    pitcherAttributes: {
      stuff: 350,
      control: 325,
      stamina: 335,
      velocity: 340,
      movement: 315,
    },
    overallRating: 334,
    ...overrides,
  });
}

describe('historical player similarity', () => {
  it('scores a player compared to themselves at 100', () => {
    const player = makePlayer();

    const result = findSimilarPlayers(player, [player]);

    expect(result.comparisons[0]?.playerId).toBe(player.id);
    expect(result.comparisons[0]?.similarityScore).toBe(100);
  });

  it('scores cross-type comparisons at zero', () => {
    const hitter = makePlayer();
    const pitcher = makePitcher();

    const result = findSimilarPlayers(hitter, [pitcher]);

    expect(result.comparisons[0]?.similarityScore).toBe(0);
  });

  it('sorts results by similarity descending', () => {
    const target = makePlayer();
    const close = makePlayer({ id: 'close', hitterAttributes: { contact: 322, power: 314, eye: 300, speed: 318, defense: 317, durability: 327 } });
    const far = makePlayer({ id: 'far', hitterAttributes: { contact: 180, power: 210, eye: 195, speed: 205, defense: 215, durability: 220 } });

    const result = findSimilarPlayers(target, [far, close]);

    expect(result.comparisons[0]?.playerId).toBe('close');
    expect((result.comparisons[0]?.similarityScore ?? 0)).toBeGreaterThan(result.comparisons[1]?.similarityScore ?? 0);
  });

  it('respects the maxResults limit after sorting', () => {
    const target = makePlayer();
    const candidates = [
      makePlayer({ id: 'p-2' }),
      makePlayer({ id: 'p-3', hitterAttributes: { contact: 330, power: 322, eye: 300, speed: 318, defense: 312, durability: 319 } }),
      makePlayer({ id: 'p-4', hitterAttributes: { contact: 260, power: 250, eye: 255, speed: 260, defense: 270, durability: 265 } }),
    ];

    const result = findSimilarPlayers(target, candidates, 2);

    expect(result.comparisons).toHaveLength(2);
  });

  it('lists shared strengths only for attributes with display ratings of 60 or higher', () => {
    const target = makePlayer({
      hitterAttributes: {
        contact: 400,
        power: 420,
        eye: 300,
        speed: 390,
        defense: 250,
        durability: 280,
      },
    });
    const candidate = makePlayer({
      id: 'candidate',
      hitterAttributes: {
        contact: 410,
        power: 405,
        eye: 290,
        speed: 395,
        defense: 245,
        durability: 275,
      },
    });

    const result = findSimilarPlayers(target, [candidate]);

    expect(result.comparisons[0]?.sharedStrengths).toEqual(['Contact', 'Power', 'Speed']);
  });

  it('reports the largest attribute gap as the primary difference', () => {
    const target = makePlayer({
      hitterAttributes: {
        contact: 400,
        power: 280,
        eye: 300,
        speed: 220,
        defense: 260,
        durability: 300,
      },
    });
    const candidate = makePlayer({
      id: 'candidate',
      hitterAttributes: {
        contact: 250,
        power: 285,
        eye: 302,
        speed: 225,
        defense: 258,
        durability: 298,
      },
    });

    const result = findSimilarPlayers(target, [candidate]);

    expect(result.comparisons[0]?.primaryDifference).toMatch(/Contact/i);
  });

  it('classifies five-tool hitters before narrower hitter archetypes', () => {
    const player = makePlayer({
      hitterAttributes: {
        contact: 340,
        power: 360,
        eye: 330,
        speed: 345,
        defense: 335,
        durability: 320,
      },
    });

    expect(getPlayerArchetype(player).archetype).toBe('Five-Tool Player');
  });

  it('classifies power sluggers', () => {
    const player = makePlayer({
      hitterAttributes: {
        contact: 250,
        power: 405,
        eye: 240,
        speed: 200,
        defense: 220,
        durability: 280,
      },
    });

    expect(getPlayerArchetype(player).archetype).toBe('Power Slugger');
  });

  it('classifies contact specialists', () => {
    const player = makePlayer({
      hitterAttributes: {
        contact: 420,
        power: 240,
        eye: 320,
        speed: 250,
        defense: 260,
        durability: 280,
      },
    });

    expect(getPlayerArchetype(player).archetype).toBe('Contact Specialist');
  });

  it('classifies power arms', () => {
    const player = makePitcher({
      pitcherAttributes: {
        stuff: 430,
        control: 310,
        stamina: 320,
        velocity: 420,
        movement: 300,
      },
    });

    expect(getPlayerArchetype(player).archetype).toBe('Power Arm');
  });

  it('classifies finesse pitchers ahead of other defaults', () => {
    const player = makePitcher({
      pitcherAttributes: {
        stuff: 340,
        control: 420,
        stamina: 300,
        velocity: 260,
        movement: 310,
      },
    });

    expect(getPlayerArchetype(player).archetype).toBe('Finesse Pitcher');
  });

  it('classifies workhorses', () => {
    const player = makePitcher({
      pitcherAttributes: {
        stuff: 350,
        control: 330,
        stamina: 420,
        velocity: 315,
        movement: 325,
      },
    });

    expect(getPlayerArchetype(player).archetype).toBe('Workhorse');
  });

  it('falls back to balanced when no other archetype matches', () => {
    const hitter = makePlayer({
      hitterAttributes: {
        contact: 310,
        power: 280,
        eye: 295,
        speed: 275,
        defense: 260,
        durability: 290,
      },
    });
    const pitcher = makePitcher({
      pitcherAttributes: {
        stuff: 345,
        control: 330,
        stamina: 340,
        velocity: 320,
        movement: 335,
      },
    });

    expect(getPlayerArchetype(hitter).archetype).toBe('Balanced');
    expect(getPlayerArchetype(pitcher).archetype).toBe('Balanced');
  });
});
