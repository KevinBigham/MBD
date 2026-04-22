import { describe, expect, it } from 'vitest';
import {
  CAREER_MILESTONES,
  calculateMilestoneProgress,
  getMilestoneAlerts,
  type CareerStatTotals,
} from '../src/stats/milestones.js';

function createCareerStats(overrides: Partial<CareerStatTotals> = {}): CareerStatTotals {
  return {
    hits: 0,
    hr: 0,
    rbi: 0,
    sb: 0,
    strikeouts: 0,
    wins: 0,
    saves: 0,
    shutouts: 0,
    isPitcher: false,
    seasonsPlayed: 1,
    ...overrides,
  };
}

describe('calculateMilestoneProgress', () => {
  it('flags a hitter near 3000 hits as approaching', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hits: 2900, hr: 425, rbi: 1400, sb: 180, seasonsPlayed: 12 }),
      12,
    );
    const hitsProgress = progress.find((entry) => entry.milestoneId === 'hits');

    expect(hitsProgress).toMatchObject({
      nextThreshold: 3000,
      remainingToNext: 100,
      isApproaching: true,
    });
  });

  it('adds the 2500-hit checkpoint between 2000 and 3000', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hits: 2475, hr: 210, rbi: 980, sb: 45, seasonsPlayed: 11 }),
      11,
    );
    const hitsProgress = progress.find((entry) => entry.milestoneId === 'hits');

    expect(hitsProgress).toMatchObject({
      nextThreshold: 2500,
      remainingToNext: 25,
      isApproaching: true,
    });
  });

  it('excludes stolen-base milestones for pitchers', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({
        isPitcher: true,
        strikeouts: 1800,
        wins: 145,
        saves: 0,
        sb: 99,
        seasonsPlayed: 8,
      }),
      8,
    );

    expect(progress.some((entry) => entry.milestoneId === 'sb')).toBe(false);
    expect(progress.every((entry) => ['strikeouts', 'wins', 'saves', 'shutouts'].includes(entry.milestoneId))).toBe(true);
  });

  it('computes pace projections from the supplied seasons played value', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hits: 900, hr: 210, rbi: 600, sb: 60, seasonsPlayed: 9 }),
      3,
    );
    const hitsProgress = progress.find((entry) => entry.milestoneId === 'hits');

    expect(hitsProgress?.pacePerSeason).toBe(300);
    expect(hitsProgress?.projectedSeasonsToNext).toBeCloseTo(100 / 300, 5);
  });

  it('returns null projected seasons when seasons played is zero', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hits: 75, hr: 12, rbi: 40, sb: 9, seasonsPlayed: 0 }),
      0,
    );
    const hitsProgress = progress.find((entry) => entry.milestoneId === 'hits');

    expect(hitsProgress?.pacePerSeason).toBe(0);
    expect(hitsProgress?.projectedSeasonsToNext).toBeNull();
  });

  it('clamps completed categories to zero remaining against the top threshold', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hr: 745, hits: 3010, rbi: 2010, sb: 340, seasonsPlayed: 18 }),
      18,
    );
    const homeRuns = progress.find((entry) => entry.milestoneId === 'hr');

    expect(homeRuns).toMatchObject({
      nextThreshold: 700,
      remainingToNext: 0,
      projectedSeasonsToNext: 0,
      isApproaching: false,
    });
  });

  it('keeps hitter output ordering stable', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hits: 1200, hr: 210, rbi: 800, sb: 175, seasonsPlayed: 7 }),
      7,
    );

    expect(progress.map((entry) => entry.milestoneId)).toEqual(['hits', 'hr', 'rbi', 'sb']);
  });

  it('adds the 500-stolen-base checkpoint as the top speed milestone', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ hits: 1500, hr: 90, rbi: 540, sb: 470, seasonsPlayed: 12 }),
      12,
    );
    const stolenBases = progress.find((entry) => entry.milestoneId === 'sb');

    expect(stolenBases).toMatchObject({
      nextThreshold: 500,
      remainingToNext: 30,
      isApproaching: true,
    });
  });

  it('keeps pitcher output ordering stable', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ isPitcher: true, strikeouts: 900, wins: 75, saves: 120, seasonsPlayed: 5 }),
      5,
    );

    expect(progress.map((entry) => entry.milestoneId)).toEqual(['strikeouts', 'wins', 'saves', 'shutouts']);
  });

  it('adds the 100-shutout checkpoint for pitchers', () => {
    const progress = calculateMilestoneProgress(
      createCareerStats({ isPitcher: true, strikeouts: 2400, wins: 210, saves: 0, shutouts: 99, seasonsPlayed: 14 }),
      14,
    );
    const shutouts = progress.find((entry) => entry.milestoneId === 'shutouts');

    expect(shutouts).toMatchObject({
      nextThreshold: 100,
      remainingToNext: 1,
      isApproaching: true,
    });
  });
});

describe('getMilestoneAlerts', () => {
  it('sorts milestone alerts by normalized proximity', () => {
    const alerts = getMilestoneAlerts([
      {
        id: 'p1',
        name: 'Closer One',
        careerStats: createCareerStats({ isPitcher: true, saves: 392, strikeouts: 500, wins: 21, seasonsPlayed: 9 }),
        seasonsPlayed: 9,
      },
      {
        id: 'p2',
        name: 'Slugger Two',
        careerStats: createCareerStats({ hits: 2925, hr: 299, rbi: 850, sb: 20, seasonsPlayed: 10 }),
        seasonsPlayed: 10,
      },
    ]);

    expect(alerts.map((alert) => `${alert.playerId}:${alert.threshold}`)).toEqual([
      'p2:300',
      'p1:400',
      'p2:3000',
    ]);
  });

  it('maps urgency tiers from milestone proximity', () => {
    const alerts = getMilestoneAlerts([
      {
        id: 'p1',
        name: 'Ace One',
        careerStats: createCareerStats({ isPitcher: true, strikeouts: 2980, wins: 188, saves: 0, seasonsPlayed: 12 }),
        seasonsPlayed: 12,
      },
      {
        id: 'p2',
        name: 'Runner Two',
        careerStats: createCareerStats({ hits: 0, hr: 0, rbi: 0, sb: 95, seasonsPlayed: 4 }),
        seasonsPlayed: 4,
      },
      {
        id: 'p3',
        name: 'Slugger Three',
        careerStats: createCareerStats({ hits: 0, hr: 272, rbi: 0, sb: 0, seasonsPlayed: 7 }),
        seasonsPlayed: 7,
      },
    ]);

    expect(alerts.find((alert) => alert.playerId === 'p1' && alert.threshold === 3000)?.urgency).toBe('imminent');
    expect(alerts.find((alert) => alert.playerId === 'p2' && alert.threshold === 100)?.urgency).toBe('close');
    expect(alerts.find((alert) => alert.playerId === 'p3' && alert.threshold === 300)?.urgency).toBe('approaching');
  });

  it('emits alerts for the new 2500-hit and 500-stolen-base thresholds', () => {
    const alerts = getMilestoneAlerts([
      {
        id: 'p1',
        name: 'Table Setter',
        careerStats: createCareerStats({ hits: 2488, hr: 120, rbi: 640, sb: 120, seasonsPlayed: 11 }),
        seasonsPlayed: 11,
      },
      {
        id: 'p2',
        name: 'Speed Demon',
        careerStats: createCareerStats({ hits: 1600, hr: 80, rbi: 500, sb: 492, seasonsPlayed: 12 }),
        seasonsPlayed: 12,
      },
    ]);

    expect(alerts.find((alert) => alert.playerId === 'p1' && alert.threshold === 2500)).toMatchObject({
      milestoneLabel: 'Hits',
      urgency: 'imminent',
    });
    expect(alerts.find((alert) => alert.playerId === 'p2' && alert.threshold === 500)).toMatchObject({
      milestoneLabel: 'Stolen Bases',
      urgency: 'imminent',
    });
  });

  it('does not emit alerts for already-cleared top thresholds', () => {
    const alerts = getMilestoneAlerts([
      {
        id: 'p1',
        name: 'Legend One',
        careerStats: createCareerStats({ hits: 3200, hr: 720, rbi: 2100, sb: 350, seasonsPlayed: 19 }),
        seasonsPlayed: 19,
      },
    ]);

    expect(alerts).toEqual([]);
  });
});

describe('CAREER_MILESTONES', () => {
  it('defines thresholds in ascending order for every milestone category', () => {
    for (const milestone of CAREER_MILESTONES) {
      const sorted = [...milestone.thresholds].sort((left, right) => left - right);
      expect(milestone.thresholds).toEqual(sorted);
    }
  });
});
