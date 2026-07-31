import {
  ECON_LONG_SOAK_GOAL,
  ECON_LONG_SOAK_CALIBRATION_SEEDS,
  ECON_LONG_SOAK_DIAGNOSTIC_MODE,
  ECON_LONG_SOAK_HORIZON,
  ECON_LONG_SOAK_SAVE_SCHEMA,
  ECON_LONG_SOAK_SCHEMA,
  ECON_LONG_SOAK_SEEDS,
  assertAnnualRowSequence,
  buildInheritedCandidateDiagnostic,
  buildLongSoakTrends,
  sha256,
  stableJson,
  type EconLongSoakAnnualRow,
  type EconLongSoakInheritedCandidateDiagnostic,
  type EconLongSoakMode,
  type EconLongSoakSeed,
  type EconLongSoakTrends,
} from './econLongSoak.metrics.js';

export const UNFROZEN_ECON_LONG_SOAK_EXPECTATIONS = 'UNFROZEN' as const;

export interface EconLongSoakCheckpoint {
  seasonIndex: 10 | 15 | 20 | 30;
  stateDigest: string;
  rngDigest: string;
  roundTripStateDigest: string;
  roundTripRngDigest: string;
}

export interface EconLongSoakReceiptContent {
  goal: typeof ECON_LONG_SOAK_GOAL;
  schema: typeof ECON_LONG_SOAK_SCHEMA;
  saveSchemaVersion: typeof ECON_LONG_SOAK_SAVE_SCHEMA;
  seed: EconLongSoakSeed;
  horizon: number;
  mode: EconLongSoakMode;
  baselinePopulation: number;
  baselineRosterInvariantCategories: string[];
  rows: EconLongSoakAnnualRow[];
  checkpoints: EconLongSoakCheckpoint[];
  trends: EconLongSoakTrends | null;
  replayRows16To30Digest: string | null;
  diagnostic: EconLongSoakInheritedCandidateDiagnostic | null;
}

export interface EconLongSoakReceipt {
  sourceRevision: string;
  content: EconLongSoakReceiptContent;
  contentDigest: string;
}

export { sha256, stableJson } from './econLongSoak.metrics.js';

export function createEconLongSoakReceipt(
  sourceRevision: string,
  content: EconLongSoakReceiptContent,
): EconLongSoakReceipt {
  return { sourceRevision, content, contentDigest: sha256(content) };
}

export interface ReceiptValidationOptions {
  allowSmokeHorizon?: boolean;
  enforceInheritedCandidates?: boolean;
}

function assertReceiptIdentity(receipt: EconLongSoakReceipt): void {
  if (!receipt.sourceRevision) throw new Error('Receipt source revision is required as outer evidence.');
  const content = receipt.content;
  if (content.goal !== ECON_LONG_SOAK_GOAL || content.schema !== ECON_LONG_SOAK_SCHEMA) {
    throw new Error('Receipt goal/schema is malformed.');
  }
  if (content.saveSchemaVersion !== ECON_LONG_SOAK_SAVE_SCHEMA) {
    throw new Error(`Receipt save schema must be exactly v${ECON_LONG_SOAK_SAVE_SCHEMA}.`);
  }
  if (!(ECON_LONG_SOAK_SEEDS as readonly number[]).includes(content.seed)) {
    throw new Error(`Receipt seed ${content.seed} is not allowlisted.`);
  }
}

function assertFullHorizonEvidence(content: EconLongSoakReceiptContent): void {
  const expectedCheckpoints = [10, 15, 20, 30];
  if (content.checkpoints.length !== expectedCheckpoints.length
    || content.checkpoints.some((checkpoint, index) => checkpoint.seasonIndex !== expectedCheckpoints[index])) {
    throw new Error('Receipt checkpoint seasons must be exactly 10, 15, 20, and 30.');
  }
  for (const checkpoint of content.checkpoints) {
    const annualRow = content.rows[checkpoint.seasonIndex - 1];
    if (!annualRow
      || checkpoint.stateDigest !== annualRow.digests.state
      || checkpoint.rngDigest !== annualRow.digests.rng) {
      throw new Error(`Checkpoint ${checkpoint.seasonIndex} does not match its annual state/RNG row.`);
    }
    if (checkpoint.stateDigest !== checkpoint.roundTripStateDigest
      || checkpoint.rngDigest !== checkpoint.roundTripRngDigest) {
      throw new Error(`Checkpoint ${checkpoint.seasonIndex} failed v35 state/RNG round trip.`);
    }
  }
  if (!content.trends) throw new Error('Thirty-season receipt is missing trends.');
  const expectedTrends = buildLongSoakTrends(content.baselinePopulation, content.rows);
  if (stableJson(content.trends) !== stableJson(expectedTrends)) {
    throw new Error('Receipt trends do not match exact annual rows.');
  }
  if (!content.replayRows16To30Digest
    || content.replayRows16To30Digest !== sha256(content.rows.slice(15))) {
    throw new Error('Season-15 resume does not reproduce rows 16–30 byte-for-byte.');
  }
}

export function assertEconLongSoakReceipt(
  receipt: EconLongSoakReceipt,
  options: ReceiptValidationOptions = {},
): void {
  assertReceiptIdentity(receipt);
  const content = receipt.content;
  if (content.mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE || content.diagnostic !== null) {
    throw new Error('Diagnostic receipts are non-accepting and require the dedicated diagnostic validator.');
  }
  const isSmoke = options.allowSmokeHorizon === true && content.mode === 'measurement' && content.horizon >= 1 && content.horizon < ECON_LONG_SOAK_HORIZON;
  if (content.horizon !== ECON_LONG_SOAK_HORIZON && !isSmoke) throw new Error(`Receipt horizon must be ${ECON_LONG_SOAK_HORIZON}.`);
  if (content.mode !== 'measurement' && content.mode !== 'strict') throw new Error('Receipt mode is malformed.');
  assertAnnualRowSequence(content.rows, content.horizon, {
    baselineRosterInvariantCategories: content.baselineRosterInvariantCategories,
    enforceInheritedCandidates: options.enforceInheritedCandidates,
    baselinePopulation: content.baselinePopulation,
  });
  if (content.horizon === ECON_LONG_SOAK_HORIZON) {
    assertFullHorizonEvidence(content);
  } else if (content.checkpoints.length > 0 || content.trends !== null || content.replayRows16To30Digest !== null) {
    throw new Error('Smoke receipts cannot masquerade as checkpoint/replay evidence.');
  }
  if (receipt.contentDigest !== sha256(content)) throw new Error('Receipt deterministic content digest changed.');
  if (content.mode === 'strict') {
    throw new Error('Strict economy long-soak expectations remain UNFROZEN until phase-2 calibration.');
  }
}

export function assertEconLongSoakDiagnosticReceipt(
  receipt: EconLongSoakReceipt,
  expectedSourceRevision: string,
): void {
  assertReceiptIdentity(receipt);
  const content = receipt.content;
  if (content.mode !== ECON_LONG_SOAK_DIAGNOSTIC_MODE || content.diagnostic === null) {
    throw new Error('Dedicated diagnostic validation accepts only diagnostic_inherited_candidates receipts.');
  }
  if (!expectedSourceRevision
    || expectedSourceRevision === 'UNSPECIFIED'
    || receipt.sourceRevision !== expectedSourceRevision) {
    throw new Error('Diagnostic receipt source revision does not match the exact expected revision.');
  }
  if (!(ECON_LONG_SOAK_CALIBRATION_SEEDS as readonly number[]).includes(content.seed)) {
    throw new Error('Diagnostic receipts may use only one calibration seed (7111..7113); seed 7114 remains held out.');
  }
  if (content.horizon !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Diagnostic receipt horizon must be exactly ${ECON_LONG_SOAK_HORIZON}.`);
  }
  assertAnnualRowSequence(content.rows, content.horizon, {
    baselineRosterInvariantCategories: content.baselineRosterInvariantCategories,
    enforceInheritedCandidates: true,
    allowDiagnosticInheritedCandidateViolations: true,
    baselinePopulation: content.baselinePopulation,
  });
  assertFullHorizonEvidence(content);
  const expectedDiagnostic = buildInheritedCandidateDiagnostic(content.baselinePopulation, content.rows);
  if (!expectedDiagnostic.annotations.some((annotation) => annotation.violations.length > 0)) {
    throw new Error('Diagnostic receipt contains no inherited-candidate breach to adjudicate.');
  }
  if (stableJson(content.diagnostic) !== stableJson(expectedDiagnostic)) {
    throw new Error('Diagnostic marker, annotations, or trend facts do not match the exact annual rows.');
  }
  if (receipt.contentDigest !== sha256(content)) {
    throw new Error('Diagnostic receipt deterministic content digest changed.');
  }
}

export function assertEconLongSoakReceiptMatrix(
  receipts: readonly EconLongSoakReceipt[],
  expectedSourceRevision: string,
): void {
  if (receipts.length !== ECON_LONG_SOAK_SEEDS.length) {
    throw new Error(`Expected exactly four receipts; received ${receipts.length}.`);
  }
  const seeds = receipts.map((receipt) => receipt.content.seed);
  if (new Set(seeds).size !== seeds.length) throw new Error('Receipt matrix contains a duplicate seed.');
  const expectedSeeds = [...ECON_LONG_SOAK_SEEDS].sort((left, right) => left - right);
  if ([...seeds].sort((left, right) => left - right).some((seed, index) => seed !== expectedSeeds[index])) {
    throw new Error('Receipt matrix is missing an allowlisted calibration/held-out seed.');
  }
  for (const receipt of receipts) {
    if (receipt.sourceRevision !== expectedSourceRevision) throw new Error('Receipt matrix source revisions do not match.');
    if (receipt.content.horizon !== ECON_LONG_SOAK_HORIZON) throw new Error('Receipt matrix rejects smoke/wrong-horizon receipts.');
    assertEconLongSoakReceipt(receipt);
  }
}
