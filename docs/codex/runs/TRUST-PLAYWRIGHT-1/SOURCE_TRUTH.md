# TRUST-PLAYWRIGHT-1 Source Truth

## Repository state

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch: `codex/trust-playwright-1`
- Starting commit: `d0aff48e3848e6fbaba16b293e7b76911481959e`
- Starting dirty state: only the new, slice-owned goal file `docs/codex/goals/13_TRUST_PLAYWRIGHT_1.md` was untracked.
- Package manager: `pnpm@9.15.4`; Node requirement: `>=20`.
- Snapshot schema: `CURRENT_GAME_SNAPSHOT_VERSION = 34` in `packages/contracts/src/schemas/save.ts`.
- Application base path: `/MBD/` in `apps/web/vite.config.ts`.

## Current scripts and CI

The root exposes `typecheck`, `test`, `build`, `verify`, and `verify:determinism`. The web workspace exposes `dev`, `preview`, `typecheck`, `test`, and `build`. There is no browser-test script.

`.github/workflows/ci.yml` currently installs dependencies and runs workspace verification, the sim smoke gate, and the sim-core determinism snapshot on Node 20. It does not install a browser, execute a browser journey, or upload browser diagnostics.

The repository has no Playwright dependency, configuration, or test. `playwright-report/` and `test-results/` are already ignored.

## Baseline evidence

All results below were observed on the untouched production source at the starting commit.

- `CI=true npx pnpm@9.15.4 install --frozen-lockfile`: passed, lockfile already current.
- Targeted persistence/lane suite: 6 files and 39 tests passed.
- `CI=true npx pnpm@9.15.4 run typecheck`: passed, 9 tasks.
- `CI=true npx pnpm@9.15.4 run build`: passed, 5 tasks, including the web production/PWA build.
- `CI=true npx pnpm@9.15.4 run verify:determinism`: passed, 3 tests.
- `CI=true npx pnpm@9.15.4 run test`: passed. Sim-core passed 1,646 tests; web passed 1,546 tests with 2 skipped; all workspace test tasks passed.
- An initial invocation through the host's unpinned pnpm attempted a non-interactive modules-directory replacement and aborted before tests. All recorded gates use the repository-pinned pnpm 9.15.4 command.

There is no pre-existing browser command to baseline. The new command must first prove that it lists and launches the intended Chromium project before it can become a completion gate.

## Real UI seams

The shortest deterministic, public setup is Home -> Challenge Scenario -> Trade Shark -> Launch Scenario. Scenario setup legitimately creates a playable SEA regular-season dynasty without completing unrelated onboarding chapters. It is a player-visible path, not a fixture or state backdoor.

The four persistence lanes are reachable through existing player controls:

1. Development plan: Minors -> inspect a focus player's existing public profile -> Apply plan only when the recommendation changes Current Program. If Spring Training recommendations are all no-ops, advance through public month controls until a real deterministic change appears. After reload, Players search -> player profile -> Development shows the durable Current Program.
2. Accepted trade: advance past the deterministic incoming-offer threshold, open Trade -> Hot Offers, accept an offer, then reload. Players search shows an identified incoming player on SEA.
3. Press response: an accepted trade produces a real Press Conference. Submit a visible tone, save, reload, and verify both that the prompt stays answered and that the response-specific quote/tone consequence appears in Press Room.
4. Draft pick: use public season/playoff/offseason controls to reach Draft, start the draft, select a prospect, and submit the pick. After reload, the ticker still records the identified selection.

Relevant source seams include:

- save truth/status: `apps/web/src/shared/lib/activeSavePersistence.ts`, `apps/web/src/app/layout/TopBar.tsx`, and `apps/web/src/app/layout/AppBootGate.tsx`;
- deterministic public setup and advancement: Home/scenario routes, app shell season controls, and playoff controls;
- development plan: `apps/web/src/features/minors/components/DevelopmentFocusBoard.tsx`, `apps/web/src/features/minors/routes/MinorsPage.tsx`, and player Development profile panels;
- offers/trades: `apps/web/src/features/trade/components/TradeOfferCard.tsx`, incoming-offer hooks, and trade worker actions;
- press: press-conference overlay/action handlers and Press Room news rendering;
- draft: `apps/web/src/features/draft/components/DraftProspectsPanel.tsx`, draft action handlers, and draft ticker.

## Persistence and reload contract

The existing TRUST-A coordinator writes the exact accepted post-mutation snapshot to the active save in IndexedDB and exposes `data-testid="save-persistence-status"` only for runtime persistence states. A real `page.reload()` in the same browser context recreates the document and worker while retaining the browser profile's IndexedDB/local-storage slot selection. Therefore the post-reload assertions can prove durable state without private state injection.

To prevent a stale `Saved` label from satisfying a later lane, the journey reloads immediately before each mutation under test and first asserts that no saved status is present. It then waits for the new mutation's exact visible `Saved` state before performing the proof reload.

## Determinism findings

- Scenario setup currently derives its seed from `Date.now()`. Playwright's public clock API will fix browser time before the first navigation, making the scenario seed and all subsequent simulation decisions repeatable without changing game source.
- Simulation truth continues to use the repository's seeded RNG. The test will not call `Math.random()`, write a UUID, inject a snapshot, edit IndexedDB, call worker internals, or depend on wall-clock delays.
- Incoming trade offers are deterministically generated after crossing the existing season threshold. The journey will capture the visible incoming player name rather than assume a hard-coded roster identity.
- Execution is one isolated Chromium context, one serial journey, and one worker. This avoids shared save-slot races.

## Selector gaps

Most controls already have durable roles, labels, text, or mobile-critical attributes. Three repeated/structural controls need small semantics-only contracts:

- a player-specific accessible label for Development Focus Board's Apply plan action;
- an accessible article/test anchor for each incoming trade offer card;
- a stable row test id (and prospect id metadata) for draft prospect selection.

These attributes do not change behavior or saved state and will receive focused component coverage where the component already has tests.

## Browser corrections discovered during implementation

- At Spring Training, all three visible focus recommendations in the fixed Trade Shark seed reapply the player's existing program. The journey therefore treats those as ineligible and advances through public monthly simulation until the board exposes a recommendation whose target differs from the profile's Current Program. This prevents a no-op autosave from satisfying the lane.
- The production service worker's first activation presents an infinite public “App updated” toast. The journey clicks its visible Refresh action and resumes the IndexedDB-backed save; it does not disable service workers or force clicks through the toast.
- The confident press response creates both a news story and a persisted identity briefing. At day 92, the Press Room's 100-item priority window can omit the lower-priority response news after the simulation news burst. The durable identity briefing remains visible and contains the exact response quote and “Confident response,” so it is the reliable player-visible reload consequence.

## Compatibility and scope conclusion

Live source does not contradict `docs/codex/goals/13_TRUST_PLAYWRIGHT_1.md`. The slice needs only dev/test infrastructure, narrow selector semantics, CI wiring, and documentation. No save field, migration, gameplay rule, worker contract, route, production dependency, or application-only E2E mode is required. Save schema remains v34.
