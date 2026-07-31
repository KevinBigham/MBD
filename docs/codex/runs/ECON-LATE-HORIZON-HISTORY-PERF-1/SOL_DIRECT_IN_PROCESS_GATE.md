# Sol Direct In-Process Gate — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `EXECUTED — IMPORT GREEN — R/P/H RED — NO RETRY — ADMISSION CLOSED`

## Decision

Permanently abandon the custom proof manifest, child output pathname,
held-descriptor publisher, reducer file, recovery-lineage, and semantic-root
machinery. The functional simulation freeze remains
`5a4eb60f8b1890803117a84a613d43af605f47dc`, independently reviewed
`MERGE_READY 0/0/0`. The exact landable source revision is superseded by the
bounded build-only addendum at
`85310795ef3ef13118eb75386a0864d270ace37c`, tree
`8ce776cc7d84c8872de807510d1968a136bee773`, also independently reviewed
`MERGE_READY 0/0/0`.

This changes only proof mechanism. Gameplay, RNG, save v35, receipt facts,
performance formulas, caps, retry count, roadmap ownership, R41 prohibition,
and Item-19 closure remain unchanged.

## Exact proof-only boundary

Use fresh clean detached roots:

- baseline `/private/tmp/mbd-goal32-direct-baseline-505cfdf` at
  `505cfdf7c3c11e0cb821bea0716641dbcb787555`;
- successor `/private/tmp/mbd-goal32-direct-successor-7cfda113` at
  `7cfda1134cd6f7458f906018a23461ba6a7a97d1`.

One Terra/high writer changes only
`apps/web/src/workers/econLongSoak.test.ts` in the clean successor proof root.
The canonical test remains behaviorally unchanged. No production file, helper,
config, dependency, receipt key, or second test path may change.

## Import-resolution probe

Before simulation or timing, one opt-in `import_probe` invocation must prove
that isolated baseline and successor contexts resolve their own worker modules
and their own `@mbd/sim-core` package. It emits no file and calls no simulation
or timer.

```sh
MBD_GOAL32_DIRECT_MODE=import_probe \
MBD_GOAL32_BASELINE_ROOT=/private/tmp/mbd-goal32-direct-baseline-505cfdf \
MBD_GOAL32_SUCCESSOR_ROOT=/private/tmp/mbd-goal32-direct-successor-7cfda113 \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLongSoak.test.ts \
  --retry=0 --bail=1 -t "Goal 32 direct"
```

Failure stops this route. Do not add another loader, file, or composition.

## Direct diagnostic contract

Generate exactly four descriptors from one ordered tuple:

1. baseline / post15;
2. successor / post15;
3. baseline / season30Input;
4. successor / season30Input.

For each isolated context:

1. verify the exact clean Git HEAD/tree and frozen production-file hashes;
2. authenticate the supplied checkpoint raw hash and envelope;
3. import a structured clone through that composition's `snapshot.ts`;
4. capture pre-state and pre-RNG digests;
5. call once and in order:
   - `buildFreeAgencyPayrolls(state, 'autonomous_league')`;
   - `deduplicateNews(state.news)`;
   - `recordProspectBondDebuts(state)`;
   - `applySeasonEndPlayerMicroArcMoments(state)`;
6. time only those four non-overlapping roots with
   `process.hrtime.bigint()`;
7. prove exact factual output, final snapshot, state, and RNG parity before
   emitting one strict-key stdout record containing only digests and finite
   elapsed values;
8. recheck clean unchanged Git identity.

The parent accepts exactly one record per descriptor and one final strict-key
summary. No files are created. Missing, duplicate, reordered, extra,
non-finite, negative, identity-swapped, or semantically changed observations
reject. Named negative controls prove missing/reordered roots, swapped identity,
and altered semantic digest fail.

Authenticated inputs:

- post15 `/tmp/mbd-goal31-direct-proof-2f3329b-20260730/season15.json`, raw
  `043595c3bd9d557f520b438de48f11edd8d49e926d3d23e9c449c45441500d3e`,
  envelope
  `a4e66914ab270f761fa1b0c027c53c97f9971720f7f36d4680aa53e512c85bca`;
- season30Input
  `/tmp/mbd-goal31-direct-proof-2f3329b-20260730/season29.json`, raw
  `3a0160764d0899706c4d940ab30f238673e8a7c8ab39a6a5adc589cf93b256d3`,
  envelope
  `4664509f1f94d567f7518c1521cb2756cf938eaac318905fde33061dcd3f47e0`.

## Pre-timing gates

After the import probe, run the focused test and affected web typecheck with
retries disabled. One independent Sol/xhigh review must return
`MERGE_READY`, actionable P0/P1/P2 `0/0/0`.

Writer budget: one implementation pass and at most one correction limited to
static compilation/import wiring. A repeated import, identity, semantic, or
review defect stops before timing. Source freezes after review.

## One no-retry R/P/H diagnostic

```sh
MBD_GOAL32_DIRECT_MODE=rph \
MBD_GOAL32_BASELINE_ROOT=/private/tmp/mbd-goal32-direct-baseline-505cfdf \
MBD_GOAL32_SUCCESSOR_ROOT=/private/tmp/mbd-goal32-direct-successor-7cfda113 \
MBD_GOAL32_POST15=/tmp/mbd-goal31-direct-proof-2f3329b-20260730/season15.json \
MBD_GOAL32_SEASON30_INPUT=/tmp/mbd-goal31-direct-proof-2f3329b-20260730/season29.json \
pnpm --filter @mbd/web exec vitest run \
  src/workers/econLongSoak.test.ts \
  --retry=0 --bail=1 -t "Goal 32 direct"
```

```text
D15 = floor(baseline15Total - successor15Total)
D30 = floor(baseline30Total - successor30Total)
R = 22 * D15 + 16 * D30
P = 2,948,890 - R
H = 1,938,000
```

Pass requires `D15 >= 0`, `D30 >= 0`, `R >= 1,010,890`,
`P <= 1,938,000`, exact factual/state/RNG parity, and clean unchanged
composition identities. Any failure consumes the diagnostic and stops without
retry.

## One final admission

Only a green diagnostic opens one execution of the existing canonical primary
seasons 1–30 plus replay seasons 16–30 test:

```sh
/usr/bin/time -p env \
  MBD_ECON_LONG_SOAK=1 \
  MBD_ECON_LONG_SOAK_MODE=diagnostic_inherited_candidates \
  MBD_ECON_LONG_SOAK_SEED=7111 \
  MBD_ECON_LONG_SOAK_SOURCE_REVISION=<exact-proof-only-commit> \
  pnpm --filter @mbd/web exec vitest run \
    src/workers/econLongSoak.test.ts \
    --retry=0 --bail=1 -t "runs exactly one allowlisted seed"
```

Admission requires the exact valid receipt, state, RNG, round-trip,
population, season, and byte-exact replay facts; no retry/flaky classification;
adjusted external wall `real_ms + 10 <= 2,040,000`; and the unchanged
`2,400,000ms` test timeout. Failure stops without reinterpretation or rerun.

## Landing boundary

The proof-only `econLongSoak.test.ts` change never lands. After a green
admission, run the frozen source gates on the clean landable Goal-32 source,
one final Sol review, Luna closeout, exact staging, intentional commit, and
local-main fast-forward. Remote push, deployment, release, R41, custom recovery
machinery, and Item 19 remain closed.

## Terminal import-probe stop

Status: `ROUTE_STOPPED — ONE-SHOT IMPORT PROBE EXHAUSTED`

The one authorized probe failed before either protected module resolved:

```text
Cannot find package 'vite' imported from
/private/tmp/mbd-goal32-direct-baseline-505cfdf/apps/web/vite.config.ts.timestamp-…mjs
```

The clean baseline root had no installed dependencies. This is a verification
environment defect, not a production or simulation defect. Ordinary focused
tests and successor typecheck were green; no simulation, timer, artifact,
`R/P/H` diagnostic, or final admission ran.

The exact import-probe section above made any failure terminal. Its narrower
one-shot rule overrides the general static import-wiring correction allowance.
Do not install dependencies, rerun the probe, edit the candidate, add a loader,
file, composition, root, or lineage, or execute timing under this route.
Preserve the one-file candidate and failure as evidence. Continuing requires a
new bounded oracle expressly authorizing dependency preparation before one
genuinely fresh probe; standing authority alone does not waive this retry cap.

## Post-stop static candidate review

Status: `BLOCK — P0/P1/P2 0/8/2 — CANDIDATE CANNOT BE RETRIED`

`SOL_DIRECT_CANDIDATE_REVIEW.md` records the full read-only review. Dependency
preparation alone cannot reopen these bytes: checkpoint authentication must
fail because it omits snapshot from the producer's envelope projection, and
the `rph` lane contains no `R/P/H` calculation or threshold. Six additional P1
and two P2 proof defects remain.

Any future oracle must authorize a fresh dependency-prepared pair, one
corrected one-file candidate closing the complete review, and static Sol
`0/0/0` before the sole fresh import probe. The stopped candidate may not be
edited, installed, executed, or used as that fresh route.

## Authorized fresh successor addendum

Status: `AUTHORIZED_PREEXECUTION — STATIC REVIEW REQUIRED BEFORE ONE PROBE`

Kevin's reaffirmed standing authority grants the complete future oracle above.
This addendum does not reopen the terminal route or its missing temporary
checkout. It creates one distinct route with persistent roots:

- baseline:
  `/Users/kevin/Downloads/MBD-goal32-direct-baseline-505cfdf-fresh` at exact
  `505cfdf7c3c11e0cb821bea0716641dbcb787555`;
- successor:
  `/Users/kevin/Downloads/MBD-goal32-direct-successor-85310795-fresh` at a
  fresh clean composition rooted in exact landable source
  `85310795ef3ef13118eb75386a0864d270ace37c`; its exact commit/tree must be
  frozen before the proof writer starts;
- external cache/temp root:
  `/Users/kevin/.codex/tmp/mbd-goal32-direct-fresh-20260731`, absent before
  preparation and never admitted as evidence.

Before either composition is imported:

1. create each checkout cleanly and verify exact HEAD/tree;
2. install separately with the frozen lockfile and the repository's declared
   package manager;
3. verify the install changed no tracked or non-ignored untracked repository
   path; lockfile-pinned ignored dependency artifacts such as `node_modules`
   are expected and are never admitted as evidence;
4. verify Vite, Vitest, the worker module, and the workspace sim-core package
   resolve from each root without loading the game module;
5. bind exact source-freeze production hashes and exact successor candidate
   file/diff hashes;
6. redirect Vite cache/temp output outside both repositories and prove a
   no-import dry preflight leaves both roots unchanged.

Exactly one Terra/high writer may change only successor
`apps/web/src/workers/econLongSoak.test.ts`. The candidate must close all ten
findings in `SOL_DIRECT_CANDIDATE_REVIEW.md`. Its collector must admit one
strictly framed record per ordered descriptor only after exact identity,
checkpoint, pre-state, pre-RNG, round-trip, factual, final-state, and final-RNG
validation. The `rph` summary must compute and enforce the exact frozen
`D15/D30/R/P/H` formulas. Hostile controls must enter the real collector with
otherwise-valid records. Ordinary mode must remain inert.

One independent Sol/xhigh static review of the exact one-file diff must return
actionable P0/P1/P2 `0/0/0` before any import probe. Only then may the route run
exactly one no-simulation/no-timer/no-evidence-output probe. A probe failure is
terminal for these fresh bytes. A green probe opens the focused test and web
typecheck. Before the still-unspent diagnostic, locate exact checkpoint copies
matching the frozen raw/envelope hashes or perform one canonical
repository-owned recapture into a persistent external evidence root. The
recapture is input construction, not diagnostic/admission execution, and must
bind the frozen seed, producer, state, RNG, season, and envelope contracts. A
green authenticated-input gate then opens the diagnostic and conditional
admission already frozen above. No retry, second probe, custom artifact
machinery, R41, fifth production seam, cap change, gameplay/RNG/save/receipt
change, or Item 19 is opened.

## Terminal execution result

The fresh persistent implementation closed static review at actionable
P0/P1/P2 `0/0/0`. Its sole import probe, focused test, typecheck, exact
season-15/season-29 recapture, and all hostile input validations passed. The
single diagnostic then failed with `D15=5,543ms`, `D30=9,377ms`,
`R=271,978ms`, `P=2,676,912ms`, and `H=1,938,000ms`.

The candidate is stopped. No PASS summary, retry, or final admission ran.
`DIRECT_PROOF_DIAGNOSTIC_STOP.md` supersedes every earlier preexecution status
for this route while preserving those earlier sections as chronological
evidence.
