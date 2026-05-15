# STATUS - Sprint 3.5 Hard-Reload State Survival

Status: **COMPLETE** for the hard-reload state survival mission. The active save shell state now persists to localStorage, app boot auto-loads the persisted save through the existing safe save/worker path, and hard-reloaded in-game routes render their route instead of falling back to Save Hub.

## What shipped

`useGameStore` now persists only the allowed shell fields under `mbd:game-store@v1`: active save id/slot, user team id, season, day, phase, team name, GM name, and difficulty. `AppBootGate` wraps the router, shows a `Resuming save...` route-level skeleton while loading, calls `loadSaveSafely(activeSaveId)`, imports the snapshot through `worker.importSnapshot`, then calls `initializeGame(...)` before `AppLayout` can redirect. Missing save ids clear the stale persisted active-save fields and fall through to Save Hub; corrupt saves route through the existing Save Recovery dialog.

## Files changed

Current implementation diff is intentionally inside the Sprint 3.5 allowed scope plus proof artifacts:

```text
.logs/goal-progress.md
STATUS.md
apps/web/docs/screenshots/sprint-3-5/*.png
apps/web/src/app/App.test.tsx
apps/web/src/app/App.tsx
apps/web/src/app/boot/AppBootGate.test.tsx
apps/web/src/app/boot/AppBootGate.tsx
apps/web/src/shared/hooks/useGameStore.test.ts
apps/web/src/shared/hooks/useGameStore.ts
```

Pre-existing local dirt left untouched:

```text
.claude/launch.json
.claude/scheduled_tasks.lock
```

`git diff --stat origin/main..HEAD`:

```text
 .logs/goal-progress.md                             | 121 +++++++
 GOAL.md                                            | 355 ++++++++++-----------
 STATUS.md                                          | 180 ++++++-----
 .../sprint-3-5/01-dashboard-before-hard-reload.png | Bin 0 -> 156026 bytes
 .../sprint-3-5/02-dashboard-after-hard-reload.png  | Bin 0 -> 139473 bytes
 .../sprint-3-5/03-news-before-hard-reload.png      | Bin 0 -> 126471 bytes
 .../sprint-3-5/04-news-after-hard-reload.png       | Bin 0 -> 103543 bytes
 .../sprint-3-5/05-roster-after-hard-reload.png     | Bin 0 -> 135451 bytes
 .../sprint-3-5/06-trade-after-hard-reload.png      | Bin 0 -> 150587 bytes
 .../sprint-3-5/07-draft-after-hard-reload.png      | Bin 0 -> 93716 bytes
 .../sprint-3-5/08-save-hub-after-delete-slot.png   | Bin 0 -> 135242 bytes
 .../09-missing-save-fallback-save-hub.png          | Bin 0 -> 138231 bytes
 .../sprint-3-5/10-corrupt-save-recovery-dialog.png | Bin 0 -> 89768 bytes
 .../11-dashboard-mobile-375-after-hard-reload.png  | Bin 0 -> 32785 bytes
 apps/web/src/app/App.test.tsx                      |   4 +
 apps/web/src/app/App.tsx                           |  33 +-
 apps/web/src/app/boot/AppBootGate.test.tsx         | 283 ++++++++++++++++
 apps/web/src/app/boot/AppBootGate.tsx              | 171 ++++++++++
 apps/web/src/shared/hooks/useGameStore.test.ts     |  72 +++++
 apps/web/src/shared/hooks/useGameStore.ts          | 118 ++++---
 20 files changed, 1008 insertions(+), 329 deletions(-)
```

## Validations run

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/shared/hooks/useGameStore.test.ts src/app/boot/AppBootGate.test.tsx
```

Red proof: FAIL as expected before implementation. The store persistence test saw `persisted.version` as `undefined`, and `AppBootGate.tsx` did not exist.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web test src/shared/hooks/useGameStore.test.ts src/app/boot/AppBootGate.test.tsx src/app/App.test.tsx
```

Latest focused result: PASS, 3 files / 8 tests.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
```

PASS. Turbo reported `Tasks: 9 successful, 9 total` in `5.418s`.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
```

PASS. Turbo reported `Tasks: 8 successful, 8 total` in `1m23.712s`. Web passed 101 files / 629 tests, sim-core passed 137 files / 1610 tests, contracts passed 1 file / 20 tests, and UI passed 1 file / 1 test. Existing non-fatal console noise remained: Recharts zero-size warnings, React `act(...)` warnings, service worker failure-test log, and the existing ScoutingPage mock-function log.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
```

PASS. Turbo reported `Tasks: 5 successful, 5 total` in `4.134s`; Vite built in `3.28s`; PWA precached 120 entries. Bundle budget stayed green. Main app chunk: `index-jENJPu8m.js` 205.74 KB raw / 58.38 KB gzip. Worker chunks remained `game-engine-core` 450.75 KB raw and `game-engine-story` 452.10 KB raw.

## Browser evidence

Dev server:

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev
```

PASS at `http://localhost:5173/MBD/`.

Screenshots under `apps/web/docs/screenshots/sprint-3-5/`:

- `01-dashboard-before-hard-reload.png` - dashboard loaded from Save Hub continue.
- `02-dashboard-after-hard-reload.png` - `/MBD/dashboard` after hard reload, dashboard rendered.
- `03-news-before-hard-reload.png` - News Inbox before hard reload.
- `04-news-after-hard-reload.png` - `/MBD/news` after hard reload, News Inbox rendered.
- `05-roster-after-hard-reload.png` - `/MBD/roster` after hard reload, Roster rendered.
- `06-trade-after-hard-reload.png` - `/MBD/trade` after hard reload, Trade Center rendered.
- `07-draft-after-hard-reload.png` - `/MBD/draft` after hard reload, Draft Room rendered.
- `08-save-hub-after-delete-slot.png` - active Slot 1 deleted for missing-save fallback.
- `09-missing-save-fallback-save-hub.png` - stale persisted id fell through to Save Hub.
- `10-corrupt-save-recovery-dialog.png` - corrupt persisted save hit Save Recovery actions.
- `11-dashboard-mobile-375-after-hard-reload.png` - 375x667 dashboard hard reload rendered dashboard with `scrollWidth=375`.

Routes hard-reloaded successfully without Save Hub redirect:

```text
/MBD/dashboard
/MBD/news
/MBD/roster
/MBD/trade
/MBD/draft
```

localStorage before dashboard reload:

```json
{"state":{"activeSaveId":"save-slot-1","activeSaveSlot":1,"userTeamId":"nym","season":1,"day":1,"phase":"preseason","teamName":"New York Tycoons","gmName":"Mobile Smoke","difficulty":"standard"},"version":1}
```

localStorage after dashboard reload:

```json
{"state":{"activeSaveId":"save-slot-1","activeSaveSlot":1,"userTeamId":"nym","season":1,"day":1,"phase":"preseason","teamName":"New York Tycoons","gmName":"Mobile Smoke","difficulty":"standard"},"version":1}
```

Missing-save fallback cleared the stale active save id and rendered Save Hub. Corrupt-save fallback cleared the stale active save id and showed the existing Save Recovery action surface; post-recovery storage was:

```json
{"state":{"activeSaveId":null,"activeSaveSlot":null,"userTeamId":"nym","season":1,"day":1,"phase":"preseason","teamName":"New York Tycoons","gmName":"Smoke Tester","difficulty":"standard"},"version":1}
```

## Save Recovery integration

Auto-resume uses `loadSaveSafely(activeSaveId)`. Non-missing `{ ok: false }` results call `SaveRecoveryProvider.showFailure(...)` with a retry callback, matching the manual Save Hub load path. `AppBootGate.test.tsx` covers the corrupt-save branch, and browser evidence `10-corrupt-save-recovery-dialog.png` confirms the recovery action surface appears for a malformed persisted save.

## Known limitations

- The in-app Browser read-only page scope did not expose `localStorage` or `indexedDB`, so exact storage snapshots and 375x667 viewport metrics were captured in a separate Playwright context against the same dev server.
- Auto-resume intentionally does not persist or duplicate snapshots in localStorage. IndexedDB remains the source of truth for heavy save data.
- If localStorage is disabled, the app behaves like the old flow and falls back to Save Hub on hard reload.

## Risks

- Browser storage edge cases remain the main risk: localStorage denied, IndexedDB blocked, quota pressure, or a stale persisted id after manual browser data cleanup. The implemented behavior clears stale active-save state and falls back to Save Hub.
- Worker import failures now surface through Save Recovery as `storage_failed`; watch production telemetry/manual reports for any confusing copy if a future worker compatibility error is not truly storage-related.

## Rollback notes

Revert the Sprint 3.5 merge commit. No save schema bump, no migration, no worker/sim-core/contracts changes, no new dependencies. Existing `mbd:game-store@v1` localStorage entries become inert on the old code path; users can also remove that key manually if needed.

## Next /goal

```text
/goal Implement Sprint 4: wire orphaned player-profile + open-negotiations endpoints. Read README.md, CHANGELOG.md, MASTER_CONTEXT.md, STATUS.md, GOAL.md, the player profile route/tests, trade negotiation route/tests, useWorker, and worker query/action surfaces first. Keep save schema v33 and do not touch sim-core/contracts unless GOAL.md explicitly allows it. Wire the existing worker endpoints into the player profile and open-negotiations UI so hard-reloaded long-running saves can inspect a player and resume active trade talks without dead controls. Add focused tests for player-profile endpoint wiring and open-negotiations resume behavior, then validate with pnpm typecheck + pnpm test + pnpm build and a dev-server browser smoke. Keep proof in .logs/goal-progress.md and finish with STATUS.md.
```
