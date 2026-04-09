import { describe, expect, it } from 'vitest';
import {
  createGameRNG,
  generateOnboardingOpeningStatementOptions,
  generateOnboardingPressConference,
  type OnboardingPressConferenceContext,
} from '../src/index.js';

function createContext(overrides: Partial<OnboardingPressConferenceContext> = {}): OnboardingPressConferenceContext {
  return {
    teamId: 'nym',
    teamName: 'Tycoons',
    gmName: 'Alex Rivera',
    recommendedSeasonGoal: 'playoff',
    recommendedTradeApproach: 'opportunistic',
    ownerExpectationSummary: 'Ownership expects competitive baseball.',
    rosterHeadline: 'Victor Ace and Marcus Stone give the club a legitimate top end.',
    notablePlayers: ['Victor Ace', 'Marcus Stone', 'Elijah Cross'],
    competitiveWindow: 'stable_contender',
    ...overrides,
  };
}

describe('generateOnboardingOpeningStatementOptions', () => {
  it('always returns confident, humble, and measured tone options', () => {
    const options = generateOnboardingOpeningStatementOptions(createGameRNG(71), createContext());

    expect(options.map((option) => option.id)).toEqual([
      'confident',
      'humble',
      'measured',
    ]);
  });
});

describe('generateOnboardingPressConference', () => {
  it('generates likely media questions that use full player names', () => {
    const briefing = generateOnboardingPressConference(createGameRNG(72), createContext());

    expect(briefing.likelyQuestions.some((question) => question.includes('Victor Ace'))).toBe(true);
    expect(briefing.likelyQuestions.some((question) => question.includes('Marcus Stone'))).toBe(true);
  });

  it('keeps the final narrative grounded in the team, strategy, and chosen tone', () => {
    const briefing = generateOnboardingPressConference(createGameRNG(73), createContext());

    expect(briefing.openingStatementOptions).toHaveLength(3);
    expect(briefing.finalNarrative).toContain('Tycoons');
    expect(briefing.finalNarrative).toMatch(/playoff|October|competitive/i);
  });

  it('is deterministic for the same seed and context', () => {
    const context = createContext();

    expect(generateOnboardingPressConference(createGameRNG(74), context)).toEqual(
      generateOnboardingPressConference(createGameRNG(74), context),
    );
  });
});
