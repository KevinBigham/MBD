export const ONBOARDING_CHAPTER_IDS = [
  'owners_office',
  'know_your_stars',
  'the_farm',
  'coaching_staff',
  'financial_playbook',
  'scouting_intel',
  'season_strategy',
  'press_conference',
] as const;

export type OnboardingChapter = (typeof ONBOARDING_CHAPTER_IDS)[number];
export type ChapterChoiceValue = string | number | boolean;
export type ChapterChoices = Record<string, ChapterChoiceValue>;

export interface OnboardingChapterConfig {
  id: OnboardingChapter;
  title: string;
  subtitle: string;
  estimatedMinutes: number;
  description: string;
  order: number;
}

export interface ChapterProgress {
  chapter: OnboardingChapterConfig;
  status: 'locked' | 'current' | 'complete';
  choicesMade: number;
}

export interface OnboardingState {
  currentChapter: OnboardingChapter;
  completedChapters: OnboardingChapter[];
  choices: Partial<Record<OnboardingChapter, ChapterChoices>>;
  startedAt: number;
  skipped: boolean;
  isComplete: boolean;
}

export interface GMPhilosophy {
  developmentStyle: 'aggressive' | 'patient' | 'balanced';
  spendingStyle: 'big_spender' | 'penny_pincher' | 'balanced';
  tradeApproach: 'buyer' | 'seller' | 'opportunistic';
  scoutingFocus: 'draft' | 'international' | 'pro_scouting';
  seasonGoal: 'championship' | 'playoff' | 'rebuild' | 'compete';
  mediaTone: 'confident' | 'humble' | 'measured';
}

const DEFAULT_STARTED_AT = 0;

const DEFAULT_GM_PHILOSOPHY: GMPhilosophy = {
  developmentStyle: 'balanced',
  spendingStyle: 'balanced',
  tradeApproach: 'opportunistic',
  scoutingFocus: 'draft',
  seasonGoal: 'compete',
  mediaTone: 'measured',
};

export const CHAPTER_ORDER: readonly OnboardingChapterConfig[] = [
  {
    id: 'owners_office',
    title: "Owner's Office",
    subtitle: 'Expectations, budget, and franchise context',
    estimatedMinutes: 1,
    description: 'Start with ownership expectations and the financial runway for your first season.',
    order: 1,
  },
  {
    id: 'know_your_stars',
    title: 'Know Your Stars',
    subtitle: 'Major-league roster snapshot',
    estimatedMinutes: 1,
    description: 'Review the big-league core, contract anchors, and the positions that will decide your season.',
    order: 2,
  },
  {
    id: 'the_farm',
    title: 'The Farm',
    subtitle: 'Prospect pipeline and promotion cadence',
    estimatedMinutes: 1,
    description: 'Understand the system depth, closest reinforcements, and how aggressively to push development.',
    order: 3,
  },
  {
    id: 'coaching_staff',
    title: 'Coaching Staff',
    subtitle: 'Staff quality and development support',
    estimatedMinutes: 1,
    description: 'Evaluate the people responsible for turning tools into production.',
    order: 4,
  },
  {
    id: 'financial_playbook',
    title: 'Financial Playbook',
    subtitle: 'Payroll shape and extension pressure',
    estimatedMinutes: 1,
    description: 'See where the payroll is committed, where flexibility exists, and what spending posture fits the club.',
    order: 5,
  },
  {
    id: 'scouting_intel',
    title: 'Scouting Intel',
    subtitle: 'Division threats and information priorities',
    estimatedMinutes: 1,
    description: 'Scan the division landscape and choose where your scouting department should lean first.',
    order: 6,
  },
  {
    id: 'season_strategy',
    title: 'Season Strategy',
    subtitle: 'Competitive window and operating posture',
    estimatedMinutes: 1,
    description: 'Turn all prior chapters into a clear operating thesis for the season.',
    order: 7,
  },
  {
    id: 'press_conference',
    title: 'Press Conference',
    subtitle: 'Public stance and organizational message',
    estimatedMinutes: 1,
    description: 'Set the tone for how this front office will speak about the club and its priorities.',
    order: 8,
  },
] as const;

function getChapterIndex(chapterId: OnboardingChapter): number {
  return CHAPTER_ORDER.findIndex((chapter) => chapter.id === chapterId);
}

function getLastChapter(): OnboardingChapter {
  return CHAPTER_ORDER[CHAPTER_ORDER.length - 1]!.id;
}

function dedupeCompleted(chapters: OnboardingChapter[]): OnboardingChapter[] {
  return ONBOARDING_CHAPTER_IDS.filter((chapterId) => chapters.includes(chapterId));
}

function getChoiceValue<T extends ChapterChoiceValue>(
  state: OnboardingState,
  chapterId: OnboardingChapter,
  key: string,
): T | undefined {
  const value = state.choices[chapterId]?.[key];
  return value as T | undefined;
}

export function createOnboardingState(): OnboardingState {
  return {
    currentChapter: CHAPTER_ORDER[0]!.id,
    completedChapters: [],
    choices: {},
    startedAt: DEFAULT_STARTED_AT,
    skipped: false,
    isComplete: false,
  };
}

export function advanceChapter(state: OnboardingState): OnboardingState {
  if (state.isComplete) {
    return state;
  }

  const currentIndex = getChapterIndex(state.currentChapter);
  if (currentIndex < 0 || currentIndex >= CHAPTER_ORDER.length - 1) {
    return {
      ...state,
      currentChapter: getLastChapter(),
      isComplete: true,
    };
  }

  return {
    ...state,
    currentChapter: CHAPTER_ORDER[currentIndex + 1]!.id,
  };
}

export function completeChapter(
  state: OnboardingState,
  chapterId: OnboardingChapter,
  choices: ChapterChoices,
): OnboardingState {
  if (state.isComplete) {
    return state;
  }

  if (chapterId !== state.currentChapter) {
    throw new Error(`Cannot complete ${chapterId} because it is not the current chapter.`);
  }

  const nextChoices = {
    ...state.choices,
    [chapterId]: { ...choices },
  };

  if (choices.skipped === true) {
    return {
      currentChapter: getLastChapter(),
      completedChapters: [...ONBOARDING_CHAPTER_IDS],
      choices: nextChoices,
      startedAt: state.startedAt,
      skipped: true,
      isComplete: true,
    };
  }

  const completedChapters = dedupeCompleted([...state.completedChapters, chapterId]);
  const currentIndex = getChapterIndex(chapterId);
  const isLastChapter = currentIndex === CHAPTER_ORDER.length - 1;

  return {
    currentChapter: isLastChapter ? chapterId : CHAPTER_ORDER[currentIndex + 1]!.id,
    completedChapters,
    choices: nextChoices,
    startedAt: state.startedAt,
    skipped: false,
    isComplete: isLastChapter,
  };
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.isComplete || state.skipped || state.completedChapters.length === CHAPTER_ORDER.length;
}

export function getCurrentChapter(state: OnboardingState): OnboardingChapterConfig {
  return CHAPTER_ORDER[getChapterIndex(state.currentChapter)] ?? CHAPTER_ORDER[0]!;
}

export function getChapterProgress(state: OnboardingState): ChapterProgress[] {
  return CHAPTER_ORDER.map((chapter) => ({
    chapter,
    status: state.completedChapters.includes(chapter.id)
      ? 'complete'
      : !state.isComplete && chapter.id === state.currentChapter
        ? 'current'
        : 'locked',
    choicesMade: Object.keys(state.choices[chapter.id] ?? {}).length,
  }));
}

export function getGMPhilosophy(state: OnboardingState): GMPhilosophy {
  const strategyGoal = getChoiceValue<GMPhilosophy['seasonGoal']>(state, 'season_strategy', 'seasonGoal');
  const ownerPreviewGoal = getChoiceValue<GMPhilosophy['seasonGoal']>(state, 'owners_office', 'seasonGoal');

  return {
    developmentStyle:
      getChoiceValue<GMPhilosophy['developmentStyle']>(state, 'the_farm', 'developmentStyle')
      ?? DEFAULT_GM_PHILOSOPHY.developmentStyle,
    spendingStyle:
      getChoiceValue<GMPhilosophy['spendingStyle']>(state, 'financial_playbook', 'spendingStyle')
      ?? DEFAULT_GM_PHILOSOPHY.spendingStyle,
    tradeApproach:
      getChoiceValue<GMPhilosophy['tradeApproach']>(state, 'season_strategy', 'tradeApproach')
      ?? DEFAULT_GM_PHILOSOPHY.tradeApproach,
    scoutingFocus:
      getChoiceValue<GMPhilosophy['scoutingFocus']>(state, 'scouting_intel', 'scoutingFocus')
      ?? DEFAULT_GM_PHILOSOPHY.scoutingFocus,
    seasonGoal: strategyGoal ?? ownerPreviewGoal ?? DEFAULT_GM_PHILOSOPHY.seasonGoal,
    mediaTone:
      getChoiceValue<GMPhilosophy['mediaTone']>(state, 'press_conference', 'mediaTone')
      ?? DEFAULT_GM_PHILOSOPHY.mediaTone,
  };
}
