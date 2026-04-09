import { describe, expect, it } from 'vitest';
import { GameRNG, type GeneratedPlayer } from '../src/index.js';
import {
  buildMultiScoutConsensus,
  calculateScoutAccuracy,
  estimateAttributeWithUncertainty,
  generateScoutLearningEvent,
  updateScoutConfidence,
  type ActualOutcome,
  type ScoutObservation,
  type ScoutPrediction,
  type ScoutProfile,
} from '../src/scouting/scoutLearning.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  return {
    id: 'player-1',
    firstName: 'Marco',
    lastName: 'Vega',
    age: 22,
    position: 'SS',
    hitterAttributes: {
      contact: 315,
      power: 270,
      eye: 285,
      speed: 320,
      defense: 330,
      durability: 295,
    },
    pitcherAttributes: null,
    personality: {
      workEthic: 76,
      mentalToughness: 71,
      leadership: 53,
      competitiveness: 84,
    },
    contract: {
      years: 3,
      annualSalary: 1.1,
      totalValue: 3.3,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    rosterStatus: 'AA',
    developmentPhase: 'Prospect',
    teamId: 'nym',
    nationality: 'latin',
    overallRating: 282,
    rule5EligibleAfterSeason: 0,
    serviceTimeDays: 0,
    optionYearsUsed: 0,
    isOutOfOptions: false,
    minorLeagueLevel: 'AA',
    ceiling: 360,
    floor: 235,
    developmentProgram: 'refinement',
    developmentTrajectory: 'on_track',
    extensionHistory: [],
    personalityTraits: [],
    potentialRating: 348,
    ...overrides,
  };
}

function makeObservation(overrides: Partial<ScoutObservation> = {}): ScoutObservation {
  return {
    scoutId: overrides.scoutId ?? 'scout-1',
    playerId: overrides.playerId ?? 'player-1',
    observedRating: overrides.observedRating ?? 61,
    confidence: overrides.confidence ?? 72,
    timestamp: overrides.timestamp ?? 'S3D25',
    scoutSkill: overrides.scoutSkill ?? 78,
  };
}

function makePrediction(overrides: Partial<ScoutPrediction> = {}): ScoutPrediction {
  return {
    scoutId: overrides.scoutId ?? 'scout-1',
    playerId: overrides.playerId ?? 'player-1',
    predictedRating: overrides.predictedRating ?? 62,
    season: overrides.season ?? 3,
    positionGroup: overrides.positionGroup,
  };
}

function makeActual(overrides: Partial<ActualOutcome> = {}): ActualOutcome {
  return {
    playerId: overrides.playerId ?? 'player-1',
    actualRating: overrides.actualRating ?? 60,
    season: overrides.season ?? 3,
    positionGroup: overrides.positionGroup,
  };
}

function makeScoutProfile(overrides: Partial<ScoutProfile> = {}): ScoutProfile {
  return {
    id: overrides.id ?? 'scout-1',
    skill: overrides.skill ?? 82,
    experience: overrides.experience ?? 7,
    bias: overrides.bias ?? 1,
  };
}

describe('updateScoutConfidence', () => {
  it('increases confidence with more observations when accuracy is solid', () => {
    const lowExposure = updateScoutConfidence(55, 1, [4, 5, 6]);
    const highExposure = updateScoutConfidence(55, 12, [4, 5, 6]);

    expect(highExposure).toBeGreaterThan(lowExposure);
  });

  it('plateaus near the 95 cap with many observations', () => {
    const confidence = updateScoutConfidence(90, 80, [0, 1, 0, 1]);

    expect(confidence).toBeLessThanOrEqual(95);
    expect(confidence).toBeGreaterThanOrEqual(90);
  });

  it('decreases when the recent error profile is poor', () => {
    const strong = updateScoutConfidence(70, 10, [3, 4, 5]);
    const weak = updateScoutConfidence(70, 10, [18, 21, 24]);

    expect(weak).toBeLessThan(strong);
  });

  it('returns a bounded value with zero observations', () => {
    const confidence = updateScoutConfidence(48, 0, []);

    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(95);
  });

  it('rewards repeated accurate looks', () => {
    const oneLook = updateScoutConfidence(60, 1, [2]);
    const fiveLooks = updateScoutConfidence(60, 5, [2, 2, 2, 2, 2]);

    expect(fiveLooks).toBeGreaterThan(oneLook);
  });

  it('stays above the starting value with near-perfect long-term accuracy', () => {
    const confidence = updateScoutConfidence(65, 20, [0, 1, 0, 1, 1]);

    expect(confidence).toBeGreaterThan(65);
  });

  it('keeps values clamped to 95 even from very high inputs', () => {
    expect(updateScoutConfidence(97, 25, [0, 0, 1])).toBe(95);
  });
});

describe('buildMultiScoutConsensus', () => {
  it('classifies tightly clustered reports as unanimous', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 60 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 61 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 62 }),
    ]);

    expect(consensus.agreementLevel).toBe('unanimous');
    expect(consensus.outlierScoutIds).toEqual([]);
  });

  it('flags a lone outlier as majority', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 61 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 60 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 76, confidence: 45 }),
    ]);

    expect(consensus.agreementLevel).toBe('majority');
    expect(consensus.outlierScoutIds).toContain('scout-3');
  });

  it('classifies moderately separated reports as majority', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 50 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 61 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 69 }),
    ]);

    expect(consensus.agreementLevel).toBe('majority');
  });

  it('classifies widely separated reports as split', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 42 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 63 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 84 }),
    ]);

    expect(consensus.agreementLevel).toBe('split');
  });

  it('treats a single report as unanimous by definition', () => {
    const consensus = buildMultiScoutConsensus([makeObservation({ observedRating: 64 })]);

    expect(consensus.agreementLevel).toBe('unanimous');
  });

  it('weights the consensus toward high-confidence, high-skill scouts', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 70, confidence: 88, scoutSkill: 90 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 50, confidence: 40, scoutSkill: 40 }),
    ]);

    expect(consensus.consensusRating).toBeGreaterThan(60);
  });

  it('narrows the confidence interval with more aligned reports', () => {
    const twoReports = buildMultiScoutConsensus([
      makeObservation({ observedRating: 60 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 61 }),
    ]);
    const fourReports = buildMultiScoutConsensus([
      makeObservation({ observedRating: 60 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 61 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 60 }),
      makeObservation({ scoutId: 'scout-4', observedRating: 61 }),
    ]);

    const twoWidth = twoReports.confidenceInterval.high - twoReports.confidenceInterval.low;
    const fourWidth = fourReports.confidenceInterval.high - fourReports.confidenceInterval.low;
    expect(fourWidth).toBeLessThanOrEqual(twoWidth);
  });

  it('keeps the consensus within the confidence interval bounds', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 58 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 62 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 64 }),
    ]);

    expect(consensus.consensusRating).toBeGreaterThanOrEqual(consensus.confidenceInterval.low);
    expect(consensus.consensusRating).toBeLessThanOrEqual(consensus.confidenceInterval.high);
  });

  it('returns symmetric confidence intervals around the consensus', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 58 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 60 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 62 }),
    ]);

    expect(consensus.consensusRating - consensus.confidenceInterval.low)
      .toBe(consensus.confidenceInterval.high - consensus.consensusRating);
  });

  it('can flag multiple outliers when the room is fractured', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ observedRating: 60 }),
      makeObservation({ scoutId: 'scout-2', observedRating: 88 }),
      makeObservation({ scoutId: 'scout-3', observedRating: 34 }),
      makeObservation({ scoutId: 'scout-4', observedRating: 59 }),
    ]);

    expect(consensus.outlierScoutIds.length).toBeGreaterThanOrEqual(2);
  });

  it('sorts outlier scout ids deterministically', () => {
    const consensus = buildMultiScoutConsensus([
      makeObservation({ scoutId: 'scout-c', observedRating: 60 }),
      makeObservation({ scoutId: 'scout-b', observedRating: 88 }),
      makeObservation({ scoutId: 'scout-a', observedRating: 34 }),
      makeObservation({ scoutId: 'scout-d', observedRating: 59 }),
    ]);

    expect(consensus.outlierScoutIds).toEqual(['scout-a', 'scout-b']);
  });
});

describe('calculateScoutAccuracy', () => {
  it('identifies neutral bias when signed error is near zero', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ predictedRating: 61, season: 1 }),
      makePrediction({ predictedRating: 59, season: 2 }),
    ], [
      makeActual({ actualRating: 60, season: 1 }),
      makeActual({ actualRating: 60, season: 2 }),
    ]);

    expect(profile.biasDirection).toBe('neutral');
  });

  it('identifies optimistic bias when predictions run high', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ predictedRating: 70, season: 1 }),
      makePrediction({ predictedRating: 74, season: 2 }),
    ], [
      makeActual({ actualRating: 61, season: 1 }),
      makeActual({ actualRating: 63, season: 2 }),
    ]);

    expect(profile.biasDirection).toBe('optimistic');
  });

  it('identifies pessimistic bias when predictions run low', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ predictedRating: 52, season: 1 }),
      makePrediction({ predictedRating: 51, season: 2 }),
    ], [
      makeActual({ actualRating: 61, season: 1 }),
      makeActual({ actualRating: 60, season: 2 }),
    ]);

    expect(profile.biasDirection).toBe('pessimistic');
  });

  it('uses recent seasons for recentMae', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ predictedRating: 58, season: 1 }),
      makePrediction({ predictedRating: 58, season: 2 }),
      makePrediction({ predictedRating: 58, season: 3 }),
      makePrediction({ predictedRating: 58, season: 4 }),
      makePrediction({ predictedRating: 58, season: 5 }),
      makePrediction({ predictedRating: 58, season: 6 }),
    ], [
      makeActual({ actualRating: 58, season: 1 }),
      makeActual({ actualRating: 58, season: 2 }),
      makeActual({ actualRating: 58, season: 3 }),
      makeActual({ actualRating: 70, season: 4 }),
      makeActual({ actualRating: 70, season: 5 }),
      makeActual({ actualRating: 70, season: 6 }),
    ]);

    expect(profile.recentMae).toBeGreaterThan(profile.lifetimeMae / 2);
  });

  it('tracks best and worst position groups', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ playerId: 'a', season: 1, positionGroup: 'middle_infield', predictedRating: 60 }),
      makePrediction({ playerId: 'b', season: 1, positionGroup: 'outfield', predictedRating: 80 }),
    ], [
      makeActual({ playerId: 'a', season: 1, positionGroup: 'middle_infield', actualRating: 60 }),
      makeActual({ playerId: 'b', season: 1, positionGroup: 'outfield', actualRating: 62 }),
    ]);

    expect(profile.bestPositionGroup).toBe('middle_infield');
    expect(profile.worstPositionGroup).toBe('outfield');
  });

  it('defaults missing position groups to overall', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ predictedRating: 61 }),
    ], [
      makeActual({ actualRating: 60 }),
    ]);

    expect(profile.bestPositionGroup).toBe('overall');
    expect(profile.worstPositionGroup).toBe('overall');
  });

  it('returns zero MAE for perfect predictions', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ playerId: 'a', season: 1, predictedRating: 61 }),
      makePrediction({ playerId: 'b', season: 2, predictedRating: 64 }),
    ], [
      makeActual({ playerId: 'a', season: 1, actualRating: 61 }),
      makeActual({ playerId: 'b', season: 2, actualRating: 64 }),
    ]);

    expect(profile.lifetimeMae).toBe(0);
    expect(profile.recentMae).toBe(0);
  });

  it('ignores unmatched predictions instead of crashing', () => {
    const profile = calculateScoutAccuracy([
      makePrediction({ playerId: 'matched', season: 1, predictedRating: 64 }),
      makePrediction({ playerId: 'missing', season: 2, predictedRating: 70 }),
    ], [
      makeActual({ playerId: 'matched', season: 1, actualRating: 61 }),
    ]);

    expect(profile.lifetimeMae).toBe(3);
  });
});

describe('estimateAttributeWithUncertainty', () => {
  it('is deterministic for the same seed', () => {
    const first = estimateAttributeWithUncertainty(new GameRNG(41), 62, 80, 4);
    const second = estimateAttributeWithUncertainty(new GameRNG(41), 62, 80, 4);

    expect(first).toEqual(second);
  });

  it('narrows intervals for higher scout skill', () => {
    const lowSkill = estimateAttributeWithUncertainty(new GameRNG(12), 60, 25, 4);
    const highSkill = estimateAttributeWithUncertainty(new GameRNG(12), 60, 90, 4);

    expect(highSkill.high - highSkill.low).toBeLessThan(lowSkill.high - lowSkill.low);
  });

  it('narrows intervals with more observations', () => {
    const oneLook = estimateAttributeWithUncertainty(new GameRNG(13), 60, 75, 1);
    const sixLooks = estimateAttributeWithUncertainty(new GameRNG(13), 60, 75, 6);

    expect(sixLooks.high - sixLooks.low).toBeLessThan(oneLook.high - oneLook.low);
  });

  it('keeps the point estimate inside the interval', () => {
    const estimate = estimateAttributeWithUncertainty(new GameRNG(14), 61, 70, 3);

    expect(estimate.pointEstimate).toBeGreaterThanOrEqual(estimate.low);
    expect(estimate.pointEstimate).toBeLessThanOrEqual(estimate.high);
  });

  it('raises confidence with better skill', () => {
    const lowSkill = estimateAttributeWithUncertainty(new GameRNG(15), 61, 25, 3);
    const highSkill = estimateAttributeWithUncertainty(new GameRNG(15), 61, 90, 3);

    expect(highSkill.confidence).toBeGreaterThan(lowSkill.confidence);
  });

  it('returns a bounded interval with zero observations', () => {
    const estimate = estimateAttributeWithUncertainty(new GameRNG(16), 61, 60, 0);

    expect(estimate.high).toBeGreaterThanOrEqual(estimate.low);
    expect(estimate.confidence).toBeGreaterThanOrEqual(0);
  });

  it('keeps higher-skill point estimates closer to truth with the same seed', () => {
    const lowSkill = estimateAttributeWithUncertainty(new GameRNG(17), 64, 20, 2);
    const highSkill = estimateAttributeWithUncertainty(new GameRNG(17), 64, 95, 2);

    expect(Math.abs(highSkill.pointEstimate - 64)).toBeLessThanOrEqual(Math.abs(lowSkill.pointEstimate - 64));
  });
});

describe('generateScoutLearningEvent', () => {
  it('is deterministic for the same seed', () => {
    const first = generateScoutLearningEvent(new GameRNG(55), makeScoutProfile(), makePlayer(), 3);
    const second = generateScoutLearningEvent(new GameRNG(55), makeScoutProfile(), makePlayer(), 3);

    expect(first).toEqual(second);
  });

  it('improves confidence for an experienced, skilled scout', () => {
    const event = generateScoutLearningEvent(
      new GameRNG(56),
      makeScoutProfile({ skill: 88, experience: 12 }),
      makePlayer(),
      4,
    );

    expect(event.newConfidence).toBeGreaterThan(event.previousConfidence);
  });

  it('uses projection language for younger players', () => {
    const event = generateScoutLearningEvent(new GameRNG(57), makeScoutProfile(), makePlayer({ age: 19 }), 2);

    expect(event.insightGained.toLowerCase()).toMatch(/projection|frame|growth/);
  });

  it('uses refinement language for older players', () => {
    const event = generateScoutLearningEvent(
      new GameRNG(58),
      makeScoutProfile(),
      makePlayer({ age: 29, developmentPhase: 'Prime', rosterStatus: 'MLB', minorLeagueLevel: null }),
      2,
    );

    expect(event.insightGained.toLowerCase()).toMatch(/refine|polish|read/);
  });

  it('mentions longer exposure after several seasons observed', () => {
    const event = generateScoutLearningEvent(new GameRNG(59), makeScoutProfile(), makePlayer(), 5);

    expect(event.insightGained.toLowerCase()).toMatch(/multiple seasons|extended look|deep history/);
  });

  it('uses steady language for small confidence changes', () => {
    const event = generateScoutLearningEvent(
      new GameRNG(60),
      makeScoutProfile({ skill: 55, experience: 2 }),
      makePlayer(),
      1,
    );

    expect(event.insightGained.toLowerCase()).toMatch(/steady|incremental|small sample/);
  });

  it('echoes scout and player identifiers', () => {
    const event = generateScoutLearningEvent(new GameRNG(61), makeScoutProfile({ id: 'scout-9' }), makePlayer({ id: 'player-77' }), 3);

    expect(event.scoutId).toBe('scout-9');
    expect(event.playerId).toBe('player-77');
  });

  it('caps learned confidence at 95', () => {
    const event = generateScoutLearningEvent(
      new GameRNG(62),
      makeScoutProfile({ skill: 100, experience: 20 }),
      makePlayer(),
      10,
    );

    expect(event.newConfidence).toBeLessThanOrEqual(95);
  });
});

describe('top-level exports', () => {
  it('re-exports scouting intelligence APIs from sim-core index', async () => {
    const simCore = await import('../src/index.js');

    expect(typeof simCore.updateScoutConfidence).toBe('function');
    expect(typeof simCore.buildMultiScoutConsensus).toBe('function');
    expect(typeof simCore.calculateScoutAccuracy).toBe('function');
    expect(typeof simCore.generateScoutLearningEvent).toBe('function');
    expect(typeof simCore.estimateAttributeWithUncertainty).toBe('function');
  });
});
