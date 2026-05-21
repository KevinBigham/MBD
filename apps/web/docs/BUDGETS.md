# Bundle Budgets — MBD Web App

Source of truth for ceilings lives in [`apps/web/src/build/bundleConfig.ts`](../src/build/bundleConfig.ts). This file documents the *why* behind each lift and the policy.

## Current ceilings

| Chunk class | Raw | Gzip |
| --- | --- | --- |
| Main-thread chunk | 304 KB | 81 KB |
| Worker chunk | 446 KB | 143 KB |
| Chart vendor (lazy `vendor-charts`) | 430 KB | 120 KB |

The main-thread chunk caps have not moved since launch — `MAIN_THREAD_CHUNK_BUDGET_BYTES` / `MAIN_THREAD_CHUNK_GZIP_BUDGET_BYTES` are deliberately frozen so any new app code that lands on the main thread surfaces as a regression in `bundleBudget.test.ts`.

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
| 446 / 143 KB | Demo-readiness story raw drift (current) | `game-engine-story` emitted 456,062 raw bytes with gzip still under cap. Raw-only lift restores the budget gate with less than 1 KB local headroom and no main-thread change. |

## Notes on routing

Routing changes that have paid off:

- **`game-engine-onboarding`** isolates the Day-1 flow so it never lands in `game-engine-core`.
- **`game-engine-story`** absorbs holdout coverage and worker-only narrative payload, leaving the deterministic core lean.
- **`game-engine-capstone`** (Wave 10) splits award / HOF / retirement / stable prose variant pools from the core.
- **`game-engine-weekly`** (Wave 9) splits weekly cadence detectors + prose.
- **`game-engine-shell`** holds only the Comlink entry point and the sim-core root barrel, preventing circular chunk edges between `game-engine-core` and `game-engine-onboarding`.

Routing changes that did *not* pay off:

- Routing `tradeDeadlinePressConferences.ts` into `game-engine-story` pushed story over its own cap (421,762 raw / 125,530 gzip). The smaller ceiling lift on core was the safer fix.
