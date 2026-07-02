# MISSION — The Living League Program

> Paste-ready Codex dispatches. Two missions, two worktrees, serialized merges.
> Goal contracts: `docs/codex/goals/11_ECON_CLOCK_1.md` and
> `docs/codex/goals/12_DAY_ONE_ROSTERS_1.md`. Written 2026-07-02.

## Why these two missions, in one paragraph

Two same-day audits found the two biggest lies in the game world. **The economy
is frozen**: no code path ever decrements `player.contract.years`
(`advanceContracts` in `packages/sim-core/src/finance/contracts.ts` is tested
dead code), so contracts never expire, free agency runs on non-tender scraps,
options are decorative, and season 12 plays exactly like season 2. **And Day 1
is illegal**: measured through the real New Game path, all 32 orgs generate a
28-man "26-man" roster and an 84-man "40-man" (64 high-severity violations from
the engine's own invariant checker), every affiliate is 21–24% pitchers, and
all 4,512 minor leaguers sit on 0-year contracts (evidence:
`output/roster-day1-audit/report.md`, regenerate with `MBD_ROSTER_AUDIT=1`).
Mission 1 starts the clock. Mission 2 makes every franchise start legal,
balanced, and alive. Together they convert four queued goals (03, 07, 08, 09)
from cosmetic to consequential.

## Where things stand (verified 2026-07-02, post-consolidation)

- Repo: `~/Downloads/MBD-main`, branch `codex/mbd-local-full-sync-20260620`,
  pushed to origin. Consolidated: `main`'s 26 release-gate commits + TRUST-A
  draft-lane hardening + KC rating-scale fix and juggernaut identity +
  playoffs autosave. Gates green: web 437 files / 1546 tests, sim-core
  140 files / 1646 tests, determinism snapshot, full typecheck.
- TRUST-A (goal 01) is COMPLETE — the autosave coordinator in
  `apps/web/src/shared/lib/activeSavePersistence.ts` is the persistence spine
  every new lane must use.
- KC override ordering is resolved on this branch: `applyKCOverrides` runs
  AFTER the content-pack overlay in `generation.ts`;
  `minorLeagueContent.test.ts` pins the phenoms. Goal 12's checkpoint still
  requires pinning it from the merged file — it should confirm this state.
- Save schema is v34 (`packages/contracts/src/schemas/save.ts`). Neither
  mission expects a schema change; prove it or stop.

## Run rules (both missions)

- One mission per fresh worktree branched from
  `codex/mbd-local-full-sync-20260620`. They may RUN in parallel — file
  overlap is minimal (11: offseason/FA/worker seams; 12:
  generation/materializer/rosterManager) — but they MERGE serially.
- Merge order: **ECON-CLOCK-1 lands first** (it unblocks ORG-TRADE-1/
  ORG-MARKET-1 soak baselines). DAY-ONE-ROSTERS-1 then rebases, re-runs
  `playtest:calibrate`, and re-baselines the determinism snapshot ON TOP of
  goal 11's re-baseline. The two goals must never re-baseline concurrently.
- Shared semantics contract: goal 12 writes initial minors contract values
  (journeymen: 1-year deals at `MINOR_LEAGUE_DEAL_AAV`, age 29–33 at internal
  ≥ 290 so they clear `shouldEnterFreeAgency`); goal 11 owns tick/expiry.
  Goal 12's values must be legal whether or not goal 11 has merged.

---

## MISSION 1 (dispatch now) — paste into Codex

/goal Implement exactly `docs/codex/goals/11_ECON_CLOCK_1.md` (ECON-CLOCK-1 —
The Living Contract Clock) in a fresh worktree branched from
`codex/mbd-local-full-sync-20260620`.

Non-negotiables, in addition to everything in `AGENTS.md` and the goal file:

1. Source-first: run the goal's full source-first checkpoint before any
   production edit and write the live plan to
   `docs/codex/runs/ECON-CLOCK-1/PLAN.md` per `PLANS.md`. The goal document's
   line numbers were verified 2026-07-02 but may have drifted — re-grep every
   seam; if live source contradicts the goal, stop and report, do not guess.
2. Reuse, never duplicate: the lifecycle must run through the tested
   `advanceContracts` transition rules and the existing
   `shouldEnterFreeAgency` → `createFreeAgencyMarket` → QO/compensation path.
   Building a second market, a parallel expiry ledger, or a new offseason
   engine is an automatic fail.
3. Determinism: hash-stable option resolution (zero RNG draws where possible);
   the same-seed outcome change is a declared policy change with a
   determinism-snapshot re-baseline recorded with rationale — never silent.
4. Symmetry: the named user-vs-CPU option-resolution test must exist and pass.
   No hidden CPU advantage; no user-favorable default.
5. Old saves: the first post-upgrade offseason expiry wave is framed with the
   honest "contract clock is now live" news beat; run the soak assertions
   against the deep v33 season10 fixture for its first two post-upgrade
   offseasons and record the measured first-wave expiry count.
6. Persistence: every new high-emotion lane routes through the existing
   TRUST-A autosave lanes with browser hard-reload proof.
7. Scope: respect the goal's cut line exactly. Constants-only tuning of AI
   backfill, recorded in `TUNING.md` with before/after soak evidence;
   algorithmic backfill changes are a stop condition.
8. Coordination: `12_DAY_ONE_ROSTERS_1.md` may be in flight in a parallel
   worktree. You own tick/expiry semantics; it owns initial contract values.
   Declare the merge order above in your plan.

As you implement: work in checkpoints with tests alongside each change, run
targeted tests per checkpoint and full gates (typecheck, full tests,
production build, `verify:determinism`, `playtest:calibrate`) before
completion, perform an adversarial self-review pass, fix all P0/P1 findings,
and write `docs/codex/runs/ECON-CLOCK-1/COMPLETION.md` mapping every
requirement to source and proof. Do not broaden scope beyond
`11_ECON_CLOCK_1.md`. Stop only when the goal's done-state is proven or a
documented stop condition blocks safe completion.

---

## MISSION 2 (dispatch in parallel or immediately after) — paste into Codex

/goal Implement exactly `docs/codex/goals/12_DAY_ONE_ROSTERS_1.md`
(DAY-ONE-ROSTERS-1 — Day 1 Roster Excellence) in a fresh worktree branched
from `codex/mbd-local-full-sync-20260620`.

Non-negotiables, in addition to everything in `AGENTS.md` and the goal file:

1. Source-first: run the goal's full source-first checkpoint before any
   production edit and write the live plan to
   `docs/codex/runs/DAY-ONE-ROSTERS-1/PLAN.md` per `PLANS.md`. Start by
   regenerating the audit baseline
   (`cd apps/web && MBD_ROSTER_AUDIT=1 npx vitest run
   src/workers/rosterDayOneAudit.audit.test.ts`) so before/after evidence is
   yours, not inherited.
2. Preserve every hand-authored identity: all 640 content-pack players keep
   names, ratings, and scouting notes through the reshape; any authored-player
   loss is plan-blocking. KC's phenoms stay pinned green under the merged
   override ordering (`applyKCOverrides` after the pack overlay on this
   branch) without weakening `minorLeagueContent.test.ts`.
3. Composition, not behavior: exact 26/40 curation, per-level pitcher/hitter
   templates, journeymen, gems, service-time coherence, and the org depth
   sort are all generation-time data. No AI rotation/lineup usage changes
   ("Living Rotations" owns that), no new development mechanics (the OU/
   breakout/pipeline engines already exist), no contract tick semantics
   (goal 11 owns the clock).
4. Hidden gems stay hidden: gem ceilings read through the scouting fog
   surface only; if any UI leaks true ceiling, record it and gate the read —
   discovery must be earned.
5. Promote the audit into a permanent zero-violation generation gate (named
   CI test at ≥3 seeds), keeping the markdown dump behind `MBD_ROSTER_AUDIT=1`.
6. Calibration is a hard gate: run `playtest:calibrate` for every talent
   change and record `TUNING.md` evidence when bands move — the KC-scale
   precedent says they will. Sequence your determinism re-baseline AFTER
   ECON-CLOCK-1's per the merge order above.

As you implement: work in checkpoints with tests alongside each change, run
targeted tests per checkpoint and full gates before completion, perform an
adversarial self-review pass, fix all P0/P1 findings, and write
`docs/codex/runs/DAY-ONE-ROSTERS-1/COMPLETION.md` mapping every requirement
to source and proof. Do not broaden scope beyond `12_DAY_ONE_ROSTERS_1.md`.
Stop only when the goal's done-state is proven or a documented stop condition
blocks safe completion.

---

## After each mission finishes

1. Run the `/review` slice prompt against the completed worktree; fix every
   P0/P1; rerun full gates.
2. Merge per the run rules above (11 first; 12 re-calibrates on top). Both
   must land before `07_ORG_TRADE_1`/`08_ORG_MARKET_1` freeze soak baselines,
   and goal 12 before `10_OLDSAVE_MINORS_1`.
3. Regenerate `STATUS.md` evidence and the calibration bands each goal now
   owns (11: FA-market size, expiry/churn, payroll spread; 12: roster-shape
   zero-violation gate).
