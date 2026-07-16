import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateTeamRoster,
  calculateMarketValue,
  getDemandLevel,
  createFreeAgencyMarket,
  generateAIOffer,
  makeUserOffer,
  projectContractYears,
  simulateFADay,
  getTopFreeAgents,
  simulateFullFreeAgency,
} from '../src/index.js';
import type { FreeAgencyOfferAcceptanceReceipt, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(seed: number, position: string = 'SS'): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(rng, position as any, 'NYT', 'MLB');
}

function makeExpiringPlayer(seed: number): GeneratedPlayer {
  const player = makePlayer(seed);
  return { ...player, contract: { ...player.contract, years: 0 } };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('calculateMarketValue', () => {
  it('returns positive value for a good player', () => {
    const player = makePlayer(42);
    const value = calculateMarketValue(player);
    expect(value).toBeGreaterThan(0);
  });

  it('returns higher value for better-rated players', () => {
    const player1 = makePlayer(42);
    const player2 = makePlayer(43);
    const low = {
      ...player1,
      hitterAttributes: {
        contact: 100, power: 100, eye: 100, speed: 100, defense: 100, durability: 100,
      },
    };
    const high = {
      ...player2,
      age: 27,
      hitterAttributes: {
        contact: 400, power: 400, eye: 400, speed: 400, defense: 400, durability: 400,
      },
    };
    expect(calculateMarketValue(high)).toBeGreaterThan(calculateMarketValue(low));
  });
});

describe('getDemandLevel', () => {
  it('returns correct tier for various market values', () => {
    expect(getDemandLevel(30)).toBe('elite');
    expect(getDemandLevel(20)).toBe('high');
    expect(getDemandLevel(10)).toBe('moderate');
    expect(getDemandLevel(4)).toBe('low');
    expect(getDemandLevel(1)).toBe('fringe');
  });
});

describe('createFreeAgencyMarket', () => {
  it('creates market with free agents from expiring contracts', () => {
    const players = [
      makeExpiringPlayer(1),
      makeExpiringPlayer(2),
      makeExpiringPlayer(3),
      makePlayer(4), // Not expiring
    ];
    const market = createFreeAgencyMarket(1, players);
    expect(market.season).toBe(1);
    expect(market.freeAgents.length).toBe(3);
    expect(market.day).toBe(0);
    // All free agents should have a market value
    for (const fa of market.freeAgents) {
      expect(fa.marketValue).toBeGreaterThan(0);
      expect(fa.signedWith).toBeNull();
    }
  });
});

describe('projectContractYears', () => {
  it('returns reasonable years for various player profiles', () => {
    const rng = new GameRNG(42);
    const youngStar = makePlayer(42);
    const youngStarProfile = {
      ...youngStar,
      age: 26,
      hitterAttributes: {
        contact: 450, power: 450, eye: 400, speed: 350, defense: 350, durability: 400,
      },
    };
    const years = projectContractYears(rng, youngStarProfile);
    expect(years).toBeGreaterThanOrEqual(1);
    expect(years).toBeLessThanOrEqual(10);
  });

  it('returns shorter deals for older players', () => {
    const youngYears: number[] = [];
    const oldYears: number[] = [];
    for (let seed = 1; seed <= 20; seed++) {
      const rng1 = new GameRNG(seed + 1000);
      const rng2 = new GameRNG(seed + 2000);
      const young = { ...makePlayer(seed), age: 26 };
      const old = { ...makePlayer(seed), age: 36 };
      youngYears.push(projectContractYears(rng1, young));
      oldYears.push(projectContractYears(rng2, old));
    }
    const avgYoung = youngYears.reduce((a, b) => a + b, 0) / youngYears.length;
    const avgOld = oldYears.reduce((a, b) => a + b, 0) / oldYears.length;
    expect(avgYoung).toBeGreaterThan(avgOld);
  });
});

describe('getTopFreeAgents', () => {
  it('returns sorted list by market value', () => {
    const players = Array.from({ length: 10 }, (_, i) => makeExpiringPlayer(i + 100));
    const market = createFreeAgencyMarket(1, players);
    const top = getTopFreeAgents(market, undefined, 5);
    expect(top.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1]!.marketValue).toBeGreaterThanOrEqual(top[i]!.marketValue);
    }
  });

  it('filters by position when specified', () => {
    const players = [
      { ...makeExpiringPlayer(1), position: 'SP' as const },
      { ...makeExpiringPlayer(2), position: 'SS' as const },
      { ...makeExpiringPlayer(3), position: 'SP' as const },
    ];
    const market = createFreeAgencyMarket(1, players);
    const spAgents = getTopFreeAgents(market, 'SP');
    for (const fa of spAgents) {
      expect(fa.player.position).toBe('SP');
    }
  });
});

describe('simulateFullFreeAgency', () => {
  it('is deterministic for the same market, budgets, and team needs', () => {
    const players = [
      { ...makeExpiringPlayer(201), teamId: '' },
      { ...makeExpiringPlayer(202), teamId: '' },
    ];
    const market = createFreeAgencyMarket(1, players);
    const budgets = new Map([
      ['bos', 220],
      ['cha', 5],
    ]);
    const payrolls = new Map([
      ['bos', 20],
      ['cha', 4.8],
    ]);
    const needs = new Map([
      ['bos', new Map([['SS', 95]])],
      ['cha', new Map([['SS', 10]])],
    ]);

    const slots = new Map([['bos', 10], ['cha', 10]]);
    const first = simulateFullFreeAgency(new GameRNG(999), market, budgets, new Map(payrolls), needs, slots, 'nym');
    const second = simulateFullFreeAgency(new GameRNG(999), market, budgets, new Map(payrolls), needs, slots, 'nym');

    expect(second).toEqual(first);
    expect(first.day).toBe(60);
    expect(first.freeAgents).toEqual([]);
    expect(first.signedPlayers[0]?.signedWith).toBe('bos');
    expect(first.signedPlayers[0]?.contract).toBeTruthy();
  });

  it('does not mutate the supplied payroll map when user offers are applied', () => {
    const player = { ...makeExpiringPlayer(203), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    const freeAgent = market.freeAgents[0]!;
    const budgets = new Map([
      ['nym', 220],
      ['bos', 200],
    ]);
    const payrolls = new Map([
      ['nym', 20],
      ['bos', 25],
    ]);
    const needs = new Map([
      ['nym', new Map([[player.position, 90]])],
      ['bos', new Map([[player.position, 80]])],
    ]);
    const payrollSnapshot = Array.from(payrolls.entries());
    const offer = {
      teamId: 'nym',
      playerId: freeAgent.player.id,
      years: 4,
      annualSalary: Number((freeAgent.marketValue + 2).toFixed(2)),
      totalValue: Number(((freeAgent.marketValue + 2) * 4).toFixed(2)),
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
      signingBonus: 0,
    };

    simulateFullFreeAgency(
      new GameRNG(1001),
      market,
      budgets,
      payrolls,
      needs,
      new Map([['nym', 1], ['bos', 10]]),
      'nym',
      [offer],
    );

    expect(Array.from(payrolls.entries())).toEqual(payrollSnapshot);
  });
});

describe('makeUserOffer', () => {
  it('uses the shared bounded evaluator for a factual clubhouse discount', () => {
    const player = { ...makeExpiringPlayer(210), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    const freeAgent = market.freeAgents[0]!;

    const result = makeUserOffer(market, {
      teamId: 'nym',
      playerId: freeAgent.player.id,
      years: 4,
      annualSalary: Number((freeAgent.marketValue * 0.88).toFixed(2)),
      totalValue: Number((freeAgent.marketValue * 0.88).toFixed(2)),
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
      signingBonus: 0,
    }, {
      teamNeed: 0,
      contenderStatus: 'unknown',
      tenureSeasons: 0,
      homegrownBond: 0,
      clubhouseScore: 100,
    });

    expect(result.accepted).toBe(true);
    expect(result.decision?.primaryPreference).toBe('clubhouse');
    expect(result.reason).toMatch(/chemistry and front-office reputation/i);
  });
});

describe('simulateFADay', () => {
  it('returns byte-equal player decisions for CPU and user offers with identical facts', () => {
    const player = { ...makeExpiringPlayer(259), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const context = {
      teamNeed: 82,
      contenderStatus: 'playoff' as const,
      tenureSeasons: 2,
      homegrownBond: 0.4,
      clubhouseScore: 73,
    };
    let acceptedOffer: Parameters<typeof makeUserOffer>[1] | null = null;
    let cpuDecision: ReturnType<typeof makeUserOffer>['decision'] = undefined;

    simulateFADay(
      new GameRNG(259),
      market,
      new Map([['por', 300]]),
      new Map([['por', 60]]),
      new Map([['por', new Map([[player.position, context.teamNeed]])]]),
      new Map([['por', 1]]),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      () => true,
      (offer, decision) => {
        acceptedOffer = offer;
        cpuDecision = decision;
      },
      () => context,
    );

    expect(acceptedOffer).not.toBeNull();
    const userDecision = makeUserOffer(market, acceptedOffer!, context).decision;
    expect(userDecision).toEqual(cpuDecision);
  });

  it('raises an affordable CPU bid to the shared player acceptance floor', () => {
    const player = {
      ...makeExpiringPlayer(2590),
      teamId: '',
      age: 30,
      hitterAttributes: {
        contact: 250,
        power: 250,
        eye: 250,
        speed: 250,
        defense: 250,
        durability: 250,
      },
    };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const context = {
      teamNeed: 0,
      contenderStatus: 'unknown' as const,
      tenureSeasons: 0,
      homegrownBond: 0,
      clubhouseScore: 0,
    };
    const initialOffer = generateAIOffer(
      new GameRNG(2590),
      'por',
      player,
      140,
      0,
      80,
      undefined,
      'budget_constrained',
    );
    expect(initialOffer).not.toBeNull();
    expect(makeUserOffer(market, initialOffer!, context).accepted).toBe(false);

    let acceptedOffer: Parameters<typeof makeUserOffer>[1] | null = null;
    let acceptanceReceipt: FreeAgencyOfferAcceptanceReceipt | null = null;
    const next = simulateFADay(
      new GameRNG(2590),
      market,
      new Map([['por', 140]]),
      new Map([['por', 0]]),
      new Map([['por', new Map([[player.position, 80]])]]),
      new Map([['por', 1]]),
      new Map(),
      new Map(),
      new Map(),
      new Map([['por', 'budget_constrained']]),
      () => true,
      (offer, _decision, receipt) => {
        acceptedOffer = offer;
        acceptanceReceipt = receipt;
      },
      () => context,
    );

    expect(next.signedPlayers).toHaveLength(1);
    expect(acceptedOffer).not.toBeNull();
    expect(acceptedOffer!.annualSalary).toBeGreaterThan(initialOffer!.annualSalary);
    expect(makeUserOffer(market, acceptedOffer!, context).accepted).toBe(true);
    expect(acceptedOffer!.signingBonus)
      .toBe(Math.round(acceptedOffer!.annualSalary * 0.1 * 100) / 100);
    expect(acceptanceReceipt!.payrollBeforeSigning + acceptedOffer!.annualSalary)
      .toBeLessThanOrEqual(acceptanceReceipt!.spendingLimit);
  });

  it('keeps a competition-inflated AI signing bonus at ten percent of repriced AAV', () => {
    const player = { ...makeExpiringPlayer(25901), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const teamIds = ['bos', 'por', 'sea'];

    const next = simulateFADay(
      new GameRNG(25901),
      market,
      new Map(teamIds.map((teamId) => [teamId, 300])),
      new Map(teamIds.map((teamId) => [teamId, 20])),
      new Map(teamIds.map((teamId) => [teamId, new Map([[player.position, 100]])])),
      new Map(teamIds.map((teamId) => [teamId, 1])),
    );

    expect(next.signedPlayers).toHaveLength(1);
    expect(next.signedPlayers[0]?.interestedTeams).toHaveLength(3);
    const contract = next.signedPlayers[0]!.contract!;
    expect(contract.signingBonus)
      .toBe(Math.round(contract.annualSalary * 0.1 * 100) / 100);
  });

  it('uses a synchronously refreshed need for the next same-day free agent', () => {
    const players = [
      { ...makeExpiringPlayer(2591), teamId: '', position: 'C' as const },
      { ...makeExpiringPlayer(2592), teamId: '', position: 'C' as const },
    ];
    const market = createFreeAgencyMarket(1, players);
    market.day = 60;
    const teamNeeds = new Map([['por', new Map([['C', 90]])]]);
    const acceptedNeeds: number[] = [];

    const next = simulateFADay(
      new GameRNG(2591),
      market,
      new Map([['por', 400]]),
      new Map([['por', 20]]),
      teamNeeds,
      new Map([['por', 2]]),
      new Map(),
      new Map(),
      new Map(),
      new Map(),
      () => true,
      (_offer, decision) => {
        acceptedNeeds.push(decision.context.teamNeed);
        teamNeeds.set('por', new Map([['C', 50]]));
      },
      (_teamId, _playerId, teamNeed) => ({
        teamNeed,
        contenderStatus: 'unknown',
        tenureSeasons: 0,
        homegrownBond: 0,
        clubhouseScore: 50,
      }),
    );

    expect(next.signedPlayers).toHaveLength(2);
    expect(acceptedNeeds).toEqual([90, 50]);
  });

  it('lets a favored club win a comparable market through per-player attractiveness', () => {
    const player = { ...makeExpiringPlayer(260), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    let acceptanceReceipt: FreeAgencyOfferAcceptanceReceipt | null = null;
    const next = simulateFADay(
      new GameRNG(260),
      market,
      new Map([['por', 200], ['bos', 200]]),
      new Map([['por', 90], ['bos', 90]]),
      new Map([
        ['por', new Map([[player.position, 80]])],
        ['bos', new Map([[player.position, 80]])],
      ]),
      new Map([['por', 1], ['bos', 1]]),
      (teamId, playerId) => (teamId === 'por' && playerId === player.id ? 78 : 55),
      new Map(),
      new Map(),
      new Map(),
      () => true,
      (_offer, _decision, receipt) => {
        acceptanceReceipt = receipt;
      },
      (teamId, playerId, teamNeed) => ({
        teamNeed,
        contenderStatus: teamId === 'por' && playerId === player.id ? 'champion' : 'unknown',
        tenureSeasons: teamId === 'por' ? 5 : 0,
        homegrownBond: teamId === 'por' ? 1 : 0,
        clubhouseScore: teamId === 'por' ? 100 : 0,
      }),
    );

    expect(next.signedPlayers[0]?.signedWith).toBe('por');
    expect(acceptanceReceipt).not.toBeNull();
    expect(acceptanceReceipt!.payrollBeforeSigning
      + next.signedPlayers[0]!.contract!.annualSalary).toBeLessThanOrEqual(
      acceptanceReceipt!.spendingLimit,
    );
  });

  it('does not admit an AI signing for a team with no MLB slots', () => {
    const player = { ...makeExpiringPlayer(261), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const slots = new Map([['por', 0]]);

    const next = simulateFADay(
      new GameRNG(261), market,
      new Map([['por', 200]]), new Map([['por', 90]]),
      new Map([['por', new Map([[player.position, 100]])]]), slots,
    );

    expect(next.signedPlayers).toHaveLength(0);
    expect(next.freeAgents.map((entry) => entry.player.id)).toEqual([player.id]);
    expect(Array.from(slots.entries())).toEqual([['por', 0]]);
  });

  it('consumes one slot synchronously and keeps the second otherwise-signable player available', () => {
    const players = [
      { ...makeExpiringPlayer(262), teamId: '' },
      { ...makeExpiringPlayer(263), teamId: '' },
    ];
    const market = createFreeAgencyMarket(1, players);
    market.day = 54;
    for (const freeAgent of market.freeAgents) freeAgent.demandLevel = 'low';
    const slots = new Map([['por', 1]]);

    const next = simulateFADay(
      new GameRNG(262), market,
      new Map([['por', 200]]), new Map([['por', 90]]),
      new Map([['por', new Map([[players[0]!.position, 100]])]]), slots,
    );

    expect(next.signedPlayers).toHaveLength(1);
    expect(next.signedPlayers[0]?.signedWith).toBe('por');
    expect(next.freeAgents).toHaveLength(1);
    expect(Array.from(slots.entries())).toEqual([['por', 1]]);
  });

  it('keeps forced-branch players available when every destination has zero slots', () => {
    const player = { ...makeExpiringPlayer(264), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 60;

    const next = simulateFADay(
      new GameRNG(264), market,
      new Map([['por', 200]]), new Map([['por', 90]]),
      new Map([['por', new Map([[player.position, 100]])]]), new Map([['por', 0]]),
    );

    expect(next.signedPlayers).toHaveLength(0);
    expect(next.freeAgents.map((entry) => entry.player.id)).toEqual([player.id]);
  });

  it('keeps a forced fallback available when the only destination cannot afford the minimum deal', () => {
    const player = { ...makeExpiringPlayer(2641), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 60;

    const next = simulateFADay(
      new GameRNG(2641), market,
      new Map([['por', 100]]), new Map([['por', 83.5]]),
      new Map([['por', new Map([[player.position, 100]])]]), new Map([['por', 1]]),
    );

    expect(next.signedPlayers).toHaveLength(0);
    expect(next.freeAgents.map((entry) => entry.player.id)).toEqual([player.id]);
  });

  it('is deterministic for equal capacity inputs without mutating either capacity map', () => {
    const player = { ...makeExpiringPlayer(265), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const firstSlots = new Map([['por', 1]]);
    const secondSlots = new Map([['por', 1]]);
    const args = [
      new Map([['por', 200]]), new Map([['por', 90]]),
      new Map([['por', new Map([[player.position, 100]])]]),
    ] as const;

    const first = simulateFADay(new GameRNG(265), market, ...args, firstSlots);
    const second = simulateFADay(new GameRNG(265), market, ...args, secondSlots);

    expect(second).toEqual(first);
    expect(Array.from(firstSlots.entries())).toEqual([['por', 1]]);
    expect(Array.from(secondSlots.entries())).toEqual([['por', 1]]);
  });

  it('excludes an ineligible bidder before RNG-backed offer generation and lets an eligible club sign', () => {
    const player = { ...makeExpiringPlayer(266), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const eligibilityCalls: string[] = [];
    const budgets = new Map([['por', 200], ['bos', 200]]);
    const payrolls = new Map([['por', 90], ['bos', 90]]);
    const needs = new Map([
      ['por', new Map([[player.position, 100]])],
      ['bos', new Map([[player.position, 100]])],
    ]);
    const slots = new Map([['por', 1], ['bos', 1]]);
    const attractiveness = (teamId: string) => teamId === 'por' ? 100 : 0;
    const unfiltered = simulateFADay(
      new GameRNG(266),
      market,
      budgets,
      payrolls,
      needs,
      slots,
      attractiveness,
    );

    const next = simulateFADay(
      new GameRNG(266),
      market,
      budgets,
      payrolls,
      needs,
      slots,
      attractiveness,
      new Map(),
      new Map(),
      new Map(),
      (teamId, playerId) => {
        eligibilityCalls.push(`${teamId}:${playerId}`);
        return teamId !== 'por';
      },
    );

    expect(unfiltered.signedPlayers[0]?.signedWith).toBe('por');
    expect(eligibilityCalls).toEqual([`bos:${player.id}`, `por:${player.id}`]);
    expect(next.signedPlayers).toHaveLength(1);
    expect(next.signedPlayers[0]?.signedWith).toBe('bos');
    expect(next.signedPlayers[0]?.interestedTeams).toEqual(['bos']);
  });

  it('applies accepted-offer reservations before admitting another same-day bidder', () => {
    const players = [
      { ...makeExpiringPlayer(267), teamId: '' },
      { ...makeExpiringPlayer(268), teamId: '' },
    ];
    const market = createFreeAgencyMarket(1, players);
    market.day = 54;
    for (const freeAgent of market.freeAgents) freeAgent.demandLevel = 'low';
    let reservedTeamId: string | null = null;

    const next = simulateFADay(
      new GameRNG(267),
      market,
      new Map([['por', 300], ['bos', 300]]),
      new Map([['por', 80], ['bos', 80]]),
      new Map([
        ['por', new Map(players.map((player) => [player.position, 100]))],
        ['bos', new Map(players.map((player) => [player.position, 100]))],
      ]),
      new Map([['por', 2], ['bos', 2]]),
      (teamId) => teamId === 'por' ? 100 : 0,
      new Map(),
      new Map(),
      new Map(),
      (teamId) => teamId !== reservedTeamId,
      (offer) => {
        reservedTeamId ??= offer.teamId;
      },
    );

    expect(next.signedPlayers.map((entry) => entry.signedWith)).toEqual(['bos', 'por']);
    expect(reservedTeamId).toBe('bos');
  });

  it('is invariant to team map insertion order for equal seeded inputs', () => {
    const player = { ...makeExpiringPlayer(269), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const needs = new Map([
      ['por', new Map([[player.position, 80]])],
      ['bos', new Map([[player.position, 80]])],
    ]);

    const first = simulateFADay(
      new GameRNG(269),
      market,
      new Map([['por', 200], ['bos', 200]]),
      new Map([['por', 90], ['bos', 90]]),
      needs,
      new Map([['por', 1], ['bos', 1]]),
    );
    const second = simulateFADay(
      new GameRNG(269),
      market,
      new Map([['bos', 200], ['por', 200]]),
      new Map([['bos', 90], ['por', 90]]),
      new Map([...needs.entries()].reverse()),
      new Map([['bos', 1], ['por', 1]]),
    );

    expect(second).toEqual(first);
  });
});

describe('generateAIOffer', () => {
  it('stays out of low-need fits for conservative budgets', () => {
    const player = {
      ...makeExpiringPlayer(301),
      age: 31,
      overallRating: 275,
      hitterAttributes: {
        contact: 280,
        power: 265,
        eye: 250,
        speed: 180,
        defense: 210,
        durability: 240,
      },
    };

    const offer = generateAIOffer(
      new GameRNG(301),
      'por',
      player,
      125,
      92,
      18,
    );

    expect(offer).toBeNull();
  });

  it('still makes competitive offers for elite fits with budget support', () => {
    const player = {
      ...makeExpiringPlayer(302),
      age: 27,
      overallRating: 430,
      hitterAttributes: {
        contact: 420,
        power: 430,
        eye: 395,
        speed: 260,
        defense: 300,
        durability: 365,
      },
    };

    const offer = generateAIOffer(
      new GameRNG(302),
      'bos',
      player,
      240,
      128,
      92,
    );

    expect(offer).toBeTruthy();
    expect(offer?.annualSalary).toBeGreaterThan(20);
    expect(offer?.years).toBeGreaterThanOrEqual(4);
  });

  it('lets team-building identity separate win-now bidders from rebuilders', () => {
    const player = {
      ...makeExpiringPlayer(303),
      age: 29,
      overallRating: 335,
      hitterAttributes: {
        contact: 330,
        power: 320,
        eye: 305,
        speed: 210,
        defense: 285,
        durability: 330,
      },
    };

    const winNowOffer = generateAIOffer(
      new GameRNG(303),
      'bos',
      player,
      205,
      108,
      78,
      undefined,
      'win_now',
    );
    const rebuildingOffer = generateAIOffer(
      new GameRNG(303),
      'por',
      player,
      205,
      108,
      78,
      undefined,
      'rebuilding',
    );
    const constrainedOffer = generateAIOffer(
      new GameRNG(303),
      'cha',
      player,
      205,
      108,
      78,
      undefined,
      'budget_constrained',
    );

    expect(winNowOffer).toBeTruthy();
    expect(rebuildingOffer).toBeTruthy();
    expect(constrainedOffer).toBeTruthy();
    expect(winNowOffer!.annualSalary).toBeGreaterThan(rebuildingOffer!.annualSalary);
    expect(rebuildingOffer!.annualSalary).toBeGreaterThan(constrainedOffer!.annualSalary);
  });
});
