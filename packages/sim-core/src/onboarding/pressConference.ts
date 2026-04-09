import type { GameRNG } from '../math/prng.js';
import { pickTemplate } from './shared.js';

export interface OnboardingPressConferenceContext {
  teamId: string;
  teamName: string;
  gmName: string;
  recommendedSeasonGoal: 'championship' | 'playoff' | 'rebuild' | 'compete';
  recommendedTradeApproach: 'buyer' | 'seller' | 'opportunistic';
  ownerExpectationSummary: string;
  rosterHeadline: string;
  notablePlayers: string[];
  competitiveWindow: 'win_now' | 'stable_contender' | 'transitioning' | 'retooling' | 'rebuild';
}

export interface OpeningStatementOption {
  id: 'confident' | 'humble' | 'measured';
  label: string;
  statement: string;
}

export interface OnboardingPressConferenceBriefing {
  openingStatementOptions: OpeningStatementOption[];
  likelyQuestions: string[];
  recommendedTone: 'confident' | 'humble' | 'measured';
  finalNarrative: string;
}

const QUESTION_TEMPLATES = [
  'How quickly do you expect {player} to shape the outcome of this season?',
  'What does this front office need from {player} to justify the club’s {goal} target?',
  'How does the plan change if {player} forces the issue earlier than expected?',
] as const;

function fillQuestion(template: string, playerName: string, goal: string): string {
  return template
    .replaceAll('{player}', playerName)
    .replaceAll('{goal}', goal);
}

function recommendedTone(context: OnboardingPressConferenceContext): OnboardingPressConferenceBriefing['recommendedTone'] {
  if (context.competitiveWindow === 'win_now' || context.competitiveWindow === 'stable_contender') {
    return 'confident';
  }
  if (context.competitiveWindow === 'rebuild') {
    return 'humble';
  }
  return 'measured';
}

export function generateOnboardingOpeningStatementOptions(
  _rng: GameRNG,
  context: OnboardingPressConferenceContext,
): OpeningStatementOption[] {
  return [
    {
      id: 'confident',
      label: 'Confident',
      statement: `${context.gmName}: This ${context.teamName} group is built to chase ${context.recommendedSeasonGoal}, and the front office will operate with conviction to support that goal.`,
    },
    {
      id: 'humble',
      label: 'Humble',
      statement: `${context.gmName}: The ${context.teamName} have work to do, and our job is to earn credibility through disciplined decisions rather than loud promises.`,
    },
    {
      id: 'measured',
      label: 'Measured',
      statement: `${context.gmName}: The ${context.teamName} know what kind of club they can become, and this front office will make decisions that match that competitive window.`,
    },
  ];
}

export function generateOnboardingPressConference(
  rng: GameRNG,
  context: OnboardingPressConferenceContext,
): OnboardingPressConferenceBriefing {
  const openingStatementOptions = generateOnboardingOpeningStatementOptions(rng, context);
  const tone = recommendedTone(context);
  const finalStatement = openingStatementOptions.find((option) => option.id === tone)?.statement ?? openingStatementOptions[2]!.statement;
  const notablePlayers = context.notablePlayers.length > 0 ? context.notablePlayers : ['the roster core'];
  const likelyQuestions = notablePlayers.slice(0, 3).map((playerName) => (
    fillQuestion(pickTemplate(rng.fork(), QUESTION_TEMPLATES), playerName, context.recommendedSeasonGoal)
  ));

  return {
    openingStatementOptions,
    likelyQuestions,
    recommendedTone: tone,
    finalNarrative: `${finalStatement} ${context.ownerExpectationSummary} ${context.rosterHeadline} The recommended operating posture is ${context.recommendedTradeApproach}.`,
  };
}
