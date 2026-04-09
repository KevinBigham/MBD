import { describe, expect, it } from 'vitest';
import { GameRNG } from '../src/index.js';
import {
  detectTradeCascades,
  evaluateCondition,
  evaluateMultiTeamFairness,
  generateConditionalClause,
  generateMultiTeamTradeNarrative,
  proposeMultiTeamTrade,
  type CompletedTrade,
  type ConditionOutcome,
  type MultiTeamProposal,
  type MultiTeamTradeResult,
  type PendingTrade,
  type TradeCondition,
} from '../src/trade/multiTeamTrade.js';

function makeProposal(
  overrides: Partial<MultiTeamProposal> = {},
): MultiTeamProposal {
  return {
    teams: [
      {
        teamId: 'nym',
        sending: ['nym-1'],
        receiving: ['bal-1'],
        role: 'initiator',
      },
      {
        teamId: 'bal',
        sending: ['bal-1'],
        receiving: ['kc-1'],
        role: 'partner',
      },
      {
        teamId: 'kc',
        sending: ['kc-1'],
        receiving: ['nym-1'],
        role: 'facilitator',
      },
    ],
    conditions: [],
    ...overrides,
  };
}

function makeValuations(entries: Record<string, number>): Map<string, number> {
  return new Map(Object.entries(entries));
}

function makeCondition(
  overrides: Partial<TradeCondition> = {},
): TradeCondition {
  return {
    type: overrides.type ?? 'performance',
    threshold: overrides.threshold ?? 4,
    playerId: overrides.playerId ?? 'player-1',
    deadline: overrides.deadline ?? 1,
    description: overrides.description ?? 'Player reaches the target line.',
  };
}

function makeOutcome(
  overrides: Partial<ConditionOutcome> = {},
): ConditionOutcome {
  return {
    conditionMet: overrides.conditionMet ?? true,
    actualValue: overrides.actualValue ?? 4,
    description: overrides.description ?? 'Threshold was reached.',
  };
}

function makeCompletedTrade(
  overrides: Partial<CompletedTrade> = {},
): CompletedTrade {
  return {
    playerIds: overrides.playerIds ?? ['player-1'],
    fromTeamId: overrides.fromTeamId ?? 'nym',
    toTeamId: overrides.toTeamId ?? 'bal',
    season: overrides.season ?? 4,
  };
}

function makePendingTrade(
  overrides: Partial<PendingTrade> = {},
): PendingTrade {
  return {
    id: overrides.id ?? 'pending-1',
    requiredPlayerId: overrides.requiredPlayerId ?? 'player-1',
    triggerCondition: overrides.triggerCondition ?? 'Requires player-1 on roster',
  };
}

describe('evaluateMultiTeamFairness', () => {
  it('marks a balanced three-team structure as balanced', () => {
    const proposal = makeProposal();
    const fairness = evaluateMultiTeamFairness(proposal, makeValuations({
      'nym-1': 40,
      'bal-1': 44,
      'kc-1': 42,
    }));

    expect(fairness.isBalanced).toBe(true);
    expect(fairness.mostDisadvantagedTeam).toBe('bal');
  });

  it('marks an uneven proposal as unbalanced', () => {
    const fairness = evaluateMultiTeamFairness(makeProposal(), makeValuations({
      'nym-1': 30,
      'bal-1': 55,
      'kc-1': 70,
    }));

    expect(fairness.isBalanced).toBe(false);
  });

  it('flags the most disadvantaged team correctly', () => {
    const fairness = evaluateMultiTeamFairness(makeProposal(), makeValuations({
      'nym-1': 35,
      'bal-1': 52,
      'kc-1': 60,
    }));

    expect(fairness.mostDisadvantagedTeam).toBe('kc');
  });

  it('keeps the fairness score within 0-100', () => {
    const fairness = evaluateMultiTeamFairness(makeProposal(), makeValuations({
      'nym-1': 10,
      'bal-1': 95,
      'kc-1': 90,
    }));

    expect(fairness.fairnessScore).toBeGreaterThanOrEqual(0);
    expect(fairness.fairnessScore).toBeLessThanOrEqual(100);
  });

  it('reports zero imbalance for perfectly even exchanges', () => {
    const fairness = evaluateMultiTeamFairness(makeProposal(), makeValuations({
      'nym-1': 40,
      'bal-1': 40,
      'kc-1': 40,
    }));

    expect(fairness.maxImbalance).toBe(0);
  });

  it('tolerates a small negative for facilitator teams', () => {
    const fairness = evaluateMultiTeamFairness(makeProposal(), makeValuations({
      'nym-1': 40,
      'bal-1': 44,
      'kc-1': 46,
    }));

    expect(fairness.isBalanced).toBe(true);
  });

  it('fails facilitator deals that drift beyond the stricter facilitator band', () => {
    const fairness = evaluateMultiTeamFairness(makeProposal(), makeValuations({
      'nym-1': 35,
      'bal-1': 50,
      'kc-1': 65,
    }));

    expect(fairness.isBalanced).toBe(false);
  });
});

describe('proposeMultiTeamTrade', () => {
  it('accepts a balanced proposal when every team stays within tolerance', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(71),
      makeProposal(),
      makeValuations({
        'nym-1': 40,
        'bal-1': 44,
        'kc-1': 42,
      }),
    );

    expect(result.accepted).toBe(true);
    expect(result.blockingTeamId).toBeUndefined();
  });

  it('rejects a proposal when one team loses too much value', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(72),
      makeProposal(),
      makeValuations({
        'nym-1': 30,
        'bal-1': 55,
        'kc-1': 70,
      }),
    );

    expect(result.accepted).toBe(false);
    expect(result.blockingTeamId).toBeTruthy();
    expect(result.blockReason).toBeTruthy();
  });

  it('allows an aggressive GM to accept a worse edge than a conservative GM', () => {
    const proposal = makeProposal();
    const valuations = makeValuations({
      'nym-1': 40,
      'bal-1': 57,
      'kc-1': 60,
    });
    const aggressive = proposeMultiTeamTrade(
      new GameRNG(73),
      proposal,
      valuations,
      new Map([
        ['kc', 'aggressive'],
      ]),
    );
    const conservative = proposeMultiTeamTrade(
      new GameRNG(73),
      proposal,
      valuations,
      new Map([
        ['kc', 'conservative'],
      ]),
    );

    expect(aggressive.accepted).toBe(true);
    expect(conservative.accepted).toBe(false);
  });

  it('computes net values by team', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(74),
      makeProposal(),
      makeValuations({
        'nym-1': 40,
        'bal-1': 44,
        'kc-1': 42,
      }),
    );

    expect(result.netValueByTeam.get('nym')).toBe(4);
    expect(result.netValueByTeam.get('bal')).toBe(-2);
    expect(result.netValueByTeam.get('kc')).toBe(-2);
  });

  it('rejects empty proposals', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(75),
      { teams: [], conditions: [] },
      new Map(),
    );

    expect(result.accepted).toBe(false);
    expect(result.blockReason).toMatch(/empty|participant/i);
  });

  it('rejects proposals with fewer than three distinct teams', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(76),
      {
        teams: [
          { teamId: 'nym', sending: ['a'], receiving: ['b'], role: 'initiator' },
          { teamId: 'nym', sending: ['b'], receiving: ['a'], role: 'partner' },
        ],
        conditions: [],
      },
      makeValuations({ a: 20, b: 20 }),
    );

    expect(result.accepted).toBe(false);
    expect(result.blockReason).toMatch(/three-team|distinct/i);
  });

  it('rejects proposals that reuse the same player multiple times', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(77),
      {
        teams: [
          { teamId: 'nym', sending: ['shared'], receiving: ['bal-1'], role: 'initiator' },
          { teamId: 'bal', sending: ['bal-1'], receiving: ['shared'], role: 'partner' },
          { teamId: 'kc', sending: ['shared'], receiving: ['nym-1'], role: 'facilitator' },
        ],
        conditions: [],
      },
      makeValuations({ shared: 40, 'bal-1': 42, 'nym-1': 38 }),
    );

    expect(result.accepted).toBe(false);
    expect(result.blockReason).toMatch(/duplicate|reuse/i);
  });

  it('is deterministic with the same seed and proposal', () => {
    const proposal = makeProposal();
    const valuations = makeValuations({
      'nym-1': 40,
      'bal-1': 44,
      'kc-1': 42,
    });

    const first = proposeMultiTeamTrade(new GameRNG(78), proposal, valuations);
    const second = proposeMultiTeamTrade(new GameRNG(78), proposal, valuations);

    expect(first).toEqual(second);
  });

  it('includes a narrative for accepted trades', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(79),
      makeProposal(),
      makeValuations({
        'nym-1': 40,
        'bal-1': 44,
        'kc-1': 42,
      }),
    );

    expect(result.narrative.length).toBeGreaterThan(0);
  });

  it('marks the blocking team on rejection', () => {
    const result = proposeMultiTeamTrade(
      new GameRNG(80),
      makeProposal(),
      makeValuations({
        'nym-1': 25,
        'bal-1': 54,
        'kc-1': 70,
      }),
    );

    expect(result.blockingTeamId).toBe('kc');
  });

  it('respects the facilitator role tolerance', () => {
    const accepted = proposeMultiTeamTrade(
      new GameRNG(81),
      makeProposal(),
      makeValuations({
        'nym-1': 40,
        'bal-1': 43,
        'kc-1': 45,
      }),
      new Map([
        ['nym', 'analytical'],
        ['bal', 'analytical'],
        ['kc', 'analytical'],
      ]),
    );
    const rejected = proposeMultiTeamTrade(
      new GameRNG(82),
      makeProposal(),
      makeValuations({
        'nym-1': 35,
        'bal-1': 43,
        'kc-1': 52,
      }),
      new Map([
        ['nym', 'analytical'],
        ['bal', 'analytical'],
        ['kc', 'analytical'],
      ]),
    );

    expect(accepted.accepted).toBe(true);
    expect(rejected.accepted).toBe(false);
  });
});

describe('generateConditionalClause and evaluateCondition', () => {
  it('generates deterministic clauses for the same seed and context', () => {
    const context = {
      playerId: 'player-9',
      playerAge: 24,
      playerRating: 320,
      contractYearsRemaining: 2,
    };

    const first = generateConditionalClause(new GameRNG(91), context);
    const second = generateConditionalClause(new GameRNG(91), context);

    expect(first).toEqual(second);
  });

  it('preserves the player id from context', () => {
    const clause = generateConditionalClause(new GameRNG(92), {
      playerId: 'player-22',
      playerAge: 27,
      playerRating: 305,
      contractYearsRemaining: 3,
    });

    expect(clause.playerId).toBe('player-22');
  });

  it('creates positive deadlines based on contract length', () => {
    const clause = generateConditionalClause(new GameRNG(93), {
      playerId: 'player-23',
      playerAge: 29,
      playerRating: 290,
      contractYearsRemaining: 1,
    });

    expect(clause.deadline).toBeGreaterThanOrEqual(1);
  });

  it('creates a readable clause description', () => {
    const clause = generateConditionalClause(new GameRNG(94), {
      playerId: 'player-24',
      playerAge: 23,
      playerRating: 340,
      contractYearsRemaining: 4,
    });

    expect(clause.description.length).toBeGreaterThan(10);
  });

  it.each<{
    type: TradeCondition['type'];
    threshold: number;
    actualValue: number;
    conditionMet: boolean;
  }>([
    { type: 'performance', threshold: 4, actualValue: 4, conditionMet: true },
    { type: 'games_played', threshold: 120, actualValue: 120, conditionMet: true },
    { type: 'award', threshold: 1, actualValue: 1, conditionMet: true },
    { type: 'playoff', threshold: 1, actualValue: 1, conditionMet: true },
  ])('evaluates $type clauses as true when the threshold is met', ({ type, threshold, actualValue, conditionMet }) => {
    expect(evaluateCondition(
      makeCondition({ type, threshold }),
      makeOutcome({ actualValue, conditionMet }),
    )).toBe(true);
  });

  it.each<{
    type: TradeCondition['type'];
    threshold: number;
    actualValue: number;
    conditionMet: boolean;
  }>([
    { type: 'performance', threshold: 5, actualValue: 4, conditionMet: false },
    { type: 'games_played', threshold: 125, actualValue: 124, conditionMet: false },
    { type: 'award', threshold: 1, actualValue: 0, conditionMet: false },
    { type: 'playoff', threshold: 1, actualValue: 0, conditionMet: false },
  ])('evaluates $type clauses as false below the threshold', ({ type, threshold, actualValue, conditionMet }) => {
    expect(evaluateCondition(
      makeCondition({ type, threshold }),
      makeOutcome({ actualValue, conditionMet }),
    )).toBe(false);
  });
});

describe('detectTradeCascades', () => {
  it('triggers a cascade when a required player is moved', () => {
    const events = detectTradeCascades(
      makeCompletedTrade({ playerIds: ['player-1'] }),
      [makePendingTrade({ id: 'pending-2', requiredPlayerId: 'player-1' })],
    );

    expect(events).toHaveLength(1);
    expect(events[0]?.triggeredTradeId).toBe('pending-2');
  });

  it('returns no cascades for unrelated pending trades', () => {
    const events = detectTradeCascades(
      makeCompletedTrade({ playerIds: ['player-1'] }),
      [makePendingTrade({ requiredPlayerId: 'player-9' })],
    );

    expect(events).toEqual([]);
  });

  it('can trigger multiple cascades from one completed trade', () => {
    const events = detectTradeCascades(
      makeCompletedTrade({ playerIds: ['player-1', 'player-2'] }),
      [
        makePendingTrade({ id: 'pending-2', requiredPlayerId: 'player-1' }),
        makePendingTrade({ id: 'pending-3', requiredPlayerId: 'player-2' }),
      ],
    );

    expect(events).toHaveLength(2);
  });

  it('includes the affected team ids in cascade events', () => {
    const events = detectTradeCascades(
      makeCompletedTrade({ fromTeamId: 'nym', toTeamId: 'bal' }),
      [makePendingTrade()],
    );

    expect(events[0]?.affectedTeamIds).toEqual(['nym', 'bal']);
  });

  it('includes the trigger condition in the cascade reason', () => {
    const events = detectTradeCascades(
      makeCompletedTrade(),
      [makePendingTrade({ triggerCondition: 'Player must remain in the system' })],
    );

    expect(events[0]?.reason).toMatch(/system|player/i);
  });
});

describe('generateMultiTeamTradeNarrative', () => {
  function makeResult(overrides: Partial<MultiTeamTradeResult> = {}): MultiTeamTradeResult {
    return {
      accepted: overrides.accepted ?? true,
      teams: overrides.teams ?? makeProposal().teams,
      netValueByTeam: overrides.netValueByTeam ?? new Map([
        ['nym', 4],
        ['bal', -2],
        ['kc', -2],
      ]),
      narrative: overrides.narrative ?? '',
      blockingTeamId: overrides.blockingTeamId,
      blockReason: overrides.blockReason,
    };
  }

  it('is deterministic for the same seed and result', () => {
    const result = makeResult();

    const first = generateMultiTeamTradeNarrative(new GameRNG(101), result);
    const second = generateMultiTeamTradeNarrative(new GameRNG(101), result);

    expect(first).toBe(second);
  });

  it('mentions all three teams in the narrative', () => {
    const narrative = generateMultiTeamTradeNarrative(new GameRNG(102), makeResult());

    expect(narrative).toContain('NY');
    expect(narrative.toLowerCase()).toMatch(/bal|kc|kansas|baltimore/);
  });

  it('mentions the block reason on rejected deals', () => {
    const narrative = generateMultiTeamTradeNarrative(new GameRNG(103), makeResult({
      accepted: false,
      blockingTeamId: 'bal',
      blockReason: 'Baltimore sees the value gap as too steep.',
    }));

    expect(narrative).toMatch(/too steep|blocked|baltimore/i);
  });

  it('references player ids from the proposal structure', () => {
    const narrative = generateMultiTeamTradeNarrative(new GameRNG(104), makeResult());

    expect(narrative).toMatch(/nym-1|bal-1|kc-1/);
  });
});

describe('top-level exports', () => {
  it('re-exports trade intelligence APIs from sim-core index', async () => {
    const simCore = await import('../src/index.js');

    expect(typeof simCore.proposeMultiTeamTrade).toBe('function');
    expect(typeof simCore.evaluateMultiTeamFairness).toBe('function');
    expect(typeof simCore.generateConditionalClause).toBe('function');
    expect(typeof simCore.evaluateCondition).toBe('function');
    expect(typeof simCore.detectTradeCascades).toBe('function');
    expect(typeof simCore.generateMultiTeamTradeNarrative).toBe('function');
  });
});
