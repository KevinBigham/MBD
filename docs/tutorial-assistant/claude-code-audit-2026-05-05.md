# Tutorial Assistant V1 — Claude Code Independent Review

Date: 2026-05-05
Reviewer: Claude Code (independent senior reviewer / QA / release-hardening pass)
Branch reviewed: `goal/tutorial-assistant-v1`
Scope: audit Codex's Tutorial Assistant V1 against the goal contract, the actual repo state, the actual diff, and the actual app behavior.

## 1. Audit Verdict

**Needs fixes — blocked by repo state, not by the Assistant implementation.**

The Assistant V1 implementation itself is shippable as a guidance-layer V1: code is well-structured, types pass, route coverage is complete, save safety is preserved, accessibility basics are in place, and the prior Codex build is already in `dist/`. But the local clone is in a state where the work cannot be safely committed, reviewed via PR, or merged.

Two repo-level P0 blockers must clear before this branch can become a PR:

1. The local pack file is corrupt (full diagnosis below). All `git status`/`git diff` hangs Codex saw trace to this — it is not just a slow command.
2. Every Codex change is untracked. The branch SHA equals `main`, so `git diff main..HEAD` is empty even though ~12 docs and 6 source files were authored.

Once those clear, Tutorial Assistant V1 can ship behind one closed-tester playtest pass.

## 2. What Was Verified Manually

### Code structure (read end-to-end)

- `apps/web/src/features/assistant/lib/assistantState.ts` — typed state, save-scoped storage key, sanitizer that defaults invalid modes to `newcomer`, pure reducer for dismiss / complete / replay / story / mode events.
- `apps/web/src/features/assistant/data/assistantGuidance.ts` — `REQUIRED_ASSISTANT_ROUTE_KEYS` (31 keys), `ASSISTANT_GUIDANCE` map, `resolveAssistantRouteKey` covering aliases (`/league/standings`, `/league/leaders`) and dynamic routes (`/players/:id`, `/games/:id`), `buildAssistantNextAction` with phase/route overrides, `buildStoryCallback` with cooldowns from `seenStoryCallbacks` and ticker filtering by category.
- `apps/web/src/features/assistant/components/AssistantPanel.tsx` — chip + expanded panel, role="dialog", Escape-to-close, ratings/strategy expanders, mode toggle, save-scoped state via `useGameStore` (`activeSaveId`, `activeSaveSlot`, `phase`, `day`, `season`).
- `apps/web/src/app/layout/AppLayout.tsx:498` — global mount inside the initialized shell.
- `apps/web/src/app/routes/index.tsx:126-133` — `PreGameAssistantMount` puts the panel on `/` and `/onboarding`, which sit outside `AppLayout`.

### Route coverage

- All 31 `REQUIRED_ASSISTANT_ROUTE_KEYS` map 1:1 to entries in `ASSISTANT_GUIDANCE` (smoke-tested directly via Node).
- Every route in `apps/web/src/app/routes/index.tsx` either matches a key by path or is normalized to one (e.g. `/players/:id` → `player-profile`, `/games/:id` → `box-score`, unknown → `dashboard`).
- `selectRouteGuidance(path)` returns valid guidance for `/`, `/onboarding`, `/dashboard`, `/roster`, `/minors`, `/players`, `/players/compare`, `/players/abc-123`, `/scouting`, `/staff`, `/draft`, `/trade`, `/standings`, `/league/standings`, `/leaders`, `/league/leaders`, `/schedule`, `/games/42`, `/press-room`, `/playoffs`, `/free-agency`, `/offseason`, `/finance`, `/career`, `/history`, `/achievements`, `/rivalries`, `/front-office`, `/pulse`, `/scenarios`, `/stats`, `/records`, `/settings`.

### OVR / ratings visibility

- Existing surfaces already expose OVR/grade columns or panels: roster (`LineupBuilder`, `DepthChartDnD`, `RosterPage`), trade (`TradePage`), free agency (`FreeAgencyPage`), draft (`DraftPage`), scouting (`ScoutingPage`), players (`ProfileHeader`, `DevelopmentTab`, `ScoutingTab`, `StatsTab`, `HistoryTab`, `PlayersPage`, `PlayerComparisonPage`), minors (`PipelineView`, `MinorsPage`).
- Codex's strategy of explaining ratings via Assistant `ratingsFocus` rather than adding new columns is correct given existing density. Coverage matrix and ratings-visibility audit accurately reflect the surfaces.
- Test `assistantGuidance.test.ts` already enforces `ratingsFocus` mentions OVR/rating/ceiling/grade/confidence on `/roster`, `/players`, `/players/compare`, `/players/example`, `/scouting`, `/draft`, `/trade`, `/free-agency`, `/minors`.

### Save safety / determinism

- `CURRENT_GAME_SNAPSHOT_VERSION` is still `33` in `packages/contracts/src/schemas/save.ts:513`. No save migrations introduced.
- No `Math.random` / RNG calls anywhere in `apps/web/src/features/assistant/`, `apps/web/src/app/layout/AppLayout.tsx`, or `apps/web/src/app/routes/index.tsx`.
- Persistence is `localStorage`-only via `assistantStorageKey(saveId)` → keys like `mbd:assistant:v1:save-slot-2` or `mbd:assistant:v1:global`. The `GameSnapshot` schema is not touched.
- Story callbacks are deterministic: they read phase/day/season/route + ticker feed + previously-seen callback ids, no randomness.

### Accessibility

- `role="dialog"`, `aria-label="Mack Mercer Assistant"` on expanded panel; `aria-label="Open Assistant"` / `"Close Assistant"` on toggle/close; `aria-live="polite"` on story callouts.
- Escape closes the expanded panel via a window keydown listener cleaned up on close.
- All interactive controls are `min-h-11` (44 px / iOS minimum).
- Avatar uses `motion-safe:animate-[fadeIn_160ms_ease-out]` so reduced-motion users get a static avatar.
- Initial focus on open is not yet placed on the close button — minor a11y improvement, not a blocker.

### Visual / mobile stacking

- Tailwind classes used by the panel (`dynasty-base|surface|elevated|border|muted|text|textBright`, `accent-primary|info|warning|success`) all resolve in `packages/design-tokens/src/colors.ts`.
- AssistantPanel is `fixed inset-x-3 bottom-24 z-40 sm:left-auto sm:right-4 sm:w-[25rem]`. Mobile bottom nav (`Sidebar.tsx:201`) is `fixed inset-x-0 bottom-0 z-40 ... md:hidden`. With ~64 px nav height and `bottom-24` (96 px) chip placement, the chip clears the nav by ~32 px and shares z-index without overlap.
- `MonthlyPulseOverlay` (z-40), `MomentCardOverlay` (z-50), `CommandPalette` (z-50), `KeyboardShortcutsPanel` (z-50), `TourStep` (z-[60]) all render after the AssistantPanel in the AppLayout JSX, so when those open they correctly cover the chip.

### Existing systems untouched

- `TourProvider`, `PageHelp`, `ContextualHelp`, `GameAdvisor`, onboarding flows: not edited. Verified by file scan; only AppLayout adds the Assistant mount and new imports.

## 3. What Was Fixed In This Review

- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md` — corrected the branch claim (work is uncommitted, branch == main), promoted Codex's "git status hung" note to the actual diagnosis (corrupt packfile), added an "Independent Review" section enumerating verified vs unverifiable items, and changed the goal status to "Implementation complete on disk; awaiting clean commit and closed playtest".
- `docs/tutorial-assistant/release-gate.md` — added two P0 blockers (repo health and uncommitted work) ahead of the existing follow-ups, with the exact recovery sequence and an explicit "do not `git gc`/`git repack`/wipe `.git/objects/pack/` without first preserving the working tree" warning.

No source code edits were applied. Codex's V1 implementation does not have any P0/P1 issues that justify changing code while the repo itself is unhealthy. P3 polish items are listed below for the next sprint.

## 4. Files Changed (this review)

- `docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md`
- `docs/tutorial-assistant/release-gate.md`
- `docs/tutorial-assistant/claude-code-audit-2026-05-05.md` (new)

## 5. Tests / Checks Run And Results

- `git rev-parse main HEAD` → `1d45741... 1d45741...` (branch is identical to `main`).
- `git ls-files --error-unmatch docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md` → `did not match any file(s) known to git` (proving Codex's docs are untracked).
- `git count-objects -v` → `count: 5, in-pack: 5901, packs: 1, size-pack: 3721`.
- `file .git/objects/pack/pack-0e3dc6a6...pack` → `empty` (header bytes are zeroed despite 3.6 MB on disk).
- `git verify-pack -v` on the pack idx → `fatal: early EOF` / `pack is bad`.
- `git fsck --no-progress` → hung; killed.
- `tsc --noEmit -p apps/web` (via `apps/web/node_modules/typescript/bin/tsc`) → exit 0, no diagnostics.
- Direct Node smoke test (Homebrew node 25.8.2 + `--experimental-strip-types`) on `assistantState.ts` and `assistantGuidance.ts` → `STATE OK` and `GUIDANCE OK` covering reducer transitions, sanitizer, storage key shape, route resolution incl. dynamic/alias paths, all 31 guidance entries, hardcore-trade override, offseason override, ticker story callback, and seen-cooldown.
- `apps/web/dist/assets/index-*.js` already contains `"Mack Mercer"`, `"Got it"`, `"Hardcore mode"`, `"Replay"` from the prior Codex build — proving `vite build` previously succeeded with the Assistant code.
- `pnpm --filter @mbd/web test`, `pnpm --filter @mbd/web build`, `pnpm --filter @mbd/contracts test`, `pnpm run verify:determinism` could not be re-run cleanly: vitest and `vite build` hung from this shell on both the bundled Codex Node 24.14.0 and Homebrew Node 25.8.2. The Codex sprint's recorded results in the release gate stand; rerun once the repo is healthy.

## 6. Remaining Known Issues

- **P0** Local pack file is corrupt; full git history is unreadable from this clone.
- **P0** All Codex work is untracked relative to `main`.
- **P2** Closed playtest has not been performed. The first-session script in `playtest-plan.md` is the right pass.
- **P2** Generated Assistant portrait art is deferred. The CSS/icon avatar is fine for V1 but the visual ceiling is low.
- **P2** Some of the longer guidance bodies (`pagePurpose`, `deeperStrategy`) may feel verbose on a 390 px viewport. Worth measuring during playtest before any rewrite.
- **P3** `readAssistantState` calls `localStorage.getItem(...)` twice on the same key — once to null-check and once to parse. Cosmetic; works correctly. Suggested rewrite:

  ```ts
  const raw = window.localStorage.getItem(assistantStorageKey(saveId));
  return sanitizeAssistantState(raw != null ? JSON.parse(raw) : null);
  ```
- **P3** Initial focus on panel open is not placed; users currently rely on Tab to reach the close button. A `useRef` + `focus()` on the close button when `open` flips to `true` would tighten keyboard a11y.
- **P3** When `MonthlyPulseOverlay` is open it is `z-40` (same as the chip). DOM order makes it render above the chip, which is the correct outcome, but the implicit ordering is fragile — consider raising the overlay to `z-[45]` or lowering the chip when an overlay is active.

## 7. Is The Branch Safe To Commit / PR?

**Not yet.** The branch as currently reachable by git contains zero of Codex's work. Committing into this clone risks writing new objects whose deltas may reference the corrupt pack. The right path is:

1. `tar czf ~/mbd-assistant-v1-backup-$(date +%Y%m%d).tar.gz -C /Users/tkevinbigham/Documents/GitHub/MBD docs/goals/MBD_TUTORIAL_ASSISTANT_V1_GOAL.md docs/goals/MBD_TUTORIAL_ASSISTANT_V1_PROGRESS.md docs/tutorial-assistant apps/web/src/features/assistant apps/web/src/app/layout/AppLayout.tsx apps/web/src/app/layout/AppLayout.test.tsx apps/web/src/app/routes/index.tsx apps/web/src/app/routes/index.test.tsx`
2. Re-clone: `git clone git@github.com:KevinBigham/MBD.git ~/Documents/GitHub/MBD-fresh && cd ~/Documents/GitHub/MBD-fresh && git switch -c goal/tutorial-assistant-v1`
3. Restore: `tar xzf ~/mbd-assistant-v1-backup-*.tar.gz -C ~/Documents/GitHub/MBD-fresh`
4. Re-run sanity in the fresh clone: `pnpm install`, `pnpm --filter @mbd/web typecheck`, `pnpm --filter @mbd/web test -- src/features/assistant src/app/routes/index.test.tsx src/app/layout/AppLayout.test.tsx`, `pnpm --filter @mbd/web build`, `pnpm --filter @mbd/contracts test`, `pnpm run verify:determinism`.
5. `git add` only the explicit Assistant paths, commit (no `git add -A`), push, open the PR.

After step 5 the branch is review-safe. The PR description suggested by ChatGPT in the kickoff message is fine — Codex's V1 matches it.

## 8. Recommended Next Sprint

**MBD Assistant Polish + Closed Playtest Sprint**, prioritized in this order:

1. **Closed playtest** with the first-session script in `playtest-plan.md`, on both desktop and a real ~390×844 device (not just resized desktop). Capture which lines feel verbose, where mobile users tap-then-back, and whether OVR meaning landed.
2. **Mobile copy density.** Tighten `pagePurpose` + `deeperStrategy` to one short sentence each on mobile; keep the longer copy for desktop. Likely lands as a `mobileCopy` field on guidance entries plus a `useMatchMedia('(max-width: 640px)')` selector in the panel.
3. **Portrait art slice.** Replace the CSS/icon avatar with a real Mack Mercer portrait set (neutral, encouraging, warning, success, excited). Wire the existing `tone` switch into the asset.
4. **Selective rating badges.** If playtest reveals confusion in trade or draft tables specifically, add small OVR/grade badges at point-of-decision. Avoid blanket badge spam.
5. **Focus management** (P3 above) — first-focus-on-open and an overlay-aware z-index for the chip.
6. **Optional share/social slice** described in `playtest-plan.md` — a copyable Dynasty Status card sourced from history + Assistant story line. Local-only and text-first.

Codex did the build sprint cleanly. The remaining V1 risk is environmental, not engineering.
