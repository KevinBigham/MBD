import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  advanceContractForOffseason,
  calculatePlayerValue,
  calculateExtensionOffer,
  calculateQualifyingOfferSalary,
  evaluateExtensionWillingness,
  generateArbitrationCase,
  generatePlayer,
  getArbEligiblePlayers,
  getQualifyingOfferEligiblePlayers,
  issueQualifyingOffer,
  negotiateExtension,
  processTeamExtensions,
  qualifiesForSuperTwo,
  resolveQualifyingOffer,
  shouldIssueQualifyingOffer,
  type ExtensionTeamContext,
  type GeneratedPlayer,
} from '../src/index.js';

function makePlayer(seed: number, position: GeneratedPlayer['position'] = 'SS'): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, position, 'nym', 'MLB');
  return {
    ...player,
    rosterStatus: 'MLB',
    teamId: 'nym',
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
    teamId: 'nym',
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

describe('advanceContractForOffseason', () => {
  it('advances active contracts and expires one-year contracts without mutating input', () => {
    const active = { ...makePlayer(1), contract: { ...makePlayer(1).contract, years: 3 } };
    const expiring = { ...makePlayer(2), contract: { ...makePlayer(2).contract, years: 1 } };
    const activeBefore = structuredClone(active);
    const expiringBefore = structuredClone(expiring);

    expect(advanceContractForOffseason(active, 5)).toMatchObject({ previousYears: 3, nextYears: 2, outcome: 'advanced' });
    expect(advanceContractForOffseason(expiring, 5)).toMatchObject({ previousYears: 1, nextYears: 0, outcome: 'expired' });
    expect(active).toEqual(activeBefore);
    expect(expiring).toEqual(expiringBefore);
  });

  it('keeps zero-year contracts byte-identical and never creates negative years', () => {
    const zeroYear = { ...makePlayer(3), contract: { ...makePlayer(3).contract, years: 0 } };
    const result = advanceContractForOffseason(zeroYear, 6);

    expect(result).toEqual({ player: zeroYear, previousYears: 0, nextYears: 0, outcome: 'unchanged_zero' });
    expect(result.player).toBe(zeroYear);
    expect(result.nextYears).toBeGreaterThanOrEqual(0);
  });

  it('exercises a one-year team option at the equality boundary and consumes only that option', () => {
    const player = setHitterRatings(makePlayer(4), 300);
    const annualSalary = calculatePlayerValue(player, 5);
    const optionPlayer = {
      ...player,
      contract: {
        ...player.contract,
        years: 1,
        annualSalary,
        totalValue: 99,
        teamOption: true,
        playerOption: true,
        optOutYears: [2],
      },
    };

    const result = advanceContractForOffseason(optionPlayer, 5);
    expect(result).toMatchObject({ nextYears: 1, outcome: 'team_option_exercised' });
    expect(result.player.contract).toMatchObject({ teamOption: false, playerOption: true, totalValue: 99, optOutYears: [2] });
  });

  it('declines an underwater team option and uses the exact same automated rule for user and CPU players', () => {
    const player = setHitterRatings(makePlayer(5), 220);
    const contract = { ...player.contract, years: 1, annualSalary: 25, teamOption: true };
    const userPlayer = { ...player, teamId: 'nym', contract };
    const cpuPlayer = { ...player, teamId: 'bos', contract: { ...contract } };

    const userResult = advanceContractForOffseason(userPlayer, 6);
    const cpuResult = advanceContractForOffseason(cpuPlayer, 6);
    expect(userResult).toMatchObject({ nextYears: 0, outcome: 'team_option_declined' });
    expect(cpuResult).toMatchObject({ nextYears: 0, outcome: 'team_option_declined' });
    expect({ ...userResult.player, teamId: '' }).toEqual({ ...cpuResult.player, teamId: '' });
  });
});

describe('arbitration service authority', () => {
  it('uses exact credited MLB days instead of a contradictory legacy years map', () => {
    const eligible = { ...makePlayer(6), serviceTimeDays: 3 * 172 };
    const yearSix = { ...makePlayer(7), id: 'year-six', serviceTimeDays: 6 * 172 };
    const careerMinor = {
      ...makePlayer(8),
      id: 'career-minor',
      rosterStatus: 'AAA' as const,
      serviceTimeDays: 4 * 172,
    };
    const contradictory = new Map<string, number>([
      [eligible.id, 1],
      [yearSix.id, 4],
      [careerMinor.id, 4],
    ]);

    expect(getArbEligiblePlayers([eligible, yearSix, careerMinor], 'nym', contradictory)
      .map((player) => player.id)).toEqual([eligible.id]);
  });

  it('ranks only active assigned MLB players in the deterministic Super Two cohort', () => {
    const target = { ...makePlayer(9), id: 'b-target', serviceTimeDays: (2 * 172) + 120 };
    const leader = { ...makePlayer(10), id: 'a-leader', serviceTimeDays: (2 * 172) + 130 };
    const freeAgent = {
      ...makePlayer(11),
      id: 'free-agent',
      teamId: '',
      rosterStatus: 'FREE_AGENT' as const,
      serviceTimeDays: (2 * 172) + 171,
    };
    const minor = {
      ...makePlayer(12),
      id: 'minor',
      rosterStatus: 'AAA' as const,
      serviceTimeDays: (2 * 172) + 170,
    };

    const cohort = [target, leader, freeAgent, minor];
    expect(qualifiesForSuperTwo(leader, cohort)).toBe(true);
    expect(qualifiesForSuperTwo(target, cohort)).toBe(false);
    expect(qualifiesForSuperTwo(freeAgent, cohort)).toBe(false);
    expect(qualifiesForSuperTwo(minor, cohort)).toBe(false);
  });

  it('never files below the prior salary', () => {
    const player = setHitterRatings(makePlayer(13), 120);
    const arbitrationCase = generateArbitrationCase(
      new GameRNG(13),
      player,
      3,
      18.5,
    );

    expect(arbitrationCase.projectedSalary).toBeGreaterThanOrEqual(18.5);
    expect(arbitrationCase.teamOffer).toBeGreaterThanOrEqual(18.5);
    expect(arbitrationCase.playerAsk).toBeGreaterThanOrEqual(arbitrationCase.teamOffer);
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

  it('uses team-building identity to change extension priority and budget appetite', () => {
    const winNowStar = {
      ...setHitterRatings(makePlayer(47), 420),
      id: 'current-star',
      age: 31,
      developmentTrajectory: 'on_track' as const,
      contract: {
        ...makePlayer(47).contract,
        years: 1,
        annualSalary: 24,
        totalValue: 24,
      },
    };
    const youngCornerstone = {
      ...setHitterRatings(makePlayer(48), 360),
      id: 'young-cornerstone',
      age: 24,
      developmentTrajectory: 'ahead_of_curve' as const,
      contract: {
        ...makePlayer(48).contract,
        years: 3,
        annualSalary: 7,
        totalValue: 21,
      },
    };
    const bridgeVeteran = {
      ...setHitterRatings(makePlayer(49), 335),
      id: 'bridge-veteran',
      age: 33,
      developmentTrajectory: 'on_track' as const,
      contract: {
        ...makePlayer(49).contract,
        years: 1,
        annualSalary: 15,
        totalValue: 15,
      },
    };
    const players = [winNowStar, youngCornerstone, bridgeVeteran];
    const context = createTeamContext();
    context.controlYearsByPlayer.set(winNowStar.id, 1);
    context.controlYearsByPlayer.set(youngCornerstone.id, 3);
    context.controlYearsByPlayer.set(bridgeVeteran.id, 1);
    context.serviceYearsByPlayer.set(winNowStar.id, 6);
    context.serviceYearsByPlayer.set(youngCornerstone.id, 2);
    context.serviceYearsByPlayer.set(bridgeVeteran.id, 6);
    context.moraleByPlayer.set(winNowStar.id, 70);
    context.moraleByPlayer.set(youngCornerstone.id, 70);
    context.moraleByPlayer.set(bridgeVeteran.id, 64);

    const rebuilding = processTeamExtensions(
      { ...context, teamBuildingArchetype: 'rebuilding' },
      players,
      new GameRNG(147),
    );
    const winNow = processTeamExtensions(
      { ...context, teamBuildingArchetype: 'win_now' },
      players,
      new GameRNG(147),
    );
    const budgetConstrained = processTeamExtensions(
      { ...context, teamBuildingArchetype: 'budget_constrained' },
      players,
      new GameRNG(147),
    );

    expect(rebuilding.results[0]?.playerId).toBe(youngCornerstone.id);
    expect(winNow.results[0]?.playerId).toBe(winNowStar.id);
    expect(budgetConstrained.results).toHaveLength(1);
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
    eligible.contract.years = 0;
    tooCheap.contract.years = 0;
    tooInexperienced.contract.years = 0;
    notExpiring.contract.years = 3;

    const serviceTime = new Map<string, number>([
      [eligible.id, 4],
      [tooCheap.id, 6],
      [tooInexperienced.id, 2],
      [notExpiring.id, 5],
    ]);

    const candidates = getQualifyingOfferEligiblePlayers(
      [eligible, tooCheap, tooInexperienced, notExpiring],
      'nym',
      serviceTime,
    );

    expect(candidates.map((player) => player.id)).toEqual([eligible.id]);
  });

  it('resolves qualifying-offer decisions deterministically from the same seed', () => {
    const player = {
      ...setHitterRatings(makePlayer(205), 340),
      age: 35,
    };
    const record = issueQualifyingOffer(player, 'nym', 5, 21);

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
    const veteranOffer = issueQualifyingOffer(veteran, 'nym', 5, 21);
    const starOffer = issueQualifyingOffer(star, 'nym', 5, 21);

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
