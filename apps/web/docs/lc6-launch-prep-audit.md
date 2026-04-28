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
- Slice 2, screenshots: pending.
- Slice 3, README rewrite: pending.
- Slice 4, changelog: pending.
- Slice 5, feedback widget: pending.
- Slice 6, version bump and meta: pending.
- Slice 7, final verification: pending.

## Self-Critique Gate

- Schema bump? Expected none. Current schema is v33.
- RNG safety? No sim code touched in slice 1.
- Save compatibility? No save shape changes in slice 1.
- Tests run? Slice 1 audit only; no tests required.
- Files outside scope? `apps/web/docs/lc6-launch-prep-audit.md` is required by the LC-6 slice plan.
- Version strings consistent? Not yet; current audit records `0.0.1`.
- Feedback widget privacy? Not yet implemented; target is explicit user-entered fields only.

## Test Results

- Not run for slice 1. Audit-only slice.

## Files Touched

- `apps/web/docs/lc6-launch-prep-audit.md`

## v1.0.0 Readiness Checklist

- [ ] README rewritten and screenshot links resolve.
- [ ] CHANGELOG created with v1.0.0 launch narrative.
- [ ] Feedback widget ships with mailto fallback or existing Supabase insert.
- [ ] Version strings updated to `1.0.0` / `v1.0.0`.
- [ ] Screenshots committed under 1.5 MB total.
- [ ] Schema remains v33.
- [ ] Bundle ceilings hold.
- [ ] Full verification gate passes.
