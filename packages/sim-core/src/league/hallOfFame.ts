import type { GameRNG } from '../math/prng.js';
import type { AwardHistoryEntry } from '@mbd/contracts';

export interface CareerBattingTotals {
  hits: number;
  hr: number;
  rbi: number;
}

export interface CareerPitchingTotals {
  wins: number;
  strikeouts: number;
  inningsPitched: number;
  earnedRuns: number;
}

export interface CareerStatsLedger {
  playerId: string;
  playerName: string;
  position: string;
  seasonsPlayed: number;
  teamIds: string[];
  peakOverall: number;
  championshipRings: number;
  allStarSelections: number;
  gamesPlayed?: number;
  saves?: number;
  war?: number;
  batting: CareerBattingTotals | null;
  pitching: CareerPitchingTotals | null;
}

export interface HallOfFameCandidate {
  playerId: string;
  playerName: string;
  position: string;
  seasonsPlayed: number;
  peakOverall: number;
  currentOverall: number;
  teamIds: string[];
  championshipRings: number;
  allStarSelections: number;
  careerStats: CareerStatsLedger;
}

export interface HallOfFameEvaluation {
  score: number;
  inductionTier: 'first_ballot' | 'ballot' | 'not_selected';
  summary: string;
}

export interface HallOfFameEntry {
  playerId: string;
  playerName: string;
  position: string;
  careerStats: CareerStatsLedger;
  awards: string[];
  seasonsPlayed: number;
  teamIds: string[];
  inductionSeason: number;
  score: number;
  inductionType: 'first_ballot' | 'ballot';
  summary: string;
}

export interface HallOfFameBallotEntry {
  playerId: string;
  playerName: string;
  position: string;
  careerStats: CareerStatsLedger;
  score: number;
  enteredBallotSeason: number;
  inductionSeason: number;
}

export interface ProcessHOFInductionsArgs {
  retiredPlayers: HallOfFameCandidate[];
  awardHistory: AwardHistoryEntry[];
  existingHallOfFame: HallOfFameEntry[];
  ballotEntries: HallOfFameBallotEntry[];
  currentSeason: number;
  rng: GameRNG;
}

export interface ProcessHOFInductionsResult {
  inductees: HallOfFameEntry[];
  hallOfFame: HallOfFameEntry[];
  ballotEntries: HallOfFameBallotEntry[];
}

export interface FranchiseTimelineEntry {
  season: number;
  teamId: string;
  record: string;
  winTotal: number;
  playoffResult: string;
  championship: boolean;
  worldSeriesAppearance: boolean;
  playoffAppearance: boolean;
  divisionTitle: boolean;
  awardWinnerCount: number;
  keyAcquisitions: string[];
  keyDepartures: string[];
  dynastyScore: number;
}

export interface DynastyScoreSummary {
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: {
    championships: number;
    worldSeriesAppearances: number;
    playoffAppearances: number;
    ninetyWinSeasons: number;
    divisionTitles: number;
    losingSeasons: number;
    awardWinners: number;
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.round(value));
}

function countAwards(playerId: string, awardHistory: AwardHistoryEntry[]): Record<string, number> {
  return awardHistory
    .filter((entry) => entry.playerId === playerId)
    .reduce<Record<string, number>>((totals, entry) => {
      totals[entry.award] = (totals[entry.award] ?? 0) + 1;
      return totals;
    }, {});
}

function careerProductionBonus(candidate: HallOfFameCandidate): number {
  if (candidate.careerStats.batting) {
    return Math.min(20,
      Math.floor(candidate.careerStats.batting.hits / 300) +
      Math.floor(candidate.careerStats.batting.hr / 100),
    );
  }

  if (candidate.careerStats.pitching) {
    return Math.min(20,
      Math.floor(candidate.careerStats.pitching.wins / 30) +
      Math.floor(candidate.careerStats.pitching.strikeouts / 300),
    );
  }

  return 0;
}

function awardLabels(playerId: string, awardHistory: AwardHistoryEntry[]): string[] {
  return awardHistory
    .filter((entry) => entry.playerId === playerId)
    .map((entry) => `${entry.league} ${entry.award}`);
}

function inductionSummary(candidate: HallOfFameCandidate, score: number, tier: HallOfFameEvaluation['inductionTier']): string {
  if (tier === 'first_ballot') {
    return `${candidate.playerName} authored a Hall of Fame career and cleared the first-ballot bar with a ${score} score.`;
  }
  if (tier === 'ballot') {
    return `${candidate.playerName} built a Hall of Fame case strong enough to stay on the ballot at ${score}.`;
  }
  return `${candidate.playerName} fell short of Hall of Fame induction with a ${score} score.`;
}

export function evaluateHOFCandidate(
  candidate: HallOfFameCandidate,
  awardHistory: AwardHistoryEntry[],
): HallOfFameEvaluation {
  const awards = countAwards(candidate.playerId, awardHistory);
  const serviceScore = candidate.seasonsPlayed >= 10
    ? 25 + Math.min(15, (candidate.seasonsPlayed - 10) * 4)
    : candidate.seasonsPlayed * 2;
  const peakScore = candidate.peakOverall >= 70
    ? Math.min(25, 10 + (candidate.peakOverall - 70) * 1.5)
    : Math.max(0, candidate.peakOverall - 60);
  const awardScore =
    (awards.MVP ?? 0) * 12 +
    (awards.CY_YOUNG ?? 0) * 12 +
    (awards.ROY ?? 0) * 6;
  const ringsScore = candidate.championshipRings * 4;
  const allStarScore = candidate.allStarSelections * 2;
  const productionScore = careerProductionBonus(candidate);
  const score = clampScore(serviceScore + peakScore + awardScore + ringsScore + allStarScore + productionScore);

  const inductionTier =
    score >= 80
      ? 'first_ballot'
      : score >= 65
        ? 'ballot'
        : 'not_selected';

  return {
    score,
    inductionTier,
    summary: inductionSummary(candidate, score, inductionTier),
  };
}

function createHallOfFameEntry(
  candidate: HallOfFameCandidate,
  awardHistory: AwardHistoryEntry[],
  score: number,
  inductionSeason: number,
  inductionType: 'first_ballot' | 'ballot',
): HallOfFameEntry {
  return {
    playerId: candidate.playerId,
    playerName: candidate.playerName,
    position: candidate.position,
    careerStats: candidate.careerStats,
    awards: awardLabels(candidate.playerId, awardHistory),
    seasonsPlayed: candidate.seasonsPlayed,
    teamIds: candidate.teamIds,
    inductionSeason,
    score,
    inductionType,
    summary: `${candidate.playerName} entered the Hall of Fame in season ${inductionSeason}.`,
  };
}

export function processHOFInductions({
  retiredPlayers,
  awardHistory,
  existingHallOfFame,
  ballotEntries,
  currentSeason,
  rng,
}: ProcessHOFInductionsArgs): ProcessHOFInductionsResult {
  const inductees: HallOfFameEntry[] = [];
  const pendingBallot = [...ballotEntries];
  const existingIds = new Set(existingHallOfFame.map((entry) => entry.playerId));

  for (const candidate of retiredPlayers) {
    if (existingIds.has(candidate.playerId) || pendingBallot.some((entry) => entry.playerId === candidate.playerId)) {
      continue;
    }

    const evaluation = evaluateHOFCandidate(candidate, awardHistory);
    if (evaluation.inductionTier === 'first_ballot') {
      inductees.push(createHallOfFameEntry(candidate, awardHistory, evaluation.score, currentSeason, 'first_ballot'));
      existingIds.add(candidate.playerId);
      continue;
    }

    if (evaluation.inductionTier === 'ballot') {
      const waitYears = rng.nextInt(1, 3);
      pendingBallot.push({
        playerId: candidate.playerId,
        playerName: candidate.playerName,
        position: candidate.position,
        careerStats: candidate.careerStats,
        score: evaluation.score,
        enteredBallotSeason: currentSeason,
        inductionSeason: currentSeason + waitYears,
      });
    }
  }

  const remainingBallot: HallOfFameBallotEntry[] = [];
  for (const ballotEntry of pendingBallot) {
    if (existingIds.has(ballotEntry.playerId)) {
      continue;
    }

    if (ballotEntry.inductionSeason <= currentSeason) {
      inductees.push({
        playerId: ballotEntry.playerId,
        playerName: ballotEntry.playerName,
        position: ballotEntry.position,
        careerStats: ballotEntry.careerStats,
        awards: awardLabels(ballotEntry.playerId, awardHistory),
        seasonsPlayed: ballotEntry.careerStats.seasonsPlayed,
        teamIds: ballotEntry.careerStats.teamIds,
        inductionSeason: currentSeason,
        score: ballotEntry.score,
        inductionType: 'ballot',
        summary: `${ballotEntry.playerName} earned Hall of Fame induction after waiting on the ballot.`,
      });
      existingIds.add(ballotEntry.playerId);
      continue;
    }

    remainingBallot.push(ballotEntry);
  }

  const hallOfFame = [...existingHallOfFame, ...inductees].sort((left, right) => {
    if (left.inductionSeason !== right.inductionSeason) return right.inductionSeason - left.inductionSeason;
    return right.score - left.score;
  });

  return {
    inductees,
    hallOfFame,
    ballotEntries: remainingBallot,
  };
}

function dynastyGrade(score: number): DynastyScoreSummary['grade'] {
  if (score >= 500) return 'S';
  if (score >= 350) return 'A';
  if (score >= 200) return 'B';
  if (score >= 100) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}

export function calculateDynastyScore(timeline: FranchiseTimelineEntry[]): DynastyScoreSummary {
  const breakdown = {
    championships: 0,
    worldSeriesAppearances: 0,
    playoffAppearances: 0,
    ninetyWinSeasons: 0,
    divisionTitles: 0,
    losingSeasons: 0,
    awardWinners: 0,
  };

  let score = 0;
  for (const season of timeline) {
    if (season.championship) {
      score += 100;
      breakdown.championships += 1;
    }
    if (season.worldSeriesAppearance) {
      score += 40;
      breakdown.worldSeriesAppearances += 1;
    }
    if (season.playoffAppearance) {
      score += 15;
      breakdown.playoffAppearances += 1;
    }
    if (season.winTotal >= 90) {
      score += 10;
      breakdown.ninetyWinSeasons += 1;
    }
    if (season.divisionTitle) {
      score += 20;
      breakdown.divisionTitles += 1;
    }
    if (season.winTotal < 81) {
      score -= 5;
      breakdown.losingSeasons += 1;
    }

    score += season.awardWinnerCount * 5;
    breakdown.awardWinners += season.awardWinnerCount;
  }

  return {
    score,
    grade: dynastyGrade(score),
    breakdown,
  };
}
