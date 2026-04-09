import type { GameRNG } from '../math/prng.js';
import { RATING_MAX } from '../player/attributes.js';
import { LEAGUE_MINIMUM_SALARY } from './contracts.js';

const MAX_PROJECTED_AAV = 40;
const BASE_MARKET_FLOOR = 4;
const WAR_VALUE_MULTIPLIER = 1.8;
const POSITION_AVERAGE_PRESSURE = 0.12;
const MIN_BUDGET_COVERAGE = 0.65;
const NEED_BONUS = 18;
const BUDGET_WEIGHT = 0.45;
const VALUE_GAP_WEIGHT = 0.55;
const MAX_TOP_FREE_AGENTS = 5;

const DEMAND_SCORE_BY_LEVEL: Record<MarketReport['demandLevel'], number> = {
  cold: 1,
  warm: 2,
  hot: 3,
  bidding_war: 4,
};

const POSITION_MULTIPLIERS: Record<string, number> = {
  SP: 1.16,
  SS: 1.08,
  C: 1.05,
  CL: 1.02,
  RP: 0.94,
  DH: 0.88,
};

export interface ComparableContract {
  playerName: string;
  position: string;
  ageAtSigning: number;
  annualValue: number;
  years: number;
  season: number;
}

export interface SigningPrediction {
  likelyTeamId: string | null;
  projectedYears: number;
  projectedAAV: number;
  confidence: 'low' | 'medium' | 'high';
}

export interface MarketReportContext {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  overallRating: number;
  warProjection: number;
  historicalSignings: ComparableContract[];
  leagueAverageSalaryByPosition?: Record<string, number>;
  teams: Array<{
    teamId: string;
    budgetRemaining: number;
    needsPosition: boolean;
  }>;
}

export interface MarketReport {
  playerId: string;
  playerName: string;
  position: string;
  age: number;
  projectedValue: number;
  demandLevel: 'cold' | 'warm' | 'hot' | 'bidding_war';
  interestedTeamCount: number;
  comparableContracts: ComparableContract[];
  signingPrediction: SigningPrediction;
}

export interface MarketSummary {
  totalProjectedSpending: number;
  hottestPosition: string;
  topFreeAgents: Array<{ name: string; projectedAAV: number }>;
  positionDemand: Record<string, number>;
}

interface TeamSignal {
  teamId: string;
  budgetRemaining: number;
  needsPosition: boolean;
  fitScore: number;
}

interface InternalMarketReport extends MarketReport {
  teamSignals: TeamSignal[];
}

function byString(left: string, right: string): number {
  return left.localeCompare(right);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function positionMultiplier(position: string): number {
  return POSITION_MULTIPLIERS[position] ?? 1;
}

function ageMultiplier(age: number): number {
  if (age <= 26) return 1.12;
  if (age <= 29) return 1.02;
  if (age <= 32) return 0.88;
  if (age <= 35) return 0.72;
  return 0.55;
}

function projectedAAV(input: {
  position: string;
  age: number;
  overallRating: number;
  warProjection: number;
  leagueAverageSalaryByPosition?: Record<string, number>;
}): number {
  const ratingFraction = clamp(input.overallRating / RATING_MAX, 0, 1);
  const ratingValue = BASE_MARKET_FLOOR + (ratingFraction * MAX_PROJECTED_AAV);
  const warValue = Math.max(0, input.warProjection) * WAR_VALUE_MULTIPLIER;
  const positionPressure = (input.leagueAverageSalaryByPosition?.[input.position] ?? 0) * POSITION_AVERAGE_PRESSURE;
  const value = (ratingValue * ageMultiplier(input.age) * positionMultiplier(input.position)) + warValue + positionPressure;
  return roundCurrency(Math.max(LEAGUE_MINIMUM_SALARY, value));
}

function similarityScore(
  contract: ComparableContract,
  target: { position: string; age: number; projectedValue: number },
): number {
  const positionPenalty = contract.position === target.position ? 0 : 1000;
  const agePenalty = Math.abs(contract.ageAtSigning - target.age) * 10;
  const annualValuePenalty = Math.abs(contract.annualValue - target.projectedValue) * 5;
  const yearsPenalty = Math.abs(contract.years - (target.age <= 29 ? 6 : target.age <= 32 ? 4 : 2)) * 2;
  return positionPenalty + agePenalty + annualValuePenalty + yearsPenalty;
}

function demandLevel(projectedValue: number, interestedTeamCount: number, teamsWithNeed: number): MarketReport['demandLevel'] {
  if (projectedValue >= 24 && interestedTeamCount >= 3 && teamsWithNeed >= 2) {
    return 'bidding_war';
  }
  if (projectedValue >= 16 && interestedTeamCount >= 2) {
    return 'hot';
  }
  if (projectedValue >= 8 && interestedTeamCount >= 1) {
    return 'warm';
  }
  return 'cold';
}

function contractYears(age: number, demand: MarketReport['demandLevel']): number {
  if (age <= 28 && (demand === 'hot' || demand === 'bidding_war')) return 6;
  if (age <= 31 && demand !== 'cold') return 4;
  if (age <= 34) return 3;
  return demand === 'cold' ? 1 : 2;
}

function confidenceForDemand(demand: MarketReport['demandLevel']): SigningPrediction['confidence'] {
  if (demand === 'bidding_war') return 'high';
  if (demand === 'hot' || demand === 'warm') return 'medium';
  return 'low';
}

function buildTeamSignals(context: MarketReportContext, value: number): TeamSignal[] {
  return context.teams
    .map((team) => {
      const budgetCoverage = team.budgetRemaining / Math.max(value, 1);
      const qualified = budgetCoverage >= MIN_BUDGET_COVERAGE;
      const fitScore = qualified
        ? ((team.needsPosition ? NEED_BONUS : 0) + (team.budgetRemaining * BUDGET_WEIGHT) - (Math.abs(team.budgetRemaining - value) * VALUE_GAP_WEIGHT))
        : -1;

      return {
        teamId: team.teamId,
        budgetRemaining: team.budgetRemaining,
        needsPosition: team.needsPosition,
        fitScore,
      };
    })
    .filter((team) => team.fitScore >= 0)
    .sort((left, right) => right.fitScore - left.fitScore || byString(left.teamId, right.teamId));
}

export function findComparableContracts(
  position: string,
  age: number,
  rating: number,
  historicalSignings: ComparableContract[],
): ComparableContract[] {
  const targetValue = projectedAAV({
    position,
    age,
    overallRating: rating,
    warProjection: 0,
  });
  const desiredCount = historicalSignings.length >= 5 ? 5 : historicalSignings.length >= 3 ? 3 : historicalSignings.length;

  return historicalSignings
    .slice()
    .sort((left, right) => (
      similarityScore(left, { position, age, projectedValue: targetValue })
      - similarityScore(right, { position, age, projectedValue: targetValue })
      || left.season - right.season
      || byString(left.playerName, right.playerName)
    ))
    .slice(0, desiredCount);
}

export function predictSigning(rng: GameRNG, report: MarketReport): SigningPrediction {
  const internalReport = report as InternalMarketReport;
  const candidates = internalReport.teamSignals ?? [];
  const projectedYears = contractYears(report.age, report.demandLevel);
  const projectedAAV = roundCurrency(
    report.projectedValue
    * (report.demandLevel === 'bidding_war' ? 1.05 : report.demandLevel === 'hot' ? 1.02 : 1),
  );

  if (candidates.length === 0) {
    return {
      likelyTeamId: null,
      projectedYears,
      projectedAAV,
      confidence: confidenceForDemand(report.demandLevel),
    };
  }

  const topScore = candidates[0]!.fitScore;
  const tiedTeams = candidates.filter((team) => Math.abs(team.fitScore - topScore) < 0.001);
  const likelyTeamId = tiedTeams.length === 1
    ? tiedTeams[0]!.teamId
    : rng.weightedPick(
        tiedTeams.map((team) => team.teamId),
        tiedTeams.map((team) => Math.max(1, team.fitScore)),
      );

  return {
    likelyTeamId,
    projectedYears,
    projectedAAV,
    confidence: confidenceForDemand(report.demandLevel),
  };
}

export function generateMarketReport(rng: GameRNG, context: MarketReportContext): MarketReport {
  const projectedValue = projectedAAV({
    position: context.position,
    age: context.age,
    overallRating: context.overallRating,
    warProjection: context.warProjection,
    leagueAverageSalaryByPosition: context.leagueAverageSalaryByPosition,
  });
  const comparableContracts = findComparableContracts(
    context.position,
    context.age,
    context.overallRating,
    context.historicalSignings,
  );
  const teamSignals = buildTeamSignals(context, projectedValue);
  const teamsWithNeed = teamSignals.filter((team) => team.needsPosition).length;
  const report: InternalMarketReport = {
    playerId: context.playerId,
    playerName: context.playerName,
    position: context.position,
    age: context.age,
    projectedValue,
    demandLevel: demandLevel(projectedValue, teamSignals.length, teamsWithNeed),
    interestedTeamCount: teamSignals.length,
    comparableContracts,
    signingPrediction: {
      likelyTeamId: null,
      projectedYears: 0,
      projectedAAV: projectedValue,
      confidence: 'low',
    },
    teamSignals,
  };

  report.signingPrediction = predictSigning(rng.fork(), report);
  return report;
}

export function generateMarketSummary(reports: MarketReport[]): MarketSummary {
  const positionDemand: Record<string, number> = {};

  for (const report of reports) {
    positionDemand[report.position] = (positionDemand[report.position] ?? 0)
      + DEMAND_SCORE_BY_LEVEL[report.demandLevel]
      + report.interestedTeamCount;
  }

  const hottestPosition = Object.entries(positionDemand)
    .sort((left, right) => right[1] - left[1] || byString(left[0], right[0]))[0]?.[0] ?? 'N/A';

  return {
    totalProjectedSpending: roundCurrency(
      reports.reduce((total, report) => total + report.signingPrediction.projectedAAV, 0),
    ),
    hottestPosition,
    topFreeAgents: reports
      .slice()
      .sort((left, right) =>
        right.signingPrediction.projectedAAV - left.signingPrediction.projectedAAV
        || byString(left.playerName, right.playerName),
      )
      .slice(0, MAX_TOP_FREE_AGENTS)
      .map((report) => ({
        name: report.playerName,
        projectedAAV: report.signingPrediction.projectedAAV,
      })),
    positionDemand,
  };
}
