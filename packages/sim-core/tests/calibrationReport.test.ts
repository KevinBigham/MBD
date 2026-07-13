import { describe, expect, it } from 'vitest';
import {
  buildCalibrationReport,
  renderCalibrationJson,
  renderCalibrationMarkdown,
  summarizeOnboardingBalanceSample,
} from '../src/index.js';

const REPORT_CONFIG = {
  seed: 44_001,
  seasonCount: 1,
};

const WORKER_SAMPLE = {
  seed: 88_001,
  seasonCount: 1,
  seasons: [
    {
      season: 1,
      activeInjuriesAtPlayoffStart: 72,
      injuredPlayers: 80,
      gamesMissedToInjury: 1200,
      regularSeasonTrades: 14,
      deadlineTrades: 5,
      freeAgentSignings: 22,
      meaningfulFreeAgentSignings: 4,
      topFreeAgentAav: 31.5,
      freeAgencyMarketSize: 112,
      naturalContractExpiries: 44,
      offseasonAssignmentChurn: 61,
      acceptedExtensions: 16,
      rejectedExtensions: 9,
      averageProspectProgress: 8.4,
      aheadOfCurveReports: 42,
      bustRiskReports: 3,
      activeDevelopmentSetbacks: 11,
      playoffTeams: 12,
      championSeed: 3,
      lowerSeedSeriesWins: 4,
    },
  ],
};

const MULTI_SEED_WORKER_SAMPLE = {
  seed: 88_001,
  seeds: [88_001, 88_002],
  seasonCount: 2,
  seasonsPerSeed: 1,
  seasons: [
    WORKER_SAMPLE.seasons[0],
    {
      ...WORKER_SAMPLE.seasons[0],
      seed: 88_002,
      regularSeasonTrades: 18,
      deadlineTrades: 7,
      freeAgentSignings: 18,
      meaningfulFreeAgentSignings: 8,
      topFreeAgentAav: 28.5,
      freeAgencyMarketSize: 126,
      naturalContractExpiries: 51,
      offseasonAssignmentChurn: 73,
      acceptedExtensions: 20,
      averageProspectProgress: 10.4,
      championSeed: 5,
      lowerSeedSeriesWins: 6,
    },
  ],
};

const ONBOARDING_BALANCE_SAMPLE = {
  seed: 12_701,
  seasonCount: 1,
  variants: [
    {
      variantId: 'balanced_reference',
      assistantGMId: 'walt_kowalski',
      developmentStyle: 'balanced',
      scoutingFocus: 'draft',
      baseline: {
        ownerTrust: 55,
        ownerPressure: 48,
        fanSentiment: 50,
        frontOfficeReputation: 52,
        frontOfficeTrade: 54,
        frontOfficeDraft: 57,
        freeAgentAppeal: 62,
        avgProspectProgress: 5,
        aheadOfCurveReports: 8,
        bustRiskReports: 2,
        activeDevelopmentSetbacks: 1,
        draftAccuracy: 0.72,
        internationalAccuracy: 0.64,
        proAccuracy: 0.66,
        focusedScoutingAccuracy: 0.72,
        offLaneScoutingAccuracy: 0.65,
        monthlyConsequenceCount: 0,
      },
      seasons: [],
      final: {
        ownerTrust: 64,
        ownerPressure: 50,
        fanSentiment: 55,
        frontOfficeReputation: 60,
        frontOfficeTrade: 58,
        frontOfficeDraft: 61,
        freeAgentAppeal: 70,
        avgProspectProgress: 8,
        aheadOfCurveReports: 14,
        bustRiskReports: 2,
        activeDevelopmentSetbacks: 2,
        draftAccuracy: 0.74,
        internationalAccuracy: 0.64,
        proAccuracy: 0.66,
        focusedScoutingAccuracy: 0.74,
        offLaneScoutingAccuracy: 0.65,
        monthlyConsequenceCount: 5,
      },
    },
    {
      variantId: 'marcus_win_now',
      assistantGMId: 'marcus_chen',
      developmentStyle: 'aggressive',
      scoutingFocus: 'pro_scouting',
      baseline: {
        ownerTrust: 58,
        ownerPressure: 68,
        fanSentiment: 57,
        frontOfficeReputation: 56,
        frontOfficeTrade: 62,
        frontOfficeDraft: 51,
        freeAgentAppeal: 68,
        avgProspectProgress: 6,
        aheadOfCurveReports: 9,
        bustRiskReports: 3,
        activeDevelopmentSetbacks: 1,
        draftAccuracy: 0.66,
        internationalAccuracy: 0.7,
        proAccuracy: 0.78,
        focusedScoutingAccuracy: 0.78,
        offLaneScoutingAccuracy: 0.68,
        monthlyConsequenceCount: 0,
      },
      seasons: [],
      final: {
        ownerTrust: 72,
        ownerPressure: 72,
        fanSentiment: 66,
        frontOfficeReputation: 68,
        frontOfficeTrade: 70,
        frontOfficeDraft: 55,
        freeAgentAppeal: 80,
        avgProspectProgress: 12,
        aheadOfCurveReports: 20,
        bustRiskReports: 2,
        activeDevelopmentSetbacks: 2,
        draftAccuracy: 0.68,
        internationalAccuracy: 0.7,
        proAccuracy: 0.8,
        focusedScoutingAccuracy: 0.8,
        offLaneScoutingAccuracy: 0.69,
        monthlyConsequenceCount: 6,
      },
    },
    {
      variantId: 'elena_rebuild',
      assistantGMId: 'elena_vargas',
      developmentStyle: 'patient',
      scoutingFocus: 'international',
      baseline: {
        ownerTrust: 50,
        ownerPressure: 38,
        fanSentiment: 45,
        frontOfficeReputation: 50,
        frontOfficeTrade: 46,
        frontOfficeDraft: 62,
        freeAgentAppeal: 56,
        avgProspectProgress: 4,
        aheadOfCurveReports: 7,
        bustRiskReports: 1,
        activeDevelopmentSetbacks: 0,
        draftAccuracy: 0.7,
        internationalAccuracy: 0.76,
        proAccuracy: 0.7,
        focusedScoutingAccuracy: 0.76,
        offLaneScoutingAccuracy: 0.7,
        monthlyConsequenceCount: 0,
      },
      seasons: [],
      final: {
        ownerTrust: 58,
        ownerPressure: 40,
        fanSentiment: 49,
        frontOfficeReputation: 55,
        frontOfficeTrade: 48,
        frontOfficeDraft: 66,
        freeAgentAppeal: 63,
        avgProspectProgress: 7,
        aheadOfCurveReports: 13,
        bustRiskReports: 1,
        activeDevelopmentSetbacks: 1,
        draftAccuracy: 0.7,
        internationalAccuracy: 0.79,
        proAccuracy: 0.7,
        focusedScoutingAccuracy: 0.79,
        offLaneScoutingAccuracy: 0.7,
        monthlyConsequenceCount: 5,
      },
    },
  ],
};

describe('calibration report dashboard', () => {
  it('builds a deterministic report with target bands and explicit follow-up gaps', () => {
    const first = buildCalibrationReport(REPORT_CONFIG);
    const second = buildCalibrationReport(REPORT_CONFIG);

    expect(second).toEqual(first);
    expect(first.summary.seed).toBe(REPORT_CONFIG.seed);
    expect(first.summary.seasonCount).toBe(REPORT_CONFIG.seasonCount);

    const bandKeys = first.bandResults.map((band) => band.key);
    expect(bandKeys).toEqual([
      'schedule.average_team_wins',
      'run_environment.average_runs_per_game',
      'run_environment.batting_average',
      'run_environment.league_era',
      'run_environment.league_home_runs',
      'finance.average_total_mlb_payroll',
      'finance.average_mlb_salary',
      'finance.average_mlb_payroll_spread',
      'war_distribution.five_war_players',
      'war_distribution.eight_war_players',
    ]);
    expect(first.bandResults.every((band) => band.status !== 'unmeasured')).toBe(true);
    expect(first.summary).toHaveProperty('averageMlbPayrollSpread');
    expect(first.summary.seasons[0]).toHaveProperty('mlbPayrollSpread');

    expect(first.followUps.map((followUp) => followUp.key)).toEqual([
      'injuries',
      'trades',
      'free_agent_signings',
      'extensions',
      'prospects',
      'playoff_variance',
    ]);
    expect(first.followUps.every((followUp) => followUp.status === 'unmeasured')).toBe(true);
  }, 15_000);

  it('keeps the default core calibration sample inside every measured target band', () => {
    const report = buildCalibrationReport(REPORT_CONFIG);

    expect(report.bandResults.map((band) => [band.key, band.status, band.value])).toEqual(
      report.bandResults.map((band) => [band.key, 'pass', band.value]),
    );
  }, 15_000);

  it('renders paired markdown and JSON output for the calibration command', () => {
    const report = buildCalibrationReport(REPORT_CONFIG);
    const markdown = renderCalibrationMarkdown(report);
    const json = JSON.parse(renderCalibrationJson(report));

    expect(markdown).toContain('## Target Bands');
    expect(markdown).toContain('| Metric | Value | Target | Status |');
    expect(markdown).toContain('League home runs');
    expect(markdown).toContain('League ERA');
    expect(markdown).toContain('Average MLB payroll spread');
    expect(markdown).toContain('## Follow-up Metrics Not Yet Measured');
    expect(markdown).toContain('Free-agent signings');

    expect(json.summary).toEqual(report.summary);
    expect(json.bandResults).toEqual(report.bandResults);
    expect(json.followUps).toEqual(report.followUps);
  }, 15_000);

  it('compares multi-season home-run output against a per-season target band', () => {
    const report = buildCalibrationReport({
      seed: REPORT_CONFIG.seed,
      seasonCount: 2,
    });
    const totalSeasonHomeRuns = report.summary.seasons.reduce(
      (sum, season) => sum + season.leagueHomeRuns,
      0,
    );

    expect(report.summary.leagueHomeRuns).toBe(
      Math.round(totalSeasonHomeRuns / report.summary.seasons.length),
    );
    expect(report.summary.leagueHomeRuns).toBeLessThan(totalSeasonHomeRuns);
  }, 15_000);

  it('includes measured worker and offseason metrics when a worker sample is attached', () => {
    const report = buildCalibrationReport(REPORT_CONFIG, {
      workerSample: WORKER_SAMPLE,
    });
    const markdown = renderCalibrationMarkdown(report);
    const json = JSON.parse(renderCalibrationJson(report));

    expect(report.workerSample).toEqual(WORKER_SAMPLE);
    expect(report.followUps).toEqual([]);
    expect(markdown).toContain('## Worker and Offseason Sample');
    expect(markdown).toContain('FA signings');
    expect(markdown).toContain('Lower-seed series wins');
    expect(json.workerSample).toEqual(WORKER_SAMPLE);
  }, 15_000);

  it('adds worker target-band results for measured offseason and playoff metrics', () => {
    const report = buildCalibrationReport(REPORT_CONFIG, {
      workerSample: WORKER_SAMPLE,
    });
    const markdown = renderCalibrationMarkdown(report);
    const json = JSON.parse(renderCalibrationJson(report));

    expect(report.workerBandResults.map((band) => band.key)).toEqual([
      'worker.injured_players',
      'worker.games_missed_to_injury',
      'worker.active_injuries_at_playoff_start',
      'worker.regular_season_trades',
      'worker.deadline_trades',
      'worker.free_agent_signings',
      'worker.meaningful_free_agent_signings',
      'worker.top_free_agent_aav',
      'worker.free_agency_market_size',
      'worker.accepted_extensions',
      'worker.average_prospect_progress',
      'worker.ahead_of_curve_reports',
      'worker.bust_risk_reports',
      'worker.active_development_setbacks',
      'worker.playoff_teams',
      'worker.champion_seed',
      'worker.lower_seed_series_wins',
    ]);
    expect(report.workerBandResults.every((band) => band.status === 'pass')).toBe(true);
    expect(report.workerBandResults.find((band) => band.key === 'worker.regular_season_trades')?.value).toBe(14);
    expect(report.workerBandResults.find((band) => band.key === 'worker.top_free_agent_aav')?.value).toBe(31.5);
    expect(report.workerBandResults.find((band) => band.key === 'worker.free_agency_market_size')?.value).toBe(112);
    expect(report.workerBandResults.find((band) => band.key === 'worker.ahead_of_curve_reports')?.value).toBe(42);
    expect(report.workerBandResults.find((band) => band.key === 'worker.bust_risk_reports')?.value).toBe(3);
    expect(report.workerBandResults.find((band) => band.key === 'worker.active_development_setbacks')?.value).toBe(11);

    expect(markdown).toContain('## Worker Target Bands');
    expect(markdown).toContain('Deadline trades');
    expect(markdown).toContain('Ahead-of-curve reports');
    expect(markdown).toContain('Active development setbacks');
    expect(markdown).toContain('Lower-seed series wins');
    expect(markdown).toContain('Natural contract expiries');
    expect(json.workerBandResults).toEqual(report.workerBandResults);
  }, 15_000);

  it('enforces the frozen Goal-11 free-agency market boundary inclusively', () => {
    const atBoundary = buildCalibrationReport(REPORT_CONFIG, {
      workerSample: {
        ...WORKER_SAMPLE,
        seasons: [{ ...WORKER_SAMPLE.seasons[0], freeAgencyMarketSize: 1089 }],
      },
    }).workerBandResults.find((band) => band.key === 'worker.free_agency_market_size');
    const overBoundary = buildCalibrationReport(REPORT_CONFIG, {
      workerSample: {
        ...WORKER_SAMPLE,
        seasons: [{ ...WORKER_SAMPLE.seasons[0], freeAgencyMarketSize: 1090 }],
      },
    }).workerBandResults.find((band) => band.key === 'worker.free_agency_market_size');

    expect(atBoundary).toMatchObject({ min: 1, max: 1089, value: 1089, status: 'pass' });
    expect(overBoundary).toMatchObject({ min: 1, max: 1089, value: 1090, status: 'fail' });
  });

  it('renders multi-seed worker samples and averages worker target bands', () => {
    const report = buildCalibrationReport(REPORT_CONFIG, {
      workerSample: MULTI_SEED_WORKER_SAMPLE,
    });
    const markdown = renderCalibrationMarkdown(report);
    const json = JSON.parse(renderCalibrationJson(report));

    expect(report.workerBandResults.find((band) => band.key === 'worker.regular_season_trades')?.value).toBe(16);
    expect(report.workerBandResults.find((band) => band.key === 'worker.deadline_trades')?.value).toBe(6);
    expect(report.workerBandResults.find((band) => band.key === 'worker.free_agency_market_size')?.value).toBe(119);
    expect(markdown).toContain('Seeds 88001, 88002, 2 total seasons (1 per seed).');
    expect(markdown).toContain('| Seed | Season | Injured players |');
    expect(markdown).toContain('| 88002 | 1 | 80 |');
    expect(json.workerSample).toEqual(MULTI_SEED_WORKER_SAMPLE);
  }, 15_000);

  it('summarizes and renders onboarding balance samples separately from global worker output', () => {
    const summary = summarizeOnboardingBalanceSample(ONBOARDING_BALANCE_SAMPLE);
    const report = buildCalibrationReport(REPORT_CONFIG, {
      onboardingBalanceSample: ONBOARDING_BALANCE_SAMPLE,
    });
    const markdown = renderCalibrationMarkdown(report);
    const json = JSON.parse(renderCalibrationJson(report));

    expect(summary).toMatchObject({
      seed: 12_701,
      seasonCount: 1,
      variantCount: 3,
      baselineFanSentimentRange: 12,
      finalOwnerTrustRange: 14,
      finalFrontOfficeReputationRange: 13,
      finalFreeAgentAppealRange: 17,
      finalAvgProspectProgressRange: 5,
      averageOwnerTrustDelta: 10.33,
      averageFanSentimentDelta: 6,
      averageFrontOfficeReputationDelta: 8.33,
      averageFreeAgentAppealDelta: 9,
      averageProspectProgressDelta: 4,
      averageFocusedScoutingLift: 0.097,
      aggressiveVsPatientProspectProgressDelta: 5,
      minMonthlyConsequenceCount: 5,
      maxMonthlyConsequenceCount: 6,
    });
    expect(report.onboardingBalanceSummary).toEqual(summary);
    expect(markdown).toContain('## Onboarding Balance Sample');
    expect(markdown).toContain('Day One baseline fan sentiment range');
    expect(markdown).toContain('Aggressive vs patient prospect progress delta');
    expect(markdown).toContain('| balanced_reference | balanced | draft | 55 | 64 | 8.00 | 5 |');
    expect(json.onboardingBalanceSample).toEqual(ONBOARDING_BALANCE_SAMPLE);
    expect(json.onboardingBalanceSummary).toEqual(summary);
  }, 15_000);
});
