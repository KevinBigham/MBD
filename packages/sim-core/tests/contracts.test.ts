import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  calculateExtensionOffer,
  calculateQualifyingOfferSalary,
  evaluateExtensionWillingness,
  generatePlayer,
  getQualifyingOfferEligiblePlayers,
  issueQualifyingOffer,
  negotiateExtension,
  processTeamExtensions,
  resolveQualifyingOffer,
  shouldIssueQualifyingOffer,
  type ExtensionTeamContext,
  type GeneratedPlayer,
} from '../src/index.js';

function makePlayer(seed: number, position: GeneratedPlayer['position'] = 'SS'): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, position, 'nyy', 'MLB');
  return {
    ...player,
    rosterStatus: 'MLB',
    teamId: 'nyy',
    contract: {
      ...player.contract,
      years: 1,
      annualSalary: 8,
      totalValue: 8,
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
      optOutYears: [],
      noTradeClauseType: 'none',
    },
    extensionHistory: [],
  };
}

function setHitterRatings(player: GeneratedPlayer, rating: number): GeneratedPlayer {
  if (player.pitcherAttributes) {
    return player;
  }

  return {
    ...player,
    overallRating: rating,
    hitterAttributes: {
      contact: rating,
      power: rating,
      eye: rating,
      speed: Math.max(80, rating - 30),
      defense: Math.max(80, rating - 30),
      durability: Math.max(80, rating - 20),
    },
  };
}

function createTeamContext(overrides: Partial<ExtensionTeamContext> = {}): ExtensionTeamContext {
  return {
    season: 5,
    teamId: 'nyy',
    teamWinPct: 0.58,
    teamBudget: 220,
    currentPayroll: 150,
    futureCommitments: [110, 88, 44],
    controlYearsByPlayer: new Map<string, number>(),
    serviceYearsByPlayer: new Map<string, number>(),
    moraleByPlayer: new Map<string, number>(),
    ...overrides,
  };
}

describe('evaluateExtensionWillingness', () => {
  it('makes older declining players with less control more willing than young rising stars', () => {
    const older = {
      ...setHitterRatings(makePlayer(11), 320),
      age: 33,
      developmentTrajectory: 'below_expectations' as const,
    };
    const younger = {
      ...setHitterRatings(makePlayer(12), 360),
      age: 24,
      developmentTrajectory: 'ahead_of_curve' as const,
    };
    const team = createTeamContext();
    team.controlYearsByPlayer.set(older.id, 1);
    team.controlYearsByPlayer.set(younger.id, 3);
    team.serviceYearsByPlayer.set(older.id, 5);
    team.serviceYearsByPlayer.set(younger.id, 2);
    team.moraleByPlayer.set(older.id, 68);
    team.moraleByPlayer.set(younger.id, 68);

    const olderResult = evaluateExtensionWillingness(older, team, new GameRNG(91));
    const youngerResult = evaluateExtensionWillingness(younger, team, new GameRNG(91));

    expect(olderResult.willingness).toBeGreaterThan(youngerResult.willingness);
    expect(olderResult.demandMultiplier).toBeLessThan(youngerResult.demandMultiplier);
    expect(olderResult.walkAwayThreshold).toBeLessThanOrEqual(olderResult.demandMultiplier);
  });
});

describe('calculateExtensionOffer', () => {
  it('returns the requested extension years and full v8 contract detail fields', () => {
    const player = setHitterRatings(makePlayer(21), 355);
    const team = createTeamContext();
    team.controlYearsByPlayer.set(player.id, 1);
    team.serviceYearsByPlayer.set(player.id, 4);
    team.moraleByPlayer.set(player.id, 74);

    const offer = calculateExtensionOffer(player, team, 4, new GameRNG(44));

    expect(offer.years).toBe(4);
    expect(offer.annualSalary).toBeGreaterThan(0);
    expect(offer.totalValue).toBeGreaterThan(offer.annualSalary * 3);
    expect(offer.signingBonus).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(offer.optOutYears)).toBe(true);
    expect(Array.isArray(offer.deferredMoney)).toBe(true);
    expect(['none', 'partial', 'full']).toContain(offer.noTradeClauseType);
  });
});

describe('negotiateExtension', () => {
  it('is deterministic for the same player, context, offer, and seed', () => {
    const player = setHitterRatings(makePlayer(31), 340);
    const team = createTeamContext();
    team.controlYearsByPlayer.set(player.id, 1);
    team.serviceYearsByPlayer.set(player.id, 4);
    team.moraleByPlayer.set(player.id, 72);

    const offer = calculateExtensionOffer(player, team, 4, new GameRNG(56));
    const first = negotiateExtension(player, team, offer, new GameRNG(77));
    const second = negotiateExtension(player, team, offer, new GameRNG(77));

    expect(second).toEqual(first);
  });

  it('supports a three-round negotiation arc before a final rejection', () => {
    const player = {
      ...setHitterRatings(makePlayer(32), 365),
      age: 27,
      developmentTrajectory: 'ahead_of_curve' as const,
    };
    const team = createTeamContext({ teamWinPct: 0.47 });
    team.controlYearsByPlayer.set(player.id, 1);
    team.serviceYearsByPlayer.set(player.id, 3);
    team.moraleByPlayer.set(player.id, 48);

    const baseline = calculateExtensionOffer(player, team, 5, new GameRNG(58));
    const lowball = {
      ...baseline,
      annualSalary: Math.round(baseline.annualSalary * 0.55 * 100) / 100,
      totalValue: Math.round(baseline.totalValue * 0.55 * 100) / 100,
      signingBonus: 0,
    };

    const roundOne = negotiateExtension(player, team, lowball, new GameRNG(88));
    expect(roundOne.status).toBe('countered');
    expect(roundOne.rounds).toHaveLength(1);

    const roundTwo = negotiateExtension(player, team, lowball, new GameRNG(88), roundOne.session);
    expect(roundTwo.rounds).toHaveLength(2);

    const roundThree = negotiateExtension(player, team, lowball, new GameRNG(88), roundTwo.session);
    expect(roundThree.status).toBe('rejected');
    expect(roundThree.rounds).toHaveLength(3);
  });
});

describe('processTeamExtensions', () => {
  it('prioritizes near-free-agency stars ahead of fringe depth players', () => {
    const franchiseStar = {
      ...setHitterRatings(makePlayer(41), 410),
      age: 29,
      developmentTrajectory: 'on_track' as const,
    };
    const youngCore = {
      ...setHitterRatings(makePlayer(42), 370),
      age: 25,
      developmentTrajectory: 'ahead_of_curve' as const,
    };
    const fringe = {
      ...setHitterRatings(makePlayer(43), 210),
      age: 31,
      developmentTrajectory: 'below_expectations' as const,
    };

    const team = createTeamContext();
    team.controlYearsByPlayer.set(franchiseStar.id, 1);
    team.controlYearsByPlayer.set(youngCore.id, 4);
    team.controlYearsByPlayer.set(fringe.id, 1);
    team.serviceYearsByPlayer.set(franchiseStar.id, 5);
    team.serviceYearsByPlayer.set(youngCore.id, 2);
    team.serviceYearsByPlayer.set(fringe.id, 6);
    team.moraleByPlayer.set(franchiseStar.id, 72);
    team.moraleByPlayer.set(youngCore.id, 66);
    team.moraleByPlayer.set(fringe.id, 40);

    const result = processTeamExtensions(team, [franchiseStar, youngCore, fringe], new GameRNG(101));

    expect(result.results.some((entry) => entry.playerId === franchiseStar.id)).toBe(true);
    expect(result.results.some((entry) => entry.playerId === fringe.id)).toBe(false);
  });

  it('aggressively targets young franchise players with multiple control years and skips declining veterans', () => {
    const franchiseCornerstone = {
      ...setHitterRatings(makePlayer(44), 405),
      age: 26,
      developmentTrajectory: 'ahead_of_curve' as const,
      contract: {
        ...makePlayer(44).contract,
        years: 3,
        annualSalary: 12,
        totalValue: 36,
      },
    };
    const decliningVeteran = {
      ...setHitterRatings(makePlayer(45), 305),
      age: 35,
      developmentTrajectory: 'below_expectations' as const,
      contract: {
        ...makePlayer(45).contract,
        years: 1,
        annualSalary: 14,
        totalValue: 14,
      },
    };
    const journeyman = {
      ...setHitterRatings(makePlayer(46), 240),
      age: 31,
      developmentTrajectory: 'on_track' as const,
    };

    const team = createTeamContext();
    team.controlYearsByPlayer.set(franchiseCornerstone.id, 3);
    team.controlYearsByPlayer.set(decliningVeteran.id, 1);
    team.controlYearsByPlayer.set(journeyman.id, 1);
    team.serviceYearsByPlayer.set(franchiseCornerstone.id, 3);
    team.serviceYearsByPlayer.set(decliningVeteran.id, 6);
    team.serviceYearsByPlayer.set(journeyman.id, 5);
    team.moraleByPlayer.set(franchiseCornerstone.id, 74);
    team.moraleByPlayer.set(decliningVeteran.id, 44);
    team.moraleByPlayer.set(journeyman.id, 52);

    const result = processTeamExtensions(
      team,
      [franchiseCornerstone, decliningVeteran, journeyman],
      new GameRNG(144),
    );

    expect(result.results.some((entry) => entry.playerId === franchiseCornerstone.id)).toBe(true);
    expect(result.results.some((entry) => entry.playerId === decliningVeteran.id)).toBe(false);
    expect(result.results.some((entry) => entry.playerId === journeyman.id)).toBe(false);
  });
});

describe('qualifying offers', () => {
  it('calculates the qualifying offer salary from the top 125 salaries', () => {
    const players = Array.from({ length: 130 }, (_, index) => {
      const player = setHitterRatings(makePlayer(100 + index), 320);
      return {
        ...player,
        contract: {
          ...player.contract,
          years: 1,
          annualSalary: index + 1,
          totalValue: index + 1,
        },
      };
    });

    expect(calculateQualifyingOfferSalary(players)).toBe(68);
  });

  it('returns only MLB expiring players that clear the service-time and value bar', () => {
    const eligible = setHitterRatings(makePlayer(201), 390);
    const tooCheap = {
      ...setHitterRatings(makePlayer(202), 40),
      age: 38,
    };
    const tooInexperienced = setHitterRatings(makePlayer(203), 390);
    const notExpiring = setHitterRatings(makePlayer(204), 390);
    notExpiring.contract.years = 3;

    const serviceTime = new Map<string, number>([
      [eligible.id, 4],
      [tooCheap.id, 6],
      [tooInexperienced.id, 2],
      [notExpiring.id, 5],
    ]);

    const candidates = getQualifyingOfferEligiblePlayers(
      [eligible, tooCheap, tooInexperienced, notExpiring],
      'nyy',
      serviceTime,
    );

    expect(candidates.map((player) => player.id)).toEqual([eligible.id]);
  });

  it('resolves qualifying-offer decisions deterministically from the same seed', () => {
    const player = {
      ...setHitterRatings(makePlayer(205), 340),
      age: 35,
    };
    const record = issueQualifyingOffer(player, 'nyy', 5, 21);

    const first = resolveQualifyingOffer(player, record, new GameRNG(303));
    const second = resolveQualifyingOffer(player, record, new GameRNG(303));

    expect(second).toEqual(first);
  });

  it('pushes aging rebound candidates toward acceptance and prime stars toward rejection', () => {
    const veteran = {
      ...setHitterRatings(makePlayer(206), 305),
      age: 36,
    };
    const star = {
      ...setHitterRatings(makePlayer(207), 430),
      age: 27,
      developmentTrajectory: 'ahead_of_curve' as const,
    };
    const veteranOffer = issueQualifyingOffer(veteran, 'nyy', 5, 21);
    const starOffer = issueQualifyingOffer(star, 'nyy', 5, 21);

    expect(resolveQualifyingOffer(veteran, veteranOffer, new GameRNG(404)).record.status).toBe('accepted');
    expect(resolveQualifyingOffer(star, starOffer, new GameRNG(404)).record.status).toBe('rejected');
  });

  it('issues QOs to premium free agents and skips brittle older bets', () => {
    const star = {
      ...setHitterRatings(makePlayer(208), 420),
      age: 28,
      contract: {
        ...makePlayer(208).contract,
        years: 1,
        annualSalary: 18,
        totalValue: 18,
      },
    };
    const brittleVeteran = {
      ...setHitterRatings(makePlayer(209), 315),
      age: 36,
      hitterAttributes: {
        contact: 315,
        power: 315,
        eye: 315,
        speed: 180,
        defense: 180,
        durability: 180,
      },
      contract: {
        ...makePlayer(209).contract,
        years: 1,
        annualSalary: 17,
        totalValue: 17,
      },
      developmentTrajectory: 'below_expectations' as const,
    };

    expect(shouldIssueQualifyingOffer(star, 21)).toBe(true);
    expect(shouldIssueQualifyingOffer(brittleVeteran, 21)).toBe(false);
  });
});
