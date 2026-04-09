import type { GameRNG } from '../math/prng.js';
import type { AssistantGMProfile } from './assistantGM.js';
import type { FarmAssessment } from './farmAssessment.js';
import { CHAPTER_ORDER, type OnboardingChapter } from './flowEngine.js';
import type { FinancialPlaybook } from './financialPlaybook.js';
import type { OwnerMeetingBriefing } from './ownerMeeting.js';
import type { OnboardingPressConferenceBriefing } from './pressConference.js';
import type { RosterAssessment } from './rosterAssessment.js';
import type { ScoutingBriefing } from './scoutingBriefing.js';
import type { SeasonStrategyBriefing } from './seasonStrategy.js';
import type { StaffEvaluation } from './staffEvaluation.js';
import { pickTemplate } from './shared.js';

export type DialogueTone =
  | 'informative'
  | 'encouraging'
  | 'cautionary'
  | 'excited'
  | 'concerned'
  | 'humorous'
  | 'serious'
  | 'philosophical';

export interface DialogueLine {
  speaker: 'assistant_gm';
  text: string;
  tone: DialogueTone;
  emphasis: string | null;
  referencedPlayerName: string | null;
  referencedStat: string | null;
}

const CHAPTER_LABELS: Record<OnboardingChapter, string> = {
  owners_office: "owner's office",
  know_your_stars: 'roster',
  the_farm: 'farm',
  coaching_staff: 'staff',
  financial_playbook: 'financial playbook',
  scouting_intel: 'scouting board',
  season_strategy: 'season strategy',
  press_conference: 'press conference',
};

const CHAPTER_TRANSITION_LABELS: Record<OnboardingChapter, string> = {
  owners_office: 'ownership expectations',
  know_your_stars: 'the roster',
  the_farm: 'the farm',
  coaching_staff: 'the staff',
  financial_playbook: 'the budget',
  scouting_intel: 'the rival board',
  season_strategy: 'season strategy',
  press_conference: 'the public message',
};

const POSITION_LABELS: Record<string, string> = {
  SP: 'rotation',
  RP: 'bullpen',
  CL: 'bullpen',
  C: 'catcher',
  '1B': 'first base',
  '2B': 'second base',
  '3B': 'third base',
  SS: 'shortstop',
  LF: 'left field',
  CF: 'center field',
  RF: 'right field',
  DH: 'designated hitter',
};

function makeLine(
  text: string,
  tone: DialogueTone,
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

function chapterLabel(chapter: OnboardingChapter): string {
  return CHAPTER_LABELS[chapter];
}

function transitionLabel(chapter: OnboardingChapter): string {
  return CHAPTER_TRANSITION_LABELS[chapter];
}

function positionLabel(position: string): string {
  return POSITION_LABELS[position] ?? position.toLowerCase();
}

function personalityTone(profile: AssistantGMProfile, positive: boolean): DialogueTone {
  switch (profile.personality) {
    case 'enthusiastic_mentor':
      return positive ? 'excited' : 'encouraging';
    case 'grizzled_veteran':
      return positive ? 'serious' : 'cautionary';
    case 'dry_wit':
      return positive ? 'humorous' : 'concerned';
    case 'analytical_mind':
      return positive ? 'informative' : 'serious';
    case 'straight_shooter':
    default:
      return positive ? 'informative' : 'cautionary';
  }
}

function personalityLine(
  profile: AssistantGMProfile,
  variants: Record<AssistantGMProfile['personality'], string>,
): string {
  return variants[profile.personality];
}

function chapterIntroLead(profile: AssistantGMProfile, chapter: OnboardingChapter, teamName: string): string {
  const label = chapterLabel(chapter);

  return personalityLine(profile, {
    straight_shooter: `Let's look at ${teamName}'s ${label}. No sugar-coating.`,
    dry_wit: `Time for ${teamName}'s ${label}. Baseball has a nice way of charging interest on the details.`,
    enthusiastic_mentor: `Here we go, ${teamName}. Let's dig into the ${label} and find the good stuff first.`,
    grizzled_veteran: `I've seen enough clubs to know the ${label} usually tells the truth first, and ${teamName} is no different.`,
    analytical_mind: `Let's open the ${label} for ${teamName} and let the evidence speak before the opinions do.`,
  });
}

function chapterIntroFollow(profile: AssistantGMProfile, chapter: OnboardingChapter): string {
  const label = chapterLabel(chapter);

  return personalityLine(profile, {
    straight_shooter: `If there is a problem in this ${label}, it is better to say it now.`,
    dry_wit: `The nice thing about ${label} is it never pretends your weak spots are charming.`,
    enthusiastic_mentor: `If this ${label} has an edge, we can turn it into momentum quickly.`,
    grizzled_veteran: `A smart front office learns the shape of its ${label} before it starts making promises.`,
    analytical_mind: `We want a clean read on this ${label} before we touch strategy.`,
  });
}

function chapterIntroThird(profile: AssistantGMProfile, chapter: OnboardingChapter): string {
  const label = chapterLabel(chapter);

  return personalityLine(profile, {
    straight_shooter: `${label[0]!.toUpperCase()}${label.slice(1)} is where the season starts arguing with you.`,
    dry_wit: `If the ${label} looks tidy, enjoy it. Baseball rarely leaves it that way.`,
    enthusiastic_mentor: `There is usually one real opportunity hiding in every ${label}.`,
    grizzled_veteran: `The older I get, the less I trust any club that has not stared down its ${label}.`,
    analytical_mind: `The signal in this ${label} is stronger than the noise if we stay disciplined.`,
  });
}

export function generateChapterIntro(
  rng: GameRNG,
  profile: AssistantGMProfile,
  chapter: OnboardingChapter,
  teamName: string,
): DialogueLine[] {
  const lines = [
    makeLine(chapterIntroLead(profile, chapter, teamName), personalityTone(profile, true)),
    makeLine(chapterIntroFollow(profile, chapter), personalityTone(profile, profile.personality !== 'grizzled_veteran')),
  ];

  if (rng.nextInt(0, 1) === 1) {
    lines.push(makeLine(chapterIntroThird(profile, chapter), profile.personality === 'grizzled_veteran' ? 'philosophical' : personalityTone(profile, true)));
  }

  return lines;
}

export function generateRosterReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  assessment: RosterAssessment,
): DialogueLine[] {
  const star = assessment.aceStarter ?? assessment.cleanupHitter ?? assessment.stars[0] ?? null;
  const need = assessment.needs[0] ?? null;
  const positive = assessment.lineup.overallGrade === 'A' || assessment.lineup.overallGrade === 'B';
  const stat = star == null ? null : `${star.displayRating} OVR`;

  return [
    makeLine(
      star == null
        ? 'There is no centerpiece here yet, which is its own kind of answer.'
        : personalityLine(profile, {
          straight_shooter: `${star.name} is the first name on the card. A ${star.displayRating} OVR ${positionLabel(star.position)} like that can carry a club.`,
          dry_wit: `${star.name} is doing the heavy lifting here. Clubs do enjoy pretending a ${star.displayRating} OVR star grows on trees.`,
          enthusiastic_mentor: `${star.name} jumps off the page right away. A ${star.displayRating} OVR ${positionLabel(star.position)} gives you a real foundation.`,
          grizzled_veteran: `${star.name} is the kind of player old baseball men stop arguing about. A ${star.displayRating} OVR ${positionLabel(star.position)} still changes a season.`,
          analytical_mind: `${star.name} is the strongest signal in the roster data. A ${star.displayRating} OVR ${positionLabel(star.position)} shifts every downstream decision.`,
        }),
      personalityTone(profile, positive),
      assessment.lineup.overallGrade,
      star?.name ?? null,
      stat,
    ),
    makeLine(
      need == null
        ? 'There is no obvious position fire right now.'
        : personalityLine(profile, {
          straight_shooter: `That gap at ${positionLabel(need.position)} concerns me. ${need.currentBest?.name ?? 'Nobody'} is not enough if you mean business.`,
          dry_wit: `${positionLabel(need.position)} is the awkward silence in this roster. ${need.currentBest?.name ?? 'Nobody'} is not exactly calming it down.`,
          enthusiastic_mentor: `If we clean up ${positionLabel(need.position)}, this roster gets even more interesting fast. ${need.currentBest?.name ?? 'Nobody'} cannot be the last word there.`,
          grizzled_veteran: `${positionLabel(need.position)} is where this club will get itself beat if it gets lazy. ${need.currentBest?.name ?? 'Nobody'} is a warning, not a plan.`,
          analytical_mind: `${positionLabel(need.position)} is the clearest inefficiency on the board. ${need.currentBest?.name ?? 'Nobody'} sits below the level the roster needs.`,
        }),
      need?.urgency === 'critical' ? 'cautionary' : 'informative',
      need?.position ?? null,
      need?.currentBest?.name ?? null,
      need?.currentBest == null ? null : `${need.currentBest.rating} rating`,
    ),
    makeLine(
      assessment.contracts.extensionCandidates[0] == null
        ? assessment.rosterNarrative
        : `${assessment.contracts.extensionCandidates[0].name} is worth locking up before the market starts smiling at him.`,
      profile.personality === 'enthusiastic_mentor' ? 'encouraging' : 'serious',
      null,
      assessment.contracts.extensionCandidates[0]?.name ?? null,
      assessment.contracts.extensionCandidates[0] == null ? null : `${assessment.contracts.extensionCandidates[0].contractYearsLeft} years left`,
    ),
  ];
}

export function generateFarmReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  assessment: FarmAssessment,
): DialogueLine[] {
  const closest = assessment.closestToMLB ?? assessment.topProspects[0] ?? null;
  const ceiling = assessment.highestCeiling ?? assessment.topProspects[0] ?? null;
  const positive = assessment.pipeline.grade === 'A' || assessment.pipeline.grade === 'B';

  return [
    makeLine(
      closest == null
        ? 'There is no immediate help in this pipeline, and that narrows your margin fast.'
        : `${closest.name} is the first prospect I would circle. ${closest.breakoutProbability}% breakout probability and ${closest.level} readiness usually gets real attention.`,
      personalityTone(profile, positive),
      assessment.pipeline.grade,
      closest?.name ?? null,
      closest == null ? null : `${closest.breakoutProbability}% breakout probability`,
    ),
    makeLine(
      ceiling == null
        ? 'The ceiling in this system is still a rumor.'
        : `${ceiling.name} owns the loudest ceiling in the system at ${ceiling.ceiling}, and that kind of upside changes timelines.`,
      profile.personality === 'enthusiastic_mentor' ? 'excited' : 'informative',
      null,
      ceiling?.name ?? null,
      ceiling == null ? null : `ceiling ${ceiling.ceiling}`,
    ),
    makeLine(
      assessment.pipeline.grade === 'D' || assessment.pipeline.grade === 'F'
        ? `The pipeline grade is ${assessment.pipeline.grade}, which means patience is not optional.`
        : `A ${assessment.pipeline.grade} farm gives you leverage if you protect it instead of spending it casually.`,
      assessment.pipeline.grade === 'D' || assessment.pipeline.grade === 'F' ? 'cautionary' : 'encouraging',
      assessment.pipeline.grade,
      null,
      `pipeline ${assessment.pipeline.grade}`,
    ),
  ];
}

export function generateStaffReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  evaluation: StaffEvaluation,
): DialogueLine[] {
  const leadCoach = evaluation.keyCoaches[0] ?? null;

  return [
    makeLine(
      leadCoach == null
        ? 'There is no coaching anchor here yet, which usually bleeds into development.'
        : `${leadCoach.name} gives the room a real adult in charge, and ${evaluation.strengths.bestArea} is why.`,
      personalityTone(profile, true),
      evaluation.strengths.overallGrade,
      leadCoach?.name ?? null,
      leadCoach == null ? null : `${leadCoach.teachingGrade} teaching`,
    ),
    makeLine(
      `${evaluation.strengths.weakestArea} is the weak seam in this group. You can win with it for a while, but not forever.`,
      profile.personality === 'grizzled_veteran' ? 'cautionary' : 'serious',
      null,
      null,
      evaluation.strengths.weakestArea,
    ),
    makeLine(
      `You still have ${evaluation.budgetRemaining.toFixed(1)} million left in the staff budget if you want to sharpen a spot.`,
      'informative',
      null,
      null,
      `${evaluation.budgetRemaining.toFixed(1)} budget remaining`,
    ),
  ];
}

export function generateFinancialReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  playbook: FinancialPlaybook,
): DialogueLine[] {
  const extension = playbook.extensions[0] ?? null;

  return [
    makeLine(
      extension == null
        ? 'There is no obvious extension call right now, which is at least quieter for the budget.'
        : `${extension.name} is the decision that matters. ${extension.currentSalary} million for ${extension.yearsRemaining} more years is exactly when smart clubs act.`,
      profile.personality === 'grizzled_veteran' ? 'cautionary' : personalityTone(profile, true),
      extension?.urgency ?? null,
      extension?.name ?? null,
      extension == null ? null : `${extension.currentSalary} salary`,
    ),
    makeLine(
      `We have ${playbook.flexibility.availableSpace} million in room and ${playbook.flexibility.luxuryTaxRoom} million before the tax line.`,
      playbook.flexibility.grade === 'D' || playbook.flexibility.grade === 'F' ? 'concerned' : 'informative',
      playbook.flexibility.grade,
      null,
      `${playbook.flexibility.availableSpace} room`,
    ),
    makeLine(
      playbook.flexibility.canAddStar
        ? 'This is a budget that can support a star if the right one shakes loose.'
        : 'This is not a blank check, so every dollar had better solve a real problem.',
      playbook.flexibility.canAddStar ? 'encouraging' : 'serious',
    ),
  ];
}

function rivalRank(level: ScoutingBriefing['divisionReports'][number]['overallThreatLevel']): number {
  switch (level) {
    case 'elite':
      return 4;
    case 'dangerous':
      return 3;
    case 'competitive':
      return 2;
    case 'rebuilding':
    default:
      return 1;
  }
}

export function generateScoutingReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  briefing: ScoutingBriefing,
): DialogueLine[] {
  const rival = [...briefing.divisionReports].sort((left, right) => rivalRank(right.overallThreatLevel) - rivalRank(left.overallThreatLevel))[0] ?? null;
  const leagueThreat = briefing.leagueThreats[0] ?? null;

  return [
    makeLine(
      rival == null
        ? 'The division is not scary enough yet to hand you a single obvious villain.'
        : `${rival.teamName} is the rival I respect most, and ${rival.starPlayer?.name ?? 'their core'} is the reason.`,
      profile.personality === 'dry_wit' ? 'humorous' : 'serious',
      rival?.overallThreatLevel ?? null,
      rival?.starPlayer?.name ?? null,
      rival?.starPlayer == null ? null : `${rival.starPlayer.rating} rating`,
    ),
    makeLine(
      rival == null
        ? 'That means the division is more open than settled.'
        : `The opening is still there, though. ${rival.teamName} can be stressed at ${rival.exploitableWeakness}.`,
      rival == null ? 'encouraging' : 'informative',
      null,
      null,
      rival?.exploitableWeakness ?? null,
    ),
    makeLine(
      leagueThreat == null
        ? briefing.intelNarrative
        : `${leagueThreat.teamName} projects for ${leagueThreat.projectedWins} wins, so the bar is not imaginary.`,
      'informative',
      leagueThreat?.threatLevel ?? null,
      null,
      leagueThreat == null ? null : `${leagueThreat.projectedWins} projected wins`,
    ),
  ];
}

export function generateStrategyReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  strategy: SeasonStrategyBriefing,
): DialogueLine[] {
  const allIn = strategy.competitiveWindow === 'win_now' || strategy.competitiveWindow === 'stable_contender';
  const rebuild = strategy.competitiveWindow === 'rebuild' || strategy.recommendedSeasonGoal === 'rebuild';

  return [
    makeLine(
      allIn
        ? `This is a ${strategy.competitiveWindow.replaceAll('_', ' ')} club, and a ${strategy.recommendedSeasonGoal} target is the honest version of that.`
        : rebuild
          ? `This is a rebuild whether the room likes the word or not, and the plan has to respect that.`
          : `This is a ${strategy.competitiveWindow.replaceAll('_', ' ')} club, which means discipline matters more than noise.`,
      allIn ? personalityTone(profile, true) : rebuild ? 'cautionary' : 'informative',
      strategy.competitiveWindow,
      null,
      strategy.recommendedSeasonGoal,
    ),
    makeLine(
      `I would operate as a ${strategy.recommendedTradeApproach}. That is how this roster turns context into action.`,
      allIn ? 'excited' : rebuild ? 'serious' : 'informative',
      strategy.recommendedTradeApproach,
      null,
      strategy.recommendedTradeApproach,
    ),
    makeLine(
      `${strategy.priorityList[0]?.title ?? 'Stay disciplined'} should lead the board before anything else.`,
      profile.personality === 'grizzled_veteran' ? 'philosophical' : 'serious',
    ),
  ];
}

export function generateOwnerReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  meeting: OwnerMeetingBriefing,
): DialogueLine[] {
  return [
    makeLine(
      `${meeting.ownerPersonality.expectationLevel === 'championship' ? 'Ownership wants a championship push' : 'Ownership wants progress'}, and that is not subtle.`,
      meeting.ownerPersonality.expectationLevel === 'championship' ? 'serious' : 'informative',
      meeting.ownerPersonality.expectationLevel,
      null,
      null,
    ),
    makeLine(
      `You have ${meeting.budgetOverview.availableSpace} million in room, which buys options but not carelessness.`,
      profile.personality === 'straight_shooter' ? 'cautionary' : 'informative',
      meeting.budgetOverview.spendingGrade,
      null,
      `${meeting.budgetOverview.availableSpace} budget room`,
    ),
    makeLine(
      meeting.divisionOutlook,
      profile.personality === 'enthusiastic_mentor' ? 'encouraging' : 'serious',
    ),
  ];
}

function extractPlayerName(question: string): string | null {
  const match = question.match(/(?:expect |from )([A-Z][a-z]+ [A-Z][a-z]+)/);
  return match?.[1] ?? null;
}

export function generatePressReaction(
  _rng: GameRNG,
  profile: AssistantGMProfile,
  briefing: OnboardingPressConferenceBriefing,
): DialogueLine[] {
  const firstQuestion = briefing.likelyQuestions[0] ?? null;
  const playerName = firstQuestion == null ? null : extractPlayerName(firstQuestion);

  return [
    makeLine(
      `The recommended tone is ${briefing.recommendedTone}, and that matters because this room can smell panic instantly.`,
      profile.personality === 'dry_wit' ? 'humorous' : 'informative',
      briefing.recommendedTone,
    ),
    makeLine(
      firstQuestion == null ? briefing.finalNarrative : `The first question is already sitting there: ${firstQuestion}`,
      profile.personality === 'grizzled_veteran' ? 'serious' : 'informative',
      null,
      playerName,
      playerName,
    ),
    makeLine(
      briefing.finalNarrative,
      profile.personality === 'enthusiastic_mentor' ? 'encouraging' : 'serious',
    ),
  ];
}

export function generateChapterTransition(
  rng: GameRNG,
  profile: AssistantGMProfile,
  fromChapter: OnboardingChapter,
  toChapter: OnboardingChapter,
): DialogueLine {
  const nextLabel = transitionLabel(toChapter);
  const text = pickTemplate(rng, [
    `Now that we've seen ${transitionLabel(fromChapter)}, let's move to ${nextLabel}.`,
    `That is enough on ${transitionLabel(fromChapter)}. The next honest stop is ${nextLabel}.`,
    personalityLine(profile, {
      straight_shooter: `Good. Next up is ${nextLabel}, because that is where this conversation should go.`,
      dry_wit: `Before baseball changes its mind, let's get to ${nextLabel}.`,
      enthusiastic_mentor: `That sets the table nicely. Let's head into ${nextLabel}.`,
      grizzled_veteran: `One board always leads to another. This one leads to ${nextLabel}.`,
      analytical_mind: `The next useful layer of evidence is ${nextLabel}.`,
    }),
  ]);

  return makeLine(
    text,
    toChapter === 'season_strategy' ? 'serious' : 'informative',
    `${fromChapter}->${toChapter}`,
  );
}

export function getNextChapter(chapter: OnboardingChapter): OnboardingChapter | null {
  const index = CHAPTER_ORDER.findIndex((entry) => entry.id === chapter);
  return index < 0 || index === CHAPTER_ORDER.length - 1 ? null : CHAPTER_ORDER[index + 1]!.id;
}
