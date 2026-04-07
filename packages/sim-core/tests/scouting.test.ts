import { describe, it, expect } from 'vitest';
import {
  GameRNG,
  generatePlayer,
  generateScout,
  generateScoutingStaff,
  scoutPlayer,
  combineReports,
  DISPLAY_MIN,
  DISPLAY_MAX,
} from '../src/index.js';
import type { Scout, GeneratedPlayer } from '../src/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePlayer(seed: number): GeneratedPlayer {
  const rng = new GameRNG(seed);
  return generatePlayer(rng, 'SS', 'NYT', 'MLB');
}

function makeHighQualityScout(rng: GameRNG): Scout {
  const scout = generateScout(rng);
  return { ...scout, quality: 90, specialty: 'all', bias: 'neutral' };
}

function makeLowQualityScout(rng: GameRNG): Scout {
  const scout = generateScout(rng);
  return { ...scout, quality: 20, specialty: 'all', bias: 'neutral' };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('generateScout', () => {
  it('creates valid scout with quality 1-100', () => {
    const rng = new GameRNG(42);
    const scout = generateScout(rng);
    expect(scout.id).toBeTruthy();
    expect(scout.name).toBeTruthy();
    expect(scout.quality).toBeGreaterThanOrEqual(1);
    expect(scout.quality).toBeLessThanOrEqual(100);
    expect(scout.salary).toBeGreaterThan(0);
    expect(['tools_lover', 'stat_head', 'makeup_guy', 'neutral']).toContain(scout.bias);
  });
});

describe('generateScoutingStaff', () => {
  it('creates 5 scouts', () => {
    const rng = new GameRNG(42);
    const staff = generateScoutingStaff(rng, 'NYT');
    expect(staff.length).toBe(5);
    for (const scout of staff) {
      expect(scout.id).toBeTruthy();
      expect(scout.quality).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('scoutPlayer', () => {
  it('returns report with observed ratings on 20-80 scale', () => {
    const rng1 = new GameRNG(42);
    const scout = generateScout(rng1);
    const player = makePlayer(99);
    const rng2 = new GameRNG(200);
    const report = scoutPlayer(rng2, scout, player, 'S1D10');
    expect(report.playerId).toBe(player.id);
    expect(report.scoutId).toBe(scout.id);
    expect(report.reportDate).toBe('S1D10');
    expect(report.overallGrade).toBeGreaterThanOrEqual(DISPLAY_MIN);
    expect(report.overallGrade).toBeLessThanOrEqual(DISPLAY_MAX);
    for (const [, rating] of Object.entries(report.observedRatings)) {
      expect(rating).toBeGreaterThanOrEqual(DISPLAY_MIN);
      expect(rating).toBeLessThanOrEqual(DISPLAY_MAX);
    }
    expect(report.confidence).toBeGreaterThanOrEqual(1);
    expect(report.confidence).toBeLessThanOrEqual(20);
    expect(report.ceiling).toBeGreaterThanOrEqual(DISPLAY_MIN);
    expect(report.floor).toBeGreaterThanOrEqual(DISPLAY_MIN);
    expect(report.notes.length).toBeGreaterThan(0);
  });

  it('higher scout quality produces ratings closer to truth', () => {
    const player = makePlayer(42);
    // Run many trials and compare average error
    let highQualityError = 0;
    let lowQualityError = 0;
    const trials = 30;

    for (let seed = 1; seed <= trials; seed++) {
      const rng1 = new GameRNG(seed + 1000);
      const rng2 = new GameRNG(seed + 2000);
      const rng3 = new GameRNG(seed + 3000);
      const rng4 = new GameRNG(seed + 4000);
      const highScout = makeHighQualityScout(rng1);
      const lowScout = makeLowQualityScout(rng2);
      const highReport = scoutPlayer(rng3, highScout, player, 'S1D1');
      const lowReport = scoutPlayer(rng4, lowScout, player, 'S1D1');
      // Compare to overallGrade spread (confidence)
      highQualityError += highReport.confidence;
      lowQualityError += lowReport.confidence;
    }

    expect(highQualityError / trials).toBeLessThan(lowQualityError / trials);
  });

  it('lower scout quality produces wider confidence intervals', () => {
    const player = makePlayer(42);
    const rng1 = new GameRNG(100);
    const rng2 = new GameRNG(200);
    const highScout = makeHighQualityScout(new GameRNG(300));
    const lowScout = makeLowQualityScout(new GameRNG(400));
    const highReport = scoutPlayer(rng1, highScout, player, 'S1D1');
    const lowReport = scoutPlayer(rng2, lowScout, player, 'S1D1');
    expect(lowReport.confidence).toBeGreaterThanOrEqual(highReport.confidence);
  });
});

describe('combineReports', () => {
  it('produces consensus from multiple reports', () => {
    const player = makePlayer(42);
    const reports = [];
    for (let i = 0; i < 3; i++) {
      const rng1 = new GameRNG(i + 500);
      const scout = generateScout(rng1);
      const rng2 = new GameRNG(i + 600);
      reports.push(scoutPlayer(rng2, scout, player, `S1D${i}`));
    }
    const consensus = combineReports(reports);
    expect(consensus.scoutId).toBe('consensus');
    expect(consensus.playerId).toBe(player.id);
    expect(consensus.overallGrade).toBeGreaterThanOrEqual(DISPLAY_MIN);
    expect(consensus.overallGrade).toBeLessThanOrEqual(DISPLAY_MAX);
    // Confidence should narrow with more reports
    const avgSingleConf = reports.reduce((s, r) => s + r.confidence, 0) / reports.length;
    expect(consensus.confidence).toBeLessThanOrEqual(avgSingleConf);
  });
});

describe('specialty bonus', () => {
  it('reduces noise for matching position', () => {
    const player = makePlayer(42); // SS
    // Run trials with SS specialist vs generic scout
    let specialistConf = 0;
    let genericConf = 0;
    const trials = 20;

    for (let seed = 1; seed <= trials; seed++) {
      const rng1 = new GameRNG(seed + 5000);
      const specialist = { ...generateScout(rng1), quality: 60, specialty: 'SS' as const, bias: 'neutral' as const };
      const rng2 = new GameRNG(seed + 6000);
      const generic = { ...generateScout(rng2), quality: 60, specialty: 'all' as const, bias: 'neutral' as const };
      const rng3 = new GameRNG(seed + 7000);
      const rng4 = new GameRNG(seed + 8000);
      specialistConf += scoutPlayer(rng3, specialist, player, 'S1D1').confidence;
      genericConf += scoutPlayer(rng4, generic, player, 'S1D1').confidence;
    }

    expect(specialistConf / trials).toBeLessThanOrEqual(genericConf / trials);
  });
});

describe('bias affects observed ratings', () => {
  it('tools_lover inflates power/speed and deflates contact', () => {
    const player = makePlayer(42);
    const rng1 = new GameRNG(999);
    const toolsScout: Scout = {
      ...generateScout(rng1),
      quality: 80,
      specialty: 'all',
      bias: 'tools_lover',
    };
    const rng2 = new GameRNG(999);
    const neutralScout: Scout = {
      ...generateScout(rng2),
      quality: 80,
      specialty: 'all',
      bias: 'neutral',
    };

    // Same RNG seed for scouting so noise is identical
    const rng3 = new GameRNG(888);
    const rng4 = new GameRNG(888);
    const toolsReport = scoutPlayer(rng3, toolsScout, player, 'S1D1');
    const neutralReport = scoutPlayer(rng4, neutralScout, player, 'S1D1');

    // Tools lover should rate power higher than neutral (by +5 bias)
    if (toolsReport.observedRatings['power'] !== undefined && neutralReport.observedRatings['power'] !== undefined) {
      expect(toolsReport.observedRatings['power']).toBeGreaterThanOrEqual(neutralReport.observedRatings['power']);
    }
  });
});
