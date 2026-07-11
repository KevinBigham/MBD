# TRUST-PLAYWRIGHT-1 Completion

Status: complete and review-ready. No goal stop condition remains. No unresolved P0 or P1 finding remains.

Completed: 2026-07-11 00:49 CDT

## Outcome

Roadmap item 1 now has a permanent Chromium CI gate. One clean, fixed-time Trade Shark dynasty uses only public application controls to:

1. apply a real, non-no-op development plan;
2. accept an incoming trade;
3. deliver a confident press response caused by that trade; and
4. make the user's draft pick.

Each mutation starts from a fresh document runtime, observes a newly produced truthful `Saved` state, hard reloads the production-preview page, resumes the same IndexedDB-backed active save, and proves the exact visible consequence survived. The final journey passed twice consecutively without a retry.

The slice does not change gameplay, persistence ownership, simulation policy, save shape, or save version. `CURRENT_GAME_SNAPSHOT_VERSION` remains 34.

## Requirement Mapping

| Goal requirement | Result and evidence |
|---|---|
| Real public UI for every mutation | `reload-smoke.spec.ts` creates the challenge scenario and reaches Minors, Trade Center, Press Room, playoffs/offseason, and Draft Room through visible controls and navigation. There is no IndexedDB, worker, React-state, fixture, or hidden mutation injection. |
| Truthful save before reload | `expectFreshMutationRuntime()` proves stale save status is absent before each tested action; `expectMutationSaved()` requires exact `Saved` after the accepted mutation. |
| Newly initialized post-reload state | `freshRuntimeReload()` performs `page.reload()`, waits for the application and recreated worker to be ready, and only then runs post-reload assertions. |
| Rejected/no-op cannot pass | Development reads the player's current program first and only chooses a recommendation with a different deterministic target. Trade requires `Deal Completed`; press requires `Response delivered.`; draft requires the exact pick ticker entry. |
| Development plan survives | The captured player ID/name and applied program are re-read from that player's Development tab after reload; `Current Program` must equal the applied program and differ from the pre-state. |
| Accepted trade survives | The captured incoming player ID is searched after reload and that exact player's row must show the user organization `SEA`. |
| Press response survives | The captured confident quote and `Confident response` label must appear together in the persisted press-tone briefing after reload; the answered dialog must not reopen. |
| Draft pick survives | The post-reload ticker entry is keyed by the captured prospect/player ID and must contain the exact `SEA selected <name>` line. |
| Deterministic/repeatable | Browser time is fixed before scenario creation; one Chromium worker and clean context run the serial journey. Final CI-mode passes: 2.6 minutes and 2.8 minutes, both clean and without retry. |
| CI browser/runtime gate | Exact `@playwright/test@1.61.1`; CI installs its pinned Chromium revision with system dependencies and runs root `e2e:reload-smoke`. |
| Failure diagnostics | CI-only retry, `failOnFlakyTests`, trace on first retry, failure screenshot, HTML report, and 14-day failure artifact upload are configured. Generated report/result directories were already ignored and are not in the diff. |
| Existing gates preserved | Full typecheck, tests, production/PWA build, determinism, frozen-lockfile install, and CI YAML parsing passed. Existing verify/smoke/determinism steps remain in CI. |
| Save compatibility | No contract, snapshot, migration, fixture, worker mutation, or persistence-coordinator file changed. Save schema remains v34. |

## Changed Files

Harness and CI:

- `.github/workflows/ci.yml`
- `package.json`
- `pnpm-lock.yaml`
- `apps/web/package.json`
- `apps/web/playwright.config.ts`
- `apps/web/e2e/tsconfig.json`
- `apps/web/e2e/helpers/dynasty.ts`
- `apps/web/e2e/reload-smoke.spec.ts`

Narrow selector contracts and focused tests:

- `apps/web/src/features/minors/components/DevelopmentFocusBoard.tsx`
- `apps/web/src/features/minors/components/DevelopmentFocusBoard.test.tsx`
- `apps/web/src/features/trade/components/TradeOfferCard.tsx`
- `apps/web/src/features/trade/components/TradeOfferCard.test.tsx`
- `apps/web/src/features/draft/components/DraftProspectsPanel.tsx`
- `apps/web/src/features/draft/components/DraftProspectsPanel.test.tsx`
- `apps/web/src/features/draft/components/DraftTicker.tsx`
- `apps/web/src/features/draft/components/DraftTicker.test.tsx`

Goal/run record:

- `docs/codex/goals/13_TRUST_PLAYWRIGHT_1.md`
- `docs/codex/runs/TRUST-PLAYWRIGHT-1/SOURCE_TRUTH.md`
- `docs/codex/runs/TRUST-PLAYWRIGHT-1/PLAN.md`
- `docs/codex/runs/TRUST-PLAYWRIGHT-1/COMPLETION.md`

## Browser Proof

Tooling: the real Vite production build and preview at `http://127.0.0.1:4174/MBD/`, Playwright 1.61.1, desktop Chromium, one worker, isolated browser storage, fixed `2026-04-01T12:00:00.000Z` browser time. The preview server is owned and stopped by Playwright; no local preview server remains after completion.

Observed journey:

- Public setup launched a Seattle Trade Shark challenge dynasty.
- Development advanced only as needed through public monthly simulation until a recommendation produced an actual program change. The applied player/program survived a hard reload on the player profile.
- Public monthly simulation reached deterministic day-92 incoming offers. The accepted offer's specifically identified incoming player moved from its original non-SEA club to SEA and remained there after reload.
- The trade-generated press prompt accepted the visible confident option. After reload, the exact captured quote and confident-response consequence remained in the Press Room, and the prompt stayed answered.
- Public fast-forward, playoffs, and offseason controls reached the real Draft Room. After `Start Draft` was itself durably saved and reloaded, the specifically identified prospect was selected. The ticker entry keyed by that prospect ID and SEA selection text survived the final reload.
- The test attaches all captured player/prospect/program/quote identities as `durable-identities.json` for diagnostics.

The journey deliberately handles production PWA behavior: when first service-worker activation presents the public update toast, it clicks `Refresh` and resumes normally. Moment/monthly overlays are dismissed only through their public buttons with bounded retry logic; a naturally detached transient overlay is not treated as a gameplay failure.

## Negative Control

The accepted-trade post-reload assertion was temporarily changed from the user organization `SEA` to the captured player's original organization `CLB`. A rebuilt clean journey failed at that exact row assertion after reload, proving the gate detects the durable post-trade state rather than passing from pre-reload memory. The temporary expectation was reverted to `SEA` before the final diff and final passes.

## Verification

| Command/check | Observed result |
|---|---|
| Baseline focused web suites | 39 tests passed before implementation. |
| Final focused component command (`DraftProspectsPanel`, `DraftTicker`, `DevelopmentFocusBoard`, `TradeOfferCard`) | 4 files, 8 tests passed. |
| `CI=true npx pnpm@9.15.4 run typecheck` | 9/9 workspace tasks successful; web typecheck includes `e2e/tsconfig.json`. |
| `CI=true npx pnpm@9.15.4 --filter @mbd/web run typecheck` after final E2E helper review fix | Passed. |
| `CI=true npx pnpm@9.15.4 run e2e:reload-smoke` — finalized pass 1 | 1/1 passed in 2.6m, no retry. |
| `CI=true npx pnpm@9.15.4 run e2e:reload-smoke` — finalized pass 2 | 1/1 passed in 2.8m, no retry. |
| `CI=true npx pnpm@9.15.4 run test` | 8/8 tasks successful; contracts 22, UI 1, sim-core 1,646, web 1,546 passed / 2 skipped. |
| `CI=true npx pnpm@9.15.4 run build` | 5/5 tasks successful; Vite transformed 3,010 modules and PWA generated 157 precache entries. |
| `CI=true npx pnpm@9.15.4 run verify:determinism` | 1 file, 3 tests passed. |
| `CI=true npx pnpm@9.15.4 install --frozen-lockfile` | Lockfile current; install passed. |
| Playwright listing/config check | One Chromium test discovered; typed web/E2E config passed. |
| Ruby YAML parse of `.github/workflows/ci.yml` | Passed (`ci yaml ok`). |
| Private-state/arbitrary-wait scan across E2E/config | No `evaluate`, IndexedDB/local/session storage injection, `Math.random`, or `waitForTimeout`. |
| Changed-source `Math.random` scan | No matches. |
| `git diff --check` | Passed. |
| Failure-artifact ignore check | `playwright-report/` and `test-results/` are ignored; neither is tracked. |

The full web suite emitted only existing warning classes: Recharts zero-size messages, React `act(...)` warnings, and intentional service-worker registration failure logging. No test failed.

## Adversarial Review

Initial review verdict: `FIX_AND_REVIEW`.

- P1 documentation/evidence finding: the plan still showed proof in progress and `COMPLETION.md` did not yet exist. Resolved by completing every required gate, updating the living plan, and writing this report.
- P2 draft identity finding: the journey captured a prospect ID but originally asserted only a name/team ticker string after reload. Resolved by adding a persisted ticker selector keyed by `playerId` and requiring both the exact ID and visible SEA selection line after reload.
- Scope cleanup: draft-row keyboard selection behavior was removed because this slice needs only a stable identity selector; accessibility behavior belongs to its dedicated roadmap slice.
- Final gate review exposed a transient moment-overlay detach between visibility and text reads. CI `failOnFlakyTests` correctly rejected that run even though its retry passed. The helper now treats a naturally vanished overlay as a bounded retry and still fails if a visible blocking overlay cannot be publicly dismissed. The two final runs passed without retry.

P0 findings: none. Unresolved P1 findings: none. Final verdict: `MERGE_READY`.

## Compatibility, Risks, and Rollback

Compatibility:

- Save schema stays v34.
- No migration, legacy fixture, import/export shape, simulation truth, CPU decision, or RNG stream changed.
- Selector attributes expose only identities already present in the rendered draft/trade/minors view models.

Residual risks:

- CI's Ubuntu `playwright install --with-deps chromium` step was syntax-validated but not reproduced on this macOS host; the exact Chromium package/test ran locally.
- The permanent gate uses the desktop Chromium viewport. It does not duplicate the four-lane journey at a mobile viewport; this slice changes selector semantics rather than layout, and mobile interaction/accessibility remain explicit later roadmap work.
- The Press Room retains a bounded 100-item priority view, so the test intentionally proves the response-specific durable briefing rather than assuming its generated news headline remains in that window.

Rollback:

1. Remove the Playwright config, E2E directory, root/web scripts, exact dev dependencies, and lockfile entries.
2. Remove the CI Chromium install, reload-smoke command, timeout, and artifact upload steps.
3. Remove the four selector-contract changes and their focused expectations.
4. No save rollback or migration is required; all existing saves remain readable.

Unrelated dirty files present during the run—`.agents/skills/mbd-implement-slice/SKILL.md`, `AGENTS.md`, and `docs/codex/PROGRAM.md`—were created/modified concurrently, preserved, and are not claimed or included in this slice.

Adjacent work: none discovered that must block this goal. Roadmap item 2 is the next independent slice.
