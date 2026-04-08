import { SCENARIO_LIBRARY } from './scenarioLibrary.js';

export interface ScenarioObjective {
  id: string;
  label: string;
  description: string;
  targetValue: number;
  currentValue: number;
  completed: boolean;
  category: 'wins' | 'playoffs' | 'development' | 'finance' | 'roster' | 'narrative';
}

export interface ScenarioObjectiveSet {
  scenarioId: string;
  objectives: ScenarioObjective[];
  completionPercentage: number;
  strategyTips: string[];
  difficultyExplanation: string;
}

export interface ObjectiveProgressContext {
  seasonsPlayed: number;
  winsBySeason: number[];
  playoffAppearances: number;
  championships: number;
  topProspectsDeveloped: number;
  payrollHistory: number[];
  allStarCounts: number[];
  tradeCount: number;
  recordBookEntries: number;
}

interface ScenarioObjectiveTemplate {
  id: string;
  label: string;
  description: string;
  targetValue: number;
  category: ScenarioObjective['category'];
}

type ObjectiveEvaluator = (context: ObjectiveProgressContext) => number;

interface InternalScenarioObjectiveDefinition {
  objectives: ScenarioObjectiveTemplate[];
  strategyTips: string[];
  difficultyExplanation: string;
  evaluators: Record<string, ObjectiveEvaluator>;
}

const DEFAULT_ZERO = 0;
const FULL_COMPLETION = 100;
const MONEYBALL_PAYROLL_THRESHOLD = 125;
const BIG_PAYROLL_THRESHOLD = 200;

function maxValue(values: number[]): number {
  return values.length > 0 ? Math.max(...values) : DEFAULT_ZERO;
}

function countAtOrAbove(values: number[], threshold: number): number {
  return values.filter((value) => value >= threshold).length;
}

function countMoneyballSeasons(context: ObjectiveProgressContext, minimumWins: number): number {
  const seasons = Math.min(context.winsBySeason.length, context.payrollHistory.length);
  let total = 0;
  for (let index = 0; index < seasons; index += 1) {
    if ((context.winsBySeason[index] ?? 0) >= minimumWins && (context.payrollHistory[index] ?? Infinity) <= MONEYBALL_PAYROLL_THRESHOLD) {
      total += 1;
    }
  }
  return total;
}

function makeObjective(
  id: string,
  label: string,
  description: string,
  targetValue: number,
  category: ScenarioObjective['category'],
): ScenarioObjectiveTemplate {
  return {
    id,
    label,
    description,
    targetValue,
    category,
  };
}

const SCENARIO_OBJECTIVE_DEFINITIONS: Record<string, InternalScenarioObjectiveDefinition> = {
  underdog: {
    objectives: [
      makeObjective('underdog_wins_80', 'Win 80 games', 'Push the club to an 80-win season despite the budget gap.', 80, 'wins'),
      makeObjective('underdog_playoffs', 'Make the playoffs', 'Convert the surprise run into at least one playoff berth.', 1, 'playoffs'),
      makeObjective('underdog_develop_star', 'Develop a homegrown All-Star', 'Graduate at least one top prospect into a core contributor.', 1, 'development'),
    ],
    strategyTips: [
      'Treat every payroll dollar like a roster spot. Cheap depth and clean platoon edges matter here.',
      'Push player development aggressively enough to surface one impact contributor before the window closes.',
    ],
    difficultyExplanation: 'Hard difficulty starts with a lower-resource roster and gives you less margin for dead payroll or failed callups.',
    evaluators: {
      underdog_wins_80: (context) => maxValue(context.winsBySeason),
      underdog_playoffs: (context) => context.playoffAppearances,
      underdog_develop_star: (context) => context.topProspectsDeveloped,
    },
  },
  rebuild: {
    objectives: [
      makeObjective('rebuild_wins_86', 'Reach playoff pace', 'Take the roster to an 86-win season within the short runway.', 86, 'wins'),
      makeObjective('rebuild_playoffs', 'Earn a playoff berth', 'Turn the rebuild into a real postseason appearance.', 1, 'playoffs'),
      makeObjective('rebuild_develop_two', 'Develop two core prospects', 'Graduate at least two top prospects into long-term pieces.', 2, 'development'),
    ],
    strategyTips: [
      'Focus on controllable wins first: defense, bullpen depth, and avoiding wasted plate appearances.',
      'Do not chase every short-term veteran fix if it blocks prospect development that the challenge needs.',
    ],
    difficultyExplanation: 'Standard difficulty gives you time, but not much. A slow first season can burn too much of the three-year window.',
    evaluators: {
      rebuild_wins_86: (context) => maxValue(context.winsBySeason),
      rebuild_playoffs: (context) => context.playoffAppearances,
      rebuild_develop_two: (context) => context.topProspectsDeveloped,
    },
  },
  dynasty: {
    objectives: [
      makeObjective('dynasty_titles_3', 'Win 3 championships', 'Turn contention into a three-title run inside the scenario window.', 3, 'playoffs'),
      makeObjective('dynasty_payroll_5', 'Carry $200M+ payroll for 5 seasons', 'Sustain an elite payroll without letting the roster hollow out.', 5, 'finance'),
      makeObjective('dynasty_allstars_5', 'Field 5 All-Stars in one season', 'Stack the roster enough to flood one All-Star team with your talent.', 5, 'roster'),
    ],
    strategyTips: [
      'Keep the core expensive and stable, then churn the fringes with cheap role players and internal replacements.',
      'Dynasties fail when the middle of the roster rots. Keep replenishing depth before decline seasons pile up.',
    ],
    difficultyExplanation: 'Legendary difficulty expects sustained dominance, not one lucky title. You need expensive stars and no wasted contention years.',
    evaluators: {
      dynasty_titles_3: (context) => context.championships,
      dynasty_payroll_5: (context) => countAtOrAbove(context.payrollHistory, BIG_PAYROLL_THRESHOLD),
      dynasty_allstars_5: (context) => maxValue(context.allStarCounts),
    },
  },
  moneyball: {
    objectives: [
      makeObjective('moneyball_contention', 'Win 90+ with a bottom-five payroll', 'Post a 90-win season while keeping payroll in true bargain territory.', 1, 'finance'),
      makeObjective('moneyball_playoffs', 'Make the playoffs', 'Prove the low-payroll roster can reach October.', 1, 'playoffs'),
      makeObjective('moneyball_prospects', 'Develop 2 undervalued contributors', 'Turn overlooked prospects into real major league value.', 2, 'development'),
    ],
    strategyTips: [
      'Find surplus value in skill overlap the market undervalues, then keep the roster flexible enough to exploit it.',
      'You need cheap production from player development or savvy platoons because the payroll cap does not leave room for misses.',
    ],
    difficultyExplanation: 'Hard difficulty limits your spending power enough that every bad contract or missed arbitration bet hurts the whole plan.',
    evaluators: {
      moneyball_contention: (context) => countMoneyballSeasons(context, 90),
      moneyball_playoffs: (context) => context.playoffAppearances,
      moneyball_prospects: (context) => context.topProspectsDeveloped,
    },
  },
  prospect_whisperer: {
    objectives: [
      makeObjective('prospect_whisperer_graduates', 'Develop 3 premium prospects', 'Turn your system into a steady stream of real contributors.', 3, 'development'),
      makeObjective('prospect_whisperer_playoffs', 'Reach the playoffs twice', 'Translate the prospect wave into repeated postseason appearances.', 2, 'playoffs'),
      makeObjective('prospect_whisperer_wins', 'Post a 90-win season', 'Show that the young core can carry a top-tier regular season.', 90, 'wins'),
    ],
    strategyTips: [
      'Prioritize reps and clear development roles over short-term veteran bandages.',
      'If multiple prospects are close, stagger promotions so the roster can absorb them instead of overwhelming them all at once.',
    ],
    difficultyExplanation: 'Standard difficulty gives you time, but development stalls can still sink the plan if you rush too many players together.',
    evaluators: {
      prospect_whisperer_graduates: (context) => context.topProspectsDeveloped,
      prospect_whisperer_playoffs: (context) => context.playoffAppearances,
      prospect_whisperer_wins: (context) => maxValue(context.winsBySeason),
    },
  },
  trade_shark: {
    objectives: [
      makeObjective('trade_shark_trades', 'Complete 10 major trades', 'Reshape the core aggressively through the trade market.', 10, 'roster'),
      makeObjective('trade_shark_title', 'Win a championship', 'Prove the trade-driven roster can finish the job.', 1, 'playoffs'),
      makeObjective('trade_shark_record_book', 'Claim 1 record-book entry', 'Turn the rebuilt roster into something memorable enough to leave a mark.', 1, 'narrative'),
    ],
    strategyTips: [
      'Trade volume alone is not enough. Target consolidation points where two good assets can become one great one.',
      'Keep the major league window in view so prospect churn does not leave the active roster too thin to contend.',
    ],
    difficultyExplanation: 'Hard difficulty punishes sloppy value extraction. You need multiple winning trades without collapsing team chemistry or depth.',
    evaluators: {
      trade_shark_trades: (context) => context.tradeCount,
      trade_shark_title: (context) => context.championships,
      trade_shark_record_book: (context) => context.recordBookEntries,
    },
  },
  veterans_last_stand: {
    objectives: [
      makeObjective('veterans_last_stand_wins', 'Win 90 games', 'Squeeze one more premium regular season from the aging core.', 90, 'wins'),
      makeObjective('veterans_last_stand_playoffs', 'Make the playoffs', 'Get the old core into October while it still has a shot.', 1, 'playoffs'),
      makeObjective('veterans_last_stand_allstars', 'Send 3 veterans to the All-Star team', 'Keep the star veterans productive enough to dominate one more summer.', 3, 'roster'),
    ],
    strategyTips: [
      'Protect the veterans from avoidable workload spikes and build the bench to cover recovery days.',
      'The challenge is about extracting one more peak run, so bias toward present value over distant upside.',
    ],
    difficultyExplanation: 'Standard difficulty still punishes injury risk and age decline. The window is short, and the roster can collapse quickly.',
    evaluators: {
      veterans_last_stand_wins: (context) => maxValue(context.winsBySeason),
      veterans_last_stand_playoffs: (context) => context.playoffAppearances,
      veterans_last_stand_allstars: (context) => maxValue(context.allStarCounts),
    },
  },
  expansion: {
    objectives: [
      makeObjective('expansion_wins', 'Reach 84 wins', 'Get the new club to respectability faster than expected.', 84, 'wins'),
      makeObjective('expansion_playoffs', 'Make the playoffs', 'Turn expansion novelty into immediate relevance.', 1, 'playoffs'),
      makeObjective('expansion_prospects', 'Develop 2 foundational prospects', 'Create a farm backbone that can support the young franchise.', 2, 'development'),
    ],
    strategyTips: [
      'Expansion teams need identity fast. Pick one strength to build around and let the rest catch up over time.',
      'Do not overspend too early. Cheap, controllable growth is what keeps the expansion roster from stalling.',
    ],
    difficultyExplanation: 'Standard difficulty gives the expansion club a chance, but the roster starts thin enough that depth mistakes compound fast.',
    evaluators: {
      expansion_wins: (context) => maxValue(context.winsBySeason),
      expansion_playoffs: (context) => context.playoffAppearances,
      expansion_prospects: (context) => context.topProspectsDeveloped,
    },
  },
  turnaround: {
    objectives: [
      makeObjective('turnaround_title', 'Win a championship', 'Complete the redemption arc with a title after taking the worst job.', 1, 'playoffs'),
      makeObjective('turnaround_playoffs', 'Make the playoffs 3 times', 'Stabilize the franchise enough to become a regular contender.', 3, 'playoffs'),
      makeObjective('turnaround_record_book', 'Claim 1 record-book entry', 'Leave enough of a mark that the turnaround becomes a story, not just a blip.', 1, 'narrative'),
    ],
    strategyTips: [
      'This challenge is about restoring credibility. Build a roster floor first, then chase the ceiling.',
      'A fast turnaround usually comes from cleaning up the bottom third of the roster and fixing the run-prevention baseline.',
    ],
    difficultyExplanation: 'Hard difficulty makes the worst job truly unstable, so you need early credibility before the long-term payoff arrives.',
    evaluators: {
      turnaround_title: (context) => context.championships,
      turnaround_playoffs: (context) => context.playoffAppearances,
      turnaround_record_book: (context) => context.recordBookEntries,
    },
  },
  perfect_season: {
    objectives: [
      makeObjective('perfect_season_wins', 'Win 116 games', 'Match or surpass the all-time regular-season win mark.', 116, 'wins'),
      makeObjective('perfect_season_title', 'Finish with a championship', 'Convert the historic regular season into a title, not a cautionary tale.', 1, 'playoffs'),
      makeObjective('perfect_season_record_book', 'Stack 5 record-book entries', 'Build a season dominant enough to reshape the league history page.', 5, 'narrative'),
    ],
    strategyTips: [
      'You need relentless depth because historic win pace collapses fast once the roster starts leaking replacement-level innings or plate appearances.',
      'Avoid complacency in August and September. The challenge is not only reaching the pace but surviving it into October.',
    ],
    difficultyExplanation: 'Legendary difficulty demands elite weekly consistency for months. Even strong playoff teams usually fall well short of this pace.',
    evaluators: {
      perfect_season_wins: (context) => maxValue(context.winsBySeason),
      perfect_season_title: (context) => context.championships,
      perfect_season_record_book: (context) => context.recordBookEntries,
    },
  },
};

export const SCENARIO_OBJECTIVES: Record<string, {
  objectives: Array<{
    id: string;
    label: string;
    description: string;
    targetValue: number;
    category: ScenarioObjective['category'];
  }>;
  strategyTips: string[];
  difficultyExplanation: string;
}> = Object.fromEntries(
  Object.entries(SCENARIO_OBJECTIVE_DEFINITIONS).map(([scenarioId, definition]) => [
    scenarioId,
    {
      objectives: definition.objectives.map((objective) => ({
        id: objective.id,
        label: objective.label,
        description: objective.description,
        targetValue: objective.targetValue,
        category: objective.category,
      })),
      strategyTips: [...definition.strategyTips],
      difficultyExplanation: definition.difficultyExplanation,
    },
  ]),
);

function completionPercentage(objectives: ScenarioObjective[]): number {
  if (objectives.length === 0) {
    return DEFAULT_ZERO;
  }

  const completed = objectives.filter((objective) => objective.completed).length;
  return Math.round((completed / objectives.length) * FULL_COMPLETION);
}

export function getScenarioObjectives(scenarioId: string): ScenarioObjectiveSet | null {
  const definition = SCENARIO_OBJECTIVE_DEFINITIONS[scenarioId];
  if (!definition) {
    return null;
  }

  const objectives = definition.objectives.map((objective) => ({
    ...objective,
    currentValue: DEFAULT_ZERO,
    completed: false,
  }));

  return {
    scenarioId,
    objectives,
    completionPercentage: DEFAULT_ZERO,
    strategyTips: [...definition.strategyTips],
    difficultyExplanation: definition.difficultyExplanation,
  };
}

export function evaluateObjectiveProgress(
  scenarioId: string,
  context: ObjectiveProgressContext,
): ScenarioObjectiveSet {
  const definition = SCENARIO_OBJECTIVE_DEFINITIONS[scenarioId];
  if (!definition) {
    throw new Error(`Unknown scenario objective set: ${scenarioId}`);
  }

  const objectives = definition.objectives.map((objective) => {
    const currentValue = definition.evaluators[objective.id]?.(context) ?? DEFAULT_ZERO;
    return {
      ...objective,
      currentValue,
      completed: currentValue >= objective.targetValue,
    };
  });

  return {
    scenarioId,
    objectives,
    completionPercentage: completionPercentage(objectives),
    strategyTips: [...definition.strategyTips],
    difficultyExplanation: definition.difficultyExplanation,
  };
}

void SCENARIO_LIBRARY;
