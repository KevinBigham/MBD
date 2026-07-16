import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  calculateAwardRaces,
  calculateTeamChemistry,
  createInitialPlayerMorale,
  createOwnerState,
  buildFrontOfficeBriefing,
  detectProspectBreakouts,
  deriveRivalriesFromStandings,
  evaluateOwnerState,
  finalizeAwardResults,
  generatePlayer,
  getPersonalityArchetype,
  type PlayerGameStats,
  type StandingsEntry,
  upsertRivalry,
  applyMoraleEvent,
  applyOwnerDecisionDelta,
} from '../src/index.js';
import type {
  BriefingItem,
  OwnerState,
  PlayerMorale,
  Rivalry,
  TeamChemistry,
} from '@mbd/contracts';
import type { GeneratedPlayer } from '../src/index.js';

function makePlayer(seed: number, teamId: string, position: Parameters<typeof generatePlayer>[1]): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(rng, position, teamId, 'MLB');
}

function makePlayerWithTraits(
  seed: number,
  teamId: string,
  traits: Partial<GeneratedPlayer['personality']>,
): GeneratedPlayer {
  const player = makePlayer(seed, teamId, 'SS');
  return {
    ...player,
    personality: {
      ...player.personality,
      ...traits,
    },
  };
}

describe('narrative state', () => {
  it('derives stable personality archetypes from the core four personality ratings', () => {
    const captain = makePlayerWithTraits(1, 'nym', {
      leadership: 95,
      mentalToughness: 88,
      competitiveness: 72,
      workEthic: 80,
    });
    const sparkplug = makePlayerWithTraits(2, 'nym', {
      leadership: 45,
      mentalToughness: 60,
      competitiveness: 95,
      workEthic: 92,
    });

    expect(getPersonalityArchetype(captain)).toBe('captain');
    expect(getPersonalityArchetype(sparkplug)).toBe('sparkplug');
  });

  it('creates deterministic initial morale entries inside the 0-100 band', () => {
    const player = makePlayerWithTraits(5, 'nym', {
      workEthic: 88,
      mentalToughness: 90,
      leadership: 60,
      competitiveness: 75,
    });

    const moraleA = createInitialPlayerMorale(player, 'S1D1');
    const moraleB = createInitialPlayerMorale(player, 'S1D1');

    expect(moraleA).toEqual(moraleB);
    expect(moraleA.score).toBeGreaterThanOrEqual(0);
    expect(moraleA.score).toBeLessThanOrEqual(100);
  });

  it('applies morale events without leaving the valid range', () => {
    const player = makePlayerWithTraits(7, 'nym', {
      workEthic: 70,
      mentalToughness: 65,
      leadership: 50,
      competitiveness: 80,
    });
    const baseline = createInitialPlayerMorale(player, 'S1D1');
    const afterWin = applyMoraleEvent(player, baseline, {
      type: 'win',
      impact: 8,
      summary: 'Big comeback win.',
      timestamp: 'S1D2',
    });
    const afterInjury = applyMoraleEvent(player, afterWin, {
      type: 'injury',
      impact: -18,
      summary: 'Tweaked hamstring.',
      timestamp: 'S1D3',
    });

    expect(afterWin.score).toBeGreaterThan(baseline.score);
    expect(afterInjury.score).toBeLessThan(afterWin.score);
    expect(afterInjury.score).toBeGreaterThanOrEqual(0);
    expect(afterInjury.summary).toContain('Tweaked hamstring');
  });

  it('calculates better chemistry for high-leadership, high-morale clubs', () => {
    const strongRoster = [
      makePlayerWithTraits(11, 'nym', { leadership: 94, mentalToughness: 85, workEthic: 88, competitiveness: 79 }),
      makePlayerWithTraits(12, 'nym', { leadership: 82, mentalToughness: 80, workEthic: 84, competitiveness: 77 }),
      makePlayerWithTraits(13, 'nym', { leadership: 78, mentalToughness: 76, workEthic: 81, competitiveness: 73 }),
    ];
    const weakRoster = [
      makePlayerWithTraits(21, 'bos', { leadership: 22, mentalToughness: 35, workEthic: 30, competitiveness: 48 }),
      makePlayerWithTraits(22, 'bos', { leadership: 18, mentalToughness: 28, workEthic: 25, competitiveness: 42 }),
      makePlayerWithTraits(23, 'bos', { leadership: 20, mentalToughness: 32, workEthic: 27, competitiveness: 41 }),
    ];

    const strongMorale = new Map<string, PlayerMorale>(
      strongRoster.map((player) => [player.id, { ...createInitialPlayerMorale(player, 'S1D1'), score: 72 }]),
    );
    const weakMorale = new Map<string, PlayerMorale>(
      weakRoster.map((player) => [player.id, { ...createInitialPlayerMorale(player, 'S1D1'), score: 33 }]),
    );

    const strongChemistry = calculateTeamChemistry('nym', strongRoster, strongMorale);
    const weakChemistry = calculateTeamChemistry('bos', weakRoster, weakMorale);

    expect(strongChemistry.score).toBeGreaterThan(weakChemistry.score);
    expect(strongChemistry.tier).not.toBe('fractured');
  });

  it('rewards positive personality mixes and penalizes toxic trait combinations', () => {
    const baseRoster = [
      makePlayerWithTraits(24, 'nym', { leadership: 72, mentalToughness: 74, workEthic: 73, competitiveness: 71 }),
      makePlayerWithTraits(25, 'nym', { leadership: 72, mentalToughness: 74, workEthic: 73, competitiveness: 71 }),
      makePlayerWithTraits(26, 'nym', { leadership: 72, mentalToughness: 74, workEthic: 73, competitiveness: 71 }),
    ];
    const positiveRoster = baseRoster.map((player, index) => ({
      ...player,
      id: `${player.id}-positive-${index}`,
      personalityTraits: index === 0 ? ['Leader', 'Team First'] : index === 1 ? ['Mentor', 'Hard Worker'] : ['Fan Favorite', 'Clubhouse Comedian'],
    }));
    const toxicRoster = baseRoster.map((player, index) => ({
      ...player,
      id: `${player.id}-toxic-${index}`,
      personalityTraits: index === 0 ? ['Diva', 'Hot Head'] : index === 1 ? ['Mercenary', 'Moody'] : ['Party Animal', 'Streaky'],
    }));
    const morale = new Map<string, PlayerMorale>([
      ...positiveRoster.map((player) => [player.id, { ...createInitialPlayerMorale(player, 'S1D1'), score: 60 }] as const),
      ...toxicRoster.map((player) => [player.id, { ...createInitialPlayerMorale(player, 'S1D1'), score: 60 }] as const),
    ]);

    const positiveChemistry = calculateTeamChemistry('nym', positiveRoster, morale);
    const toxicChemistry = calculateTeamChemistry('nym', toxicRoster, morale);

    expect(positiveChemistry.score).toBeGreaterThan(toxicChemistry.score);
    expect(positiveChemistry.reasons.join(' ')).toMatch(/lead|clubhouse|mentor/i);
    expect(toxicChemistry.reasons.join(' ')).toMatch(/diva|tension|mercenary|drama/i);
  });

  it('puts expensive underperformers on the hot seat', () => {
    const owner = createOwnerState('nym', 210_000_000);
    const evaluated = evaluateOwnerState(owner, {
      wins: 68,
      losses: 82,
      payroll: 228_000_000,
      chemistryScore: 41,
      recentDecisionScore: -12,
    });

    expect(evaluated.hotSeat).toBe(true);
    expect(evaluated.patience).toBeLessThan(owner.patience);
    expect(evaluated.summary).toContain('playoff');
  });

  it('keeps annual economics out of ordinary owner evaluation and decision deltas', () => {
    const owner = {
      ...createOwnerState('nym', 210_000_000),
      annualBudget: 321.09,
      payrollCap: 295.4,
      draftBonusPool: 9.63,
      ifaBonusPool: 7.22,
      staffBudget: 16.86,
      expectations: {
        ...createOwnerState('nym', 210_000_000).expectations,
        payrollTarget: 295.4,
      },
    };
    const finance = {
      annualBudget: owner.annualBudget,
      payrollCap: owner.payrollCap,
      draftBonusPool: owner.draftBonusPool,
      ifaBonusPool: owner.ifaBonusPool,
      staffBudget: owner.staffBudget,
      payrollTarget: owner.expectations.payrollTarget,
    };

    const evaluated = evaluateOwnerState(owner, {
      wins: 110,
      losses: 40,
      payroll: 250_000_000,
      chemistryScore: 80,
      recentDecisionScore: 12,
      madePlayoffs: true,
    });
    const decision = applyOwnerDecisionDelta(owner, 15, 'Ownership loved the decision.');

    for (const result of [evaluated, decision]) {
      expect({
        annualBudget: result.annualBudget,
        payrollCap: result.payrollCap,
        draftBonusPool: result.draftBonusPool,
        ifaBonusPool: result.ifaBonusPool,
        staffBudget: result.staffBudget,
        payrollTarget: result.expectations.payrollTarget,
      }).toEqual(finance);
    }
    expect(evaluated.satisfaction).not.toBe(owner.satisfaction);
    expect(decision.satisfaction).not.toBe(owner.satisfaction);
  });

  it('builds a front office briefing ordered by urgency', () => {
    const ownerState: OwnerState = {
      teamId: 'nym',
      archetype: 'win_now',
      patience: 36,
      confidence: 42,
      hotSeat: true,
      summary: 'Ownership expected a playoff berth.',
      expectations: {
        winsTarget: 90,
        playoffTarget: true,
        payrollTarget: 210_000_000,
      },
    };
    const chemistry: TeamChemistry = {
      teamId: 'nym',
      score: 44,
      tier: 'tense',
      trend: 'falling',
      summary: 'Clubhouse tension is rising.',
      reasons: ['Losing streak'],
    };
    const rivalries = new Map<string, Rivalry>([
      ['bos:nym', {
        id: 'bos:nym',
        teamA: 'nym',
        teamB: 'bos',
        intensity: 67,
        summary: 'The division race is tightening.',
        reasons: ['Standings pressure'],
      }],
    ]);

    const briefing = buildFrontOfficeBriefing({
      teamId: 'nym',
      ownerState,
      chemistry,
      unreadNewsCount: 5,
      rivalries,
      season: 2028,
      day: 90,
    });

    expect(briefing[0]?.category).toBe('owner');
    expect(briefing.some((item) => item.category === 'chemistry')).toBe(true);
    expect(briefing.some((item) => item.category === 'rivalry')).toBe(true);
  });

  it('uses deterministic pooled rivalry copy in the front office briefing', () => {
    const ownerState: OwnerState = {
      teamId: 'nym',
      archetype: 'win_now',
      patience: 36,
      confidence: 42,
      hotSeat: false,
      summary: 'Ownership expected a playoff berth.',
      expectations: {
        winsTarget: 90,
        playoffTarget: true,
        payrollTarget: 210_000_000,
      },
    };
    const chemistry: TeamChemistry = {
      teamId: 'nym',
      score: 68,
      tier: 'connected',
      trend: 'steady',
      summary: 'The clubhouse is holding together.',
      reasons: ['Veteran leadership'],
    };
    const rivalry: Rivalry = {
      id: 'bos:nym',
      teamA: 'nym',
      teamB: 'bos',
      intensity: 72,
      summary: 'Boston keeps showing up in the biggest spots.',
      reasons: ['Standings pressure', 'October carryover'],
      origin: 'historical',
      active: true,
      currentSeasonWinsA: 6,
      currentSeasonWinsB: 5,
      closeRaceStreak: 2,
      playoffSeriesStreak: 1,
      eventHistory: [
        { season: 7, type: 'division_race', summary: 'The standings stayed tight into September.' },
        { season: 6, type: 'playoff', summary: 'October kept the feud alive.' },
      ],
    };

    const first = buildFrontOfficeBriefing({
      teamId: 'nym',
      ownerState,
      chemistry,
      unreadNewsCount: 0,
      rivalries: new Map([[rivalry.id, rivalry]]),
      season: 2028,
      day: 90,
    }).find((item) => item.category === 'rivalry');
    const second = buildFrontOfficeBriefing({
      teamId: 'nym',
      ownerState,
      chemistry,
      unreadNewsCount: 0,
      rivalries: new Map([[rivalry.id, rivalry]]),
      season: 2028,
      day: 90,
    }).find((item) => item.category === 'rivalry');

    expect(first).toBeTruthy();
    expect(second).toEqual(first);
    expect(first?.headline).not.toBe('A rivalry is becoming a real subplot.');
  });

  it('keeps rivalry briefings off the board below the existing intensity gate', () => {
    const ownerState: OwnerState = {
      teamId: 'nym',
      archetype: 'win_now',
      patience: 36,
      confidence: 42,
      hotSeat: false,
      summary: 'Ownership expected a playoff berth.',
      expectations: {
        winsTarget: 90,
        playoffTarget: true,
        payrollTarget: 210_000_000,
      },
    };
    const chemistry: TeamChemistry = {
      teamId: 'nym',
      score: 68,
      tier: 'connected',
      trend: 'steady',
      summary: 'The clubhouse is holding together.',
      reasons: ['Veteran leadership'],
    };

    const briefing = buildFrontOfficeBriefing({
      teamId: 'nym',
      ownerState,
      chemistry,
      unreadNewsCount: 0,
      rivalries: new Map([[
        'bos:nym',
        {
          id: 'bos:nym',
          teamA: 'nym',
          teamB: 'bos',
          intensity: 54,
          summary: 'The feud cooled off for now.',
          reasons: ['Dormant season'],
        },
      ]]),
      season: 2028,
      day: 90,
    });

    expect(briefing.some((item) => item.category === 'rivalry')).toBe(false);
  });

  it('selects owner briefing headlines deterministically with wider prose coverage', () => {
    const chemistry: TeamChemistry = {
      teamId: 'nym',
      score: 62,
      tier: 'steady',
      trend: 'holding',
      summary: 'The room is stable.',
      reasons: ['Veteran core'],
    };

    const buildHeadline = (teamId: string, hotSeat: boolean, summary: string): string =>
      buildFrontOfficeBriefing({
        teamId,
        ownerState: {
          teamId,
          archetype: 'win_now',
          patience: hotSeat ? 38 : 72,
          confidence: hotSeat ? 41 : 74,
          hotSeat,
          summary,
          expectations: {
            winsTarget: 90,
            playoffTarget: true,
            payrollTarget: 210_000_000,
          },
        },
        chemistry,
        unreadNewsCount: 0,
        rivalries: new Map(),
        season: 2028,
        day: 90,
      })[0]!.headline;

    expect(buildHeadline('nym', true, 'Ownership expected a playoff berth.'))
      .toBe(buildHeadline('nym', true, 'Ownership expected a playoff berth.'));
    expect(buildHeadline('nym', false, 'Ownership is aligned with the current direction.'))
      .toBe(buildHeadline('nym', false, 'Ownership is aligned with the current direction.'));

    const hotSeatHeadlines = new Set(
      Array.from({ length: 8 }, (_, index) =>
        buildHeadline(`hot-${index}`, true, `Ownership expected more from stretch ${index}.`),
      ),
    );
    const stableHeadlines = new Set(
      Array.from({ length: 8 }, (_, index) =>
        buildHeadline(`steady-${index}`, false, `Ownership likes the long-term footing ${index}.`),
      ),
    );

    expect(hotSeatHeadlines.size).toBeGreaterThanOrEqual(3);
    expect(stableHeadlines.size).toBeGreaterThanOrEqual(3);
  });
});

describe('awards and rivalries', () => {
  it('calculates deterministic MVP, Cy Young, and Rookie races', () => {
    const hitter = makePlayer(31, 'nym', 'RF');
    const rookie = { ...makePlayer(32, 'nym', 'CF'), age: 22 };
    const ace = makePlayer(33, 'bos', 'SP');

    const stats = new Map<string, PlayerGameStats>([
      [hitter.id, {
        pa: 650, ab: 570, hits: 190, doubles: 42, triples: 4, hr: 39, rbi: 118, bb: 72, k: 120, runs: 101,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, wins: 0, losses: 0,
      }],
      [rookie.id, {
        pa: 590, ab: 520, hits: 161, doubles: 28, triples: 6, hr: 24, rbi: 88, bb: 58, k: 132, runs: 92,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, wins: 0, losses: 0,
      }],
      [ace.id, {
        pa: 0, ab: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, runs: 0,
        ip: 615, earnedRuns: 68, strikeouts: 244, walks: 51, hitsAllowed: 142, wins: 18, losses: 7,
      }],
    ]);

    const races = calculateAwardRaces([hitter, rookie, ace], stats);

    expect(races.mvp[0]?.playerId).toBe(hitter.id);
    expect(races.cyYoung[0]?.playerId).toBe(ace.id);
    expect(races.roy[0]?.playerId).toBe(rookie.id);
  });

  it('finalizes award history entries from race leaders', () => {
    const alHitter = makePlayer(41, 'nym', 'LF');
    const nlHitter = makePlayer(42, 'lax', 'RF');
    const alPitcher = makePlayer(43, 'bos', 'SP');
    const nlPitcher = makePlayer(44, 'sdg', 'SP');
    const alRookie = { ...makePlayer(45, 'nym', 'CF'), age: 22 };
    const nlRookie = { ...makePlayer(46, 'lax', 'SS'), age: 21 };
    const stats = new Map<string, PlayerGameStats>([
      [alHitter.id, {
        pa: 640, ab: 560, hits: 188, doubles: 34, triples: 3, hr: 36, rbi: 111, bb: 77, k: 101, runs: 109,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, wins: 0, losses: 0,
      }],
      [nlHitter.id, {
        pa: 638, ab: 552, hits: 182, doubles: 30, triples: 4, hr: 34, rbi: 106, bb: 70, k: 104, runs: 103,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, wins: 0, losses: 0,
      }],
      [alPitcher.id, {
        pa: 0, ab: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, runs: 0,
        ip: 612, earnedRuns: 64, strikeouts: 238, walks: 49, hitsAllowed: 136, wins: 19, losses: 6,
      }],
      [nlPitcher.id, {
        pa: 0, ab: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, k: 0, runs: 0,
        ip: 606, earnedRuns: 66, strikeouts: 231, walks: 47, hitsAllowed: 139, wins: 17, losses: 8,
      }],
      [alRookie.id, {
        pa: 590, ab: 522, hits: 167, doubles: 29, triples: 5, hr: 27, rbi: 91, bb: 55, k: 118, runs: 94,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, wins: 0, losses: 0,
      }],
      [nlRookie.id, {
        pa: 575, ab: 509, hits: 159, doubles: 31, triples: 7, hr: 25, rbi: 87, bb: 61, k: 109, runs: 96,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0, wins: 0, losses: 0,
      }],
    ]);
    const players = [alHitter, nlHitter, alPitcher, nlPitcher, alRookie, nlRookie];
    const history = finalizeAwardResults(3, players, stats);

    expect(history).toHaveLength(10);
    expect(history[0]?.season).toBe(3);
    expect(history.some((entry) => entry.award === 'MVP' && entry.league === 'AL')).toBe(true);
    expect(history.some((entry) => entry.award === 'MVP' && entry.league === 'NL')).toBe(true);
    expect(history.some((entry) => entry.award === 'CY_YOUNG' && entry.league === 'AL')).toBe(true);
    expect(history.some((entry) => entry.award === 'CY_YOUNG' && entry.league === 'NL')).toBe(true);
    expect(history.some((entry) => entry.award === 'ROY' && entry.league === 'AL')).toBe(true);
    expect(history.some((entry) => entry.award === 'ROY' && entry.league === 'NL')).toBe(true);
    expect(history.some((entry) => entry.award === 'GOLD_GLOVE' && entry.league === 'AL')).toBe(true);
    expect(history.some((entry) => entry.award === 'GOLD_GLOVE' && entry.league === 'NL')).toBe(true);
    expect(history.some((entry) => entry.award === 'SILVER_SLUGGER' && entry.league === 'AL')).toBe(true);
    expect(history.some((entry) => entry.award === 'SILVER_SLUGGER' && entry.league === 'NL')).toBe(true);
  });

  it('creates and intensifies rivalries from close division races', () => {
    const rivalryMap = new Map<string, Rivalry>();
    const standings: Record<string, StandingsEntry[]> = {
      AL_EAST: [
        { teamId: 'nym', wins: 91, losses: 71, pct: 0.562, gamesBack: 0, runsScored: 760, runsAllowed: 690, runDifferential: 70, streak: 'W3', last10Wins: 7, last10Losses: 3 },
        { teamId: 'bos', wins: 90, losses: 72, pct: 0.556, gamesBack: 1, runsScored: 748, runsAllowed: 702, runDifferential: 46, streak: 'W1', last10Wins: 6, last10Losses: 4 },
      ],
    };

    const derived = deriveRivalriesFromStandings(rivalryMap, standings);
    const updated = upsertRivalry(derived, 'nym', 'bos', 8, 'Late-season showdown');

    expect(updated.get('bos:nym')?.intensity).toBeGreaterThan(50);
    expect(updated.get('bos:nym')?.reasons).toContain('Late-season showdown');
  });
});

describe('breakouts', () => {
  it('detects breakout prospects after large offseason jumps', () => {
    const before = makePlayer(51, 'nym', 'SS');
    const after = {
      ...before,
      age: before.age + 1,
      overallRating: before.overallRating + 34,
    };

    const breakouts = detectProspectBreakouts([before], [after], 'S2D1');

    expect(breakouts).toHaveLength(1);
    expect(breakouts[0]?.playerId).toBe(before.id);
    expect(breakouts[0]?.delta).toBeGreaterThanOrEqual(30);
  });

  it('orders tied breakout candidates deterministically regardless of input order', () => {
    const firstBefore = {
      ...makePlayer(61, 'nym', 'SS'),
      id: 'breakout-alpha',
      developmentPhase: 'Prospect',
    };
    const secondBefore = {
      ...makePlayer(62, 'bos', 'CF'),
      id: 'breakout-beta',
      developmentPhase: 'Prospect',
    };
    const firstAfter = {
      ...firstBefore,
      age: firstBefore.age + 1,
      overallRating: firstBefore.overallRating + 32,
    };
    const secondAfter = {
      ...secondBefore,
      age: secondBefore.age + 1,
      overallRating: secondBefore.overallRating + 32,
    };

    const forward = detectProspectBreakouts(
      [firstBefore, secondBefore],
      [firstAfter, secondAfter],
      'S2D1',
    );
    const reversed = detectProspectBreakouts(
      [firstBefore, secondBefore],
      [secondAfter, firstAfter],
      'S2D1',
    );

    expect(forward.map((entry) => entry.playerId)).toEqual(reversed.map((entry) => entry.playerId));
  });
});
