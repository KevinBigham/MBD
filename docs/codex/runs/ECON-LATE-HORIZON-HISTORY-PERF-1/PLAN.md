# Plan — ECON-LATE-HORIZON-HISTORY-PERF-1

Status: `BLOCKED — ORACLE — one-shot direct import probe exhausted before
module resolution; all timing execution remains closed`

Size: `EXCEPTIONAL`, explicitly authorized as one bounded four-seam
prerequisite because sealed profiles prove that no one seam can recover the
unchanged forecast deficit. Maximum two implementation correction loops.

## Player story

After this lands, the player can advance a decades-old dynasty through free
agency and season rollover faster, understand the same financial and narrative
outcomes, and see the exact same state survive save/reload and the long-horizon
proof.

## Relay route

| Phase | Thread | Model / effort | Artifact | Gate |
| --- | --- | --- | --- | --- |
| Reconstruct and architecture | parent plus `/root/goal32_sol_architecture` | `gpt-5.6-sol` / `xhigh` | source truth, state boundaries, exact diagnostic | `APPROVED`, actionable P0/P1/P2 `0/0/0` after three source-grounded clarifications |
| Source mapping | `/root/goal32_source_mapper` | `gpt-5.6-terra` / `high`, read-only | exact call graphs, parity traps, helper overlap | incorporated into architecture |
| Test/risk mapping | `/root/goal32_test_risk_mapper` | `gpt-5.6-terra` / `medium`, Luna-style substitution because Luna is unavailable | tests, mutants, commands, composition risks | incorporated into architecture |
| Implementation | exactly one Terra writer | `gpt-5.6-terra` / `high` | four production seams, focused tests, negative controls | focused tests and affected typecheck green |
| Adversarial review | one independent Sol reviewer | `gpt-5.6-sol` / `xhigh` | line-level source/direct-proof verdict | zero actionable P0–P2 |
| Closeout | one Luna role when available; otherwise labeled manual fallback | medium | full gates, docs, exact staging, local landing | all frozen gates green |

Only the implementation role may write production/test source. No two writers
may overlap.

## Landable path allowlist

Production:

- `packages/sim-core/src/finance/tradeFinance.ts`
- `packages/sim-core/src/finance/contracts.ts`
- `packages/sim-core/src/finance/index.ts`
- `packages/sim-core/src/index.ts`
- `apps/web/src/workers/sim.worker.tradeFinance.ts`
- `apps/web/src/workers/sim.worker.helpers.ts`
- `packages/sim-core/src/narrative/newsFeed.ts`
- `apps/web/src/workers/sim.worker.farm.ts`
- `apps/web/src/workers/sim.worker.narrativeFarm.ts`
- `apps/web/src/workers/sim.worker.milestones.ts`
- `apps/web/src/workers/sim.worker.ceremony.ts`

Tests:

- `packages/sim-core/tests/finance.test.ts`
- `packages/sim-core/tests/narrative.test.ts`
- `apps/web/src/workers/sim.worker.tradeFinance.test.ts`
- `apps/web/src/workers/sim.worker.test.ts`
- `apps/web/src/workers/sim.worker.farm.performance.test.ts`
- `apps/web/src/workers/sim.worker.narrativeFarm.performance.test.ts`
- `apps/web/src/workers/sim.worker.milestones.test.ts`
- `apps/web/src/workers/sim.worker.ceremony.test.ts`

Goal/run/status/changelog documentation is also landable. In
`sim.worker.helpers.ts`, the landable change is limited to
`buildFreeAgencyPayrolls`, its declaration-only named module export for the
repository-owned proof, and the immediate same-day payroll call site. The
export is not added to Comlink or a package/public API.

## Disposable composition allowlist

Each of the two non-landed diagnostic compositions may change exactly:

- the classified `apps/web/src/workers/sim.worker.helpers.ts` proof helper;
- `apps/web/src/workers/sim.worker.autonomousOffseason.test.ts`;
- `apps/web/src/workers/econLongSoak.metrics.ts`;
- `apps/web/src/workers/econLongSoak.metrics.test.ts`;
- `apps/web/src/workers/econLongSoak.receipts.ts`;
- `apps/web/src/workers/econLongSoak.receipts.test.ts`;
- `apps/web/src/workers/econLongSoak.test.ts`;
- `apps/web/src/workers/econLongSoak.testSupport.ts`;
- `apps/web/src/workers/econLongSavePerf.integration.test.ts`;
- `apps/web/src/workers/econLateHorizonPerf.integration.test.ts`;
- `apps/web/src/workers/econMilestonePathCpuProfile.ts`;
- `apps/web/src/workers/econMilestonePathCpuProfile.test.ts`.

The eleven proof/observer paths must be byte-identical between the two
compositions. Neither composition may become an ancestor of local `main`.

## Execution plan

### Phase 0 — Goal-31 closeout

- [x] Rebuild the exact 17-path documentation-only stop record in a fresh
      worktree.
- [x] Mechanically exclude all four Goal-31 source/test blobs.
- [x] Commit `198759d88815d977f47672f7e1f5f0cb5ee4f0aa`.
- [x] Fast-forward local `main`; preserve original source/proof worktrees.
- [x] Do not push or release.

### Phase 1 — Goal-32 architecture

- [x] Create clean Goal-32 branch from exact local main.
- [x] Record Git, source, test, save/schema, and failed-proof truth.
- [x] Freeze exact APIs, mutation boundaries, helper topology, parity fixtures,
      negative controls, diagnostic schema/formula, and stop rules.
- [x] Obtain Sol architecture verdict with zero actionable P0–P2.
- [x] Commit the docs-first checkpoint as `fdcb1375b0b47894085070e52113f3d368c99b02`.

### Phase 2 — Focused implementation

The same Terra writer performs all four checkpoints, in order:

1. pure league payroll projection, worker wrapper, same-day helper use;
2. decorated news deduplication;
3. first-write-wins prospect lookup;
4. current-season player-indexed micro-arc facts.

After each checkpoint:

- run the smallest semantic regression;
- run its exact named-function structural guard;
- run the deliberate mutant once and record its expected failure;
- restore the correct source and rerun green;
- run affected package typecheck when the checkpoint changes an exported API.

No full repository suite runs during these focused loops. Maximum two
correction loops; an architecture defect returns to Sol.

### Phase 3 — Focused freeze

Run once with retries disabled:

```sh
pnpm --filter @mbd/sim-core exec vitest run \
  tests/finance.test.ts tests/narrative.test.ts --retry=0

pnpm --filter @mbd/web exec vitest run \
  src/workers/sim.worker.tradeFinance.test.ts \
  src/workers/sim.worker.test.ts \
  src/workers/sim.worker.farm.performance.test.ts \
  src/workers/sim.worker.narrativeFarm.performance.test.ts \
  src/workers/sim.worker.milestones.test.ts \
  src/workers/sim.worker.ceremony.test.ts --retry=0

pnpm --filter @mbd/sim-core run typecheck
pnpm --filter @mbd/web run typecheck
pnpm typecheck
```

Then create the source-freeze commit and record its revision, tree, clean
state, exact diff allowlist, and SHA-256 for every changed path. Any later
landable source/test change invalidates downstream diagnostic receipts.

Completed:

- production source commit:
  `c900ffc084812444d3553b1f08ad0e985345181b`;
- test-only final correction:
  `5a4eb60f8b1890803117a84a613d43af605f47dc`;
- final tree:
  `23aa4bf628f353775b445b1c4963b9c0d21d3057`;
- final Sol verdict: `MERGE_READY`, P0/P1/P2 `0/0/0`;
- focused tests: sim-core 64 and web 225 passed, retries disabled;
- direct package typechecks and root typecheck 9/9 passed;
- all four deliberate mutants failed at the intended guard and were restored.

### Phase 4 — Paired proof compositions

Create two fresh immutable, non-landed compositions:

1. stopped Goal-31 source plus a reviewed baseline autonomous helper that keeps
   payroll unoptimized;
2. Goal-32 source freeze plus a reviewed combined autonomous helper that keeps
   the new per-day projection in both interactive and autonomous modes.

Generate one identity manifest binding bases, trees, clean states, all path
hashes, helper projections, exact overlapping functions, three helper parity
receipts, proof-path byte identity, authenticated post-season-15 and
season-30-input bytes, exclusive outputs,
process order, and mechanical non-ancestry from local main.

The exact command, manifest/receipt key order, fail-closed runner contract, and
pre-execution negative controls are frozen in `DIAGNOSTIC_AUTHORITY.md`.

Completed:

- final baseline composition:
  `505cfdf7c3c11e0cb821bea0716641dbcb787555`, tree
  `0640b942317d7bfacebb33b2b5befa20e90cd746`;
- final successor composition:
  `7cfda1134cd6f7458f906018a23461ba6a7a97d1`, tree
  `36b8f2fdef9adb68b7516441ece0a3e9ad09a04e`;
- all eleven non-helper paths are byte-identical;
- final `-r2` parity receipts are immutable and green;
- replacement `-r2` manifest is sealed with raw SHA-256
  `15e8d9e6c81aac8da253a3076dd7a9414f2e8a42beea3d02feea02992e7d5995`
  and internal digest
  `57d0ba66a26dca3f5dcd03a8dfeddb8f06aefd36a74232456d4bec0f9fd8340b`;
- check-only passed 15 tests with one unrelated Goal-31 gated skip and ran no
  diagnostic child, measured root, or timer.

### Phase 5 — Independent Sol review

Review the exact frozen landable diff, both composition diffs, helper
projections, identity manifest, negative controls, and diagnostic reducer.
Actionable P0–P2 must be zero before any diagnostic process runs.

Current state: the rejected `-r1` review returned `FIX_AND_REVIEW`, P0/P1/P2
`0/2/1`. Correction loop 3 produced `-r2`; fresh review also returned
`FIX_AND_REVIEW`, P0/P1/P2 `0/2/0`. It found a remaining cross-read/root
replacement window and proved that the successor cannot execute Phase 7
because its forecast/admission lanes still require extinct Goal-31 identity.
No diagnostic ran.

The repeated provenance class triggers the stop-loss. A derivative `-r3`
artifact is prohibited. Architecture must replace copied identity and
multi-read admission with one generated Goal-32 identity/buffer boundary, and
an explicit authority exception is required before correction.

The exact five-path design, hostile controls, semantic artifact root,
check-only gates, stop conditions, and oracle request are frozen in
`STOP_LOSS_PROPOSAL.md`. Kevin authorized it on 2026-07-31 through the
standing grant recorded in `docs/codex/STANDING_USER_AUTHORITY.md`.

### Phase 5b — Causal candidate stop and direct simplification

The causal proof-boundary implementation exhausted its one correction with
live publishers still bypassing its proposed authority boundary. It is
permanently stopped and preserved dirty, evidence-only. Its semantic root was
never created and no measurement lane ran.

The replacement is frozen in `SOL_DIRECT_IN_PROCESS_GATE.md`. One Terra/high
writer changes only repository-owned `econLongSoak.test.ts` in a fresh clean
successor proof worktree. The existing canonical test remains behaviorally
unchanged. The new opt-in lane:

- derives the four ordered baseline/successor and post15/season30Input
  descriptors from one tuple;
- verifies clean native Git HEAD/tree and frozen production hashes;
- authenticates the exact Goal-31 checkpoint bytes;
- loads each composition in its own module context;
- calls each of the four real production roots exactly once and in order;
- emits strict in-memory digest/timing records and no files;
- proves missing/reordered roots, swapped identity, and changed semantic facts
  reject.

Before timing, run one no-simulation import probe, focused tests, affected web
typecheck, and one independent Sol/xhigh review. Any repeated import/identity
defect or actionable review P0–P2 stops. No custom artifact protocol or new
semantic root may be introduced.

The one import probe failed before module resolution because the clean baseline
root lacked its lockfile Vite dependency. Sol classified this as a
verification-environment defect and `ROUTE_STOPPED`: the gate's exact one-shot
failure clause overrides its general static import-wiring correction budget.
The direct candidate is quarantined and Phase 6 remains closed. No dependency
installation, probe rerun, source correction, loader, composition, diagnostic,
or admission is legal without a new bounded oracle explicitly reopening one
fresh, dependency-prepared probe.

### Phase 6 — One diagnostic

Run one direct command, no retry, with four isolated module contexts in exact
order:

1. baseline against post-season-15 data;
2. successor against post-season-15 data;
3. baseline against season-30-input data;
4. successor against season-30-input data.

Measure only the four non-overlapping outer roots:

- the common outer `buildFreeAgencyPayrolls` operation, including all 32
  autonomous teams and the successor batch-projection replacement cost;
- `deduplicateNews`;
- `recordProspectBondDebuts`;
- `applySeasonEndPlayerMicroArcMoments`.

Reject missing, extra, nested, overlapping, reordered, negative, or non-finite
observations. Sum raw observations before flooring to integer milliseconds.

```text
D15 = baseline15 - successor15
D30 = baseline30 - successor30
R = 22 * D15 + 16 * D30
P = 2,948,890 - R
H = floor(2,040,000 * 0.95) = 1,938,000
```

Pass only if both deltas are nonnegative, `R >= 1,010,890`, and
`P <= 1,938,000`. Failure stops this goal without retry, final forecast, or a
fifth seam.

### Phase 7 — Conditional final proof

Only after a green diagnostic, run the existing canonical test's exact primary
seasons 1–30 plus replay seasons 16–30 once, with retries disabled. Convert
`/usr/bin/time -p` real time to milliseconds, add the unchanged conservative
`10ms` process adjustment, and require adjusted wall `<= 2,040,000ms`. The
existing `2,400,000ms` test timeout remains unchanged. Failure stops without
reinterpretation or rerun.

### Phase 8 — Final gates and landing

Only after successful admission:

```sh
pnpm typecheck
pnpm test
pnpm verify:determinism
pnpm build
pnpm e2e:reload-smoke
```

Run required production-browser/reload proof on the landable source revision,
not a disposable composition. Then:

- final Sol review with zero actionable P0–P2;
- update `SOURCE_TRUTH.md`, `PLAN.md`, `CURRENT.md`, `COMPLETION.md`,
  `CHANGELOG.md`, and the roadmap ledger;
- verify exact staged scope and `git diff --cached --check`;
- commit intentionally and fast-forward local `main`;
- preserve remote/release state;
- resume item 18 from live source; keep item 19 closed.

## Rollback

The Goal-32 source commit is one isolated descendant of the documentation-only
stop record. Rollback is removal of that commit before local-main landing, or a
normal future revert after landing. Never alter the stopped Goal-31 worktree,
proof composition, or evidence root. Disposable diagnostic compositions are
never merged.
