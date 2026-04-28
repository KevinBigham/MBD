# Changelog

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

- Current save schema: v33.
- v1.0.0 does not bump schema.
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
