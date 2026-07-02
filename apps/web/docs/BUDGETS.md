# Bundle Budgets — MBD Web App

Source of truth for ceilings lives in [`apps/web/src/build/bundleConfig.ts`](../src/build/bundleConfig.ts). This file documents the *why* behind each lift and the policy.

## Current ceilings

| Chunk class | Raw | Gzip |
| --- | --- | --- |
| Main-thread chunk | 304 KB | 81 KB |
| Worker chunk (default) | 446 KB | 143 KB |
| Worker story chunk (`game-engine-story`) | 499 KB | 150 KB |
| Worker core chunk (`game-engine-core`) | 446 KB | 144 KB |
| Chart vendor (lazy `vendor-charts`) | 430 KB | 120 KB |

The main-thread chunk caps have not moved since launch — `MAIN_THREAD_CHUNK_BUDGET_BYTES` / `MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES` are deliberately frozen so any new app code that lands on the main thread surfaces as a regression in `bundleBudget.test.ts`.

`bundleBudget.test.ts` resolves per-file ceilings through `getBudgetForBundleFile()` so scoped worker chunk lifts do not silently raise every worker bundle.

## Lift policy

1. **Smallest safe lift.** A slice ships with the minimum cap move that restores headroom. No round-number gifting.
2. **Raw and gzip move independently.** A copy-heavy story slice usually only needs gzip; a wire-only worker slice usually only needs raw.
3. **Chunk routing first, ceiling lift second.** Before lifting a cap, check whether routing the new module into a different chunk (e.g. moving narrative prose into `game-engine-story` or `game-engine-capstone`) keeps `game-engine-core` lean.
4. **CI vs. local terser drift.** Local builds typically emit `game-engine-core` ~250–500 bytes smaller than CI. Lifts must include headroom for that drift; otherwise the budget test goes red only in CI.
5. **Document the rationale in the PR.** This file gets the *why*; the journal below records milestones.

## Worker chunk lift timeline

| Cap (raw / gzip) | Slice | Cause |
| --- | --- | --- |
| 406 / 124 KB | (pre-arbitration baseline) | — |
| 408 / 125 KB | Arbitration broadcast | Arbitration press-conference templates + moment descriptions. Smallest safe gzip lift after copy trim. |
| 410 / 126 KB | Holdout briefings + trade-deadline press | `generateHoldoutResolutionBriefing` and trade-deadline press copy. Raw-only lift first, gzip moved a tick later when trade-deadline copy crossed the cap by 471 bytes. |
| 411 / 126 KB | Team-moment store (v22) | `appendTeamMoments` + `teamMoments` map on `FullGameState` + identityMoments seam through `buildTradeBroadcastCoverage`. Wire-only. |
| 412 / 126 KB | Chase Watch query | `getChaseWatch()` assembling milestone alerts + pace chases. Pure aggregation. |
| 414 / 126 KB | Pennant-race-heat query | `getPennantRaces` with division race + wildcard bubble. |
| 417 / 127 KB | Team-moment types (v23) | `detectSeasonIdentityMoments` + `championship_run` / `contention_collapse` enum + description templates. |
| 420 / 127 KB | Career Retrospective query | `buildCareerRetrospective` unifying titles, beats, story arcs, awards, top rivalry. |
| 423 / 127 KB | Season Story Reel query | `buildSeasonStoryReel` per-season deep-dive. |
| 425 / 127 KB | Pennant Race Detail query | `getPennantRaceDetail` all-six-divisions + top-5 wildcard. |
| 425 / 128 KB | Team-identity wave 2 (v25) | `rebuild_begun` + `breakout_season` + `contention_window_opens` detectors. Gzip-only lift. |
| 428 / 131 KB | Narrative depth wave 3 (v26) | Additive detector/template expansion. Sprint hard cap. |
| 428 / 132 KB | CI terser drift recovery | One KB gzip lift to absorb a +534-byte CI vs. local minifier drift on an unchanged commit. |
| 432 / 134 KB | Narrative depth wave 4 (v27) | Persisted-state fidelity + playoff comeback tracking. |
| 433 / 134 KB | Career Retrospective season-history | `seasonHistory` derivation. Raw-only. |
| 434 / 135 KB | Codex narrative-prose reservation | Headroom reserved for parallel `codex/narrative-prose-expansion` branch (deterministic prose variant pools). |
| 434 / 137 KB | Codex narrative-prose landing | Lift confirmed after rivalry-wave1 (PR #50) stacked with prose pools in `game-engine-core`. |
| 436 / 137 KB | This Week in History query | `getThisWeekInHistory` over persisted moments maps. Raw-only. |
| 438 / 137 KB | Player Arcs of the Season query | `getPlayerArcsOfSeason` filtering redemption_arc / late_career_peak / rookie_breakout. Raw-only. |
| 439 / 139 KB | Narrative depth wave 6 | Dynasty-marker worker wiring + new prose pools. |
| 439 / 141 KB | Narrative depth wave 7 | Position-group moment detectors (`dominant_rotation` / `bullpen_collapse` / `lineup_of_era`). Gzip-only. |
| 440 / 143 KB | Narrative depth wave 8 | Player micro-arc worker source plumbing. |
| 442 / 143 KB | Narrative depth wave 9 | Weekly cadence detectors split into `game-engine-weekly` to protect `game-engine-core`. |
| 443 / 143 KB | Narrative depth wave 10 | Capstone prose split into `game-engine-capstone`. |
| 446 / 143 KB | Demo-readiness story raw drift | `game-engine-story` emitted 456,062 raw bytes with gzip still under cap. Raw-only lift restored the budget gate with less than 1 KB local headroom and no main-thread change. |
| 465 / 143 KB story-only | GOAT Phase 0 story raw rebaseline | `game-engine-story` emitted 474,921 raw / 141,187 gzip after worker adapter/story consolidation. Scoped raw-only lift keeps non-story worker budgets unchanged. |
| 446 / 144 KB core-only | GOAT Phase 0 core gzip rebaseline | `game-engine-core` emitted 451,188 raw / 146,443 gzip. Scoped gzip-only lift absorbs the 11-byte gzip overage plus CI terser drift without lifting story/default gzip. |
| 473 / 143 KB story-only | GOAT Phase 3.5 offseason helper guards | `game-engine-story` emitted 483,788 raw / 143,715 gzip after derived offseason DTOs plus phase-specific action guards. Scoped raw-only lift keeps gzip and non-story worker budgets unchanged. |
| 478 / 143 KB story-only | GOAT Phase 3.4 trade market intelligence | `game-engine-story` emitted 488,145 raw / 145,101 gzip after derived trade market posture/needs/budget-pressure DTOs. Scoped raw-only lift keeps gzip and non-story worker budgets unchanged. |
| 480 / 143 KB story-only | GOAT Phase 3.4 deadline war room | `game-engine-story` emitted 491,104 raw / 146,109 gzip after derived war-room checkpoint and negotiation posture copy. Scoped raw-only lift keeps gzip and non-story worker budgets unchanged. |
| 481 / 144 KB story-only | GOAT Phase 3.4 negotiation review evidence | `game-engine-story` emitted 492,113 raw / 146,448 gzip after derived fairness/roster/narrative review evidence for negotiation action results. Scoped story-only raw/gzip lift keeps default worker, core, and main-thread budgets unchanged. |
| 483 / 144 KB story-only | GOAT Phase 3.3 draft decision inputs | `game-engine-story` emitted 494,365 raw / 147,322 gzip after derived draft prospect decision-input DTOs in worker helpers. Scoped raw-only lift keeps default worker, core, main-thread, and story gzip budgets unchanged. |
| 485 / 145 KB story-only | GOAT Phase 3.3 post-draft profile outcomes | `game-engine-story` emitted 495,810 raw / 147,782 gzip after derived player-profile draft outcome DTOs in worker queries. Scoped story-only raw/gzip lift keeps default worker, core, chart, and main-thread budgets unchanged. |
| 488 / 146 KB story-only | GOAT Phase 3.2 development decision brief | `game-engine-story` emitted 499,225 raw / 148,944 gzip after derived player-profile development decision DTOs in worker queries. Scoped story-only raw/gzip lift keeps default worker, core, chart, and main-thread budgets unchanged. |
| 491 / 147 KB story-only | GOAT Phase 3.2 minors development focus | `game-engine-story` emitted 501,956 raw / 149,779 gzip after derived `getProspectPipeline().developmentFocus` DTOs in worker pipeline. Scoped story-only raw/gzip lift keeps default worker, core, chart, and main-thread budgets unchanged. |
| 492 / 147 KB story-only | GOAT Phase 5.3 clubhouse intelligence | `game-engine-story` emitted 503,447 raw / 150,306 gzip after derived `getMentorships().leaders` and `conflictRisks` DTOs in worker queries. Scoped raw-only lift keeps default worker, core, chart, main-thread, and story gzip budgets unchanged. |
| 494 / 148 KB story-only | GOAT Phase 6.1 worker query profiling | `game-engine-story` emitted 504,840 raw / 150,836 gzip after runtime-only opt-in query diagnostics landed in worker diagnostics and selected worker calls. Scoped story-only raw/gzip lift keeps default worker, core, chart, and main-thread budgets unchanged. |
| 495 / 149 KB story-only | GOAT Phase 6.2 full-gate gzip drift | `game-engine-story` emitted 506,349 raw / 151,760 gzip under the pinned pnpm/turbo web test gate after Draft route decomposition. Scoped gzip-only lift absorbs the 208-byte overage and keeps default worker, core, chart, and main-thread budgets unchanged. |
| 496 / 149 KB story-only | GOAT Phase 5.2 team timeline memory | `game-engine-story` emitted 507,576 raw / 152,244 gzip after `getFranchiseTimeline()` began projecting already-saved user-team `teamMoments` into non-persisted timeline beat DTOs. Scoped raw-only lift keeps gzip, default worker, core, chart, and main-thread budgets unchanged. |
| 497 / 149 KB story-only | GOAT Phase 5.2 rivalry timeline memory | `game-engine-story` emitted 508,244 raw / 152,496 gzip after `getFranchiseTimeline()` began projecting saved `rivalries.eventHistory` into non-persisted multi-team rivalry event beat DTOs. Scoped raw-only lift keeps gzip, default worker, core, chart, and main-thread budgets unchanged. |
| 498 / 150 KB story-only | GOAT Phase 5.2 timeline links and profile mentorship | `game-engine-story` emitted 509,065 raw / 152,711 gzip after timeline link DTOs and role-aware player-profile mentorship DTOs stacked on the story chunk. Scoped story-only raw/gzip lift keeps default worker, core, chart, and main-thread budgets unchanged. |
| 499 / 150 KB story-only | GOAT Phase 5.2 mentorship timeline memory | `game-engine-story` emitted 510,399 raw / 153,166 gzip after `getFranchiseTimeline()` began projecting saved `mentorRelationships` into non-persisted mentor/protege timeline beat DTOs. Scoped raw-only lift keeps gzip, default worker, core, chart, and main-thread budgets unchanged. |

## Notes on routing

Routing changes that have paid off:

- **`game-engine-onboarding`** isolates the Day-1 flow so it never lands in `game-engine-core`.
- **`game-engine-story`** absorbs holdout coverage and worker-only narrative payload, leaving the deterministic core lean.
- **`game-engine-capstone`** (Wave 10) splits award / HOF / retirement / stable prose variant pools from the core.
- **`game-engine-weekly`** (Wave 9) splits weekly cadence detectors + prose.
- **`game-engine-shell`** holds only the Comlink entry point and the sim-core root barrel, preventing circular chunk edges between `game-engine-core` and `game-engine-onboarding`.

Routing changes that did *not* pay off:

- Routing `tradeDeadlinePressConferences.ts` into `game-engine-story` pushed story over its own cap (421,762 raw / 125,530 gzip). The smaller ceiling lift on core was the safer fix.
