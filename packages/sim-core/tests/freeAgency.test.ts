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
import type { GeneratedPlayer } from '../src/index.js';

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

    const first = simulateFullFreeAgency(new GameRNG(999), market, budgets, new Map(payrolls), needs, 'nym');
    const second = simulateFullFreeAgency(new GameRNG(999), market, budgets, new Map(payrolls), needs, 'nym');

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
      'nym',
      [offer],
    );

    expect(Array.from(payrolls.entries())).toEqual(payrollSnapshot);
  });
});

describe('makeUserOffer', () => {
  it('lets a high-chemistry club land a slightly deeper discount', () => {
    const player = { ...makeExpiringPlayer(210), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    const freeAgent = market.freeAgents[0]!;

    const result = makeUserOffer(market, {
      teamId: 'nym',
      playerId: freeAgent.player.id,
      years: 4,
      annualSalary: Number((freeAgent.marketValue * 0.77).toFixed(2)),
      totalValue: Number((freeAgent.marketValue * 0.77 * 4).toFixed(2)),
      noTradeClause: false,
      playerOption: false,
      teamOption: false,
      signingBonus: 0,
    }, 82);

    expect(result.accepted).toBe(true);
    expect(result.reason).toMatch(/clubhouse fit/i);
  });
});

describe('simulateFADay', () => {
  it('lets a favored club win a comparable market through per-player attractiveness', () => {
    const player = { ...makeExpiringPlayer(260), teamId: '' };
    const market = createFreeAgencyMarket(1, [player]);
    market.day = 54;
    market.freeAgents[0]!.demandLevel = 'low';
    const next = simulateFADay(
      new GameRNG(260),
      market,
      new Map([['por', 200], ['bos', 200]]),
      new Map([['por', 90], ['bos', 90]]),
      new Map([
        ['por', new Map([[player.position, 80]])],
        ['bos', new Map([[player.position, 80]])],
      ]),
      (teamId, playerId) => (teamId === 'por' && playerId === player.id ? 78 : 55),
    );

    expect(next.signedPlayers[0]?.signedWith).toBe('por');
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
