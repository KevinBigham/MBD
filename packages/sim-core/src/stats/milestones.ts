export interface CareerMilestoneDefinition {
  id: string;
  label: string;
  category: 'batting' | 'pitching';
  statKey: 'hits' | 'hr' | 'rbi' | 'sb' | 'strikeouts' | 'wins' | 'saves';
  thresholds: number[];
}

export interface CareerStatTotals {
  hits: number;
  hr: number;
  rbi: number;
  sb: number;
  strikeouts: number;
  wins: number;
  saves: number;
  isPitcher: boolean;
  seasonsPlayed: number;
}

export interface MilestoneProgress {
  milestoneId: string;
  label: string;
  currentValue: number;
  nextThreshold: number;
  remainingToNext: number;
  pacePerSeason: number;
  projectedSeasonsToNext: number | null;
  isApproaching: boolean;
}

export interface MilestoneAlert {
  playerId: string;
  playerName: string;
  milestoneLabel: string;
  currentValue: number;
  threshold: number;
  remaining: number;
  urgency: 'imminent' | 'close' | 'approaching';
}

const APPROACHING_THRESHOLD_FRACTION = 0.1;
const IMMINENT_THRESHOLD_FRACTION = 0.02;
const CLOSE_THRESHOLD_FRACTION = 0.05;

export const CAREER_MILESTONES: CareerMilestoneDefinition[] = [
  { id: 'hits', label: 'Hits', category: 'batting', statKey: 'hits', thresholds: [1000, 2000, 2500, 3000] },
  { id: 'hr', label: 'Home Runs', category: 'batting', statKey: 'hr', thresholds: [100, 300, 500, 600, 700] },
  { id: 'rbi', label: 'RBI', category: 'batting', statKey: 'rbi', thresholds: [500, 1000, 1500, 2000] },
  { id: 'sb', label: 'Stolen Bases', category: 'batting', statKey: 'sb', thresholds: [100, 200, 300, 500] },
  { id: 'strikeouts', label: 'Pitcher Strikeouts', category: 'pitching', statKey: 'strikeouts', thresholds: [1000, 2000, 3000] },
  { id: 'wins', label: 'Pitcher Wins', category: 'pitching', statKey: 'wins', thresholds: [100, 200, 300] },
  { id: 'saves', label: 'Saves', category: 'pitching', statKey: 'saves', thresholds: [100, 200, 300, 400] },
];

function applicableMilestones(careerStats: CareerStatTotals): CareerMilestoneDefinition[] {
  return CAREER_MILESTONES.filter((milestone) => (
    careerStats.isPitcher ? milestone.category === 'pitching' : milestone.category === 'batting'
  ));
}

function resolveSeasonsPlayed(careerStats: CareerStatTotals, seasonsPlayed: number): number {
  return seasonsPlayed > 0 ? seasonsPlayed : careerStats.seasonsPlayed;
}

function nextThresholdForValue(value: number, thresholds: number[]): number {
  return thresholds.find((threshold) => value < threshold) ?? thresholds[thresholds.length - 1]!;
}

function urgencyForRemaining(remaining: number, threshold: number): MilestoneAlert['urgency'] {
  const fractionRemaining = remaining / Math.max(1, threshold);
  if (fractionRemaining <= IMMINENT_THRESHOLD_FRACTION) {
    return 'imminent';
  }
  if (fractionRemaining <= CLOSE_THRESHOLD_FRACTION) {
    return 'close';
  }
  return 'approaching';
}

export function calculateMilestoneProgress(
  careerStats: CareerStatTotals,
  seasonsPlayed: number,
): MilestoneProgress[] {
  const resolvedSeasonsPlayed = resolveSeasonsPlayed(careerStats, seasonsPlayed);

  return applicableMilestones(careerStats).map((milestone) => {
    const currentValue = careerStats[milestone.statKey];
    const nextThreshold = nextThresholdForValue(currentValue, milestone.thresholds);
    const remainingToNext = Math.max(0, nextThreshold - currentValue);
    const pacePerSeason = resolvedSeasonsPlayed > 0 ? currentValue / resolvedSeasonsPlayed : 0;
    const projectedSeasonsToNext = remainingToNext === 0
      ? 0
      : pacePerSeason > 0
        ? remainingToNext / pacePerSeason
        : null;

    return {
      milestoneId: milestone.id,
      label: milestone.label,
      currentValue,
      nextThreshold,
      remainingToNext,
      pacePerSeason,
      projectedSeasonsToNext,
      isApproaching: remainingToNext > 0 && (remainingToNext / Math.max(1, nextThreshold)) <= APPROACHING_THRESHOLD_FRACTION,
    };
  });
}

export function getMilestoneAlerts(
  players: Array<{
    id: string;
    name: string;
    careerStats: CareerStatTotals;
    seasonsPlayed: number;
  }>,
): MilestoneAlert[] {
  return players
    .flatMap((player) => calculateMilestoneProgress(player.careerStats, player.seasonsPlayed)
      .filter((progress) => progress.isApproaching)
      .map((progress) => ({
        playerId: player.id,
        playerName: player.name,
        milestoneLabel: progress.label,
        currentValue: progress.currentValue,
        threshold: progress.nextThreshold,
        remaining: progress.remainingToNext,
        urgency: urgencyForRemaining(progress.remainingToNext, progress.nextThreshold),
      })))
    .sort((left, right) => {
      const leftRatio = left.remaining / Math.max(1, left.threshold);
      const rightRatio = right.remaining / Math.max(1, right.threshold);

      if (leftRatio !== rightRatio) {
        return leftRatio - rightRatio;
      }
      if (left.remaining !== right.remaining) {
        return left.remaining - right.remaining;
      }
      if (left.playerId !== right.playerId) {
        return left.playerId.localeCompare(right.playerId);
      }
      return left.threshold - right.threshold;
    });
}
