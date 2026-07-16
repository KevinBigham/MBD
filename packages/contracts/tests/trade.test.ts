import { describe, expect, it } from 'vitest';
import {
  NegotiationProposalSchema,
  TradeAssetSchema,
  TradeAssetV34Schema,
  TradeStateV34Schema,
} from '../src/index.js';

const financialPlayerAsset = {
  type: 'player' as const,
  playerId: 'player-1',
  contractReference: {
    annualSalary: 24,
    contractEndSeasonExclusive: 2030,
  },
  retainedSalary: {
    annualAmount: 6,
    startSeason: 2027,
    endSeasonExclusive: 2029,
  },
  cashConsideration: {
    amount: 2.5,
    season: 2027,
  },
};

describe('trade financial term schema', () => {
  it('accepts exact player-linked salary retention and cash consideration terms', () => {
    expect(TradeAssetSchema.parse(financialPlayerAsset)).toEqual(financialPlayerAsset);
  });

  it('keeps the v34 player asset contract strict', () => {
    expect(() => TradeAssetV34Schema.parse(financialPlayerAsset)).toThrow();
    expect(TradeAssetV34Schema.parse({ type: 'player', playerId: 'player-1' })).toEqual({
      type: 'player',
      playerId: 'player-1',
    });
  });

  it.each([
    ['zero retention', { retainedSalary: { ...financialPlayerAsset.retainedSalary, annualAmount: 0 } }],
    ['negative cash', { cashConsideration: { ...financialPlayerAsset.cashConsideration, amount: -1 } }],
    ['non-finite retention', { retainedSalary: { ...financialPlayerAsset.retainedSalary, annualAmount: Number.POSITIVE_INFINITY } }],
    ['sub-cent cash', { cashConsideration: { ...financialPlayerAsset.cashConsideration, amount: 1.001 } }],
    ['empty retention window', { retainedSalary: { ...financialPlayerAsset.retainedSalary, endSeasonExclusive: 2027 } }],
    ['retention beyond contract', { retainedSalary: { ...financialPlayerAsset.retainedSalary, endSeasonExclusive: 2031 } }],
  ])('rejects %s', (_label, override) => {
    expect(() => TradeAssetSchema.parse({ ...financialPlayerAsset, ...override })).toThrow();
  });

  it('requires an exact contract reference for either financial term', () => {
    const { contractReference: _contractReference, ...missingReference } = financialPlayerAsset;
    expect(() => TradeAssetSchema.parse(missingReference)).toThrow();
  });

  it('enforces cent precision for current IFA pool-space assets without tightening v34', () => {
    expect(() => TradeAssetSchema.parse({ type: 'ifa_pool_space', amount: 1.001 })).toThrow();
    expect(TradeAssetSchema.parse({ type: 'ifa_pool_space', amount: 1.25 })).toEqual({
      type: 'ifa_pool_space',
      amount: 1.25,
    });
    expect(TradeAssetV34Schema.parse({ type: 'ifa_pool_space', amount: 1.001 })).toEqual({
      type: 'ifa_pool_space',
      amount: 1.001,
    });
  });

  it('preserves complete financial packages in current negotiation proposals', () => {
    const proposal = NegotiationProposalSchema.parse({
      fromTeamId: 'nym',
      toTeamId: 'bos',
      offering: ['player-1'],
      requesting: ['player-2'],
      offeringAssets: [financialPlayerAsset, { type: 'ifa_pool_space', amount: 1.25 }],
      requestingAssets: [{ type: 'player', playerId: 'player-2' }],
      valuationGap: 0,
    });

    expect(proposal.offeringAssets).toEqual([
      financialPlayerAsset,
      { type: 'ifa_pool_space', amount: 1.25 },
    ]);
    expect(proposal.requestingAssets).toEqual([{ type: 'player', playerId: 'player-2' }]);
  });

  it('normalizes legacy player-only negotiation proposals without fabricating terms', () => {
    expect(NegotiationProposalSchema.parse({
      fromTeamId: 'nym',
      toTeamId: 'bos',
      offering: ['player-1'],
      requesting: ['player-2'],
      valuationGap: 0,
    })).toMatchObject({
      offeringAssets: [{ type: 'player', playerId: 'player-1' }],
      requestingAssets: [{ type: 'player', playerId: 'player-2' }],
    });

    expect(() => TradeStateV34Schema.parse({
      pendingOffers: [],
      tradeHistory: [],
      negotiations: [{
        id: 'legacy-negotiation',
        phase: 'pending',
        proposal: {
          fromTeamId: 'nym',
          toTeamId: 'bos',
          offering: ['player-1'],
          requesting: ['player-2'],
          offeringAssets: [financialPlayerAsset],
          requestingAssets: [{ type: 'player', playerId: 'player-2' }],
          valuationGap: 0,
        },
        context: {
          currentDay: 1,
          fromTeamId: 'nym',
          toTeamId: 'bos',
          protectedPlayerIds: [],
          unavailablePlayerIds: [],
        },
        counterOffers: [],
        roundsCompleted: 0,
        expiresAtDay: 3,
        dialogue: [],
        relationshipChange: 0,
      }],
      multiTeamPendingTrades: [],
    })).toThrow();
  });
});
