# STATUS — Sprint 3 News Inbox

Status: **COMPLETE** for the news inbox feature. One GOAL.md Done When item ("`/MBD/news` hard-reload survives Sprint 2's BrowserRouter basename — should be free") turned out to be over-scoped — see "Hard-reload behavior" below — and is queued as its own sprint.

## What shipped

A `/news` route lazy-loaded under `AppLayout` that surfaces the worker-backed news feed. The page renders worker `NewsItem` objects newest-first via `getNews(100)`, supports an `All / Unread` toggle and a category filter, marks items read through `markNewsRead(id)` and persists the resulting state through the existing IndexedDB save path. The Sidebar gains a `News` entry (lucide `Inbox` — Press Room keeps `Newspaper`). The TopBar gains an unread-count chip that decrements as the user reads. Mobile-survivable at 375×667 with no horizontal overflow.

## Files changed

`git diff --stat origin/main..HEAD`:

```text
.logs/goal-progress.md                                     | 151 ++++++++++
STATUS.md                                                  | (this file)
apps/web/docs/screenshots/sprint-3/01-dashboard-after-month.png
apps/web/docs/screenshots/sprint-3/02-news-inbox-unread.png
apps/web/docs/screenshots/sprint-3/03-news-category-filter.png
apps/web/docs/screenshots/sprint-3/04-news-item-read.png
apps/web/docs/screenshots/sprint-3/05-news-mobile-375.png
apps/web/docs/screenshots/sprint-3/06-news-hard-reload-blocked.png
apps/web/src/app/layout/Sidebar.tsx          | +2 lines (News nav entry)
apps/web/src/app/layout/Sidebar.test.tsx     | +1 line
apps/web/src/app/layout/TopBar.tsx           | +49 lines (unread chip)
apps/web/src/app/layout/TopBar.test.tsx      | new
apps/web/src/app/routes/index.tsx            | +4 lines (/news route)
apps/web/src/app/routes/index.test.tsx       | +19 lines
apps/web/src/features/news/routes/NewsPage.tsx       | new (431 lines)
apps/web/src/features/news/routes/NewsPage.test.tsx  | new (238 lines)
apps/web/src/features/news/lib/newsEvents.ts         | new (18 lines, event dispatcher for cross-component read updates)
```

Pre-existing dirty file left untouched on disk: `.claude/launch.json` (local-only dev-server path override, not committed).

## Validations run

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
```

Latest: PASS — `Tasks: 9 successful, 9 total` in 7.669s.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
```

Latest: PASS — `Tasks: 8 successful, 8 total` in 1m23.837s. Web 99 files / 624 tests (was 97/618 — Sprint 3 adds 2 test files and 6 tests). Sim-core 137 files / 1610 tests. Contracts 1 file / 20 tests. UI 1 file / 1 test. Existing non-fatal console noise unchanged.

```text
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
```

Latest: PASS — `Tasks: 5 successful, 5 total` in 6.347s. Vite built in 4.69s. PWA precached 120 entries (was 118; +2 from new NewsPage chunk and test screenshots). New chunk: `dist/assets/NewsPage-*.js` at **10.08 KB raw / 3.39 KB gzip**. Worker chunks unchanged (game-engine-core 450.75 KB, game-engine-story 452.10 KB). `bundleBudget.test.ts` passes — no edit to `apps/web/docs/BUDGETS.md` or `bundleConfig.ts`.

Focused gates:

```text
pnpm --filter @mbd/web test src/features/news/routes/NewsPage.test.tsx src/app/layout/TopBar.test.tsx
```

Result: PASS — 2 files / 5 tests.

## Browser evidence

Dev server: `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev` → Vite at `http://localhost:5173/MBD/`.

Screenshots under `apps/web/docs/screenshots/sprint-3/`:

- `01-dashboard-after-month.png` — Day 31 save with News nav + TopBar unread chip context.
- `02-news-inbox-unread.png` — `/MBD/news` inbox list with worker news.
- `03-news-category-filter.png` — category filter applied to `Trade`.
- `04-news-item-read.png` — opened item shows `Read`; TopBar chip ticks from "News 100" to "News 99".
- `05-news-mobile-375.png` — 375×667 viewport, `horizontalOverflow=false`.
- `06-news-hard-reload-blocked.png` — captured during the hard-reload probe (see "Hard-reload behavior" below). Documents pre-existing app-wide behavior, not a Sprint 3 regression.

IndexedDB proof from `mbd-saves` / `save-slot-2`:

| Stage | total | unread |
| --- | --- | --- |
| Before any read | 580 | 580 |
| After opening one item | 580 | 579 |
| After full page reload | 580 | 579 |

Read state persists through reload at the data layer — only the routing-to-Save-Hub redirect masks it visually.

## Bundle impact

New chunk: `NewsPage-*.js` at 10.08 KB raw / 3.39 KB gzip — well under all relevant ceilings. App index unchanged at 202.96 KB raw / 57.68 KB gzip. CSS at 58.27 KB / 10.91 KB. Worker chunks unchanged. No `bundleConfig.ts` or `BUDGETS.md` edit needed.

## Hard-reload behavior — pre-existing, not a Sprint 3 limitation

The GOAL.md included this Done When item:

> `/MBD/news` hard-reload survives Sprint 2's BrowserRouter basename (should be free).

That claim was wrong. Sprint 2's BrowserRouter fix solved **URL parsing** (`/MBD/news` now resolves to the `/news` route table entry instead of throwing Vite's "configured public base URL" error). It did NOT solve **state hydration**.

`apps/web/src/app/layout/AppLayout.tsx:446` has:

```ts
if (!isInitialized) {
  return <Navigate to="/" replace />;
}
```

`useGameStore` is a plain Zustand store with no persistence middleware, so `isInitialized` resets to `false` on every hard reload. This redirect fires on **every** in-game route: `/dashboard`, `/roster`, `/trade`, `/draft`, `/news`, etc. — not just news.

That is the current app design ("user must pick a save explicitly"), and it is the same behavior Sprint 2's STATUS already documented at `/MBD/dashboard`. Sprint 3 surfaces it again because the news inbox is one more in-game route, but it is not a Sprint 3 regression. Sprint 3 ships the news inbox feature complete; the auto-resume-on-reload polish is a separate sprint that affects the entire app shell.

The IndexedDB evidence above confirms the actual data layer is correct: read state writes through `markNewsRead → save` and survives the reload at the data level. Only the routing-to-Save-Hub redirect masks it visually.

## Day-One / scope decisions made during the run

- Codex picked the lucide `Inbox` icon for the Sidebar News entry. `Newspaper` stayed with Press Room as instructed.
- Codex added a tiny `newsEvents.ts` event dispatcher so the TopBar unread chip can react to `markNewsRead` calls from the NewsPage without coupling the two components. Allowed by the "Autonomy rules" section of GOAL.md.

## Known limitations

- **Pre-existing app behavior:** hard reloads of in-game routes always redirect to Save Hub because `useGameStore` does not persist `isInitialized` across reloads. Covered by the next sprint candidate below.
- **`getNews()` returns the unread queue, not full history.** Once an item is read, a fresh refetch will no longer include it. Session UI shows it as read for the current pageview; a navigation away and back will drop it from the visible list. This matches the worker query's current semantics. Surfacing full historical news would require touching `sim.worker.queries.ts` (protected).

## Risks

- After `markNewsRead`, the page writes the active save through `saveGame` to persist read state. If save-write fails (Dexie quota, etc.), the UI keeps the in-session read state and surfaces an error toast. Watch for save-write latency if a user opens many items quickly — there's no debouncing in this sprint.
- The unread chip in TopBar refetches via `getNews()` after each read. Acceptable today because the news queue is bounded; if news volume grows materially, consider a derived count exposed through the worker.

## Rollback notes

Revert the merge commit. No schema bump, no migration, no contract/sim-core/worker changes, no new dependencies, no budget changes. v33 saves load unchanged after revert.

## Next /goal

The most important next polish — directly serving Kevin's v1.0.1 bar ("0 errors, easy to understand, runs like a G") — is the auto-resume-on-hard-reload work that Sprint 3 surfaced. Recommend running it as **Sprint 3.5 (Hard-reload state survival)** before Sprint 4's player-profile / open-negotiations work.

```text
/goal Implement auto-resume of the active save on browser hard reload. Read GOAL.md (Sprint 3.5 contract), README.md, CHANGELOG.md, MASTER_CONTEXT.md, the existing STATUS.md, and the existing useGameStore + AppLayout. Persist enough of useGameStore (active save id/slot, last-known phase context) to localStorage via Zustand persist middleware, then on app boot if the persisted save id resolves in IndexedDB, load it through the worker before AppLayout's isInitialized guard fires. Cover loading and recovery states. Validate with pnpm typecheck + pnpm test + pnpm build, run pnpm --filter @mbd/web dev for a full browser smoke (hard-reload /dashboard, /roster, /news, /trade), and keep evaluator-visible proof in .logs/goal-progress.md plus the transcript. Stop only when every Done When item in the new GOAL.md is satisfied, or pause if a Pause Condition is hit. Before stopping, write STATUS.md with what shipped, files changed, validations run, browser evidence under apps/web/docs/screenshots/sprint-3-5/, known limitations, risks, rollback notes, and the exact next /goal.
```

Claude Code will draft the actual Sprint 3.5 GOAL.md before that command runs.
