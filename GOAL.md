# GOAL.md - Demo Event Readiness Sweep

> Handoff packet for the current repository state.

## Mission Status

The demo-readiness sweep and final demo-confidence pass are complete. See `STATUS.md` for the detailed closeout, validation commands, browser smoke notes, manual changed-file inventory, and remaining risks.

## Completed Scope

- Fixed broken milestone news/ticker data flow by building structured cumulative career milestone events before generating news or ticker text.
- Added regression coverage proving malformed or season-only milestone payloads cannot emit `Unknown`, `#0`, `0th`, `undefined`, or missing milestone numbers.
- Wired Trade Center `Active Talks` so persisted open negotiations are autosaved after trade actions, discovered on page entry, resumed after reload, refreshed after negotiation actions, and deep-linked by `?negotiationId=...`.
- Added focused player-profile tests for worker-backed projections, breakout intelligence, scout consensus, and similar-player panels.
- Added original fictional SVG logos for every team id used by the game and a smoke test for missing assets/fallback behavior.
- Added a demo-safe Settings/About feedback form with GitHub issue draft and mailto fallback.
- Removed true-dead legacy onboarding components reported by the structure audit.
- Updated local dev service-worker registration so Vite demo reloads do not log expected `sw.js` MIME errors.

## Guardrails Preserved

- Save schema remains v33.
- No new dependencies.
- No licensed MLB marks.
- No new `Math.random` usage.
- Existing Bloomberg-terminal/baseball-dynasty aesthetic preserved.

## Final Validation Gate

Run from `/Users/kevin/MBD-main`:

```text
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm typecheck
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm test
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm build
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH pnpm run verify:structure
PATH=/Users/kevin/.nvm/versions/node/v24.14.0/bin:$PATH PLAYTEST_SEED=2601 PLAYTEST_YEARS=2 PLAYTEST_OUT=playtest-output/demo-readiness-sweep.md MBD_PLAYTEST_DUMP=1 pnpm --filter @mbd/sim-core exec vitest run tests/playtestNarrativeDump.generate.ts
rg -n "Unknown|#0|0th|undefined" packages/sim-core/playtest-output/demo-readiness-sweep.md
```

Expected state: all commands pass; the final `rg` exits with no matches.

## Next Agent Notes

- This local folder is not a git repo. Use `STATUS.md` for the manual changed-file inventory.
- The final browser pass created a real in-browser open negotiation during an in-season save and confirmed `Active Talks` resume by reload, plain `/MBD/trade`, and `?negotiationId=...`.
- `verify:structure` still reports broad unused export/type noise and an unused dependency warning for `@mbd/design-tokens`; the sweep removed the unused onboarding files and redundant Knip entry hints it discovered.
