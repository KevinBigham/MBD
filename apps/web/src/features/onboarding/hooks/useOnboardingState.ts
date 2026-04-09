import { useReducer } from 'react';
import type {
  DialogueLine,
  OnboardingChapter,
  OnboardingScript,
  AllChapterData,
  GMPhilosophy,
} from '@mbd/sim-core';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type WizardPhase = 'loading' | 'greeting' | 'chapter' | 'complete';

export interface OnboardingWizardState {
  phase: WizardPhase;
  currentChapter: number; // 0–7 index into CHAPTER_ORDER
  choices: Record<string, string>; // chapterId → choiceId
  script: OnboardingScript | null;
  chapterData: AllChapterData | null;
  showingReaction: boolean; // true while AGM reaction is animating
}

const INITIAL_STATE: OnboardingWizardState = {
  phase: 'loading',
  currentChapter: 0,
  choices: {},
  script: null,
  chapterData: null,
  showingReaction: false,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

type OnboardingAction =
  | { type: 'LOADED'; script: OnboardingScript; chapterData: AllChapterData }
  | { type: 'ADVANCE_TO_CHAPTERS' }
  | { type: 'SELECT_CHOICE'; chapterId: string; choiceId: string }
  | { type: 'REACTION_COMPLETE' }
  | { type: 'NEXT_CHAPTER' }
  | { type: 'COMPLETE' }
  | { type: 'SKIP' };

const TOTAL_CHAPTERS = 8;

function reducer(
  state: OnboardingWizardState,
  action: OnboardingAction,
): OnboardingWizardState {
  switch (action.type) {
    case 'LOADED':
      return {
        ...state,
        phase: 'greeting',
        script: action.script,
        chapterData: action.chapterData,
      };

    case 'ADVANCE_TO_CHAPTERS':
      return { ...state, phase: 'chapter', currentChapter: 0 };

    case 'SELECT_CHOICE':
      return {
        ...state,
        choices: { ...state.choices, [action.chapterId]: action.choiceId },
        showingReaction: true,
      };

    case 'REACTION_COMPLETE':
      return { ...state, showingReaction: false };

    case 'NEXT_CHAPTER': {
      const next = state.currentChapter + 1;
      if (next >= TOTAL_CHAPTERS) {
        return { ...state, phase: 'complete' };
      }
      return { ...state, currentChapter: next, showingReaction: false };
    }

    case 'COMPLETE':
      return { ...state, phase: 'complete' };

    case 'SKIP':
      return { ...state, phase: 'complete' };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useOnboardingState() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  return { state, dispatch } as const;
}

// ---------------------------------------------------------------------------
// Philosophy extraction
// ---------------------------------------------------------------------------

/** Derive GMPhilosophy from user choices, falling back to balanced defaults. */
export function extractPhilosophy(
  choices: Record<string, string>,
): GMPhilosophy {
  return {
    seasonGoal: (choices['owners_office'] ?? 'compete') as GMPhilosophy['seasonGoal'],
    developmentStyle: (choices['the_farm'] ?? 'balanced') as GMPhilosophy['developmentStyle'],
    spendingStyle: (choices['financial_playbook'] ?? 'balanced') as GMPhilosophy['spendingStyle'],
    scoutingFocus: (choices['scouting_intel'] ?? 'draft') as GMPhilosophy['scoutingFocus'],
    tradeApproach: (choices['season_strategy'] ?? 'opportunistic') as GMPhilosophy['tradeApproach'],
    mediaTone: (choices['press_conference'] ?? 'measured') as GMPhilosophy['mediaTone'],
  };
}
