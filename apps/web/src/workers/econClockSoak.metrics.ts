/**
 * Goal 11's permanent, current-schema economy-soak measurements. Kept pure so
 * the ordinary test suite can exercise every formula and frozen band without
 * running the expensive real-worker matrix.
 */

export const ECON_CLOCK_SOAK_SEEDS = [7111, 7112, 7113] as const;
export const ECON_CLOCK_SOAK_ROLLOVERS = 6;

export interface EconomyPopulation {
  total: number;
  minor: number;
  major: number;
  unassigned: number;
  bytes: number;
}

export interface EconomyRolloverSample extends EconomyPopulation {
  rollover: number;
  entrants: number;
  exits: number;
  draftEntrants: number;
  ifaEntrants: number;
  marketAtEntry: number;
  marketAfterPhase: number;
}

export interface EconomySlope {
  first: number;
  second: number;
  curvature: number;
}

export type EconomyPopulationCategory = 'major' | 'minor' | 'unassigned' | 'absent';

export type EconomyTransitionMatrix = Record<
  EconomyPopulationCategory,
  Record<EconomyPopulationCategory, number>
>;

export interface EconomyTransitionSummary {
  transitions: EconomyTransitionMatrix;
  gross: Record<EconomyPopulationCategory, number>;
}

export interface PopulationBandOptions {
  /** Measurement mode skips only dead-clock-derived assignment partitions. */
  skipAssignmentPartitionBands?: boolean;
  /** Measurement mode may calibrate only the unsupported entry-union ceiling. */
  skipMarketEntryUpperBand?: boolean;
  /** Measurement mode may calibrate only the unsupported post-phase ceiling. */
  skipMarketAfterPhaseUpperBand?: boolean;
}

export type EconomyMarketPrimaryCohort =
  | 'unsigned_carryover'
  | 'qo_rejected_or_expired'
  | 'current_non_tender'
  | 'new_clock_expiry'
  | 'existing_zero_assigned'
  | 'existing_zero_unassigned_other'
  | 'other_accepted'
  | 'unattributed';

export interface EconomyMarketCohortRow {
  playerId: string;
  primaryCohort: EconomyMarketPrimaryCohort;
  priorLevel: 'MLB' | 'minor' | 'unassigned';
  priorYears: number;
  clockReason: 'ordinary' | 'option_decline' | 'none';
  qoStatus: 'rejected' | 'expired' | 'none';
  priorMarketRollover: number | null;
  consecutiveEntryCount: number;
  wasPriorSigned: boolean;
}

export interface EconomyAssignmentEvidence {
  playerId: string;
  beforeTeamId: string;
  afterTeamId: string;
  beforeLevel: string;
  afterLevel: string;
  rule5Selection?: { originalTeamId: string; draftingTeamId: string };
  rule5Obligation?: { originalTeamId: string; draftingTeamId: string };
  autoPromotion?: { teamId: string; fromLevel: string; toLevel: string; timestamp: string };
}

export interface EconomyRule5ProvenanceEvidence {
  playerId: string;
  originalTeamId: string;
  currentSeason: number;
  rolloverStartTeamId?: string;
  draftResults: Array<{ playerId: string; teamId: string }>;
  ifaResults: Array<{ playerId: string; teamId: string }>;
  candidateRows: Array<{
    playerId: string;
    teamId: string;
    rosterStatus: string;
    rule5EligibleAfterSeason: number;
  }>;
}

export type EconomyRosterCause =
  | 'goal11_expiry_release'
  | 'goal11_fa_signing'
  | 'goal11_qo'
  | 'non_tender'
  | 'rule5_in'
  | 'rule5_out'
  | 'auto_promotion'
  | 'final_normalization_demotion'
  | 'draft_entry'
  | 'ifa_entry'
  | 'retirement'
  | 'unexplained';

export interface EconomyTeamRosterCheckpoint {
  checkpoint: string;
  mlbIds: string[];
  fortyManIds: string[];
}

export interface EconomyRosterCausalRow {
  playerId: string;
  teamId: string;
  direction: 'in' | 'out';
  cause: EconomyRosterCause;
  evidenceId: string;
  fromCheckpoint: string;
  toCheckpoint: string;
}

export interface EconomyRosterAuditResult {
  finalMlbCount: number;
  withoutGoal11Count: number;
  overLimitClassification: 'none' | 'adjacent';
}

export const ECON_CLOCK_BANDS = {
  initial: { total: [5408, 5408], minor: [4512, 4512], major: [896, 896], unassigned: [0, 0] },
  annual: {
    totalGrowth: [527, 639],
    minorAbsolute: [4199, 5675],
    majorAbsolute: [134, 896],
    unassignedAbsolute: [58, 3831],
    entrants: [640, 656],
    exits: [6, 120],
    marketAtEntry: [1, 1089],
    marketAfterPhase: [0, 1047],
  },
  slope: {
    total: { first: [578, 615], second: [545, 578], curvature: [-55, -16] },
    minor: { first: [38, 80], second: [213, 268], curvature: [150, 214] },
    major: { first: [-192, -142], second: [-64, -11], curvature: [96, 162] },
    unassigned: { first: [685, 730], second: [337, 380], curvature: [-374, -323] },
    bytes: { first: [5_923_127, 6_191_304], second: [5_144_121, 5_456_289], curvature: [-925_784, -595_601] },
  },
} as const;

export function classifyEconomyPopulation(
  players: readonly { teamId: string; rosterStatus: string }[],
  bytes: number,
): EconomyPopulation {
  let major = 0;
  let minor = 0;
  let unassigned = 0;
  for (const player of players) {
    if (!player.teamId) unassigned += 1;
    else if (player.rosterStatus === 'MLB') major += 1;
    else minor += 1;
  }
  return { total: players.length, major, minor, unassigned, bytes };
}

export function economySlope(values: readonly number[]): EconomySlope {
  if (values.length !== ECON_CLOCK_SOAK_ROLLOVERS + 1) {
    throw new Error(`Expected baseline plus ${ECON_CLOCK_SOAK_ROLLOVERS} rollovers.`);
  }
  const first = (values[3]! - values[0]!) / 3;
  const second = (values[6]! - values[3]!) / 3;
  return { first, second, curvature: second - first };
}

export function mean(values: readonly number[]): number {
  if (values.length === 0) throw new Error('Cannot average an empty collection.');
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function inBand(value: number, [min, max]: readonly [number, number]): boolean {
  return value >= min && value <= max;
}

export function assertEconomyBand(value: number, band: readonly [number, number], label: string): void {
  if (!inBand(value, band)) {
    throw new Error(`${label}: ${value} outside frozen band ${band[0]}…${band[1]}`);
  }
}

export function assertPopulationSample(
  sample: EconomyRolloverSample,
  baseline: EconomyPopulation,
  options: PopulationBandOptions = {},
): void {
  const rollover = sample.rollover;
  assertEconomyBand(sample.total, [
    baseline.total + ECON_CLOCK_BANDS.annual.totalGrowth[0] * rollover,
    baseline.total + ECON_CLOCK_BANDS.annual.totalGrowth[1] * rollover,
  ], `total after rollover ${rollover}`);
  if (!options.skipAssignmentPartitionBands) {
    assertEconomyBand(sample.minor, ECON_CLOCK_BANDS.annual.minorAbsolute, `minor after rollover ${rollover}`);
    assertEconomyBand(sample.major, ECON_CLOCK_BANDS.annual.majorAbsolute, `major after rollover ${rollover}`);
    assertEconomyBand(sample.unassigned, ECON_CLOCK_BANDS.annual.unassignedAbsolute, `unassigned after rollover ${rollover}`);
  }
  assertEconomyBand(sample.entrants, ECON_CLOCK_BANDS.annual.entrants, `entrants in rollover ${rollover}`);
  assertEconomyBand(sample.exits, ECON_CLOCK_BANDS.annual.exits, `exits in rollover ${rollover}`);
  assertEconomyBand(sample.ifaEntrants, [0, 16], `IFA entrants in rollover ${rollover}`);
  assertEconomyBand(sample.marketAtEntry, [1, Number.POSITIVE_INFINITY], `market at entry ${rollover}`);
  if (!options.skipMarketEntryUpperBand) {
    assertEconomyBand(sample.marketAtEntry, ECON_CLOCK_BANDS.annual.marketAtEntry, `market at entry ${rollover}`);
  }
  assertEconomyBand(sample.marketAfterPhase, [0, Number.POSITIVE_INFINITY], `market after phase ${rollover}`);
  if (!options.skipMarketAfterPhaseUpperBand) {
    assertEconomyBand(sample.marketAfterPhase, ECON_CLOCK_BANDS.annual.marketAfterPhase, `market after phase ${rollover}`);
  }
  if (sample.total !== sample.major + sample.minor + sample.unassigned) {
    throw new Error(`Population conservation failed in rollover ${rollover}.`);
  }
  if (sample.entrants !== sample.draftEntrants + sample.ifaEntrants) {
    throw new Error(`Entrant attribution failed in rollover ${rollover}.`);
  }
  if (sample.draftEntrants !== 640) {
    throw new Error(`Draft entrant count was ${sample.draftEntrants}, expected 640.`);
  }
}

export function assertRolloverFlow(previous: EconomyPopulation, sample: EconomyRolloverSample): void {
  const netGrowth = sample.entrants - sample.exits;
  assertEconomyBand(netGrowth, ECON_CLOCK_BANDS.annual.totalGrowth, `net growth in rollover ${sample.rollover}`);
  if (sample.total - previous.total !== netGrowth) {
    throw new Error(`Total/entry/exit conservation failed in rollover ${sample.rollover}.`);
  }
}

export function assertSlopeBands(metric: keyof typeof ECON_CLOCK_BANDS.slope, slope: EconomySlope): void {
  const bands = ECON_CLOCK_BANDS.slope[metric];
  assertEconomyBand(slope.first, bands.first, `${metric} first-half slope`);
  assertEconomyBand(slope.second, bands.second, `${metric} second-half slope`);
  assertEconomyBand(slope.curvature, bands.curvature, `${metric} curvature`);
}

/** Exact once-only guard used by the real-worker soak and hostile unit proof. */
export function assertNoDoubleClock(
  firstClock: readonly { id: string; years: number }[],
  resumedClock: readonly { id: string; years: number }[],
): void {
  const resumedById = new Map(resumedClock.map((player) => [player.id, player.years] as const));
  for (const player of firstClock) {
    if (resumedById.get(player.id) !== player.years) {
      throw new Error(`Double-clock fence failed for ${player.id}.`);
    }
  }
}

/** Exact FA-entry guard: market entries must be released canonical objects. */
export function assertCapturedEntrantsCanonical<T extends { id: string; teamId: string }>(
  captured: readonly T[],
  canonicalById: ReadonlyMap<string, T>,
): void {
  const ids = new Set<string>();
  for (const entrant of captured) {
    if (ids.has(entrant.id)) throw new Error(`Duplicate captured entrant ${entrant.id}.`);
    ids.add(entrant.id);
    const canonical = canonicalById.get(entrant.id);
    if (canonical !== entrant || canonical.teamId !== '') {
      throw new Error(`Captured entrant ${entrant.id} is not a released canonical player.`);
    }
  }
}

/** The authoritative entry class includes both remaining and day-one signed agents. */
export function assertFreeAgencyEntryUnion(
  remainingIds: readonly string[],
  signedIds: readonly string[],
  expectedIds: readonly string[],
): void {
  const remaining = new Set(remainingIds);
  const signed = new Set(signedIds);
  if (remaining.size !== remainingIds.length || signed.size !== signedIds.length) {
    throw new Error('Duplicate free-agency entry membership.');
  }
  if ([...remaining].some((id) => signed.has(id))) {
    throw new Error('Free-agency entry is present in both remaining and signed membership.');
  }
  assertExactIdSet([...remaining, ...signed], expectedIds, 'Free-agency entry union does not equal post-QO eligibility');
}

/** Compare ID sets without depending on ordering or object identity. */
export function assertExactIdSet(
  actual: Iterable<string>,
  expected: Iterable<string>,
  label: string,
): void {
  const actualIds = new Set(actual);
  const expectedIds = new Set(expected);
  const missing = [...expectedIds].filter((id) => !actualIds.has(id));
  const unexpected = [...actualIds].filter((id) => !expectedIds.has(id));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(`${label}: missing [${missing.join(', ')}], unexpected [${unexpected.join(', ')}].`);
  }
}

/** A contract option class must be consumed exactly once into one outcome. */
export function assertOptionPartition(
  eligibleIds: readonly string[],
  exercisedIds: readonly string[],
  declinedIds: readonly string[],
): void {
  const eligible = new Set(eligibleIds);
  const exercised = new Set(exercisedIds);
  const declined = new Set(declinedIds);
  if (eligible.size !== eligibleIds.length || exercised.size !== exercisedIds.length || declined.size !== declinedIds.length) {
    throw new Error('Duplicate option decision detected.');
  }
  for (const playerId of exercised) {
    if (!eligible.has(playerId) || declined.has(playerId)) {
      throw new Error(`Invalid exercised option outcome for ${playerId}.`);
    }
  }
  for (const playerId of declined) {
    if (!eligible.has(playerId) || exercised.has(playerId)) {
      throw new Error(`Invalid declined option outcome for ${playerId}.`);
    }
  }
  assertExactIdSet([...exercised, ...declined], eligible, 'Option outcomes do not partition the eligible set');
}

/** New canonical players must be the unique, disjoint draft/IFA result union. */
export function assertEntrantAttribution(
  newIds: readonly string[],
  draftIds: readonly string[],
  ifaIds: readonly string[],
): void {
  const draft = new Set(draftIds);
  const ifa = new Set(ifaIds);
  if (draft.size !== draftIds.length || ifa.size !== ifaIds.length) {
    throw new Error('Duplicate draft or IFA entrant result.');
  }
  if ([...draft].some((id) => ifa.has(id))) {
    throw new Error('Draft and IFA entrant IDs overlap.');
  }
  assertExactIdSet(newIds, [...draft, ...ifa], 'New canonical IDs lack entry attribution');
}

/** No player may move ownership without an explicitly accepted offseason outcome. */
export function assertAssignmentAttribution(
  changedIds: readonly string[],
  acceptedIds: readonly string[],
): void {
  const accepted = new Set(acceptedIds);
  const unexplained = changedIds.filter((id) => !accepted.has(id));
  if (unexplained.length > 0) {
    throw new Error(`Unexpected assignment changes: ${unexplained.join(', ')}.`);
  }
}

/** New roster/invariant categories are structural regressions, not churn. */
export function assertNoNewInvariantCategory(
  baseline: readonly string[],
  post: readonly string[],
): void {
  const baselineTypes = new Set(baseline);
  const newTypes = [...new Set(post)].filter((type) => !baselineTypes.has(type));
  if (newTypes.length > 0) {
    throw new Error(`New roster invariant category: ${newTypes.join(', ')}.`);
  }
}

const ECONOMY_CATEGORIES: readonly EconomyPopulationCategory[] = [
  'major',
  'minor',
  'unassigned',
  'absent',
];

function emptyTransitionMatrix(): EconomyTransitionMatrix {
  return Object.fromEntries(ECONOMY_CATEGORIES.map((from) => [
    from,
    Object.fromEntries(ECONOMY_CATEGORIES.map((to) => [to, 0])),
  ])) as EconomyTransitionMatrix;
}

/** Build the exact player-ID transition matrix between two preseason checkpoints. */
export function buildEconomyTransitionSummary(
  before: ReadonlyMap<string, EconomyPopulationCategory>,
  after: ReadonlyMap<string, EconomyPopulationCategory>,
): EconomyTransitionSummary {
  const transitions = emptyTransitionMatrix();
  const allIds = new Set([...before.keys(), ...after.keys()]);
  for (const playerId of allIds) {
    const from = before.get(playerId) ?? 'absent';
    const to = after.get(playerId) ?? 'absent';
    transitions[from][to] += 1;
  }

  const gross = Object.fromEntries(ECONOMY_CATEGORIES.map((category) => {
    const incoming = ECONOMY_CATEGORIES
      .filter((from) => from !== category)
      .reduce((sum, from) => sum + transitions[from][category], 0);
    const outgoing = ECONOMY_CATEGORIES
      .filter((to) => to !== category)
      .reduce((sum, to) => sum + transitions[category][to], 0);
    return [category, incoming + outgoing];
  })) as Record<EconomyPopulationCategory, number>;

  return { transitions, gross };
}

/** Every partition delta must equal its exact incoming minus outgoing ID flow. */
export function assertEconomyTransitionEquations(
  before: ReadonlyMap<string, EconomyPopulationCategory>,
  after: ReadonlyMap<string, EconomyPopulationCategory>,
  summary: EconomyTransitionSummary,
): void {
  for (const category of ECONOMY_CATEGORIES) {
    const beforeCount = category === 'absent'
      ? [...after.keys()].filter((id) => !before.has(id)).length
      : [...before.values()].filter((value) => value === category).length;
    const afterCount = category === 'absent'
      ? [...before.keys()].filter((id) => !after.has(id)).length
      : [...after.values()].filter((value) => value === category).length;
    const incoming = ECONOMY_CATEGORIES
      .filter((from) => from !== category)
      .reduce((sum, from) => sum + summary.transitions[from][category], 0);
    const outgoing = ECONOMY_CATEGORIES
      .filter((to) => to !== category)
      .reduce((sum, to) => sum + summary.transitions[category][to], 0);
    if (afterCount - beforeCount !== incoming - outgoing) {
      throw new Error(`${category} transition equation failed.`);
    }
  }
}

/** Exact causal market recurrence; calibration may never disable this check. */
export function assertEconomyMarketCohorts(
  entryIds: readonly string[],
  rows: readonly EconomyMarketCohortRow[],
  priorRemainingIds: ReadonlySet<string>,
  priorEntryCount: number,
): { carryover: number; newAdmissions: number; lost: number } {
  const entry = new Set(entryIds);
  const rowIds = rows.map((row) => row.playerId);
  if (entry.size !== entryIds.length || new Set(rowIds).size !== rowIds.length) {
    throw new Error('Duplicate market cohort membership.');
  }
  assertExactIdSet(rowIds, entry, 'Market cohorts do not equal entry union');
  const unattributed = rows.filter((row) => row.primaryCohort === 'unattributed');
  if (unattributed.length > 0) {
    throw new Error(`Unattributed market IDs: ${unattributed.map((row) => row.playerId).join(', ')}.`);
  }
  const carryoverRows = rows.filter((row) => row.primaryCohort === 'unsigned_carryover');
  for (const row of carryoverRows) {
    if (!priorRemainingIds.has(row.playerId) || row.priorMarketRollover == null) {
      throw new Error(`False market carryover ${row.playerId}.`);
    }
  }
  for (const row of rows) {
    if (row.primaryCohort !== 'unsigned_carryover' && priorRemainingIds.has(row.playerId)) {
      throw new Error(`Prior remaining player ${row.playerId} was double-classified as a new admission.`);
    }
    if (row.wasPriorSigned && row.clockReason === 'none'
      && row.primaryCohort !== 'qo_rejected_or_expired'
      && row.primaryCohort !== 'current_non_tender') {
      throw new Error(`Prior signed player ${row.playerId} recurred without a new accepted expiry.`);
    }
  }
  const carryover = carryoverRows.length;
  const newAdmissions = rows.length - carryover;
  const lost = [...priorRemainingIds].filter((id) => !entry.has(id)).length;
  if (carryover > priorRemainingIds.size) {
    throw new Error('Carryover exceeds prior remaining market.');
  }
  if (rows.length - priorEntryCount > newAdmissions) {
    throw new Error('Market growth exceeds newly admitted IDs.');
  }
  return { carryover, newAdmissions, lost };
}

/** Accept only source-proven Rule 5 ownership or same-team AUTO promotion. */
export function classifyEconomyAssignmentEvidence(
  evidence: EconomyAssignmentEvidence,
): 'rule5' | 'autofill' {
  if (evidence.beforeTeamId !== evidence.afterTeamId) {
    const selection = evidence.rule5Selection;
    const obligation = evidence.rule5Obligation;
    if (!evidence.beforeTeamId || !evidence.afterTeamId
      || !selection || !obligation
      || selection.originalTeamId !== evidence.beforeTeamId
      || selection.draftingTeamId !== evidence.afterTeamId
      || obligation.originalTeamId !== evidence.beforeTeamId
      || obligation.draftingTeamId !== evidence.afterTeamId) {
      throw new Error(`Assignment ${evidence.playerId} lacks exact Rule 5 evidence.`);
    }
    return 'rule5';
  }

  const promotion = evidence.autoPromotion;
  if (!evidence.beforeTeamId
    || evidence.beforeLevel !== 'AAA'
    || evidence.afterLevel !== 'MLB'
    || !promotion
    || promotion.teamId !== evidence.beforeTeamId
    || promotion.fromLevel !== 'AAA'
    || promotion.toLevel !== 'MLB'
    || promotion.timestamp !== 'AUTO') {
    throw new Error(`Level change ${evidence.playerId} lacks exact AUTO promotion evidence.`);
  }
  return 'autofill';
}

/** Prove whether a Rule 5 selection existed at rollover start or entered in the current draft. */
export function classifyEconomyRule5Provenance(
  evidence: EconomyRule5ProvenanceEvidence,
): 'rollover_start' | 'same_rollover_draft' {
  const candidates = evidence.candidateRows.filter((row) => row.playerId === evidence.playerId);
  if (candidates.length !== 1) {
    throw new Error(`Rule 5 ${evidence.playerId} requires exactly one candidate row.`);
  }
  const [candidate] = candidates;
  if (!candidate
    || candidate.teamId !== evidence.originalTeamId
    || candidate.rosterStatus === 'MLB'
    || candidate.rule5EligibleAfterSeason > evidence.currentSeason) {
    throw new Error(`Rule 5 ${evidence.playerId} candidate provenance is invalid.`);
  }

  const draftResults = evidence.draftResults.filter((row) => row.playerId === evidence.playerId);
  const ifaResults = evidence.ifaResults.filter((row) => row.playerId === evidence.playerId);
  if (ifaResults.length > 0) {
    throw new Error(`Rule 5 ${evidence.playerId} cannot use later IFA provenance.`);
  }

  if (evidence.rolloverStartTeamId != null) {
    if (evidence.rolloverStartTeamId !== evidence.originalTeamId || draftResults.length !== 0) {
      throw new Error(`Rule 5 ${evidence.playerId} rollover-start provenance is invalid.`);
    }
    return 'rollover_start';
  }

  if (draftResults.length !== 1 || draftResults[0]?.teamId !== evidence.originalTeamId) {
    throw new Error(`Rule 5 ${evidence.playerId} lacks exact same-rollover draft provenance.`);
  }
  return 'same_rollover_draft';
}

const GOAL11_ROSTER_CAUSES = new Set<EconomyRosterCause>([
  'goal11_expiry_release',
  'goal11_fa_signing',
  'goal11_qo',
  'non_tender',
]);

/** Verify exact checkpoint deltas and reject any Goal-11-caused/worsened over-limit roster. */
export function auditEconomyTeamRoster(args: {
  teamId: string;
  checkpoints: EconomyTeamRosterCheckpoint[];
  rows: EconomyRosterCausalRow[];
  evidenceByCause: Partial<Record<EconomyRosterCause, string[]>>;
  canonicalFinalTeamById: Map<string, string>;
}): EconomyRosterAuditResult {
  if (args.checkpoints.length < 2) throw new Error('Roster audit requires at least two checkpoints.');
  for (const checkpoint of args.checkpoints) {
    if (new Set(checkpoint.mlbIds).size !== checkpoint.mlbIds.length) {
      throw new Error(`${args.teamId} duplicate MLB membership at ${checkpoint.checkpoint}.`);
    }
    if (new Set(checkpoint.fortyManIds).size !== checkpoint.fortyManIds.length) {
      throw new Error(`${args.teamId} duplicate 40-man membership at ${checkpoint.checkpoint}.`);
    }
  }

  const rowKeys = new Set<string>();
  for (const row of args.rows) {
    if (row.teamId !== args.teamId) throw new Error(`Roster row ${row.playerId} has wrong team.`);
    if (row.cause === 'unexplained') {
      throw new Error(`Unexplained roster change ${row.playerId}: ${row.teamId} ${row.direction} ${row.fromCheckpoint}>${row.toCheckpoint}.`);
    }
    const evidence = args.evidenceByCause[row.cause] ?? [];
    if (!evidence.includes(row.playerId)) {
      throw new Error(`Roster row ${row.playerId} lacks exact ${row.cause} evidence.`);
    }
    const key = `${row.fromCheckpoint}>${row.toCheckpoint}:${row.direction}:${row.playerId}`;
    if (rowKeys.has(key)) throw new Error(`Duplicate roster causal row ${key}.`);
    rowKeys.add(key);
  }

  for (let index = 1; index < args.checkpoints.length; index += 1) {
    const before = args.checkpoints[index - 1]!;
    const after = args.checkpoints[index]!;
    const beforeSet = new Set(before.mlbIds);
    const afterSet = new Set(after.mlbIds);
    const expectedKeys = new Set([
      ...[...beforeSet].filter((id) => !afterSet.has(id))
        .map((id) => `${before.checkpoint}>${after.checkpoint}:out:${id}`),
      ...[...afterSet].filter((id) => !beforeSet.has(id))
        .map((id) => `${before.checkpoint}>${after.checkpoint}:in:${id}`),
    ]);
    const actualKeys = new Set(args.rows
      .filter((row) => row.fromCheckpoint === before.checkpoint && row.toCheckpoint === after.checkpoint)
      .map((row) => `${row.fromCheckpoint}>${row.toCheckpoint}:${row.direction}:${row.playerId}`));
    assertExactIdSet(actualKeys, expectedKeys, `${args.teamId} roster delta ${before.checkpoint}>${after.checkpoint}`);
  }

  const final = args.checkpoints.at(-1)!;
  for (const playerId of final.mlbIds) {
    if (args.canonicalFinalTeamById.get(playerId) !== args.teamId) {
      throw new Error(`${playerId} final roster reference is missing or points to the wrong team.`);
    }
  }

  const withoutGoal11 = new Set(final.mlbIds);
  for (const row of [...args.rows].reverse()) {
    if (!GOAL11_ROSTER_CAUSES.has(row.cause)) continue;
    if (row.direction === 'in') withoutGoal11.delete(row.playerId);
    else withoutGoal11.add(row.playerId);
  }
  const finalCount = final.mlbIds.length;
  const withoutCount = withoutGoal11.size;
  if (finalCount > 26 && (withoutCount <= 26 || finalCount > withoutCount)) {
    const goal11Rows = args.rows.filter((row) => GOAL11_ROSTER_CAUSES.has(row.cause));
    throw new Error(`Goal 11 caused or worsened ${args.teamId} over-limit roster (${finalCount}; counterfactual ${withoutCount}); rows=${JSON.stringify(goal11Rows)}.`);
  }
  return {
    finalMlbCount: finalCount,
    withoutGoal11Count: withoutCount,
    overLimitClassification: finalCount > 26 ? 'adjacent' : 'none',
  };
}
