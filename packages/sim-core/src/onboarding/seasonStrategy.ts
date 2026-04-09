import type { FarmAssessment } from './farmAssessment.js';
import type { FinancialPlaybook } from './financialPlaybook.js';
import type { OwnerMeetingBriefing } from './ownerMeeting.js';
import type { RosterAssessment } from './rosterAssessment.js';
import type { ScoutingBriefing } from './scoutingBriefing.js';
import type { StaffEvaluation } from './staffEvaluation.js';

export interface SeasonStrategyContext {
  teamId: string;
  teamName: string;
  ownerMeeting: OwnerMeetingBriefing;
  roster: RosterAssessment;
  farm: FarmAssessment;
  staff: StaffEvaluation;
  financial: FinancialPlaybook;
  scouting: ScoutingBriefing;
}

export interface StrategicPriority {
  id: 'push_current_window' | 'extend_core_players' | 'protect_future_flexibility' | 'accumulate_future_value' | 'reinforce_player_development';
  title: string;
  description: string;
  score: number;
}

export interface SeasonStrategyOption {
  id: 'buyer' | 'seller' | 'opportunistic';
  label: string;
  description: string;
}

export interface SeasonStrategyBriefing {
  competitiveWindow: 'win_now' | 'stable_contender' | 'transitioning' | 'retooling' | 'rebuild';
  recommendedSeasonGoal: 'championship' | 'playoff' | 'rebuild' | 'compete';
  recommendedTradeApproach: 'buyer' | 'seller' | 'opportunistic';
  priorityList: StrategicPriority[];
  strategyOptions: SeasonStrategyOption[];
  summaryNarrative: string;
}

function gradeScore(grade: string): number {
  switch (grade) {
    case 'A':
      return 4;
    case 'B':
      return 3;
    case 'C':
      return 2;
    case 'D':
      return 1;
    case 'F':
    default:
      return 0;
  }
}

function determineCompetitiveWindow(context: SeasonStrategyContext): SeasonStrategyBriefing['competitiveWindow'] {
  const rosterScore = gradeScore(context.roster.lineup.overallGrade);
  const financialScore = gradeScore(context.financial.flexibility.grade);
  const farmScore = gradeScore(context.farm.pipeline.grade);
  const ownerExpectation = context.ownerMeeting.ownerPersonality.expectationLevel;

  if (rosterScore >= 3 && financialScore >= 3 && ownerExpectation === 'championship') {
    return 'win_now';
  }
  if (rosterScore >= 3 && financialScore >= 2) {
    return 'stable_contender';
  }
  if (rosterScore <= 1 && farmScore <= 1 && financialScore <= 1) {
    return 'rebuild';
  }
  if (rosterScore <= 2 && farmScore >= 2) {
    return 'retooling';
  }
  return 'transitioning';
}

export function rankStrategicPriorities(context: SeasonStrategyContext): StrategicPriority[] {
  const rosterScore = gradeScore(context.roster.lineup.overallGrade);
  const financialScore = gradeScore(context.financial.flexibility.grade);
  const farmScore = gradeScore(context.farm.pipeline.grade);

  const priorities: StrategicPriority[] = [
    {
      id: 'push_current_window',
      title: 'Push Current Window',
      description: 'Lean into the major-league roster while the current core can still carry real stakes.',
      score: rosterScore * 30 + (context.financial.flexibility.canAddStar ? 15 : 0) + (context.ownerMeeting.ownerPersonality.expectationLevel === 'championship' ? 10 : 0),
    },
    {
      id: 'extend_core_players',
      title: 'Extend Core Players',
      description: 'Convert near-term control into longer runway before the market gets more expensive.',
      score: Math.min(100, context.financial.extensions.filter((player) => player.urgency === 'extend_now').length * 18 + financialScore * 10),
    },
    {
      id: 'protect_future_flexibility',
      title: 'Protect Future Flexibility',
      description: 'Avoid locking the club into short-sighted moves that will age poorly against the payroll curve.',
      score: (4 - financialScore) * 18 + (context.financial.flexibility.canAddStar ? 0 : 12),
    },
    {
      id: 'accumulate_future_value',
      title: 'Accumulate Future Value',
      description: 'Shift focus toward talent accumulation, roster turnover, and long-run control.',
      score: (4 - rosterScore) * 22 + (4 - financialScore) * 14 + (farmScore <= 1 ? 10 : 0),
    },
    {
      id: 'reinforce_player_development',
      title: 'Reinforce Player Development',
      description: 'Use the staff and pipeline to strengthen the next internal wave rather than chase every external patch.',
      score: farmScore * 15 + gradeScore(context.staff.strengths.overallGrade) * 14,
    },
  ];

  return priorities.sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return left.id.localeCompare(right.id);
  });
}

export function generateSeasonStrategy(context: SeasonStrategyContext): SeasonStrategyBriefing {
  const competitiveWindow = determineCompetitiveWindow(context);
  const priorityList = rankStrategicPriorities(context);
  const recommendedTradeApproach: SeasonStrategyBriefing['recommendedTradeApproach'] =
    competitiveWindow === 'win_now' || competitiveWindow === 'stable_contender'
      ? 'buyer'
      : competitiveWindow === 'rebuild'
        ? 'seller'
        : 'opportunistic';
  const recommendedSeasonGoal: SeasonStrategyBriefing['recommendedSeasonGoal'] =
    competitiveWindow === 'win_now'
      ? 'championship'
      : competitiveWindow === 'stable_contender'
        ? 'playoff'
        : competitiveWindow === 'rebuild'
          ? 'rebuild'
          : 'compete';

  return {
    competitiveWindow,
    recommendedSeasonGoal,
    recommendedTradeApproach,
    priorityList,
    strategyOptions: [
      {
        id: 'buyer',
        label: 'Buyer',
        description: 'Convert flexibility into immediate help and behave like the current roster deserves reinforcement.',
      },
      {
        id: 'seller',
        label: 'Seller',
        description: 'Move short-term assets for longer control and prioritize the next window over the current standings.',
      },
      {
        id: 'opportunistic',
        label: 'Opportunistic',
        description: 'Stay open to both directions and let market inefficiencies decide which move is worth making.',
      },
    ],
    summaryNarrative: `${context.teamName} projects as a ${competitiveWindow.replace('_', ' ')} club. The operating posture should be ${recommendedTradeApproach}, with ${priorityList[0]?.title.toLowerCase() ?? 'a disciplined plan'} leading the front-office agenda.`,
  };
}
