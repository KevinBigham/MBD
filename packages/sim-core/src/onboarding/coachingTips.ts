import type { GameRNG } from '../math/prng.js';
import type { AssistantGMProfile } from './assistantGM.js';
import type { FarmAssessment } from './farmAssessment.js';
import type { FinancialPlaybook } from './financialPlaybook.js';
import type { GMPhilosophy, OnboardingChapter } from './flowEngine.js';
import type { OwnerMeetingBriefing } from './ownerMeeting.js';
import type { OnboardingPressConferenceBriefing } from './pressConference.js';
import type { RosterAssessment } from './rosterAssessment.js';
import type { ScoutingBriefing } from './scoutingBriefing.js';
import type { SeasonStrategyBriefing } from './seasonStrategy.js';
import type { StaffEvaluation } from './staffEvaluation.js';
import { pickTemplate } from './shared.js';

export interface CoachingTip {
  chapter: OnboardingChapter;
  category: 'strategy' | 'caution' | 'opportunity' | 'knowledge';
  title: string;
  body: string;
  importance: 'high' | 'medium' | 'low';
}

export interface DecisionPoint {
  id: string;
  chapter: OnboardingChapter;
  question: string;
  options: string[];
  stakes: string;
}

export interface DecisionCoaching {
  decisionId: string;
  recommendation: string;
  reasoning: string;
  tradeoff: string;
  assistantQuote: string;
}

export interface OnboardingHighlight {
  rank: number;
  category: string;
  headline: string;
  detail: string;
  actionRequired: boolean;
}

export interface QuickReferenceCard {
  teamGrade: string;
  windowStatus: string;
  topStrength: string;
  biggestNeed: string;
  keyDecision: string;
  financialStatus: string;
  topProspect: string;
  dangerousRival: string;
  recommendedPath: string;
  assistantAdvice: string;
}

export interface ChapterAssessmentData {
  owner?: OwnerMeetingBriefing;
  roster?: RosterAssessment;
  farm?: FarmAssessment;
  staff?: StaffEvaluation;
  financial?: FinancialPlaybook;
  scouting?: ScoutingBriefing;
  strategy?: SeasonStrategyBriefing;
  press?: OnboardingPressConferenceBriefing;
}

export type AllChapterData = Required<ChapterAssessmentData>;

function makeTip(
  chapter: OnboardingChapter,
  category: CoachingTip['category'],
  title: string,
  body: string,
  importance: CoachingTip['importance'],
): CoachingTip {
  return { chapter, category, title, body, importance };
}

function shortPosition(position: string): string {
  return position === 'SS' ? 'shortstop' : position.toLowerCase();
}

function quoteForPersonality(profile: AssistantGMProfile, line: string): string {
  switch (profile.personality) {
    case 'grizzled_veteran':
      return `${line} That is how a season gets decided.`;
    case 'dry_wit':
      return `${line} Baseball does enjoy punishing sloppy plans.`;
    case 'enthusiastic_mentor':
      return `${line} That is a real chance to get better fast.`;
    case 'straight_shooter':
      return `${line} That is the cleanest read on it.`;
    case 'analytical_mind':
    default:
      return `${line} The evidence keeps pointing the same way.`;
  }
}

function ownerTips(chapter: OnboardingChapter, owner: OwnerMeetingBriefing): CoachingTip[] {
  return [
    makeTip(
      chapter,
      'strategy',
      'Match Ownership Pressure',
      `${owner.ownerPersonality.expectationLevel === 'championship' ? 'Ownership wants a title push immediately.' : owner.expectations} Build your first 60 days around that reality, not around comfort.`,
      owner.ownerPersonality.expectationLevel === 'championship' ? 'high' : 'medium',
    ),
    makeTip(
      chapter,
      'knowledge',
      'Use the Budget as a Constraint',
      `${owner.budgetOverview.availableSpace} million in room gives you options, but it does not excuse a bad long-term deal.`,
      'medium',
    ),
    makeTip(
      chapter,
      'caution',
      'Benchmark the Division',
      owner.divisionOutlook,
      'medium',
    ),
  ];
}

function rosterTips(chapter: OnboardingChapter, roster: RosterAssessment): CoachingTip[] {
  const star = roster.aceStarter ?? roster.cleanupHitter ?? roster.stars[0]!;
  const need = roster.needs[0] ?? {
    position: 'SS',
    urgency: 'moderate' as const,
    currentBest: null,
    explanation: 'Shortstop still needs attention.',
  };

  return [
    makeTip(
      chapter,
      'opportunity',
      'Build Around the Star',
      `${star.name} is the reason this club can think big. Plan around the innings or plate appearances that player can bank for you.`,
      'high',
    ),
    makeTip(
      chapter,
      'caution',
      'Fix the Soft Spot',
      `${shortPosition(need.position)} is the roster leak. If ${need.currentBest?.name ?? 'the current option'} stays exposed there, it will cost real games.`,
      need.urgency === 'critical' ? 'high' : 'medium',
    ),
    makeTip(
      chapter,
      'strategy',
      'Handle the Contract Window',
      roster.contracts.extensionCandidates[0] == null
        ? roster.contracts.narrativeSummary
        : `${roster.contracts.extensionCandidates[0].name} should be on your extension board before next winter changes the price.`,
      'high',
    ),
  ];
}

function farmTips(chapter: OnboardingChapter, farm: FarmAssessment): CoachingTip[] {
  return [
    makeTip(
      chapter,
      'opportunity',
      'Protect the First Reinforcement',
      `${farm.closestToMLB?.name ?? 'Your top prospect'} is close enough to influence the season. Do not block that lane with a short-term patch unless the return is real.`,
      'medium',
    ),
    makeTip(
      chapter,
      'strategy',
      'Use Ceiling Carefully',
      `${farm.highestCeiling?.name ?? 'The top prospect'} gives you leverage. Trade that kind of upside only for impact you can defend in October.`,
      'medium',
    ),
    makeTip(
      chapter,
      farm.pipeline.grade === 'A' || farm.pipeline.grade === 'B' ? 'knowledge' : 'caution',
      'Respect the Pipeline Grade',
      `A ${farm.pipeline.grade} pipeline means ${farm.pipeline.depthDescription.toLowerCase()}`,
      farm.pipeline.grade === 'D' || farm.pipeline.grade === 'F' ? 'high' : 'medium',
    ),
  ];
}

function staffTips(chapter: OnboardingChapter, staff: StaffEvaluation): CoachingTip[] {
  return [
    makeTip(
      chapter,
      'knowledge',
      'Identify the Teaching Anchor',
      `${staff.keyCoaches[0]?.name ?? 'The staff lead'} is the tone-setter in this room. Protect the strongest teacher before you chase cosmetic fixes.`,
      'medium',
    ),
    makeTip(
      chapter,
      'caution',
      'Patch the Weak Area',
      `${staff.strengths.weakestArea} is the part of player development that can quietly drag the whole system down.`,
      'medium',
    ),
    makeTip(
      chapter,
      'opportunity',
      'Use Remaining Staff Budget',
      `${staff.budgetRemaining.toFixed(1)} million is still available if you want a targeted staff upgrade instead of a headline move.`,
      staff.budgetRemaining > 0 ? 'low' : 'medium',
    ),
  ];
}

function financialTips(chapter: OnboardingChapter, financial: FinancialPlaybook): CoachingTip[] {
  return [
    makeTip(
      chapter,
      'strategy',
      'Prioritize the Core Contract',
      financial.extensions[0] == null
        ? 'There is no obvious extension priority, which means flexibility matters more than sentiment.'
        : `${financial.extensions[0].name} is the contract decision that can define the next window.`,
      financial.extensions[0]?.urgency === 'extend_now' ? 'high' : 'medium',
    ),
    makeTip(
      chapter,
      financial.flexibility.availableSpace < 0 ? 'caution' : 'knowledge',
      'Know Your Spending Lane',
      financial.flexibility.narrativeSummary,
      financial.flexibility.grade === 'F' ? 'high' : 'medium',
    ),
    makeTip(
      chapter,
      'opportunity',
      'Spend on Real Problems',
      financial.flexibility.canAddStar
        ? 'You have enough room to chase impact, but only if the player solves a real weakness.'
        : 'This is a role-player budget unless you move money first, so aim for precision not theater.',
      financial.flexibility.canAddStar ? 'medium' : 'high',
    ),
  ];
}

function scoutingTips(chapter: OnboardingChapter, scouting: ScoutingBriefing): CoachingTip[] {
  const rival = scouting.divisionReports[0];

  return [
    makeTip(
      chapter,
      'caution',
      'Study the Division Benchmark',
      `${rival?.teamName ?? 'The top rival'} is the club most likely to block your path. Know where ${rival?.starPlayer?.name ?? 'their best player'} can beat you.`,
      'high',
    ),
    makeTip(
      chapter,
      'opportunity',
      'Attack the Rival Weakness',
      rival == null
        ? scouting.intelNarrative
        : `${rival.teamName} can still be pressured at ${rival.exploitableWeakness}. That is where smart targeting starts.`,
      'medium',
    ),
    makeTip(
      chapter,
      'strategy',
      'Align Scouting With the Window',
      `Your first scouting decision should reflect whether this front office needs short-term intel or long-range talent capture.`,
      'medium',
    ),
  ];
}

function strategyTips(chapter: OnboardingChapter, strategy: SeasonStrategyBriefing): CoachingTip[] {
  return [
    makeTip(
      chapter,
      'strategy',
      'Commit to the Window',
      `${strategy.competitiveWindow.replaceAll('_', ' ')} is the real window. Your season goal should sound like that truth, not like wishcasting.`,
      'high',
    ),
    makeTip(
      chapter,
      'opportunity',
      'Use the Trade Posture Early',
      `${strategy.recommendedTradeApproach} is the recommended trade lane. Build the pro-scouting list and the asset list before the market heats up.`,
      'medium',
    ),
    makeTip(
      chapter,
      'knowledge',
      'Let the Priority Board Lead',
      `${strategy.priorityList[0]?.title ?? 'Discipline'} should drive the first wave of front-office decisions.`,
      'medium',
    ),
  ];
}

function pressTips(chapter: OnboardingChapter, press: OnboardingPressConferenceBriefing): CoachingTip[] {
  return [
    makeTip(
      chapter,
      'strategy',
      'Match the Public Tone to the Plan',
      `${press.recommendedTone} is the recommended tone because it lines up with the real risk on the board.`,
      'medium',
    ),
    makeTip(
      chapter,
      'knowledge',
      'Prepare for the First Two Questions',
      press.likelyQuestions.slice(0, 2).join(' '),
      'medium',
    ),
    makeTip(
      chapter,
      'caution',
      'Do Not Over-Promise',
      press.finalNarrative,
      'low',
    ),
  ];
}

export function generateChapterTips(
  _profile: AssistantGMProfile,
  chapter: OnboardingChapter,
  chapterData: ChapterAssessmentData,
): CoachingTip[] {
  switch (chapter) {
    case 'owners_office':
      return ownerTips(chapter, chapterData.owner!);
    case 'know_your_stars':
      return rosterTips(chapter, chapterData.roster!);
    case 'the_farm':
      return farmTips(chapter, chapterData.farm!);
    case 'coaching_staff':
      return staffTips(chapter, chapterData.staff!);
    case 'financial_playbook':
      return financialTips(chapter, chapterData.financial!);
    case 'scouting_intel':
      return scoutingTips(chapter, chapterData.scouting!);
    case 'season_strategy':
      return strategyTips(chapter, chapterData.strategy!);
    case 'press_conference':
      return pressTips(chapter, chapterData.press!);
  }
}

const DECISION_MAP: Record<string, Omit<DecisionCoaching, 'decisionId' | 'assistantQuote'>> = {
  season_goal: {
    recommendation: 'Set the goal that matches the real roster window.',
    reasoning: 'Season goals change every downstream deadline choice, extension posture, and how much patience the room has for a slump.',
    tradeoff: 'A bigger goal raises the ceiling, but it also punishes hesitation and makes every weak spot more expensive.',
  },
  development_style: {
    recommendation: 'Choose a development tempo you can sustain for a full season.',
    reasoning: 'Promotion timing changes service clocks, roster depth, and the odds that a prospect arrives ready instead of rushed.',
    tradeoff: 'Aggression can unlock upside sooner, but patience protects long-term value.',
  },
  spending_style: {
    recommendation: 'Spend with a thesis, not with nerves.',
    reasoning: 'Spending style changes how much flexibility you keep for extensions, deadline moves, and bad injury luck.',
    tradeoff: 'Buying certainty now can make the next offseason smaller than you expect.',
  },
  trade_approach: {
    recommendation: 'Pick a trade posture before the market picks one for you.',
    reasoning: 'Trade posture decides whether your scouts hunt reinforcements, buyers, or both.',
    tradeoff: 'Aggression buys urgency, but it also prices future control more harshly.',
  },
  scouting_focus: {
    recommendation: 'Aim your scouting department where the next value edge is most likely to appear.',
    reasoning: 'Scouting bandwidth is finite, so focus changes how quickly you discover talent or exploit another club.',
    tradeoff: 'A focused department gets sharper, but every lane you ignore gets blurrier.',
  },
  media_tone: {
    recommendation: 'Use a tone the roster can survive for six months.',
    reasoning: 'Public tone influences owner patience, media pressure, and how every cold streak gets interpreted.',
    tradeoff: 'Confidence can lead the room, but it also raises the cost of underperforming the quote.',
  },
};

export function generateDecisionExplanation(
  profile: AssistantGMProfile,
  decision: DecisionPoint,
): DecisionCoaching {
  const mapped = DECISION_MAP[decision.id] ?? {
    recommendation: 'Choose the option that best matches your operating thesis.',
    reasoning: decision.stakes,
    tradeoff: 'Every front-office decision costs flexibility somewhere else.',
  };

  return {
    decisionId: decision.id,
    recommendation: mapped.recommendation,
    reasoning: `${mapped.reasoning} ${decision.stakes}`,
    tradeoff: mapped.tradeoff,
    assistantQuote: quoteForPersonality(profile, `This ${decision.chapter.replaceAll('_', ' ')} call matters because it sets the tone for the season.`),
  };
}

function buildHighlights(profile: AssistantGMProfile, allChapterData: AllChapterData): Omit<OnboardingHighlight, 'rank'>[] {
  const highlights: Omit<OnboardingHighlight, 'rank'>[] = [
    {
      category: 'roster',
      headline: `${allChapterData.roster.aceStarter?.name ?? allChapterData.roster.stars[0]?.name ?? 'Your best player'} is the franchise hinge`,
      detail: `${allChapterData.roster.aceStarter?.name ?? allChapterData.roster.stars[0]?.name ?? 'That player'} is the clearest reason this club can chase a serious season.`,
      actionRequired: true,
    },
    {
      category: 'roster',
      headline: `${shortPosition(allChapterData.roster.needs[0]?.position ?? 'SS')} needs attention`,
      detail: `${allChapterData.roster.needs[0]?.currentBest?.name ?? 'The current option'} leaves a real weakness on the everyday card.`,
      actionRequired: true,
    },
    {
      category: 'finance',
      headline: `${allChapterData.financial.extensions[0]?.name ?? 'The top extension'} is the contract decision`,
      detail: `${allChapterData.financial.extensions[0]?.name ?? 'That player'} is the biggest leverage point on the books right now.`,
      actionRequired: true,
    },
    {
      category: 'rival',
      headline: `${allChapterData.scouting.divisionReports[0]?.teamName ?? 'The division leader'} is the benchmark`,
      detail: `${allChapterData.scouting.divisionReports[0]?.starPlayer?.name ?? 'Their best player'} is the rival threat that deserves the most respect.`,
      actionRequired: true,
    },
    {
      category: 'farm',
      headline: `${allChapterData.farm.closestToMLB?.name ?? allChapterData.farm.topProspects[0]?.name ?? 'Your top prospect'} can help soon`,
      detail: `${allChapterData.farm.closestToMLB?.name ?? allChapterData.farm.topProspects[0]?.name ?? 'That prospect'} gives the next wave a real face.`,
      actionRequired: false,
    },
    {
      category: 'strategy',
      headline: `${allChapterData.strategy.recommendedTradeApproach} is the operating posture`,
      detail: quoteForPersonality(profile, `The club projects as ${allChapterData.strategy.competitiveWindow.replaceAll('_', ' ')} with a ${allChapterData.strategy.recommendedSeasonGoal} target.`),
      actionRequired: false,
    },
  ];

  return highlights;
}

export function generateOnboardingHighlights(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  allChapterData: AllChapterData,
): OnboardingHighlight[] {
  return buildHighlights(profile, allChapterData).slice(0, 6).map((highlight, index) => ({
    rank: index + 1,
    ...highlight,
  }));
}

export function generateQuickReference(
  allChapterData: AllChapterData,
  philosophy: GMPhilosophy,
): QuickReferenceCard {
  return {
    teamGrade: allChapterData.roster.lineup.overallGrade,
    windowStatus: allChapterData.strategy.competitiveWindow.replaceAll('_', ' '),
    topStrength: allChapterData.roster.lineup.topStrength,
    biggestNeed: shortPosition(allChapterData.roster.needs[0]?.position ?? 'SS'),
    keyDecision: allChapterData.financial.extensions[0]?.name ?? allChapterData.roster.aceStarter?.name ?? 'Core extension',
    financialStatus: allChapterData.financial.flexibility.narrativeSummary,
    topProspect: allChapterData.farm.closestToMLB?.name ?? allChapterData.farm.topProspects[0]?.name ?? 'No immediate prospect',
    dangerousRival: allChapterData.scouting.divisionReports[0]?.teamName ?? 'No clear rival',
    recommendedPath: `${philosophy.seasonGoal} push with a ${philosophy.tradeApproach} trade posture`,
    assistantAdvice: philosophy.tradeApproach === 'buyer'
      ? 'Stay buyer-ready, but only for moves that solve the real weakness.'
      : philosophy.tradeApproach === 'seller'
        ? 'Sell the right veterans before sentiment drags the return down.'
        : 'Stay opportunistic and protect the long view while the market reveals itself.',
  };
}
