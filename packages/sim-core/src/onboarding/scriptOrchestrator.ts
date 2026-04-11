import type { GameRNG } from '../math/prng.js';
import type { AssistantGMProfile } from './assistantGM.js';
import { generateAssistantGM, generateFarewell, generateGreeting } from './assistantGM.js';
import type { AGMCandidate, AGMCandidateId } from './agmCandidates.js';
import { toAssistantGMProfile } from './agmCandidates.js';
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
  REVISED_CHAPTER_ORDER,
  type RevisedChapterConfig,
  type RevisedChapterId,
  type GMPhilosophy,
  type OnboardingChapter,
  type OnboardingChapterConfig,
} from './flowEngine.js';
import { ROUND_THREE_DIALOGUE } from './roundThreeDialogue.js';
import type {
  ScoutingHiringSlate,
  StaffHiringSlate,
} from './staffHiring.js';

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

export interface RevisedOnboardingScriptContext {
  selectedAGM: AGMCandidate;
  gmName: string;
  teamName: string;
  allChapterData: AllChapterData;
  staffSlate: StaffHiringSlate;
  scoutingSlate: ScoutingHiringSlate;
  philosophy?: Partial<GMPhilosophy>;
}

export interface RevisedChapterScript {
  chapter: RevisedChapterConfig;
  intro: DialogueLine[];
  assessmentData: ChapterAssessmentData | null;
  reaction: DialogueLine[];
  transition: DialogueLine | null;
  choiceReactions: Record<string, ChoiceReaction>;
  candidateIds: string[];
}

export interface AGMStaffOpinion {
  candidateId: string;
  agreementLevel: 'recommend' | 'neutral' | 'caution';
  lines: DialogueLine[];
}

export interface RevisedOnboardingScript {
  agm: AGMCandidate;
  greeting: DialogueLine[];
  chapters: Record<RevisedChapterId, RevisedChapterScript>;
  farewell: DialogueLine[];
  staffOpinions: Record<string, AGMStaffOpinion>;
  scoutOpinions: Record<string, AGMStaffOpinion>;
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

function makeDialogueLine(
  text: string,
  tone: DialogueLine['tone'],
  emphasis: string | null = null,
  referencedPlayerName: string | null = null,
  referencedStat: string | null = null,
): DialogueLine {
  return {
    speaker: 'assistant_gm',
    text,
    tone,
    emphasis,
    referencedPlayerName,
    referencedStat,
  };
}

const EMPTY_CHAPTER_ASSESSMENT_DATA: ChapterAssessmentData = {};

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

function legacyChapterFromRevised(chapter: RevisedChapterId): OnboardingChapter | null {
  switch (chapter) {
    case 'owners_office':
      return 'owners_office';
    case 'roster_review':
      return 'know_your_stars';
    case 'farm_system':
      return 'the_farm';
    case 'financial_plan':
      return 'financial_playbook';
    case 'season_strategy':
      return 'season_strategy';
    case 'press_conference':
      return 'press_conference';
    case 'agm_selection':
    case 'hire_coaches':
    case 'hire_scouts':
      return null;
  }
}

function defaultRevisedPhilosophy(allChapterData: AllChapterData): GMPhilosophy {
  return {
    seasonGoal: allChapterData.strategy.recommendedSeasonGoal,
    developmentStyle: 'balanced',
    spendingStyle: 'balanced',
    tradeApproach: allChapterData.strategy.recommendedTradeApproach,
    scoutingFocus: 'draft',
    mediaTone: allChapterData.press.recommendedTone,
  };
}

function mergePhilosophy(
  allChapterData: AllChapterData,
  philosophy?: Partial<GMPhilosophy>,
): GMPhilosophy {
  return {
    ...defaultRevisedPhilosophy(allChapterData),
    ...philosophy,
  };
}

/**
 * Manager opinion mapping per AGM character.
 * - Marcus (marcus_chen): recommends analytics, cautious on traditional
 * - Walt (walt_kowalski): recommends traditional, cautious on analytics
 * - Elena (elena_vargas): recommends players_manager, neutral elsewhere
 */
function managerOpinionLevel(agm: AGMCandidate, style: string): AGMStaffOpinion['agreementLevel'] {
  if (agm.id === 'marcus_chen') {
    return style === 'analytics' ? 'recommend' : style === 'traditional' ? 'caution' : 'neutral';
  }
  if (agm.id === 'walt_kowalski') {
    return style === 'traditional' ? 'recommend' : style === 'analytics' ? 'caution' : 'neutral';
  }
  return style === 'players_manager' ? 'recommend' : 'neutral';
}

/**
 * Pitching / hitting coach opinion mapping per AGM.
 * Captures the Muse Spark character tendencies:
 * - Marcus prefers developer (young staff ROI) and approach coach (walks)
 * - Walt prefers game_planner (veteran feel) and power (hit it hard)
 * - Elena is neutral but leans toward approach coach
 */
function coachOpinionLevel(agm: AGMCandidate, role: string, style: string): AGMStaffOpinion['agreementLevel'] {
  if (role === 'pitching_coach') {
    if (agm.id === 'marcus_chen') return style === 'development' ? 'recommend' : 'neutral';
    if (agm.id === 'walt_kowalski') return style === 'game_planning' ? 'recommend' : 'neutral';
    return 'neutral';
  }
  if (role === 'hitting_coach') {
    if (agm.id === 'marcus_chen') return style === 'approach' ? 'recommend' : 'neutral';
    if (agm.id === 'walt_kowalski') return style === 'power' ? 'recommend' : 'neutral';
    if (agm.id === 'elena_vargas') return style === 'approach' ? 'recommend' : 'neutral';
  }
  return 'neutral';
}

/**
 * Character-specific opinion dialogue.
 * Each AGM's signature voice drives the lead line; the follow-up reinforces
 * the character's lens on the decision.
 */
const CANDIDATE_OPINION_LEADS: Record<AGMCandidateId, Record<AGMStaffOpinion['agreementLevel'], (name: string, subject: string) => string>> = {
  marcus_chen: {
    recommend: (name, subject) => `${name} maximizes expected value for this ${subject}. Hire him.`,
    caution: (name, subject) => `${name} has the wrong profile for this ${subject}. Numbers disagree.`,
    neutral: (name, subject) => `${name} is workable for the ${subject}. Outcome variance is higher than I'd like.`,
  },
  walt_kowalski: {
    recommend: (name, subject) => `${name}. Now that's a baseball man. He'll do right by this ${subject}.`,
    caution: (name, subject) => `${name}? I wouldn't. Wrong fit for this ${subject}. Trust me.`,
    neutral: (name, subject) => `${name} can do the job. Not the one I'd pick, but he won't embarrass the ${subject}.`,
  },
  elena_vargas: {
    recommend: (name, subject) => `${name} -- trust me on this one. He'll build the ${subject} right.`,
    caution: (name, subject) => `${name} worries me. I've seen this before and it doesn't end well for the ${subject}.`,
    neutral: (name, subject) => `${name} is a good person. The fit for the ${subject} depends on what you value.`,
  },
};

const CANDIDATE_OPINION_FOLLOWUPS: Record<AGMCandidateId, string> = {
  marcus_chen: 'Expected value is clear if you look at the profile.',
  walt_kowalski: 'Baseball feel matters more than the paper. I know what I see.',
  elena_vargas: "Players will either run through walls for him or they won't. That matters.",
};

function candidateOpinionLines(
  agm: AGMCandidate,
  candidateName: string,
  subject: string,
  level: AGMStaffOpinion['agreementLevel'],
): DialogueLine[] {
  const leadBuilder = CANDIDATE_OPINION_LEADS[agm.id][level];
  const followUp = CANDIDATE_OPINION_FOLLOWUPS[agm.id];

  return [
    makeDialogueLine(
      leadBuilder(candidateName, subject),
      level === 'recommend' ? 'encouraging' : level === 'caution' ? 'cautionary' : 'informative',
    ),
    makeDialogueLine(followUp, 'informative'),
  ];
}

function buildStaffOpinions(
  agm: AGMCandidate,
  staffSlate: StaffHiringSlate,
): Record<string, AGMStaffOpinion> {
  const allCandidates = [
    ...staffSlate.managerCandidates,
    ...staffSlate.pitchingCoachCandidates,
    ...staffSlate.hittingCoachCandidates,
  ];

  return Object.fromEntries(
    allCandidates.map((candidate) => {
      const level = candidate.role === 'manager'
        ? managerOpinionLevel(agm, candidate.style)
        : coachOpinionLevel(agm, candidate.role, candidate.style);

      return [
        candidate.id,
        {
          candidateId: candidate.id,
          agreementLevel: level,
          lines: candidateOpinionLines(agm, candidate.name, candidate.role.replaceAll('_', ' '), level),
        } satisfies AGMStaffOpinion,
      ] as const;
    }),
  );
}

/**
 * Scouting director opinion mapping per AGM character.
 * - Marcus: recommends draft (most efficient market)
 * - Walt: recommends pro_scouting (win now, knows the league)
 * - Elena: recommends international (her expertise, her network)
 */
function buildScoutOpinions(
  agm: AGMCandidate,
  scoutingSlate: ScoutingHiringSlate,
): Record<string, AGMStaffOpinion> {
  return Object.fromEntries(
    scoutingSlate.candidates.map((candidate) => {
      let level: AGMStaffOpinion['agreementLevel'] = 'neutral';
      if (agm.id === 'marcus_chen') {
        level = candidate.specialty === 'draft' ? 'recommend' : 'neutral';
      } else if (agm.id === 'walt_kowalski') {
        level = candidate.specialty === 'pro_scouting' ? 'recommend' : 'neutral';
      } else if (agm.id === 'elena_vargas') {
        level = candidate.specialty === 'international' ? 'recommend' : 'neutral';
      }

      return [
        candidate.id,
        {
          candidateId: candidate.id,
          agreementLevel: level,
          lines: candidateOpinionLines(agm, candidate.name, 'scouting operation', level),
        } satisfies AGMStaffOpinion,
      ] as const;
    }),
  );
}

function revisedIntro(
  rng: GameRNG,
  agmProfile: AssistantGMProfile,
  agm: AGMCandidate,
  chapter: RevisedChapterId,
  teamName: string,
): DialogueLine[] {
  const roundThreeDialogue = ROUND_THREE_DIALOGUE[agm.id][chapter];
  if (roundThreeDialogue.length > 0) {
    return roundThreeDialogue.map((entry) => ({ ...entry }));
  }

  switch (chapter) {
    case 'agm_selection':
      return [
        makeDialogueLine(`First day in the chair starts with choosing who you want beside you in ${teamName}.`, 'informative'),
        makeDialogueLine(`${agm.name} is one of the candidates on the board, and each option will tilt the room a little differently.`, 'serious'),
      ];
    case 'hire_coaches':
      return [
        makeDialogueLine('The last regime left you an opening on the major-league staff. That is a problem and an opportunity.', 'serious'),
        makeDialogueLine('Manager, pitching coach, hitting coach. Those are the hires that change how the club feels every day.', 'informative'),
      ];
    case 'hire_scouts':
      return [
        makeDialogueLine('If you want sharper decisions, start with the eyes feeding this front office.', 'serious'),
        makeDialogueLine('The scouting director will decide where the department spends its best attention.', 'informative'),
      ];
    default: {
      const legacyChapter = legacyChapterFromRevised(chapter);
      if (legacyChapter == null) {
        return [
          makeDialogueLine(`${teamName} needs a clean read here before the day moves on.`, 'informative'),
        ];
      }
      return generateChapterIntro(rng, agmProfile, legacyChapter, teamName);
    }
  }
}

function revisedReaction(
  rng: GameRNG,
  profile: AssistantGMProfile,
  chapter: RevisedChapterId,
  allChapterData: AllChapterData,
): DialogueLine[] {
  const legacyChapter = legacyChapterFromRevised(chapter);
  if (legacyChapter == null) {
    switch (chapter) {
      case 'agm_selection':
        return [
          makeDialogueLine('Pick the voice you want in the room every morning. That choice matters more than people admit.', 'philosophical'),
        ];
      case 'hire_coaches':
        return [
          makeDialogueLine('The staff is how philosophy turns into repetition. Get those hires right and the rest moves faster.', 'serious'),
        ];
      case 'hire_scouts':
        return [
          makeDialogueLine('A good scouting lead keeps the whole operation from guessing. That is real leverage.', 'encouraging'),
        ];
      default:
        return [makeDialogueLine('This chapter still needs a decision before we move.', 'informative')];
    }
  }

  return buildReaction(rng, profile, legacyChapter, buildSparseChapterData(legacyChapter, allChapterData));
}

function revisedChoiceReactions(
  rng: GameRNG,
  profile: AssistantGMProfile,
  chapter: RevisedChapterId,
  allChapterData: AllChapterData,
): Record<string, ChoiceReaction> {
  const legacyChapter = legacyChapterFromRevised(chapter);
  return legacyChapter == null ? {} : buildChoiceReactions(rng, profile, legacyChapter, allChapterData);
}

function revisedAssessmentData(
  chapter: RevisedChapterId,
  allChapterData: AllChapterData,
): ChapterAssessmentData | null {
  const legacyChapter = legacyChapterFromRevised(chapter);
  return legacyChapter == null ? EMPTY_CHAPTER_ASSESSMENT_DATA : buildSparseChapterData(legacyChapter, allChapterData);
}

function revisedTransition(
  rng: GameRNG,
  profile: AssistantGMProfile,
  currentChapter: RevisedChapterId,
): DialogueLine | null {
  const currentIndex = REVISED_CHAPTER_ORDER.findIndex((chapter) => chapter.id === currentChapter);
  const next = REVISED_CHAPTER_ORDER[currentIndex + 1];
  if (next == null) {
    return null;
  }

  return makeDialogueLine(
    `Next up: ${next.label}.`,
    'informative',
    `${currentChapter}->${next.id}`,
  );
}

function chapterCandidateIds(
  chapter: RevisedChapterId,
  staffSlate: StaffHiringSlate,
  scoutingSlate: ScoutingHiringSlate,
): string[] {
  switch (chapter) {
    case 'hire_coaches':
      return [
        ...staffSlate.managerCandidates.map((candidate) => candidate.id),
        ...staffSlate.pitchingCoachCandidates.map((candidate) => candidate.id),
        ...staffSlate.hittingCoachCandidates.map((candidate) => candidate.id),
      ];
    case 'hire_scouts':
      return scoutingSlate.candidates.map((candidate) => candidate.id);
    default:
      return [];
  }
}

export function generateRevisedOnboardingScript(
  rng: GameRNG,
  context: RevisedOnboardingScriptContext,
): RevisedOnboardingScript {
  const assistantProfile = toAssistantGMProfile(context.selectedAGM);
  const philosophy = mergePhilosophy(context.allChapterData, context.philosophy);
  const greeting = [
    makeDialogueLine(
      generateGreeting(rng.fork(), assistantProfile, context.gmName, context.teamName),
      'informative',
    ),
  ];

  const chapters = Object.fromEntries(
    REVISED_CHAPTER_ORDER.map((chapter) => [
      chapter.id,
      {
        chapter,
        intro: revisedIntro(rng.fork(), assistantProfile, context.selectedAGM, chapter.id, context.teamName),
        assessmentData: revisedAssessmentData(chapter.id, context.allChapterData),
        reaction: revisedReaction(rng.fork(), assistantProfile, chapter.id, context.allChapterData),
        transition: revisedTransition(rng.fork(), assistantProfile, chapter.id),
        choiceReactions: revisedChoiceReactions(rng.fork(), assistantProfile, chapter.id, context.allChapterData),
        candidateIds: chapterCandidateIds(chapter.id, context.staffSlate, context.scoutingSlate),
      } satisfies RevisedChapterScript,
    ]),
  ) as Record<RevisedChapterId, RevisedChapterScript>;

  return {
    agm: context.selectedAGM,
    greeting,
    chapters,
    farewell: [
      makeDialogueLine(
        generateFarewell(rng.fork(), assistantProfile, context.gmName, philosophy),
        'philosophical',
      ),
    ],
    staffOpinions: buildStaffOpinions(context.selectedAGM, context.staffSlate),
    scoutOpinions: buildScoutOpinions(context.selectedAGM, context.scoutingSlate),
  };
}
