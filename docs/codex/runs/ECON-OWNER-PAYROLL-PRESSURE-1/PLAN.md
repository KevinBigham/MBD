# ECON-OWNER-PAYROLL-PRESSURE-1 — Living Plan

## Objective and player outcome

Implement [Goal 24](../../goals/24_ECON_OWNER_PAYROLL_PRESSURE_1.md): the player
can see one owner-specific payroll floor, soft ceiling, and exact tax line, and
crossing those advisory lines produces durable factual pressure rather than a
contradictory display or hidden hard rejection.

## Work class and route

- Class: HIGH_RISK / HEAVY because the slice crosses canonical contract-derived
  payroll, owner firing/narrative, exact-save signing, and multiple route DTOs.
- Parent thread is the sole writer. Three read-only source/test/risk maps are
  the architecture artifact; one read-only final adversarial review follows
  source freeze. No model-routed relay claim is made.
- Focused loop: pure policy/tax tests; worker policy/narrative; exact-save
  signing/snapshot; Finance/Dashboard/Front Office/Offseason; affected package
  typecheck.
- Source freeze: one bounded study, then root typecheck/full tests/build/PWA/
  determinism, fresh production owner-payroll journey, and reload-smoke.
- At most two bounded correction loops before a reproducible P0/P1 requires a
  smaller split.

## Live source truth

- Root/worktree: `/Users/kevin/Downloads/MBD-owner-payroll-14`
- Branch/base: `codex/owner-payroll-pressure-14` at
  `5a333890067ba7110d49587f8d1bfebef34f6751`; worktree began clean.
- Package manager: `pnpm@9.15.4`. Root scripts are `turbo typecheck`,
  `turbo test`, `turbo build`, and `pnpm verify:determinism`.
- GameSnapshot remains v34; Dexie remains v6.
- Baseline: sim-core 115 focused tests, web 235 focused tests, sim-core
  typecheck, and web/e2e typecheck all passed on the exact base.
- Confirmed contradictions and frozen decisions are recorded in
  [SOURCE_TRUTH.md](./SOURCE_TRUTH.md).

## Scope and invariants

- Owned: one sim-core policy, one worker adapter/narrative seam, canonical tax
  basis corrections, existing financial/owner/offseason UI, focused tests,
  bounded study, exact-save/browser proof, and slice docs.
- Deferred: cash/revenue, new owner distribution, CPU owner strategy, contract
  admission redesign, difficulty redesign, 30-season soak, schema/route/dependency
  additions, and item 15+ work.
- The worker stays canonical; queries remain pure; no bare `Math.random()`.
- Total payroll owns owner pressure; MLB plus dead money owns tax. A soft line
  never becomes a hard denial.
- Narrative dedupe must survive exact retry/reload without applying owner-state
  pressure twice. Older saves retain facts and receive no fabricated history.
- Only item-14 paths may be staged. Protected main-checkout user changes remain
  byte-identical and unstaged.

## Design decision

Derive policy rather than persist it. Sim-core receives owner archetype, raw
source-owned soft ceiling, total payroll, and tax payroll; it returns explicit
bands, rooms/overages, threshold, and assessment. The worker is the only adapter
from live state and reconciles all 32 teams only on the exact incomplete-to-
complete offseason transition. Stable season/team receipt flags make the annual
outcome once-only. Existing owner evaluation/firing remains untouched, so
descriptive pressure cannot double-punish the player.

Rejected alternatives: persisting a pressure ledger (unnecessary migration),
taxing minor salaries (wrong basis), debiting tax from nonexistent cash (item
15), making soft lines hard gates (scope/behavior regression), changing owner
distribution (item 51), or emitting stories from queries (mutation on read).

## Milestones

### 1. Pure policy and canonical tax truth

- [x] Add derived policy types/classifier and exports.
- [x] Prove three archetypes, exact boundaries, canonical tax basis, progressive
  tiers, deterministic/no-RNG behavior, and advisory semantics.

Gate: OPP-1/2/3 pure tests and sim-core typecheck green.

### 2. Worker adapter and once-only consequence

- [x] Derive policy for any team from canonical live state and effective cap.
- [x] Reconcile all 32 teams at exact offseason completion; publish one factual
  user owner story/briefing with stable IDs and no owner-state delta.
- [x] Prove advance/skip equivalence, retry/resume/import/reload dedupe,
  no transient floor pressure, and all-32-team consistency.

Gate: OPP-4/5 worker, snapshot, and narrative tests green.

### 3. Player-facing truth and exact persistence

- [x] Feed one DTO to Finance, Dashboard, Front Office, and Offseason; remove
  hardcoded threshold and ambiguous room labels.
- [x] Correct live owner money formatting and spending-willingness typing.
- [x] Prove legal contract outcomes may cross soft/tax lines, retain their exact
  contract snapshot, and the later annual reconciliation persists without
  replaying either contract work or receipts.

Gate: OPP-3/4/6 focused UI, exact-save, and affected typecheck green.

### 4. Bounded evidence and production journey

- [x] Run four seeds across four completed offseasons against frozen bands and
  controlled all-archetype/all-boundary micro-scenarios; record receipts,
  immutable owner/franchise/contract facts, and zero contradictions/RNG drift.
- [x] Observe the bypassed-reconciliation negative control fail, restore it,
  and rerun; retain the exact tax-basis negative control.
- [x] Fresh production browser: inspect lines, perform a public offseason
  mutation, complete the offseason through exact Advance/Skip, wait for durable
  reconciliation, verify story, hard reload, and verify singular facts at
  desktop and 375x667.

Gate: OPP-7/8/9 green with zero retry/flaky classification.

### 5. Freeze, review, and land

- [x] Run root typecheck, full tests, production/PWA build, determinism, bundle
  budget, `git diff --check`, and reload-smoke once after source freeze.
- [x] Apply `mbd-review-slice` through one read-only final review; two bounded
  correction loops closed every reported finding. Final verdict:
  `MERGE_READY`, P0/P1/P2 `0/0/0`.
- [x] Complete requirement mapping, rollback, remaining risk, calibration, and
  retrospective. Changelog and bounded roadmap/goal status follow the final
  `MERGE_READY` verdict.
- [x] Stage only item-14 paths, run cached diff checks, commit intentionally,
  and fast-forward local `main`. The exact commit is the local-history revision
  containing this report. Do not push/deploy/tag or begin item 15.

Gate: OPP-10 green, `MERGE_READY`, exact staged scope, protected files untouched.

## Acceptance and progress log

| Checkpoint | Artifact/result | Status |
| --- | --- | --- |
| Preflight | clean isolated branch; exact base/main/origin/dirty/save/package state recorded | Complete |
| Baseline | sim-core 115; web 235; affected typechecks green | Complete |
| Architecture | Goal 24, source truth, frozen semantics/bands, three read-only maps | Complete |
| Pure policy | 7/7 focused tests and sim-core typecheck green | Complete |
| Worker/persistence/UI | full focused owner surface 19 files / 91 tests; loop-2 sim 3 files / 30 and web 3 files / 20 passed plus one intentional skip; typechecks green | Complete |
| Study/negative control | final 4x4 hard band 1/1 in 516.06s with 74 taxpayer facts and zero six-surface/side-effect contradictions; bypass failed at all-32 receipt and restored green | Complete |
| Production/root gates | owner browser 1/1 in 14.2s; reload-smoke 2/2 in 5.8m; root typecheck 9/9; full tests 24 + 1 + 1,681 + 2,407; build/PWA, bundle, determinism green | Complete |
| Final review/landing | final `MERGE_READY` 0/0/0; item-only commit and local-main fast-forward containing this report | Complete |

## Decision log

1. Soft ceiling is raw advisory `payrollCap`; tax is assessment-only; difficulty
   and transaction authority do not change item-14 lines.
2. Owner stories never mutate owner state, preventing duplicate firing pressure.
3. One exact annual offseason-completion reconciliation replaces transaction
   hooks and transient mid-offseason floor pressure.
4. Existing 22/10/0 new-game owner distribution is preserved and reported;
   controlled fixtures prove penny-pincher policy without taking item 51.
5. The `$3.8B-$6.8B`, `$2.5M-$8.5M`, and `$25M-$350M` calibration bands remain
   opening-day generation gates as defined by source; annual payroll values are
   recorded rather than falsely evaluated as opening-day samples.
6. Natural annual incidence is gated by the measured-range-plus-two 4x4 bands;
   controlled crossings provide exact boundary and penny-pincher proof.
7. No schema, Dexie, route, dependency, or bundle-ceiling change is planned.
8. Owner Meeting and the Financial Playbook receive total and taxable payroll as
   separate canonical inputs; projected-tax copy never claims a carried bill.
9. Calibration receipts expose literal taxpayer facts and compare normalized
   Owner Intel with the other five policy consumers.

## Completion conditions and rollback

All OPP acceptance rows require observed focused, root, browser, and review
evidence. Completion also requires a scoped commit on local `main`, unchanged
protected user files, and no push/deploy/tag. Before commit, roll back only this
slice's owned paths; after commit, revert the single item-14 commit. With no
schema change, rollback requires no migration or history repair.
