# MBD Release and Playtest Checklist

Use this before a demo, release branch handoff, or public build. It is stricter than a normal focused implementation slice: release readiness needs broad automated gates plus manual play through the routes that prove a save can survive real use.

## Preconditions

- Start from a clean install. If `node_modules` is missing, run `CI=true pnpm install --frozen-lockfile` from the repo root.
- Read `docs/ADR_0001_WEB_PWA_FIRST_PLATFORM.md`. v1 ships as browser plus installable PWA; desktop/Steam wrapper work is explicitly deferred.
- Confirm the current snapshot version in `packages/contracts/src/schemas/save.ts` and read any migration notes in `STATUS.md`.
- If the workspace is a real git checkout, record `git status --short` before and after the release sweep and stage files explicitly. Never use `git add -A`.
- If this is the extracted `/Users/tkevinbigham/Downloads/MBD-main` snapshot, `.git` is expected to be absent and staging is not available.

## Mandatory Gates

Run these from the repo root unless a command says otherwise:

```bash
pnpm typecheck
pnpm test
pnpm build
```

GitHub CI/Deploy intentionally split the expensive sim-core smoke gate out of the workspace test matrix: `MBD_SKIP_SMOKE_GATE=1 pnpm verify` runs the broad workspace gate with `MBD_SKIP_SMOKE_GATE` passed through Turbo's `test` task environment, then `pnpm --filter @mbd/sim-core exec vitest run tests/smokeGate.integration.test.ts --reporter=verbose` runs the multi-season smoke gate in isolation. For local release sweeps, keep `pnpm test` plus the focused smoke command below unless runtime is being triaged.

The Deploy workflow includes a GitHub Pages availability check before upload/deploy. Private repos on plans without Pages support still run install, verify, smoke gate, determinism snapshot, and build, then skip the Pages publish steps with a workflow notice instead of failing after a valid artifact build.

If root `pnpm` is unavailable in an extracted snapshot, run the local package equivalents and record that root Turbo could not run:

```bash
cd apps/web
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/vite build
```

Focused release gates:

```bash
pnpm --filter @mbd/web exec vitest run src/build/bundleConfig.test.ts src/build/bundleBudget.test.ts
pnpm --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/workers/snapshot.onboarding.test.ts src/shared/lib/saveSystem.test.ts
pnpm --filter @mbd/sim-core exec vitest run tests/smokeGate.integration.test.ts --reporter=verbose
pnpm --filter @mbd/contracts test
pnpm run verify:determinism
pnpm --filter @mbd/sim-core run playtest:sample
pnpm --filter @mbd/sim-core run playtest:calibrate
```

When a change touches a specific domain, add that domain's focused tests before the broad gates. Examples:

```bash
pnpm --filter @mbd/web exec vitest run src/features/history
pnpm --filter @mbd/web exec vitest run src/features/trade
pnpm --filter @mbd/sim-core test
```

Save-schema changes require extra proof before any release handoff:

- Version bump in `CURRENT_GAME_SNAPSHOT_VERSION`.
- Migration/defaulting path in `packages/contracts/src/schemas/save.ts`.
- Updated fixture under `packages/contracts/tests/fixtures/save/v*/`.
- `packages/contracts/tests/save.migration.test.ts` coverage.
- Worker import/export coverage proving old saves still load through `apps/web/src/workers/snapshot.ts`.
- Explicit Season 10 reasoning in the handoff.

For v34 archived-game saves, also verify:

- `packages/contracts/tests/fixtures/save/v33/season10.json` migrates to v34 with `narrative.archivedGames: []`.
- `packages/contracts/tests/fixtures/save/v34/core.json` parses and round-trips.
- Timeline memory beats can link to `/games/:archivedGameId` while live current-season games still use numeric `/games/:gameIndex` and enhanced live play-by-play.
- Old saves do not fabricate historic box-score details; only future qualifying major games are archived.

## Bundle Budget Gate

Bundle ceilings live in `apps/web/src/build/bundleConfig.ts`; rationale lives in `apps/web/docs/BUDGETS.md`.

```bash
pnpm --filter @mbd/web exec vitest run src/build/bundleConfig.test.ts src/build/bundleBudget.test.ts --reporter=verbose
pnpm --filter @mbd/web build
```

If a budget fails:

- Capture chunk name, raw bytes, gzip bytes, and the configured budget.
- Inspect `resolveWorkerManualChunk()` before raising a ceiling.
- Prefer moving payload-heavy deterministic story code into an existing scoped worker chunk.
- Raise a budget only when the feature is intentionally larger, and document the feature in the budget comment plus `apps/web/docs/BUDGETS.md`.

## Platform / PWA Gate

The v1 platform decision is web/PWA-first. Do not add Electron, Tauri, Steamworks, or native file-system wrappers to satisfy this gate. Use the existing browser shell, service worker, install prompt, and save import/export seams.

Focused platform checks:

```bash
pnpm --filter @mbd/web exec vitest run src/build/pwaConfig.test.ts src/build/registerServiceWorker.test.ts src/build/deadChunkReload.test.ts src/features/settings/hooks/useSettingsInstallPrompt.test.tsx --reporter=verbose
pnpm --filter @mbd/web build
```

Manual platform checks before a v1 handoff:

- Installability: confirm the manifest advertises `/MBD/`, standalone display, icon assets, and the Settings install action reports prompt/unavailable/installed states correctly for the browser under test.
- Offline: after loading the built app once, reload while offline and confirm the shell returns from the service worker. New-game creation must still work from the precached worker/content chunks.
- Update: deploy or locally simulate a new service-worker controller and confirm the refresh toast appears and reloads the page on action.
- Save recovery: create a save, autosave after sim, reload, export/import, and verify the save recovery dialog still handles failed safe loads.

## Quality Gates

These are useful before public release, but some are report-oriented:

```bash
pnpm run verify:quality
pnpm run verify:structure
pnpm run verify:cycles
```

## Known Acceptable Warnings

- `verify:structure` uses `knip --no-exit-code`; treat output as an audit report, not an automatic release blocker.
- `verify:cycles` runs `madge ... || true`; existing cycles should be reviewed, but the script intentionally does not fail the release by itself.
- Vite/PWA build output includes generated service-worker and Workbox files in `dist/`.
- Some jsdom/Recharts tests may print environment warnings; release evidence should record warnings that appeared and confirm there were no failed tests.

## Manual Smoke Checklist

Use a fresh browser profile or clear IndexedDB/localStorage for the first pass, then repeat key checks on an existing save.

- Save Hub: load `/`, create a new dynasty, continue an existing save, export a save, import that save, delete a disposable slot, and verify branch controls still render.
- Onboarding: start both Quick Start and Full Day One if the release touches setup, owner/front-office identity, staff, scouting, or first-day flow.
- Dashboard: sim day/week/month, verify autosave returns to the same season/day/phase after reload, open recent recap, open Game Day play-by-play, check assistant guidance, and confirm no layout overlap at desktop and mobile widths.
- Roster/Minors: promote/demote a legal player, check roster compliance warnings, inspect prospect pipeline/development focus, and confirm Rule 5/40-man constraints still explain themselves.
- Free Agency/Finance: open free-agent market, inspect market intelligence, make a test offer in a disposable save, and confirm finance overview reflects payroll/budget pressure.
- Trade: open trade center, inspect deadline theatre/market intel, build a two-team package, inspect negotiation review evidence, open multi-team modal, and cancel without corrupting route state.
- Draft/Scouting: open draft room, scout a prospect, compare board alternatives, make or simulate picks in a disposable save, and inspect post-draft grade/commentary.
- Offseason: walk through arbitration, qualifying offer, Rule 5, staff, free-agency, and phase advance actions on a disposable save when a release touches offseason state.
- History: open records, seasons, leaders, timeline, legacy, awards/HOF; expand dynasty timeline chapters; open a season recap; verify player profile links from memory beats.
- Archived Box Scores: when using a v34+ save with qualifying archived games, open a timeline Box Score link with a stable archived id and confirm the compact line score/highlights render without the enhanced live play-by-play panel.
- Settings: export/import current save, inspect diagnostics, create/delete a branch, and run archive/prune maintenance only on a disposable save.
- Press Room/Pulse/Assistant: confirm press conference flow, Monthly Pulse report/decision handling, and assistant next actions remain optional and non-blocking.

## Playtest Evidence

For release candidates, attach the generated playtest outputs or summarize their paths:

```bash
pnpm --filter @mbd/sim-core run playtest:sample
pnpm --filter @mbd/sim-core run playtest:calibrate
PLAYTEST_ONBOARDING_BALANCE=1 pnpm --filter @mbd/sim-core run playtest:calibrate
```

Review `packages/sim-core/playtest-output/sample-dynasty.md`, `calibration.md`, and `calibration.json` for:

- Run environment sanity: batting average, ERA, home runs, WAR scarcity.
- Economy sanity: payroll spread, average salary, free-agent signings, accepted extensions.
- Gameplay volume: injuries, trades, playoff variance, prospect progress.
- Onboarding balance when enabled: owner trust, fan sentiment, front-office reputation, FA appeal, scouting lift, prospect progress, monthly consequence cadence.

## Handoff Requirements

Every release handoff should include:

- Exact command list with pass/fail status.
- Manual smoke routes completed and any skipped routes with reason.
- Save-schema status: unchanged or version/migration/fixture evidence.
- Determinism status: command evidence and any snapshot change rationale.
- Bundle-budget status: pass or documented rebaseline.
- Known acceptable warnings observed during this run.
- Residual risks and recommended next playtest focus.
