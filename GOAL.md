# GOAL.md — Sprint 3: News Inbox

> Single-mission contract for Codex (or any one-shot coding agent).
> Format: Goal Packet v2.0 — Kevin's one-shot ritual.
> Builds on Sprint 1 (cleanup) + Sprint 2 (Revised onboarding canonical), both already merged to `main`.

## Mission

Build a **News inbox** feature at `/news` that surfaces the worker-backed news feed the audit found unwired: `getNews(limit?)` and `markNewsRead(newsId)` are exposed by `useWorker()` and powered by `packages/sim-core/src/narrative/newsFeed.ts`, but no UI consumes them today. SettingsPage shows the unread queue count and that is the only surface.

Ship a route, a list UI, type/category filtering, read-state writes, a Sidebar nav entry, and an unread badge in the TopBar.

Stop only when every item in **Done When** is satisfied or a **Pause Condition** is hit.

## Background

`NewsItem` (from `packages/contracts/src/schemas/narrative.ts`) carries:

```ts
{
  id: string;
  headline: string;       // min 1 char
  body: string;
  priority: 1 | 2 | 3 | 4 | 5;
  category: NewsCategory; // 21 enum values
  tag?: NewsTag;          // BREAKING | ANALYSIS | RECAP | RUMOR | WATCH | DEBATE
  timestamp: string;
  relatedPlayerIds: string[];
  relatedTeamIds: string[];
  read: boolean;
}
```

Categories: `injury`, `trade`, `signing`, `extension`, `qualifying_offer`, `coaching`, `draft`, `milestone`, `performance`, `standings`, `roster_move`, `development`, `rumor`, `rivalry`, `award`, `record`, `playoff`, `arbitration`, `holdout`, `press_conference`, `league_event`.

Worker surface:

- `getNews(limit: number = 50)` — returns `NewsItem[]` from current save state.
- `markNewsRead(newsId: string)` — flips `read: true` on the targeted item and the worker persists through the existing flow.

Both methods are already exposed in `apps/web/src/shared/hooks/useWorker.ts`.

## Baseline

- `main` HEAD: `77e5513` (Sprint 2 — Revised onboarding becomes canonical, merged via PR #75).
- Sprint 1 + Sprint 2 are both on `main`. This branch is based directly on the post-Sprint-2 main.
- Save schema: `CURRENT_GAME_SNAPSHOT_VERSION = 33`. Do not bump.
- Test counts after Sprint 2: 97 web / 137 sim-core / 1 contracts files, ~2,250 tests passing.

## Read first

Inspect these before editing. Do not skip.

**Repo orientation:**
- `README.md`, `CHANGELOG.md`, `MASTER_CONTEXT.md`
- `GOAL.md` (this file)
- Previous `STATUS.md` if still present (Sprint 2's report)

**Data contract:**
- `packages/contracts/src/schemas/narrative.ts` lines 1–60 (NewsPriority, NewsTag, NewsCategory, NewsItem) — PROTECTED, read-only

**Worker surface:**
- `apps/web/src/workers/sim.worker.queries.ts` — find `getNews(limit: number = 50)` (around line 2666) — PROTECTED
- `apps/web/src/workers/sim.worker.actions.ts` — find `markNewsRead(newsId: string)` (around line 2862) — PROTECTED
- `apps/web/src/shared/hooks/useWorker.ts` — confirm both methods are already exposed; the `mutationMethods` Set should already include `markNewsRead`

**App shell (integration points):**
- `apps/web/src/app/routes/index.tsx` — route table where `/news` slots in alongside the other lazy-loaded route components
- `apps/web/src/app/layout/Sidebar.tsx` — `NAV_ITEMS` array around lines 45–73; that's where the News entry goes. Press Room already owns the `Newspaper` icon — pick a different lucide-react icon (e.g. `Inbox`, `Mail`, `Bell`)
- `apps/web/src/app/layout/TopBar.tsx` — where the unread badge mounts. The component already imports `Link` and renders a help icon button on the right; an unread chip fits cleanly there or as a small dot/count next to the Sidebar nav entry

**Existing patterns to lean on:**
- `apps/web/src/features/press-room/routes/PressRoomPage.tsx` — feed-style list with worker data
- `apps/web/src/features/history/routes/HistoryPage.tsx` — large feed with filter tabs and grouped sections
- `apps/web/src/features/records/routes/RecordWatchPage.tsx` — alert-style list
- `apps/web/src/features/dashboard/components/RecentMomentsCard.tsx` — compact list summary
- `apps/web/src/shared/components/PageShell.tsx` — page primitive used by every route
- `apps/web/src/shared/components/EmptyStatePanel.tsx` — empty-state primitive

**Settings reference for the existing count surface:**
- `apps/web/src/features/settings/routes/SettingsPage.tsx` around line 945 (`diagnostics.queues.newsItems` — currently the only news surface)

**Useful tests for shape:**
- `packages/sim-core/tests/newsFeed.test.ts` and any other `news*`-named tests under `packages/sim-core/tests/` — read these to understand what news items look like in practice (categories, priority distribution, ordering)

## Product contract

Ship the smallest complete feature that:

1. Exposes `/news` as a lazy-loaded route under `AppLayout` (just like every other feature route).
2. Lists worker-backed news items, newest first (timestamp descending; secondary sort by priority descending where timestamps tie).
3. Renders each item with: headline, short body excerpt, category badge, priority indicator (1–5), optional tag chip, timestamp, related team/player chips when present, and a clear read/unread visual.
4. Provides a filter UI: an "All / Unread" toggle and a category filter (multi-select chips or a select). Filtering happens client-side over the worker's returned list.
5. Marks an item read when the user opens/expands/clicks it — calls `markNewsRead(id)` and reflects the new state without a hard refetch.
6. Adds a Sidebar nav entry (`{ to: '/news', label: 'News', icon: <Inbox /> }` or similar — pick a lucide icon that is **not** `Newspaper`, since Press Room owns that).
7. Shows an unread-count badge in the TopBar that updates after `markNewsRead`. Keep it deterministic (no polling). Drive it off the same `getNews()` query the page uses, or expose a derived count via React state at the layout level — your call as long as it stays in sync after `markNewsRead`.
8. Covers loading / empty / error states.
9. Is mobile-survivable at 375x667 viewport (Bloomberg-dense but readable; no horizontal scroll on the list).

Prefer:
- working over broad — get one list + one detail expansion + filtering right before adding clever flourishes;
- composition over new layout primitives;
- reuse of existing styled chips/badges from `@mbd/ui` and shared components;
- no new dependencies.

## Allowed write scope

Write only inside:
- `apps/web/src/features/news/**` — new feature directory
- `apps/web/src/app/routes/index.tsx` — add `/news` route entry
- `apps/web/src/app/layout/Sidebar.tsx` — add News nav item
- `apps/web/src/app/layout/TopBar.tsx` — add unread-count badge (smallest possible diff)
- `apps/web/src/shared/hooks/useWorker.ts` — only if you genuinely need a derived helper (the underlying methods are already exposed; you should NOT need to edit this file for the core flow)
- Test files matching the above paths
- `.logs/goal-progress.md`
- `STATUS.md` (replace at end with the Sprint 3 report)
- `GOAL.md` (this file — minor edits only if absolutely necessary)
- `apps/web/docs/screenshots/sprint-3/` — browser-smoke evidence

## Protected scope

Do not modify:
- `packages/sim-core/**` — news generation is the source of truth; consume through the worker
- `packages/contracts/**` — `NewsItem` schema stays v33; no bump
- `apps/web/src/workers/**` — the worker surface is already correct; no changes needed
- `apps/web/src/features/<anything-other-than-news>/**` — including Press Room, History, Dashboard, Settings
- `apps/web/src/app/App.tsx` — Sprint 2 just fixed BrowserRouter basename; leave it alone
- `apps/web/src/app/layout/AppLayout.tsx` — only allowed-write layout files are `Sidebar.tsx` and `TopBar.tsx`
- `apps/web/src/shared/components/**` (except via consumption in the new `features/news/` module)
- `apps/web/src/shared/lib/**`
- `.github/**`, `package.json` (root), `turbo.json`, `pnpm-workspace.yaml`
- `apps/web/src/build/bundleConfig.ts`, `apps/web/docs/BUDGETS.md` — preserve worker-chunk budgets and the journal exactly. If your changes push a worker chunk over budget, **pause**: routing news through a different chunk is preferable to lifting the ceiling

## Non-negotiables

- **Schema v33.** No bump. No migration.
- **Determinism.** No `Math.random()` in app code. No new RNG paths.
- **No new dependencies.** Stay on the workspace lock.
- **Bloomberg Terminal aesthetic.** No emoji. lucide-react icons only. Match the existing typography stack (Space Grotesk / JetBrains Mono / Bebas Neue) and the `@mbd/design-tokens` palette.
- **Do not delete or weaken tests** to make checks pass.
- **The `/news` route URL is final.** Don't pluralize/rename mid-build.
- **No commits on `main`.** Work only on `goal/sprint-3-news-inbox`.
- **No `git add -A`.** Stage specific files.
- **Press Room is a different feature.** Do not redirect /press-room to /news or vice versa. Both stay.

## Milestone loop

For each milestone: inspect → state checkpoint → smallest change → smallest validation → fix → log to `.logs/goal-progress.md`.

Suggested milestones:

1. **Inventory.** Read every file in "Read first." Log:
   - exact shape of `NewsItem` and the category enum
   - how `getNews` orders / paginates today
   - how `markNewsRead` reflects through the worker → save flow (does it require a state refresh, or does the worker emit a flow update?)
   - which existing components (Badge, Card, EmptyStatePanel, ResponsiveTable, Skeleton, etc.) to reuse
2. **Scaffold the route.** Add `apps/web/src/features/news/routes/NewsPage.tsx` and the route entry in `app/routes/index.tsx`. Render a loading skeleton, a one-line empty state, and the raw `getNews()` result as a debug list. Wire under `RouteErrorBoundary` like every other route.
3. **List rendering.** Build the per-item row with headline / body excerpt / category badge / priority indicator / tag chip / timestamp / read state. Add the "All / Unread" toggle and the category filter. Newest first. Mobile-survivable.
4. **Mark-read wiring.** Open / expand / click marks the item read via `markNewsRead(id)`. Optimistic UI update; refetch on flow updates if needed. Add a small section-level "mark all visible read" only if it lands inside the diff budget (otherwise skip — focus on the per-item read first).
5. **Sidebar entry + TopBar unread badge.** Add the nav item with a lucide icon that is **not** `Newspaper`. Add an unread count badge in TopBar that pulls from the same `getNews()` query. Update on `markNewsRead`.
6. **Tests.** Add at least:
   - one test that renders the page with worker-mocked news items and asserts headlines render
   - one test that asserts `markNewsRead` is called when an item is opened
   - one test that asserts the unread badge reflects the unread count and decrements after read
7. **Verify gate.** `pnpm typecheck`, `pnpm test`, `pnpm build`. Bundle budget test must still pass.
8. **Browser smoke.** Start a save (or load the existing v33 IndexedDB save), sim a month so news accumulates, walk through /news, mark items read, watch the TopBar badge tick down. Commit screenshots under `apps/web/docs/screenshots/sprint-3/`.
9. **STATUS.md.** Final report (see "Final report" section).

Each `.logs/goal-progress.md` entry: timestamp, milestone, files changed, checks run, result, blocker or next step.

## Validation loop

Workspace root commands:

```
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev
```

Targeted, for tight loops:

```
pnpm --filter @mbd/web test src/features/news
pnpm --filter @mbd/web test src/app/layout/TopBar.test.tsx
pnpm --filter @mbd/web test src/app/layout/Sidebar.test.tsx
pnpm --filter @mbd/web test src/app/routes/index.test.tsx
```

Browser flow:

1. `pnpm --filter @mbd/web dev`
2. Open `http://localhost:5173/MBD/` (or 5174 if 5173 is taken)
3. New dynasty OR continue an existing save with news already accumulated (sim a month or two)
4. Confirm Sidebar shows "News" entry; click it
5. Confirm /news renders the worker list, sorted newest first
6. Confirm filter chips work (All / Unread / category)
7. Click an unread item; confirm it becomes read; confirm TopBar badge decrements
8. Reload the page; confirm read state survived (it should, because `markNewsRead` writes through the worker → save path)
9. At 375x667 viewport, confirm no horizontal scroll on the list
10. Hard reload at `/MBD/news` (since Sprint 2's BrowserRouter fix should make this just work)

## Evaluator-visible proof

Before declaring done, the transcript and `STATUS.md` must contain:

- Exact commands run with pass/fail result
- Output summaries (test counts, build duration, bundle sizes)
- Browser steps walked, with screenshots committed under `apps/web/docs/screenshots/sprint-3/`
- A diff summary (`git diff --stat origin/main..HEAD`) showing changes stayed inside allowed scope
- Known unrelated failures (if any) with evidence

## Autonomy rules

When choosing between two reasonable list designs, pick the one that:
- matches existing repo feed patterns (Press Room, History);
- has the smaller diff;
- avoids new dependencies;
- preserves the most existing tests.

When picking the unread-badge presentation, prefer a small numeric chip (lucide `Inbox` + count) over an emoji-style dot. Match the existing TopBar density.

When picking the lucide icon for the Sidebar News entry, pick from: `Inbox`, `Mail`, `MailOpen`, `Bell`, `Megaphone`, `MailQuestion`. `Newspaper` is taken by Press Room.

When unsure about read-state propagation:
- Track `read` locally for immediate UI response.
- Call `markNewsRead` and rely on the worker to persist.
- Refetch `getNews()` on `useWorker().subscribeToFlowUpdates` if the worker reports a flow change, otherwise trust local state.

Log assumptions in `.logs/goal-progress.md` and continue.

## Pause conditions

Pause and write the blocker into `STATUS.md` only when:

- A required worker method is missing or behaves differently from what `useWorker.ts` exposes (would require sim.worker / sim-core changes — out of scope).
- The same validation fails 3 times after serious repair attempts.
- A bundle ceiling in `apps/web/src/build/bundleConfig.ts` would have to be lifted to land the feature. Investigate chunk routing first, document the routing decision, and only then pause if a budget bump is genuinely required.
- The unread badge requires modifying `AppLayout.tsx` instead of `TopBar.tsx`.
- A protected file must be modified to make further progress.
- News items don't have a meaningful timestamp field or the ordering cannot be done deterministically without sim-core changes.

When pausing, do not delete partial work. Document the partial state and the exact blocker.

## Done when

All of the following are true:

- `/news` route exists, lazy-loaded under `AppLayout`, wrapped in `RouteErrorBoundary` like every other route.
- The page lists worker-backed `NewsItem` objects newest-first.
- Each item renders: headline, body excerpt, category badge, priority, optional tag chip, timestamp, related entity chips when present, and a clear read/unread visual.
- "All / Unread" toggle works.
- Category filter works (multi-select or single-select, your call).
- Clicking / opening an item calls `markNewsRead(id)` and the item moves to read state without a hard reload.
- Sidebar has a `News` entry with a non-`Newspaper` lucide icon.
- TopBar shows an unread-count badge that decrements after items are read.
- Loading, empty, and error states all visible in the page.
- `/MBD/news` hard-reload survives Sprint 2's BrowserRouter basename (should be free).
- Mobile at 375x667 — no horizontal scroll, list is readable.
- `pnpm typecheck` clean (all tasks).
- `pnpm test` clean (no test deleted or weakened; new tests added for the new behavior).
- `pnpm build` clean (every chunk under its ceiling; bundleBudget.test.ts passes; no journal entries in `apps/web/docs/BUDGETS.md` modified).
- Browser smoke walked with screenshots under `apps/web/docs/screenshots/sprint-3/`.
- `.logs/goal-progress.md` contains the milestone log.
- `STATUS.md` exists with the final report (see below).
- Branch is on `goal/sprint-3-news-inbox`.

## Final report

`STATUS.md` (rewrite from scratch) must include, in order:

1. **What shipped** — one paragraph summary of the user-visible change.
2. **Files changed** — `git diff --stat origin/main..HEAD` output.
3. **Validations run** — exact commands and their results.
4. **Browser evidence** — list of screenshots under `apps/web/docs/screenshots/sprint-3/` with captions; the IndexedDB save's `news` queue length before and after a smoke pass.
5. **Bundle impact** — which chunk grew, by how much, whether it fit under the existing ceiling, and which chunk routing decision (if any) you made.
6. **Known limitations** — anything you noticed but did not fix (out of scope).
7. **Risks** — what could break in production and what to watch.
8. **Rollback notes** — revert the merge commit; schema didn't bump; revert is safe.
9. **Next /goal** — the exact paste-ready next `/goal` prompt. Recommend Sprint 4 (orphaned player-profile + open-negotiations endpoints) per the original audit ranking.

## Branch + commit hygiene

- Branch: `goal/sprint-3-news-inbox` (already created on the post-Sprint-2 main).
- Stage specific files, never `git add -A`.
- Commit in logical slices (one slice per milestone is a reasonable cadence).
- Commit prefixes that match repo history: `feat(news):`, `feat(layout):` (for sidebar/topbar), `test(news):`, `docs(news):`.
- Co-author trailers on each commit:

  ```
  Co-Authored-By: Codex GPT-5 <noreply@openai.com>
  ```

- When done, push and open a PR titled `Sprint 3 — News inbox`. Body should summarize against this GOAL.md and link Sprint 2 PR #75 + Sprint 1 PR #74 for lineage.

## Out of scope (do not attempt this sprint)

- Press Room conference unification (Sprint 5)
- Granular player-profile endpoints / open-negotiations resume pane (Sprint 4)
- Worker-side news generation / category additions / schema changes
- New top-level navigation patterns (mega-menu, nested nav)
- Push notifications, web notifications API, sound alerts
- Markdown rendering, link parsing, or rich-text in news bodies (plain text is enough)
- Sharing / exporting news
- 32 team logo SVGs (Sprint 7)
- Anything that touches `packages/sim-core/` or `packages/contracts/`

---

*End of GOAL.md. The companion `/goal` slash command lives in Sprint 3's PR description and in the conversation with Kevin.*
