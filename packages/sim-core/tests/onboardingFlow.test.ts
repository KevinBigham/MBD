import { describe, expect, it } from 'vitest';
import {
  CHAPTER_ORDER,
  advanceChapter,
  completeChapter,
  createGameRNG,
  createOnboardingState,
  getChapterProgress,
  getCurrentChapter,
  getGMPhilosophy,
  isOnboardingComplete,
  type ChapterChoices,
  type OnboardingChapter,
} from '../src/index.js';

function makeChoices(seed: number, overrides: ChapterChoices = {}): ChapterChoices {
  const rng = createGameRNG(seed);

  return {
    confidenceScore: rng.nextInt(40, 90),
    recommendGoal: rng.weightedPick(['championship', 'playoff', 'compete', 'rebuild'], [1, 2, 3, 1]),
    ...overrides,
  };
}

const CHAPTER_IDS: OnboardingChapter[] = [
  'owners_office',
  'know_your_stars',
  'the_farm',
  'coaching_staff',
  'financial_playbook',
  'scouting_intel',
  'season_strategy',
  'press_conference',
];

describe('createGameRNG', () => {
  it('builds identical deterministic sequences for the same seed', () => {
    const first = createGameRNG(77);
    const second = createGameRNG(77);

    expect(first.nextInt(1, 100)).toBe(second.nextInt(1, 100));
    expect(first.nextFloat()).toBe(second.nextFloat());
  });
});

describe('onboarding flow engine', () => {
  it('starts at the owners office chapter with a serializable empty state', () => {
    const state = createOnboardingState();

    expect(state.currentChapter).toBe('owners_office');
    expect(state.completedChapters).toEqual([]);
    expect(state.choices).toEqual({});
    expect(state.startedAt).toBe(0);
    expect(state.skipped).toBe(false);
    expect(state.isComplete).toBe(false);
  });

  it('defines exactly eight chapters in the intended order', () => {
    expect(CHAPTER_ORDER).toHaveLength(8);
    expect(CHAPTER_ORDER.map((chapter) => chapter.id)).toEqual(CHAPTER_IDS);
    expect(CHAPTER_ORDER.map((chapter) => chapter.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('returns the current chapter config for a fresh state', () => {
    const chapter = getCurrentChapter(createOnboardingState());

    expect(chapter.id).toBe('owners_office');
    expect(chapter.title.length).toBeGreaterThan(0);
    expect(chapter.estimatedMinutes).toBeGreaterThan(0);
  });

  it('advances to the next chapter after completing the current one', () => {
    const state = completeChapter(createOnboardingState(), 'owners_office', makeChoices(1));

    expect(state.completedChapters).toEqual(['owners_office']);
    expect(state.currentChapter).toBe('know_your_stars');
    expect(state.isComplete).toBe(false);
  });

  it('stores chapter choices keyed by chapter id', () => {
    const choices = makeChoices(2, { recommendedGoal: 'playoff' });
    const state = completeChapter(createOnboardingState(), 'owners_office', choices);

    expect(state.choices.owners_office).toEqual(choices);
  });

  it('does not allow chapters to complete out of order', () => {
    expect(() => completeChapter(createOnboardingState(), 'the_farm', makeChoices(3))).toThrow(
      /current chapter/i,
    );
  });

  it('marks onboarding complete after the eighth chapter', () => {
    let state = createOnboardingState();

    for (const [index, chapterId] of CHAPTER_IDS.entries()) {
      state = completeChapter(state, chapterId, makeChoices(index + 10));
    }

    expect(state.currentChapter).toBe('press_conference');
    expect(state.completedChapters).toEqual(CHAPTER_IDS);
    expect(state.isComplete).toBe(true);
    expect(isOnboardingComplete(state)).toBe(true);
  });

  it('supports skip-to-complete from the current chapter', () => {
    const skipped = completeChapter(createOnboardingState(), 'owners_office', makeChoices(4, { skipped: true }));

    expect(skipped.skipped).toBe(true);
    expect(skipped.completedChapters).toEqual(CHAPTER_IDS);
    expect(skipped.isComplete).toBe(true);
  });

  it('treats explicit skip as onboarding completion', () => {
    const skipped = completeChapter(createOnboardingState(), 'owners_office', makeChoices(5, { skipped: true }));

    expect(isOnboardingComplete(skipped)).toBe(true);
  });

  it('returns a no-op when advancing a completed onboarding state', () => {
    const skipped = completeChapter(createOnboardingState(), 'owners_office', makeChoices(6, { skipped: true }));
    const advanced = advanceChapter(skipped);

    expect(advanced).toEqual(skipped);
  });

  it('reports chapter progress with locked, current, and complete statuses', () => {
    const completed = completeChapter(createOnboardingState(), 'owners_office', makeChoices(7));
    const progress = getChapterProgress(completed);

    expect(progress[0]?.status).toBe('complete');
    expect(progress[0]?.choicesMade).toBeGreaterThan(0);
    expect(progress[1]?.status).toBe('current');
    expect(progress[2]?.status).toBe('locked');
  });

  it('extracts GM philosophy from the canonical chapter choices', () => {
    let state = createOnboardingState();
    state = completeChapter(state, 'owners_office', makeChoices(8, { seasonGoal: 'playoff' }));
    state = completeChapter(state, 'know_your_stars', makeChoices(9));
    state = completeChapter(state, 'the_farm', makeChoices(10, { developmentStyle: 'aggressive' }));
    state = completeChapter(state, 'coaching_staff', makeChoices(11));
    state = completeChapter(state, 'financial_playbook', makeChoices(12, { spendingStyle: 'big_spender' }));
    state = completeChapter(state, 'scouting_intel', makeChoices(13, { scoutingFocus: 'international' }));
    state = completeChapter(state, 'season_strategy', makeChoices(14, {
      tradeApproach: 'buyer',
      seasonGoal: 'championship',
    }));
    state = completeChapter(state, 'press_conference', makeChoices(15, { mediaTone: 'confident' }));

    expect(getGMPhilosophy(state)).toEqual({
      developmentStyle: 'aggressive',
      spendingStyle: 'big_spender',
      tradeApproach: 'buyer',
      scoutingFocus: 'international',
      seasonGoal: 'championship',
      mediaTone: 'confident',
    });
  });

  it('falls back to defaults when philosophy choices are missing', () => {
    const state = createOnboardingState();

    expect(getGMPhilosophy(state)).toEqual({
      developmentStyle: 'balanced',
      spendingStyle: 'balanced',
      tradeApproach: 'opportunistic',
      scoutingFocus: 'draft',
      seasonGoal: 'compete',
      mediaTone: 'measured',
    });
  });

  it('falls back to the owner preview goal if season strategy was skipped', () => {
    let state = createOnboardingState();
    state = completeChapter(state, 'owners_office', makeChoices(16, { seasonGoal: 'rebuild' }));
    state = completeChapter(state, 'know_your_stars', makeChoices(17));
    state = completeChapter(state, 'the_farm', makeChoices(18, { developmentStyle: 'patient' }));
    state = completeChapter(state, 'coaching_staff', makeChoices(19));
    state = completeChapter(state, 'financial_playbook', makeChoices(20, { spendingStyle: 'penny_pincher' }));
    state = completeChapter(state, 'scouting_intel', makeChoices(21, { scoutingFocus: 'pro_scouting' }));
    state = completeChapter(state, 'season_strategy', makeChoices(22, { skipped: true }));

    expect(getGMPhilosophy(state)).toEqual({
      developmentStyle: 'patient',
      spendingStyle: 'penny_pincher',
      tradeApproach: 'opportunistic',
      scoutingFocus: 'pro_scouting',
      seasonGoal: 'rebuild',
      mediaTone: 'measured',
    });
  });
});
