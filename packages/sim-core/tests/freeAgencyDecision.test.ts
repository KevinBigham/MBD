import { describe, expect, it } from 'vitest';
import {
  compareFreeAgencyOfferEvaluations,
  createMarketExhaustedDecision,
  deriveFreeAgencyProjectedOpportunity,
  evaluateFreeAgencyOffer,
  getFreeAgencyCareerStageWeights,
} from '../src/index.js';
import type {
  FreeAgencyDecisionContext,
  FreeAgencyDecisionOffer,
  FreeAgencyOfferEvaluation,
} from '../src/index.js';

const OFFER: FreeAgencyDecisionOffer = {
  teamId: 'bos',
  playerId: 'fa-1',
  years: 4,
  annualSalary: 18,
};

const CONTEXT: FreeAgencyDecisionContext = {
  teamNeed: 80,
  contenderStatus: 'playoff',
  tenureSeasons: 3,
  homegrownBond: 0.5,
  clubhouseScore: 70,
};

describe('free-agent decision model', () => {
  it('freezes the age boundaries and an exact 12% nonfinancial ceiling', () => {
    expect(getFreeAgencyCareerStageWeights(28)).toEqual({
      term_security: 0.035,
      projected_opportunity: 0.035,
      contender_status: 0.015,
      loyalty: 0.02,
      clubhouse: 0.015,
    });
    expect(getFreeAgencyCareerStageWeights(29)).toEqual({
      term_security: 0.025,
      projected_opportunity: 0.025,
      contender_status: 0.03,
      loyalty: 0.025,
      clubhouse: 0.015,
    });
    expect(getFreeAgencyCareerStageWeights(32)).toEqual({
      term_security: 0.015,
      projected_opportunity: 0.015,
      contender_status: 0.055,
      loyalty: 0.02,
      clubhouse: 0.015,
    });
    for (const age of [20, 28, 29, 31, 32, 44]) {
      const total = Object.values(getFreeAgencyCareerStageWeights(age))
        .reduce((sum, weight) => sum + weight, 0);
      expect(total).toBeCloseTo(0.12, 10);
    }
  });

  it('derives only roster-backed opportunity tiers at exact boundaries', () => {
    expect(deriveFreeAgencyProjectedOpportunity(49.999)).toBe('depth');
    expect(deriveFreeAgencyProjectedOpportunity(50)).toBe('regular');
    expect(deriveFreeAgencyProjectedOpportunity(74.999)).toBe('regular');
    expect(deriveFreeAgencyProjectedOpportunity(75)).toBe('featured');
  });

  it('computes the literal frozen score, floor, context, and reasons', () => {
    const decision = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: OFFER,
      context: CONTEXT,
    });

    expect(decision).toMatchObject({
      kind: 'competitive',
      accepted: true,
      careerStage: 'prime',
      actualAav: 18,
      minimumEquivalentAav: 18,
      context: {
        projectedOpportunity: 'featured',
        contenderFactor: 0.85,
        loyaltyFactor: 0.56,
        loyaltySource: 'homegrown_and_tenure',
      },
      reasonCodes: ['financial_terms', 'contender_status'],
      primaryPreference: 'contender_status',
    });
    expect(decision.factors).toEqual({
      term_security: { input: 0.75, weight: 0.025, contribution: 0.375 },
      projected_opportunity: { input: 1, weight: 0.025, contribution: 0.5 },
      contender_status: { input: 0.85, weight: 0.03, contribution: 0.51 },
      loyalty: { input: 0.56, weight: 0.025, contribution: 0.28 },
      clubhouse: { input: 0.7, weight: 0.015, contribution: 0.21 },
    });
    expect(decision.equivalentAav).toBe(19.875);
    expect(decision.summary).toMatch(/age 30.*\$18\.00M AAV.*playoff.*\$18\.00M/i);
  });

  it('makes rising players value security more and veterans value contention more', () => {
    const rising = evaluateFreeAgencyOffer({
      playerAge: 28,
      marketValue: 20,
      offer: OFFER,
      context: CONTEXT,
    });
    const veteran = evaluateFreeAgencyOffer({
      playerAge: 32,
      marketValue: 20,
      offer: OFFER,
      context: CONTEXT,
    });

    expect(rising.factors.term_security.contribution)
      .toBeGreaterThan(veteran.factors.term_security.contribution);
    expect(rising.factors.projected_opportunity.contribution)
      .toBeGreaterThan(veteran.factors.projected_opportunity.contribution);
    expect(veteran.factors.contender_status.contribution)
      .toBeGreaterThan(rising.factors.contender_status.contribution);
  });

  it('allows factual opportunity, contender status, and loyalty to flip a bounded offer', () => {
    const weakContext: FreeAgencyDecisionContext = {
      teamNeed: 10,
      contenderStatus: 'unknown',
      tenureSeasons: 0,
      homegrownBond: 0,
      clubhouseScore: 0,
    };
    const strongContext: FreeAgencyDecisionContext = {
      teamNeed: 100,
      contenderStatus: 'champion',
      tenureSeasons: 5,
      homegrownBond: 1,
      clubhouseScore: 100,
    };
    const boundedOffer = { ...OFFER, annualSalary: 16.5, years: 5 };
    const weak = evaluateFreeAgencyOffer({
      playerAge: 34,
      marketValue: 20,
      offer: boundedOffer,
      context: weakContext,
    });
    const strong = evaluateFreeAgencyOffer({
      playerAge: 34,
      marketValue: 20,
      offer: boundedOffer,
      context: strongContext,
    });

    expect(weak.accepted).toBe(false);
    expect(strong.accepted).toBe(true);
    expect(strong.equivalentAav - boundedOffer.annualSalary).toBeLessThanOrEqual(2.4);
    expect(strong.primaryPreference).toBe('contender_status');
  });

  it('gives no fabricated contender or loyalty credit when facts are absent', () => {
    const decision = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: OFFER,
      context: {
        teamNeed: 50,
        contenderStatus: 'unknown',
        tenureSeasons: Number.NaN,
        homegrownBond: Number.NaN,
        clubhouseScore: 50,
      },
    });

    expect(decision.context).toMatchObject({
      contenderFactor: 0,
      tenureSeasons: 0,
      homegrownBond: 0,
      loyaltyFactor: 0,
      loyaltySource: 'none',
    });
    expect(decision.factors.contender_status.contribution).toBe(0);
    expect(decision.factors.loyalty.contribution).toBe(0);
  });

  it('rejects invalid terms and reports the exact equivalent-AAV shortfall', () => {
    const short = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: { ...OFFER, annualSalary: 10 },
      context: CONTEXT,
    });
    const invalid = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: { ...OFFER, years: 0 },
      context: CONTEXT,
    });

    expect(short.accepted).toBe(false);
    expect(short.reasonCodes).toEqual(['below_minimum']);
    expect(short.summary).toContain(`$${short.equivalentAav.toFixed(2)}M equivalent AAV`);
    expect(invalid.accepted).toBe(false);
    expect(invalid.reasonCodes).toEqual(['invalid_contract']);
  });

  it('rounds only the final equivalent AAV before applying the acceptance floor', () => {
    const decision = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 1,
      offer: { ...OFFER, years: 2, annualSalary: 0.8799 },
      context: {
        teamNeed: 0,
        contenderStatus: 'unknown',
        tenureSeasons: 0,
        homegrownBond: 0,
        clubhouseScore: 50,
      },
    });

    expect(decision.equivalentAav).toBe(0.8999);
    expect(decision.minimumEquivalentAav).toBe(0.9);
    expect(decision.accepted).toBe(false);
  });

  it('names the highest raw preference when display contributions round to a tie', () => {
    const decision = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 1,
      offer: { ...OFFER, years: 2, annualSalary: 1 },
      context: {
        teamNeed: 0,
        contenderStatus: 'unknown',
        tenureSeasons: 0,
        homegrownBond: 0,
        clubhouseScore: 42,
      },
    });

    expect(decision.factors.term_security.contribution).toBe(0.0063);
    expect(decision.factors.clubhouse.contribution).toBe(0.0063);
    expect(decision.primaryPreference).toBe('clubhouse');
    expect(decision.summary).toMatch(/chemistry and front-office reputation/i);
  });

  it('keeps the literal offered AAV in the authoritative decision artifact', () => {
    const decision = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: { ...OFFER, annualSalary: 41.123456 },
      context: CONTEXT,
    });

    expect(decision.actualAav).toBe(41.123456);
  });

  it('clamps term security at five years and describes threshold equality truthfully', () => {
    const context: FreeAgencyDecisionContext = {
      teamNeed: 0,
      contenderStatus: 'unknown',
      tenureSeasons: 0,
      homegrownBond: 0,
      clubhouseScore: 0,
    };
    const fiveYear = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: { ...OFFER, years: 5, annualSalary: 17.375 },
      context,
    });
    const tenYear = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: { ...OFFER, years: 10, annualSalary: 17.375 },
      context,
    });

    expect(fiveYear.factors.term_security).toEqual(tenYear.factors.term_security);
    expect(fiveYear.equivalentAav).toBe(18);
    expect(fiveYear.accepted).toBe(true);
    expect(fiveYear.summary).toContain('met the $18.00M equivalent-AAV minimum');
    expect(tenYear.equivalentAav).toBe(18);
  });

  it('rejects a term above the live ten-year free-agent maximum', () => {
    const decision = evaluateFreeAgencyOffer({
      playerAge: 30,
      marketValue: 20,
      offer: { ...OFFER, years: 11, annualSalary: 45 },
      context: CONTEXT,
    });

    expect(decision).toMatchObject({
      accepted: false,
      reasonCodes: ['invalid_contract'],
      summary: 'The offer is not a valid contract.',
    });
  });

  it('uses actual AAV, years, then team ID as stable tie-breakers', () => {
    const evaluation = (teamId: string, annualSalary: number, years: number): FreeAgencyOfferEvaluation => {
      const offer = { ...OFFER, teamId, annualSalary, years };
      return {
        offer,
        decision: {
          ...evaluateFreeAgencyOffer({
            playerAge: 30,
            marketValue: 20,
            offer,
            context: CONTEXT,
          }),
          equivalentAav: 20,
        },
      };
    };
    const candidates = [
      evaluation('nym', 18, 4),
      evaluation('bos', 18, 4),
      evaluation('lad', 17.5, 8),
      evaluation('sea', 18.5, 1),
    ];

    expect([...candidates].sort(compareFreeAgencyOfferEvaluations).map((entry) => entry.offer.teamId))
      .toEqual(['sea', 'bos', 'nym', 'lad']);
    expect([...candidates].reverse().sort(compareFreeAgencyOfferEvaluations).map((entry) => entry.offer.teamId))
      .toEqual(['sea', 'bos', 'nym', 'lad']);
  });

  it('labels market-exhausted deals without inventing preference motives', () => {
    const decision = createMarketExhaustedDecision({
      playerAge: 36,
      marketValue: 8,
      offer: { ...OFFER, years: 1, annualSalary: 0.75 },
      context: CONTEXT,
    });

    expect(decision).toMatchObject({
      kind: 'market_exhausted',
      accepted: true,
      reasonCodes: ['market_exhausted'],
      primaryPreference: null,
      equivalentAav: 0.75,
    });
    expect(Object.values(decision.factors).every((factor) => factor.contribution === 0)).toBe(true);
    expect(decision.summary).toMatch(/competitive market exhausted.*minor-league/i);
  });
});
