import type { GameRNG } from '../math/prng.js';
import { toDisplayRating, toLetterGrade } from '../player/attributes.js';
import { getPlayerArchetype } from '../player/similarity.js';
import type { GeneratedPlayer, Position } from '../player/generation.js';
import { evaluatePlayerTradeValue } from '../trade/valuation.js';
import {
  ONBOARDING_POSITION_ORDER,
  average,
  findBestPlayerAtPosition,
  fullNameFromParts,
  getPlayerFullName,
  gradeFromThresholds,
  isPitcherPosition,
  pickTemplate,
  sortPlayersByRating,
  splitRoster,
} from './shared.js';

export interface StarPlayerProfile {
  playerId: string;
  name: string;
  position: string;
  age: number;
  overallRating: number;
  displayRating: number;
  letterGrade: string;
  archetype: string;
  spotlight: string;
  contractYears: number;
  annualSalary: number;
}

export interface LineupAnalysis {
  overallGrade: string;
  hittersGrade: string;
  pitchingGrade: string;
  topStrength: string;
  biggestWeakness: string;
  depthRating: 'deep' | 'adequate' | 'thin';
  balanceAssessment: string;
}

export interface PositionNeed {
  position: string;
  urgency: 'critical' | 'moderate' | 'low';
  currentBest: { name: string; rating: number } | null;
  explanation: string;
}

export interface ContractSituation {
  totalPayroll: number;
  extensionCandidates: Array<{ name: string; position: string; contractYearsLeft: number; salary: number }>;
  expiringDeals: Array<{ name: string; position: string; salary: number }>;
  biggestContract: { name: string; salary: number; years: number };
  narrativeSummary: string;
}

export interface RosterAssessment {
  stars: StarPlayerProfile[];
  lineup: LineupAnalysis;
  needs: PositionNeed[];
  contracts: ContractSituation;
  rosterNarrative: string;
  aceStarter: StarPlayerProfile | null;
  cleanupHitter: StarPlayerProfile | null;
}

const LINEUP_GRADE_THRESHOLDS = {
  A: 400,
  B: 325,
  C: 250,
  D: 0,
} as const;

const ROSTER_OPENERS = [
  'The major-league roster has a clear identity already.',
  'The major-league picture is defined by a few obvious pillars and a handful of pressure points.',
  'This roster tells you quickly where the club can win and where it can be exposed.',
] as const;

function mlbPlayers(players: readonly GeneratedPlayer[], teamId?: string): GeneratedPlayer[] {
  return players.filter((player) => player.rosterStatus === 'MLB' && (teamId == null || player.teamId === teamId));
}

function topStrength(hittersAverage: number, startersAverage: number, relieversAverage: number): string {
  if (startersAverage >= hittersAverage + 20 && startersAverage >= relieversAverage) {
    return 'elite rotation';
  }
  if (relieversAverage >= hittersAverage + 20 && relieversAverage >= startersAverage) {
    return 'shorten-the-game bullpen';
  }
  if (hittersAverage >= startersAverage + 20) {
    return 'middle-of-the-order impact';
  }
  return 'balanced everyday core';
}

function biggestWeakness(hittersAverage: number, startersAverage: number, relieversAverage: number): string {
  const weakest = Math.min(hittersAverage || Number.POSITIVE_INFINITY, startersAverage || Number.POSITIVE_INFINITY, relieversAverage || Number.POSITIVE_INFINITY);
  if (!Number.isFinite(weakest)) {
    return 'thin roster coverage';
  }
  if (weakest === relieversAverage) return 'shallow bullpen';
  if (weakest === startersAverage) return 'rotation stability';
  return 'offensive depth';
}

function makeStarSpotlight(player: GeneratedPlayer): string {
  const archetype = getPlayerArchetype(player);
  const tradeValue = evaluatePlayerTradeValue(player).overall;

  return `${getPlayerFullName(player)} gives the roster a ${archetype.archetype.toLowerCase()} anchor with ${tradeValue} trade-value strength on the internal board.`;
}

export function identifyStarPlayers(
  players: GeneratedPlayer[],
  limit: number = 5,
): StarPlayerProfile[] {
  return sortPlayersByRating(mlbPlayers(players))
    .slice(0, limit)
    .map((player) => ({
      playerId: player.id,
      name: getPlayerFullName(player),
      position: player.position,
      age: player.age,
      overallRating: player.overallRating,
      displayRating: toDisplayRating(player.overallRating),
      letterGrade: toLetterGrade(player.overallRating),
      archetype: getPlayerArchetype(player).archetype,
      spotlight: makeStarSpotlight(player),
      contractYears: player.contract.years,
      annualSalary: player.contract.annualSalary,
    }));
}

export function analyzeLineupStrengths(players: GeneratedPlayer[]): LineupAnalysis {
  const roster = mlbPlayers(players);
  const { hitters, pitchers } = splitRoster(roster);
  const starters = pitchers.filter((player) => player.position === 'SP');
  const relievers = pitchers.filter((player) => player.position === 'RP' || player.position === 'CL');
  const hittersAverage = average(hitters.map((player) => player.overallRating));
  const pitchingAverage = average(pitchers.map((player) => player.overallRating));
  const startersAverage = average(starters.map((player) => player.overallRating));
  const relieversAverage = average(relievers.map((player) => player.overallRating));
  const overallAverage = average(roster.map((player) => player.overallRating));
  const depthRating: LineupAnalysis['depthRating'] =
    roster.length >= 13 && hitters.length >= 8 && pitchers.length >= 5
      ? 'deep'
      : roster.length >= 8
        ? 'adequate'
        : 'thin';

  return {
    overallGrade: gradeFromThresholds(overallAverage, LINEUP_GRADE_THRESHOLDS),
    hittersGrade: gradeFromThresholds(hittersAverage, LINEUP_GRADE_THRESHOLDS),
    pitchingGrade: gradeFromThresholds(pitchingAverage, LINEUP_GRADE_THRESHOLDS),
    topStrength: topStrength(hittersAverage, startersAverage, relieversAverage),
    biggestWeakness: biggestWeakness(hittersAverage, startersAverage, relieversAverage),
    depthRating,
    balanceAssessment:
      Math.abs(hittersAverage - pitchingAverage) <= 20
        ? 'The roster is balanced across the lineup card and staff.'
        : hittersAverage > pitchingAverage
          ? 'The offense is carrying more weight than the pitching staff right now.'
          : 'The staff is sturdier than the lineup behind it.',
  };
}

export function identifyPositionNeeds(players: GeneratedPlayer[]): PositionNeed[] {
  const roster = mlbPlayers(players);

  return ONBOARDING_POSITION_ORDER.map((position) => {
    const bestPlayer = findBestPlayerAtPosition(roster, position as Position);
    const rating = bestPlayer?.overallRating ?? 0;
    const urgency: PositionNeed['urgency'] =
      rating < 250 ? 'critical' : rating < 300 ? 'moderate' : 'low';

    return {
      position,
      urgency,
      currentBest: bestPlayer == null
        ? null
        : {
          name: getPlayerFullName(bestPlayer),
          rating: bestPlayer.overallRating,
        },
      explanation:
        bestPlayer == null
          ? `There is no credible major-league answer at ${position}.`
          : urgency === 'critical'
            ? `${getPlayerFullName(bestPlayer)} is well below an average everyday baseline at ${position}.`
            : urgency === 'moderate'
              ? `${getPlayerFullName(bestPlayer)} can hold the position for now, but it remains an upgrade target.`
              : `${getPlayerFullName(bestPlayer)} keeps ${position} out of the immediate danger zone.`,
    };
  });
}

export function summarizeContractSituation(players: GeneratedPlayer[]): ContractSituation {
  const roster = sortPlayersByRating(mlbPlayers(players));
  const totalPayroll = Math.round(roster.reduce((sum, player) => sum + player.contract.annualSalary, 0) * 100) / 100;
  const extensionCandidates = roster
    .filter((player) => player.contract.years >= 2 && player.contract.years <= 3 && player.overallRating > 340)
    .map((player) => ({
      name: getPlayerFullName(player),
      position: player.position,
      contractYearsLeft: player.contract.years,
      salary: player.contract.annualSalary,
    }));
  const expiringDeals = roster
    .filter((player) => player.contract.years === 1)
    .map((player) => ({
      name: getPlayerFullName(player),
      position: player.position,
      salary: player.contract.annualSalary,
    }));
  const biggest = roster.reduce<GeneratedPlayer | null>((current, player) => {
    if (current == null || player.contract.annualSalary > current.contract.annualSalary) {
      return player;
    }

    return current;
  }, null);

  return {
    totalPayroll,
    extensionCandidates,
    expiringDeals,
    biggestContract: biggest == null
      ? { name: 'None', salary: 0, years: 0 }
      : {
        name: getPlayerFullName(biggest),
        salary: biggest.contract.annualSalary,
        years: biggest.contract.years,
      },
    narrativeSummary:
      biggest == null
        ? 'There are no major-league contracts on the books yet.'
        : `${getPlayerFullName(biggest)} carries the heaviest annual commitment, while ${expiringDeals.length} contract${expiringDeals.length === 1 ? '' : 's'} can come off the board after the season.`,
  };
}

function makeAnchorProfile(player: GeneratedPlayer | null): StarPlayerProfile | null {
  if (player == null) {
    return null;
  }

  return {
    playerId: player.id,
    name: getPlayerFullName(player),
    position: player.position,
    age: player.age,
    overallRating: player.overallRating,
    displayRating: toDisplayRating(player.overallRating),
    letterGrade: toLetterGrade(player.overallRating),
    archetype: getPlayerArchetype(player).archetype,
    spotlight: makeStarSpotlight(player),
    contractYears: player.contract.years,
    annualSalary: player.contract.annualSalary,
  };
}

function findAceStarter(players: readonly GeneratedPlayer[]): GeneratedPlayer | null {
  return sortPlayersByRating(players.filter((player) => player.position === 'SP'))[0] ?? null;
}

function findCleanupHitter(players: readonly GeneratedPlayer[]): GeneratedPlayer | null {
  const hitters = players.filter((player) => !isPitcherPosition(player.position));

  return [...hitters].sort((left, right) => {
    const leftPower = left.hitterAttributes.power;
    const rightPower = right.hitterAttributes.power;
    if (rightPower !== leftPower) {
      return rightPower - leftPower;
    }
    if (right.overallRating !== left.overallRating) {
      return right.overallRating - left.overallRating;
    }
    return left.id.localeCompare(right.id);
  })[0] ?? null;
}

export function assessRoster(
  rng: GameRNG,
  players: GeneratedPlayer[],
  teamId: string,
): RosterAssessment {
  const roster = mlbPlayers(players, teamId);
  const stars = identifyStarPlayers(roster);
  const lineup = analyzeLineupStrengths(roster);
  const needs = identifyPositionNeeds(roster);
  const contracts = summarizeContractSituation(roster);
  const aceStarter = makeAnchorProfile(findAceStarter(roster));
  const cleanupHitter = makeAnchorProfile(findCleanupHitter(roster));
  const opener = pickTemplate(rng, ROSTER_OPENERS);

  return {
    stars,
    lineup,
    needs,
    contracts,
    aceStarter,
    cleanupHitter,
    rosterNarrative: `${opener} The clearest strength is ${lineup.topStrength}, while the most obvious pressure point is ${lineup.biggestWeakness}. Contract pressure sits at ${contracts.totalPayroll.toFixed(2)} million in current payroll.`,
  };
}
