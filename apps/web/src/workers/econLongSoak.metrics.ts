import { createHash } from 'node:crypto';
import { TEAMS } from '@mbd/sim-core';

export const ECON_LONG_SOAK_GOAL = 'ECON-LONG-SOAK-1' as const;
export const ECON_LONG_SOAK_SCHEMA = 1 as const;
export const ECON_LONG_SOAK_SAVE_SCHEMA = 35 as const;
export const ECON_LONG_SOAK_HORIZON = 30 as const;
export const ECON_LONG_SOAK_SEEDS = [7111, 7112, 7113, 7114] as const;
export const ECON_LONG_SOAK_CALIBRATION_SEEDS = [7111, 7112, 7113] as const;
export const ECON_LONG_SOAK_HELD_OUT_SEED = 7114 as const;
export const ECON_LONG_SOAK_DIAGNOSTIC_MODE = 'diagnostic_inherited_candidates' as const;
export const ECON_LONG_SOAK_DIAGNOSTIC_MARKER = 'NON_ACCEPTING_DIAGNOSTIC_ONLY' as const;
export const ECON_LONG_SOAK_DIAGNOSTIC_CANDIDATES = [
  'free_agency_entry_450_1089',
  'total_signings_21_58',
  'meaningful_signings_21_57',
  'top_aav_20_45',
  'payroll_spread_25_350',
] as const;
export const ECON_LONG_SOAK_FA_ENTRY_MIN = 450 as const;
export const ECON_LONG_SOAK_FA_ENTRY_MAX = 1089 as const;

export type EconLongSoakSeed = (typeof ECON_LONG_SOAK_SEEDS)[number];
export type EconLongSoakMode = 'measurement' | 'strict' | typeof ECON_LONG_SOAK_DIAGNOSTIC_MODE;
export type FreeAgencyTier = 'elite' | 'high' | 'moderate' | 'low' | 'fringe';
export type ContractOrigin =
  | 'free_agency'
  | 'accepted_extension'
  | 'accepted_qualifying_offer'
  | 'arbitration'
  | 'tender_renewal'
  | 'market_exhausted';
export type ContractTermBucket = '1' | '2-3' | '4-5' | '6-8' | '9-10';
export type EconomyLifecycleLane =
  | 'contractClock'
  | 'options'
  | 'qualifyingOffers'
  | 'freeAgency'
  | 'marketRevenue'
  | 'tradeFinance';

export interface EconLongSoakPayrollRow {
  teamId: string;
  mlbPayroll: number;
  minorsPayroll: number;
  totalPayroll: number;
  luxuryTaxPayroll: number;
  deadMoney: number;
  retainedSalaryCharges: number;
  cashConsiderationCharges: number;
  releasedContractCharges: number;
  acquiredSalaryCredits: number;
  annualBudget: number;
  payrollCap: number;
}

export interface EconLongSoakDistribution {
  min: number;
  median: number;
  p90: number;
  max: number;
  spread: number;
}

export interface EconLongSoakContractTerm {
  playerId: string;
  teamId: string;
  origin: ContractOrigin;
  years: number;
  annualSalary: number;
  totalValue: number;
  canonicalYears: number;
  canonicalAnnualSalary: number;
  canonicalTotalValue: number;
}

export interface EconLongSoakContractPartition {
  count: number;
  /** Count divided by the exact deduplicated union count; zero when the union is empty. */
  share: number;
  termHistogram: Record<string, number>;
  termBuckets: Record<ContractTermBucket, number>;
  stats: EconLongSoakDistribution;
}

export interface EconLongSoakContractSummary {
  rows: EconLongSoakContractTerm[];
  origins: Record<ContractOrigin, EconLongSoakContractPartition>;
  union: EconLongSoakContractPartition;
  activeMlbRemainingYearStock: Record<string, number>;
}

export interface EconLongSoakFreeAgencySummary {
  classIds: string[];
  tierIds: Record<FreeAgencyTier, string[]>;
  /** Every QO result, including accepted outcomes that never entered the class. */
  qualifyingOfferResultIds: string[];
  sourceCohorts: {
    carryoverIds: string[];
    qualifyingOfferIds: string[];
    nonTenderIds: string[];
    expirationIds: string[];
    otherIds: string[];
  };
  remainingIds: string[];
  signedIds: string[];
  meaningfulSignedIds: string[];
  marketExhaustedIds: string[];
  dayOneSignings: number;
  finalSignings: number;
  topAav: number;
}

export interface EconLongSoakPayrollSummary {
  total: EconLongSoakDistribution;
  mlb: EconLongSoakDistribution;
  luxuryTax: EconLongSoakDistribution;
}

export interface EconLongSoakContractClockEvidence {
  beforeDigest: string;
  afterDigest: string;
  changedPlayerIds: string[];
  optionOutcomes: EconLongSoakOptionOutcomeEvidence[];
  naturalMlbExpirationVacancies: EconLongSoakNaturalMlbExpirationEvidence[];
}

export interface EconLongSoakOptionBoundaryRow {
  playerId: string;
  years: number;
  playerOption: boolean;
  teamOption: boolean;
}

export interface EconLongSoakOptionOutcomeEvidence {
  playerId: string;
  beforeYears: 1;
  beforePlayerOption: boolean;
  beforeTeamOption: true;
  afterYears: 0 | 1;
  afterTeamOption: false;
  outcome: 'team_option_exercised' | 'team_option_declined';
}

export interface EconLongSoakContractClockBoundaryRow extends EconLongSoakOptionBoundaryRow {
  teamId: string;
  rosterStatus: string;
}

export interface EconLongSoakNaturalMlbExpirationEvidence {
  playerId: string;
  teamId: string;
  beforeYears: 1;
  beforeRosterStatus: 'MLB';
  beforePlayerOption: boolean;
  beforeTeamOption: false;
  afterYears: 0;
  afterTeamId: string;
  afterRosterStatus: 'MLB';
}

export interface EconLongSoakLifecycleReceipt {
  sourceMarker: string;
  applicationCount: number;
  subjectIds: string[];
  sourceDigest: string;
  evidenceDigest: string;
}

export interface EconLongSoakPopulationSummary {
  baseline: number;
  final: number;
  major: number;
  minor: number;
  unassigned: number;
  entrants: number;
  draftEntrants: number;
  ifaEntrants: number;
  exits: number;
  retirements: number;
  rosterInvariantCategories: string[];
}

export interface EconLongSoakDigestSummary {
  state: string;
  rng: string;
  contracts: string;
  payroll: string;
  population: string;
  freeAgency: string;
}

export interface EconLongSoakAnnualRow {
  seasonIndex: number;
  completedSeason: number;
  nextSeason: number;
  freeAgency: EconLongSoakFreeAgencySummary;
  payrollRows: EconLongSoakPayrollRow[];
  payroll: EconLongSoakPayrollSummary;
  contracts: EconLongSoakContractSummary;
  contractClock: EconLongSoakContractClockEvidence;
  population: EconLongSoakPopulationSummary;
  digests: EconLongSoakDigestSummary;
  lifecycleReceipts: Record<EconomyLifecycleLane, EconLongSoakLifecycleReceipt>;
  /** Report-only in a bounded smoke; full 30-season receipts require empty. */
  measurementCandidateViolations: string[];
}

export interface EconLongSoakTrend {
  firstHalf: number;
  secondHalf: number;
  acceleration: number;
  firstHalfMean: number;
  secondHalfMean: number;
  halfMeanDelta: number;
}

export interface EconLongSoakTrends {
  totalPopulationStock: EconLongSoakTrend;
  totalPayrollFlow: EconLongSoakTrend;
  freeAgencyEntryFlow: EconLongSoakTrend;
  freeAgencySigningFlow: EconLongSoakTrend;
  topAavFlow: EconLongSoakTrend;
}

export interface EconLongSoakInheritedCandidateDiagnosticAnnotation {
  seasonIndex: number;
  completedSeason: number;
  violations: string[];
  totalClass: number;
  carryover: number;
  qualifyingOfferAdmissions: number;
  nonTenderAdmissions: number;
  expirationAdmissions: number;
  otherAdmissions: number;
  newAdmissions: number;
  signings: number;
  meaningfulSignings: number;
  topAav: number;
  payrollSpread: number;
  remaining: number;
  exits: number;
  populationBaseline: number;
  populationFinal: number;
  populationMajor: number;
  populationMinor: number;
  populationUnassigned: number;
  populationEntrants: number;
}

export interface EconLongSoakInheritedCandidateDiagnosticTrends {
  totalClass: EconLongSoakTrend;
  carryover: EconLongSoakTrend;
  qualifyingOfferAdmissions: EconLongSoakTrend;
  nonTenderAdmissions: EconLongSoakTrend;
  expirationAdmissions: EconLongSoakTrend;
  otherAdmissions: EconLongSoakTrend;
  newAdmissions: EconLongSoakTrend;
  signings: EconLongSoakTrend;
  meaningfulSignings: EconLongSoakTrend;
  topAav: EconLongSoakTrend;
  payrollSpread: EconLongSoakTrend;
  remaining: EconLongSoakTrend;
  exits: EconLongSoakTrend;
  populationStock: EconLongSoakTrend;
}

export interface EconLongSoakInheritedCandidateDiagnostic {
  marker: typeof ECON_LONG_SOAK_DIAGNOSTIC_MARKER;
  bypassedCandidates: typeof ECON_LONG_SOAK_DIAGNOSTIC_CANDIDATES;
  annotations: EconLongSoakInheritedCandidateDiagnosticAnnotation[];
  trends: EconLongSoakInheritedCandidateDiagnosticTrends;
}

const TIERS: readonly FreeAgencyTier[] = ['elite', 'high', 'moderate', 'low', 'fringe'];
const ORIGINS: readonly ContractOrigin[] = [
  'free_agency',
  'accepted_extension',
  'accepted_qualifying_offer',
  'arbitration',
  'tender_renewal',
  'market_exhausted',
];
const CONTRACT_TERM_BUCKETS: readonly ContractTermBucket[] = ['1', '2-3', '4-5', '6-8', '9-10'];

export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
}

export function sha256(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex');
}

export function deriveOptionOutcomeEvidence(
  beforeRows: readonly EconLongSoakOptionBoundaryRow[],
  afterRows: readonly EconLongSoakOptionBoundaryRow[],
): EconLongSoakOptionOutcomeEvidence[] {
  assertUniqueIds(beforeRows.map((row) => row.playerId), 'pre-clock option player IDs');
  assertUniqueIds(afterRows.map((row) => row.playerId), 'post-clock option player IDs');
  const afterById = new Map(afterRows.map((row) => [row.playerId, row] as const));
  return beforeRows
    .filter((before) => before.years === 1 && before.teamOption === true)
    .map((before) => {
      const after = afterById.get(before.playerId);
      if (!after || after.teamOption !== false || (after.years !== 0 && after.years !== 1)) {
        throw new Error(`One-year team option ${before.playerId} lacks a canonical exercised/declined result.`);
      }
      return {
        playerId: before.playerId,
        beforeYears: 1 as const,
        beforePlayerOption: before.playerOption,
        beforeTeamOption: true as const,
        afterYears: after.years as 0 | 1,
        afterTeamOption: false as const,
        outcome: after.years === 1
          ? 'team_option_exercised' as const
          : 'team_option_declined' as const,
      };
    })
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export function deriveNaturalMlbExpirationEvidence(
  beforeRows: readonly EconLongSoakContractClockBoundaryRow[],
  afterRows: readonly EconLongSoakContractClockBoundaryRow[],
): EconLongSoakNaturalMlbExpirationEvidence[] {
  assertUniqueIds(beforeRows.map((row) => row.playerId), 'pre-clock expiration player IDs');
  assertUniqueIds(afterRows.map((row) => row.playerId), 'post-clock expiration player IDs');
  const afterById = new Map(afterRows.map((row) => [row.playerId, row] as const));
  return beforeRows
    .filter((before) => (
      before.years === 1
      && before.teamOption === false
      && before.rosterStatus === 'MLB'
      && before.teamId.length > 0
    ))
    .map((before) => {
      const after = afterById.get(before.playerId);
      if (!after
        || after.years !== 0
        || after.teamId !== before.teamId
        || after.rosterStatus !== 'MLB') {
        throw new Error(`Natural MLB expiration ${before.playerId} lacks an exact clock-boundary vacancy result.`);
      }
      return {
        playerId: before.playerId,
        teamId: before.teamId,
        beforeYears: 1 as const,
        beforeRosterStatus: 'MLB' as const,
        beforePlayerOption: before.playerOption,
        beforeTeamOption: false as const,
        afterYears: 0 as const,
        afterTeamId: after.teamId,
        afterRosterStatus: 'MLB' as const,
      };
    })
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export function assertFiniteNonnegative(value: number, label: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${label} must be finite and nonnegative; received ${value}.`);
  }
}

export function assertEverySeedWithinBand(
  rows: readonly { seed: number; value: number }[],
  band: readonly [number, number],
  label: string,
): void {
  if (rows.length === 0) throw new Error(`${label} has no seed rows.`);
  for (const row of rows) {
    if (!Number.isFinite(row.value) || row.value < band[0] || row.value > band[1]) {
      throw new Error(`${label} seed ${row.seed} value ${row.value} is outside ${band[0]}…${band[1]}.`);
    }
  }
}

export function assertUniqueIds(ids: readonly string[], label: string): void {
  if (ids.some((id) => typeof id !== 'string' || id.length === 0)) {
    throw new Error(`${label} contains an empty player/team ID.`);
  }
  if (new Set(ids).size !== ids.length) {
    throw new Error(`${label} contains a duplicate ID.`);
  }
}

export function assertExactIdUnion(
  expected: readonly string[],
  partitions: readonly (readonly string[])[],
  label: string,
): void {
  assertUniqueIds(expected, `${label} expected`);
  const union: string[] = [];
  const seen = new Set<string>();
  for (const partition of partitions) {
    assertUniqueIds(partition, `${label} partition`);
    for (const id of partition) {
      if (seen.has(id)) throw new Error(`${label} partitions overlap at ${id}.`);
      seen.add(id);
      union.push(id);
    }
  }
  const expectedSet = new Set(expected);
  const missing = expected.filter((id) => !seen.has(id));
  const unexpected = union.filter((id) => !expectedSet.has(id));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(`${label} union mismatch: missing [${missing.join(',')}], unexpected [${unexpected.join(',')}].`);
  }
}

export function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index]!;
}

export function distribution(values: readonly number[]): EconLongSoakDistribution {
  if (values.length === 0) return { min: 0, median: 0, p90: 0, max: 0, spread: 0 };
  for (const [index, value] of values.entries()) assertFiniteNonnegative(value, `distribution[${index}]`);
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min,
    median: percentile(values, 0.5),
    p90: percentile(values, 0.9),
    max,
    spread: max - min,
  };
}

export function olsSlope(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const xMean = (values.length + 1) / 2;
  const yMean = values.reduce((sum, value) => sum + value, 0) / values.length;
  let numerator = 0;
  let denominator = 0;
  for (let index = 0; index < values.length; index += 1) {
    const x = index + 1;
    numerator += (x - xMean) * (values[index]! - yMean);
    denominator += (x - xMean) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

export function flowTrend(values: readonly number[]): EconLongSoakTrend {
  if (values.length !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Flow trend requires ${ECON_LONG_SOAK_HORIZON} annual values.`);
  }
  const first = values.slice(0, 15);
  const second = values.slice(15, 30);
  const firstHalf = olsSlope(first);
  const secondHalf = olsSlope(second);
  const firstHalfMean = mean(first);
  const secondHalfMean = mean(second);
  return {
    firstHalf,
    secondHalf,
    acceleration: secondHalf - firstHalf,
    firstHalfMean,
    secondHalfMean,
    halfMeanDelta: secondHalfMean - firstHalfMean,
  };
}

export function stockTrend(values: readonly number[]): EconLongSoakTrend {
  if (values.length !== ECON_LONG_SOAK_HORIZON + 1) {
    throw new Error(`Stock trend requires baseline plus ${ECON_LONG_SOAK_HORIZON} annual values.`);
  }
  const firstHalf = (values[15]! - values[0]!) / 15;
  const secondHalf = (values[30]! - values[15]!) / 15;
  const firstHalfMean = mean(values.slice(1, 16));
  const secondHalfMean = mean(values.slice(16, 31));
  return {
    firstHalf,
    secondHalf,
    acceleration: secondHalf - firstHalf,
    firstHalfMean,
    secondHalfMean,
    halfMeanDelta: secondHalfMean - firstHalfMean,
  };
}

export function buildLongSoakTrends(
  baselinePopulation: number,
  rows: readonly EconLongSoakAnnualRow[],
): EconLongSoakTrends {
  if (rows.length !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Trend calculation requires exactly ${ECON_LONG_SOAK_HORIZON} rows.`);
  }
  return {
    totalPopulationStock: stockTrend([baselinePopulation, ...rows.map((row) => row.population.final)]),
    totalPayrollFlow: flowTrend(rows.map((row) => row.payrollRows.reduce((sum, payroll) => sum + payroll.totalPayroll, 0))),
    freeAgencyEntryFlow: flowTrend(rows.map((row) => row.freeAgency.classIds.length)),
    freeAgencySigningFlow: flowTrend(rows.map((row) => row.freeAgency.finalSignings)),
    topAavFlow: flowTrend(rows.map((row) => row.freeAgency.topAav)),
  };
}

export function faEntryCandidateViolationMessage(classSize: number): string {
  return `FA entry ${classSize} outside ${ECON_LONG_SOAK_FA_ENTRY_MIN}..${ECON_LONG_SOAK_FA_ENTRY_MAX}`;
}

export function buildMeasurementCandidateViolations(row: EconLongSoakAnnualRow): string[] {
  const violations: string[] = [];
  const check = (condition: boolean, message: string) => {
    if (!condition) violations.push(message);
  };
  const classSize = row.freeAgency.classIds.length;
  check(classSize >= ECON_LONG_SOAK_FA_ENTRY_MIN && classSize <= ECON_LONG_SOAK_FA_ENTRY_MAX,
    faEntryCandidateViolationMessage(classSize));
  check(row.freeAgency.finalSignings >= 21 && row.freeAgency.finalSignings <= 58,
    `signings ${row.freeAgency.finalSignings} outside 21..58`);
  check(row.freeAgency.meaningfulSignedIds.length >= 21 && row.freeAgency.meaningfulSignedIds.length <= 57,
    `meaningful signings ${row.freeAgency.meaningfulSignedIds.length} outside 21..57`);
  check(row.freeAgency.topAav >= 20 && row.freeAgency.topAav <= 45,
    `top AAV ${row.freeAgency.topAav} outside 20..45`);
  check(row.payroll.total.spread >= 25 && row.payroll.total.spread <= 350,
    `payroll spread ${row.payroll.total.spread} outside 25..350`);
  return violations;
}

export function isDiagnosticInheritedCandidateViolation(
  row: EconLongSoakAnnualRow,
  violation: string,
): boolean {
  return buildMeasurementCandidateViolations(row).includes(violation);
}

export function buildInheritedCandidateDiagnostic(
  baselinePopulation: number,
  rows: readonly EconLongSoakAnnualRow[],
): EconLongSoakInheritedCandidateDiagnostic {
  if (rows.length !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Inherited-candidate diagnostic requires exactly ${ECON_LONG_SOAK_HORIZON} annual rows.`);
  }
  const cohorts = rows.map((row) => {
    const source = row.freeAgency.sourceCohorts;
    const newAdmissions = source.qualifyingOfferIds.length
      + source.nonTenderIds.length
      + source.expirationIds.length
      + source.otherIds.length;
    return {
      violations: buildMeasurementCandidateViolations(row),
      totalClass: row.freeAgency.classIds.length,
      carryover: source.carryoverIds.length,
      qualifyingOfferAdmissions: source.qualifyingOfferIds.length,
      nonTenderAdmissions: source.nonTenderIds.length,
      expirationAdmissions: source.expirationIds.length,
      otherAdmissions: source.otherIds.length,
      newAdmissions,
      signings: row.freeAgency.finalSignings,
      meaningfulSignings: row.freeAgency.meaningfulSignedIds.length,
      topAav: row.freeAgency.topAav,
      payrollSpread: row.payroll.total.spread,
      remaining: row.freeAgency.remainingIds.length,
      exits: row.population.exits,
      populationBaseline: row.population.baseline,
      populationFinal: row.population.final,
      populationMajor: row.population.major,
      populationMinor: row.population.minor,
      populationUnassigned: row.population.unassigned,
      populationEntrants: row.population.entrants,
    };
  });
  return {
    marker: ECON_LONG_SOAK_DIAGNOSTIC_MARKER,
    bypassedCandidates: ECON_LONG_SOAK_DIAGNOSTIC_CANDIDATES,
    annotations: cohorts.map((cohort, index) => ({
      seasonIndex: rows[index]!.seasonIndex,
      completedSeason: rows[index]!.completedSeason,
      ...cohort,
    })),
    trends: {
      totalClass: flowTrend(cohorts.map((row) => row.totalClass)),
      carryover: flowTrend(cohorts.map((row) => row.carryover)),
      qualifyingOfferAdmissions: flowTrend(cohorts.map((row) => row.qualifyingOfferAdmissions)),
      nonTenderAdmissions: flowTrend(cohorts.map((row) => row.nonTenderAdmissions)),
      expirationAdmissions: flowTrend(cohorts.map((row) => row.expirationAdmissions)),
      otherAdmissions: flowTrend(cohorts.map((row) => row.otherAdmissions)),
      newAdmissions: flowTrend(cohorts.map((row) => row.newAdmissions)),
      signings: flowTrend(cohorts.map((row) => row.signings)),
      meaningfulSignings: flowTrend(cohorts.map((row) => row.meaningfulSignings)),
      topAav: flowTrend(cohorts.map((row) => row.topAav)),
      payrollSpread: flowTrend(cohorts.map((row) => row.payrollSpread)),
      remaining: flowTrend(cohorts.map((row) => row.remaining)),
      exits: flowTrend(cohorts.map((row) => row.exits)),
      populationStock: stockTrend([baselinePopulation, ...cohorts.map((row) => row.populationFinal)]),
    },
  };
}

export function assertFreeAgencySummary(summary: EconLongSoakFreeAgencySummary): void {
  for (const key of ['classIds', 'qualifyingOfferResultIds', 'remainingIds', 'signedIds', 'meaningfulSignedIds', 'marketExhaustedIds'] as const) {
    assertUniqueIds(summary[key], `freeAgency.${key}`);
  }
  for (const [name, ids] of Object.entries(summary.sourceCohorts)) {
    assertUniqueIds(ids, `freeAgency.sourceCohorts.${name}`);
  }
  assertExactIdUnion(summary.classIds, TIERS.map((tier) => summary.tierIds[tier]), 'free-agency tier');
  assertExactIdUnion(summary.classIds, [
    summary.sourceCohorts.carryoverIds,
    summary.sourceCohorts.qualifyingOfferIds,
    summary.sourceCohorts.nonTenderIds,
    summary.sourceCohorts.expirationIds,
    summary.sourceCohorts.otherIds,
  ], 'free-agency source cohort');
  const qualifyingOfferResults = new Set(summary.qualifyingOfferResultIds);
  if (summary.sourceCohorts.qualifyingOfferIds.some((id) => !qualifyingOfferResults.has(id))) {
    throw new Error('Free-agency QO cohort is not backed by an exact QO phase result.');
  }
  assertExactIdUnion(summary.classIds, [summary.remainingIds, summary.signedIds], 'free-agency outcome');
  const signed = new Set(summary.signedIds);
  if (summary.meaningfulSignedIds.some((id) => !signed.has(id))) {
    throw new Error('Meaningful signings are not a subset of signed players.');
  }
  if (summary.marketExhaustedIds.some((id) => !signed.has(id))) {
    throw new Error('Market-exhausted signings are not a subset of signed players.');
  }
  if (summary.dayOneSignings < 0 || summary.dayOneSignings > summary.finalSignings) {
    throw new Error('Day-one signing count is inconsistent with final signings.');
  }
  if (summary.finalSignings !== summary.signedIds.length) {
    throw new Error('Final signing count does not equal exact signed-player membership.');
  }
  assertFiniteNonnegative(summary.topAav, 'freeAgency.topAav');
}

function assertDistributionEqual(actual: EconLongSoakDistribution, expected: EconLongSoakDistribution, label: string): void {
  if (stableJson(actual) !== stableJson(expected)) throw new Error(`${label} distribution does not match canonical rows.`);
}

export function assertPayrollRows(rows: readonly EconLongSoakPayrollRow[]): void {
  if (rows.length !== 32) throw new Error(`Expected 32 canonical payroll rows; received ${rows.length}.`);
  assertUniqueIds(rows.map((row) => row.teamId), 'payroll team IDs');
  const expectedTeamIds = TEAMS.map((team) => team.id).sort();
  const actualTeamIds = rows.map((row) => row.teamId).sort();
  if (stableJson(actualTeamIds) !== stableJson(expectedTeamIds)) {
    throw new Error('Payroll rows do not contain the exact canonical 32-team ID set.');
  }
  const fields: readonly (keyof Omit<EconLongSoakPayrollRow, 'teamId'>)[] = [
    'mlbPayroll', 'minorsPayroll', 'totalPayroll', 'luxuryTaxPayroll', 'deadMoney',
    'retainedSalaryCharges', 'cashConsiderationCharges', 'releasedContractCharges',
    'acquiredSalaryCredits', 'annualBudget', 'payrollCap',
  ];
  for (const row of rows) {
    for (const field of fields) assertFiniteNonnegative(row[field], `payroll.${row.teamId}.${field}`);
    const expectedTotal = Math.round((row.mlbPayroll + row.minorsPayroll + row.deadMoney) * 100) / 100;
    const expectedLuxury = Math.round((row.mlbPayroll + row.deadMoney) * 100) / 100;
    const expectedDead = Math.round((row.retainedSalaryCharges + row.cashConsiderationCharges + row.releasedContractCharges) * 100) / 100;
    if (row.totalPayroll !== expectedTotal || row.luxuryTaxPayroll !== expectedLuxury || row.deadMoney !== expectedDead) {
      throw new Error(`Canonical payroll arithmetic failed for ${row.teamId}.`);
    }
  }
  const charges = Math.round(rows.reduce((sum, row) => sum + row.retainedSalaryCharges + row.cashConsiderationCharges, 0) * 100) / 100;
  const credits = Math.round(rows.reduce((sum, row) => sum + row.acquiredSalaryCredits, 0) * 100) / 100;
  if (charges !== credits) {
    throw new Error(`Retention/cash conservation failed: charges ${charges}, credits ${credits}.`);
  }
}

export function buildTradeFinanceAuditProjection(rows: readonly EconLongSoakPayrollRow[]) {
  const canonicalPayroll = [...rows].sort((left, right) => left.teamId.localeCompare(right.teamId));
  return {
    canonicalPayroll,
    retentionController: canonicalPayroll.map((row) => ({
      teamId: row.teamId,
      retainedSalaryCharges: row.retainedSalaryCharges,
      cashConsiderationCharges: row.cashConsiderationCharges,
      releasedContractCharges: row.releasedContractCharges,
      acquiredSalaryCredits: row.acquiredSalaryCredits,
    })),
  };
}

export function summarizePayroll(rows: readonly EconLongSoakPayrollRow[]): EconLongSoakPayrollSummary {
  return {
    total: distribution(rows.map((row) => row.totalPayroll)),
    mlb: distribution(rows.map((row) => row.mlbPayroll)),
    luxuryTax: distribution(rows.map((row) => row.luxuryTaxPayroll)),
  };
}

export function assertPayrollSummary(
  summary: EconLongSoakPayrollSummary,
  rows: readonly EconLongSoakPayrollRow[],
): void {
  const expected = summarizePayroll(rows);
  assertDistributionEqual(summary.total, expected.total, 'Total payroll');
  assertDistributionEqual(summary.mlb, expected.mlb, 'MLB payroll');
  assertDistributionEqual(summary.luxuryTax, expected.luxuryTax, 'Luxury-tax payroll');
}

function emptyTermHistogram(): Record<string, number> {
  return Object.fromEntries(Array.from({ length: 10 }, (_, index) => [String(index + 1), 0]));
}

function emptyTermBuckets(): Record<ContractTermBucket, number> {
  return { '1': 0, '2-3': 0, '4-5': 0, '6-8': 0, '9-10': 0 };
}

function termBucket(years: number): ContractTermBucket {
  if (years === 1) return '1';
  if (years <= 3) return '2-3';
  if (years <= 5) return '4-5';
  if (years <= 8) return '6-8';
  return '9-10';
}

function contractPartition(
  rows: readonly EconLongSoakContractTerm[],
  unionCount: number,
): EconLongSoakContractPartition {
  const termHistogram = emptyTermHistogram();
  const termBuckets = emptyTermBuckets();
  for (const row of rows) {
    termHistogram[String(row.years)] = (termHistogram[String(row.years)] ?? 0) + 1;
    termBuckets[termBucket(row.years)] += 1;
  }
  return {
    count: rows.length,
    share: unionCount === 0 ? 0 : Math.round((rows.length / unionCount) * 1_000_000) / 1_000_000,
    termHistogram,
    termBuckets,
    stats: distribution(rows.map((row) => row.years)),
  };
}

export function summarizeContractTerms(
  rows: readonly EconLongSoakContractTerm[],
  activeMlbRemainingYears: readonly number[],
): EconLongSoakContractSummary {
  const stock: Record<string, number> = Object.fromEntries(
    Array.from({ length: 10 }, (_, index) => [String(index + 1), 0]),
  );
  for (const years of activeMlbRemainingYears) stock[String(years)] = (stock[String(years)] ?? 0) + 1;
  const origins = Object.fromEntries(ORIGINS.map((origin) => [
    origin,
    contractPartition(rows.filter((row) => row.origin === origin), rows.length),
  ])) as Record<ContractOrigin, EconLongSoakContractPartition>;
  return {
    rows: [...rows],
    origins,
    union: contractPartition(rows, rows.length),
    activeMlbRemainingYearStock: stock,
  };
}

export function assertContractSummary(summary: EconLongSoakContractSummary): void {
  assertUniqueIds(summary.rows.map((row) => row.playerId), 'new-contract player origins');
  for (const row of summary.rows) {
    if (!ORIGINS.includes(row.origin)) throw new Error(`Unknown contract origin ${row.origin}.`);
    if (!Number.isInteger(row.years) || row.years < 1 || row.years > 10) {
      throw new Error(`Contract ${row.playerId} has invalid ${row.years}-year term.`);
    }
    if (row.origin === 'free_agency' && row.years > 8) {
      throw new Error(`Ordinary free-agent contract ${row.playerId} exceeds eight years.`);
    }
    if (row.origin === 'market_exhausted' && row.years !== 1) {
      throw new Error(`Market-exhausted contract ${row.playerId} must be exactly one year.`);
    }
    for (const [field, value] of Object.entries(row).filter(([key]) => key.includes('Salary') || key.includes('Value'))) {
      assertFiniteNonnegative(value as number, `contract.${row.playerId}.${field}`);
    }
    if (row.years !== row.canonicalYears
      || row.annualSalary !== row.canonicalAnnualSalary
      || row.totalValue !== row.canonicalTotalValue) {
      throw new Error(
        `Contract ${row.playerId} (${row.origin}) does not match the canonical player contract: `
        + `${row.years}/${row.annualSalary}/${row.totalValue} vs `
        + `${row.canonicalYears}/${row.canonicalAnnualSalary}/${row.canonicalTotalValue}.`,
      );
    }
  }
  const expected = summarizeContractTerms(summary.rows, []);
  if (stableJson(summary.origins) !== stableJson(expected.origins)
    || stableJson(summary.union) !== stableJson(expected.union)) {
    throw new Error('New-contract per-origin/union term partitions, buckets, stats, or shares do not reconcile.');
  }
  for (const origin of ORIGINS) {
    if (!summary.origins[origin]) throw new Error(`New-contract origin ${origin} is absent.`);
  }
  for (const bucket of CONTRACT_TERM_BUCKETS) {
    if (!(bucket in summary.union.termBuckets)) throw new Error(`New-contract bucket ${bucket} is absent.`);
  }
  for (const [years, count] of Object.entries(summary.activeMlbRemainingYearStock)) {
    if (!Number.isInteger(Number(years)) || Number(years) < 1 || Number(years) > 10 || !Number.isInteger(count) || count < 0) {
      throw new Error('Active MLB remaining-year stock is malformed.');
    }
  }
}

function assertDigest(value: string, label: string): void {
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error(`${label} digest is malformed.`);
}

function assertLifecycleReceipt(
  lane: EconomyLifecycleLane,
  receipt: EconLongSoakLifecycleReceipt,
  expectedMarker: string,
  expectedSubjectIds: readonly string[],
  expectedSourceEvidence: unknown,
): void {
  if (receipt.applicationCount !== 1) {
    throw new Error(`Lifecycle receipt ${lane} applied ${receipt.applicationCount} times.`);
  }
  if (receipt.sourceMarker !== expectedMarker) throw new Error(`Lifecycle receipt ${lane} has a fake source marker.`);
  assertUniqueIds(receipt.subjectIds, `lifecycleReceipts.${lane}.subjectIds`);
  if (stableJson(receipt.subjectIds) !== stableJson([...expectedSubjectIds].sort())) {
    throw new Error(`Lifecycle receipt ${lane} subject IDs do not match source evidence.`);
  }
  const expectedSourceDigest = sha256(expectedSourceEvidence);
  if (receipt.sourceDigest !== expectedSourceDigest) {
    throw new Error(`Lifecycle receipt ${lane} does not bind its exact source evidence.`);
  }
  const expectedDigest = sha256({
    applicationCount: receipt.applicationCount,
    sourceMarker: receipt.sourceMarker,
    sourceDigest: receipt.sourceDigest,
    subjectIds: receipt.subjectIds,
  });
  if (receipt.evidenceDigest !== expectedDigest) throw new Error(`Lifecycle receipt ${lane} evidence digest is stale or fabricated.`);
}

export interface AnnualRowValidationOptions {
  expectedSeasonIndex: number;
  baselineRosterInvariantCategories?: readonly string[];
  enforceInheritedCandidates?: boolean;
  allowDiagnosticInheritedCandidateViolations?: boolean;
  baselinePopulation?: number;
}

export function assertAnnualRow(
  row: EconLongSoakAnnualRow,
  options: AnnualRowValidationOptions,
): void {
  if (row.seasonIndex !== options.expectedSeasonIndex
    || row.nextSeason !== row.completedSeason + 1) {
    throw new Error(`Annual row ${row.seasonIndex} is gapped or misnumbered.`);
  }
  assertFreeAgencySummary(row.freeAgency);
  assertPayrollRows(row.payrollRows);
  assertPayrollSummary(row.payroll, row.payrollRows);
  assertContractSummary(row.contracts);
  assertDigest(row.contractClock.beforeDigest, 'contractClock.before');
  assertDigest(row.contractClock.afterDigest, 'contractClock.after');
  if (row.contractClock.beforeDigest === row.contractClock.afterDigest) {
    throw new Error('Contract-clock before/after evidence did not change.');
  }
  assertUniqueIds(row.contractClock.changedPlayerIds, 'contractClock.changedPlayerIds');
  assertUniqueIds(row.contractClock.optionOutcomes.map((entry) => entry.playerId), 'contractClock.optionOutcomes');
  const changedPlayers = new Set(row.contractClock.changedPlayerIds);
  if (row.contractClock.optionOutcomes.some((entry) => !changedPlayers.has(entry.playerId))) {
    throw new Error('Contract option evidence is not a subset of clock-changed players.');
  }
  for (const entry of row.contractClock.optionOutcomes) {
    const exactOutcome = entry.beforeYears === 1
      && entry.beforeTeamOption === true
      && entry.afterTeamOption === false
      && ((entry.outcome === 'team_option_exercised' && entry.afterYears === 1)
        || (entry.outcome === 'team_option_declined' && entry.afterYears === 0));
    if (!exactOutcome) throw new Error(`Option evidence ${entry.playerId} is not an exact one-year team-option outcome.`);
  }
  const naturalExpirations = row.contractClock.naturalMlbExpirationVacancies;
  assertUniqueIds(naturalExpirations.map((entry) => entry.playerId), 'contractClock.naturalMlbExpirationVacancies');
  const canonicalTeamIds = new Set(TEAMS.map((team) => team.id));
  for (const entry of naturalExpirations) {
    const exactExpiration = changedPlayers.has(entry.playerId)
      && canonicalTeamIds.has(entry.teamId)
      && entry.beforeYears === 1
      && entry.beforeRosterStatus === 'MLB'
      && entry.beforeTeamOption === false
      && entry.afterYears === 0
      && entry.afterTeamId === entry.teamId
      && entry.afterRosterStatus === 'MLB';
    if (!exactExpiration) {
      throw new Error(`Natural MLB expiration ${entry.playerId} is not exact clock-boundary vacancy evidence.`);
    }
  }
  const population = row.population;
  for (const field of ['baseline', 'final', 'major', 'minor', 'unassigned', 'entrants', 'draftEntrants', 'ifaEntrants', 'exits', 'retirements'] as const) {
    assertFiniteNonnegative(population[field], `population.${field}`);
  }
  if (population.final !== population.major + population.minor + population.unassigned) {
    throw new Error('Population category partition failed.');
  }
  if (population.entrants !== population.draftEntrants + population.ifaEntrants
    || population.final - population.baseline !== population.entrants - population.exits) {
    throw new Error('Population entrant/exit conservation failed.');
  }
  if (population.draftEntrants !== 640 || population.ifaEntrants < 0 || population.ifaEntrants > 16) {
    throw new Error('Draft/IFA entrant bounds failed.');
  }
  if (population.retirements > population.exits) throw new Error('Retirements exceed total exits.');
  if (options.baselineRosterInvariantCategories) {
    const baseline = new Set(options.baselineRosterInvariantCategories);
    const added = population.rosterInvariantCategories.filter((category) => !baseline.has(category));
    const disallowed = added.filter((category) => !(
      category === 'roster:active_roster_under_limit' && naturalExpirations.length > 0
    ));
    if (disallowed.length > 0) throw new Error(`New roster invariant category: ${disallowed.join(',')}.`);
  }
  const seasonMarker = `s${row.completedSeason}`;
  assertLifecycleReceipt('contractClock', row.lifecycleReceipts.contractClock,
    `contract_clock_service_reconciled_${seasonMarker}`, row.contractClock.changedPlayerIds, row.contractClock);
  const optionPlayerIds = row.contractClock.optionOutcomes.map((entry) => entry.playerId);
  assertLifecycleReceipt('options', row.lifecycleReceipts.options,
    `contract_options_resolved_${seasonMarker}`, optionPlayerIds, row.contractClock.optionOutcomes);
  assertLifecycleReceipt('qualifyingOffers', row.lifecycleReceipts.qualifyingOffers,
    `qualifying_offer_phase_results_${seasonMarker}`, row.freeAgency.qualifyingOfferResultIds,
    row.freeAgency.qualifyingOfferResultIds);
  assertLifecycleReceipt('freeAgency', row.lifecycleReceipts.freeAgency,
    `free_agency_entry_class_${seasonMarker}`, row.freeAgency.classIds, row.freeAgency);
  const teamIds = row.payrollRows.map((payroll) => payroll.teamId).sort();
  assertLifecycleReceipt('marketRevenue', row.lifecycleReceipts.marketRevenue,
    `market_revenue_budget_reconciled_${seasonMarker}`, teamIds, teamIds);
  assertLifecycleReceipt('tradeFinance', row.lifecycleReceipts.tradeFinance,
    `trade_finance_payroll_audit_${seasonMarker}`, teamIds, buildTradeFinanceAuditProjection(row.payrollRows));
  if (row.measurementCandidateViolations.some((entry) => !entry)) {
    throw new Error('Measurement candidate diagnostics contain an empty entry.');
  }
  for (const [name, digest] of Object.entries(row.digests)) assertDigest(digest, name);
  const recomputedSubdomains = {
    contracts: sha256(row.contracts),
    payroll: sha256(row.payrollRows),
    population: sha256(row.population),
    freeAgency: sha256(row.freeAgency),
  };
  for (const [name, digest] of Object.entries(recomputedSubdomains)) {
    if (row.digests[name as keyof typeof recomputedSubdomains] !== digest) {
      throw new Error(`Digest ${name} does not match its exact serialized subdomain.`);
    }
  }
  if (options.enforceInheritedCandidates !== false) {
    const expectedViolations = buildMeasurementCandidateViolations(row);
    if (stableJson(row.measurementCandidateViolations) !== stableJson(expectedViolations)) {
      throw new Error('Measurement candidate diagnostics do not match the canonical row facts.');
    }
    const disallowed = expectedViolations.filter((violation) => !(
      options.allowDiagnosticInheritedCandidateViolations === true
      && isDiagnosticInheritedCandidateViolation(row, violation)
    ));
    if (disallowed.length > 0) {
      throw new Error(`Inherited measurement candidates failed: ${disallowed.join('; ')}`);
    }
  }
}

export function assertAnnualRowSequence(
  rows: readonly EconLongSoakAnnualRow[],
  horizon: number,
  options: Omit<AnnualRowValidationOptions, 'expectedSeasonIndex'> = {},
): void {
  if (rows.length !== horizon) throw new Error(`Expected ${horizon} annual rows; received ${rows.length}.`);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index]!;
    assertAnnualRow(row, { ...options, expectedSeasonIndex: index + 1 });
    const carryoverIds = row.freeAgency.sourceCohorts.carryoverIds;
    if (index === 0) {
      if (options.baselinePopulation != null && row.population.baseline !== options.baselinePopulation) {
        throw new Error('Receipt baseline population does not match the first annual row.');
      }
      if (carryoverIds.length !== 0) throw new Error('First annual row cannot claim a preceding-season FA carryover.');
      continue;
    }
    const previous = rows[index - 1]!;
    if (row.completedSeason !== previous.nextSeason) {
      throw new Error('Completed/next seasons are not consecutive across annual rows.');
    }
    if (row.population.baseline !== previous.population.final) {
      throw new Error('Annual population does not continue from the preceding final population.');
    }
    const currentClassIds = new Set(row.freeAgency.classIds);
    const expectedCarryoverIds = previous.freeAgency.remainingIds
      .filter((playerId) => currentClassIds.has(playerId))
      .sort();
    if (stableJson([...carryoverIds].sort()) !== stableJson(expectedCarryoverIds)) {
      throw new Error('Free-agency carryover does not equal the exact surviving intersection with the preceding remaining class.');
    }
  }
}
