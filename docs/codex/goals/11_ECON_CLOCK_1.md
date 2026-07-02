# ECON-CLOCK-1 — The Living Contract Clock

## Objective

Make contracts expire naturally at season rollover, flow expiring players into the existing free-agency market, and resolve contract options deterministically and symmetrically — so the league economy runs on real turnover using machinery the repository already ships and tests. Today no code path ever decrements `player.contract.years` (`advanceContracts` in `packages/sim-core/src/finance/contracts.ts` is tested dead code), so free agency runs on non-tenders alone, options are decorative, every 1-year contract reads as a permanent "rental" to trade AI, and season 12 plays like season 2. Requires TRUST-A merged; stop if absent.

## Read first

- `docs/codex/CANONICAL_DIRECTION.md`
- `docs/codex/PROGRAM.md` (worktree and merge-order rules; this goal's row)
- `AGENTS.md` and `PLANS.md`
- live rollover, offseason, free-agency, finance, and trade-AI source named in the checkpoint
- `TUNING.md` and the calibration bands it mirrors

## Source-first checkpoint

Before production edits:

1. Map the real offseason sequence from source and pick the advancement seam. Per live source the offseason phase machine (`processCurrentOffseasonPhase`, `apps/web/src/workers/sim.worker.helpers.ts`) runs tender/QO/FA phases during the offseason, and `finalizeOffseasonRollover` (`apps/web/src/workers/sim.worker.actions.ts`: `developPlayer` → `reconcileDevelopmentPipeline` → `determineRetirements`) runs at the end, gated by `startNextSeason`. Two candidate seams exist: offseason entry (before the tender phase and before FA-market creation) or rollover finalization (affecting the following offseason). The behavioral requirement: each contract advances exactly once per completed season, and the offseason that processes a player's expiry must operate on the advanced value. Choose the seam from source and record the choice and rationale in the plan.
2. Enumerate ALL writers of `player.contract.years` (grep-proven in the plan). Expected classes: non-tender zeroing (`applyTenderDecisionsOnce`, `sim.worker.helpers.ts`), the Rule 5 floor (`sim.worker.helpers.ts:4520`), the arbitration-award floor (`sim.worker.helpers.ts:4688`), new signings/extensions (`applyAcceptedExtensionToPlayer`, FA signing, user offers), and contract construction (`player/generation.ts`, `scouting/international.ts`, stub constructors, seeding harnesses). Treat any writer outside the mapped classes as a plan-blocking finding.
3. Resolve the semantics of `contract.years` vs `playerOption`/`teamOption`/`optOutYears` (`buildOpeningDayMlbContract` in `packages/sim-core/src/player/generation.ts`; `ContractSchema` in `packages/contracts/src/schemas/player.ts`): are option years counted inside `years`? If source is ambiguous, resolve team options only and cut player options/opt-outs. Do not guess.
4. Confirm `shouldEnterFreeAgency` (`packages/sim-core/src/roster/freeAgency.ts:197-209`) as actually written: expiry requires `years <= 0`, but non-MLB players are additionally gated by overall/age thresholds (`MINOR_LEAGUE_FA_OVERALL_THRESHOLD`). Once the clock ticks, sub-threshold minor leaguers with expired contracts remain rostered at `years <= 0`. Resolve this expired-but-retained population from source with a stated rule: it must stay bounded, never double-process, and never violate 26/40-man legality; add it to the soak assertions.
5. Enumerate every writer of `s.freeAgencyMarket`. Live source lazily creates the market at three sites, including a pure read path: `getFreeAgents` (`apps/web/src/workers/sim.worker.queries.ts:3441-3443`), `ensureFreeAgencyMarket` (`sim.worker.helpers.ts:5045`), and `makeContractOffer` (`sim.worker.actions.ts:2957`). The plan must prove market creation happens at exactly one authoritative offseason seam, with read-path lazy init removed or proven benign — a query must never create or persist a market that diverges from the authoritative one.
6. Confirm how user-team tender/option decisions surface today (`applyTenderDecisionsOnce` skips the user team). Do not invent an interactive decision surface the source does not have. Also confirm whether existing compliance machinery (`autoFillMLBRoster`, `simulateFADay`, roster-compliance checks) covers the user team's roster legality after natural expiries; if it does not, scope the legality invariant to CPU teams plus whatever user-team compliance gate the source already has — never a new enforcement mechanism.
7. Record how `freeAgencyMarket` persists (`z.unknown().nullable()` in `packages/contracts/src/schemas/save.ts`) and baseline snapshot size (`estimateSnapshotSize`, `packages/sim-core/src/performance/index.ts`) so growth stays bounded and measured.

## Required invariants

1. Exactly one contract advancement per player per season rollover; years never go negative; retired players excluded.
2. No double-processing across natural expiry, non-tender, and qualifying-offer paths; no player on two teams; every CPU team ends each offseason 26/40-man legal, and the user team is covered by whatever compliance gate checkpoint item 6 confirms.
3. Automated option resolution is symmetric: a user-team player and a CPU-team player with identical contract and value inputs produce identical outcomes, enforced by a named test, not a claim. If checkpoint item 6 confirms a real interactive user decision seam, a user's explicit choice is an allowed override — but any unresolved user-team option must fall back to exactly the CPU value rule, never a more favorable default. No hidden CPU advantage anywhere in the new path.
4. Option decisions derive hash-stable from stable game facts (the `packages/sim-core/src/narrative/stableProse.ts` pattern), consuming zero RNG draws wherever possible; a forked seeded `GameRNG` is permitted only for a genuinely stochastic tiebreak. Never `Math.random()`, wall clock, or UUID.
5. This goal explicitly changes a tested decision policy: same-seed league outcomes change by design, and the determinism-snapshot re-baseline (`packages/sim-core/tests/determinism.snapshot.test.ts`) must be declared with rationale, never silent.
6. No schema change expected — the fields already persist in `ContractSchema`. If the checkpoint proves a new persisted field unavoidable, it ships additive-only with migration, fixtures, deep/old-save coverage, import/export round-trip, reload proof, and rollback.
7. No fabricated old-save history: the first post-upgrade offseason's expiry wave is framed with honest news copy (the contract clock is now live), never silent roster upheaval or invented past expiries.

## Architecture selection order

Prefer the smallest live-source-compatible option:

1. Decrement `player.contract.years` in place at the checkpoint-confirmed seam, mirroring the tested `advanceContracts` transition rules (`packages/sim-core/src/finance/contracts.ts`). Adapt, do not duplicate: call it against contract views or port its transitions into one small pure function with equivalent tests.
2. Add one pure `resolveContractOptions` function in `finance/contracts.ts`: team options decided by a simple value rule (`calculatePlayerValue` vs option salary band), player options symmetrically — only if checkpoint item 3 proved the semantics; otherwise team options only.
3. Route expiring players through the existing `shouldEnterFreeAgency` → `createFreeAgencyMarket` path and the existing QO/compensation loop. Do not build a second market or a parallel expiry ledger.
4. Rely on existing AI backfill (`simulateFADay`, `autoFillMLBRoster`) for roster legality. If the soak proves it insufficient, tuning is bounded to constants/thresholds only, recorded in `TUNING.md` with before/after soak evidence; any algorithmic change to backfill behavior is a stop condition and a logged follow-up (goals 07/08 own AI behavior).
5. Do not add a new route, a new economy engine, or a new offseason phase unless the checkpoint proves the existing tender phase cannot host option resolution.

## Player-facing state

Extend existing surfaces only:

- `apps/web/src/features/finance/routes/FinancePage.tsx` contract displays reflect ticking years, with an "expiring after this season" marker on contract rows (the expiring concept already exists in `advanceContracts`' transition states) so the clock is felt in the first hour, not only at the first rollover;
- `apps/web/src/features/free-agency/routes/FreeAgencyPage.tsx` shows the naturally populated market;
- `apps/web/src/features/offseason/routes/OffseasonPage.tsx` shows option outcomes, and a user decision only if checkpoint item 6 confirms a real decision seam;
- a preseason news beat flags the user's own expiring stars; marquee expiries and a franchise star departing into free agency get news beats through existing `packages/sim-core/src/narrative/newsFeed.ts` templates; the first post-upgrade offseason gets the honest contract-clock framing beat.

## Required lanes

High-emotion mutations, all through existing TRUST-A autosave lanes:

- user star's contract expiring into free agency;
- user-team option resolution (decision if interactive, outcome otherwise);
- re-signing an expiring player;
- offseason advance and existing sim/roster/trade/news persistence regression.

## Proof

- unit: advancement transitions (active → expiring → expired), option rules, no-negative-years property test, exactly-one-advancement-per-rollover idempotence;
- named symmetry test: identical user/CPU inputs produce identical automated option outcomes;
- integration: 6–10 season deterministic soak asserting FA market size per offseason within a stated band, expiry counts and roster churn within stated bands, payroll spread inside calibration bands, 26/40-man legality every offseason per invariant 2, bounded expired-but-retained minor-league population, no player on two teams, same-seed reproducibility, bounded snapshot growth;
- deep pre-upgrade save behavior, not just copy: run the soak's legality/band/no-double-processing assertions against at least one deep pre-upgrade fixture (e.g. `packages/contracts/tests/fixtures/save/v33/season10.json` imported through the worker path) for its first two post-upgrade offseasons, and record the measured first-wave expiry count in COMPLETION.md;
- permanent guards, not one-off soak assertions: add FA-market-size, expiry-count/roster-churn, and payroll-spread bands to the calibration harness (`CALIBRATION_TARGET_BANDS` / worker bands in `packages/sim-core/src/calibration/index.ts`); re-run `pnpm playtest:calibrate` and update `TUNING.md` with evidence if drift is measured and justified;
- determinism-snapshot re-baseline recorded with rationale;
- browser hard reload: option outcome → reload → durable; star enters FA → reload → market intact;
- pre-existing save upgrade shows honest coverage copy and zero fabricated events;
- full typecheck/tests/build/smoke gates; results recorded in COMPLETION.md.

## Scope cut line

No dynamic budgets, revenue, or attendance; no luxury-tax enforcement or penalties; no salary retention or cash in trades; no CPU market/trade identity (goals 07/08 own that); no arbitration formula changes; no renegotiation or holdout changes; no deferred-money mechanics; no GM career recording; no draft-compensation redesign beyond the existing QO loop; no new route or page; no in-season sim, trade-deadline, or player-generation changes; no schema change unless the checkpoint proves one unavoidable (then additive-only with fixtures). If player options/opt-outs prove semantically ambiguous, cut to team options only and log the follow-up. If goal 03's plan touches the rollover/development seam in `sim.worker.actions.ts`, declare merge order in the plan and never run those worktrees concurrently on that file.

## Done

Contracts tick down and expire naturally; expiring players populate the existing free-agency market and QO loop; option resolution is deterministic, hash-stable where possible, and provably symmetric on the automated path; every offseason ends roster-legal with permanent calibration guards green; deep pre-upgrade saves survive their first two post-upgrade offseasons inside the same guards; all touched lanes survive hard reload; old saves upgrade with honest framing and zero fabricated history; determinism re-baseline is declared; all gates and adversarial review are clean.
