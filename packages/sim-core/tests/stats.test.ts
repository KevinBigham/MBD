import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  generatePlayer,
} from '../src/index.js';
import type { PlayerGameStats } from '../src/index.js';
import {
  buildLeagueAdvancedContext,
  calculateAdvancedStatLine,
  calculateFip,
  calculateWoba,
  calculateXfip,
  estimateProjectedWarRange,
} from '../src/stats/advanced.js';

function createStats(overrides: Partial<PlayerGameStats>): PlayerGameStats {
  return {
    playerId: 'player-1',
    teamId: 'nyy',
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
    losses: 0,
    ...overrides,
  };
}

describe('advanced stats', () => {
  it('calculates wOBA from known batting inputs', () => {
    const stats = createStats({
      pa: 643,
      ab: 560,
      hits: 170,
      doubles: 35,
      triples: 5,
      hr: 30,
      bb: 70,
      hbp: 8,
      sacFlies: 5,
    });

    expect(calculateWoba(stats)).toBeCloseTo(0.392, 3);
  });

  it('calculates FIP and xFIP from known pitching inputs', () => {
    const stats = createStats({
      ip: 540,
      strikeouts: 180,
      walks: 50,
      homeRunsAllowed: 20,
      hitBatters: 5,
      flyBallsAllowed: 180,
    });

    expect(calculateFip(stats, 3.2)).toBeCloseTo(3.561, 3);
    expect(calculateXfip(stats, 0.11, 3.2)).toBeCloseTo(3.547, 3);
  });

  it('builds credible hitter and pitcher advanced stat lines', () => {
    const rng = new GameRNG(42);
    const hitter = generatePlayer(rng.fork(), 'SS', 'nyy', 'MLB');
    const pitcher = generatePlayer(rng.fork(), 'SP', 'bos', 'MLB');

    const hitterStats = createStats({
      playerId: hitter.id,
      teamId: hitter.teamId,
      pa: 643,
      ab: 560,
      hits: 170,
      doubles: 35,
      triples: 5,
      hr: 30,
      rbi: 105,
      bb: 70,
      hbp: 8,
      sacFlies: 5,
      runs: 98,
    });
    const pitcherStats = createStats({
      playerId: pitcher.id,
      teamId: pitcher.teamId,
      ip: 540,
      earnedRuns: 76,
      strikeouts: 180,
      walks: 50,
      hitsAllowed: 150,
      homeRunsAllowed: 20,
      hitBatters: 5,
      flyBallsAllowed: 180,
      wins: 14,
      losses: 8,
    });

    const derivedContext = buildLeagueAdvancedContext(
      [hitter, pitcher],
      new Map([
        [hitter.id, hitterStats],
        [pitcher.id, pitcherStats],
      ]),
    );
    expect(derivedContext.leagueWoba).toBeGreaterThan(0);
    expect(derivedContext.leagueFip).toBeGreaterThan(0);

    const context = {
      ...derivedContext,
      leagueWoba: 0.32,
      leagueOps: 0.74,
      leagueFip: 4.1,
      runsPerPlateAppearance: 0.12,
      teamParkFactors: new Map<string, number>([
        ['nyy', 0.99],
        ['bos', 1.01],
      ]),
    };

    const hitterLine = calculateAdvancedStatLine(hitter, hitterStats, context);
    const pitcherLine = calculateAdvancedStatLine(pitcher, pitcherStats, context);

    expect(hitterLine.woba).toBeGreaterThan(0.3);
    expect(hitterLine.wrcPlus).toBeGreaterThan(100);
    expect(hitterLine.opsPlus).toBeGreaterThan(100);
    expect(hitterLine.war).toBeGreaterThan(0);
    expect(hitterLine.war).toBeLessThan(10);

    expect(pitcherLine.fip).toBeGreaterThan(0);
    expect(pitcherLine.xfip).toBeGreaterThan(0);
    expect(pitcherLine.whip).toBeGreaterThan(0);
    expect(pitcherLine.war).toBeGreaterThan(0);
    expect(pitcherLine.war).toBeLessThan(12);
  });

  it('maps scouting-grade bands to projected WAR ranges', () => {
    const hitterProjection = estimateProjectedWarRange({
      overall: 55,
      floor: 45,
      ceiling: 70,
      isPitcher: false,
    });
    const pitcherProjection = estimateProjectedWarRange({
      overall: 60,
      floor: 50,
      ceiling: 75,
      isPitcher: true,
    });

    expect(hitterProjection.floorWar).toBeLessThan(hitterProjection.currentWar);
    expect(hitterProjection.currentWar).toBeLessThan(hitterProjection.ceilingWar!);
    expect(hitterProjection.ceilingWar).toBeLessThan(9);

    expect(pitcherProjection.floorWar).toBeLessThan(pitcherProjection.currentWar);
    expect(pitcherProjection.currentWar).toBeLessThan(pitcherProjection.ceilingWar!);
    expect(pitcherProjection.ceilingWar).toBeLessThan(10);
  });
});
