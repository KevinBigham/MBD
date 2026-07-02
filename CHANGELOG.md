# Changelog

## [Unreleased] - 2026-06-18

### KC BBQ Fountains Ships As The League Bully

- Design decision (Kevin, 2026-07-02): KC is the deliberately overpowered flagship franchise at full authored strength — the team every dynasty has to dethrone. Before this change the authored content pack overlaid all 28 KC MLB slots after `applyKCOverrides` ran, so Marcus Fontaine, Alejandro Fuentes, and the staff/infield boosts never appeared in real games and KC shipped 19th of 32 by mean MLB rating.
- `generateTeamRoster` now applies the KC overrides after the authored roster overlay, so the phenoms and boosts survive into shipped new games. Generation paths without the authored pack (calibration, tests) are byte-identical to before.
- Shipped-world evidence (full season, seed 44001, authored pack): KC finishes 112-50 with the best record and allows 477 runs against 532 for the next-best staff.
- Added worker-content regression tests pinning Fontaine/Fuentes at full authored strength in the shipped world, the staff/infield boosts above their pack baselines, and every other franchise exactly on its authored values.
- Existing saves keep their persisted players; save schema unchanged.

### KC Rating-Scale Fix And Run-Environment Recalibration

- Fixed `applyKCOverrides` writing display-scale (20-80) values into internal-scale (0-550) attributes and clamping boosts at 80, which crushed KC BBQ Fountains MLB pitchers to the league floor while their overall ratings still claimed phenom grades. Authored grades now convert through `toInternalRating()` and boosts clamp through `clampRating()`.
- The KC infield-defense boost no longer double-applies on top of the authored shortstop's exact defense grade, matching how the SP boost already excluded the authored phenom.
- Recalibrated `LEAGUE_AVG.hr` from `0.03175` to `0.0333`: with KC pitching no longer inflating league offense, the core calibration sample fell to 4,896 league home runs, just under the 5,000 floor; it now lands at 5,078 with every other target band still passing (8+ WAR held at 7 of max 8).
- Scope note: new games built with the full authored roster pack overlay all 169 KC slots after these overrides, so shipped rosters were already scale-correct; the fix matters for the calibration harness, tests, and any generation path without the authored pack. Existing saves keep their persisted players either way. Save schema unchanged.
- Refreshed the determinism snapshot baseline and the core calibration evidence in `TUNING.md` (intentional behavior change: KC ratings and league HR rate).

### Authored Roster Content

- Materialized the compact worker content pack into 5,408 stable authored roster rows: 169 players for each of 32 organizations across MLB, AAA, AA, A+, A, Rookie, and International.
- Preserved the 640 reviewed seed players and 192 affiliate identities, then filled missing slots through the versioned worker materializer with stable `auth-<team>-<level>-###` content IDs.
- New games now pass the full authored content map into league generation; existing saves still load persisted players and are not replaced. Save schema remains v34.
- Calibrated authored MLB bands and a one-point penny-pincher free-agent appeal penalty so season scoring, trades, extensions, FA activity, and onboarding consequence spread remain inside existing balance gates.
- Added focused sim-core, worker-content, and worker new-game tests for full-roster overlay, legal fields, deterministic content IDs, duplicate prevention, and reviewed seed preservation.

### Identity Originality

- Applied Kevin-approved original replacements for every reviewed blocker/high/medium/internal-duplicate franchise and affiliate identity while preserving team IDs and affiliate keys.
- Updated the compact minor-league worker content pack plus supplied CSV/workbook/guide/division-packet assets; counts remain 192 affiliates and 640 authored player rows with 192 unique affiliate short names.
- Save schema remains v34; this is display/source content only and does not replace existing-save players.

### Save And Determinism

- Current save schema: v34.
- Added compact archived major-game box scores for future postseason, championship, no-hitter/perfect-game, milestone, and rivalry games.
- Added v33 -> v34 migration with `narrative.archivedGames: []`; explicit Season 10 v33 fixture proves old saves load without fabricated historic game details.
- Box Score routes can now render either live numeric game indexes or stable archived-game ids from dynasty timeline memory beats.
- Bundle ceilings were not raised; archive/query worker logic is split into scoped chunks.
- Fixed MLB demotion waiver legality so a legal third option-year demotion, or a repeat demotion during an already-active option season, does not incorrectly create a waiver claim.
- Fixed AI roster overflow normalization so AI clubs consume option years and expose out-of-options players to waivers under the same ledger-backed rules as the user club.
- Fixed week/month sims so skipped regular-season days accrue MLB service time and advance affiliate games through the same day-level farm clock as `simDay()`, with affiliate games on a stable scoped RNG that does not perturb MLB balance.
- Batched week/month farm stat-history and service-time work, and indexed affiliate players during farm simulation, so the fuller affiliate clock stays inside the isolated smoke-gate runtime budget while keeping save-visible minor-league history current.

### AI Organization

- Added deterministic club draft-strategy profiles so CPU teams can weight scouting grade, need, signability, upside, player background, and position scarcity differently without hidden boosts or saved-state changes.
- Added draft and worker regression coverage proving organization tendencies can change CPU picks from the same board while preserving deterministic order and prospect data.

### Setup And Onboarding

- Recalibrated setup farm-system preview grades against the generated league so the team picker shows a usable spread after the authored full-roster pack.
- Setup filters now hide loaded no-op controls that only contain one real option, while still keeping active filters resettable.

### Farm Development

- Staff and front-office mentorship now show saved active mentor lanes ahead of deterministic recommendations, with active/recommended counts and labels on the staff board so the displayed farm-development lift matches the relationships that affect monthly checkpoints.

### Release Readiness

- Refreshed sample-dynasty and calibration playtest evidence against the full authored v1 roster/content state, and extended the sample-dynasty generator watchdog so the required 10-season evidence run completes instead of timing out.
- Re-ran production preview browser/PWA smoke: Chrome desktop/mobile, Firefox, and WebKit all load the setup flow without console errors, and Chrome can reload offline and create a new Quick Start dynasty from the cached PWA.

## [1.0.0] - 2026-04-28

First stable public milestone for Mr. Baseball Dynasty.

### Launch Candidates

- LC-1, save health: safe save-load recovery dialog and corrupt-save export/delete/retry path. PR #64, `e17edba`.
- LC-2, guided start: first-ten-minute nudges for new saves without schema churn. PR #66, `1b51d2e`.
- LC-3, mobile survival: touch targets, portrait layout, viewport audit. PR #68, `cd1f975`.
- LC-4, stale-cache survival: service-worker update path and dead-chunk reload recovery. PR #65, `454076f`.
- LC-5, bundle cleanup: eliminated circular worker chunks. PR #67, `dd45da4`.
- LC-6, launch prep: README, changelog, landing copy, feedback path, version/meta prep. PR pending from `codex/launch-candidate-landing-feedback-lc6`.

### Narrative Depth Waves

- Wave 10: career capstone prose for awards, Hall of Fame, retirement, jersey legacy, farewell tours, and prospect/debut coverage. PR #63, `bc3b8e8`.
- Wave 9: weekly cadence moments: hot/cold streaks, closer weeks, bench clutch weeks, bullpen overwork. Schema v33. PR #62, `41eb26d`.
- Wave 8: player micro-arcs: injury returns, trade-deadline sparks, September call-ups. Schema v32. PR #61, `019a82d`.
- Wave 7: position-group narratives for rotations, bullpens, and lineups. Schema v31. PR #60, `46a24ae`.
- Wave 6: dynasty-marker moments: three-peats, era-ending collapses, perennial contenders. Schema v30. PR #59, `f8ae0b3`.
- Wave 5: player-arc signature moments: redemption, late-career peak, rookie breakout. Schema v29. PR #55, `6f14ee7`.
- Waves 3-4: expanded team identity, rivalry, milestone, nickname, and persisted-state fidelity work. Schemas v26-v27. PRs #46-#47.
- Waves 1-2: team identity and rivalry foundation, season identity moments, and dashboard surfacing. Schemas v23-v25. PRs #34, #42, #43.
- Waves 11-12 were deferred from v1 after the narrative freeze; v1.0.0 ships the stable Wave 10 narrative surface plus launch hardening.

### Dashboard And League Surface

- Career Retrospective, Season Story Reel, player arcs, Franchise Legacy, Chase Watch, Pennant Race, Award Race, and This Week in History shipped across PRs #37-#41, #54, #57, #58.
- Team identity moments moved from backend-only state into GM Career, dashboard, and filterable UI surfaces. PRs #32-#36.
- Mobile survival pass confirms 14 routes and 8 modal/sheet surfaces are touch-safe at 375x667, 360x640, and 414x896.

### Simulation And Systems

- Day One front-office hook shipped with AGM selection, org review, goals, budget, opening-day plan, development posture, crisis, and recap. PR #20 lineage, April 13 closeout.
- Living league systems shipped before v1: GM relationships, multi-round negotiation, multi-team trades, league events, relationship effects, scouting uncertainty, breakout/regression, playoff momentum.
- Trade deadline, arbitration, holdouts, finance calibration, schedule calibration, and reliability/calibration spines landed through PRs #23-#31.

### Save And Determinism

- Launch save schema: v33.
- v1.0.0 did not bump schema during the April launch-candidate cycle.
- Save migrations remained additive through the launch cycle, with fixtures for each schema bump.
- Randomness remains centralized through seeded PRNG paths; launch work did not touch sim RNG.

### Verification State

- Launch baseline: `origin/main` `cd1f9753a9fd530deaf0544720430186850b9918`.
- Last known bundle ceilings after LC-5: worker raw 443 KB, gzip 143 KB.
- Final LC-6 verification gate is tracked in `apps/web/docs/lc6-launch-prep-audit.md`.

## Pre-1.0 Development Road

### April 2026 Rebuild Phases

- Phases 1-10: rebuilt the browser sim foundation, core league model, roster/economy loops, deterministic save/load, and first playable management surfaces.
- Phases 11-14: expanded front-office systems, trade/finance/scouting depth, relationship effects, and worker-backed UI routing.
- Phase 15: broadcast layer: game recaps, play-by-play, trade deadline theatre, draft buzz, ticker/news/consequence integration.
- Phase 16: war-room polish: visualizations, lineup tools, Recharts/dnd-kit surfaces, production recovery polish, PWA icons, README, and deploy readiness.
- Phase 18: public-facing app surface and MLB-proof rebrand: achievements, rivalries, owner intel, pulse, scenarios, original 32-team league identity.

### Hardening Before Launch

- Infra hardening added multi-year smoke gates and playtest narrative dumps. PR #48, `1c6d79d`.
- Branch protection was enabled after a red-CI merge cascade, requiring `Typecheck -> Test -> Build`.
- Bundle budget comments became the canonical journal for intentional ceiling changes.
- Durable handoffs moved launch work into isolated worktrees with slice-level verification.
