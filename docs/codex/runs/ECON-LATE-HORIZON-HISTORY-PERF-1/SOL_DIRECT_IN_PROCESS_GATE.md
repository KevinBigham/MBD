# Sol Direct In-Process Gate — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `APPROVED_SIMPLIFICATION_PLAN — 2026-07-31`

## Decision

Permanently abandon the custom proof manifest, child output pathname,
held-descriptor publisher, reducer file, recovery-lineage, and semantic-root
machinery. The production source freeze remains
`5a4eb60f8b1890803117a84a613d43af605f47dc`, independently reviewed
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
