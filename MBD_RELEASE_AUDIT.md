# MBD Release Audit

Initial evidence captured 2026-06-19; reconciled against `/Users/tkevinbigham/Downloads/AUDIT_GOAL_MBD.md` on 2026-06-20.

## Current Release Verdict

Status: YELLOW for broad playability, RED for public "complete/GOAT" release.

MBD builds, typechecks, passes its test suite, passes determinism verification, and loaded all registered routes in a Playwright smoke. The audit initially found P0/P1 save-trust, readiness, and onboarding gaps; the current dirty working tree now contains fixes for draft autosave, app-shell autosave, press autosave, readiness display, guided-start nudge interception, and finance capping/spacing. Current typecheck/test/build/determinism gates pass. It should not be treated as release-complete until those dirty changes pass browser reload/manual validation and ownership review, and until development/AI/minors gaps are triaged.

## Verification Ledger

| Check | Result | Release implication |
|---|---|---|
| `npx pnpm@9.15.4 typecheck` | Pass | Current dirty source; 9/9 Turbo tasks successful. |
| `npx pnpm@9.15.4 test` | Pass | Current dirty source; contracts 22, UI 1, sim-core 1,643, web 1,514 passed and 1 skipped. Existing stderr warnings remain. |
| `npx pnpm@9.15.4 build` | Pass | Current dirty source; Vite/PWA build passed with 157-entry precache at 3,835.50 KiB. |
| `npx pnpm@9.15.4 run verify:determinism` | Pass | Current dirty source; 3 determinism tests passed. |
| `rg -n "Math\\.random\\(" apps packages --glob '*.{ts,tsx,js,jsx}'` | No matches | No bare random in scanned app/package sources. |
| `npx pnpm@9.15.4 run verify:structure` | Informational findings | 1 unused dependency and 225 unused exports need cleanup. |
| `npx pnpm@9.15.4 run verify:cycles` | Informational findings | 19 circular dependencies remain. |
| Playwright route smoke | Pass with notes | All registered routes loaded, console had 0 errors/warnings; `/games/0` lacked heading. |
| Focused dirty-tree web tests | Pass | 12 files / 166 tests covering draft autosave, shell autosave, press autosave, readiness display, guided nudge pointer behavior, finance capping/spacing, and development-plan controls. |
| `git diff --check` | Pass | Diff whitespace clean after artifact reconciliation. |

## Public Release Buckets

### Must Fix Before Public Release

| Severity | Issue | Evidence | Why it blocks |
|---|---|---|---|
| P1 | Dirty-tree autosave/readiness fixes need browser reload validation and ownership review. | Current typecheck/test/build/determinism and focused tests pass. | Release cannot rely on unreviewed/uncommitted dirty source alone. |
| P1 | Browser reload smoke is missing for fixed save mutations. | Unit/component tests passed; reload smoke after draft/pulse/press changes has not been rerun. | Save trust needs real reload proof. |
| P1 | Dirty-tree development-plan action needs browser validation and ownership review. | `applyDevelopmentFocusPlan` and Minors page focused tests passed. | Farm management has a first action path, but release needs browser save/reload proof. |
| P1 | AI organizations lack durable identity. | `draftAI.ts:155-201`; user-team-only development identity evidence. | Long saves need believable CPU clubs. |
| P1 | Dirty-tree onboarding nudge/finance fixes need browser validation and ownership review. | Current typecheck/test/build and focused nudge/FinancialView tests pass. | First-run flow still needs real-browser validation. |

### Should Fix Before Public Release

1. Add visible autosave/last-saved state.
2. Recalibrate setup farm grades after authored minors.
3. Add `/games/:gameIndex` empty-state heading.
4. Add release browser smoke covering save reload after high-value mutations and onboarding click paths.
5. Address Recharts/React/service-worker test stderr warnings so release logs are quiet.
6. Continue filtering finance extension materiality after the current capping/spacing fix.

### Can Fix After Early Public Release

1. Worker-boundary import cleanup.
2. Circular dependency and unused export burn-down.
3. Draft AI org identity.
4. Existing-save authored minors upgrade.
5. Legacy archive enrichment/copy.

### Long-Term Greatness Work

1. AI org identities across draft/development/trade/payroll.
2. Player-controlled development plans and mentorship.
3. Prospect-origin-to-legend storytelling.
4. Decade/era history summaries.
5. OOTP/Football Manager-level roster-rule depth and explainability.

## Minimum Release Gate After Fixes

```bash
npx pnpm@9.15.4 --filter @mbd/contracts exec vitest run tests/save.migration.test.ts --reporter=verbose
npx pnpm@9.15.4 --filter @mbd/web exec vitest run src/workers/snapshot.test.ts src/workers/snapshot.onboarding.test.ts src/shared/lib/saveSystem.test.ts src/workers/sim.worker.archivedGames.test.ts --reporter=verbose
npx pnpm@9.15.4 --filter @mbd/web exec vitest run src/features/draft/hooks/useDraftActionHandlers.test.tsx src/features/draft/hooks/useDraftPageController.test.tsx src/features/draft/routes/DraftPage.test.tsx src/app/layout/AppLayoutShellAutosave.test.tsx src/features/dashboard/lib/prospectReadiness.test.ts src/features/dashboard/lib/dashboardPageTransforms.test.ts src/features/dashboard/components/FarmReportCardBody.test.tsx --reporter=verbose
npx pnpm@9.15.4 run verify:determinism
npx pnpm@9.15.4 --filter @mbd/sim-core exec vitest run tests/smokeGate.integration.test.ts --reporter=verbose
npx pnpm@9.15.4 --filter @mbd/web build
```

Browser smoke should cover Save Hub, onboarding, dashboard, roster, minors, scouting, one draft pick, one draft signing, history after sim, and reload after each high-value mutation.
