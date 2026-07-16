import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  generateBudgetOverview,
  generateOwnerMeeting,
  getOwnerPersonalityProfile,
  type OwnerMeetingContext,
} from '../src/index.js';

function createContext(overrides: Partial<OwnerMeetingContext> = {}): OwnerMeetingContext {
  return {
    teamId: 'nym',
    teamName: 'Tycoons',
    gmName: 'Alex Rivera',
    ownerPatience: 72,
    ownerConfidence: 46,
    marketSize: 'large',
    payroll: 188,
    luxuryTaxPayroll: 172,
    budget: 240,
    luxuryTaxThreshold: 230,
    lastSeasonWins: 91,
    lastSeasonPlayoffResult: 'Lost in ALCS',
    divisionRivals: ['bos', 'phi', 'wsh'],
    difficulty: 'standard',
    ...overrides,
  };
}

describe('getOwnerPersonalityProfile', () => {
  it('builds a patient builder profile from high patience and lower confidence', () => {
    const profile = getOwnerPersonalityProfile(78, 42, 'medium');

    expect(profile.archetype).toBe('patient_builder');
    expect(profile.expectationLevel).toBe('moderate');
    expect(profile.personalityDescription).toMatch(/patient|build/i);
  });

  it('builds a win-now mogul profile from low patience, high confidence, and a large market', () => {
    const profile = getOwnerPersonalityProfile(28, 84, 'large');

    expect(profile.archetype).toBe('win_now_mogul');
    expect(profile.expectationLevel).toBe('championship');
  });

  it('builds a budget hawk profile when patience and confidence are both low', () => {
    const profile = getOwnerPersonalityProfile(34, 39, 'small');

    expect(profile.archetype).toBe('budget_hawk');
    expect(profile.expectationLevel).toBe('low');
  });
});

describe('generateBudgetOverview', () => {
  it('calculates available space and luxury-tax distance correctly', () => {
    const budget = generateBudgetOverview(188, 240, 230, 'standard');

    expect(budget.totalBudget).toBe(240);
    expect(budget.currentPayroll).toBe(188);
    expect(budget.availableSpace).toBe(52);
    expect(budget.luxuryTaxDistance).toBe(42);
  });

  it('assigns an A spending grade when there is substantial room', () => {
    expect(generateBudgetOverview(145, 240, 230, 'standard').spendingGrade).toBe('A');
  });

  it('assigns a D spending grade when payroll is already over budget', () => {
    const overview = generateBudgetOverview(255, 240, 230, 'hard');

    expect(overview.availableSpace).toBe(-15);
    expect(overview.luxuryTaxDistance).toBe(-25);
    expect(overview.spendingGrade).toBe('D');
  });

  it('uses total payroll for budget room and taxable payroll for the tax line', () => {
    const overview = generateBudgetOverview(245, 260, 230, 'standard', 220);

    expect(overview.currentPayroll).toBe(245);
    expect(overview.availableSpace).toBe(15);
    expect(overview.luxuryTaxDistance).toBe(10);
    expect(overview.narrativeSummary).toContain('15.00 million available before ownership cap');
    expect(overview.narrativeSummary).toContain('10.00 million before the tax line');
    expect(overview.narrativeSummary).not.toMatch(/tax bill|projected exposure/);
  });

  it('describes taxpayer amounts as projected exposure rather than a carried bill', () => {
    const overview = generateBudgetOverview(245, 260, 230, 'standard', 250);

    expect(overview.availableSpace).toBe(15);
    expect(overview.luxuryTaxDistance).toBe(-20);
    expect(overview.narrativeSummary).toContain('4.00 million in projected exposure');
    expect(overview.narrativeSummary).not.toMatch(/carrying|tax bill/i);
  });
});

describe('generateOwnerMeeting', () => {
  it('includes the GM and team names in the owner greeting', () => {
    const briefing = generateOwnerMeeting(createGameRNG(11), createContext());

    expect(briefing.ownerGreeting).toContain('Alex Rivera');
    expect(briefing.ownerGreeting).toContain('Tycoons');
  });

  it('produces distinct market context for small-market clubs', () => {
    const briefing = generateOwnerMeeting(createGameRNG(12), createContext({
      teamId: 'por',
      teamName: 'Sasquatch',
      marketSize: 'small',
      divisionRivals: ['sea', 'sfb'],
      payroll: 121,
      luxuryTaxPayroll: 110,
      budget: 170,
    }));

    expect(briefing.marketContext).toMatch(/small-market|every dollar|margin/i);
  });

  it('produces distinct market context for large-market clubs', () => {
    const briefing = generateOwnerMeeting(createGameRNG(13), createContext());

    expect(briefing.marketContext).toMatch(/large-market|spotlight|expectation/i);
  });

  it('names a real rival in the division outlook', () => {
    const briefing = generateOwnerMeeting(createGameRNG(14), createContext());

    expect(briefing.divisionOutlook).toMatch(/Boston|Philadelphia|Washington/);
  });

  it('always exposes all four season-goal options', () => {
    const briefing = generateOwnerMeeting(createGameRNG(15), createContext({
      lastSeasonWins: 68,
      lastSeasonPlayoffResult: null,
    }));

    expect(briefing.seasonGoalOptions.map((option) => option.id)).toEqual([
      'championship',
      'playoff',
      'compete',
      'rebuild',
    ]);
  });

  it('is deterministic for the same seed and context', () => {
    const context = createContext();
    const first = generateOwnerMeeting(createGameRNG(16), context);
    const second = generateOwnerMeeting(createGameRNG(16), context);

    expect(second).toEqual(first);
  });
});
