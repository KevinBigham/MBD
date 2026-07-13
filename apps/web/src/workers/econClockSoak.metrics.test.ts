import { describe, expect, it } from 'vitest';
import {
  assertEconomyBand,
  auditEconomyTeamRoster,
  assertEconomyTransitionEquations,
  assertEconomyMarketCohorts,
  classifyEconomyAssignmentEvidence,
  classifyEconomyRule5Provenance,
  assertCapturedEntrantsCanonical,
  assertAssignmentAttribution,
  assertEntrantAttribution,
  assertExactIdSet,
  assertFreeAgencyEntryUnion,
  assertNoNewInvariantCategory,
  assertNoDoubleClock,
  assertOptionPartition,
  assertPopulationSample,
  assertRolloverFlow,
  assertSlopeBands,
  buildEconomyTransitionSummary,
  classifyEconomyPopulation,
  ECON_CLOCK_BANDS,
  economySlope,
  mean,
} from './econClockSoak.metrics.js';

describe('Goal 11 economy soak metrics', () => {
  it('classifies runtime player ownership categories exactly', () => {
    expect(classifyEconomyPopulation([
      { teamId: 'nym', rosterStatus: 'MLB' },
      { teamId: 'nym', rosterStatus: 'AAA' },
      { teamId: '', rosterStatus: 'INTERNATIONAL' },
    ], 42)).toEqual({ total: 3, major: 1, minor: 1, unassigned: 1, bytes: 42 });
  });

  it('uses the frozen baseline/first-half/second-half slope and curvature formulas', () => {
    const slope = economySlope([5408, 6000, 6600, 7200, 7750, 8300, 8850]);
    expect(slope).toEqual({ first: 597.3333333333334, second: 550, curvature: -47.33333333333337 });
    expect(mean([1, 2, 3])).toBe(2);
  });

  it('fails closed outside frozen bands and on broken population/entry attribution', () => {
    expect(() => assertEconomyBand(900, [1, 899], 'market')).toThrow(/market/);
    expect(() => assertSlopeBands('total', { first: 578, second: 545, curvature: -15 })).toThrow(/curvature/);
    expect(() => assertPopulationSample({
      rollover: 1, total: 6008, minor: 4612, major: 850, unassigned: 546,
      bytes: 10, entrants: 641, exits: 41, draftEntrants: 639, ifaEntrants: 2,
      marketAtEntry: 10, marketAfterPhase: 5,
    }, { total: 5408, minor: 4512, major: 896, unassigned: 0, bytes: 1 })).toThrow(/Draft entrant/);
    expect(() => assertRolloverFlow(
      { total: 5408, minor: 4512, major: 896, unassigned: 0, bytes: 1 },
      { rollover: 1, total: 6008, minor: 4612, major: 850, unassigned: 546, bytes: 10, entrants: 641, exits: 41, draftEntrants: 640, ifaEntrants: 1, marketAtEntry: 10, marketAfterPhase: 5 },
    )).not.toThrow();
  });

  it('enforces every frozen finite boundary and cumulative total scaling', () => {
    const annualBands: Array<[string, readonly [number, number]]> = [
      ['initial total', ECON_CLOCK_BANDS.initial.total],
      ['initial minor', ECON_CLOCK_BANDS.initial.minor],
      ['initial major', ECON_CLOCK_BANDS.initial.major],
      ['initial unassigned', ECON_CLOCK_BANDS.initial.unassigned],
      ['annual total growth', ECON_CLOCK_BANDS.annual.totalGrowth],
      ['minor absolute', ECON_CLOCK_BANDS.annual.minorAbsolute],
      ['major absolute', ECON_CLOCK_BANDS.annual.majorAbsolute],
      ['unassigned absolute', ECON_CLOCK_BANDS.annual.unassignedAbsolute],
      ['entrants', ECON_CLOCK_BANDS.annual.entrants],
      ['exits', ECON_CLOCK_BANDS.annual.exits],
      ['market at entry', ECON_CLOCK_BANDS.annual.marketAtEntry],
      ['market after phase', ECON_CLOCK_BANDS.annual.marketAfterPhase],
    ];
    for (const [label, band] of annualBands) {
      expect(() => assertEconomyBand(band[0], band, label)).not.toThrow();
      expect(() => assertEconomyBand(band[1], band, label)).not.toThrow();
      expect(() => assertEconomyBand(band[0] - 1, band, label)).toThrow();
      expect(() => assertEconomyBand(band[1] + 1, band, label)).toThrow();
    }

    for (const metric of ['total', 'minor', 'major', 'unassigned', 'bytes'] as const) {
      const bands = ECON_CLOCK_BANDS.slope[metric];
      for (const key of ['first', 'second', 'curvature'] as const) {
        const band = bands[key];
        expect(() => assertEconomyBand(band[0], band, `${metric} ${key}`)).not.toThrow();
        expect(() => assertEconomyBand(band[1], band, `${metric} ${key}`)).not.toThrow();
        expect(() => assertEconomyBand(band[0] - 1, band, `${metric} ${key}`)).toThrow();
        expect(() => assertEconomyBand(band[1] + 1, band, `${metric} ${key}`)).toThrow();
      }
    }

    const baseline = { total: 5408, minor: 4512, major: 896, unassigned: 0, bytes: 1 };
    const lowerCumulative = {
      rollover: 6, total: 8570, minor: 4199, major: 540, unassigned: 3831,
      bytes: 10, entrants: 640, exits: 6, draftEntrants: 640, ifaEntrants: 0,
      marketAtEntry: 1, marketAfterPhase: 0,
    };
    const upperCumulative = {
      ...lowerCumulative, total: 9242, minor: 5675, major: 134, unassigned: 3433,
      entrants: 656, exits: 120, draftEntrants: 640, ifaEntrants: 16,
      marketAtEntry: 1089, marketAfterPhase: 1047,
    };
    expect(() => assertPopulationSample(lowerCumulative, baseline)).not.toThrow();
    expect(() => assertPopulationSample(upperCumulative, baseline)).not.toThrow();
    expect(() => assertPopulationSample({ ...lowerCumulative, total: 8569, unassigned: 3830 }, baseline))
      .toThrow(/total/);
    expect(() => assertPopulationSample({ ...upperCumulative, total: 9243, unassigned: 3434 }, baseline))
      .toThrow(/total/);

    expect(() => assertSlopeBands('major', { first: -192, second: -64, curvature: 96 })).not.toThrow();
    expect(() => assertSlopeBands('major', { first: -193, second: -64, curvature: 96 })).toThrow(/first-half/);
    expect(() => assertSlopeBands('unassigned', { first: 685, second: 380, curvature: -323 })).not.toThrow();
    expect(() => assertSlopeBands('unassigned', { first: 685, second: 381, curvature: -323 })).toThrow(/second-half/);
    expect(() => assertSlopeBands('unassigned', { first: 685, second: 380, curvature: -322 })).toThrow(/curvature/);
  });

  it('kills the deliberate double-clock and unreleased-entry mutants', () => {
    expect(() => assertNoDoubleClock([{ id: 'clock', years: 1 }], [{ id: 'clock', years: 0 }]))
      .toThrow(/Double-clock/);
    const released = { id: 'entrant', teamId: '' };
    expect(() => assertCapturedEntrantsCanonical([{ id: 'entrant', teamId: 'nym' }], new Map([['entrant', released]])))
      .toThrow(/released canonical/);

    expect(() => assertNoDoubleClock([{ id: 'clock', years: 1 }], [{ id: 'clock', years: 1 }])).not.toThrow();
    expect(() => assertCapturedEntrantsCanonical([released], new Map([['entrant', released]]))).not.toThrow();
  });

  it('kills duplicate/misattributed option, entrant, assignment, and invariant mutants', () => {
    expect(() => assertOptionPartition(['option'], ['option'], ['option'])).toThrow(/Invalid .* option/);
    expect(() => assertEntrantAttribution(['draft'], ['draft'], ['draft'])).toThrow(/overlap/);
    expect(() => assertAssignmentAttribution(['moved'], [])).toThrow(/Unexpected assignment/);
    expect(() => assertNoNewInvariantCategory(['active_roster_under_limit'], ['two_team_player']))
      .toThrow(/New roster invariant/);
    expect(() => assertExactIdSet(['a'], ['b'], 'ids')).toThrow(/missing/);

    expect(() => assertOptionPartition(['exercise', 'decline'], ['exercise'], ['decline'])).not.toThrow();
    expect(() => assertEntrantAttribution(['draft', 'ifa'], ['draft'], ['ifa'])).not.toThrow();
    expect(() => assertAssignmentAttribution(['signed'], ['signed'])).not.toThrow();
    expect(() => assertNoNewInvariantCategory(['active_roster_under_limit'], ['active_roster_under_limit'])).not.toThrow();
    expect(() => assertExactIdSet(['a'], ['a'], 'ids')).not.toThrow();
  });

  it('kills omitted day-one signed entrants and duplicate market-union membership', () => {
    expect(() => assertFreeAgencyEntryUnion(['remaining'], [], ['remaining', 'signed']))
      .toThrow(/does not equal/);
    expect(() => assertFreeAgencyEntryUnion(['entrant'], ['entrant'], ['entrant']))
      .toThrow(/both remaining and signed/);

    expect(() => assertFreeAgencyEntryUnion(['remaining'], ['signed'], ['remaining', 'signed']))
      .not.toThrow();
  });

  it('measurement mode skips only disputed calibration ceilings and keeps exact gates active', () => {
    const baseline = { total: 5408, minor: 4512, major: 896, unassigned: 0, bytes: 1 };
    const measured = {
      rollover: 1,
      total: 6008,
      minor: 4509,
      major: 850,
      unassigned: 649,
      bytes: 10,
      entrants: 641,
      exits: 41,
      draftEntrants: 640,
      ifaEntrants: 1,
      marketAtEntry: 100,
      marketAfterPhase: 20,
    };
    const measurementOptions = {
      skipAssignmentPartitionBands: true,
      skipMarketEntryUpperBand: true,
      skipMarketAfterPhaseUpperBand: true,
    };
    const ordinaryMeasured = { ...measured, minor: 4612, major: 850, unassigned: 546 };
    const overPostPhaseBand = ECON_CLOCK_BANDS.annual.marketAfterPhase[1] + 1;
    expect(() => assertPopulationSample(measured, baseline, measurementOptions))
      .not.toThrow();
    expect(() => assertPopulationSample({ ...ordinaryMeasured, marketAfterPhase: overPostPhaseBand }, baseline))
      .toThrow(/market after phase/);
    expect(() => assertPopulationSample({ ...measured, marketAfterPhase: overPostPhaseBand }, baseline, measurementOptions))
      .not.toThrow();
    expect(() => assertPopulationSample({ ...measured, marketAfterPhase: -1 }, baseline, measurementOptions))
      .toThrow(/market after phase/);
    expect(() => assertPopulationSample({ ...measured, total: 7000 }, baseline, measurementOptions))
      .toThrow(/total/);
    expect(() => assertPopulationSample({ ...measured, unassigned: 648 }, baseline, measurementOptions))
      .toThrow(/conservation/);
    expect(() => assertPopulationSample({ ...measured, draftEntrants: 639, ifaEntrants: 2 }, baseline, measurementOptions))
      .toThrow(/Draft entrant/);
    expect(() => assertPopulationSample({
      ...measured,
      marketAtEntry: ECON_CLOCK_BANDS.annual.marketAtEntry[1] + 1,
    }, baseline, {
      skipAssignmentPartitionBands: true,
      skipMarketAfterPhaseUpperBand: true,
    }))
      .toThrow(/market/);
    expect(() => assertPopulationSample({ ...measured, marketAfterPhase: overPostPhaseBand }, baseline, {
      skipAssignmentPartitionBands: true,
      skipMarketEntryUpperBand: true,
    })).toThrow(/market after phase/);

    const before = new Map([
      ['promoted', 'minor' as const],
      ['released', 'minor' as const],
      ['retired', 'major' as const],
    ]);
    const after = new Map([
      ['promoted', 'major' as const],
      ['released', 'unassigned' as const],
      ['entrant', 'minor' as const],
    ]);
    const summary = buildEconomyTransitionSummary(before, after);
    expect(summary.transitions.minor.major).toBe(1);
    expect(summary.transitions.minor.unassigned).toBe(1);
    expect(summary.transitions.major.absent).toBe(1);
    expect(summary.transitions.absent.minor).toBe(1);
    expect(() => assertEconomyTransitionEquations(before, after, summary)).not.toThrow();

    const broken = structuredClone(summary);
    broken.transitions.minor.major = 0;
    expect(() => assertEconomyTransitionEquations(before, after, broken)).toThrow(/transition equation/);
  });

  it('kills false carryover, unattributed, signed-reuse, duplicate, and broken recurrence mutants', () => {
    const baseRow = {
      playerId: 'carry',
      primaryCohort: 'unsigned_carryover' as const,
      priorLevel: 'unassigned' as const,
      priorYears: 0,
      clockReason: 'none' as const,
      qoStatus: 'none' as const,
      priorMarketRollover: 1,
      consecutiveEntryCount: 2,
      wasPriorSigned: false,
    };
    expect(() => assertEconomyMarketCohorts(['carry'], [baseRow], new Set(['carry']), 1)).not.toThrow();
    expect(() => assertEconomyMarketCohorts(['carry'], [baseRow], new Set(), 1)).toThrow(/False market carryover/);
    expect(() => assertEconomyMarketCohorts(['carry', 'carry'], [baseRow], new Set(['carry']), 1)).toThrow(/Duplicate/);
    expect(() => assertEconomyMarketCohorts(['unknown'], [{
      ...baseRow,
      playerId: 'unknown',
      primaryCohort: 'unattributed',
      priorMarketRollover: null,
    }], new Set(), 0)).toThrow(/Unattributed/);
    expect(() => assertEconomyMarketCohorts(['signed'], [{
      ...baseRow,
      playerId: 'signed',
      primaryCohort: 'existing_zero_assigned',
      priorLevel: 'MLB',
      priorMarketRollover: null,
      consecutiveEntryCount: 1,
      wasPriorSigned: true,
    }], new Set(), 0)).toThrow(/recurred/);
    expect(() => assertEconomyMarketCohorts(['carry'], [baseRow], new Set(['carry']), 0))
      .toThrow(/growth exceeds/);

    expect(() => assertPopulationSample({
      rollover: 3,
      total: 7008,
      minor: 4509,
      major: 850,
      unassigned: 1649,
      bytes: 10,
      entrants: 641,
      exits: 41,
      draftEntrants: 640,
      ifaEntrants: 1,
      marketAtEntry: 923,
      marketAfterPhase: 100,
    }, { total: 5408, minor: 4512, major: 896, unassigned: 0, bytes: 1 }, {
      skipAssignmentPartitionBands: true,
      skipMarketEntryUpperBand: true,
    })).not.toThrow();
  });

  it.each([
    ['NYM AAA → NYM MLB with AUTO', {
      playerId: 'auto', beforeTeamId: 'nym', afterTeamId: 'nym', beforeLevel: 'AAA', afterLevel: 'MLB',
      autoPromotion: { teamId: 'nym', fromLevel: 'AAA', toLevel: 'MLB', timestamp: 'AUTO' },
    }, 'autofill'],
    ['unassigned → NYM with fake AUTO', {
      playerId: 'fake-auto', beforeTeamId: '', afterTeamId: 'nym', beforeLevel: 'INTERNATIONAL', afterLevel: 'MLB',
      autoPromotion: { teamId: 'nym', fromLevel: 'AAA', toLevel: 'MLB', timestamp: 'AUTO' },
    }, 'reject'],
    ['NYM A+ → BOS without Rule 5', {
      playerId: 'missing-rule5', beforeTeamId: 'nym', afterTeamId: 'bos', beforeLevel: 'A_PLUS', afterLevel: 'MLB',
    }, 'reject'],
    ['NYM A+ → BOS with exact Rule 5', {
      playerId: 'rule5', beforeTeamId: 'nym', afterTeamId: 'bos', beforeLevel: 'A_PLUS', afterLevel: 'MLB',
      rule5Selection: { originalTeamId: 'nym', draftingTeamId: 'bos' },
      rule5Obligation: { originalTeamId: 'nym', draftingTeamId: 'bos' },
    }, 'rule5'],
    ['NYM → unassigned with fake AUTO', {
      playerId: 'release', beforeTeamId: 'nym', afterTeamId: '', beforeLevel: 'AAA', afterLevel: 'INTERNATIONAL',
      autoPromotion: { teamId: 'nym', fromLevel: 'AAA', toLevel: 'MLB', timestamp: 'AUTO' },
    }, 'reject'],
    ['NYM → BOS with mismatched Rule 5 destination', {
      playerId: 'wrong-rule5', beforeTeamId: 'nym', afterTeamId: 'bos', beforeLevel: 'A_PLUS', afterLevel: 'MLB',
      rule5Selection: { originalTeamId: 'nym', draftingTeamId: 'chc' },
      rule5Obligation: { originalTeamId: 'nym', draftingTeamId: 'chc' },
    }, 'reject'],
  ])('%s', (_label, evidence, expected) => {
    if (expected === 'reject') {
      expect(() => classifyEconomyAssignmentEvidence(evidence)).toThrow();
    } else {
      expect(classifyEconomyAssignmentEvidence(evidence)).toBe(expected);
    }
  });

  const draftRule5 = {
    playerId: 'draft-rule5',
    originalTeamId: 'nym',
    currentSeason: 5,
    draftResults: [{ playerId: 'draft-rule5', teamId: 'nym' }],
    ifaResults: [],
    candidateRows: [{
      playerId: 'draft-rule5', teamId: 'nym', rosterStatus: 'ROOKIE', rule5EligibleAfterSeason: 5,
    }],
  };

  it('requires exact current-draft and candidate provenance for same-rollover Rule 5 selections', () => {
    expect(classifyEconomyRule5Provenance(draftRule5)).toBe('same_rollover_draft');
    expect(classifyEconomyRule5Provenance({
      ...draftRule5,
      rolloverStartTeamId: 'nym',
      draftResults: [],
    })).toBe('rollover_start');

    expect(() => classifyEconomyRule5Provenance({ ...draftRule5, draftResults: [] })).toThrow(/draft provenance/);
    expect(() => classifyEconomyRule5Provenance({
      ...draftRule5,
      draftResults: [{ playerId: 'draft-rule5', teamId: 'bos' }],
    })).toThrow(/draft provenance/);
    expect(() => classifyEconomyRule5Provenance({
      ...draftRule5,
      candidateRows: [{
        playerId: 'draft-rule5', teamId: 'bos', rosterStatus: 'ROOKIE', rule5EligibleAfterSeason: 5,
      }],
    })).toThrow(/candidate provenance/);
    expect(() => classifyEconomyRule5Provenance({
      ...draftRule5,
      candidateRows: [{
        playerId: 'draft-rule5', teamId: 'nym', rosterStatus: 'ROOKIE', rule5EligibleAfterSeason: 6,
      }],
    })).toThrow(/candidate provenance/);
    expect(() => classifyEconomyRule5Provenance({
      ...draftRule5,
      draftResults: [],
      ifaResults: [{ playerId: 'draft-rule5', teamId: 'nym' }],
    })).toThrow(/IFA provenance/);
    expect(() => classifyEconomyRule5Provenance({
      ...draftRule5,
      draftResults: [...draftRule5.draftResults, ...draftRule5.draftResults],
    })).toThrow(/draft provenance/);
    expect(() => classifyEconomyRule5Provenance({
      ...draftRule5,
      candidateRows: [...draftRule5.candidateRows, ...draftRule5.candidateRows],
    })).toThrow(/exactly one candidate/);
  });

  const rosterCheckpoint = (checkpoint: string, ids: string[]) => ({
    checkpoint,
    mlbIds: ids,
    fortyManIds: ids,
  });
  const canonical = (teamId: string, ids: string[]) => new Map(ids.map((id) => [id, teamId]));
  const rosterRow = (playerId: string, cause: 'rule5_in' | 'goal11_fa_signing' | 'final_normalization_demotion') => ({
    playerId,
    teamId: 'nym',
    direction: 'in' as const,
    cause,
    evidenceId: playerId,
    fromCheckpoint: 'start',
    toCheckpoint: 'final',
  });

  it('separates adjacent Rule 5 overages from Goal-11-caused roster regressions', () => {
    const start26 = Array.from({ length: 26 }, (_, index) => `p${index}`);
    const start28 = Array.from({ length: 28 }, (_, index) => `p${index}`);
    const rule5Final = [...start26, 'rule5'];
    expect(auditEconomyTeamRoster({
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start26), rosterCheckpoint('final', rule5Final)],
      rows: [rosterRow('rule5', 'rule5_in')],
      evidenceByCause: { rule5_in: ['rule5'] },
      canonicalFinalTeamById: canonical('nym', rule5Final),
    }).overLimitClassification).toBe('adjacent');

    expect(() => auditEconomyTeamRoster({
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start26), rosterCheckpoint('final', [...start26, 'fa'])],
      rows: [rosterRow('fa', 'goal11_fa_signing')],
      evidenceByCause: { goal11_fa_signing: ['fa'] },
      canonicalFinalTeamById: canonical('nym', [...start26, 'fa']),
    })).toThrow(/Goal 11 caused or worsened/);

    expect(auditEconomyTeamRoster({
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start28), rosterCheckpoint('final', start28)],
      rows: [],
      evidenceByCause: {},
      canonicalFinalTeamById: canonical('nym', start28),
    }).overLimitClassification).toBe('adjacent');

    expect(() => auditEconomyTeamRoster({
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start28), rosterCheckpoint('final', [...start28, 'fa'])],
      rows: [rosterRow('fa', 'goal11_fa_signing')],
      evidenceByCause: { goal11_fa_signing: ['fa'] },
      canonicalFinalTeamById: canonical('nym', [...start28, 'fa']),
    })).toThrow(/Goal 11 caused or worsened/);
  });

  it('fails fake evidence, duplicates, wrong canonical ownership, and set/count substitution', () => {
    const start = ['a'];
    const final = ['a', 'b'];
    const base = {
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start), rosterCheckpoint('final', final)],
      rows: [rosterRow('b', 'rule5_in')],
      evidenceByCause: { rule5_in: ['b'] },
      canonicalFinalTeamById: canonical('nym', final),
    };
    expect(() => auditEconomyTeamRoster({ ...base, evidenceByCause: {} })).toThrow(/lacks exact/);
    expect(() => auditEconomyTeamRoster({
      ...base,
      checkpoints: [rosterCheckpoint('start', ['a', 'a']), rosterCheckpoint('final', final)],
    })).toThrow(/duplicate MLB/);
    expect(() => auditEconomyTeamRoster({
      ...base,
      canonicalFinalTeamById: new Map([['a', 'nym']]),
    })).toThrow(/missing or points to the wrong team/);
    expect(() => auditEconomyTeamRoster({
      ...base,
      checkpoints: [rosterCheckpoint('start', ['x']), rosterCheckpoint('final', final)],
    })).toThrow(/roster delta/);
  });

  it('accepts only evidence-backed adjacent final normalization demotions', () => {
    const start = Array.from({ length: 31 }, (_, index) => `p${index}`);
    const final = start.slice(1);
    expect(auditEconomyTeamRoster({
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start), rosterCheckpoint('final', final)],
      rows: [{ ...rosterRow('p0', 'final_normalization_demotion'), direction: 'out' }],
      evidenceByCause: { final_normalization_demotion: ['p0'] },
      canonicalFinalTeamById: canonical('nym', final),
    }).overLimitClassification).toBe('adjacent');
    expect(() => auditEconomyTeamRoster({
      teamId: 'nym',
      checkpoints: [rosterCheckpoint('start', start), rosterCheckpoint('final', final)],
      rows: [{ ...rosterRow('p0', 'final_normalization_demotion'), direction: 'out' }],
      evidenceByCause: {},
      canonicalFinalTeamById: canonical('nym', final),
    })).toThrow(/lacks exact/);
  });
});
