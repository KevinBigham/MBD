import { describe, expect, it } from 'vitest';
import {
  addTradeMemory,
  calculateCounterOffer,
  createGameRNG,
  evaluatePlayerTradeValue,
  generateNegotiationDialogue,
  generatePlayer,
  getRelationship,
  initiateNegotiation,
  isNegotiationComplete,
  resolveNegotiation,
  advanceNegotiation,
  type CounterOffer,
  type GMPersonality,
  type GMRelationship,
  type GeneratedPlayer,
  type NegotiationContext,
  type NegotiationPhase,
  type NegotiationProposal,
  type NegotiationState,
} from '../src/index.js';

function makePlayer(
  seed: number,
  teamId: string,
  rosterStatus: GeneratedPlayer['rosterStatus'] = 'MLB',
  overrides: Partial<GeneratedPlayer> = {},
): GeneratedPlayer {
  const player = generatePlayer(createGameRNG(seed), 'SS', teamId, rosterStatus);
  const baseRating = overrides.overallRating ?? player.overallRating;
  const hitterValue = Math.max(80, Math.min(430, baseRating));

  return {
    ...player,
    ...overrides,
    teamId,
    rosterStatus,
    minorLeagueLevel: rosterStatus === 'MLB' ? null : rosterStatus,
    position: overrides.position ?? player.position,
    age: overrides.age ?? player.age,
    overallRating: baseRating,
    potentialRating: overrides.potentialRating ?? player.potentialRating ?? baseRating + 20,
    contract: {
      ...player.contract,
      annualSalary: overrides.contract?.annualSalary ?? player.contract.annualSalary,
      years: overrides.contract?.years ?? player.contract.years,
      totalValue: overrides.contract?.totalValue ?? player.contract.totalValue,
      noTradeClause: overrides.contract?.noTradeClause ?? false,
      playerOption: overrides.contract?.playerOption ?? false,
      teamOption: overrides.contract?.teamOption ?? false,
    },
    hitterAttributes: overrides.hitterAttributes ?? {
      contact: hitterValue,
      power: hitterValue,
      eye: hitterValue,
      speed: Math.max(60, hitterValue - 40),
      defense: Math.max(60, hitterValue - 30),
      durability: hitterValue,
    },
    pitcherAttributes: overrides.pitcherAttributes ?? null,
  };
}

function makeRelationship(score = 0): GMRelationship {
  return {
    targetTeamId: 'bos',
    score,
    tradeHistory: [],
    lastInteractionSeason: 3,
  };
}

function byTradeValue(players: GeneratedPlayer[]): GeneratedPlayer[] {
  return [...players].sort((left, right) =>
    evaluatePlayerTradeValue(left).overall - evaluatePlayerTradeValue(right).overall
    || left.id.localeCompare(right.id),
  );
}

function packageValue(players: GeneratedPlayer[]): number {
  return players.reduce((total, player) => total + evaluatePlayerTradeValue(player).overall, 0);
}

function ratio(offering: GeneratedPlayer[], requesting: GeneratedPlayer[]): number {
  return packageValue(offering) / Math.max(1, packageValue(requesting));
}

function actualGap(proposal: NegotiationProposal, context: NegotiationContext): number {
  const offering = context.fromTeamPlayers.filter((player) => proposal.offering.includes(player.id));
  const requesting = context.toTeamPlayers.filter((player) => proposal.requesting.includes(player.id));
  return ratio(offering, requesting);
}

function combinations<T>(items: T[], size: number): T[][] {
  if (size === 1) {
    return items.map((item) => [item]);
  }

  const results: T[][] = [];
  for (let index = 0; index <= items.length - size; index++) {
    const head = items[index]!;
    for (const tail of combinations(items.slice(index + 1), size - 1)) {
      results.push([head, ...tail]);
    }
  }
  return results;
}

function selectCandidates(players: GeneratedPlayer[]): GeneratedPlayer[] {
  const sorted = byTradeValue(players);
  const low = sorted.slice(0, 6);
  const middleStart = Math.max(0, Math.floor(sorted.length / 2) - 3);
  const middle = sorted.slice(middleStart, middleStart + 6);
  const high = sorted.slice(Math.max(0, sorted.length - 6));
  return [...new Map([...low, ...middle, ...high].map((player) => [player.id, player])).values()];
}

function findProposalInRange(
  userPlayers: GeneratedPlayer[],
  aiPlayers: GeneratedPlayer[],
  minGap: number,
  maxGap: number,
  options: {
    requestCount?: 1 | 2;
    offeringCount?: 1 | 2;
    includeRequestedIds?: string[];
  } = {},
): NegotiationProposal {
  const userCandidates = selectCandidates(userPlayers.filter((player) => player.teamId === 'nym'));
  const aiCandidates = selectCandidates(aiPlayers.filter((player) => player.teamId === 'bos'));

  const offeringCounts = options.offeringCount ? [options.offeringCount] : [1, 2];
  const requestCounts = options.requestCount ? [options.requestCount] : [1, 2];

  for (const offeringCount of offeringCounts) {
    for (const requestCount of requestCounts) {
      for (const offered of combinations(userCandidates, offeringCount)) {
        for (const requested of combinations(aiCandidates, requestCount)) {
          const requestedIds = requested.map((player) => player.id);
          if (options.includeRequestedIds && !options.includeRequestedIds.every((id) => requestedIds.includes(id))) {
            continue;
          }
          const gap = ratio(offered, requested);
          if (gap >= minGap && gap < maxGap) {
            return {
              fromTeamId: 'nym',
              toTeamId: 'bos',
              offering: offered.map((player) => player.id),
              requesting: requestedIds,
              valuationGap: 99,
            };
          }
        }
      }
    }
  }

  throw new Error(`Could not find proposal in range ${minGap}-${maxGap}`);
}

function findYoungProspect(players: GeneratedPlayer[]): GeneratedPlayer {
  const prospect = byTradeValue(
    players.filter((player) => player.teamId === 'bos' && player.rosterStatus !== 'MLB' && player.age < 25),
  )[0];
  if (!prospect) {
    throw new Error('Missing young AI prospect for negotiation tests');
  }
  return prospect;
}

function createFixture() {
  const userPlayers = [
    makePlayer(4101, 'nym', 'MLB', { id: 'nym-cheap', overallRating: 170, age: 30, contract: { annualSalary: 2, years: 1 } }),
    makePlayer(4102, 'nym', 'MLB', { id: 'nym-sweetener', overallRating: 210, age: 27, contract: { annualSalary: 3, years: 2 } }),
    makePlayer(4103, 'nym', 'MLB', { id: 'nym-mid', overallRating: 260, age: 26, contract: { annualSalary: 6, years: 3 } }),
    makePlayer(4104, 'nym', 'MLB', { id: 'nym-vet', overallRating: 320, age: 31, contract: { annualSalary: 11, years: 2 } }),
    makePlayer(4105, 'nym', 'MLB', { id: 'nym-star', overallRating: 390, age: 28, contract: { annualSalary: 20, years: 4 } }),
    makePlayer(4106, 'nym', 'AAA', { id: 'nym-prospect', overallRating: 245, age: 22, potentialRating: 360, contract: { annualSalary: 1, years: 5 } }),
  ];
  const aiPlayers = [
    makePlayer(4201, 'bos', 'MLB', { id: 'bos-depth', overallRating: 180, age: 30, contract: { annualSalary: 2, years: 1 } }),
    makePlayer(4202, 'bos', 'MLB', { id: 'bos-regular', overallRating: 250, age: 29, contract: { annualSalary: 6, years: 2 } }),
    makePlayer(4203, 'bos', 'MLB', { id: 'bos-good', overallRating: 300, age: 27, contract: { annualSalary: 9, years: 3 } }),
    makePlayer(4204, 'bos', 'MLB', { id: 'bos-star', overallRating: 380, age: 28, contract: { annualSalary: 18, years: 4 } }),
    makePlayer(4205, 'bos', 'AAA', { id: 'bos-prospect', overallRating: 255, age: 23, potentialRating: 370, contract: { annualSalary: 1, years: 5 } }),
    makePlayer(4206, 'bos', 'AA', { id: 'bos-young-prospect', overallRating: 235, age: 21, potentialRating: 385, contract: { annualSalary: 1, years: 6 } }),
  ];

  const context: NegotiationContext = {
    currentDay: 80,
    fromTeamPlayers: userPlayers,
    toTeamPlayers: aiPlayers,
  };

  return {
    context,
    userPlayers,
    aiPlayers,
    rejectProposal: findProposalInRange(userPlayers, aiPlayers, 0, 0.6),
    counterProposal: findProposalInRange(userPlayers, aiPlayers, 0.6, 0.9, { requestCount: 2 }),
    pendingProposal: findProposalInRange(userPlayers, aiPlayers, 0.9, 1.1),
    acceptProposal: findProposalInRange(userPlayers, aiPlayers, 1.1, Number.POSITIVE_INFINITY),
  };
}

function getCurrentCounter(state: NegotiationState): CounterOffer {
  const counter = state.counterOffers[state.counterOffers.length - 1];
  if (!counter) {
    throw new Error('Expected a counter offer');
  }
  return counter;
}

describe('trade negotiation', () => {
  const fixture = createFixture();

  it('rejects proposals below the rejection threshold', () => {
    const state = initiateNegotiation(
      createGameRNG(5001),
      fixture.rejectProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    expect(state.phase).toBe('rejected');
    expect(state.relationshipChange).toBe(-5);
  });

  it('counters proposals in the counter band', () => {
    const state = initiateNegotiation(
      createGameRNG(5002),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    expect(state.phase).toBe('counter_1');
    expect(state.counterOffers).toHaveLength(1);
  });

  it('marks proposals in the fair band as pending', () => {
    const state = initiateNegotiation(
      createGameRNG(5003),
      fixture.pendingProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    expect(state.phase).toBe('pending');
    expect(state.relationshipChange).toBe(2);
    expect(state.expiresAtDay).toBe(82);
  });

  it('accepts proposals above the acceptance threshold', () => {
    const state = initiateNegotiation(
      createGameRNG(5004),
      fixture.acceptProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    expect(state.phase).toBe('accepted');
    expect(state.relationshipChange).toBeGreaterThan(0);
  });

  it('recomputes valuation gap from real player values instead of trusting the caller', () => {
    const state = initiateNegotiation(
      createGameRNG(5005),
      {
        ...fixture.rejectProposal,
        valuationGap: 5,
      },
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    expect(state.proposal.valuationGap).toBeLessThan(0.6);
    expect(state.phase).toBe('rejected');
  });

  it('shifts thresholds up for hostile relationships', () => {
    const state = initiateNegotiation(
      createGameRNG(5006),
      fixture.pendingProposal,
      fixture.context,
      makeRelationship(-90),
      'conservative',
    );

    expect(state.phase).toBe('counter_1');
  });

  it('shifts thresholds down for trusted relationships', () => {
    const trustSensitiveProposal = findProposalInRange(
      fixture.userPlayers,
      fixture.aiPlayers,
      0.8,
      0.9,
    );
    const state = initiateNegotiation(
      createGameRNG(5007),
      trustSensitiveProposal,
      fixture.context,
      makeRelationship(90),
      'conservative',
    );

    expect(['pending', 'accepted']).toContain(state.phase);
  });

  it('adds the cheapest user sweetener that helps close the gap', () => {
    const result = calculateCounterOffer(
      createGameRNG(5008),
      fixture.counterProposal,
      fixture.context,
      'aggressive',
      makeRelationship(0),
    );

    const availableUser = byTradeValue(
      fixture.userPlayers.filter((player) => !fixture.counterProposal.offering.includes(player.id)),
    );

    expect(result.hasCounter).toBe(true);
    expect(result.counter?.addedByAI[0]).toBe(availableUser[0]?.id);
  });

  it('lets aggressive GMs remove fewer of their own players than conservative ones', () => {
    const aggressive = calculateCounterOffer(
      createGameRNG(5009),
      fixture.counterProposal,
      fixture.context,
      'aggressive',
      makeRelationship(0),
    );
    const conservative = calculateCounterOffer(
      createGameRNG(5010),
      fixture.counterProposal,
      fixture.context,
      'conservative',
      makeRelationship(0),
    );

    expect((aggressive.counter?.removedByAI.length ?? 0)).toBeLessThanOrEqual(conservative.counter?.removedByAI.length ?? 0);
  });

  it('prevents prospect_hugger counters from keeping their young prospects in the offer', () => {
    const youngProspect = findYoungProspect(fixture.aiPlayers);
    const prospectProposal = findProposalInRange(
      fixture.userPlayers,
      fixture.aiPlayers,
      0.6,
      0.9,
      { requestCount: 2, includeRequestedIds: [youngProspect.id] },
    );

    const result = calculateCounterOffer(
      createGameRNG(5011),
      prospectProposal,
      fixture.context,
      'prospect_hugger',
      makeRelationship(0),
    );

    expect(result.counter?.removedByAI).toContain(youngProspect.id);
  });

  it('stores a concrete counter proposal inside the negotiation state', () => {
    const state = initiateNegotiation(
      createGameRNG(5012),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'aggressive',
    );

    expect(state.proposal.offering.length).toBeGreaterThanOrEqual(fixture.counterProposal.offering.length);
    expect(state.proposal.valuationGap).toBeGreaterThanOrEqual(actualGap(fixture.counterProposal, fixture.context));
  });

  it('increments rounds when the player counters back', () => {
    const first = initiateNegotiation(
      createGameRNG(5013),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );
    const second = advanceNegotiation(
      createGameRNG(5014),
      first,
      {
        action: 'counter',
        proposal: fixture.counterProposal,
        context: fixture.context,
      },
      makeRelationship(0),
      'conservative',
    );

    expect(second.phase).toBe('counter_2');
    expect(second.roundsCompleted).toBe(2);
  });

  it('allows a third AI counter but kills talks after the next failed round', () => {
    const first = initiateNegotiation(createGameRNG(5015), fixture.counterProposal, fixture.context, makeRelationship(0), 'conservative');
    const second = advanceNegotiation(createGameRNG(5016), first, { action: 'counter', proposal: fixture.counterProposal, context: fixture.context }, makeRelationship(0), 'conservative');
    const third = advanceNegotiation(createGameRNG(5017), second, { action: 'counter', proposal: fixture.counterProposal, context: fixture.context }, makeRelationship(0), 'conservative');
    const dead = advanceNegotiation(createGameRNG(5018), third, { action: 'counter', proposal: fixture.counterProposal, context: fixture.context }, makeRelationship(0), 'conservative');

    expect(third.phase).toBe('counter_3');
    expect(dead.phase).toBe('dead');
  });

  it('expires pending negotiations after the configured number of days', () => {
    const pending = initiateNegotiation(
      createGameRNG(5019),
      fixture.pendingProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    const expired = advanceNegotiation(
      createGameRNG(5020),
      pending,
      {
        action: 'reject',
        context: {
          ...fixture.context,
          currentDay: pending.expiresAtDay + 1,
        },
      },
      makeRelationship(0),
      'conservative',
    );

    expect(expired.phase).toBe('dead');
  });

  it('accepts when the player agrees to the counter', () => {
    const countered = initiateNegotiation(
      createGameRNG(5021),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );
    const accepted = advanceNegotiation(
      createGameRNG(5022),
      countered,
      { action: 'accept' },
      makeRelationship(0),
      'conservative',
    );

    expect(accepted.phase).toBe('accepted');
  });

  it('lets the player reject a live negotiation', () => {
    const countered = initiateNegotiation(
      createGameRNG(5023),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );
    const rejected = advanceNegotiation(
      createGameRNG(5024),
      countered,
      { action: 'reject' },
      makeRelationship(0),
      'conservative',
    );

    expect(rejected.phase).toBe('rejected');
  });

  it('reevaluates player counters using the supplied proposal', () => {
    const countered = initiateNegotiation(
      createGameRNG(5025),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );
    const accepted = advanceNegotiation(
      createGameRNG(5026),
      countered,
      {
        action: 'counter',
        proposal: fixture.acceptProposal,
        context: fixture.context,
      },
      makeRelationship(0),
      'conservative',
    );

    expect(accepted.phase).toBe('accepted');
  });

  it.each([
    ['accepted', true],
    ['rejected', true],
    ['dead', true],
    ['pending', false],
    ['counter_1', false],
    ['counter_2', false],
    ['counter_3', false],
  ] satisfies Array<[NegotiationPhase, boolean]>)(
    'reports completion correctly for %s',
    (phase, expected) => {
      expect(
        isNegotiationComplete({
          id: 'neg-1',
          phase,
          proposal: fixture.pendingProposal,
          context: fixture.context,
          counterOffers: [],
          roundsCompleted: 1,
          expiresAtDay: 82,
          dialogue: [],
          relationshipChange: 0,
        }),
      ).toBe(expected);
    },
  );

  it('resolves rejected negotiations into a narrative outcome', () => {
    const rejected = initiateNegotiation(
      createGameRNG(5027),
      fixture.rejectProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    const outcome = resolveNegotiation(rejected);

    expect(outcome.accepted).toBe(false);
    expect(outcome.relationshipChange).toBe(-5);
    expect(outcome.narrative).toContain('Boston');
  });

  it('resolves accepted negotiations into an accepted outcome', () => {
    const accepted = initiateNegotiation(
      createGameRNG(5028),
      fixture.acceptProposal,
      fixture.context,
      makeRelationship(0),
      'conservative',
    );

    const outcome = resolveNegotiation(accepted);

    expect(outcome.accepted).toBe(true);
    expect(outcome.relationshipChange).toBeGreaterThan(0);
  });

  it('generates deterministic dialogue for the same state and seed', () => {
    const state = initiateNegotiation(
      createGameRNG(5029),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(-40),
      'aggressive',
    );

    const first = generateNegotiationDialogue(
      createGameRNG(5030),
      state,
      'aggressive',
      makeRelationship(-40),
    );
    const second = generateNegotiationDialogue(
      createGameRNG(5030),
      state,
      'aggressive',
      makeRelationship(-40),
    );

    expect(second).toEqual(first);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(first.some((line) => line.speaker === 'rival_gm')).toBe(true);
  });

  it.each([
    ['rejected', 'dismissive'],
    ['counter_1', 'firm'],
    ['pending', 'measured'],
    ['accepted', 'decisive'],
    ['dead', 'closed'],
  ] as Array<[NegotiationPhase, string]>)(
    'uses the expected tone family for %s phases',
    (phase, tone) => {
      const lines = generateNegotiationDialogue(
        createGameRNG(5031),
        {
          id: 'tone-test',
          phase,
          proposal: fixture.pendingProposal,
          context: fixture.context,
          counterOffers: [],
          roundsCompleted: 1,
          expiresAtDay: 82,
          dialogue: [],
          relationshipChange: 0,
        },
        'conservative',
        makeRelationship(phase === 'rejected' ? -60 : 20),
      );

      expect(lines[0]?.tone).toBe(tone);
    },
  );

  it('keeps state transitions deterministic for the same RNG seed', () => {
    const build = () => initiateNegotiation(
      createGameRNG(5032),
      fixture.counterProposal,
      fixture.context,
      addTradeMemory(makeRelationship(-20), {
        season: 3,
        surplusValue: 12,
        permanentMemory: false,
        description: 'The winter meeting swap',
      }),
      'analytical',
    );

    expect(build()).toEqual(build());
  });

  it('tracks counter metadata for the latest counter', () => {
    const state = initiateNegotiation(
      createGameRNG(5033),
      fixture.counterProposal,
      fixture.context,
      makeRelationship(0),
      'aggressive',
    );
    const counter = getCurrentCounter(state);

    expect(counter.round).toBe(1);
    expect(counter.adjustedValuationGap).toBeGreaterThanOrEqual(state.proposal.valuationGap);
  });
});
