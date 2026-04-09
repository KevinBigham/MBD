import { describe, expect, it } from 'vitest';
import {
  assessRoster,
  createGameRNG,
  identifyPositionNeeds,
  identifyStarPlayers,
  summarizeContractSituation,
  type GeneratedPlayer,
} from '../src/index.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  const position = overrides.position ?? 'CF';
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';
  const seed = typeof overrides.age === 'number' ? overrides.age : 27;
  const rng = createGameRNG(seed);

  return {
    id: overrides.id ?? `player-${seed}-${position}`,
    firstName: overrides.firstName ?? `First${rng.nextInt(1, 9)}`,
    lastName: overrides.lastName ?? `Last${rng.nextInt(10, 99)}`,
    age: overrides.age ?? 27,
    position,
    hitterAttributes: {
      contact: 320,
      power: 300,
      eye: 290,
      speed: 270,
      defense: 275,
      durability: 305,
      ...overrides.hitterAttributes,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 330,
      control: 300,
      stamina: position === 'SP' ? 345 : 220,
      velocity: 320,
      movement: 310,
      ...(overrides.pitcherAttributes ?? {}),
    } : null,
    personality: {
      workEthic: 70,
      mentalToughness: 66,
      leadership: 58,
      competitiveness: 73,
    },
    contract: {
      years: overrides.contract?.years ?? 3,
      annualSalary: overrides.contract?.annualSalary ?? 12,
      totalValue: overrides.contract?.totalValue ?? (overrides.contract?.annualSalary ?? 12) * (overrides.contract?.years ?? 3),
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
      ...overrides.contract,
    },
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    developmentPhase: overrides.developmentPhase ?? 'Prime',
    teamId: overrides.teamId ?? 'nym',
    nationality: overrides.nationality ?? 'american',
    overallRating: overrides.overallRating ?? 330,
    rule5EligibleAfterSeason: overrides.rule5EligibleAfterSeason ?? 0,
    serviceTimeDays: overrides.serviceTimeDays ?? 900,
    optionYearsUsed: overrides.optionYearsUsed ?? 0,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    ceiling: overrides.ceiling ?? Math.max(overrides.overallRating ?? 330, 360),
    floor: overrides.floor ?? 260,
    developmentProgram: overrides.developmentProgram ?? 'refinement',
    developmentTrajectory: overrides.developmentTrajectory ?? 'on_track',
    extensionHistory: overrides.extensionHistory ?? [],
    personalityTraits: overrides.personalityTraits ?? [],
    potentialRating: overrides.potentialRating ?? Math.max(overrides.overallRating ?? 330, 355),
  };
}

function makeRoster(): GeneratedPlayer[] {
  return [
    makePlayer({ id: 'star-sp', firstName: 'Victor', lastName: 'Ace', position: 'SP', overallRating: 430, contract: { years: 4, annualSalary: 31 } }),
    makePlayer({ id: 'slugger', firstName: 'Marcus', lastName: 'Stone', position: '1B', overallRating: 405, hitterAttributes: { contact: 315, power: 455, eye: 300, speed: 170, defense: 215, durability: 320 }, contract: { years: 2, annualSalary: 27 } }),
    makePlayer({ id: 'shortstop', firstName: 'Elijah', lastName: 'Cross', position: 'SS', overallRating: 392, hitterAttributes: { contact: 365, power: 250, eye: 330, speed: 340, defense: 390, durability: 305 }, contract: { years: 1, annualSalary: 18 } }),
    makePlayer({ id: 'cf', firstName: 'Jordan', lastName: 'Vale', position: 'CF', overallRating: 381, hitterAttributes: { contact: 348, power: 285, eye: 305, speed: 375, defense: 360, durability: 300 }, contract: { years: 3, annualSalary: 19 } }),
    makePlayer({ id: 'rp', firstName: 'Noah', lastName: 'Gage', position: 'RP', overallRating: 352, pitcherAttributes: { stuff: 360, control: 285, stamina: 190, velocity: 350, movement: 325 }, contract: { years: 1, annualSalary: 11 } }),
    makePlayer({ id: 'catcher', firstName: 'David', lastName: 'Reyes', position: 'C', overallRating: 308, hitterAttributes: { contact: 280, power: 240, eye: 255, speed: 120, defense: 355, durability: 295 } }),
    makePlayer({ id: 'second', firstName: 'Julian', lastName: 'Price', position: '2B', overallRating: 301 }),
    makePlayer({ id: 'third', firstName: 'Rafael', lastName: 'Mills', position: '3B', overallRating: 297 }),
    makePlayer({ id: 'left', firstName: 'Seth', lastName: 'Cole', position: 'LF', overallRating: 312 }),
    makePlayer({ id: 'right', firstName: 'Tyler', lastName: 'Parks', position: 'RF', overallRating: 318 }),
    makePlayer({ id: 'dh', firstName: 'Aaron', lastName: 'Lane', position: 'DH', overallRating: 320, hitterAttributes: { contact: 290, power: 410, eye: 275, speed: 110, defense: 120, durability: 285 } }),
    makePlayer({ id: 'sp2', firstName: 'Liam', lastName: 'Shaw', position: 'SP', overallRating: 368 }),
    makePlayer({ id: 'sp3', firstName: 'Owen', lastName: 'Hart', position: 'SP', overallRating: 342 }),
    makePlayer({ id: 'cl', firstName: 'Evan', lastName: 'Brooks', position: 'CL', overallRating: 330, pitcherAttributes: { stuff: 350, control: 290, stamina: 170, velocity: 340, movement: 315 } }),
  ];
}

describe('identifyStarPlayers', () => {
  it('returns the top five MLB players sorted by overall rating', () => {
    const stars = identifyStarPlayers(makeRoster());

    expect(stars).toHaveLength(5);
    expect(stars.map((player) => player.playerId)).toEqual([
      'star-sp',
      'slugger',
      'shortstop',
      'cf',
      'sp2',
    ]);
  });

  it('includes archetype and full-name spotlight details', () => {
    const stars = identifyStarPlayers(makeRoster());

    expect(stars[0]?.archetype.length).toBeGreaterThan(0);
    expect(stars[0]?.name).toBe('Victor Ace');
    expect(stars[0]?.spotlight).toContain('Victor Ace');
  });
});

describe('identifyPositionNeeds', () => {
  it('flags a critical need when the best player at a position is below the threshold', () => {
    const needs = identifyPositionNeeds(makeRoster());
    const thirdBaseNeed = needs.find((need) => need.position === '3B');

    expect(thirdBaseNeed?.urgency).toBe('moderate');
    expect(thirdBaseNeed?.currentBest?.name).toBe('Rafael Mills');
  });

  it('returns low urgency for positions that are already staffed above league average', () => {
    const needs = identifyPositionNeeds(makeRoster());
    const shortstopNeed = needs.find((need) => need.position === 'SS');

    expect(shortstopNeed?.urgency).toBe('low');
  });
});

describe('summarizeContractSituation', () => {
  it('identifies expiring deals and extension candidates', () => {
    const contracts = summarizeContractSituation(makeRoster());

    expect(contracts.expiringDeals.map((player) => player.name)).toContain('Elijah Cross');
    expect(contracts.expiringDeals.map((player) => player.name)).toContain('Noah Gage');
    expect(contracts.extensionCandidates.map((player) => player.name)).toContain('Marcus Stone');
  });

  it('finds the biggest contract on the books', () => {
    const contracts = summarizeContractSituation(makeRoster());

    expect(contracts.biggestContract.name).toBe('Victor Ace');
    expect(contracts.biggestContract.salary).toBe(31);
  });
});

describe('assessRoster', () => {
  it('grades the roster and identifies its best player anchors', () => {
    const assessment = assessRoster(createGameRNG(31), makeRoster(), 'nym');

    expect(assessment.lineup.overallGrade).toMatch(/[A-D]/);
    expect(assessment.aceStarter?.name).toBe('Victor Ace');
    expect(assessment.cleanupHitter?.name).toBe('Marcus Stone');
  });

  it('uses the highest-rated starter as the ace rather than the highest-rated reliever', () => {
    const roster = makeRoster().concat([
      makePlayer({ id: 'elite-rp', firstName: 'Gavin', lastName: 'Frost', position: 'RP', overallRating: 440, pitcherAttributes: { stuff: 470, control: 300, stamina: 160, velocity: 430, movement: 340 } }),
    ]);
    const assessment = assessRoster(createGameRNG(32), roster, 'nym');

    expect(assessment.aceStarter?.playerId).toBe('star-sp');
  });

  it('uses the highest power hitter as the cleanup hitter instead of the highest overall hitter', () => {
    const roster = makeRoster().concat([
      makePlayer({ id: 'contact-king', firstName: 'Miles', lastName: 'Rowe', position: '2B', overallRating: 410, hitterAttributes: { contact: 430, power: 220, eye: 350, speed: 340, defense: 355, durability: 300 } }),
    ]);
    const assessment = assessRoster(createGameRNG(33), roster, 'nym');

    expect(assessment.cleanupHitter?.playerId).toBe('slugger');
  });

  it('is deterministic for the same seed and roster', () => {
    const roster = makeRoster();
    const first = assessRoster(createGameRNG(34), roster, 'nym');
    const second = assessRoster(createGameRNG(34), roster, 'nym');

    expect(second).toEqual(first);
  });

  it('handles a roster with no MLB pitchers gracefully', () => {
    const roster = makeRoster().filter((player) => !['SP', 'RP', 'CL'].includes(player.position));
    const assessment = assessRoster(createGameRNG(35), roster, 'nym');

    expect(assessment.aceStarter).toBeNull();
    expect(assessment.lineup.pitchingGrade).toBe('D');
  });

  it('handles a roster with no MLB hitters gracefully', () => {
    const roster = makeRoster().filter((player) => ['SP', 'RP', 'CL'].includes(player.position));
    const assessment = assessRoster(createGameRNG(36), roster, 'nym');

    expect(assessment.cleanupHitter).toBeNull();
    expect(assessment.lineup.hittersGrade).toBe('D');
  });
});
