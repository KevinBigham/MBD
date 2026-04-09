import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  generateScoutingBriefing,
  identifyLeagueThreats,
  scoutDivisionRival,
  type GeneratedPlayer,
  type ScoutingBriefingContext,
} from '../src/index.js';

function makePlayer(overrides: Partial<GeneratedPlayer> = {}): GeneratedPlayer {
  const position = overrides.position ?? 'CF';
  const isPitcher = position === 'SP' || position === 'RP' || position === 'CL';

  return {
    id: overrides.id ?? `${position}-${overrides.age ?? 28}`,
    firstName: overrides.firstName ?? 'Alex',
    lastName: overrides.lastName ?? 'Player',
    age: overrides.age ?? 28,
    position,
    hitterAttributes: {
      contact: 325,
      power: 310,
      eye: 285,
      speed: 270,
      defense: 280,
      durability: 300,
      ...overrides.hitterAttributes,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 340,
      control: 300,
      stamina: position === 'SP' ? 350 : 205,
      velocity: 325,
      movement: 315,
      ...(overrides.pitcherAttributes ?? {}),
    } : null,
    personality: {
      workEthic: 71,
      mentalToughness: 68,
      leadership: 55,
      competitiveness: 76,
    },
    contract: {
      years: overrides.contract?.years ?? 2,
      annualSalary: overrides.contract?.annualSalary ?? 12,
      totalValue: overrides.contract?.totalValue ?? (overrides.contract?.annualSalary ?? 12) * (overrides.contract?.years ?? 2),
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
    teamId: overrides.teamId ?? 'bos',
    nationality: overrides.nationality ?? 'american',
    overallRating: overrides.overallRating ?? 340,
    rule5EligibleAfterSeason: overrides.rule5EligibleAfterSeason ?? 0,
    serviceTimeDays: overrides.serviceTimeDays ?? 860,
    optionYearsUsed: overrides.optionYearsUsed ?? 0,
    isOutOfOptions: overrides.isOutOfOptions ?? false,
    minorLeagueLevel: overrides.minorLeagueLevel ?? null,
    ceiling: overrides.ceiling ?? 360,
    floor: overrides.floor ?? 255,
    developmentProgram: overrides.developmentProgram ?? 'refinement',
    developmentTrajectory: overrides.developmentTrajectory ?? 'on_track',
    extensionHistory: overrides.extensionHistory ?? [],
    personalityTraits: overrides.personalityTraits ?? [],
    potentialRating: overrides.potentialRating ?? 355,
  };
}

function makeRoster(teamId: string, ratingOffset: number): GeneratedPlayer[] {
  return [
    makePlayer({ id: `${teamId}-ace`, teamId, firstName: 'Victor', lastName: 'Ace', position: 'SP', overallRating: 390 + ratingOffset }),
    makePlayer({ id: `${teamId}-slugger`, teamId, firstName: 'Marcus', lastName: 'Stone', position: '1B', overallRating: 372 + ratingOffset, hitterAttributes: { contact: 300, power: 440, eye: 285, speed: 140, defense: 190, durability: 305 } }),
    makePlayer({ id: `${teamId}-cf`, teamId, firstName: 'Jordan', lastName: 'Vale', position: 'CF', overallRating: 360 + ratingOffset }),
    makePlayer({ id: `${teamId}-ss`, teamId, firstName: 'Elijah', lastName: 'Cross', position: 'SS', overallRating: 352 + ratingOffset }),
    makePlayer({ id: `${teamId}-cl`, teamId, firstName: 'Noah', lastName: 'Gage', position: 'CL', overallRating: 338 + ratingOffset, pitcherAttributes: { stuff: 360, control: 285, stamina: 170, velocity: 350, movement: 320 } }),
  ];
}

function createContext(): ScoutingBriefingContext {
  return {
    userTeamId: 'nym',
    divisionRivalIds: ['bos', 'phi', 'wsh'],
    allTeamRosters: new Map([
      ['nym', makeRoster('nym', 0)],
      ['bos', makeRoster('bos', 18)],
      ['phi', makeRoster('phi', -8)],
      ['wsh', makeRoster('wsh', -28)],
      ['lax', makeRoster('lax', 22)],
      ['por', makeRoster('por', -45)],
    ]),
  };
}

describe('scoutDivisionRival', () => {
  it('identifies the rival star player and threat level', () => {
    const report = scoutDivisionRival(createGameRNG(61), makeRoster('bos', 18), 'bos');

    expect(report.teamName).toMatch(/Boston/);
    expect(report.starPlayer?.name).toBe('Victor Ace');
    expect(report.overallThreatLevel).toMatch(/elite|dangerous|competitive|rebuilding/);
  });
});

describe('identifyLeagueThreats', () => {
  it('projects win totals from roster strength and excludes the user team', () => {
    const threats = identifyLeagueThreats([
      { teamId: 'nym', players: makeRoster('nym', 0) },
      { teamId: 'bos', players: makeRoster('bos', 18) },
      { teamId: 'lax', players: makeRoster('lax', 22) },
      { teamId: 'por', players: makeRoster('por', -45) },
    ], 'nym');

    expect(threats.some((team) => team.teamId === 'nym')).toBe(false);
    expect(threats[0]!.projectedWins).toBeGreaterThan(threats[1]!.projectedWins);
    expect(threats[0]!.threatLevel).toMatch(/favorite|contender|fringe|rebuilder/);
  });
});

describe('generateScoutingBriefing', () => {
  it('builds one report per division rival and all scouting-focus options', () => {
    const briefing = generateScoutingBriefing(createGameRNG(62), createContext());

    expect(briefing.divisionReports).toHaveLength(3);
    expect(briefing.scoutingFocusOptions.map((option) => option.id)).toEqual([
      'draft',
      'international',
      'pro_scouting',
    ]);
  });

  it('is deterministic for the same seed and context', () => {
    const context = createContext();

    expect(generateScoutingBriefing(createGameRNG(63), context)).toEqual(
      generateScoutingBriefing(createGameRNG(63), context),
    );
  });
});
