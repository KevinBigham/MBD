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

Both disposable helpers expose this exact composition-only signature:

```ts
export function buildFreeAgencyPayrolls(
  state: FullGameState,
  mode: OffseasonAutomationMode = 'interactive',
): Map<string, number>
```

The baseline keeps the historical per-team payroll implementation. The
successor uses the operation-local batch projection. This two-argument export
is the reviewed merge of the historical autonomous helper with the landable
one-argument helper; it does not describe or change the landable helper's
signature and is never added to Comlink or a package barrel. In
`autonomous_league` mode both disposable helpers return the exact ordered
32-team map. In `interactive` mode they return the exact ordered 31
non-user-team map.

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

The durable Sol record is
`docs/codex/runs/ECON-LATE-HORIZON-HISTORY-PERF-1/SOL_DIAGNOSTIC_GATE.md`.
Before execution it must name the exact manifest absolute path, raw SHA-256,
internal `manifestDigest`, literal outer command, both composition
commit/tree identities, and a zero-actionable-P0-P2 verdict.

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

## Exact parity receipt construction

### Failed first capture evidence

The first baseline parity attempt is evidence-only and may never be reused:

- the initial operator launch resolved the repository fallback `pnpm`, failed
  before Vitest on `ERR_PNPM_IGNORED_BUILDS`, created no parity root, and its
  attempted `pnpm-workspace.yaml` edit was restored byte-for-byte;
- the corrected external-Corepack launch reached the capture fixture, wrote
  only
  `/private/tmp/mbd-goal32-parity-5a4eb60-20260730/capture-baseline.json`,
  then exited `1` because an ordinary default-mode unit assertion incorrectly
  required the explicitly supplied capture-mode environment to be absent;
- failed capture raw SHA-256:
  `23487f03fffd1367bce5fe0fdc8d0b243b37dd226b7ccef0a7b933ef66cc07c8`;
- failed capture internal receipt digest:
  `eeee92e13240ffcad2517d09a0ccd7bf8da935190af77a86b241e8835b51b757`;
- no successor capture or parity reducer ran;
- the frozen diagnostic root remained absent;
- the failed root and receipt remain immutable evidence. No cleanup,
  overwrite, completion, reducer, seal, or reuse is permitted.

This is a verification-program defect, not a payroll/gameplay/RNG result. The
same Terra writer owns correction loop 1 of 2. The active parity construction
below uses a fresh root.

The frozen canonical parity root is
`/private/tmp/mbd-goal32-parity-5a4eb60-20260730-r1`. It must be absent before the
first capture and remain outside both repositories, the preserved Goal-31
evidence root, checkpoint source roots, and the later diagnostic artifact root.
No command may clean, delete, overwrite, or reuse it.

The baseline capture command runs from the baseline composition:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_MODE=capture \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_VARIANT=baseline \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_OUT=/private/tmp/mbd-goal32-parity-5a4eb60-20260730-r1/capture-baseline.json \
pnpm --filter @mbd/web exec vitest run \
  src/workers/sim.worker.autonomousOffseason.test.ts --retry=0
```

It exclusively creates the parity root and
`capture-baseline.json`. The successor capture command runs from the successor
composition:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_MODE=capture \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_VARIANT=successor \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_OUT=/private/tmp/mbd-goal32-parity-5a4eb60-20260730-r1/capture-successor.json \
pnpm --filter @mbd/web exec vitest run \
  src/workers/sim.worker.autonomousOffseason.test.ts --retry=0
```

It requires the root to contain exactly the immutable baseline capture and
exclusively creates `capture-successor.json`.

Each capture has exact key order:

`schema, goal, variant, helperSha256, observerSha256, interactive,
autonomousLeague, crossMode, stateDigest, rngDigest, receiptDigest`.

Required values:

- `schema`: `mbd.econ-late-horizon-history-perf.parity-capture.v1`;
- `goal`: `ECON-LATE-HORIZON-HISTORY-PERF-1`;
- variant and helper/observer hashes: exact composition identity;
- `interactive`: exact ordered helper results and exact post-fixture
  save-without-RNG/RNG facts for interactive mode;
- `autonomousLeague`: the same exact facts for autonomous mode;
- `crossMode`: exact selected-user-team inclusion/exclusion and changed/no-change
  facts that are intentionally different between modes;
- `stateDigest` and `rngDigest`: the common pristine pre-mode fixture's full
  `exportGameSnapshot` snapshot-without-RNG and exact RNG digests;
- `receiptDigest`: `digestV1` over every preceding key.

`interactive` and `autonomousLeague` each have exact key order:

`teamIds, payrollEntries, operationResultDigest, postStateDigest,
postRngDigest`.

- `teamIds` is the exact ordered team-ID list returned by
  `buildFreeAgencyPayrolls`;
- `payrollEntries` is the exact ordered
  `Array.from(buildFreeAgencyPayrolls(...).entries())`;
- `operationResultDigest` is `digestV1` of the exact result from the parity
  fixture's one free-agency-day operation;
- `postStateDigest` is `digestV1` of the full post-operation
  `exportGameSnapshot` value without its `rng` field;
- `postRngDigest` is `digestV1` of that exact snapshot's `rng` field.

The two modes start from separately imported copies of the exact same pristine
snapshot bound by the top-level `stateDigest` and `rngDigest`.

`crossMode` has exact key order:

`userTeamId, interactiveTeamIds, autonomousTeamIds, interactiveIncludesUser,
autonomousIncludesUser, differingTeamIds, interactiveDigest,
autonomousLeagueDigest, differenceDigest`.

`interactiveDigest` and `autonomousLeagueDigest` are `digestV1` of the complete
mode objects above. `differingTeamIds` preserves canonical team order and is
exactly the teams whose inclusion differs. `differenceDigest` is `digestV1`
over every preceding cross-mode key.

The reducer command runs from the successor composition:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_MODE=reduce \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_BASELINE=/private/tmp/mbd-goal32-parity-5a4eb60-20260730-r1/capture-baseline.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_SUCCESSOR=/private/tmp/mbd-goal32-parity-5a4eb60-20260730-r1/capture-successor.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_PARITY_ROOT=/private/tmp/mbd-goal32-parity-5a4eb60-20260730-r1 \
pnpm --filter @mbd/web exec vitest run \
  src/workers/sim.worker.autonomousOffseason.test.ts --retry=0
```

It requires exactly the two capture files, revalidates their raw transport,
digests, helper/observer identities, composition roots, and fixture schemas,
then exclusively writes these three direct-child receipts:

- `interactive-before-after.json`;
- `autonomous-before-after.json`;
- `cross-mode-difference.json`.

Each parity receipt has exact key order:

`schema, goal, mode, baselineCaptureDigest, successorCaptureDigest, assertions,
result, contentDigest`.

`schema` is `mbd.econ-late-horizon-history-perf.parity.v1`; `result` is exactly
`PASS`. `baselineCaptureDigest` is the fully revalidated baseline capture's
`receiptDigest`; `successorCaptureDigest` is the fully revalidated successor
capture's `receiptDigest`; `contentDigest = digestV1` over every preceding
parity-receipt key.

`assertions` has exact key order:

`baselineEqualsSuccessor, stateEquals, rngEquals, crossModeDifferenceMatches,
crossModeDifferenceNonempty`.

Every field is boolean and must be `true`. It binds the exact compared
factual/state/RNG projections.
Interactive and autonomous baseline/successor facts must be exact-equal.
Cross-mode intentional differences must be exact-equal between variants and
must remain nonempty. Any mismatch writes none of the three receipts. The
reducer leaves both captures and all failure evidence untouched.

The manifest `parityReceipts` rows use the three receipt paths above. Their
`command` field is the literal reducer command, `exitCode` is `0`, `rawSha256`
binds complete raw bytes, and `contentDigest` equals the receipt's internal
digest.

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

The frozen artifact root is
`/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730`; `manifestPath` is its direct
child `manifest.json`. The four input-copy direct-child names are
`input-1-baseline-post15.json`, `input-2-successor-post15.json`,
`input-3-baseline-season30Input.json`, and
`input-4-successor-season30Input.json`. The child output direct-child names are
`observation-1.json` through `observation-4.json`. The reducer direct-child
name is `rph-receipt.json`.

`futureItem18` key order:

`requiredHelperSha256, equalityRequiredBeforeExecution, executionAuthorized`.

`equalityRequiredBeforeExecution` is `true`; `executionAuthorized` is `false`.

`manifestDigest` is `digestV1` over all preceding top-level keys. The
operator-supplied raw manifest SHA-256 independently binds complete bytes.

## Exact manifest seal and check-only commands

After the two composition commits and three parity receipts are immutable, the
artifact root must not exist. Run this one repository-owned seal command from
the successor composition:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=seal-manifest \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLateHorizonPerf.integration.test.ts --retry=0
```

Seal mode uses only the frozen absolute paths and identities in this document.
It invokes no measured root or timer. It exclusively creates the artifact
root, exclusively writes `manifest.json` under the raw transport rules, then
reopens and verifies it. Failure preserves whatever evidence was created and
does not delete, clean, overwrite, or reuse the root. A second seal attempt
must fail because the root exists.

After sealing and before Sol review, run this exact check-only command from the
successor composition, substituting only the reviewed 64-hex raw manifest hash:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=check-only \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730/manifest.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST_SHA256=<64-lowercase-hex> \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLateHorizonPerf.integration.test.ts --retry=0
```

Check-only accepts no `OUT` value. It performs zero paired-child observer
spawns, zero input-copy or output creation, zero measured-root calls, and zero
timer calls. The outer pnpm/Vitest process chain is the operator command, not a
harness spawn. Inside the harness, only read-only `git` subprocesses are
permitted.

One live composition-identity pass uses exactly six Git subprocesses per
composition:

1. `git rev-parse --show-toplevel`;
2. one `git rev-parse` for `HEAD`, `HEAD^{tree}`, parent revision, and parent
   tree;
3. `git status --porcelain=v1 --untracked-files=all`;
4. `git diff --name-only <parent>..HEAD`;
5. `git merge-base --is-ancestor HEAD <local-main-revision>`;
6. one `git rev-parse` containing all twelve `HEAD:<path>` blob arguments.

The before/after check for two compositions therefore permits and requires
exactly 24 Git subprocesses. A wrapper counts every internal spawn, rejects any
non-`git` executable or non-allowlisted argv, and asserts the exact count. File
SHA-256 and byte lengths use direct filesystem reads. Check-only records
artifact-root entry names/file-byte hashes and both identities before manifest
validation, then proves those exact observations are unchanged afterward.

## Literal outer command

The command runs from the immutable successor composition. These are the only
operator-supplied values:

```sh
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MODE=paired-diagnostic \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730/manifest.json \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_MANIFEST_SHA256=<64-lowercase-hex> \
MBD_ECON_LATE_HORIZON_HISTORY_PERF_OUT=/private/tmp/mbd-goal32-rph-diagnostic-5a4eb60-20260730/rph-receipt.json \
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

- spawn `cwd` equal to that descriptor's verified `rootRealpath`;
- synchronous completion before the next ordinal;
- `stdio` captured as raw bytes;
- nonzero exit, signal, spawn error, or missing output treated as invalid
  evidence and terminal failure.

Vitest reporter stdout/stderr may be captured for diagnostics but is never
parsed, hashed, or admitted as evidence. The child test proves
`git rev-parse --show-toplevel` equals the descriptor `rootRealpath`, even when
pnpm/Vitest selects `apps/web` as the package process CWD.

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

The child's only admitted evidence channel is exclusive creation of its
descriptor's output file. Reporter or console output is non-evidence; it cannot
repair or replace a missing or invalid receipt.

## Output and copy safety

Before seal mode, the canonical artifact root must be absent. Seal mode creates
it exclusively and never reuses or cleans it. After sealing, the manifest path
is an absolute, regular, non-symlink file outside both repositories and every
evidence/input source root. Its parent is the canonical artifact root.

These nine direct children of the artifact root must be absolute, pairwise
distinct from each other and the manifest, outside both repositories and every
evidence/input source root, non-symlink at every existing ancestor, and absent
before orchestration:

- four input copy paths, one per variant/data-age pair;
- four child output paths;
- one reducer output path.

The artifact root must contain exactly the sealed manifest before the run.
There is no cleanup, deletion, overwrite, or reuse path. The outer `MANIFEST`
must exact-equal `outputs.manifestPath`; outer `OUT` must exact-equal
`outputs.reducerOutputPath`. Input copies use exclusive creation, preserve
exact source bytes, are made read-only before child spawn, and are rehashed
before and after the child. Output files use exclusive creation and are
reopened by the orchestrator as regular non-symlink files.

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

The raw timer is `process.hrtime.bigint()`. For each root, read it once
immediately before and once immediately after the exact invocation; compute
`elapsedMs = Number(end - start) / 1_000_000`. No nested or overlapping timer
is permitted.

`checkpoint` key order:

`dataAge, inputRawSha256, inputEnvelopeDigest, snapshotSerializedDigest,
preStateDigest, preRngDigest`.

`snapshotSerializedDigest = digestV1(preObservationSnapshot)`, where
`preObservationSnapshot` is the exact result of the one pre-timing
`exportGameSnapshot(state)` call.

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
- each of the four `*Digest` fields: the corresponding verified child
  `receiptDigest`;
- `cap`: `2040000`;
- `H`: `1938000`;
- `D15 = floor(baselinePost15Total - successorPost15Total)`;
- `D30 = floor(baselineSeason30InputTotal - successorSeason30InputTotal)`;
- `R = 22 * D15 + 16 * D30`;
- `P = 2948890 - R`;
- `result`: exactly `PASS` or `FAIL`; it is `PASS` only when `D15 >= 0`,
  `D30 >= 0`, `R >= 1010890`, and `P <= H`, otherwise `FAIL`.

Each total is the raw sum of the four root `elapsedMs` values before flooring.
A finite negative delta is valid measured evidence and produces a truthful
terminal `FAIL` receipt. Only malformed, non-finite, identity-invalid, or
semantically mismatched evidence produces no reducer receipt. `receiptDigest`
is `digestV1` over all preceding keys.

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
6. the exact check-only command passes with zero paired-child observer spawns,
   input copies, outputs, measured-root calls, or timers; permits exactly the
   24 allowlisted Git identity subprocesses; and proves identical manifest,
   artifact-root entries/bytes, and live worktree identities before/after;
7. independent Sol review of the exact composition commits, manifest,
   raw manifest hash, helper projections, tests, and literal command returns
   zero actionable P0-P2 findings.

Only that verdict changes this status from execution closed to the single
authorized no-retry paired diagnostic.
