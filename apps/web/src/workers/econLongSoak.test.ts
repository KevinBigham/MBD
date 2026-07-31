// @vitest-environment node

import { writeFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  ECON_LONG_SOAK_HORIZON,
  ECON_LONG_SOAK_CALIBRATION_SEEDS,
  ECON_LONG_SOAK_DIAGNOSTIC_MODE,
  ECON_LONG_SOAK_SEEDS,
  sha256,
  type EconLongSoakMode,
  type EconLongSoakSeed,
} from './econLongSoak.metrics.js';
import {
  assertEconLongSoakDiagnosticReceipt,
  assertEconLongSoakReceipt,
  stableJson,
} from './econLongSoak.receipts.js';
import {
  assertExactStreamingReplayRow,
  buildStreamingReplayDigest,
  plannedV35RoundTripSeasons,
  runEconLongSoak,
  runEconLongSoakSeasonBoundary,
  yieldEconLongSoakMacrotask,
  type EconLongSoakProgressMarker,
} from './econLongSoak.testSupport.js';

vi.mock('comlink', () => ({ expose: () => undefined }));

const enabled = process.env.MBD_ECON_LONG_SOAK === '1';
const longSoakIt = enabled ? it : it.skip;

export function parseEnvironment(environment: Record<string, string | undefined> = process.env) {
  const mode = environment.MBD_ECON_LONG_SOAK_MODE;
  if (mode !== 'measurement' && mode !== 'strict' && mode !== ECON_LONG_SOAK_DIAGNOSTIC_MODE) {
    throw new Error('MBD_ECON_LONG_SOAK_MODE must be measurement, strict, or diagnostic_inherited_candidates.');
  }
  const seed = Number(environment.MBD_ECON_LONG_SOAK_SEED);
  if (!Number.isInteger(seed) || !(ECON_LONG_SOAK_SEEDS as readonly number[]).includes(seed)) {
    throw new Error('MBD_ECON_LONG_SOAK_SEED must be exactly one allowlisted seed (7111..7114).');
  }
  if (mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE
    && !(ECON_LONG_SOAK_CALIBRATION_SEEDS as readonly number[]).includes(seed)) {
    throw new Error('Diagnostic mode accepts exactly one calibration seed (7111..7113); seed 7114 remains held out.');
  }
  const requestedSmokeHorizon = Number(environment.MBD_ECON_LONG_SOAK_TEST_HORIZON);
  if (mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE
    && Number.isInteger(requestedSmokeHorizon)
    && requestedSmokeHorizon !== ECON_LONG_SOAK_HORIZON) {
    throw new Error(`Diagnostic mode requires the exact ${ECON_LONG_SOAK_HORIZON}-season horizon.`);
  }
  const horizon = mode === 'measurement'
    && Number.isInteger(requestedSmokeHorizon)
    && requestedSmokeHorizon >= 1
    && requestedSmokeHorizon < ECON_LONG_SOAK_HORIZON
    ? requestedSmokeHorizon
    : ECON_LONG_SOAK_HORIZON;
  const sourceRevision = environment.MBD_ECON_LONG_SOAK_SOURCE_REVISION ?? 'UNSPECIFIED';
  if (mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE && sourceRevision === 'UNSPECIFIED') {
    throw new Error('Diagnostic mode requires MBD_ECON_LONG_SOAK_SOURCE_REVISION to be the exact source revision.');
  }
  return {
    mode: mode as EconLongSoakMode,
    seed: seed as EconLongSoakSeed,
    horizon,
    sourceRevision,
    out: environment.MBD_ECON_LONG_SOAK_OUT,
  };
}

describe('ECON-LONG-SOAK-1 real-worker receipt harness', () => {
  it('parses only the three explicit modes and fences diagnostic seeds/horizon', () => {
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: 'other',
      MBD_ECON_LONG_SOAK_SEED: '7111',
    })).toThrow(/measurement, strict, or diagnostic/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: 'diagnostic_fa_entry_only',
      MBD_ECON_LONG_SOAK_SEED: '7111',
    })).toThrow(/diagnostic_inherited_candidates/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7114',
    })).toThrow(/held out/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7111',
      MBD_ECON_LONG_SOAK_TEST_HORIZON: '1',
    })).toThrow(/30-season/);
    expect(() => parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7111',
    })).toThrow(/SOURCE_REVISION/);
    expect(parseEnvironment({
      MBD_ECON_LONG_SOAK_MODE: ECON_LONG_SOAK_DIAGNOSTIC_MODE,
      MBD_ECON_LONG_SOAK_SEED: '7113',
      MBD_ECON_LONG_SOAK_SOURCE_REVISION: 'dd505e1',
    })).toMatchObject({ mode: ECON_LONG_SOAK_DIAGNOSTIC_MODE, seed: 7113, horizon: 30 });
  });

  it('uses a real macrotask yield and emits exact out-of-band progress markers', async () => {
    let timerServiced = false;
    setTimeout(() => { timerServiced = true; }, 0);
    await Promise.resolve();
    expect(timerServiced).toBe(false);
    await yieldEconLongSoakMacrotask();
    expect(timerServiced).toBe(true);

    const markers: EconLongSoakProgressMarker[] = [];
    const canonicalResult = { row: 16, digest: 'canonical' };
    const withoutProgress = await runEconLongSoakSeasonBoundary(
      'primary',
      16,
      undefined,
      () => canonicalResult,
    );
    const withProgress = await runEconLongSoakSeasonBoundary(
      'replay',
      16,
      (marker) => markers.push(marker),
      () => canonicalResult,
    );
    expect(markers).toEqual([
      { phase: 'replay', status: 'start', seasonIndex: 16 },
      { phase: 'replay', status: 'complete', seasonIndex: 16 },
    ]);
    expect(Object.keys(markers[0]!).sort()).toEqual(['phase', 'seasonIndex', 'status']);
    expect(stableJson(withProgress)).toBe(stableJson(withoutProgress));
    expect(sha256(withProgress)).toBe(sha256(withoutProgress));
  });

  it('streams exact replay rows and preserves the canonical suffix digest definition', () => {
    const primaryRows = Array.from({ length: ECON_LONG_SOAK_HORIZON }, (_, index) => ({
      seasonIndex: index + 1,
      canonical: `row-${index + 1}`,
    }));
    for (let index = 16; index <= ECON_LONG_SOAK_HORIZON; index += 1) {
      assertExactStreamingReplayRow(primaryRows[index - 1], structuredClone(primaryRows[index - 1]), index);
    }
    expect(() => assertExactStreamingReplayRow(
      primaryRows[20],
      { ...primaryRows[20], canonical: 'mutated' },
      21,
    )).toThrow(/row 21 byte-for-byte/);
    expect(buildStreamingReplayDigest(primaryRows)).toBe(sha256(primaryRows.slice(15)));
    expect(plannedV35RoundTripSeasons(ECON_LONG_SOAK_HORIZON)).toEqual([10, 15, 20, 30]);
    expect(plannedV35RoundTripSeasons(2)).toEqual([2]);
  });

  longSoakIt('runs exactly one allowlisted seed through autonomous production lifecycle', async () => {
    const env = parseEnvironment();
    const progress: EconLongSoakProgressMarker[] = [];
    const receipt = await runEconLongSoak({
      ...env,
      onProgress: (marker) => {
        progress.push(marker);
        process.stderr.write(`${stableJson(marker)}\n`);
      },
    });
    if (env.mode === ECON_LONG_SOAK_DIAGNOSTIC_MODE) {
      assertEconLongSoakDiagnosticReceipt(receipt, env.sourceRevision);
    } else {
      assertEconLongSoakReceipt(receipt, {
        allowSmokeHorizon: env.horizon < ECON_LONG_SOAK_HORIZON,
        enforceInheritedCandidates: env.horizon === ECON_LONG_SOAK_HORIZON,
      });
    }
    expect(receipt.content.seed).toBe(env.seed);
    expect(receipt.content.rows).toHaveLength(env.horizon);
    expect(receipt.content.rows.every((row) => row.nextSeason === row.completedSeason + 1)).toBe(true);
    const expectedProgress: EconLongSoakProgressMarker[] = [];
    for (let seasonIndex = 1; seasonIndex <= env.horizon; seasonIndex += 1) {
      expectedProgress.push(
        { phase: 'primary', status: 'start', seasonIndex },
        { phase: 'primary', status: 'complete', seasonIndex },
      );
    }
    if (env.horizon === ECON_LONG_SOAK_HORIZON) {
      for (let seasonIndex = 16; seasonIndex <= ECON_LONG_SOAK_HORIZON; seasonIndex += 1) {
        expectedProgress.push(
          { phase: 'replay', status: 'start', seasonIndex },
          { phase: 'replay', status: 'complete', seasonIndex },
        );
      }
    }
    expect(progress).toEqual(expectedProgress);
    expect(Object.prototype.hasOwnProperty.call(receipt.content, 'progress')).toBe(false);
    if (env.out) writeFileSync(env.out, `${stableJson(receipt)}\n`, { encoding: 'utf8', flag: 'wx' });
  }, 2_400_000);
});
