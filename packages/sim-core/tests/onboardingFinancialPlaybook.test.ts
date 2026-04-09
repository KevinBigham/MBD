import { describe, expect, it } from 'vitest';
import {
  analyzePayrollBreakdown,
  calculateFinancialFlexibility,
  generateFinancialPlaybook,
  identifyExtensionPriorities,
  type FinancialContext,
  type GeneratedPlayer,
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
      contact: 315,
      power: 295,
      eye: 280,
      speed: 265,
      defense: 270,
      durability: 300,
      ...overrides.hitterAttributes,
    },
    pitcherAttributes: isPitcher ? {
      stuff: 330,
      control: 295,
      stamina: position === 'SP' ? 340 : 200,
      velocity: 320,
      movement: 305,
      ...(overrides.pitcherAttributes ?? {}),
    } : null,
    personality: {
      workEthic: 72,
      mentalToughness: 67,
      leadership: 53,
      competitiveness: 74,
    },
    contract: {
      years: overrides.contract?.years ?? 2,
      annualSalary: overrides.contract?.annualSalary ?? 14,
      totalValue: overrides.contract?.totalValue ?? (overrides.contract?.annualSalary ?? 14) * (overrides.contract?.years ?? 2),
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
    overallRating: overrides.overallRating ?? 335,
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

function makePlayers(): GeneratedPlayer[] {
  return [
    makePlayer({ id: 'ace', firstName: 'Victor', lastName: 'Ace', position: 'SP', overallRating: 410, contract: { years: 2, annualSalary: 31 } }),
    makePlayer({ id: 'slugger', firstName: 'Marcus', lastName: 'Stone', position: '1B', overallRating: 382, contract: { years: 1, annualSalary: 27 }, hitterAttributes: { contact: 300, power: 440, eye: 285, speed: 145, defense: 190, durability: 310 } }),
    makePlayer({ id: 'shortstop', firstName: 'Elijah', lastName: 'Cross', position: 'SS', overallRating: 356, contract: { years: 3, annualSalary: 19 } }),
    makePlayer({ id: 'wing', firstName: 'Jordan', lastName: 'Vale', position: 'RF', overallRating: 326, contract: { years: 4, annualSalary: 11 } }),
    makePlayer({ id: 'closer', firstName: 'Noah', lastName: 'Gage', position: 'CL', overallRating: 334, contract: { years: 2, annualSalary: 13 }, pitcherAttributes: { stuff: 360, control: 285, stamina: 170, velocity: 350, movement: 320 } }),
    makePlayer({ id: 'fringe', firstName: 'Evan', lastName: 'Cole', position: 'LF', overallRating: 268, contract: { years: 1, annualSalary: 14 } }),
  ];
}

function createContext(overrides: Partial<FinancialContext> = {}): FinancialContext {
  return {
    players: makePlayers(),
    budget: 240,
    luxuryTaxThreshold: 230,
    difficulty: 'standard',
    ...overrides,
  };
}

describe('analyzePayrollBreakdown', () => {
  it('splits hitter and pitcher payroll correctly and identifies the top-paid player', () => {
    const breakdown = analyzePayrollBreakdown(makePlayers());

    expect(breakdown.totalPayroll).toBe(115);
    expect(breakdown.hitterPayroll).toBe(71);
    expect(breakdown.pitcherPayroll).toBe(44);
    expect(breakdown.topPaidPlayer.name).toBe('Victor Ace');
  });

  it('calculates average and median salaries', () => {
    const breakdown = analyzePayrollBreakdown(makePlayers());

    expect(breakdown.averageSalary).toBeGreaterThan(0);
    expect(breakdown.medianSalary).toBe(16.5);
  });
});

describe('identifyExtensionPriorities', () => {
  it('marks top players with one or two years left as extend-now candidates', () => {
    const priorities = identifyExtensionPriorities(makePlayers());

    expect(priorities.find((player) => player.playerId === 'ace')?.urgency).toBe('extend_now');
    expect(priorities.find((player) => player.playerId === 'slugger')?.urgency).toBe('extend_now');
  });

  it('marks solid longer-control players as monitor and weaker players as let-walk', () => {
    const priorities = identifyExtensionPriorities(makePlayers());

    expect(priorities.find((player) => player.playerId === 'shortstop')?.urgency).toBe('monitor');
    expect(priorities.find((player) => player.playerId === 'fringe')?.urgency).toBe('let_walk');
  });
});

describe('calculateFinancialFlexibility', () => {
  it('grades high payroll space as A and low space as D or F', () => {
    expect(calculateFinancialFlexibility(150, 240, 230).grade).toBe('A');
    expect(calculateFinancialFlexibility(235, 240, 230).grade).toBe('D');
    expect(calculateFinancialFlexibility(245, 240, 230).grade).toBe('F');
  });

  it('flags whether the club can add a star or a role player', () => {
    const roomy = calculateFinancialFlexibility(165, 240, 230);
    const tight = calculateFinancialFlexibility(226, 240, 230);

    expect(roomy.canAddStar).toBe(true);
    expect(roomy.canAddRole).toBe(true);
    expect(tight.canAddStar).toBe(false);
  });
});

describe('generateFinancialPlaybook', () => {
  it('returns payroll, extensions, flexibility, and the three spending options', () => {
    const playbook = generateFinancialPlaybook(createContext());

    expect(playbook.payroll.topPaidPlayer.name).toBe('Victor Ace');
    expect(playbook.extensions.length).toBeGreaterThan(0);
    expect(playbook.flexibility.grade).toMatch(/[A-F]/);
    expect(playbook.spendingOptions.map((option) => option.id)).toEqual([
      'big_spender',
      'penny_pincher',
      'balanced',
    ]);
  });
});
