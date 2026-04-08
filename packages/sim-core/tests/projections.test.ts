import { describe, expect, it } from 'vitest';
import type { PlayerGameStats } from '../src/index.js';
import {
  SEASON_GAMES,
  findNotableProjections,
  formatPaceLabel,
  projectSeasonStats,
} from '../src/index.js';

function makeStats(overrides: Partial<PlayerGameStats> = {}): PlayerGameStats {
  return {
    playerId: 'player-1',
    teamId: 'kc',
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    bb: 0,
    k: 0,
    runs: 0,
    hbp: 0,
    sacFlies: 0,
    ip: 0,
    earnedRuns: 0,
    strikeouts: 0,
    walks: 0,
    hitsAllowed: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    flyBallsAllowed: 0,
    wins: 0,
    saves: 0,
    losses: 0,
    ...overrides,
  };
}

describe('season stat projections', () => {
  it('returns null when no games have been played', () => {
    const projection = projectSeasonStats(makeStats({ pa: 20, hits: 5 }), 0, SEASON_GAMES);

    expect(projection).toBeNull();
  });

  it('projects hitter totals by simple linear pace over 162 games', () => {
    const projection = projectSeasonStats(makeStats({
      pa: 320,
      ab: 280,
      hits: 84,
      doubles: 18,
      triples: 3,
      hr: 21,
      rbi: 55,
      bb: 30,
      k: 70,
      hbp: 4,
      sacFlies: 5,
    }), 81, SEASON_GAMES);

    expect(projection?.gamesRemaining).toBe(81);
    expect(projection?.projectedStats.pa).toBe(640);
    expect(projection?.projectedStats.hits).toBe(168);
    expect(projection?.projectedStats.hr).toBe(42);
    expect(projection?.projectedStats.rbi).toBe(110);
  });

  it('projects pitcher totals with outs-based innings pitched', () => {
    const projection = projectSeasonStats(makeStats({
      ip: 510,
      earnedRuns: 60,
      strikeouts: 120,
      walks: 35,
      hitsAllowed: 118,
      wins: 8,
      saves: 2,
    }), 81, SEASON_GAMES);

    expect(projection?.projectedStats.ip).toBe(1020);
    expect(projection?.projectedStats.strikeouts).toBe(240);
    expect(projection?.projectedStats.wins).toBe(16);
    expect(projection?.projectedStats.saves).toBe(4);
  });

  it('keeps current totals unchanged after the full season is complete', () => {
    const projection = projectSeasonStats(makeStats({
      pa: 640,
      ab: 590,
      hits: 180,
      hr: 31,
      rbi: 104,
      bb: 44,
      k: 120,
      hbp: 4,
      sacFlies: 6,
    }), SEASON_GAMES, SEASON_GAMES);

    expect(projection?.gamesRemaining).toBe(0);
    expect(projection?.projectedStats.hits).toBe(180);
    expect(projection?.projectedStats.hr).toBe(31);
  });

  it('labels confidence as low for small samples', () => {
    const projection = projectSeasonStats(makeStats({ pa: 60, ab: 50, hits: 15 }), 20, SEASON_GAMES);

    expect(projection?.confidenceLevel).toBe('low');
  });

  it('labels confidence as medium for mid-sized samples', () => {
    const projection = projectSeasonStats(makeStats({ pa: 180, ab: 150, hits: 45 }), 60, SEASON_GAMES);

    expect(projection?.confidenceLevel).toBe('medium');
  });

  it('labels confidence as high for large samples', () => {
    const projection = projectSeasonStats(makeStats({ pa: 360, ab: 310, hits: 96 }), 120, SEASON_GAMES);

    expect(projection?.confidenceLevel).toBe('high');
  });

  it('formats batting rate stats to three decimal places', () => {
    const projection = projectSeasonStats(makeStats({
      pa: 210,
      ab: 180,
      hits: 54,
      doubles: 10,
      triples: 2,
      hr: 12,
      rbi: 34,
      bb: 24,
      k: 41,
      hbp: 3,
      sacFlies: 2,
    }), 54, SEASON_GAMES);

    expect(projection?.projectedStats.avg).toMatch(/^\.\d{3}$/);
    expect(projection?.projectedStats.obp).toMatch(/^\.\d{3}$/);
    expect(projection?.projectedStats.ops).toMatch(/^\d\.\d{3}$/);
  });

  it('formats pitcher ERA to three decimal places', () => {
    const projection = projectSeasonStats(makeStats({
      ip: 270,
      earnedRuns: 24,
      strikeouts: 68,
      walks: 18,
      hitsAllowed: 54,
      wins: 5,
      saves: 11,
    }), 54, SEASON_GAMES);

    expect(projection?.projectedStats.era).toMatch(/^\d\.\d{3}$/);
    expect(projection?.projectedStats.whip).toMatch(/^\d\.\d{3}$/);
  });

  it('finds hitters on pace for 40-plus home runs', () => {
    const hitterProjection = projectSeasonStats(makeStats({
      playerId: 'slugger',
      pa: 320,
      ab: 280,
      hits: 84,
      doubles: 18,
      triples: 1,
      hr: 21,
      rbi: 60,
      bb: 28,
      k: 72,
      hbp: 2,
      sacFlies: 3,
    }), 81, SEASON_GAMES);

    const notable = findNotableProjections([hitterProjection!]);

    expect(notable.some((entry) => entry.playerId === 'slugger' && entry.benchmark === '40 HR')).toBe(true);
  });

  it('finds pitchers on pace for strikeout and ERA benchmarks', () => {
    const pitcherProjection = projectSeasonStats(makeStats({
      playerId: 'ace',
      ip: 486,
      earnedRuns: 45,
      strikeouts: 118,
      walks: 28,
      hitsAllowed: 96,
      wins: 11,
      saves: 0,
    }), 81, SEASON_GAMES);

    const notable = findNotableProjections([pitcherProjection!]);

    expect(notable.some((entry) => entry.playerId === 'ace' && entry.benchmark === '200 K')).toBe(true);
    expect(notable.some((entry) => entry.playerId === 'ace' && entry.benchmark === '3.00 ERA')).toBe(true);
  });

  it('formats hitter pace labels in human-readable language', () => {
    const label = formatPaceLabel(makeStats({
      pa: 320,
      ab: 280,
      hits: 84,
      doubles: 18,
      triples: 3,
      hr: 21,
      rbi: 55,
      bb: 30,
      k: 70,
      hbp: 4,
      sacFlies: 5,
    }), 81, SEASON_GAMES);

    expect(label).toMatch(/on pace/i);
    expect(label).toMatch(/HR|RBI|AVG|OPS/);
  });
});
