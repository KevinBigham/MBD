# Finance Calibration Tuning

## Scope

- Slice: `finance-calibration-tuning`
- Branch: `codex/finance-calibration-tuning`
- Base: `main@fd5b926`

## Root Cause

Opening-day MLB rosters were generated with:

- `serviceTimeDays: 0` for every MLB player
- a near-uniform veteran-style salary formula for every MLB player
- 896 MLB roster spots paid as if they were already on market deals

That produced a league-total MLB payroll of `7189.70` for calibration seed `44001`, above the target `3800-6800` band.

## Architectural Change

The fix stays in `packages/sim-core/src/player/generation.ts`.

- Raw `generatePlayer(...)` behavior stays intact for isolated tests and ad hoc fixtures.
- Full team roster generation now reseeds MLB opening-day contracts through a deterministic helper.
- The helper assigns:
  - age-bucketed service-time ranges
  - pre-arb salaries for `0-2` service years
  - arb-style salaries for `3-6` service years
  - veteran / free-agent salaries and longer deals for `7+` service years
- Contract seeding uses a stable derived seed from the generator seed plus `teamId`, so the refactor does not introduce hidden randomness or stateful coupling between teams.

## Calibration Result

### Before

- Calibration seed `44001` total MLB payroll: `7189.70`
- Calibration seed `44001` average MLB salary: `8.02`

### After

- Calibration seed `44001` total MLB payroll: `5225.94`
- Calibration seed `44001` average MLB salary: `5.83`
- Opening-day generated league total MLB payroll: `5313.04`
- Opening-day generated league average MLB salary: `5.93`
- Opening-day MLB service-time mix:
  - pre-arb share: `0.225`
  - arb share: `0.298`
  - veteran share: `0.477`

## Bands

Unchanged calibration outputs for seed `44001` after the finance refactor:

- average team wins: `81.0`
- average runs per game: `8.904`
- batting average: `0.250`
- on-base percentage: `0.315`
- slugging percentage: `0.392`
- OPS: `0.707`

## Verification

- `npx pnpm --filter @mbd/sim-core test -- --reporter=verbose calibration.test.ts finance.test.ts generation.test.ts`
- `npx pnpm --filter @mbd/sim-core test`
- `npx pnpm verify`
- `npx pnpm run verify:quality`

Current status:

- `sim-core` calibration and finance coverage are green with the tightened payroll band.
- Root `verify` still stops in `apps/web/src/workers/sim.worker.balance.test.ts` on unchanged worker balance bands (`homeRuns = 4997`, `deadlineTrades = 2.5`).
- A stronger rental-market reshaping probe did not move those worker metrics, so they appear orthogonal to this finance-only slice.

## Determinism

- Determinism snapshot hash stayed unchanged: `31c5ddfc73ede88aa20d5117f711f0101ecbb2b2e0f5c6815b4cff9ab7cf93d1`
- No snapshot update was required in this slice.
