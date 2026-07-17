# ECON-LATE-HORIZON-PERF-1 Execution Plan

Status: `IN PROGRESS — disposable late-checkpoint adapter`.

## Objective and player outcome

Make the trustworthy 30-season economy proof finish within its existing hard
ceiling by removing one newly measured late-save algorithmic cost without
changing a single game, contract, player, save, RNG draw, or receipt fact.

Active goal: `docs/codex/goals/30_ECON_LATE_HORIZON_PERF_1.md`.

## Live source truth

See `SOURCE_TRUTH.md`. This branch is cleanly based on local `main` at
`cd5e9191118aee76d22d66b7ffed32fed748cae8`; Goal 18 remains isolated and
unlanded. GameSnapshot is v35, Dexie is v6, and the core gzip budget has zero
headroom.

## Scope and non-goals

- Owned docs: Goal 30, this run directory, bounded campaign status,
  `CHANGELOG.md`, and later completion evidence.
- Disposable-only integration scope: Goal-18 test support and one test-only
  late-checkpoint/profile adapter in a dedicated composition worktree.
- Permanent production scope: empty until the post-profile Sol freeze.
- Conditional production candidate: `checkMilestones` plus adjacent narrative
  tests only.
- Hard cut: no Goal-18 receipt/validator/band/horizon/checkpoint/replay/timeout
  change, no schema/API/UI/dependency/gameplay/RNG/history/pruning change, no
  item 19 or broad item 98, no push/deploy/tag/release/publication.

## Behavioral invariants

- Worker remains canonical; timing cannot influence or persist simulation.
- Same ordered inputs produce identical moments, prose, IDs, state, and RNG.
- Duplicate player IDs preserve the existing first-match lookup behavior;
  missing players still render `Unknown`.
- Exact continuous and resumed season-30 facts agree.
- Raw artifacts stay outside Git and are admitted before singleton state.
- The unchanged 40-minute in-process run remains the only sufficiency proof.

## Design decision

Create Goal 30 rather than amend Goal 29. Goal 29's two-loop failure is durable
history; relabeling another patch as its correction would erase the evidence.

Generalize only the disposable Goal-29 adapter to derive one authenticated
season-29 state from the retained season-15 artifact. Profile season 30 in fresh
processes. If the conditional milestone lookup owns at least 25% of the late
regular-season total, Sol may freeze an operation-local, first-occurrence-wins
index inside `checkMilestones`. Otherwise Sol must re-plan from the late
profile. No cross-call cache is allowed.

## Milestones

| # | Checkpoint | Owned files/artifact | Proving gate | Status |
| ---: | --- | --- | --- | --- |
| 1 | Reconcile source and freeze Goal-30 contract | goal/run/status docs | clean preflight; three read-only maps agree | completed |
| 2 | Build hostile disposable late-state adapter | isolated composition only | focused adapter tests; source/tree/context forgeries fail before state install | in progress |
| 3 | Create one season-29 artifact | unique `/tmp` output | exact season15→29 rows/state/RNG; stop before season30 | pending |
| 4 | Profile exact season 30 | three baseline receipts + V8 sample | path >=25%; identical semantic/call signatures | pending |
| 5 | Sol production freeze | `SOL_ARCHITECTURE_GATE.md` | exact function/file/tests and bands named | pending |
| 6 | Terra implementation and negative control | one frozen module + adjacent test | focused exactness/typecheck/bundle; mutant fails then restored | pending |
| 7 | Paired late profiles and readiness forecast | external receipts only | 3 B/C pairs; bands; `forecast <= 2_040_000ms` | pending |
| 8 | Root gates and final Sol review | frozen branch | full gates green; zero P0–P2 | pending |
| 9 | Luna closeout and local landing | docs/changelog/status/Git | exact scope; local main FF; protected dirt untouched | pending |
| 10 | One unchanged Goal-18 run | Goal-18 WIP + unique `/tmp` receipt | exact valid 30+15 receipt < 2,400s, or blocker stop | pending |

## Acceptance matrix

| Requirement | Artifact | Proof | Status |
| --- | --- | --- | --- |
| Exact season-29 identity | external checkpoint envelope | hostile admission matrix and v35 round trip | pending |
| Late path is measured | season-30 stage + CPU receipts | 3 exact baselines; >=25% attribution | pending |
| No semantic/RNG drift | paired row/state/subdomain digests | 3 B/C pairs and continuous/resumed equality | pending |
| Redundant lookup cannot return | adjacent structural negative control | old/bypass mutant fails | pending |
| Real speedup | paired receipts | CPU >=90%, combined stages >=25%, total >=15%, nonoverlap | pending |
| Production safety | focused/full/typecheck/build/PWA/bundle/determinism | zero retry, current revision | pending |
| Sufficiency | unchanged Goal-18 command | valid exact receipt under 40 minutes | pending |

## Progress log

1. Live preflight confirmed local main, Goal-18 dependency, failed log, retained
   checkpoint, protected dirt, v35/Dexie6, and exact bundle ceiling.
2. Three read-only swarm lanes returned `FREEZE_READY`, `MAP_READY`, and
   `NEW_GOAL_READY`. Requested model/effort routing was not host-pinned.
3. The conditional candidate is the repeated player-array scan in
   `checkMilestones`; production remains blocked until exact season-30 proof.

## Decision log

1. Preserve Goal 29 as blocked history; create Goal 30.
2. Persist no season-29 data in source or Goal-18 receipts.
3. Use one serial writer and one disposable composition; no overlapping writer.
4. Require 15% forecast headroom because Goal 29's paired timings varied by
   roughly 9.7% and the final run includes in-process replay/GC conditions.
5. Browser proof is not applicable because UI and persistence ownership are
   forbidden scope; exact snapshot round-trip and production PWA build remain.

## Completion conditions

All matrix rows are green; no actionable P0–P2 finding remains; staged scope is
exact; Goal 30 fast-forwards local main; protected main dirt remains untouched;
Goal 18 emits its exact unchanged seed-7111 receipt within 2,400 seconds. A
miss records a blocker and stops without retry or item 19.
