import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  applyForJob,
  generateJobMarket,
  getCareerLegacyScore,
  initializeGMCareer,
  processGMFiring,
  recordSeasonResult,
} from '../src/index.js';

function makeStandings() {
  return TEAMS.map((team, index) => ({
    teamId: team.id,
    wins: 60 + ((index * 3) % 38),
    losses: 102 - ((index * 3) % 38),
  }));
}

describe('GM career system', () => {
  it('initializes a career ledger and records season results deterministically', () => {
    const career = initializeGMCareer(new GameRNG(44), 'nym', 'Alex Rivera', 1);
    const updated = recordSeasonResult(career, 1, 94, 68, 'World Series champion');

    expect(career.currentTeamId).toBe('nym');
    expect(career.careerHistory).toHaveLength(1);
    expect(updated.overallRecord).toEqual({ wins: 94, losses: 68 });
    expect(updated.championships).toBe(1);
    expect(updated.careerHistory[0]).toMatchObject({
      teamId: 'nym',
      seasons: 1,
      championships: 1,
      record: { wins: 94, losses: 68 },
      firedSeason: null,
    });
  });

  it('creates better job markets for stronger reputations', () => {
    const baseline = initializeGMCareer(new GameRNG(17), 'por', 'Jamie Porter', 3);
    const lowRep = { ...baseline, reputation: 28 };
    const highRep = { ...baseline, reputation: 82 };
    const standings = makeStandings();

    const lowMarket = generateJobMarket(new GameRNG(99), lowRep, TEAMS, standings);
    const highMarket = generateJobMarket(new GameRNG(99), highRep, TEAMS, standings);
    const lowAverage = lowMarket.availableJobs.reduce((sum, job) => sum + job.attractiveness, 0) / lowMarket.availableJobs.length;
    const highAverage = highMarket.availableJobs.reduce((sum, job) => sum + job.attractiveness, 0) / highMarket.availableJobs.length;

    expect(lowMarket.availableJobs.length).toBeGreaterThanOrEqual(3);
    expect(highMarket.availableJobs.length).toBeLessThanOrEqual(5);
    expect(highAverage).toBeGreaterThan(lowAverage);
  });

  it('records firings, allows a new job, and keeps legacy scoring stable', () => {
    const career = recordSeasonResult(
      initializeGMCareer(new GameRNG(71), 'nym', 'Taylor Hughes', 2),
      2,
      88,
      74,
      'Missed playoffs',
    );
    const fired = processGMFiring(career, 'Owner lost faith in the direction.', 2);
    const rehired = applyForJob(fired, 'bos', 3);

    expect(fired.careerHistory[0]).toMatchObject({
      teamId: 'nym',
      firedSeason: 2,
      firedReason: 'Owner lost faith in the direction.',
    });
    expect(rehired.currentTeamId).toBe('bos');
    expect(rehired.careerHistory).toHaveLength(2);
    expect(getCareerLegacyScore(rehired)).toBe(getCareerLegacyScore(rehired));
  });
});
