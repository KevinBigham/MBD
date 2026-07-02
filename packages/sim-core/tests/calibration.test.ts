import { describe, expect, it } from 'vitest';
import {
  runSeasonCalibration,
  summarizeSeasonCalibration,
} from '../src/index.js';

const CALIBRATION_CONFIG = {
  seed: 44_001,
  seasonCount: 1,
};
const MULTI_SEASON_CALIBRATION_CONFIG = {
  seed: 44_019,
  seasonCount: 2,
};
const MLB_REALISTIC_AVERAGE_TEAM_WINS_MIN = 76;
const MLB_REALISTIC_AVERAGE_TEAM_WINS_MAX = 86;
const CALIBRATION_TEST_TIMEOUT_MS = 15_000;

describe('season calibration harness', () => {
  it('summarizes the same seed and config identically', () => {
    const first = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));
    const second = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));

    expect(second).toEqual(first);
  }, CALIBRATION_TEST_TIMEOUT_MS);

  it('changes at least one meaningful aggregate when the seed changes', () => {
    const first = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));
    const second = summarizeSeasonCalibration(runSeasonCalibration({
      ...CALIBRATION_CONFIG,
      seed: CALIBRATION_CONFIG.seed + 1,
    }));

    expect(second.seasons.map((season) => season.averageRunsPerGame))
      .not.toEqual(first.seasons.map((season) => season.averageRunsPerGame));
  }, CALIBRATION_TEST_TIMEOUT_MS);

  it('preserves core standings and schedule invariants for every full season', () => {
    const result = runSeasonCalibration(CALIBRATION_CONFIG);

    for (const season of result.seasons) {
      expect(season.gamesPlayed).toBe(season.scheduleGames);
      expect(season.totalWins).toBe(season.totalLosses);
      expect(season.totalWins).toBe(season.gamesPlayed);
      expect(season.averageTeamWins).toBeCloseTo(season.gamesPlayed / result.teamIds.length, 8);
    }
  }, CALIBRATION_TEST_TIMEOUT_MS);

  it('keeps broad baseball plausibility bands stable', () => {
    const summary = summarizeSeasonCalibration(runSeasonCalibration(CALIBRATION_CONFIG));

    expect(summary.averageTeamWins).toBeGreaterThanOrEqual(MLB_REALISTIC_AVERAGE_TEAM_WINS_MIN);
    expect(summary.averageTeamWins).toBeLessThanOrEqual(MLB_REALISTIC_AVERAGE_TEAM_WINS_MAX);
    expect(summary.averageRunsPerGame).toBeGreaterThanOrEqual(2);
    expect(summary.averageRunsPerGame).toBeLessThanOrEqual(14);
    expect(summary.averageTotalMlbPayroll).toBeGreaterThanOrEqual(3_800);
    expect(summary.averageTotalMlbPayroll).toBeLessThanOrEqual(6_800);
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
  }, CALIBRATION_TEST_TIMEOUT_MS);

  it('runs a deterministic two-season balance sample inside the quick guard', () => {
    const first = summarizeSeasonCalibration(runSeasonCalibration(MULTI_SEASON_CALIBRATION_CONFIG));
    const second = summarizeSeasonCalibration(runSeasonCalibration(MULTI_SEASON_CALIBRATION_CONFIG));

    expect(second).toEqual(first);
    expect(first.seasonCount).toBe(2);
    expect(first.seasons.map((season) => season.season)).toEqual([1, 2]);
    expect(first.totalGames).toBe(first.seasons.reduce((sum, season) => sum + season.gamesPlayed, 0));
    expect(first.seasons[1]).not.toEqual(first.seasons[0]);

    for (const season of first.seasons) {
      expect(season.averageTeamWins).toBeGreaterThanOrEqual(MLB_REALISTIC_AVERAGE_TEAM_WINS_MIN);
      expect(season.averageTeamWins).toBeLessThanOrEqual(MLB_REALISTIC_AVERAGE_TEAM_WINS_MAX);
      expect(season.averageRunsPerGame).toBeGreaterThanOrEqual(2);
      expect(season.averageRunsPerGame).toBeLessThanOrEqual(14);
      expect(season.averageMlbSalary).toBeGreaterThanOrEqual(2.5);
      expect(season.averageMlbSalary).toBeLessThanOrEqual(8.5);
    }
  }, CALIBRATION_TEST_TIMEOUT_MS);
});
