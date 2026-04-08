import { describe, expect, it } from 'vitest';
import type { GeneratedPlayer, PlayerGameStats, Position } from '../src/index.js';
import {
  comparePlayerStats,
  comparePlayersHead2Head,
  generateComparisonSummary,
  rankPlayerAttributes,
} from '../src/index.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  const position = overrides.position ?? 'RF';
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';

  return {
    id: 'player-1',
    firstName: 'Eli',
    lastName: 'Vargas',
    age: 27,
    position,
    hitterAttributes: {
      contact: 330,
      power: 310,
      eye: 280,
      speed: 260,
      defense: 275,
      durability: 290,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 335,
      control: 300,
      stamina: 290,
      velocity: 320,
      movement: 305,
    } : null,
    personality: {
      workEthic: 70,
      mentalToughness: 68,
      leadership: 55,
      competitiveness: 74,
    },
    contract: {
      years: 2,
      annualSalary: 8.5,
      totalValue: 17,
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
    overallRating: isPitcher ? 315 : 305,
    rule5EligibleAfterSeason: 0,
    serviceTimeDays: 800,
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
    lastName: 'Cole',
    position: 'SP',
    hitterAttributes: {
      contact: 120,
      power: 90,
      eye: 100,
      speed: 115,
      defense: 140,
      durability: 250,
    },
    pitcherAttributes: {
      stuff: 360,
      control: 315,
      stamina: 340,
      velocity: 355,
      movement: 325,
    },
    overallRating: 343,
    ...overrides,
  });
}

function makeStats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'player-1',
    teamId: 'kc',
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
    ...overrides,
  };
}

describe('player comparison engine', () => {
  it('returns an even comparison when a player is compared to themselves', () => {
    const player = makePlayer();

    const result = comparePlayersHead2Head(player, player);

    expect(result.overallAdvantage).toBe('even');
    expect(result.advantageMargin).toBe(0);
    expect(result.attributeComparison.every((entry) => entry.advantage === 'even')).toBe(true);
  });

  it('awards overall advantage to the higher-overall player', () => {
    const playerA = makePlayer({ overallRating: 355 });
    const playerB = makePlayer({ id: 'player-2', firstName: 'Sam', lastName: 'Lopez', overallRating: 295 });

    const result = comparePlayersHead2Head(playerA, playerB);

    expect(result.overallAdvantage).toBe('playerA');
    expect(result.advantageMargin).toBeGreaterThan(0);
  });

  it('flags display gaps greater than ten points as significant', () => {
    const playerA = makePlayer({
      hitterAttributes: {
        contact: 520,
        power: 310,
        eye: 280,
        speed: 260,
        defense: 275,
        durability: 290,
      },
    });
    const playerB = makePlayer({
      id: 'player-2',
      hitterAttributes: {
        contact: 180,
        power: 310,
        eye: 280,
        speed: 260,
        defense: 275,
        durability: 290,
      },
    });

    const result = comparePlayersHead2Head(playerA, playerB);
    const contactEntry = result.attributeComparison.find((entry) => entry.attribute === 'contact');

    expect(contactEntry?.differenceDisplay).toBeGreaterThan(10);
    expect(contactEntry?.significantGap).toBe(true);
  });

  it('uses overall-only comparison for hitter versus pitcher matchups', () => {
    const hitter = makePlayer({ overallRating: 320, position: 'RF' });
    const pitcher = makePitcher({ overallRating: 340 });

    const result = comparePlayersHead2Head(hitter, pitcher);

    expect(result.attributeComparison).toEqual([]);
    expect(result.overallAdvantage).toBe('playerB');
    expect(result.advantageMargin).toBeGreaterThan(0);
  });

  it('generates a non-empty head-to-head summary', () => {
    const playerA = makePlayer({
      firstName: 'Mason',
      lastName: 'Reed',
      hitterAttributes: {
        contact: 300,
        power: 430,
        eye: 240,
        speed: 385,
        defense: 240,
        durability: 300,
      },
    });
    const playerB = makePlayer({
      id: 'player-2',
      firstName: 'Theo',
      lastName: 'Warren',
      hitterAttributes: {
        contact: 420,
        power: 250,
        eye: 380,
        speed: 220,
        defense: 270,
        durability: 300,
      },
    });

    const result = comparePlayersHead2Head(playerA, playerB);
    const summary = generateComparisonSummary(result);

    expect(summary.length).toBeGreaterThan(0);
    expect(summary).toMatch(/Reed|Warren/);
  });

  it('ranks hitter attributes from best to worst using display ratings', () => {
    const player = makePlayer({
      hitterAttributes: {
        contact: 250,
        power: 470,
        eye: 200,
        speed: 330,
        defense: 390,
        durability: 275,
      },
    });

    const ranked = rankPlayerAttributes(player);

    expect(ranked[0]?.attribute).toBe('power');
    expect(ranked[1]?.attribute).toBe('defense');
    expect(ranked[0]?.displayRating).toBeGreaterThanOrEqual(ranked[1]?.displayRating ?? 0);
  });

  it('assigns letter grades to ranked attributes', () => {
    const player = makePitcher({
      pitcherAttributes: {
        stuff: 460,
        control: 360,
        stamina: 300,
        velocity: 280,
        movement: 180,
      },
    });

    const ranked = rankPlayerAttributes(player);

    expect(ranked.find((entry) => entry.attribute === 'stuff')?.letterGrade).toBe('A');
    expect(ranked.find((entry) => entry.attribute === 'movement')?.letterGrade).toBe('D');
  });

  it('compares batting stat lines with higher averages and power marked as advantages', () => {
    const statsA = makeStats({
      pa: 200,
      ab: 180,
      hits: 63,
      doubles: 12,
      triples: 2,
      hr: 18,
      rbi: 52,
      bb: 18,
      k: 32,
      hbp: 2,
      sacFlies: 3,
    });
    const statsB = makeStats({
      playerId: 'player-2',
      pa: 200,
      ab: 184,
      hits: 46,
      doubles: 7,
      triples: 1,
      hr: 9,
      rbi: 31,
      bb: 10,
      k: 55,
      hbp: 1,
      sacFlies: 2,
    });

    const comparison = comparePlayerStats(statsA, statsB);

    expect(comparison.find((entry) => entry.statName === 'AVG')?.advantage).toBe('playerA');
    expect(comparison.find((entry) => entry.statName === 'HR')?.advantage).toBe('playerA');
    expect(comparison.find((entry) => entry.statName === 'K')?.advantage).toBe('playerA');
  });

  it('compares pitching stat lines with lower ERA and WHIP treated as better', () => {
    const statsA = makeStats({
      ip: 420,
      earnedRuns: 42,
      strikeouts: 132,
      walks: 30,
      hitsAllowed: 105,
      wins: 13,
      saves: 0,
    });
    const statsB = makeStats({
      playerId: 'player-2',
      ip: 420,
      earnedRuns: 63,
      strikeouts: 118,
      walks: 44,
      hitsAllowed: 130,
      wins: 9,
      saves: 0,
    });

    const comparison = comparePlayerStats(statsA, statsB);

    expect(comparison.find((entry) => entry.statName === 'ERA')?.advantage).toBe('playerA');
    expect(comparison.find((entry) => entry.statName === 'WHIP')?.advantage).toBe('playerA');
    expect(comparison.find((entry) => entry.statName === 'K')?.advantage).toBe('playerA');
  });

  it('returns an empty stat comparison when neither line has hitting or pitching sample', () => {
    const comparison = comparePlayerStats(makeStats(), makeStats({ playerId: 'player-2' }));

    expect(comparison).toEqual([]);
  });

  it('falls back to the shared populated domain when only one side has both stat types', () => {
    const twoWayStats = makeStats({
      pa: 50,
      ab: 45,
      hits: 12,
      hr: 2,
      bb: 5,
      ip: 90,
      earnedRuns: 15,
      strikeouts: 24,
      walks: 7,
      hitsAllowed: 18,
      wins: 3,
      saves: 1,
    });
    const hitterStats = makeStats({
      playerId: 'player-2',
      pa: 55,
      ab: 48,
      hits: 11,
      hr: 1,
      bb: 4,
    });

    const comparison = comparePlayerStats(twoWayStats, hitterStats);

    expect(comparison.map((entry) => entry.statName)).toContain('AVG');
    expect(comparison.map((entry) => entry.statName)).not.toContain('ERA');
  });

  it('uses player names in the generated comparison result', () => {
    const playerA = makePlayer({ firstName: 'Jake', lastName: 'Johnson' });
    const playerB = makePlayer({ id: 'player-2', firstName: 'Luis', lastName: 'Vega' });

    const result = comparePlayersHead2Head(playerA, playerB);

    expect(result.playerAName).toBe('Jake Johnson');
    expect(result.playerBName).toBe('Luis Vega');
  });
});
