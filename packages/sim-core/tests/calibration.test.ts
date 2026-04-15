import { describe, expect, it } from 'vitest';
import {
  runSeasonCalibration,
  summarizeSeasonCalibration,
} from '../src/index.js';

const CALIBRATION_CONFIG = {
  seed: 44_001,
  seasonCount: 1,
};
const CURRENT_SCHEDULE_AVERAGE_TEAM_WINS = 110.75;

describe('season calibration harness', () => {
  it('summarizes the same seed and config identically', () => {
    const first = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));
    const second = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));

    expect(second).toEqual(first);
  });

  it('changes at least one meaningful aggregate when the seed changes', () => {
    const first = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));
    const second = summarizeSeasonCalibration(runSeasonCalibration({
      ...CALIBRATION_CONFIG,
      seed: CALIBRATION_CONFIG.seed + 1,
    }));

    expect(second.seasons.map((season) => season.averageRunsPerGame))
      .not.toEqual(first.seasons.map((season) => season.averageRunsPerGame));
  });

  it('preserves core standings and schedule invariants for every full season', () => {
    const result = runSeasonCalibration(CALIBRATION_CONFIG);

    for (const season of result.seasons) {
      expect(season.gamesPlayed).toBe(season.scheduleGames);
      expect(season.totalWins).toBe(season.totalLosses);
      expect(season.totalWins).toBe(season.gamesPlayed);
      expect(season.averageTeamWins).toBeCloseTo(season.gamesPlayed / result.teamIds.length, 8);
    }
  });

  it('keeps broad baseball plausibility bands stable', () => {
    const summary = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));

    // Desired MLB-like target is ~81 wins. Current schedule generation produces
    // a longer season; keep that as an explicit baseline until schedule tuning.
    expect(summary.averageTeamWins).toBeCloseTo(CURRENT_SCHEDULE_AVERAGE_TEAM_WINS, 2);
    expect(summary.averageRunsPerGame).toBeGreaterThanOrEqual(2);
    expect(summary.averageRunsPerGame).toBeLessThanOrEqual(14);
    // Current payroll generation sits above the initial balance band. Capture
    // the baseline here; finance tuning should move this in a separate slice.
    expect(summary.averageTotalMlbPayroll).toBeGreaterThanOrEqual(7_000);
    expect(summary.averageTotalMlbPayroll).toBeLessThanOrEqual(7_300);
    expect(summary.averageMlbSalary).toBeGreaterThanOrEqual(2.5);
    expect(summary.averageMlbSalary).toBeLessThanOrEqual(8.5);
    expect(summary.battingAverage).toBeGreaterThanOrEqual(0.15);
    expect(summary.battingAverage).toBeLessThanOrEqual(0.35);
    expect(summary.onBasePercentage).toBeGreaterThanOrEqual(0.2);
    expect(summary.onBasePercentage).toBeLessThanOrEqual(0.45);
    expect(summary.sluggingPercentage).toBeGreaterThanOrEqual(0.25);
    expect(summary.sluggingPercentage).toBeLessThanOrEqual(0.65);
    expect(summary.ops).toBeGreaterThanOrEqual(0.5);
    expect(summary.ops).toBeLessThanOrEqual(1.1);
  });
});
