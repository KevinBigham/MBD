# Diagnostic Authority — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `CONSTRUCTION AUTHORIZED; EXECUTION CLOSED`

This document freezes the executable interface for the authorized paired
`R/P/H` diagnostic. It does not authorize running that diagnostic. Execution
opens only after both non-landed compositions and their generated manifest are
immutable, pre-execution gates pass, and independent Sol review returns zero
actionable P0-P2 findings.

## Composition identities

The baseline composition:

- parent: `4e016cc4fe3043e438cc0cbc3aeec798b6f47d6b`;
- helper: exact historical autonomous behavior with unoptimized payroll;
- proof paths: a new Goal-32 eleven-path closure derived from the reviewed
  Goal-31 proof, then changed only as required for this paired diagnostic;
- non-landed and mechanically not an ancestor of local `main`.

The successor composition:

- parent: source freeze
  `5a4eb60f8b1890803117a84a613d43af605f47dc`;
- helper: reviewed semantic merge of the source-freeze batch payroll path and
  exact historical autonomous behavior;
- proof paths: byte-identical to the new Goal-32 eleven-path baseline closure;
- non-landed and mechanically not an ancestor of local `main`.

The old Goal-31 proof hashes remain immutable provenance, not the new observer
identity. Each composition may differ from its parent in exactly the twelve
paths listed in `PLAN.md`. No thirteenth harness or instrumentation path is
permitted.

The manifest freezes these two exact absolute canonical realpaths:

- `/private/tmp/mbd-goal32-baseline-composition-20260730`;
- `/private/tmp/mbd-goal32-successor-composition-20260730`.

They must be distinct directories. For each composition the manifest records,
in this exact nested key order:

`variant, rootRealpath, parentRevision, parentTree, headRevision, headTree,
changedPaths, files, identityDigest`.

`changedPaths` is the exact ordered twelve-path allowlist. Each `files` row has
key order `path, blob, sha256, bytes`. `identityDigest` uses the canonical
digest function below over every preceding identity key.

Immediately before and after every child spawn, the orchestrator re-derives
and compares:

- `realpath(root)`;
- `HEAD`, `HEAD^{tree}`, parent revision, and parent tree;
- exact changed paths from parent to `HEAD`;
- exact file blob, SHA-256, and byte length;
- empty index and worktree, including untracked paths;
- composition not being an ancestor of local `main`;
- distinct baseline/successor roots and CWDs.

Stored clean-state claims never substitute for these live checks.

## Canonical digest and raw transport

`stableJsonV1` is the existing recursive canonicalizer from
`econLongSoak.metrics.ts`: primitives use `JSON.stringify`, arrays preserve
their order, and object keys sort lexically at every depth.

`digestV1(value)` is lowercase SHA-256 of UTF-8 `stableJsonV1(value)`.

Canonical digests do not prove transport key order. Every manifest and receipt
validator separately compares unsorted `Object.keys(parsed)` with the exact
key list in this document. Raw JSON files use exactly
`JSON.stringify(value) + "\n"` with no indentation, BOM, or extra bytes.

The Sol gate records both:

- the raw SHA-256 of the complete manifest file bytes;
- the internal `manifestDigest`.

Every child and the reducer independently rechecks both. The reducer binds
both values in its provenance.

## Manifest key order and nested schema

The generated manifest has this exact top-level key order:

`schema, goal, sourceFreeze, baselineComposition, successorComposition,
historicalAutonomous, preservedGoal31, compositionPaths, helperProjection,
parityReceipts, inputs, processes, outputs, futureItem18, manifestDigest`.

Required top-level values:

- `schema`: `mbd.econ-late-horizon-history-perf.manifest.v1`;
- `goal`: `ECON-LATE-HORIZON-HISTORY-PERF-1`.

`sourceFreeze` key order:

`revision, tree, parentRevision, changedPaths, files, identityDigest`.

`baselineComposition` and `successorComposition` use the composition identity
schema above.

`historicalAutonomous` key order:

`revision, tree, helperBlob, helperSha256, overlappingFunctions`.

`overlappingFunctions` is exactly
`["buildFreeAgencyPayrolls","simulateFreeAgencyDays"]`.

`preservedGoal31` key order:

`sourceRevision, sourceTree, files, evidenceRoot, evidenceIdentityDigest`.

The four file rows retain the exact frozen milestone/ceremony source/test
hashes. `evidenceRoot` is the canonical realpath of the preserved Goal-31
evidence root.

`compositionPaths` is the exact ordered twelve-path allowlist. The manifest
also proves the eleven non-helper file rows are byte-identical across
compositions.

Each `helperProjection` row has key order:

`function, baselineDigest, successorDigest, classification, resolution`.

`classification` is only `payroll-only`, `autonomous-only`, or
`reviewed-overlap-resolution`.

Each `parityReceipts` row has key order:

`mode, command, exitCode, receiptPath, rawSha256, contentDigest`.

The exact ordered modes are `interactive-before-after`,
`autonomous-before-after`, and `cross-mode-difference`.

`inputs` has key order `post15, season30Input`. Each row has key order:

`dataAge, sourcePath, sourceRawSha256, sourceEnvelopeDigest,
baselineCopyPath, successorCopyPath`.

The source hashes are:

- `post15`: raw
  `043595c3bd9d557f520b438de48f11edd8d49e926d3d23e9c449c45441500d3e`,
  envelope
  `a4e66914ab270f761fa1b0c027c53c97f9971720f7f36d4680aa53e512c85bca`;
- `season30Input`: raw
  `3a0160764d0899706c4d940ab30f238673e8a7c8ab39a6a5adc589cf93b256d3`,
  envelope
  `4664509f1f94d567f7518c1521cb2756cf938eaac318905fde33061dcd3f47e0`.

Each `processes` row has key order:

`ordinal, variant, dataAge, rootRealpath, inputCopyPath, outputPath, argv`.

The exact process order is:

1. baseline / `post15`;
2. successor / `post15`;
3. baseline / `season30Input`;
4. successor / `season30Input`.

`argv` is exactly:

`["pnpm","--filter","@mbd/web","exec","vitest","run",
"src/workers/econLateHorizonPerf.integration.test.ts","--retry=0"]`.

`outputs` key order:

`artifactRoot, manifestPath, childOutputPaths, reducerOutputPath`.

`futureItem18` key order:

`requiredHelperSha256, equalityRequiredBeforeExecution, executionAuthorized`.

`equalityRequiredBeforeExecution` is `true`; `executionAuthorized` is `false`.

`manifestDigest` is `digestV1` over all preceding top-level keys. The
operator-supplied raw manifest SHA-256 independently binds complete bytes.

## Literal outer command

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

The allowlisted integration test is the orchestrator and child observer. The
orchestrator derives both roots, all input copies, child ordinals, variants,
data ages, and output paths from the verified manifest. They are not accepted
as free-form operator values.

## Exact child-only interface

For each process descriptor the orchestrator spawns the exact `argv` from the
descriptor, with:

- `cwd` equal to that descriptor's verified `rootRealpath`;
- synchronous completion before the next ordinal;
- `stdio` captured as raw bytes;
- nonzero exit, signal, spawn error, missing output, or unexpected stdout/stderr
  treated as invalid evidence and terminal failure.

The child environment is rebuilt, not inherited wholesale. Its only inherited
keys are present values from this exact allowlist:

`PATH, HOME, TMPDIR, CI, COREPACK_HOME, PNPM_HOME`.

The orchestrator then adds exactly:

`MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=paired-child`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST_SHA256`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_PROCESS_ORDINAL`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_VARIANT`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_DATA_AGE`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_INPUT`,
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_OUT`.

Every value except `paired-child` must equal the selected manifest descriptor.
The child reopens and revalidates the manifest and its raw/internal digests,
checks its CWD and live composition identity, rejects any extra
`MBD_ECON_LATE_HORIZON_HISTORY_PERF_*` key, and runs exactly one descriptor.
This prevents recursion into `paired-diagnostic`.

The child emits no JSON on stdout. Its only evidence channel is exclusive
creation of its descriptor's output file. Diagnostic console noise is invalid.

## Output and copy safety

The existing manifest path is an absolute, regular, non-symlink file outside
both repositories. Its parent directory is the canonical artifact root.

These nine paths must be absolute, pairwise distinct from each other and the
manifest, outside both repositories, non-symlink at every existing ancestor,
and absent before orchestration:

- four input copy paths, one per variant/data-age pair;
- four child output paths;
- one reducer output path.

The artifact root must exist as a regular directory, be outside both
repositories, and contain no path except the already sealed manifest before
the run. Input copies use exclusive creation, preserve exact source bytes, are
made read-only before child spawn, and are rehashed before and after the child.
Output files use exclusive creation and are reopened by the orchestrator as
regular non-symlink files.

Any invalid identity, input, child, semantic, or reducer evidence produces no
reducer receipt. A fully valid measurement that misses the threshold writes a
truthful `FAIL` reducer receipt and no admission artifact.

## Child observation contract

The child parses the authenticated input envelope, imports its snapshot through
the existing supported `importGameSnapshot`, and re-exports once before timing
to bind checkpoint facts. It invokes these exact non-overlapping outer roots
once and in order:

1. `buildFreeAgencyPayrolls(state, 'autonomous_league')`;
2. `deduplicateNews(state.news)`;
3. `recordProspectBondDebuts(state)`;
4. `applySeasonEndPlayerMicroArcMoments(state)`.

The payroll root includes all 32 teams. Successor elapsed time includes the
batch projection itself. Nested callees are not timed independently. Every root
has one finite, nonnegative raw wall-time observation.

`checkpoint` key order:

`dataAge, inputRawSha256, inputEnvelopeDigest, snapshotSerializedDigest,
preStateDigest, preRngDigest`.

`sourceIdentity` key order:

`variant, rootRealpath, parentRevision, parentTree, headRevision, headTree,
compositionIdentityDigest`.

Each `roots` row has key order:

`id, ordinal, callCount, elapsedMs, resultDigest`.

The exact IDs are `freeAgencyPayrolls`, `deduplicateNews`,
`recordProspectBondDebuts`, and `applySeasonEndPlayerMicroArcMoments`;
ordinals are 1 through 4; every call count is `1`.

`factualDigests` key order:

`payroll, news, prospectBonds, playerMicroArcs`.

They digest these exact source-grounded values:

- `payroll`: ordered `Array.from(payrollMap.entries())`, including all 32 team
  IDs and returned numeric payroll values;
- `news`: the full returned `NewsItem[]`, in order and with every serialized
  field;
- `prospectBonds`: `{ returnedPlayerIds, bonds }`, where
  `returnedPlayerIds` is the exact returned array and `bonds` is the complete
  post-call `state.prospectBonds`;
- `playerMicroArcs`: the complete post-call
  `Array.from(state.playerMoments.entries())` in map order.

For each root, `resultDigest` is the matching exact factual digest. The
micro-arc function's `void` return is not used as evidence.

After all four roots, call `exportGameSnapshot(state)` exactly once. Destructure
its exact `rng` field from the remaining snapshot:

- `stateDigest = digestV1(snapshotWithoutRng)`;
- `rngDigest = digestV1(snapshot.rng)`;
- `semanticDigest = digestV1({ factualDigests, stateDigest, rngDigest })`.

This is the full supported canonical post-observation save projection, not a
selected subset. The checkpoint pre-state digest uses the same
snapshot-without-RNG rule. Baseline and successor receipts for each data age
must have exact-equal checkpoint, factual, state, RNG, and semantic digests.

## Child receipt

Each child receipt has exact key order:

`schema, goal, variant, dataAge, checkpoint, sourceIdentity, helperSha256,
observerSha256, roots, factualDigests, stateDigest, rngDigest, semanticDigest,
receiptDigest`.

Required values:

- `schema`: `mbd.econ-late-horizon-history-perf.observation.v1`;
- `goal`: `ECON-LATE-HORIZON-HISTORY-PERF-1`;
- variant/data age/source identity: exact manifest descriptor;
- `helperSha256`: exact composition helper hash;
- `observerSha256`: exact shared integration-test hash;
- `receiptDigest`: `digestV1` over every preceding key.

The raw receipt must satisfy the transport rules above.

## Reducer contract

The final reducer receipt has exact key order:

`schema, goal, manifestRawSha256, manifestDigest, baselinePost15Digest,
successorPost15Digest, baselineSeason30InputDigest,
successorSeason30InputDigest, D15, D30, R, P, H, cap, result, receiptDigest`.

Required values:

- `schema`: `mbd.econ-late-horizon-history-perf.rph.v1`;
- `goal`: `ECON-LATE-HORIZON-HISTORY-PERF-1`;
- `manifestRawSha256`: reviewed raw manifest hash from the command;
- `manifestDigest`: verified internal manifest digest;
- `cap`: `2040000`;
- `H`: `1938000`;
- `D15 = floor(baselinePost15Total - successorPost15Total)`;
- `D30 = floor(baselineSeason30InputTotal - successorSeason30InputTotal)`;
- `R = 22 * D15 + 16 * D30`;
- `P = 2948890 - R`;
- `result = PASS` only when `D15 >= 0`, `D30 >= 0`,
  `R >= 1010890`, and `P <= H`.

Each total is the raw sum of the four root `elapsedMs` values before flooring.
Negative or non-finite deltas invalidate evidence and produce no reducer
receipt. `receiptDigest` is `digestV1` over all preceding keys.

A valid `FAIL` is terminal for this slice: no retry, fifth seam, forecast, or
admission. A green diagnostic is not admission evidence and opens only the one
authorized no-retry final proof.

## Pre-execution gates

Before Sol review, and without running the diagnostic:

1. exact interactive-before/after, autonomous-before/after, and cross-mode
   helper parity tests pass;
2. all eleven Goal-32 observer/proof files are byte-identical across
   compositions;
3. source/typecheck tests for both disposable helpers pass;
4. hostile tests reject:
   - wrong raw manifest hash, internal digest, raw key order, newline, or schema;
   - stale, dirty, symlinked, same-root, mis-parented, or ancestor composition;
   - missing, extra, reordered, hash-mismatched, or wrong-byte proof paths;
   - wrong helper projection or parity receipt;
   - altered input source/copy hash, data age, process ordinal, variant, CWD,
     argv, environment, or output path;
   - reused/nonexclusive/symlinked/in-repository paths;
   - wrong observer/helper hash;
   - missing, extra, nested, reordered, repeated, negative, or non-finite root
     observations;
   - malformed receipt key order, digest, factual projection, state, RNG, or
     semantic parity;
   - altered reducer constants, equations, threshold, cap, or key order;
5. one deliberate negative control bypasses a live composition-identity check
   and proves the hostile test fails, then restores correct bytes;
6. generated manifest verification passes in check-only mode before and after
   a no-op child-spawn simulation that does not invoke any measured root;
7. independent Sol review of the exact composition commits, manifest,
   raw manifest hash, helper projections, tests, and literal command returns
   zero actionable P0-P2 findings.

Only that verdict changes this status from execution closed to the single
authorized no-retry paired diagnostic.
