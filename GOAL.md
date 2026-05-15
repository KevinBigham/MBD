# GOAL.md — Sprint 4: Front Office Marathon

> Single-mission contract for Codex (or any one-shot coding agent).
> Format: Goal Packet v2.0 — Kevin's one-shot ritual.
> Built on top of Sprint 3.5 ([PR #77](https://github.com/KevinBigham/MBD/pull/77)). No rebase required — branches from `main` at `93b3f5b`.

---

## Mission

The audit found a cluster of fully-implemented worker queries with **zero UI consumers**. They are not stubs, they are real, returning real data, sitting orphaned. Sprint 4 wires them all into a coherent Front Office experience and finishes the player-profile cross-linking that Roster, Free Agency, and Minors already have but Trade, Draft, News, Scouting, and Stats lack.

This is a **marathon sprint**: 12 sequential milestones, each independently shippable. Work them in order. Commit after each. Validate after each. If you finish all 12 with time and quality to spare, the **Bonus Round** at the bottom of this file has a clearly-scoped Sprint 4.5 candidate you may pick up — but only after closing Sprint 4 cleanly.

The four orphaned worker surfaces:

1. **`getOpenNegotiations()`** — list of open contract negotiations league-wide. Zero consumers.
2. **`getNegotiation(negotiationId)`** — detail view for a single negotiation. Zero consumers.
3. **`getInteractivePressConference()`** — generates a structured press conference (questions, owner tone, prospect references) for the user's team. Zero consumers.
4. **`getPlayerTradeValue(playerId)`** — returns `PlayerTradeValue` for any player. Zero consumers.

The five cross-linking gaps (Roster/Free Agency/Minors already pass, these still ship plain text):

5. **Trade page** — player names in trade-block lists are not clickable.
6. **Draft page** — draft prospects are not clickable.
7. **News page** — news items referencing players are not clickable.
8. **Scouting page** — player names are not clickable.
9. **Stats / leaderboards** — leaderboard entries are not clickable.

By the time you finish, every place a player is named in the app should link to `/players/:playerId`, the Front Office should have a real Negotiations Center, the Interactive Press Conference should be reachable from the Press Room, and Trade Value should appear on the Player Profile.

---

## Read-First (do this before writing anything)

1. `README.md`
2. `CHANGELOG.md`
3. `MASTER_CONTEXT.md` (architecture)
4. The previous `STATUS.md` (Sprint 3.5 — Hard-reload state survival)
5. This `GOAL.md`
6. `apps/web/src/workers/sim.worker.queries.ts` — focus on `getOpenNegotiations`, `getNegotiation`, `getInteractivePressConference`, `getPlayerTradeValue`. Verify the return shapes match what you build the UI against.
7. `apps/web/src/features/news/routes/NewsPage.tsx` — the **Sprint 3 pattern** for a worker-backed list route. Mimic this structure for `NegotiationsPage`.
8. `apps/web/src/features/roster/routes/RosterPage.tsx` — search for `to={\`/players/${player.id}\`}`. This is the **canonical cross-link pattern**. Replicate it; do not invent a new one.
9. `apps/web/src/features/players/routes/PlayerProfilePage.tsx` — 486 lines. Read it before adding anything. Trade Value should integrate, not displace.
10. `apps/web/src/features/press-room/routes/PressRoomPage.tsx` — current Press Room. The new Interactive Press Conference is a **separate concept** (live, interactive, owner-tone-driven). Decide: new route or new tab inside Press Room. Either is acceptable — see Autonomy Rules.

---

## Allowed Write Scope

You may create or modify any of:

**New files (expected):**
- `apps/web/src/features/negotiations/routes/NegotiationsPage.tsx`
- `apps/web/src/features/negotiations/routes/NegotiationsPage.test.tsx`
- `apps/web/src/features/negotiations/routes/NegotiationDetailPage.tsx`
- `apps/web/src/features/negotiations/routes/NegotiationDetailPage.test.tsx`
- `apps/web/src/features/negotiations/components/*.tsx` (whatever subcomponents you need)
- `apps/web/src/features/press-room/routes/InteractivePressConferencePage.tsx` (if you choose new route) OR a new tab component under `apps/web/src/features/press-room/components/`
- `apps/web/src/features/players/components/TradeValuePanel.tsx` (or similar — fit into existing tab structure)
- `apps/web/docs/screenshots/sprint-4/*.png`

**Updates (expected):**
- `apps/web/src/app/routes/index.tsx` (add routes)
- `apps/web/src/app/layout/Sidebar.tsx` (add Negotiations entry; possibly Press Conference entry)
- `apps/web/src/features/trade/**` (cross-link player names — read the directory and pick the right files)
- `apps/web/src/features/draft/**` (cross-link prospects)
- `apps/web/src/features/news/routes/NewsPage.tsx` (cross-link players in news items, if `NewsItem` has `playerId` or similar — see Milestone 9 details)
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
- `apps/web/src/shared/lib/saveSystem.ts` — Sprint 3.5 territory.
- `apps/web/src/app/boot/AppBootGate.tsx` — Sprint 3.5 territory. Do not change boot order.
- `apps/web/src/shared/hooks/useGameStore.ts` — Sprint 3.5 territory. Do not extend the persisted shell.
- `apps/web/src/features/save-recovery/**` — use existing API only.
- `apps/web/src/features/onboarding/**` — Sprint 2 territory.
- Any existing test that currently passes — do not modify to make new code work. If an existing test breaks, that is a regression — fix the new code, not the test.

---

## Non-Negotiables

1. **No new worker methods.** If you find yourself wanting to add one, STOP — that is a Pause Condition.
2. **No save schema changes.** Stays v33. No new fields, no version bump.
3. **No `Math.random()` anywhere in new code.** The app is deterministic. Even in UI code, prefer no entropy. If you genuinely need pseudo-randomness for a UI affordance (you should not), use the existing seeded helpers — but ask first.
4. **No new top-level packages.** No new dependencies. If you reach for a new npm package, STOP.
5. **All new test files use existing harness** — `@testing-library/react`, `vitest`, and the worker-mocking patterns from `NewsPage.test.tsx` and `RosterPage.test.tsx`.
6. **Hard reload must continue to work** at every new route. Sprint 3.5's invariant. Verify in the browser smoke.
7. **Bundle budgets must not regress.** Check `apps/web/docs/BUDGETS.md` after the build. If any chunk exceeds its ceiling, STOP.
8. **Mobile 375×667** — every new route must render without horizontal overflow.
9. **No `console.log`, `console.warn`, or `console.error` left in production code.** Use `logger` from `apps/web/src/shared/lib/logger.ts` if you need diagnostic output.
10. **Cross-links must reuse the Roster pattern.** Same `<Link>` import, same hover/focus styling. Do not invent a "clickable name" component — just wrap names in `<Link>` like Roster does.

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

### Milestone 1 — Negotiations Center scaffolding (`/negotiations`)

- Add a lazy import for `NegotiationsPage` in `apps/web/src/app/routes/index.tsx`.
- Register `<Route path="negotiations" element={withRouteBoundary('Negotiations', <NegotiationsPage />)} />` alongside the other top-level routes.
- Create `apps/web/src/features/negotiations/routes/NegotiationsPage.tsx`:
  - Calls `worker.getOpenNegotiations()` on mount.
  - Renders the list newest-first (or by deadline — your call, see Autonomy Rules).
  - Each row shows: player name (linked to `/players/:playerId`), team, asking salary, offered terms, deadline, current status.
  - Empty state: "No open negotiations" with a small explanation copy.
  - Loading skeleton mimicking `NewsPage` skeleton style.
  - Error path: toast + Save Hub fallback if the worker call throws.
- Create `apps/web/src/features/negotiations/routes/NegotiationsPage.test.tsx`:
  - Happy path (mock worker, render rows).
  - Empty state.
  - Player-name link navigates to `/players/:id` (via `useNavigate` mock or `MemoryRouter` history check — match `NewsPage.test.tsx`).
- **DONE WHEN**: typecheck + test pass; `/MBD/negotiations` (when the dev server is up) renders the list or the empty state.
- **COMMIT**: `feat(negotiations): add /negotiations Front Office route`

### Milestone 2 — Negotiation detail (`/negotiations/:negotiationId`)

- Lazy import `NegotiationDetailPage` in routes.
- Register `<Route path="negotiations/:negotiationId" element={withRouteBoundary('Negotiation Detail', <NegotiationDetailPage />)} />`.
- Create `apps/web/src/features/negotiations/routes/NegotiationDetailPage.tsx`:
  - Reads `negotiationId` from `useParams`.
  - Calls `worker.getNegotiation(negotiationId)`.
  - Renders the negotiation in detail: player (linked), team, history of offers, current ask vs. current offer, deadlines, status, any agent commentary if present in the shape.
  - 404-ish state if `null` is returned: "Negotiation not found" with a back link to `/negotiations`.
- Update `NegotiationsPage` so each row also has a "View detail" link to `/negotiations/:id` (in addition to the player-name link to the profile).
- Create `NegotiationDetailPage.test.tsx`: happy path, not-found state.
- **DONE WHEN**: typecheck + test pass; clicking a row in `/negotiations` opens the detail page; bad ID renders not-found.
- **COMMIT**: `feat(negotiations): add /negotiations/:id detail view`

### Milestone 3 — Sidebar Negotiations entry

- Add a Negotiations entry to `apps/web/src/app/layout/Sidebar.tsx`. Use a lucide icon — `Handshake`, `FileSignature`, or `Briefcase` are all reasonable. Pick one.
- Place it in a sensible group (alongside Trade and Free Agency feels right — your call).
- Update `Sidebar.test.tsx` to include the new entry (the existing tests likely assert the menu count or specific labels).
- **DONE WHEN**: typecheck + test pass; sidebar shows Negotiations and navigates to `/negotiations`.
- **COMMIT**: `feat(layout): add Negotiations entry to Sidebar`

### Milestone 4 — Interactive Press Conference surface

- Decide: new top-level route at `/press-conference` OR new tab inside the existing Press Room page. Pick whichever requires fewer touches. Document your choice in `.logs/goal-progress.md`.
- Call `worker.getInteractivePressConference()`. The return shape is non-trivial — read the worker implementation and the underlying `generateInteractivePressConference` function before designing the UI.
- Render the press conference: structured questions, owner-tone indicator (supportive / neutral / impatient), recent trade headline if present, top-prospect commentary if applicable.
- If `null` is returned (no user team standing), render a graceful "Press conference unavailable in current game state" message.
- Tests: happy path, null-state path.
- **DONE WHEN**: typecheck + test pass; the press conference renders for a valid save.
- **COMMIT**: `feat(press-room): add interactive press conference surface`

### Milestone 5 — Trade page cross-linking

- Find every place in `apps/web/src/features/trade/**` where a player name renders as plain text.
- Wrap each with `<Link to={\`/players/${player.id}\`}>` (or equivalent depending on local variable name).
- Match the styling pattern from `RosterPage.tsx:473` (read it first).
- Update or add tests verifying the link target.
- **DONE WHEN**: typecheck + test pass; clicking any player name in any Trade surface navigates to that player's profile.
- **COMMIT**: `feat(trade): cross-link player names to /players/:id`

### Milestone 6 — Draft page cross-linking

- Same pattern in `apps/web/src/features/draft/**` for draft prospects.
- The `to={\`/players/${entry.playerId}?tab=development\`}` pattern from `ProspectBreakoutTracker.tsx:84` is a precedent for prospects specifically — consider whether `?tab=development` is the right default for the Big Board.
- **DONE WHEN**: typecheck + test pass; draft Big Board entries are clickable.
- **COMMIT**: `feat(draft): cross-link prospects to /players/:id`

### Milestone 7 — Scouting page cross-linking

- Same pattern in `apps/web/src/features/scouting/**`.
- **DONE WHEN**: typecheck + test pass; scouting reports' player names are clickable.
- **COMMIT**: `feat(scouting): cross-link player names to /players/:id`

### Milestone 8 — Stats / leaderboards cross-linking

- Same pattern in `apps/web/src/features/stats/**`.
- **DONE WHEN**: typecheck + test pass; leaderboard entries are clickable.
- **COMMIT**: `feat(stats): cross-link leaderboard entries to /players/:id`

### Milestone 9 — News page player references

- Inspect `NewsItem` from `@mbd/contracts`. Does it carry a machine-readable player reference field (`playerId`, `relatedPlayerIds`, `entities`, etc.)?
- If YES: render those references as `<Link>` chips below the news body. Match existing news item styling.
- If NO: SKIP this milestone. Do **not** introduce text-parsing or regex to extract player names. Document the skip in `.logs/goal-progress.md` and the final STATUS.md.
- Update `NewsPage.test.tsx` if you wired links.
- **DONE WHEN**: either links work, or skip is documented.
- **COMMIT** (if shipped): `feat(news): cross-link player references in news items`

### Milestone 10 — Trade Value on Player Profile

- Wire `worker.getPlayerTradeValue(playerId)` into `PlayerProfilePage.tsx`.
- Decide placement: a small panel/widget alongside the existing tabs, or a new tab. Lean toward a small panel rather than a new tab to keep tab count stable.
- Render the `PlayerTradeValue` shape — read the type definition before designing.
- Loading + null-handling.
- Add a focused test in `PlayerProfilePage.test.tsx` for the trade-value render.
- **DONE WHEN**: typecheck + test pass; the player profile shows Trade Value for any player.
- **COMMIT**: `feat(players): surface trade value on player profile`

### Milestone 11 — Browser smoke & screenshots

Run `pnpm --filter @mbd/web dev` and capture screenshots to `apps/web/docs/screenshots/sprint-4/`:

1. `01-negotiations-list.png` — `/MBD/negotiations` with rows.
2. `02-negotiations-empty.png` — empty state (delete a save or use a slot with no negotiations).
3. `03-negotiations-detail.png` — `/MBD/negotiations/<id>` detail view.
4. `04-press-conference.png` — interactive press conference rendered.
5. `05-trade-clickable-name.png` — hover/focus state on a clickable player name in Trade.
6. `06-draft-clickable-prospect.png` — same in Draft.
7. `07-scouting-clickable-name.png` — same in Scouting.
8. `08-stats-clickable-leader.png` — same in Stats.
9. `09-news-player-chip.png` — only if Milestone 9 shipped.
10. `10-player-profile-trade-value.png` — Trade Value panel on profile.
11. `11-negotiations-mobile-375.png` — 375×667.
12. `12-negotiations-hard-reload.png` — Sprint 3.5 invariant check.
13. `13-press-conference-mobile-375.png`.

Verify on each route:
- Hard reload (Cmd+Shift+R) lands on the same route, not Save Hub. Sprint 3.5 invariant.
- 375×667 viewport — no horizontal overflow.
- No `console.error` in the browser console (existing warnings unchanged is fine — document if so).

- **DONE WHEN**: all required screenshots committed; browser smoke notes appended to `.logs/goal-progress.md`.
- **COMMIT**: `docs(sprint-4): browser smoke screenshots and notes`

### Milestone 12 — STATUS.md + handoff

Rewrite `STATUS.md` at repo root with:

- What shipped (one-paragraph summary).
- Files changed (`git diff --stat origin/main..HEAD`).
- Validations run (typecheck + test + build — paste the final tail of each).
- Browser evidence (the screenshot list with one-line captions).
- Bundle impact (chunk sizes; any movement against `BUDGETS.md`).
- Worker methods newly consumed (`getOpenNegotiations`, `getNegotiation`, `getInteractivePressConference`, `getPlayerTradeValue`) — confirm zero new worker methods added.
- Sprint 3.5 invariant confirmation (hard reload works at all new routes).
- Cross-linking coverage table (Roster ✅ / Free Agency ✅ / Minors ✅ / Trade ✅ / Draft ✅ / News ✅ or skipped / Scouting ✅ / Stats ✅).
- Known limitations.
- Risks.
- Rollback notes (revert the merge commit; no schema bump).
- Next `/goal` — recommend **Sprint 5 — Press Conference unification (deeper)** or **Sprint 6 — Hardening pass**, your call based on what felt fragile in this run.

- **DONE WHEN**: STATUS.md written and committed; final `.logs/goal-progress.md` summary appended.
- **COMMIT**: `docs(sprint-4): STATUS report and handoff`

---

## Validation Gates

After **every** milestone:

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm typecheck
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm test
```

Before the final Milestone 12 commit, also run:

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm build
```

Browser smoke (Milestone 11 only):

```bash
PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH pnpm --filter @mbd/web dev
```

…then drive the browser through the screenshots list.

---

## Pause Conditions

**STOP and surface to Kevin** (do not push, do not improvise) if any of these happen:

1. A worker method you expected does not exist or returns an unexpected shape. Do not add new worker methods.
2. The save schema would need to bump to support new UI. Sprint 4 is **consumer-only**.
3. A bundle budget in `apps/web/docs/BUDGETS.md` would be exceeded. Stop and let Kevin decide.
4. Hard reload breaks at any new route. Sprint 3.5 invariant — non-negotiable.
5. An existing test in an unrelated area starts failing because of your changes. Investigate the coupling, don't paper over it.
6. The `NewsItem` shape has no machine-readable player references AND you can't ship Milestone 9 cleanly. Skip the milestone; document; continue.
7. You discover the audit was wrong about a "no consumers" claim. Document the surprise, skip the redundant work, continue to the next milestone.
8. You cannot decide between two reasonable approaches and the Autonomy Rules below don't resolve it.
9. You realize the sprint would be cleaner split into two PRs. STOP and ask before splitting.

A pause is not a failure. A bad commit shipped through quietly is a failure.

---

## Autonomy Rules

Once the mission is clear, **do not ask for permission** on:

- Component composition (table vs. card list vs. row layout).
- Lucide icon choice for Sidebar entries.
- Sort order for the Negotiations list (newest-first vs. by deadline — pick what reads best).
- How to format dollar amounts ($5.5M / $5,500,000 / etc. — match what other surfaces in the app do).
- Whether to put Interactive Press Conference at `/press-conference` or as a tab inside `/press-room`. Either is fine; pick the smaller diff.
- Whether Trade Value on the Player Profile is a panel or a new tab. Lean panel.
- Whether News player chips live above or below the body copy.
- Color/spacing/typography using existing design tokens.
- Sidebar grouping order.

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

This file is **read by Kevin and by future agents** to understand what happened. Treat it like a journal, not an afterthought.

---

## Done Criteria

ALL of these must be true before Milestone 12's STATUS.md commit:

1. ✅ `/negotiations` renders open negotiations.
2. ✅ `/negotiations/:id` renders detail or graceful not-found.
3. ✅ Sidebar has a Negotiations entry.
4. ✅ Interactive Press Conference is reachable (new route or new tab — your call) and renders for a valid save.
5. ✅ Trade page player names link to `/players/:id`.
6. ✅ Draft page prospects link to `/players/:id`.
7. ✅ Scouting page player names link to `/players/:id`.
8. ✅ Stats / leaderboards link to `/players/:id`.
9. ✅ News page player references link to `/players/:id` OR Milestone 9 is documented as skipped with reason.
10. ✅ Player Profile shows Trade Value.
11. ✅ Each new route hard-reloads successfully (Sprint 3.5 invariant).
12. ✅ Each new route renders cleanly at 375×667.
13. ✅ All required screenshots committed under `apps/web/docs/screenshots/sprint-4/`.
14. ✅ `pnpm typecheck` passes.
15. ✅ `pnpm test` passes (with new tests added for negotiations, press conference, trade value).
16. ✅ `pnpm build` passes with no new budget violations.
17. ✅ `STATUS.md` rewritten with the full report.
18. ✅ `.logs/goal-progress.md` has 12 milestone blocks.
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

If Sprint 4 closes cleanly with daylight remaining, you may pick up **one** of the following clearly-scoped follow-ons. Do NOT start Bonus Round work until Milestone 12 is committed and pushed.

### Bonus A — Negotiation Actions

The Negotiation Detail page is read-only in Sprint 4. If a `worker.respondToNegotiation(id, terms)` or similar action exists in `sim.worker.actions.ts` (verify before starting), wire an "Accept / Counter / Decline" UI on the detail page. Same milestone discipline: separate commit, separate validation. If the action method does not exist, **DO NOT add one** — Sprint 4 stays consumer-only.

### Bonus B — Negotiation in Player Profile

Add a "Active Negotiation" panel to `PlayerProfilePage` that calls `worker.getOpenNegotiations()` (or a derived selector) and surfaces the player's open negotiation if any. Links to `/negotiations/:id`.

### Bonus C — Press Conference History

If the worker exposes a `getPressConferenceHistory()` or similar (verify — do not assume), wire a small "Past press conferences" list under Press Room.

**Bonus Round non-negotiables:**

- Separate commits per task (e.g. `feat(bonus-a): wire negotiation actions`).
- Same validation gates.
- Update `.logs/goal-progress.md` with a "Bonus Round" section.
- Append to `STATUS.md` under a "Bonus Round" heading.
- If a Bonus Round task hits a Pause Condition, STOP and leave the bonus uncommitted — do not block Sprint 4's merge.

---

## Operating Notes for Codex

- This is Kevin's last sprint of the night before he sleeps. He wants Codex working the whole time. Pace yourself: 12 milestones over the night is roughly one milestone every ~40 minutes if you go steady. There is no time pressure on any individual milestone; quality > speed.
- The `pnpm` binary lives at `/Users/tkevinbigham/.local/node-lts/bin/pnpm`. Every shell call needs `PATH=/Users/tkevinbigham/.local/node-lts/bin:$PATH` prepended.
- The working tree is `/Users/tkevinbigham/MBD-main`. The branch is `goal/sprint-4-front-office`. The base is `main` at `93b3f5b`.
- The draft PR will already exist by the time you start. Claude Code (reviewer) will flip it to ready and merge once Kevin approves in the morning.
- If something feels off about this contract — a milestone is over-specified, an assumption is wrong, the worker shape doesn't match — STOP and surface it. The worst outcome is silent over-improvising. The second worst is asking permission for everything. Aim for the middle: confident execution with surfaced surprises.

Go.
