# STATUS - Onboarding Consequence Balance

Status: COMPLETE for the balance-tuning pass requested on 2026-05-20. No save schema/version change was made.

## What Changed

- Added `apps/web/src/workers/sim.worker.onboardingBalance.test.ts`, a deterministic worker balance guard that completes revised onboarding across five variants covering AGM, mandate, scouting, development, spending, trade, and media choices, then sims a real regular season and compares owner/fan/front-office/prospect/scouting outcomes.
- Tuned only modest constants in `apps/web/src/workers/sim.worker.frontOfficeIdentity.ts`:
  - Scouting focus bonus reduced from `0.055 + 0.025` to `0.05 + 0.02`.
  - Off-lane scouting penalty softened from `-0.01` to `-0.008`.
  - Monthly owner consequence weights damped from `0.50 / 0.25 / 0.25` with clamp `[-6, 6]` to `0.35 / 0.18 / 0.18` with clamp `[-4, 4]`.
- Kept save compatibility intact: no schema fields, migrations, or snapshot version changes.

## Balance Evidence

Artifact:

```text
.logs/onboarding-balance-sample.json
```

Seed `12701`, default one-season matrix:

- Day One fan sentiment range: `47-56`, not flat and not explosive.
- Season-end owner trust range: `65-97`.
- Season-end front-office reputation range: `50-55`.
- Season-end free-agent appeal range: `52-67`.
- Prospect progress range: `8.17-13.82`.
- Focused scouting accuracy landed at `0.761-0.803`; off-lane accuracy at `0.683-0.699`.
- Average focused scouting lift is now about `0.096`, inside the `0.045-0.100` guard.
- Raw season-end fan sentiment still reaches `100` for all five variants because the existing global fan model saturates on the same winning seed; the focused test therefore asserts Day One fan consequence range plus season-end free-agent appeal.

Multi-season evidence:

- Initial full five-variant/two-season guard timed out at `240000ms`.
- After adding an on-demand two-season mode, the full five-variant pass timed out at `720000ms`.
- A three-variant/two-season subset completed in `509.69s` and showed broader volatility outside the narrow onboarding layer: owner-trust spread stayed at `59`, and cross-AGM prospect outcomes flipped the simple aggressive-vs-patient ordering (`11.41` vs `12.30`).
- Result: the modest onboarding constants are tuned for the focused season-sample guard; a performant multi-season attribution harness should be the next goal before deeper owner/prospect tuning.

## Checks Run

All commands used:

```text
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH
```

```text
MBD_ONBOARDING_BALANCE_LOG=1 pnpm --filter @mbd/web exec vitest run src/workers/sim.worker.onboardingBalance.test.ts --reporter=verbose
```

PASS, 1 file / 3 tests.

```text
pnpm --filter @mbd/web exec vitest run src/workers/sim.worker.onboardingBalance.test.ts src/workers/sim.worker.frontOfficeIdentity.test.ts src/workers/sim.worker.onboarding.test.ts --reporter=verbose
```

PASS, 3 files / 18 tests.

```text
pnpm typecheck
```

PASS. Turbo reported `Tasks: 9 successful, 9 total`.

```text
pnpm build
```

PASS. Turbo reported `Tasks: 5 successful, 5 total`.

```text
pnpm test
```

FAILED in existing bundle budget coverage outside the onboarding balance path. Turbo reported `6 successful, 8 total`, failed `@mbd/web#test` after `4m4.507s`.

Current isolated bundle-budget failure:

```text
pnpm --filter @mbd/web exec vitest run src/build/bundleBudget.test.ts --reporter=verbose
```

FAILED:

- `game-engine-core-BfRj55UX.js`: gzip `146443`, budget `146432` (`+11` bytes); raw `451188`, budget `456704`.
- `game-engine-story-D0fw_gN6.js`: raw `474921`, budget `456704` (`+18217` bytes); gzip `141187`, budget `146432`.

No focused onboarding consequence or onboarding balance test failed in the final default verification.

Publish-checkout verification before GitHub push:

- `pnpm install --frozen-lockfile` initially hit pnpm's reinstall prompt; rerun as `CI=true pnpm install --frozen-lockfile` to recreate workspace dependency links without lockfile changes.
- First focused Git checkout run hit the one-season balance sample hook timeout at `240000ms`; the test harness timeout was raised from `240000ms` to `360000ms` so the deterministic sample can complete on this checkout without changing runtime behavior or save shape.
- Rerun `pnpm --filter @mbd/web exec vitest run src/workers/sim.worker.onboardingBalance.test.ts src/workers/sim.worker.frontOfficeIdentity.test.ts src/workers/sim.worker.onboarding.test.ts --reporter=verbose`: PASS, 3 files / 18 tests, `136.17s`.
- Rerun `pnpm typecheck`: PASS, Turbo `9 successful, 9 total`.
- Rerun `pnpm build`: PASS, Turbo `5 successful, 5 total`.

Remote-branch integration before GitHub push:

- Fetched `origin/goal/tutorial-assistant-v1` at commit `3f28275` and merged it with the local build-round commit instead of overwriting remote tutorial-assistant work.
- Resolved conflicts in `apps/web/src/app/routes/index.tsx` by keeping the pre-game Assistant mount and the newer News route inside `AppLayout`.
- Resolved `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md` by preserving the completed tutorial-assistant evidence while updating stale repo-health status.
- `pnpm --filter @mbd/web exec vitest run src/app/routes/index.test.tsx src/app/layout/AppLayout.test.tsx src/features/assistant/lib/assistantState.test.ts src/features/assistant/data/assistantGuidance.test.ts src/features/assistant/components/AssistantPanel.test.tsx --reporter=verbose`: PASS, 5 files / 26 tests, `3.04s`.
- Post-merge `pnpm typecheck`: PASS, Turbo `9 successful, 9 total`.
- Post-merge `pnpm build`: PASS, Turbo `5 successful, 5 total`.

## Files Changed

```text
apps/web/src/workers/sim.worker.frontOfficeIdentity.ts
apps/web/src/workers/sim.worker.onboardingBalance.test.ts
.logs/onboarding-balance-sample.json
.logs/goal-progress.md
STATUS.md
```

## Known Limitations

- This folder is not a git repository, so changed-file inventory is manual.
- The default automated balance guard uses one real regular-season sim per variant. The true two-season path is currently too slow/volatile to serve as a normal test gate.
- Season-end raw fan sentiment is dominated by the existing global fan model on seed `12701`; Day One fan deltas and free-agent appeal remain the cleaner onboarding-layer fan signals.

## Next Goal

```text
/goal Build a performant multi-season onboarding balance attribution harness: run two-season deterministic samples across all Day One variants without timeouts; separate onboarding-layer deltas from global owner/fan/prospect systems; tune only justified constants if owner/prospect volatility remains too wide; address or re-baseline the current game-engine-core/story bundle budget failures; keep save compatibility; run typecheck/build/targeted/full tests; update .logs/goal-progress.md plus STATUS.md with evidence and the exact next /goal.
```
