# ECON-ARBITRATION-1 — Living Plan

## Objective and ownership

Implement [Goal 21](../../goals/21_ECON_ARBITRATION_1.md), the bounded completion
slice for TRUE GOAT roadmap item 11 only. The parent thread is the single writer.
Read-only source, test, and risk reviewers returned `FIX_BEFORE_FREEZE` with zero
P0, five P1, and three P2 findings, all incorporated below.

## Work class and evidence budget

- Class: HIGH_RISK / HEAVY because the slice crosses service-time truth,
  offseason RNG/state, worker authority, and exact persistence.
- Focused loop: pure sim-core contracts/offseason tests; worker arbitration and
  snapshot tests; exact-save coordinator/session/hook tests; route/component
  tests; affected-package typecheck.
- Source freeze: one full root typecheck/test/build/determinism pass, then one
  fresh production Playwright arbitration journey and existing reload-smoke.
- Correction budget: at most two implementation correction loops before a new
  bounded split is required for any remaining reproducible P0/P1.

## Checkpoints

### 1. Coherent service and case model

- [x] Freeze one exported 172-day service-year constant and derive arbitration
  eligibility only from `serviceTimeDays`.
- [x] Synchronize the legacy years mirror once at offseason entry; exclude
  minors and remove the broad annual organization-tenure increment.
- [x] Restrict ordinary arbitration to years 3–5 and active assigned MLB Super
  Two candidates at year two.
- [x] Floor projected/offer/ask/award facts against prior salary and keep stable
  ordering/ties.
- [x] Add failing-first tests, including contradictory-map, career-minor,
  inactive-cohort, year-six, and pay-cut negative controls.

Gate: ARB-1/2/3 pure and worker-focused tests green.

### 2. Persisted docket and once-only resolution

- [x] Add a typed docket/result lifecycle to the existing offseason envelope;
  normalize absent fields without fabricating earlier beats.
- [x] Prepare all cases/outcomes exactly once in stable team/player order and
  retain the post-preparation RNG state.
- [x] Reveal filing/exchange/hearing stages from phase day; resolve only the
  retained outcome and fence every emitted artifact by season/player receipt.
- [x] Set one-year AAV/total consistently; fix ledger winner truth and use
  neutral automatic copy.
- [x] Constrain holdouts to adverse outcomes and close them factually by the
  same offseason's spring boundary.
- [x] Prove reload/import/re-entry and user/CPU identity preserve exact docket,
  result, and RNG facts.

Gate: ARB-4/5/6/8/9 worker and compatibility tests green.

### 3. Exact-save offseason session

- [x] Add one exclusive exact-save worker session type that blocks ordinary,
  transition, and regular-sim mutation lanes.
- [x] Add a coordinator/hook for baseline export, one Advance/Skip mutation,
  exact post export, retained persistence receipt, durable-only publication,
  exact rollback before post acceptance, and same-save fail-close.
- [x] Route only offseason Advance/Skip through it; leave other established
  action lanes unchanged.
- [x] Prove a failed write followed by another click cannot move the worker,
  retry uses the same captured object without a second export/mutation, stale
  callbacks cannot publish, and app-shell mutation controls remain disabled.

Gate: ARB-7 coordinator/session/hook tests and affected web typecheck green.

### 4. Player-facing docket

- [x] Project a bounded user-team docket DTO from the worker.
- [x] Add a compact panel to the existing Offseason page with service class,
  prior salary, club figure, player figure, stage, and durable award/winner.
- [x] Correct phase copy; use semantic text/icons, keyboard-safe controls, and a
  layout that remains readable at 375×667.
- [x] Add component/route tests and bundle/lazy-shell tests if those seams move.

Gate: ARB-10 focused UI tests and desktop/mobile source inspection green.

### 5. Freeze, verify, review, and land

- [x] Run focused suites and affected-package typecheck; freeze source.
- [x] Run root typecheck, full tests, production PWA build, determinism, and
  `git diff --check`.
- [x] Run a fresh production Playwright arbitration reload journey and the
  existing reload-smoke with zero retry/flaky classification.
- [x] Apply `mbd-review-slice` adversarially. Fix every P0–P2 and recheck.
- [x] Complete requirement mapping, changelog, roadmap ledger, status receipt,
  rollback, remaining-risk, and retrospective documentation.
- [x] Stage only item-11 paths, run `git diff --cached --check`, commit with an
  intentional message, and fast-forward local `main`. Do not push/deploy/tag.

Gate: `MERGE_READY`, exact staged scope, local landing verified, protected main
checkout changes untouched and unstaged.

## Rollback

Before commit, revert only this slice's owned paths. After commit, revert the
single item-11 commit. GameSnapshot remains v34, so no save migration rollback is
expected; missing docket data continues to normalize as an honest empty/current
phase state.
