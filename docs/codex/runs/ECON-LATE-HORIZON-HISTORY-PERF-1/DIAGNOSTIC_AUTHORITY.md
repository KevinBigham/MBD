# Diagnostic Authority — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `CONSTRUCTION AUTHORIZED; EXECUTION CLOSED`

This document freezes the executable interface for the authorized paired
`R/P/H` diagnostic. It does not authorize running that diagnostic. Execution
opens only after both non-landed compositions and the generated manifest are
immutable, their pre-execution tests pass, and independent Sol review returns
zero actionable P0-P2 findings.

## Composition identities

The baseline composition:

- parent: `4e016cc4fe3043e438cc0cbc3aeec798b6f47d6b`;
- helper: exact historical autonomous behavior with unoptimized payroll;
- eleven proof/observer files: the reviewed Goal-31 proof bytes;
- non-landed and mechanically not an ancestor of local `main`.

The successor composition:

- parent: source freeze
  `5a4eb60f8b1890803117a84a613d43af605f47dc`;
- helper: reviewed semantic merge of the source-freeze batch payroll path and
  exact historical autonomous behavior;
- eleven proof/observer files: byte-identical to the baseline composition;
- non-landed and mechanically not an ancestor of local `main`.

Each composition may differ from its parent in exactly the twelve paths listed
in `PLAN.md`. No thirteenth harness or instrumentation path is permitted.

## Literal diagnostic command

The command runs from the immutable successor composition. These are the only
operator-supplied values:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=paired-diagnostic \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST=/absolute/path/manifest.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST_SHA256=<64-lowercase-hex> \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_OUT=/absolute/path/rph-receipt.json \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLateHorizonPerf.integration.test.ts --retry=0
```

The allowlisted integration test is both orchestrator and child observer. The
orchestrator must derive baseline/successor roots, checkpoint inputs, child
ordinals, and all four exclusive child output paths from the hash-verified
manifest. They are not accepted as free-form operator environment values.

The orchestrator launches four fresh child processes in this exact order:

1. baseline / `post15`;
2. successor / `post15`;
3. baseline / `season30Input`;
4. successor / `season30Input`.

Every child receives a new read-only copy of the authenticated input bytes.
Baseline and successor for one data age receive byte-identical copies. No
process retries.

## Manifest key order

The generated manifest has this exact top-level key order:

`schema, goal, sourceFreeze, baselineComposition, successorComposition,
historicalAutonomous, preservedGoal31, compositionPaths, helperProjection,
parityReceipts, inputs, processes, outputs, futureItem18, manifestDigest`.

Required identity:

- `schema`: `mbd.econ-late-horizon-history-perf.manifest.v1`;
- `goal`: `ECON-LATE-HORIZON-HISTORY-PERF-1`;
- source/base/composition revisions and trees;
- clean worktree/index checks;
- exact changed-path sets and SHA-256 for every landable and composition path;
- the four frozen Goal-31 blob hashes;
- historical helper revision/tree/hash and the two overlapping function names;
- function-level helper deltas classified only as `payroll-only`,
  `autonomous-only`, or `reviewed-overlap-resolution`;
- exact interactive, autonomous, and cross-mode parity receipt hashes;
- authenticated raw and envelope hashes for both checkpoint inputs;
- exact four process descriptors and exclusive output paths;
- mechanical non-ancestry from local `main`;
- future item-18 helper equality condition, recorded but not executed.

`manifestDigest` is the SHA-256 of canonical JSON over all preceding keys. The
file SHA-256 supplied to the command independently binds the complete manifest
bytes.

## Child observation contract

Within each fresh process, invoke these exact non-overlapping outer roots once
and in order:

1. `buildFreeAgencyPayrolls(state, 'autonomous_league')`;
2. `deduplicateNews(state.news)`;
3. `recordProspectBondDebuts(state)`;
4. `applySeasonEndPlayerMicroArcMoments(state)`.

The payroll root includes all 32 teams. Successor elapsed time includes the
batch projection itself. Nested callees are not timed independently. Every root
records call count `1` and one finite, nonnegative raw wall-time observation.

Each child receipt has exact key order:

`schema, goal, variant, dataAge, checkpoint, sourceIdentity, helperSha256,
observerSha256, roots, factualDigests, stateDigest, rngDigest, semanticDigest,
receiptDigest`.

Required values:

- `schema`: `mbd.econ-late-horizon-history-perf.observation.v1`;
- `variant`: `baseline` or `successor`;
- `dataAge`: `post15` or `season30Input`;
- `roots`: exact fixed order above, each with exact identity, call count, and
  raw elapsed milliseconds;
- `factualDigests`: ordered payroll, news, prospect-bond, and micro-arc facts;
- `stateDigest` and `rngDigest`: exact post-observation canonical facts;
- `semanticDigest`: digest over the factual/state/RNG projection;
- `receiptDigest`: SHA-256 of canonical JSON over every preceding key.

The observer operations may mutate only where the real root normally mutates.
The baseline and successor semantic, state, RNG, and factual digests for one
data age must be exact equals.

## Reducer contract

The final reducer receipt has exact key order:

`schema, goal, manifestDigest, baselinePost15Digest, successorPost15Digest,
baselineSeason30InputDigest, successorSeason30InputDigest, D15, D30, R, P, H,
cap, result, receiptDigest`.

Required values:

- `schema`: `mbd.econ-late-horizon-history-perf.rph.v1`;
- `cap`: `2040000`;
- `H`: `1938000`;
- `D15 = floor(baselinePost15Total - successorPost15Total)`;
- `D30 = floor(baselineSeason30InputTotal - successorSeason30InputTotal)`;
- `R = 22 * D15 + 16 * D30`;
- `P = 2948890 - R`;
- `result = PASS` only when `D15 >= 0`, `D30 >= 0`,
  `R >= 1010890`, and `P <= H`.

All four root observations are summed in raw form before the data-age delta is
floored. Negative or non-finite deltas fail closed. A failure writes no
admission artifact and opens no retry, fifth seam, or forecast.

## Pre-execution gates

Before Sol review, and without running the diagnostic:

1. exact interactive-before/after, autonomous-before/after, and cross-mode
   helper parity tests pass;
2. all eleven observer/proof files are byte-identical across compositions;
3. source/typecheck tests for the disposable helper merge pass;
4. hostile reducer tests reject:
   - wrong manifest file hash or internal manifest digest;
   - stale/dirty/mis-parented composition roots;
   - missing, extra, reordered, or hash-mismatched paths;
   - wrong helper projection or parity receipt;
   - altered input hash, data age, process ordinal, variant, or output path;
   - reused/nonexclusive output;
   - wrong observer/helper SHA;
   - missing, extra, nested, reordered, repeated, negative, or non-finite root
     observations;
   - malformed receipt keys, digests, factual projection, state, RNG, or
     semantic parity;
   - altered reducer constants, equations, threshold, cap, or key order;
5. one deliberate negative control removes or bypasses an identity check and
   proves the hostile test fails, then restores correct bytes;
6. generated manifest verification passes in check-only mode;
7. independent Sol review of the exact two composition commits, manifest,
   helper projections, tests, and literal command returns zero actionable
   P0-P2 findings.

Only that verdict changes this status from execution closed to the single
authorized no-retry diagnostic.
