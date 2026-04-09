import type { GameRNG } from '../math/prng.js';
import type { AssistantGMProfile } from './assistantGM.js';
import { generateAssistantGM, generateFarewell, generateGreeting } from './assistantGM.js';
import type { DialogueLine } from './chapterDialogue.js';
import {
  generateChapterIntro,
  generateChapterTransition,
  generateFarmReaction,
  generateFinancialReaction,
  generateOwnerReaction,
  generatePressReaction,
  generateRosterReaction,
  generateScoutingReaction,
  generateStaffReaction,
  generateStrategyReaction,
  getNextChapter,
} from './chapterDialogue.js';
import type {
  AllChapterData,
  ChapterAssessmentData,
  CoachingTip,
  OnboardingHighlight,
  QuickReferenceCard,
} from './coachingTips.js';
import {
  generateChapterTips,
  generateOnboardingHighlights,
  generateQuickReference,
} from './coachingTips.js';
import type { ChoiceReaction } from './choiceReactions.js';
import {
  reactToDevelopmentStyle,
  reactToMediaTone,
  reactToScoutingFocus,
  reactToSeasonGoal,
  reactToSpendingStyle,
  reactToTradeApproach,
} from './choiceReactions.js';
import {
  CHAPTER_ORDER,
  type GMPhilosophy,
  type OnboardingChapter,
  type OnboardingChapterConfig,
} from './flowEngine.js';

export interface OnboardingScriptContext {
  gmName: string;
  teamName: string;
  teamId: string;
  allChapterData: AllChapterData;
  philosophy: GMPhilosophy;
}

export interface ChapterScript {
  chapter: OnboardingChapterConfig;
  intro: DialogueLine[];
  assessmentData: ChapterAssessmentData;
  reaction: DialogueLine[];
  tips: CoachingTip[];
  transition: DialogueLine | null;
  choiceReactions: Record<string, ChoiceReaction>;
}

export interface OnboardingScript {
  assistantProfile: AssistantGMProfile;
  greeting: string;
  chapters: ChapterScript[];
  farewell: string;
  highlights: OnboardingHighlight[];
  quickReference: QuickReferenceCard;
  totalDialogueLines: number;
}

const WINDOW_STRENGTH_ADJUSTMENT: Record<AllChapterData['strategy']['competitiveWindow'], number> = {
  win_now: 6,
  stable_contender: 3,
  transitioning: 0,
  retooling: -3,
  rebuild: -8,
};

function getChapterConfig(chapter: OnboardingChapter): OnboardingChapterConfig {
  const config = CHAPTER_ORDER.find((entry) => entry.id === chapter);
  if (config == null) {
    throw new Error(`Unknown onboarding chapter: ${chapter}`);
  }

  return config;
}

function buildSparseChapterData(
  chapter: OnboardingChapter,
  allChapterData: AllChapterData,
): ChapterAssessmentData {
  switch (chapter) {
    case 'owners_office':
      return { owner: allChapterData.owner };
    case 'know_your_stars':
      return { roster: allChapterData.roster };
    case 'the_farm':
      return { farm: allChapterData.farm };
    case 'coaching_staff':
      return { staff: allChapterData.staff };
    case 'financial_playbook':
      return { financial: allChapterData.financial };
    case 'scouting_intel':
      return { scouting: allChapterData.scouting };
    case 'season_strategy':
      return { strategy: allChapterData.strategy };
    case 'press_conference':
      return { press: allChapterData.press };
  }
}

function buildReaction(
  rng: GameRNG,
  profile: AssistantGMProfile,
  chapter: OnboardingChapter,
  chapterData: ChapterAssessmentData,
): DialogueLine[] {
  switch (chapter) {
    case 'owners_office':
      return generateOwnerReaction(rng, profile, chapterData.owner!);
    case 'know_your_stars':
      return generateRosterReaction(rng, profile, chapterData.roster!);
    case 'the_farm':
      return generateFarmReaction(rng, profile, chapterData.farm!);
    case 'coaching_staff':
      return generateStaffReaction(rng, profile, chapterData.staff!);
    case 'financial_playbook':
      return generateFinancialReaction(rng, profile, chapterData.financial!);
    case 'scouting_intel':
      return generateScoutingReaction(rng, profile, chapterData.scouting!);
    case 'season_strategy':
      return generateStrategyReaction(rng, profile, chapterData.strategy!);
    case 'press_conference':
      return generatePressReaction(rng, profile, chapterData.press!);
  }
}

function baseTeamStrength(grade: string): number {
  switch (grade) {
    case 'A':
      return 82;
    case 'B':
      return 70;
    case 'C':
      return 58;
    case 'D':
      return 46;
    case 'F':
    default:
      return 36;
  }
}

function teamStrengthScore(allChapterData: AllChapterData): number {
  const base = baseTeamStrength(allChapterData.roster.lineup.overallGrade);
  const windowAdjustment = WINDOW_STRENGTH_ADJUSTMENT[allChapterData.strategy.competitiveWindow] ?? 0;
  const adjusted = base + windowAdjustment;
  return Math.max(35, Math.min(90, adjusted));
}

function buildChoiceReactionRecord(
  entries: Array<readonly [string, ChoiceReaction]>,
): Record<string, ChoiceReaction> {
  return Object.fromEntries(entries);
}

function buildChoiceReactions(
  rng: GameRNG,
  profile: AssistantGMProfile,
  chapter: OnboardingChapter,
  allChapterData: AllChapterData,
): Record<string, ChoiceReaction> {
  switch (chapter) {
    case 'owners_office':
      return buildChoiceReactionRecord(
        allChapterData.owner.seasonGoalOptions.map((option) => [
          option.id,
          reactToSeasonGoal(
            rng.fork(),
            profile,
            option.id as GMPhilosophy['seasonGoal'],
            teamStrengthScore(allChapterData),
          ),
        ] as const),
      );
    case 'the_farm':
      return buildChoiceReactionRecord(
        allChapterData.farm.developmentOptions.map((option) => [
          option.id,
          reactToDevelopmentStyle(
            rng.fork(),
            profile,
            option.id as GMPhilosophy['developmentStyle'],
            allChapterData.farm.pipeline.grade,
          ),
        ] as const),
      );
    case 'financial_playbook':
      return buildChoiceReactionRecord(
        allChapterData.financial.spendingOptions.map((option) => [
          option.id,
          reactToSpendingStyle(
            rng.fork(),
            profile,
            option.id as GMPhilosophy['spendingStyle'],
            allChapterData.financial.flexibility.grade,
          ),
        ] as const),
      );
    case 'scouting_intel':
      return buildChoiceReactionRecord(
        allChapterData.scouting.scoutingFocusOptions.map((option) => [
          option.id,
          reactToScoutingFocus(
            rng.fork(),
            profile,
            option.id as GMPhilosophy['scoutingFocus'],
            allChapterData.farm.pipeline.grade,
          ),
        ] as const),
      );
    case 'season_strategy':
      return buildChoiceReactionRecord(
        allChapterData.strategy.strategyOptions.map((option) => [
          option.id,
          reactToTradeApproach(
            rng.fork(),
            profile,
            option.id as GMPhilosophy['tradeApproach'],
            allChapterData.strategy.competitiveWindow,
          ),
        ] as const),
      );
    case 'press_conference':
      return buildChoiceReactionRecord(
        allChapterData.press.openingStatementOptions.map((option) => [
          option.id,
          reactToMediaTone(
            rng.fork(),
            profile,
            option.id as GMPhilosophy['mediaTone'],
          ),
        ] as const),
      );
    case 'know_your_stars':
    case 'coaching_staff':
    default:
      return {};
  }
}

function countDialogueLines(chapters: ChapterScript[]): number {
  return 2 + chapters.reduce((sum, chapter) => (
    sum
    + chapter.intro.length
    + chapter.reaction.length
    + (chapter.transition == null ? 0 : 1)
  ), 0);
}

export function generateChapterScript(
  rng: GameRNG,
  profile: AssistantGMProfile,
  chapter: OnboardingChapter,
  allChapterData: AllChapterData,
  teamName: string,
): ChapterScript {
  const chapterConfig = getChapterConfig(chapter);
  const assessmentData = buildSparseChapterData(chapter, allChapterData);
  const intro = generateChapterIntro(rng.fork(), profile, chapter, teamName);
  const reaction = buildReaction(rng.fork(), profile, chapter, assessmentData);
  const tips = generateChapterTips(profile, chapter, assessmentData);
  const nextChapter = getNextChapter(chapter);
  const transition = nextChapter == null ? null : generateChapterTransition(rng.fork(), profile, chapter, nextChapter);
  const choiceReactions = buildChoiceReactions(rng.fork(), profile, chapter, allChapterData);

  return {
    chapter: chapterConfig,
    intro,
    assessmentData,
    reaction,
    tips,
    transition,
    choiceReactions,
  };
}

export function generateFullOnboardingScript(
  rng: GameRNG,
  context: OnboardingScriptContext,
): OnboardingScript {
  const assistantProfile = generateAssistantGM(rng.fork());
  const greeting = generateGreeting(rng.fork(), assistantProfile, context.gmName, context.teamName);
  const chapters = CHAPTER_ORDER.map((chapter) => (
    generateChapterScript(rng.fork(), assistantProfile, chapter.id, context.allChapterData, context.teamName)
  ));
  const farewell = generateFarewell(rng.fork(), assistantProfile, context.gmName, context.philosophy);
  const highlights = generateOnboardingHighlights(rng.fork(), assistantProfile, context.allChapterData);
  const quickReference = generateQuickReference(context.allChapterData, context.philosophy);

  return {
    assistantProfile,
    greeting,
    chapters,
    farewell,
    highlights,
    quickReference,
    totalDialogueLines: countDialogueLines(chapters),
  };
}
