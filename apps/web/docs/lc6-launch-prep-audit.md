# LC-6 Launch Prep Audit

Baseline verified on 2026-04-28 from `origin/main`:

- `origin/main`: `cd1f9753a9fd530deaf0544720430186850b9918`
- Latest commits: `#68` LC-3 mobile survival, `#67` LC-5 circular worker chunk cleanup, `#66` LC-2 guided start.
- Save schema: `CURRENT_GAME_SNAPSHOT_VERSION = 33` in `packages/contracts/src/schemas/save.ts`.
- Schema bump required for LC-6: none.

## Audit Summary

### 1. Current Landing Route

- Root route `/` renders `SetupPage` via `apps/web/src/app/routes/index.tsx`.
- Route label is `Save Hub`; there is no separate `apps/web/src/features/landing/` module yet.
- Pre-save state: `SetupPage` shows "Welcome to Mr. Baseball Dynasty", "New Dynasty", and the five save slots. Empty slots say "Reserved for a fresh dynasty build."
- Post-save state: the same route lists saved dynasties with continue/delete/branch controls. If a game is initialized in memory, it also shows "Return to Dashboard".
- New saves route to `/onboarding`; existing saves route to `/dashboard`.

### 2. Current README State

- Last meaningful README update: `2026-04-10` (`1d7a9d5 feat: wire everything sweep`); original README added `2026-04-04`.
- Present sections: title, one-paragraph overview, Play Now link, feature list, tech stack, architecture, development commands, license.
- Missing for v1.0.0: screenshots, "what it is / what it is not" framing, concise play instructions, launch-candidate context, contributor verification command, credits.
- Current length is under 200 lines but still reads like an internal feature inventory.

### 3. Current CHANGELOG State

- `CHANGELOG.md` does not exist at repo root.
- Source of truth for phase/wave/LC history remains `.codex/MBD/changelog.md` and `.codex/MBD/status.md`; LC-6 will create a reader-facing root changelog.

### 4. Current Feedback Path

- No in-app feedback feature exists under `apps/web/src/features/feedback/`.
- No `feedback`, `mailto`, `supabase`, `createClient`, `VITE_SUPABASE`, or `SUPABASE` wiring was found in app source or repo config.
- LC-6 should ship the mailto fallback path unless Kevin separately adds Supabase configuration and a `feedback` table.
- Privacy baseline: no analytics or user identity collection exists for feedback today.

### 5. Version Strings

- Root `package.json`: `0.0.1`.
- `apps/web/package.json`: `0.0.1`.
- Displayed app footer/about copy: `Mr. Baseball Dynasty v0.0.1` in `apps/web/src/features/settings/routes/SettingsPage.tsx`.
- `apps/web/index.html` title/meta: "Mr. Baseball Dynasty" with pre-v1 descriptive copy and no `og:image`.
- Acceptance target: `1.0.0` in package metadata and `v1.0.0` in displayed UI copy.

### 6. Test Oracle

- Landing/save hub render and create/continue flows: `apps/web/src/features/setup/routes/SetupPage.test.tsx`.
- Route wiring for `/` and nested app routes: `apps/web/src/app/routes/index.test.tsx`.
- Settings render and interactions: `apps/web/src/features/settings/routes/SettingsPage.test.tsx`.
- Root app routing/error-boundary shell: `apps/web/src/app/App.test.tsx`.
- Existing tests do not cover feedback because no feedback flow exists yet.

## Slice Progress Ledger

- Slice 1, baseline audit: complete.
- Slice 2, screenshots: complete.
- Slice 3, README rewrite: complete.
- Slice 4, changelog: complete.
- Slice 5, feedback widget: complete.
- Slice 6, version bump and meta: complete.
- Slice 7, final verification: pending.

## Self-Critique Gate

- Schema bump? Expected none. Current schema is v33.
- RNG safety? No sim code touched. Feedback uses no RNG, `Math.random()`, or `Date.now()`.
- Save compatibility? No save shape changes.
- Tests run? Slice 1 audit only; no tests required. Slice 2 used browser capture only.
- Files outside scope? `apps/web/docs/lc6-launch-prep-audit.md` is required by the LC-6 slice plan. `package.json` at repo root was also bumped to `1.0.0` because the pre-edit audit identified it as a version string and the acceptance gate requires version consistency.
- Version strings consistent? Yes: root `package.json`, `apps/web/package.json`, Settings About copy, and `apps/web/index.html` meta/title now show `1.0.0` / `v1.0.0`.
- Feedback widget privacy? Implemented as explicit user-entered fields only. Mailto body includes type, report body, and optional contact only when typed; no user agent, URL, email scraping, or device fingerprint is included.

## Test Results

- Not run for slice 1. Audit-only slice.
- Not run for slice 2. Screenshot-only slice.
- Not run for slice 3. README-only slice; visual inspection and `wc -l README.md` (`69`) passed.
- Not run for slice 4. Changelog-only slice; visual inspection and `wc -l CHANGELOG.md` (`68`) passed.
- `cd apps/web && npx vitest run src/features/feedback/__tests__/FeedbackForm.test.tsx src/features/settings/routes/SettingsPage.test.tsx` passed: 2 files, 11 tests.
- `cd apps/web && npx pnpm typecheck` passed.
- `cd apps/web && npx vitest run` passed: 98 files, 621 tests. Existing jsdom/Recharts and mocked-worker stderr warnings remain.
- `cd apps/web && npx vitest run src/features/setup/routes/SetupPage.test.tsx src/features/settings/routes/SettingsPage.test.tsx` passed: 2 files, 13 tests.
- `cd apps/web && npx pnpm typecheck` passed after the version/meta slice.
- `cd apps/web && npx vitest run` passed after the version/meta slice: 98 files, 621 tests. Existing jsdom/Recharts and mocked-worker stderr warnings remain.
- `cd apps/web && npx vite build` passed. Built `dist/index.html` contains the `v1.0.0` title, description, OG title, OG description, and `og:image`.

## Files Touched

- `apps/web/docs/lc6-launch-prep-audit.md`
- `apps/web/public/screenshots/career-retrospective.jpg`
- `apps/web/public/screenshots/dashboard-desktop.jpg`
- `apps/web/public/screenshots/dashboard-mobile.jpg`
- `apps/web/public/screenshots/landing-save-hub.jpg`
- `apps/web/public/screenshots/pennant-race-board.jpg`
- `apps/web/public/screenshots/season-story-reel.jpg`
- `README.md`
- `CHANGELOG.md`
- `apps/web/src/features/feedback/FeedbackButton.tsx`
- `apps/web/src/features/feedback/FeedbackForm.tsx`
- `apps/web/src/features/feedback/feedbackSubmit.ts`
- `apps/web/src/features/feedback/index.ts`
- `apps/web/src/features/feedback/__tests__/FeedbackForm.test.tsx`
- `apps/web/src/features/settings/routes/SettingsPage.tsx`
- `apps/web/src/features/settings/routes/SettingsPage.test.tsx`
- `apps/web/src/features/setup/routes/SetupPage.tsx`
- `apps/web/src/features/setup/routes/SetupPage.test.tsx`
- `apps/web/package.json`
- `package.json`
- `apps/web/index.html`

## Screenshot Notes

- Total screenshot payload: `364 KB`, below the `1.5 MB` budget.
- Live browser capture path: Vite dev server at `http://127.0.0.1:5173/MBD/`, Quick Start save, Marcus Chen AGM, real dashboard, real Pennant Race board, real Career Retrospective card, real mobile dashboard.
- The short generated save did not expose a Season Story Reel trigger, matching the LC-3 audit note that dashboard story modals were not available in the day-zero browser save. `season-story-reel.jpg` is a styled reference using the existing Season Story Reel test fixture copy and the live app stylesheet; no source files were changed to create it.

## v1.0.0 Readiness Checklist

- [x] README rewritten and screenshot links resolve.
- [x] CHANGELOG created with v1.0.0 launch narrative.
- [x] Feedback widget ships with mailto fallback or existing Supabase insert.
- [x] Version strings updated to `1.0.0` / `v1.0.0`.
- [x] Screenshots committed under 1.5 MB total.
- [ ] Schema remains v33.
- [ ] Bundle ceilings hold.
- [ ] Full verification gate passes.
