import { describe, expect, it } from 'vitest';
import {
  REVISED_CHAPTER_ORDER,
  advanceRevisedChapter,
  createRevisedOnboardingState,
  generateScoutingHiringSlate,
  generateScoutingStaff,
  generateCoachingStaff,
  getOnboardingResult,
  setPhilosophyChoiceInFlow,
  setScoutingHireInFlow,
  setStaffHiresInFlow,
  selectAGMInFlow,
  type StaffHireChoices,
} from '../src/index.js';
import { GameRNG } from '../src/math/prng.js';

function createHiringContext() {
  return {
    teamId: 'nym',
    teamName: 'New York Tycoons',
    coachingStaff: generateCoachingStaff(new GameRNG(301), 'nym'),
    scoutingStaff: generateScoutingStaff(new GameRNG(302), 'nym'),
  };
}

describe('revised onboarding flow', () => {
  it('defines the new nine-phase chapter order', () => {
    expect(REVISED_CHAPTER_ORDER.map((chapter) => chapter.id)).toEqual([
      'agm_selection',
      'owners_office',
      'roster_review',
      'hire_coaches',
      'farm_system',
      'hire_scouts',
      'financial_plan',
      'season_strategy',
      'press_conference',
    ]);
  });

  it('starts at AGM selection with no hires or philosophy choices recorded', () => {
    const state = createRevisedOnboardingState();

    expect(state.currentChapter).toBe(0);
    expect(state.selectedAGMId).toBeNull();
    expect(state.staffHires).toBeNull();
    expect(state.scoutingHire).toBeNull();
    expect(state.philosophy).toEqual({});
  });

  it('requires AGM selection before later onboarding choices can be recorded', () => {
    const hires: StaffHireChoices = {
      managerId: 'manager',
      pitchingCoachId: 'pitching',
      hittingCoachId: 'hitting',
    };

    expect(() => setStaffHiresInFlow(createRevisedOnboardingState(), hires)).toThrow(/agm/i);
  });

  it('records each revised onboarding decision in chapter order and completes at the press conference', () => {
    const scoutingSlate = generateScoutingHiringSlate(createHiringContext(), new GameRNG(303));
    const hires: StaffHireChoices = {
      managerId: 'staff-nym-manager-analytics',
      pitchingCoachId: 'staff-nym-pitching-development',
      hittingCoachId: 'staff-nym-hitting-approach',
    };

    let state = createRevisedOnboardingState();
    state = selectAGMInFlow(state, 'marcus_chen');
    state = setPhilosophyChoiceInFlow(state, 'seasonGoal', 'playoff');
    state = advanceRevisedChapter(state);
    state = setStaffHiresInFlow(state, hires);
    state = setPhilosophyChoiceInFlow(state, 'developmentStyle', 'patient');
    state = setScoutingHireInFlow(state, scoutingSlate.candidates[2].id);
    state = setPhilosophyChoiceInFlow(state, 'spendingStyle', 'balanced');
    state = setPhilosophyChoiceInFlow(state, 'tradeApproach', 'opportunistic');
    state = setPhilosophyChoiceInFlow(state, 'mediaTone', 'measured');

    const result = getOnboardingResult(state, scoutingSlate);

    expect(state.currentChapter).toBe(REVISED_CHAPTER_ORDER.length - 1);
    expect(state.isComplete).toBe(true);
    expect(result.selectedAGMId).toBe('marcus_chen');
    expect(result.staffHires).toEqual(hires);
    expect(result.scoutingHire).toBe(scoutingSlate.candidates[2].id);
    expect(result.gmPhilosophy.scoutingFocus).toBe('pro_scouting');
    expect(result.gmPhilosophy.seasonGoal).toBe('playoff');
  });
});
