# STATUS - Sprint 4 Front Office Marathon

Status: **SHIPPED** on `goal/sprint-4-front-office`.

## What Shipped

Sprint 4 wires the revised front-office scope end to end: a read-only Trade Negotiations Inbox at `/trade-negotiations`, a detail route at `/trade-negotiations/:negotiationId`, Sidebar navigation, Trade Builder deep-link loading from `?negotiationId=`, player-name cross-links across Trade/Draft/Scouting/Stats/News, and a Trade Value panel on Player Profile. The implementation stayed consumer-only: no save schema bump, no new worker query/action methods, no sim-core changes, and no new dependencies.

## Files Changed

`git diff --stat origin/main..HEAD` before the Milestone 10 docs commit:

```text
 .logs/goal-progress.md                             |  89 ++++
 GOAL.md                                            | 589 +++++++++++++--------
 STATUS.md                                          | 178 +++----
 apps/web/src/app/layout/Sidebar.test.tsx           |   2 +
 apps/web/src/app/layout/Sidebar.tsx                |   2 +
 apps/web/src/app/routes/index.tsx                  |   8 +
 .../src/features/draft/routes/DraftPage.test.tsx   |   4 +
 apps/web/src/features/draft/routes/DraftPage.tsx   |  41 +-
 .../features/league/routes/LeadersPage.test.tsx    |   4 +
 .../web/src/features/news/routes/NewsPage.test.tsx |  23 +-
 apps/web/src/features/news/routes/NewsPage.tsx     |  89 +++-
 .../players/routes/PlayerProfilePage.test.tsx      |  40 +-
 .../features/players/routes/PlayerProfilePage.tsx  |  92 +++-
 .../scouting/components/ScoutConflictsTab.tsx      |  13 +-
 .../features/scouting/routes/ScoutingPage.test.tsx | 228 +++++++-
 .../src/features/scouting/routes/ScoutingPage.tsx  |  51 +-
 .../routes/TradeNegotiationDetailPage.test.tsx     | 173 ++++++
 .../routes/TradeNegotiationDetailPage.tsx          | 376 +++++++++++++
 .../routes/TradeNegotiationsInboxPage.test.tsx     | 180 +++++++
 .../routes/TradeNegotiationsInboxPage.tsx          | 267 ++++++++++
 .../trade/components/DeadlineDramaPanel.tsx        |   8 +-
 .../src/features/trade/routes/TradePage.test.tsx   | 100 ++++
 apps/web/src/features/trade/routes/TradePage.tsx   | 168 +++++-
 apps/web/src/shared/hooks/useWorker.ts             |   6 +-
 24 files changed, 2299 insertions(+), 432 deletions(-)
```

Milestone 10 also adds `apps/web/docs/screenshots/sprint-4/*.png`, rewrites this `STATUS.md`, and commits the accumulated `.logs/goal-progress.md` journal entry from Milestone 9.

Pre-existing local change left untouched:

```text
.claude/launch.json
```

## Validations Run

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
```

Final tail:

```text
Tasks:    9 successful, 9 total
Cached:    8 cached, 9 total
Time:    5.386s
```

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
```

Final tail:

```text
@mbd/web:test:  Test Files  103 passed (103)
@mbd/web:test:       Tests  641 passed (641)
@mbd/web:test:    Duration  79.87s

Tasks:    8 successful, 8 total
Cached:    7 cached, 8 total
Time:    1m20.508s
```

Known test noise remained the existing Recharts zero-size warnings, React `act(...)` warnings, intentional mocked worker failure log in the Inbox error test, and the intentional service-worker registration failure test.

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
```

Final tail:

```text
@mbd/web:build: ✓ built in 3.23s
@mbd/web:build: PWA v1.2.0
@mbd/web:build: precache  122 entries (3286.88 KiB)

Tasks:    5 successful, 5 total
Cached:    4 cached, 5 total
Time:    4.03s
```

## Browser Evidence

Dev server:

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev
```

Captured screenshots:

| File | Evidence |
| --- | --- |
| `01-trade-negotiations-inbox.png` | `/MBD/trade-negotiations` with open negotiation rows. |
| `02-trade-negotiations-empty.png` | Empty Inbox state. |
| `03-trade-negotiation-detail.png` | Detail route with proposal, counter-offer, and dialogue. |
| `04-trade-negotiation-detail-awaiting-counter.png` | Detail route where `counterOffer === null`. |
| `05-trade-deep-link-loaded.png` | `/MBD/trade?negotiationId=<id>` with builder seeded from the negotiation. |
| `06-trade-clickable-name.png` | Trade player name focused/hovered as a `/players/:id` link. |
| `07-draft-clickable-prospect.png` | Draft prospect focused/hovered as a player-profile link. |
| `08-scouting-clickable-name.png` | Scouting result/report player link. |
| `09-stats-clickable-leader.png` | Leaderboard player link. |
| `10-news-player-chip.png` | News related-player chip linking to `/players/:id`. |
| `11-player-profile-trade-value.png` | Player Profile Trade Value panel. |
| `12-trade-negotiations-mobile-375.png` | Inbox at 375x667 with no horizontal overflow. |
| `13-trade-negotiations-hard-reload.png` | Inbox after hard reload, still on route. |

Browser smoke checks:

```text
First pass: 01-06 captured; consoleErrors: []; pageErrors: [].
Second pass: 07-13 captured; consoleErrors: []; pageErrors: [].
Mobile no-overflow: /trade-negotiations true; /trade-negotiations/:id true.
Hard reload: /trade-negotiations true; /trade-negotiations/:id true.
```

The Codex in-app browser screenshot command timed out on `Page.captureScreenshot`, so the committed screenshots were captured with a local Playwright Chromium fallback using the same running dev server. Playwright was installed into the user cache only; repo package manifests were not changed.

## Cross-Linking Coverage

| Surface | Coverage |
| --- | --- |
| Roster | Existing baseline already links player names. |
| Free Agency | Existing baseline already links player names. |
| Minors | Existing baseline already links prospects to player profiles/development. |
| Trade | Shipped links in trade assets, offer summaries, active negotiation packages, deadline panels, and deep-link builder flow. |
| Draft | Shipped links for structured prospects and draft-board contexts. |
| News | Shipped related-player chips from machine-readable `relatedPlayerIds`; no prose parsing. |
| Scouting | Shipped links for structured pro/IFA reports, search results, recent reports, board entries, and conflict headlines. |
| Stats | Existing production leaderboard links verified with regression coverage. |

## Bundle Impact

Build and bundle-budget test passed with no ceiling changes. New route chunks are lazy-loaded:

```text
TradeNegotiationsInboxPage-D2RxZ2hf.js    7.27 kB | gzip 2.26 kB
TradeNegotiationDetailPage-BeonUzVy.js    9.05 kB | gzip 2.73 kB
TradePage-BlCLVm2_.js                    68.41 kB | gzip 13.46 kB
DraftPage-DjO87OaK.js                    34.09 kB | gzip 7.07 kB
ScoutingPage-CGK5jiXs.js                 34.79 kB | gzip 6.98 kB
LeadersPage-CT2DrRUP.js                   7.84 kB | gzip 2.08 kB
NewsPage-CFthlCeJ.js                     10.62 kB | gzip 3.64 kB
PlayerProfilePage-BACNN7vy.js            14.43 kB | gzip 4.57 kB
index-B5O8n8bI.js                       206.42 kB | gzip 58.54 kB
```

`apps/web/src/build/bundleBudget.test.ts` passed as part of `pnpm test`. `apps/web/docs/BUDGETS.md` and `apps/web/src/build/bundleConfig.ts` were read; no budget lift was made.

## Worker Method Confirmation

Newly consumed existing methods:

- `getOpenNegotiations()` in the Inbox route.
- `getNegotiation(negotiationId)` in the detail route and Trade Builder deep-link load.
- `getPlayerTradeValue(playerId)` on Player Profile through the existing worker API, newly forwarded by `useWorker`.

Confirmed:

- Zero new worker query/action methods.
- Zero edits to `apps/web/src/workers/sim.worker.queries.ts`.
- Zero edits to `apps/web/src/workers/sim.worker.actions.ts`.
- Zero edits to `apps/web/src/workers/sim.worker.trade.ts`.
- Zero save schema changes and no `packages/contracts/**` edits.
- No new dependencies.
- No new `Math.random()` or production `console.*` calls in the Sprint 4 diff.

## Sprint 3.5 Invariant

The new routes hard-reload successfully:

| Route | Result |
| --- | --- |
| `/MBD/trade-negotiations` | Reload lands on Inbox, not Save Hub. |
| `/MBD/trade-negotiations/:id` | Reload lands on the detail route shell/graceful not-found for a non-persisted smoke negotiation, not Save Hub. |

The new routes render at 375x667 without horizontal overflow:

| Route | Result |
| --- | --- |
| `/MBD/trade-negotiations` | `scrollWidth === clientWidth === 375`. |
| `/MBD/trade-negotiations/:id` | `scrollWidth === clientWidth === 375`. |

Protected Sprint 3.5 files were not changed: `saveSystem.ts`, `AppBootGate.tsx`, `useGameStore.ts`, and `features/save-recovery/**`.

## Known Limitations

- News links use structured `relatedPlayerIds` only; narrative player names without a machine-readable player reference remain plain text.
- Trade narrative/ticker prose that lacks a structured player asset remains plain text; no regex/name parsing was introduced.
- The smoke-created negotiation was in-memory for the live browser profile. Hard reload of that exact detail ID confirms route survival and graceful unavailable-state handling, while the live detail screenshot confirms the full detail UI before reload.
- Stats leaderboard rows were already linked in production code; Sprint 4 added regression coverage rather than route-code churn.

## Risks

- The Inbox is intentionally read-only. Accept/counter/reject actions deep-link into the existing Trade Builder rather than calling worker actions from the Inbox.
- Player Profile Trade Value depends on the existing worker method returning a value for the current player; the UI handles `null` by showing an unavailable state.
- Browser screenshots used a copied local profile plus Playwright fallback because the in-app screenshot command timed out; this affects evidence collection only, not app code or dependencies.

## Rollback Notes

Rollback is straightforward: revert the Sprint 4 feature/docs commits on `goal/sprint-4-front-office` or revert the eventual merge commit. No migration rollback is required because save schema remains v33, no contracts changed, and no new dependencies were added.

## Exact Next /goal

```text
/goal Review Sprint 4 PR #78 against GOAL.md and STATUS.md, inspect apps/web/docs/screenshots/sprint-4/, then have Claude Code flip the draft PR ready or request targeted fixes.
```
