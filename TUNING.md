# MBD Tuning Guide

This file documents the main balance levers touched during Phase 10. The goal is to keep the sim interpretable and easy to retune without hunting through the codebase.

## Opening Contracts

File: `packages/sim-core/src/player/generation.ts`

- `baseSalary`: sets the baseline opening-day MLB salary curve from internal overall rating.
- `starBonus`: gives elite players extra salary headroom without inflating the full league.
- `years` bands by overall: controls how quickly MLB talent reaches future free agency.

Reasonable range:
- Average MLB salary should stay roughly `$2.5M-$8.5M`.
- Total 32-team MLB payroll should stay roughly `$3.8B-$6.8B`.
- Short-deal share can skew higher than real life because the game needs a live FA market, but it should not approach every player being on a one-year deal.

## Free Agency Market

File: `packages/sim-core/src/roster/freeAgency.ts`

- `MAX_AAV_MILLIONS`: top-end free-agent contract ceiling.
- `MINOR_LEAGUE_FA_*` thresholds: decides which non-MLB expiries become real free agents instead of clogging the market.
- `spendingComfortFactor()` and `marketAggressionFactor()`: how much of a team budget the AI will actually deploy.
- `NEED_BONUS_FACTOR` and competition inflation: controls how much positional need and bidding wars push offers upward.

Reasonable range:
- The market should contain actual MLB talent plus a thin layer of veteran upper-minors depth.
- Top free-agent AAVs should land roughly `$20M-$45M`.
- The market should usually produce at least one real impact signing per offseason sample, with more in stronger free-agent classes.

## Trade Volume

File: `apps/web/src/workers/sim.worker.trade.ts`

- Default `userOfferRange` and `aiTradeRange`: regular in-season trade activity.
- `DEADLINE_ACTIVITY_CHECKPOINTS`: number and spacing of burst windows in July.
- Deadline fallback loops: guarantees a minimum amount of late-market motion when the simulation rolls cold.

Reasonable range:
- League-wide trades per season: `10-30`
- Deadline trades in an extended multi-season sample: `4-18`
- Deadline trades in the current one-season calibration guard: `1-18`

Team-building identity:
- Runtime-only archetypes (`rebuilding`, `budget_constrained`, `balanced`, `contending`, `win_now`) are derived from record, payroll pressure, current core, prospect pipeline, and front-office reputation.
- `rebuilding` and `budget_constrained` clubs can act as deadline rental sellers and lean toward younger extension/promotion choices; `contending` and `win_now` clubs act as deadline buyers, bid more aggressively in free agency, and lean toward current-star retention/readiness.

## WAR Shape

File: `packages/sim-core/src/stats/advanced.ts`

- `REPLACEMENT_RUNS_PER_PA`: hitter replacement baseline.
- `PITCHER_REPLACEMENT_FIP_DELTA`: pitcher replacement baseline relative to league FIP.

Reasonable range:
- `5+ WAR` players should feel selective, not common.
- `8+ WAR` seasons should remain rare and memorable.

## Run Environment

File: `packages/sim-core/src/sim/plateAppearance.ts`

- `LEAGUE_AVG.hr`: league-wide home-run baseline.
- `LEAGUE_AVG.single`: league-wide single baseline.
- Hitter and pitcher HR/single multipliers: controls how contact/power/stuff/movement reshape the environment.

Reasonable range:
- League batting average: `.235-.265`
- League ERA: `3.7-4.5`
- League home runs: roughly `5,000-7,000` in the current 32-team universe

## Calibration Dashboard

Files: `packages/sim-core/src/calibration/index.ts`, `packages/sim-core/tests/calibrationDump.generate.ts`, `apps/web/src/workers/sim.worker.onboardingBalance.test.ts`

Run:
- `pnpm --filter @mbd/sim-core run playtest:calibrate`

Outputs:
- `packages/sim-core/playtest-output/calibration.md`
- `packages/sim-core/playtest-output/calibration.json`
- `packages/sim-core/playtest-output/calibration-onboarding-balance.md` for the slower full all-variant onboarding evidence capture
- `packages/sim-core/playtest-output/calibration-onboarding-balance.json` for the same machine-readable evidence

Optional inputs:
- `PLAYTEST_WORKER_SEED`: base worker/offseason sample seed, defaulting to `PLAYTEST_SEED`.
- `PLAYTEST_WORKER_SEEDS`: comma-separated worker/offseason sample seeds. Defaults to `PLAYTEST_WORKER_SEED, PLAYTEST_WORKER_SEED + 1`.
- `PLAYTEST_WORKER_YEARS`: worker/offseason sample seasons, defaulting to `1`.
- `PLAYTEST_ONBOARDING_BALANCE=1`: attach the shared onboarding balance sample to the generated calibration Markdown and JSON.
- `PLAYTEST_ONBOARDING_BALANCE_SEED`: onboarding balance sample seed for the calibration dump, defaulting to `12701`.
- `PLAYTEST_ONBOARDING_BALANCE_YEARS`: onboarding balance sample seasons for the calibration dump, defaulting to `1`.
- `PLAYTEST_ONBOARDING_BALANCE_VARIANT_IDS`: optional comma-separated subset of Day One variants for a focused calibration dump.
- `MBD_ONBOARDING_BALANCE_SAMPLE_SEASONS`: onboarding balance sample seasons for the worker guard, defaulting to `1`.
- `MBD_ONBOARDING_BALANCE_VARIANT_IDS`: optional comma-separated subset of Day One variants for focused balance checks.
- `MBD_ONBOARDING_BALANCE_FULL_MATRIX=1`: keeps all five Day One variants in multi-season worker balance runs. Without this flag, multi-season worker runs default to the key attribution matrix: `balanced_reference`, `marcus_win_now`, `elena_rebuild`.
- `MBD_ONBOARDING_BALANCE_LOG=1`: logs the shared onboarding balance summary for report capture.
- `MBD_ECON_CLOCK_SOAK=1 pnpm --filter @mbd/web exec vitest run src/workers/econClockSoak.test.ts --reporter=verbose`: explicit current-schema Goal-11 gate (seeds `7111/7112/7113`, six rollovers); it is intentionally not part of ordinary calibration runs.

Measured bands:
- Average team wins: `76-86`
- Average runs per game: `7.4-9.2`
- League batting average: `.235-.265`
- League ERA: `3.7-4.5`
- League home runs: `5,000-7,000` per season in multi-season dumps
- Total 32-team MLB payroll: `$3.8B-$6.8B`
- Average MLB salary: `$2.5M-$8.5M`
- Average MLB payroll spread: `$25M-$350M`
- `5+ WAR` players: `4-48`
- `8+ WAR` players: `0-8`
- Injured players: `50-220`
- Injury games missed: `500-3,500`
- Active injuries at playoff start: `30-220`
- Regular-season trades: `10-30`
- Deadline trades: `1-18` in the current one-season worker guard
- Free-agent signings: `1-40`
- Meaningful free-agent signings: `1-20`
- Top free-agent AAV: `$20M-$45M`
- FA market at QO→FA entry: `1-1089` (Goal-11 frozen worker guard)
- Natural contract expiries and offseason assignment churn: report-only in calibration; their exact attribution invariants run in the Goal-11 economy soak rather than a fabricated absolute band.
- Accepted extensions: `8-80`
- Average prospect progress: `2-18`
- Ahead-of-curve reports: `1-20,000`
- Bust-risk reports: `0-500`
- Active development setbacks: `0-1,000`
- Playoff teams: `12`
- Champion seed: `1-12`
- Lower-seed series wins: `0-12`
- Onboarding final owner-trust range: `6-45`
- Onboarding Day One fan-sentiment baseline range: `4-18`
- Onboarding final front-office reputation range: `4-30`
- Onboarding final free-agent appeal range: `8-22`
- Onboarding final prospect progress range: `2-9`
- Onboarding focused scouting lift: `.045-.100`

Current seed `44001`, one-season core evidence:
- Passing: average team wins, runs per game (`8.695`), batting average (`.247`), league ERA (`4.338`), league home runs (`5,078`), payroll, average salary, payroll spread (`$103.14M`), `5+ WAR`, and `8+ WAR`. Regenerated after the KC BBQ Fountains rating-scale fix plus the `LEAGUE_AVG.hr` recalibration (`0.03175` → `0.0333`) that keeps league home runs inside the band now that KC pitching no longer inflates league offense.
- Worker/offseason seeds `44001, 44002`, one season per seed: averages of `124` injured players, `2,482.5` games missed to injury, `16.5` regular-season trades, `2` deadline trades, `10` free-agent signings, `25.5` accepted extensions, `9.29` average prospect progress, `9,688` ahead-of-curve reports, `0.5` bust-risk reports, `339` active development setbacks, and `5` lower-seed playoff series wins.
- Passing worker target bands: injury load, trade cadence, FA/extension pressure, prospect progress/trajectory/setbacks, and playoff variance across the default two-seed sample.
- Onboarding balance guard seed `12701`, one season, five Day One variants: shared summary tracks Day One baseline ranges separately from post-season deltas for owner trust, fan sentiment, front-office reputation, FA appeal, prospect progress, scouting lift, and monthly consequence cadence. The calibration dump can attach the same sample with `PLAYTEST_ONBOARDING_BALANCE=1`.
- Onboarding two-season key matrix seed `12701`, three variants, completed in `103.99s`: final owner-trust range `26`, final front-office reputation range `7`, final free-agent appeal range `11`, final prospect progress range `4.05`, focused scouting lift `0.095`, monthly consequence count `10`, and aggressive-vs-patient prospect progress delta `-1`. Treat this as attribution evidence rather than a strict prospect-ordering gate because global prospect systems can dominate after multiple seasons.
- Full all-variant two-season onboarding calibration seed `12701`, five variants, regenerated in `187.36s` after owner-pressure tuning: final owner-trust range `45`, final front-office reputation range `6`, final free-agent appeal range `15`, final prospect progress range `5.65`, focused scouting lift `0.098`, monthly consequence count `10-10`, and aggressive-vs-patient prospect progress delta `1.60`. This is captured in `calibration-onboarding-balance.md/json`; the owner-trust range now sits inside the `6-45` reference band while still leaving prospect-balance follow-up to the deeper development systems.

## Extension Pressure

File: `packages/sim-core/src/finance/contracts.ts`

- `shouldPursueExtensionCandidate()` thresholds: who the AI even tries to extend.
- Candidate slice size in `processTeamExtensions()`: how many players each AI club pushes at once.
- Budget cap and team-building priority inside `processTeamExtensions()`: how far clubs can stretch for extensions, which candidates are attempted first, and how conservative budget-constrained clubs are.

Reasonable range:
- Accepted league-wide extensions in a sample offseason should stay healthy, but not consume the whole free-agent class.
- If free agency goes dead, reduce extension aggressiveness before inflating FA offers further.
