import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  generateLeagueEventNarrative,
  generateMonthlyLeagueEvents,
  evaluateEventRippleEffects,
  generatePlayer,
  type GMRelationship,
  type GeneratedPlayer,
  type LeagueEvent,
  type LeagueEventContext,
  type LeagueEventTeamSnapshot,
  type LeagueEventType,
  type RippleEffect,
} from '../src/index.js';

function makePlayer(
  seed: number,
  id: string,
  teamId: string,
  rosterStatus: GeneratedPlayer['rosterStatus'],
  age: number,
  overallRating: number,
): GeneratedPlayer {
  const player = generatePlayer(createGameRNG(seed), 'SS', teamId, rosterStatus);
  return {
    ...player,
    id,
    teamId,
    rosterStatus,
    age,
    overallRating,
    potentialRating: overallRating + 30,
    minorLeagueLevel: rosterStatus === 'MLB' ? null : rosterStatus,
    contract: {
      ...player.contract,
      years: 3,
      annualSalary: 8,
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
    },
    hitterAttributes: {
      contact: overallRating,
      power: overallRating,
      eye: overallRating,
      speed: Math.max(80, overallRating - 40),
      defense: Math.max(80, overallRating - 30),
      durability: overallRating,
    },
    pitcherAttributes: null,
  };
}

function createPlayerPool(): GeneratedPlayer[] {
  return [
    makePlayer(6101, 'nym-star', 'nym', 'MLB', 28, 390),
    makePlayer(6102, 'bos-star', 'bos', 'MLB', 29, 380),
    makePlayer(6103, 'bos-prospect', 'bos', 'AAA', 22, 250),
    makePlayer(6104, 'por-star', 'por', 'MLB', 30, 370),
    makePlayer(6105, 'por-prospect', 'por', 'AA', 21, 245),
    makePlayer(6106, 'por-legend', 'por', 'MLB', 37, 330),
    makePlayer(6107, 'sea-star', 'sea', 'MLB', 31, 365),
    makePlayer(6108, 'sea-prospect', 'sea', 'AAA', 22, 255),
    makePlayer(6109, 'sea-legend', 'sea', 'MLB', 36, 325),
    makePlayer(6110, 'chi-star', 'chi', 'MLB', 28, 360),
    makePlayer(6111, 'chi-prospect', 'chi', 'AAA', 21, 240),
    makePlayer(6112, 'chi-legend', 'chi', 'MLB', 35, 320),
    makePlayer(6113, 'atl-star', 'atl', 'MLB', 29, 355),
    makePlayer(6114, 'atl-prospect', 'atl', 'AA', 20, 235),
    makePlayer(6115, 'atl-legend', 'atl', 'MLB', 36, 315),
    makePlayer(6116, 'dal-star', 'dal', 'MLB', 27, 350),
    makePlayer(6117, 'dal-prospect', 'dal', 'AA', 21, 230),
    makePlayer(6118, 'dal-legend', 'dal', 'MLB', 38, 310),
  ];
}

function createTeamSnapshots(): LeagueEventTeamSnapshot[] {
  return [
    { teamId: 'nym', wins: 58, losses: 32, avgRating: 88, starPlayerIds: ['nym-star'], prospectPlayerIds: [], agingStarPlayerIds: [] },
    { teamId: 'bos', wins: 54, losses: 36, avgRating: 84, starPlayerIds: ['bos-star'], prospectPlayerIds: ['bos-prospect'], agingStarPlayerIds: [] },
    { teamId: 'por', wins: 49, losses: 41, avgRating: 81, starPlayerIds: ['por-star'], prospectPlayerIds: ['por-prospect'], agingStarPlayerIds: ['por-legend'] },
    { teamId: 'sea', wins: 45, losses: 45, avgRating: 80, starPlayerIds: ['sea-star'], prospectPlayerIds: ['sea-prospect'], agingStarPlayerIds: ['sea-legend'] },
    { teamId: 'chi', wins: 38, losses: 52, avgRating: 74, starPlayerIds: ['chi-star'], prospectPlayerIds: ['chi-prospect'], agingStarPlayerIds: ['chi-legend'] },
    { teamId: 'atl', wins: 42, losses: 48, avgRating: 77, starPlayerIds: ['atl-star'], prospectPlayerIds: ['atl-prospect'], agingStarPlayerIds: ['atl-legend'] },
    { teamId: 'dal', wins: 33, losses: 57, avgRating: 70, starPlayerIds: ['dal-star'], prospectPlayerIds: ['dal-prospect'], agingStarPlayerIds: ['dal-legend'] },
  ];
}

function createRelationships(): Map<string, GMRelationship> {
  return new Map([
    ['bos', { targetTeamId: 'bos', score: 20, tradeHistory: [], lastInteractionSeason: 4 }],
    ['por', { targetTeamId: 'por', score: -45, tradeHistory: [], lastInteractionSeason: 4 }],
    ['sea', { targetTeamId: 'sea', score: 10, tradeHistory: [], lastInteractionSeason: 4 }],
    ['chi', { targetTeamId: 'chi', score: -20, tradeHistory: [], lastInteractionSeason: 4 }],
    ['atl', { targetTeamId: 'atl', score: 0, tradeHistory: [], lastInteractionSeason: 4 }],
    ['dal', { targetTeamId: 'dal', score: -60, tradeHistory: [], lastInteractionSeason: 4 }],
  ]);
}

function createContext(month = 4): LeagueEventContext {
  return {
    season: 6,
    month,
    allTeams: createTeamSnapshots(),
    playerPool: createPlayerPool(),
    userTeamId: 'nym',
    currentRelationships: createRelationships(),
  };
}

function makeEvent(type: LeagueEventType, overrides: Partial<LeagueEvent> = {}): LeagueEvent {
  const base: Record<LeagueEventType, LeagueEvent> = {
    blockbuster_trade: {
      type,
      season: 6,
      month: 4,
      teamIds: ['bos', 'por'],
      playerIds: ['bos-star', 'por-star'],
      headline: 'Boston and Portland light the market on fire',
      description: 'Boston Noreasters and Portland Sasquatch just reset the trade board.',
      gameplayEffect: 'The star market just got thinner.',
      effectData: { kind: 'trade_market_shift', magnitude: 14, positionGroup: 'SS' },
    },
    phenom_debut: {
      type,
      season: 6,
      month: 2,
      teamIds: ['bos'],
      playerIds: ['bos-prospect'],
      headline: 'Boston unveils a phenom',
      description: 'Boston Noreasters promoted a blue-chip prospect ahead of schedule.',
      gameplayEffect: 'Prospect asking prices just jumped.',
      effectData: { kind: 'prospect_market_shift', magnitude: 12 },
    },
    gm_firing: {
      type,
      season: 6,
      month: 5,
      teamIds: ['dal'],
      playerIds: [],
      headline: 'Dallas pulls the plug on its GM',
      description: 'Dallas Lone Stars are starting over in the front office.',
      gameplayEffect: 'Relationship history resets with the new regime.',
      effectData: { kind: 'gm_reset', magnitude: 0, newPersonality: 'analytical' },
    },
    injury_cascade: {
      type,
      season: 6,
      month: 4,
      teamIds: ['sea'],
      playerIds: ['sea-star'],
      headline: 'Seattle loses a tentpole bat',
      description: 'Seattle Drizzle suffered the kind of injury that can flip a season.',
      gameplayEffect: 'Seattle may turn into a seller.',
      effectData: { kind: 'seller_signal', magnitude: 18 },
    },
    ownership_change: {
      type,
      season: 6,
      month: 3,
      teamIds: ['chi'],
      playerIds: [],
      headline: 'Chicago changes ownership hands',
      description: 'Chicago Deep Dish have a new ownership group and a new budget mandate.',
      gameplayEffect: 'Budget conditions changed.',
      effectData: { kind: 'budget_shift', magnitude: 20, budgetDeltaPct: 20 },
    },
    record_chase: {
      type,
      season: 6,
      month: 6,
      teamIds: ['bos'],
      playerIds: ['bos-star'],
      headline: 'Boston has a player chasing history',
      description: 'Boston Noreasters are dragging the league into a record watch.',
      gameplayEffect: 'Gate interest will rise.',
      effectData: { kind: 'revenue_shift', magnitude: 6, revenuePct: 6 },
    },
    ifa_frenzy: {
      type,
      season: 6,
      month: 7,
      teamIds: ['bos', 'por', 'sea'],
      playerIds: [],
      headline: 'The IFA market just got reckless',
      description: 'Several clubs pushed the international market into a frenzy.',
      gameplayEffect: 'International prices are rising.',
      effectData: { kind: 'international_market_shift', magnitude: 12, inflationPct: 12 },
    },
    retirement_tour: {
      type,
      season: 6,
      month: 6,
      teamIds: ['por'],
      playerIds: ['por-legend'],
      headline: 'Portland starts a retirement tour',
      description: 'Portland Sasquatch are following one more lap with a franchise icon.',
      gameplayEffect: 'Road gates will jump when the tour comes through.',
      effectData: { kind: 'revenue_shift', magnitude: 8, revenuePct: 8 },
    },
    scandal: {
      type,
      season: 6,
      month: 5,
      teamIds: ['chi'],
      playerIds: [],
      headline: 'Chicago is hit with a cheating scandal',
      description: 'Chicago Deep Dish lost credibility and draft capital overnight.',
      gameplayEffect: 'Future draft order will be affected.',
      effectData: { kind: 'draft_pick_penalty', magnitude: 2, picksLost: 2 },
    },
    expansion_rumors: {
      type,
      season: 6,
      month: 6,
      teamIds: ['atl', 'dal'],
      playerIds: [],
      headline: 'Expansion rumors are gaining steam',
      description: 'Atlanta Peach Kings and Dallas Lone Stars are at the center of the rumor mill.',
      gameplayEffect: 'Long-term market expectations just got noisier.',
      effectData: { kind: 'expansion_uncertainty', magnitude: 10, uncertaintyScore: 10 },
    },
  };

  return {
    ...base[type],
    ...overrides,
    effectData: overrides.effectData ?? base[type].effectData,
  };
}

function countTypeOverSeeds(type: LeagueEventType, month: number, startSeed: number, endSeed: number): number {
  let total = 0;
  for (let seed = startSeed; seed <= endSeed; seed++) {
    total += generateMonthlyLeagueEvents(createGameRNG(seed), createContext(month))
      .filter((event) => event.type === type).length;
  }
  return total;
}

describe('leagueEvents', () => {
  it.each([1, 2, 3, 4, 5, 6, 7, 8])(
    'generates between zero and two events for seed %i',
    (seed) => {
      const events = generateMonthlyLeagueEvents(createGameRNG(seed), createContext(4));
      expect(events.length).toBeGreaterThanOrEqual(0);
      expect(events.length).toBeLessThanOrEqual(2);
    },
  );

  it('is deterministic for the same seed and context', () => {
    const context = createContext(4);
    const first = generateMonthlyLeagueEvents(createGameRNG(701), context);
    const second = generateMonthlyLeagueEvents(createGameRNG(701), context);

    expect(second).toEqual(first);
  });

  it('references only valid non-user team ids in generated events', () => {
    const validTeamIds = new Set(createContext(4).allTeams.map((team) => team.teamId));
    const events = generateMonthlyLeagueEvents(createGameRNG(702), createContext(4));

    for (const event of events) {
      expect(event.teamIds.every((teamId) => validTeamIds.has(teamId))).toBe(true);
      expect(event.teamIds.includes('nym')).toBe(false);
    }
  });

  it('uses player ids from the provided player pool', () => {
    const validPlayerIds = new Set(createContext(4).playerPool.map((player) => player.id));
    const events = generateMonthlyLeagueEvents(createGameRNG(703), createContext(4));

    for (const event of events) {
      expect(event.playerIds.every((playerId) => validPlayerIds.has(playerId))).toBe(true);
    }
  });

  it('can produce a zero-event month', () => {
    const counts = Array.from({ length: 20 }, (_, index) =>
      generateMonthlyLeagueEvents(createGameRNG(710 + index), createContext(1)).length,
    );

    expect(counts).toContain(0);
  });

  it('can produce a two-event month', () => {
    const counts = Array.from({ length: 20 }, (_, index) =>
      generateMonthlyLeagueEvents(createGameRNG(730 + index), createContext(5)).length,
    );

    expect(counts).toContain(2);
  });

  it('weights blockbuster trades more heavily near the deadline', () => {
    const earlyCount = countTypeOverSeeds('blockbuster_trade', 2, 800, 860);
    const deadlineCount = countTypeOverSeeds('blockbuster_trade', 5, 800, 860);

    expect(deadlineCount).toBeGreaterThanOrEqual(earlyCount);
  });

  it('weights phenom debuts more heavily in the early season', () => {
    const earlyCount = countTypeOverSeeds('phenom_debut', 2, 900, 960);
    const lateCount = countTypeOverSeeds('phenom_debut', 6, 900, 960);

    expect(earlyCount).toBeGreaterThanOrEqual(lateCount);
  });

  it('weights record chases more heavily late in the season', () => {
    const earlyCount = countTypeOverSeeds('record_chase', 2, 1000, 1060);
    const lateCount = countTypeOverSeeds('record_chase', 6, 1000, 1060);

    expect(lateCount).toBeGreaterThanOrEqual(earlyCount);
  });

  it('generated headlines and descriptions reference specific team names', () => {
    const events = generateMonthlyLeagueEvents(createGameRNG(1101), createContext(4));

    for (const event of events) {
      expect(event.headline.length).toBeGreaterThan(0);
      expect(event.description.length).toBeGreaterThan(0);
      expect(event.headline + event.description).not.toContain('undefined');
    }
  });

  it.each([
    ['blockbuster_trade', 'trade_market_shift'],
    ['phenom_debut', 'prospect_market_shift'],
    ['gm_firing', 'gm_reset'],
    ['injury_cascade', 'seller_signal'],
    ['ownership_change', 'budget_shift'],
    ['record_chase', 'revenue_shift'],
    ['ifa_frenzy', 'international_market_shift'],
    ['retirement_tour', 'revenue_shift'],
    ['scandal', 'draft_pick_penalty'],
    ['expansion_rumors', 'expansion_uncertainty'],
  ] as Array<[LeagueEventType, RippleEffect['type']]>)(
    'maps %s events to the expected ripple effect type',
    (type, expectedEffectType) => {
      const rippleEffects = evaluateEventRippleEffects(makeEvent(type), 'nym');

      expect(rippleEffects[0]?.type).toBe(expectedEffectType);
    },
  );

  it('resets relationships to neutral and assigns a new GM personality on gm_firing effects', () => {
    const rippleEffects = evaluateEventRippleEffects(makeEvent('gm_firing'), 'nym');
    const gmReset = rippleEffects[0];

    expect(gmReset?.type).toBe('gm_reset');
    if (gmReset?.type === 'gm_reset') {
      expect(gmReset.resetRelationshipScore).toBe(0);
      expect(['aggressive', 'win_now', 'conservative', 'prospect_hugger', 'analytical']).toContain(gmReset.newPersonality);
    }
  });

  it('adds trade-market context to blockbuster ripple effects', () => {
    const rippleEffects = evaluateEventRippleEffects(makeEvent('blockbuster_trade'), 'nym');
    const tradeEffect = rippleEffects[0];

    expect(tradeEffect?.type).toBe('trade_market_shift');
    if (tradeEffect?.type === 'trade_market_shift') {
      expect(tradeEffect.positionGroup).toBe('SS');
      expect(tradeEffect.magnitude).toBeGreaterThan(0);
    }
  });

  it('threads the user team id into retirement-tour revenue effects', () => {
    const rippleEffects = evaluateEventRippleEffects(makeEvent('retirement_tour'), 'nym');
    const revenueEffect = rippleEffects[0];

    expect(revenueEffect?.type).toBe('revenue_shift');
    if (revenueEffect?.type === 'revenue_shift') {
      expect(revenueEffect.userTeamId).toBe('nym');
    }
  });

  it('keeps ripple-effect generation deterministic', () => {
    const event = makeEvent('ownership_change');
    const first = evaluateEventRippleEffects(event, 'nym');
    const second = evaluateEventRippleEffects(event, 'nym');

    expect(second).toEqual(first);
  });

  it.each([
    ['blockbuster_trade', 'Boston'],
    ['phenom_debut', 'Boston'],
    ['gm_firing', 'Dallas'],
    ['injury_cascade', 'Seattle'],
    ['ownership_change', 'Chicago'],
    ['record_chase', 'Boston'],
    ['ifa_frenzy', 'Boston'],
    ['retirement_tour', 'Portland'],
    ['scandal', 'Chicago'],
    ['expansion_rumors', 'Atlanta'],
  ] as Array<[LeagueEventType, string]>)(
    'builds narrative text for %s events with grounded team names',
    (type, expectedText) => {
      const narrative = generateLeagueEventNarrative(
        createGameRNG(1200),
        makeEvent(type),
      );

      expect(narrative).toContain(expectedText);
    },
  );

  it('keeps generated event narratives deterministic', () => {
    const event = makeEvent('blockbuster_trade');
    const first = generateLeagueEventNarrative(createGameRNG(1201), event);
    const second = generateLeagueEventNarrative(createGameRNG(1201), event);

    expect(second).toBe(first);
  });

  it('falls back to uppercase team ids in event narratives when lookups fail', () => {
    const narrative = generateLeagueEventNarrative(
      createGameRNG(1202),
      makeEvent('scandal', {
        teamIds: ['xyz'],
        headline: 'XYZ is in trouble',
        description: 'XYZ just burned draft capital.',
      }),
    );

    expect(narrative).toContain('XYZ');
  });
});
