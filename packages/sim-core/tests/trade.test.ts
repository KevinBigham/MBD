import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateTeamRoster,
  evaluatePlayerTradeValue,
  comparePackages,
  assignGMPersonality,
  evaluateTradeProposal,
  executeTrade,
  generateAITradeOffers,
  generateTradeId,
} from '../src/index.js';
import type { TradeProposal, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(seed: number, teamId: string = 'NYY'): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(rng, 'SS', teamId, 'MLB');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('evaluatePlayerTradeValue', () => {
  it('returns value with all dimensions', () => {
    const player = makePlayer(42);
    const value = evaluatePlayerTradeValue(player);
    expect(value.playerId).toBe(player.id);
    expect(typeof value.overall).toBe('number');
    expect(value.overall).toBeGreaterThanOrEqual(0);
    expect(value.overall).toBeLessThanOrEqual(100);
    expect(value.dimensions.currentAbility).toBeGreaterThanOrEqual(0);
    expect(value.dimensions.futureValue).toBeGreaterThanOrEqual(0);
    expect(value.dimensions.contractValue).toBeGreaterThanOrEqual(0);
    expect(value.dimensions.positionalScarcity).toBeGreaterThanOrEqual(0);
    expect(value.dimensions.durability).toBeGreaterThanOrEqual(0);
  });

  it('returns higher value for better players', () => {
    const player1 = makePlayer(42);
    const player2 = makePlayer(43);
    const lowRated = { ...player1, overallRating: 100 };
    const highRated = {
      ...player2,
      age: 26,
      hitterAttributes: {
        contact: 400, power: 400, eye: 400, speed: 350, defense: 350, durability: 400,
      },
    };
    const lowValue = evaluatePlayerTradeValue(lowRated);
    const highValue = evaluatePlayerTradeValue(highRated);
    expect(highValue.overall).toBeGreaterThan(lowValue.overall);
  });
});

describe('comparePackages', () => {
  it('returns fairness score between -100 and 100', () => {
    const player1 = makePlayer(42, 'NYY');
    const player2 = makePlayer(43, 'BOS');
    const result = comparePackages([player1], [player2]);
    expect(result.fairness).toBeGreaterThanOrEqual(-100);
    expect(result.fairness).toBeLessThanOrEqual(100);
    expect(typeof result.offerValue).toBe('number');
    expect(typeof result.requestValue).toBe('number');
  });
});

describe('assignGMPersonality', () => {
  it('returns a valid GM personality', () => {
    const rng = new GameRNG(42);
    const personality = assignGMPersonality(rng, 'NYY');
    const validPersonalities = ['aggressive', 'conservative', 'analytical', 'prospect_hugger', 'win_now'];
    expect(validPersonalities).toContain(personality);
  });
});

describe('evaluateTradeProposal', () => {
  it('returns a valid decision', () => {
    const rng1 = new GameRNG(42);
    const nyyRoster = generateTeamRoster(rng1, 'NYY');
    const rng2 = new GameRNG(99);
    const bosRoster = generateTeamRoster(rng2, 'BOS');

    const nyyMLB = nyyRoster.filter((p) => p.rosterStatus === 'MLB');
    const bosMLB = bosRoster.filter((p) => p.rosterStatus === 'MLB');

    const proposal: TradeProposal = {
      id: 'test-trade-1',
      fromTeamId: 'NYY',
      toTeamId: 'BOS',
      playersOffered: [nyyMLB[0]!.id],
      playersRequested: [bosMLB[0]!.id],
      status: 'proposed',
      reason: 'Test trade',
    };

    const rng3 = new GameRNG(200);
    const result = evaluateTradeProposal(
      rng3, proposal, nyyMLB, bosMLB, 'analytical', false,
    );
    expect(['accepted', 'rejected', 'countered']).toContain(result.decision);
    expect(result.reason.length).toBeGreaterThan(0);
  });

  it('rejects trade requests built around protected top prospects', () => {
    const rental = {
      ...makePlayer(2001, 'NYY'),
      age: 31,
      contract: {
        ...makePlayer(2001, 'NYY').contract,
        years: 1,
        annualSalary: 15,
        totalValue: 15,
      },
    };
    const protectedProspect = {
      ...makePlayer(2002, 'BOS'),
      age: 21,
      rosterStatus: 'AAA' as const,
      minorLeagueLevel: 'AAA' as const,
      potentialRating: 390,
      overallRating: 305,
    };

    const proposal: TradeProposal = {
      id: 'top-prospect-test',
      fromTeamId: 'NYY',
      toTeamId: 'BOS',
      playersOffered: [rental.id],
      playersRequested: [protectedProspect.id],
      status: 'proposed',
      reason: 'Deadline deal',
    };

    const result = evaluateTradeProposal(
      new GameRNG(2003),
      proposal,
      [rental],
      [protectedProspect],
      'analytical',
      true,
    );

    expect(result.decision).toBe('rejected');
  });
});

describe('generateAITradeOffers', () => {
  it('keeps protected prospects out of contender offer packages', () => {
    const protectedProspect = {
      ...makePlayer(3001, 'NYY'),
      age: 20,
      position: 'SS' as const,
      rosterStatus: 'AAA' as const,
      minorLeagueLevel: 'AAA' as const,
      potentialRating: 385,
      overallRating: 300,
    };
    const weakStarter = {
      ...makePlayer(3002, 'NYY'),
      position: 'SS' as const,
      overallRating: 205,
    };
    const tradeChip = {
      ...makePlayer(3003, 'NYY'),
      position: 'RF' as const,
      overallRating: 325,
      age: 29,
    };
    const target = {
      ...makePlayer(3004, 'BOS'),
      position: 'SS' as const,
      overallRating: 360,
      age: 28,
      contract: {
        ...makePlayer(3004, 'BOS').contract,
        years: 1,
        annualSalary: 17,
        totalValue: 17,
      },
    };

    const proposals = generateAITradeOffers(
      new GameRNG(3005),
      'NYY',
      [weakStarter, tradeChip, protectedProspect],
      [weakStarter, tradeChip, protectedProspect, target],
      'win_now',
      true,
      {
        currentDay: 110,
        contenderTeamIds: ['NYY', 'BOS'],
      },
    );

    expect(proposals.some((proposal) => proposal.playersOffered.includes(protectedProspect.id))).toBe(false);
  });

  it('lets non-contenders shop rentals for future value at the deadline', () => {
    const rentalStarter = {
      ...makePlayer(3011, 'OAK'),
      position: 'SP' as const,
      age: 31,
      overallRating: 338,
      contract: {
        ...makePlayer(3011, 'OAK').contract,
        years: 1,
        annualSalary: 14,
        totalValue: 14,
      },
    };
    const buyerProspect = {
      ...makePlayer(3012, 'BOS'),
      age: 22,
      position: 'SP' as const,
      rosterStatus: 'AAA' as const,
      minorLeagueLevel: 'AAA' as const,
      potentialRating: 315,
      overallRating: 248,
    };
    const buyerStarter = {
      ...makePlayer(3013, 'BOS'),
      position: 'SP' as const,
      overallRating: 240,
      age: 30,
    };

    const proposals = generateAITradeOffers(
      new GameRNG(3014),
      'OAK',
      [rentalStarter],
      [rentalStarter, buyerProspect, buyerStarter],
      'analytical',
      false,
      {
        currentDay: 112,
        contenderTeamIds: ['BOS'],
      },
    );

    expect(proposals.length).toBeGreaterThan(0);
    expect(proposals[0]?.fromTeamId).toBe('OAK');
    expect(proposals[0]?.toTeamId).toBe('BOS');
    expect(proposals[0]?.playersOffered).toContain(rentalStarter.id);
    expect(proposals[0]?.playersRequested).toContain(buyerProspect.id);
  });
});

describe('executeTrade', () => {
  it('moves players between teams', () => {
    const player1 = makePlayer(42, 'NYY');
    const player2 = makePlayer(43, 'BOS');
    const allPlayers = [player1, player2];

    const proposal: TradeProposal = {
      id: 'test-trade-2',
      fromTeamId: 'NYY',
      toTeamId: 'BOS',
      playersOffered: [player1.id],
      playersRequested: [player2.id],
      status: 'accepted',
      reason: 'Executed trade',
    };

    const result = executeTrade(proposal, allPlayers);
    expect(result.executed).toBe(true);
    expect(result.playersMoved.length).toBe(2);
    // player1 should now be on BOS
    expect(allPlayers.find((p) => p.id === player1.id)!.teamId).toBe('BOS');
    // player2 should now be on NYY
    expect(allPlayers.find((p) => p.id === player2.id)!.teamId).toBe('NYY');
  });
});

describe('generateTradeId', () => {
  it('returns unique strings', () => {
    const rng = new GameRNG(42);
    const id1 = generateTradeId(rng);
    const id2 = generateTradeId(rng);
    expect(typeof id1).toBe('string');
    expect(id1.startsWith('trade-')).toBe(true);
    expect(id1).not.toBe(id2);
  });
});
