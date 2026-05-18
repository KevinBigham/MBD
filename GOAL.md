# GOAL.md — Sprint 4 (REVISED): Trade Negotiations Inbox + Cross-Linking + Trade Value

> Single-mission contract for Codex (or any one-shot coding agent).
> Format: Goal Packet v2.0 — Kevin's one-shot ritual.
> Branched from `main` at `93b3f5b` (post Sprint 3.5 [PR #77](https://github.com/KevinBigham/MBD/pull/77)).
> **Revised after Codex's first-pass pause.** See "What Changed In This Revision" below.

---

## What Changed In This Revision

The original Sprint 4 contract was wrong about two of the four "orphans":

1. **`getOpenNegotiations()` returns `TradeNegotiationView[]`** (trade packages between teams), **not contract negotiations** (salary asks / years / agent terms). Codex correctly paused under Pause Condition 1.
2. **`getInteractivePressConference()` is already consumed** by `apps/web/src/app/layout/AppLayout.tsx:167`, which feeds `PressConferenceModal`. It is not orphaned. The Press Conference milestone is dropped.

This revision:

- Renames the orphan surface from "Negotiations Center" to **"Trade Negotiations Inbox"** and rewrites it against the actual `TradeNegotiationView` shape.
- Drops the Press Conference milestone entirely.
- Keeps Trade Value on Player Profile (genuinely orphaned).
- Keeps the five cross-linking milestones (Trade / Draft / News / Scouting / Stats).
- Tightens to **10 milestones** (was 12).

---

## Mission

Wire the genuinely orphaned worker surfaces into a coherent Trade & Player experience, and finish the player-profile cross-linking that Roster / Free Agency / Minors already have but Trade / Draft / News / Scouting / Stats lack.

The two orphaned worker surfaces:

1. **`getOpenNegotiations()` → `TradeNegotiationView[]`** — list of the user's open trade negotiations. Currently the only consumer is `TradePage` for the **active** negotiation in the trade builder. There is no inbox view of all open negotiations.
2. **`getNegotiation(negotiationId)` → `TradeNegotiationView | null`** — detail/lookup for a single trade negotiation.
3. **`getPlayerTradeValue(playerId)` → `PlayerTradeValue | null`** — zero consumers anywhere.

The five cross-linking gaps (Roster / Free Agency / Minors already pass, these still ship plain text):

4. **Trade page** — player names in trade-block lists are not clickable.
5. **Draft page** — draft prospects are not clickable.
6. **News page** — news items referencing players are not clickable (only if `NewsItem` has a machine-readable player ref).
7. **Scouting page** — player names are not clickable.
8. **Stats / leaderboards** — leaderboard entries are not clickable.

By the time you finish, every place a player is named in the app should link to `/players/:playerId`, the user should have a **Trade Negotiations Inbox** at `/trade-negotiations` with a detail view at `/trade-negotiations/:id`, and **Trade Value** should appear on the Player Profile.

---

## Read-First (do this before writing anything)

1. `README.md`
2. `CHANGELOG.md`
3. `MASTER_CONTEXT.md` (architecture)
4. The previous `STATUS.md` (Sprint 4 first-pass pause — useful context for what NOT to assume)
5. This `GOAL.md`
6. `apps/web/src/workers/sim.worker.queries.ts` lines 2596–2601 (`getNegotiation`, `getOpenNegotiations`).
7. `apps/web/src/workers/sim.worker.trade.ts` lines 184–203 — the **`TradeNegotiationView` shape**. Read this carefully before scaffolding the inbox row UI. The fields you have to work with are: `id`, `teamId`, `teamName`, `teamAbbreviation`, `phase`, `roundsCompleted`, `expiresAtDay`, `dialogue`, `proposal`, `counterOffer`, `isComplete`, `canAccept`, `canCounter`, `canReject`. There are **no salary, years, or contract-terms fields** — this is a trade between teams.
8. `apps/web/src/features/trade/routes/TradePage.tsx` lines 795–830 (state) and lines 1241+ (`applyNegotiationToBuilder`) — see how the trade builder consumes a single `TradeNegotiationView`. The Inbox should link **into** the trade builder for an active negotiation, not duplicate the builder.
9. `apps/web/src/features/news/routes/NewsPage.tsx` — the **Sprint 3 pattern** for a worker-backed list route. Mimic this for `TradeNegotiationsInboxPage`.
10. `apps/web/src/features/roster/routes/RosterPage.tsx` — search for `to={\`/players/${player.id}\`}`. This is the **canonical cross-link pattern**. Replicate it; do not invent a new one.
11. `apps/web/src/features/players/routes/PlayerProfilePage.tsx` — 486 lines. Read it before adding the Trade Value panel. Trade Value should integrate, not displace existing tabs.

---

## Allowed Write Scope

**New files (expected):**

- `apps/web/src/features/trade-negotiations/routes/TradeNegotiationsInboxPage.tsx`
- `apps/web/src/features/trade-negotiations/routes/TradeNegotiationsInboxPage.test.tsx`
- `apps/web/src/features/trade-negotiations/routes/TradeNegotiationDetailPage.tsx`
- `apps/web/src/features/trade-negotiations/routes/TradeNegotiationDetailPage.test.tsx`
- `apps/web/src/features/trade-negotiations/components/*.tsx` (subcomponents as needed — e.g. `TradeNegotiationRow.tsx`, `TradePackageSummary.tsx`)
- `apps/web/src/features/players/components/TradeValuePanel.tsx` (or similar — fit into existing PlayerProfilePage)
- `apps/web/docs/screenshots/sprint-4/*.png`

**Updates (expected):**

- `apps/web/src/app/routes/index.tsx` (add routes for `/trade-negotiations` and `/trade-negotiations/:negotiationId`)
- `apps/web/src/app/layout/Sidebar.tsx` (add Trade Negotiations entry)
- `apps/web/src/app/layout/Sidebar.test.tsx` (existing tests likely assert label list)
- `apps/web/src/features/trade/routes/TradePage.tsx` (cross-link player names — and possibly accept a `?negotiationId=` query param to deep-link from the Inbox; read TradePage before deciding)
- `apps/web/src/features/draft/**` (cross-link prospects)
- `apps/web/src/features/news/routes/NewsPage.tsx` (cross-link players in news items, only if `NewsItem` has `playerId` or similar — see Milestone 8 details)
- `apps/web/src/features/scouting/**` (cross-link players)
- `apps/web/src/features/stats/**` (cross-link leaderboard entries)
- `apps/web/src/features/players/routes/PlayerProfilePage.tsx` (only to integrate Trade Value — do not refactor existing tabs)
- `STATUS.md`
- `.logs/goal-progress.md`
- `GOAL.md` (only to mark milestones complete in a working scratchpad — final commit should preserve the contract, not erase it)

---

## Protected (DO NOT TOUCH)

- `packages/sim-core/**` — sim logic stays untouched.
- `packages/contracts/**` — no schema or version changes. Save schema stays at v33.
- `packages/ui/**` — use existing primitives only. No new shared UI components.
- `packages/design-tokens/**` — use existing tokens.
- `apps/web/src/workers/sim.worker.queries.ts` — consume what exists. Do NOT add new worker methods.
- `apps/web/src/workers/sim.worker.actions.ts` — same. Do NOT add new worker actions.
- `apps/web/src/workers/sim.worker.trade.ts` — read-only.
- `apps/web/src/shared/lib/saveSystem.ts` — Sprint 3.5 territory.
- `apps/web/src/app/boot/AppBootGate.tsx` — Sprint 3.5 territory. Do not change boot order.
- `apps/web/src/shared/hooks/useGameStore.ts` — Sprint 3.5 territory. Do not extend the persisted shell.
- `apps/web/src/features/save-recovery/**` — use existing API only.
- `apps/web/src/features/onboarding/**` — Sprint 2 territory.
- `apps/web/src/features/press-room/**` — Press Conference is already wired in `AppLayout.tsx:167`. No Press Conference work in Sprint 4.
- Any existing test that currently passes — do not modify to make new code work. If an existing test breaks, that is a regression — fix the new code, not the test.

---

## Non-Negotiables

1. **No new worker methods.** If you find yourself wanting one, STOP — that is Pause Condition 1.
2. **No save schema changes.** Stays v33. No new fields, no version bump.
3. **No `Math.random()` anywhere in new code.** The app is deterministic.
4. **No new top-level packages or npm dependencies.**
5. **All new test files use existing harness** — `@testing-library/react`, `vitest`, and the worker-mocking patterns from `NewsPage.test.tsx` and `RosterPage.test.tsx`.
6. **Hard reload must continue to work** at every new route. Sprint 3.5 invariant.
7. **Bundle budgets must not regress.** Check `apps/web/docs/BUDGETS.md` after the build.
8. **Mobile 375×667** — every new route must render without horizontal overflow.
9. **No `console.log`, `console.warn`, or `console.error` left in production code.** Use `logger` from `apps/web/src/shared/lib/logger.ts` if you need diagnostic output.
10. **Cross-links must reuse the Roster pattern.** Same `<Link>` import, same hover/focus styling. Do not invent a "clickable name" component.
11. **The Trade Negotiations Inbox is read-only in Sprint 4.** Action buttons (`canAccept`, `canCounter`, `canReject`) deep-link into the existing TradePage builder — they do NOT call worker actions directly from the Inbox. That keeps the Inbox surface a pure list/detail and respects "no new worker methods."

---

## Milestone Loop

Work milestones **in order**. After each milestone:

1. Run `pnpm typecheck`.
2. Run `pnpm test` (focused first if it's faster, then the full suite before commit).
3. `git add` the milestone's files (specific files — no `git add -A`).
4. Commit with the milestone's prescribed message.
5. Append a milestone block to `.logs/goal-progress.md` (commit SHA, validation tail, scope decisions, surprises).
6. Move to the next milestone.

If a milestone's validation fails:

- Fix forward. Do not commit a broken milestone.
- If you cannot figure it out in three attempts, STOP and document under Pause Conditions.

### Milestone 1 — Trade Negotiations Inbox scaffolding (`/trade-negotiations`)

- Add a lazy import for `TradeNegotiationsInboxPage` in `apps/web/src/app/routes/index.tsx`.
- Register `<Route path="trade-negotiations" element={withRouteBoundary('Trade Negotiations', <TradeNegotiationsInboxPage />)} />` alongside the other top-level in-game routes.
- Create `apps/web/src/features/trade-negotiations/routes/TradeNegotiationsInboxPage.tsx`:
  - Calls `worker.getOpenNegotiations()` on mount.
  - Renders the list. Each row shows: counterpart team (name + abbreviation, optionally team logo if a `TeamLogo` component exists), `phase` badge, `Round N` label from `roundsCompleted`, days-until-expiry derived from `expiresAtDay` minus current day (read current day from `useGameStore`), a one-line dialogue preview from the last `dialogue` entry if any, and a status indicator (`isComplete` → "Closed" badge; otherwise show which actions are available based on `canAccept`/`canCounter`/`canReject`).
  - Row click navigates to `/trade-negotiations/:id`.
  - Empty state: "No open trade negotiations" with a small "Visit the Trade Hub to start one" hint that links to `/trade`.
  - Loading skeleton mimicking `NewsPage` skeleton style.
  - Error path: toast + render an inline error card if the worker call throws.
- Create `apps/web/src/features/trade-negotiations/routes/TradeNegotiationsInboxPage.test.tsx`:
  - Happy path (mock worker, render rows).
  - Empty state.
  - Counterpart team name renders, phase badge renders, expires-in count renders.
  - Row click navigates to `/trade-negotiations/:id` (use the same `MemoryRouter`/`useNavigate` mock pattern as `NewsPage.test.tsx`).
- Sort order: open negotiations first (`isComplete === false`), then by smallest `expiresAtDay` first (most urgent on top). Closed last.
- **DONE WHEN**: typecheck + test pass; `/MBD/trade-negotiations` (when the dev server is up) renders the list or the empty state.
- **COMMIT**: `feat(trade-negotiations): add /trade-negotiations Inbox route`

### Milestone 2 — Trade Negotiation detail (`/trade-negotiations/:negotiationId`)

- Lazy import `TradeNegotiationDetailPage` in routes.
- Register `<Route path="trade-negotiations/:negotiationId" element={withRouteBoundary('Trade Negotiation', <TradeNegotiationDetailPage />)} />`.
- Create `apps/web/src/features/trade-negotiations/routes/TradeNegotiationDetailPage.tsx`:
  - Reads `negotiationId` from `useParams`.
  - Calls `worker.getNegotiation(negotiationId)`.
  - Renders the negotiation in detail:
    - Header: counterpart team, phase, rounds completed, expires day.
    - Two side-by-side panels: **Proposal** (the user's `proposal: TradeCounterPackage`) and **Counter-Offer** (the counterpart's `counterOffer`, or "Awaiting counter" if `null`). Render the `TradeCounterPackage` shape — read its type. If it includes player IDs, render the player names as `<Link>` to `/players/:playerId`.
    - **Dialogue thread**: render `dialogue` entries chronologically as a chat-style log (sender name + message). Reuse existing chat/conversation styling if any exists in the codebase; otherwise compose with existing primitives.
    - **Action area**: if `isComplete === false`, show a single CTA — "Open in Trade Builder" — that navigates to `/trade?negotiationId={id}` (deep link). Buttons for `canAccept`/`canCounter`/`canReject` are NOT wired in this sprint — they are visually disabled with a tooltip "Use the Trade Builder to act on this negotiation." If `isComplete === true`, show "This negotiation is closed."
  - 404-ish state if `getNegotiation` returns `null`: "Trade negotiation not found" with a back link to `/trade-negotiations`.
- Create `TradeNegotiationDetailPage.test.tsx`: happy path with proposal + counter-offer + dialogue, awaiting-counter path (`counterOffer === null`), not-found path.
- **DONE WHEN**: typecheck + test pass; clicking a row in `/trade-negotiations` opens the detail page; bad ID renders not-found.
- **COMMIT**: `feat(trade-negotiations): add /trade-negotiations/:id detail view`

### Milestone 3 — Sidebar Trade Negotiations entry

- Add a Trade Negotiations entry to `apps/web/src/app/layout/Sidebar.tsx`. Use a lucide icon — `Handshake`, `MessagesSquare`, or `Repeat2` are all reasonable. Pick one. (Note: Sprint 3 already used `Inbox` for News — pick something different.)
- Place it adjacent to or under Trade. Your call.
- Update `Sidebar.test.tsx` to include the new entry.
- **DONE WHEN**: typecheck + test pass; sidebar shows Trade Negotiations and navigates to `/trade-negotiations`.
- **COMMIT**: `feat(layout): add Trade Negotiations entry to Sidebar`

### Milestone 4 — Trade page cross-linking + deep-link from Inbox

- Find every place in `apps/web/src/features/trade/**` where a player name renders as plain text. Wrap each with `<Link to={\`/players/${player.id}\`}>` (or equivalent). Match the styling pattern from `RosterPage.tsx:473`.
- **Additionally**: support the `/trade?negotiationId={id}` deep link added in Milestone 2. On `TradePage` mount, read `searchParams.get('negotiationId')`, and if present, fetch that negotiation via `worker.getNegotiation(id)` and seed `activeNegotiation` / the trade builder via the existing `applyNegotiationToBuilder` flow. If the negotiation isn't found or has expired, show a toast and clear the param.
- Update or add tests verifying the link target AND the deep-link behavior.
- **DONE WHEN**: typecheck + test pass; clicking any player name in any Trade surface navigates to that player's profile; opening `/trade?negotiationId=<valid-id>` opens TradePage with that negotiation loaded.
- **COMMIT**: `feat(trade): cross-link player names + accept ?negotiationId deep link`

### Milestone 5 — Draft page cross-linking

- Same `<Link>` pattern in `apps/web/src/features/draft/**` for draft prospects.
- The `to={\`/players/${entry.playerId}?tab=development\`}` pattern from `apps/web/src/features/minors/components/ProspectBreakoutTracker.tsx:84` is a precedent for prospects specifically — consider whether `?tab=development` is the right default for the Big Board.
- **DONE WHEN**: typecheck + test pass; draft Big Board entries are clickable.
- **COMMIT**: `feat(draft): cross-link prospects to /players/:id`

### Milestone 6 — Scouting page cross-linking

- Same pattern in `apps/web/src/features/scouting/**`.
- **DONE WHEN**: typecheck + test pass; scouting reports' player names are clickable.
- **COMMIT**: `feat(scouting): cross-link player names to /players/:id`

### Milestone 7 — Stats / leaderboards cross-linking

- Same pattern in `apps/web/src/features/stats/**`.
- **DONE WHEN**: typecheck + test pass; leaderboard entries are clickable.
- **COMMIT**: `feat(stats): cross-link leaderboard entries to /players/:id`

### Milestone 8 — News page player references (skip if NewsItem has no machine-readable player ref)

- Inspect `NewsItem` from `@mbd/contracts`. Does it carry a machine-readable player reference field (`playerId`, `relatedPlayerIds`, `entities`, etc.)?
- If YES: render those references as `<Link>` chips below the news body. Match existing news item styling.
- If NO: SKIP this milestone. Do **not** introduce text-parsing or regex to extract player names. Document the skip in `.logs/goal-progress.md` and the final STATUS.md.
- Update `NewsPage.test.tsx` if you wired links.
- **DONE WHEN**: either links work, or skip is documented.
- **COMMIT** (if shipped): `feat(news): cross-link player references in news items`

### Milestone 9 — Trade Value on Player Profile

- Wire `worker.getPlayerTradeValue(playerId)` into `PlayerProfilePage.tsx`.
- Decide placement: a small panel/widget alongside the existing tabs, or a new tab. **Lean toward a small panel** rather than a new tab to keep tab count stable.
- Render the `PlayerTradeValue` shape — read the type definition before designing.
- Loading + null-handling.
- Add a focused test in `PlayerProfilePage.test.tsx` for the trade-value render.
- **DONE WHEN**: typecheck + test pass; the player profile shows Trade Value for any player.
- **COMMIT**: `feat(players): surface trade value on player profile`

### Milestone 10 — Browser smoke + screenshots + STATUS.md

Run `pnpm --filter @mbd/web dev` and capture screenshots to `apps/web/docs/screenshots/sprint-4/`:

1. `01-trade-negotiations-inbox.png` — `/MBD/trade-negotiations` with rows.
2. `02-trade-negotiations-empty.png` — empty state.
3. `03-trade-negotiation-detail.png` — `/MBD/trade-negotiations/<id>` detail.
4. `04-trade-negotiation-detail-awaiting-counter.png` — detail with `counterOffer === null`.
5. `05-trade-deep-link-loaded.png` — `/MBD/trade?negotiationId=<id>` showing the trade builder seeded with that negotiation.
6. `06-trade-clickable-name.png` — hover/focus state on a clickable player name in Trade.
7. `07-draft-clickable-prospect.png` — same in Draft.
8. `08-scouting-clickable-name.png` — same in Scouting.
9. `09-stats-clickable-leader.png` — same in Stats.
10. `10-news-player-chip.png` — only if Milestone 8 shipped.
11. `11-player-profile-trade-value.png` — Trade Value panel on profile.
12. `12-trade-negotiations-mobile-375.png` — 375×667.
13. `13-trade-negotiations-hard-reload.png` — Sprint 3.5 invariant check.

Verify on each route:

- Hard reload (Cmd+Shift+R) lands on the same route, not Save Hub. Sprint 3.5 invariant.
- 375×667 viewport — no horizontal overflow.
- No `console.error` in the browser console.

Also run before final commit:

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
```

Then rewrite `STATUS.md` at repo root with:

- What shipped (one-paragraph summary).
- Files changed (`git diff --stat origin/main..HEAD`).
- Validations run (typecheck + test + build — paste the final tail of each).
- Browser evidence (screenshot list with one-line captions).
- Bundle impact (chunk sizes; any movement against `BUDGETS.md`).
- Worker methods newly consumed (`getOpenNegotiations`, `getNegotiation`, `getPlayerTradeValue`) — confirm zero new worker methods added.
- Sprint 3.5 invariant confirmation.
- Cross-linking coverage table (Roster ✅ / Free Agency ✅ / Minors ✅ / Trade ✅ / Draft ✅ / News ✅ or skipped / Scouting ✅ / Stats ✅).
- Known limitations.
- Risks.
- Rollback notes (revert the merge commit; no schema bump).
- Next `/goal` recommendation.

- **DONE WHEN**: all required screenshots committed; STATUS.md and `.logs/goal-progress.md` complete.
- **COMMIT**: `docs(sprint-4): browser smoke, STATUS report, and handoff`

---

## Validation Gates

After **every** milestone:

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
```

Before the final Milestone 10 commit, also run `pnpm build`.

Browser smoke (Milestone 10 only): `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev` then drive through the screenshots list.

---

## Pause Conditions

**STOP and surface to Kevin** (do not push, do not improvise) if any of these happen:

1. A worker method you expected does not exist or returns an unexpected shape. Do not add new worker methods. Document the actual shape so the contract can be revised.
2. The save schema would need to bump. Sprint 4 is **consumer-only**.
3. A bundle budget in `apps/web/docs/BUDGETS.md` would be exceeded.
4. Hard reload breaks at any new route. Sprint 3.5 invariant.
5. An existing test in an unrelated area starts failing because of your changes. Investigate the coupling, don't paper over it.
6. The `NewsItem` shape has no machine-readable player references AND you can't ship Milestone 8 cleanly. Skip; document; continue.
7. You discover the audit was wrong about a "no consumers" claim (as happened with Press Conference last run). Document the surprise, skip the redundant work, continue.
8. You cannot decide between two reasonable approaches and the Autonomy Rules below don't resolve it.

A pause is not a failure. A bad commit shipped through quietly is a failure. Codex's first-pass pause on this sprint was the right call — it caught a contract bug.

---

## Autonomy Rules

Once the mission is clear, **do not ask for permission** on:

- Component composition (table vs. card list vs. row layout for the Inbox).
- Lucide icon choice for Sidebar entry.
- How to format the days-until-expiry chip (`expires in 3 days` vs. `3d`).
- How to format dollar amounts in `TradeCounterPackage` (match what TradePage does).
- Dialogue chat styling — invent something tasteful using existing tokens if no chat primitive exists.
- Whether Trade Value on the Player Profile is a panel or a new tab. Lean panel.
- Whether News player chips live above or below the body copy.
- Sidebar grouping order.
- Sort order tie-breakers within "open negotiations" (e.g. when two negotiations expire on the same day).

Use judgment. Match the existing codebase's tone. Pause only on the Pause Conditions above.

---

## Evaluator-Visible Proof

Maintain `.logs/goal-progress.md` continuously. After each milestone, append:

```markdown
## Milestone N — <title>

- Commit: <SHA> "<message>"
- typecheck: <PASS/FAIL — last line>
- test: <PASS/FAIL — Tasks: X successful, Y total>
- Files touched: <list>
- Scope decisions: <one or two sentences if any>
- Surprises: <one or two sentences if any>
```

Treat `.logs/goal-progress.md` like a journal, not an afterthought. Kevin and future agents read it to understand what happened.

---

## Done Criteria

ALL of these must be true before Milestone 10's STATUS.md commit:

1. ✅ `/trade-negotiations` renders open trade negotiations (or empty state).
2. ✅ `/trade-negotiations/:id` renders detail or graceful not-found.
3. ✅ Sidebar has a Trade Negotiations entry.
4. ✅ Trade page player names link to `/players/:id`.
5. ✅ TradePage accepts `?negotiationId=<id>` and seeds the trade builder.
6. ✅ Draft page prospects link to `/players/:id`.
7. ✅ Scouting page player names link to `/players/:id`.
8. ✅ Stats / leaderboards link to `/players/:id`.
9. ✅ News page player references link to `/players/:id` OR Milestone 8 is documented as skipped with reason.
10. ✅ Player Profile shows Trade Value.
11. ✅ Each new route hard-reloads successfully (Sprint 3.5 invariant).
12. ✅ Each new route renders cleanly at 375×667.
13. ✅ All required screenshots committed under `apps/web/docs/screenshots/sprint-4/`.
14. ✅ `pnpm typecheck` passes.
15. ✅ `pnpm test` passes (with new tests added for Inbox, Detail, and Trade Value).
16. ✅ `pnpm build` passes with no new budget violations.
17. ✅ `STATUS.md` rewritten with the full report.
18. ✅ `.logs/goal-progress.md` has 10 milestone blocks.
19. ✅ Final commit pushed to `goal/sprint-4-front-office`.
20. ✅ Zero new worker methods, zero schema changes, zero new dependencies.

---

## Final Report

When all Done Criteria are met:

1. `git push origin goal/sprint-4-front-office`.
2. Report back to Kevin (via the transcript / handoff doc you control) with:
   - Final commit SHA.
   - Branch name.
   - Path to STATUS.md.
   - Link to the draft PR (Claude Code will flip it to ready and merge once Kevin approves).
   - The exact next `/goal` for the next sprint.

---

## Bonus Round (only after all 20 Done Criteria are satisfied)

If Sprint 4 closes cleanly with daylight remaining, you may pick up **one** of the following clearly-scoped follow-ons. Do NOT start Bonus Round work until Milestone 10 is committed and pushed.

### Bonus A — Active negotiation chip in TopBar

If a user has open trade negotiations, show a small chip in `apps/web/src/app/layout/TopBar.tsx` (mirror Sprint 3's News chip pattern) that displays the count and links to `/trade-negotiations`.

### Bonus B — Active negotiation panel on Player Profile

Add a panel to `PlayerProfilePage` that calls `worker.getOpenNegotiations()` and surfaces any negotiation whose `proposal` or `counterOffer` includes this player. Links to `/trade-negotiations/:id`. Skip if the cross-reference is non-trivial to derive from the shape (read first, decide).

### Bonus C — League activity on Inbox

Below the user's open negotiations, show a small "League activity" summary count: "12 trade negotiations are happening league-wide" (if `getOpenNegotiations` returns league-wide, which you'll verify when you read it).

**Bonus Round non-negotiables:**

- Separate commits per task.
- Same validation gates.
- Update `.logs/goal-progress.md` with a "Bonus Round" section.
- Append to `STATUS.md` under a "Bonus Round" heading.
- If a Bonus Round task hits a Pause Condition, STOP and leave the bonus uncommitted — do not block Sprint 4's merge.

---

## Operating Notes for Codex

- This is Kevin's overnight sprint. He's asleep. He wants Codex working steady through the night. Pace yourself: 10 milestones over the night is roughly one milestone every ~50 minutes if you go steady. Quality > speed.
- The previous run **paused correctly** under Pause Condition 1 because the original GOAL.md asked for fields that didn't exist on `TradeNegotiationView`. This revision fixes that. If you spot another contract bug like that, pause again — the precedent is established.
- The `pnpm` binary lives at `/Users/tkevinbigham/.local/node-lts/bin/pnpm`. Every shell call needs `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH` prepended.
- The working tree is `/Users/tkevinbigham/MBD-main`. The branch is `goal/sprint-4-front-office`. The base is `main` at `93b3f5b`.
- The draft PR ([#78](https://github.com/KevinBigham/MBD/pull/78)) already exists. Claude Code (reviewer) will flip it to ready and merge once Kevin approves in the morning.
- If something feels off — a milestone is over-specified, an assumption is wrong, the worker shape doesn't match — STOP and surface it. The worst outcome is silent over-improvising. The second worst is asking permission for everything.

Go.
