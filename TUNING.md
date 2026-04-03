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
- Deadline trades in a season sample: `4-18`

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

## Extension Pressure

File: `packages/sim-core/src/finance/contracts.ts`

- `shouldPursueExtensionCandidate()` thresholds: who the AI even tries to extend.
- Candidate slice size in `processTeamExtensions()`: how many players each AI club pushes at once.
- Budget cap inside `processTeamExtensions()`: how far clubs can stretch for extensions.

Reasonable range:
- Accepted league-wide extensions in a sample offseason should stay healthy, but not consume the whole free-agent class.
- If free agency goes dead, reduce extension aggressiveness before inflating FA offers further.
