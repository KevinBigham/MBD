# TRUST-PLAYWRIGHT-1 Execution Plan

## Objective and player outcome

The four TRUST-A high-emotion actions—development-plan apply, accepted trade, press response, and draft pick—will have a permanent CI journey proving their exact consequences survive a real hard reload. Active goal: [`docs/codex/goals/13_TRUST_PLAYWRIGHT_1.md`](../../goals/13_TRUST_PLAYWRIGHT_1.md).

## Live source truth

- Repository: `/Users/kevin/Downloads/MBD-main-main`
- Branch/worktree: `codex/trust-playwright-1` in the primary worktree.
- Starting commit: `d0aff48e3848e6fbaba16b293e7b76911481959e`.
- Starting dirty state: only the slice-owned goal file was untracked; all pre-existing production source was clean.
- Package/runtime: `pnpm@9.15.4`, Node `>=20`.
- Root gates: `pnpm typecheck`, `pnpm test`, `pnpm build`, and `pnpm verify:determinism`; web has no browser-test script yet.
- Save version: v34; this slice will not change it.
- CI: one Ubuntu/Node 20 verify job; no browser install/test/artifact step.
- Browser infrastructure: no Playwright dependency, config, or tests. Failure artifact directories are already ignored.
- Existing implementation: TRUST-A's runtime persistence coordinator and global status are present, and route tests cover the mutation/save call ordering. Its completion report records manual reload evidence but explicitly leaves a permanent browser harness absent.
- Baseline: targeted 39 tests, full typecheck, full build, determinism (3), and full workspace tests all passed. Full web tests were 1,546 passed / 2 skipped; sim-core was 1,646 passed.
- Environment correction: use `CI=true npx pnpm@9.15.4 ...`; the host's unpinned pnpm is newer and aborted while attempting to replace the modules directory in a non-TTY.
- Full mapped seams and assumptions are recorded in `SOURCE_TRUTH.md`.

## Scope and non-goals

Allowed areas:

- web-workspace Playwright dependency, production-preview config, and E2E helpers/spec;
- root/web package scripts and lockfile;
- semantics-only selector attributes on the development, trade-offer, and draft controls, with focused Vitest updates;
- `.github/workflows/ci.yml` browser install, test, timeout, and failure-artifact wiring;
- slice goal/run documentation.

Hard cut line: no save schema/migration, persistence-coordinator redesign, mutation endpoint, snapshot/IndexedDB injection, hidden E2E application mode, gameplay or AI tuning, route, production dependency, service-worker behavior change, or unrelated cleanup. Storage pressure, checksum, multi-tab locking, write-ahead journal, and autosave fallback remain later roadmap work.

Adjacent defects discovered outside these four lanes will be recorded rather than folded into this slice unless they directly violate an already-shipped TRUST-A invariant needed by the proof.

## Behavioral invariants

- Each mutation is accepted through the same visible public UI used by a player.
- A lane starts from a fresh document runtime, observes a newly produced `Saved` state, performs `page.reload()` in the same context, and asserts one specifically identified durable consequence.
- Post-reload proof comes only from normal app boot, active-slot selection, IndexedDB loading, and a recreated worker; the test never injects application state.
- Rejected/no-op actions cannot satisfy assertions.
- The fixed browser clock is set before scenario creation; simulation keeps using seeded RNG and deterministic ordering.
- No bare `Math.random()`, UUID, wall-clock event identity, or unbounded sleep enters gameplay truth or the test.
- The journey uses isolated clean storage, one worker, bounded overlay handling, and stable semantic selectors.
- Existing v34, old-save, import/export, PWA, build, full test, and determinism behavior remain unchanged.
- Browser retries are CI-only; retry evidence must not hide a flaky final result.
- Failure traces/screenshots are retained, while generated artifacts stay untracked.

## Design decision

Add exact `@playwright/test@1.61.1` as a web dev dependency and keep the configuration at `apps/web/playwright.config.ts`. Playwright will build and serve the real production application at `http://127.0.0.1:4174/MBD/`, run a desktop Chromium project, and create a clean context for one serial test with four named `test.step` lanes.

The journey launches the public Trade Shark challenge scenario with `page.clock.setFixedTime(...)`, applies and verifies a development plan, advances to and accepts a deterministic incoming trade, answers its press prompt, advances through playoffs/offseason, and drafts a prospect. It captures visible player/prospect/program identities at mutation time and verifies those exact identities after reload.

One serial dynasty was chosen over four independent dynasties because it matches the requested journey, avoids repeating the longest public season advancement, and makes the trade-generated press prompt causal. Each mutation still receives its own pre-mutation runtime reload and post-save proof reload, so no lane relies on retained React or worker memory.

Rejected alternatives:

- app-only test mode, seed query parameter, worker RPC backdoor, IndexedDB write, or imported fixture: these manufacture state instead of testing player pathways;
- four parallel saves: unnecessary runtime and slot-race surface;
- Vite dev server: production preview better exercises the release/PWA output;
- arbitrary time sleeps or hard-coded generated players: nondeterministic and diagnostically weak;
- production generation counters solely for E2E: pre-mutation reload already makes the existing truthful status unambiguous.

Compatibility: no migration or schema change. Rollback is removal of the Playwright files/dependency/scripts/CI steps and the four selector-contract changes; saved games are unaffected.

## Milestones

| # | Checkpoint | Files | Proof | Status |
|---:|---|---|---|---|
| 1 | Goal and source reconciliation | goal, `SOURCE_TRUTH.md`, this plan | Docs written before production edits; live source has no stop contradiction | Complete |
| 2 | Harness and selector contracts | package files, Playwright config, three UI components/tests | Playwright lists Chromium test; targeted component tests and E2E typecheck pass; production preview boots | Complete |
| 3 | Deterministic public setup and development lane | E2E helper/spec | Fixed scenario selects a non-no-op plan and profile Current Program survives reload | Complete |
| 4 | Trade and press lanes | E2E spec/helpers | Identified incoming player and exact confident-response consequence survive separate reloads | Complete |
| 5 | Draft lane and CI diagnostics | E2E spec, CI workflow | Identified pick survives reload; CI installs Chromium and retains failure evidence | Complete |
| 6 | Adversarial proof and repository gates | temporary negative control, all gates | Negative control failed then was reverted; finalized E2E passed twice without retry; full gates passed | Complete |
| 7 | Review and completion report | final diff, `COMPLETION.md` | Review findings resolved; no unresolved P0/P1; requirements, risks, rollback, and commands recorded | Complete |

## Acceptance matrix

| Requirement | Implementation location | Unit/integration proof | Browser/CI proof | Status |
|---|---|---|---|---|
| Real public UI only | scenario/navigation helpers | Existing route/action tests remain green | No storage, worker, or React-state injection in spec | Complete |
| Truthful fresh save per lane | save-status helper plus pre-mutation reload | Existing TRUST-A coordinator/status tests | Status absent before action, exact `Saved` after action | Complete |
| Development plan survives reload | Minors and player profile Development panel | Focus-board/Minors targeted tests | Pre-state differs; captured applied program equals Current Program after reload | Complete |
| Accepted trade survives reload | incoming-offer card and player profile | Trade offer/handler tests | Captured incoming player shows SEA after reload | Complete |
| Press response survives reload | press overlay and Press Room | Existing press response/persistence tests | Prompt stays closed; exact quote and Confident consequence remain visible | Complete |
| Draft pick survives reload | prospect row, submit action, ticker | Draft panel/action tests | Captured prospect remains in ticker after reload | Complete |
| Deterministic and repeatable | fixed clock, serial Chromium context | Determinism and full suites | Final clean-storage journey passed twice consecutively in 2.6m and 2.8m, without retry | Complete |
| CI failure diagnostics | Playwright config and CI | Config/list command | Chromium-only install; trace/screenshot upload on failure | Complete |
| Gate detects regression | assertion in E2E spec | n/a | Temporary trade expectation for the original CLB team failed after reload, then was reverted to SEA | Complete |
| Schema/legacy safety | no schema changes | Full tests and determinism | Production build/PWA and reload boot remain green | Complete |

## Progress log

1. 2026-07-10 — Created `codex/trust-playwright-1` from clean main and authored the exact one-item goal.
2. 2026-07-10 — Read governing docs, TRUST-A goal/completion, package/CI/Vite/save source, four UI lanes, and relevant tests. Three read-only source/test/risk reviews converged on a public serial scenario journey.
3. 2026-07-10 — Ran pinned install, targeted tests, full typecheck/build/test, and determinism baselines; all repository gates passed. No Playwright baseline existed.
4. 2026-07-10 — Selected production-preview Chromium with fixed browser time, a clean serial context, pre-mutation reloads, bounded overlay handling, and three narrow selector contracts. Wrote source truth and living plan before production edits.
5. 2026-07-10 — Added exact Playwright/Node type dependencies, typed config/spec, production-preview server, selector/accessibility contracts, root/web scripts, Chromium-only CI execution, and failure artifact upload. Focused component tests passed 6/6; web and E2E typecheck passed.
6. 2026-07-10 — Stabilized live production/PWA behavior: corrected pnpm preview arguments, handled detached overlays, took the service-worker Refresh action, rejected Spring Training no-op plans, ordered press prompt dismissal after route readiness, asserted a visible response-specific briefing, and reset the runtime before draft start.
7. 2026-07-10 — First complete clean Chromium journey passed in 2.2 minutes across all four mutation/reload lanes.
8. 2026-07-10 — Pointed the post-reload trade assertion at the incoming player's original CLB organization; the test failed at that exact assertion. Reverted it to SEA before continuing.
9. 2026-07-10 — Ran two consecutive CI-mode journeys successfully, then passed full typecheck, test, build, determinism, frozen-lockfile install, CI YAML parsing, source scans, and `git diff --check`.
10. 2026-07-11 — Adversarial review required exact draft identity proof. Added a persisted ticker selector keyed by the captured prospect ID and removed unrelated draft keyboard behavior from scope.
11. 2026-07-11 — A review rerun exposed a detach race while a transient moment overlay disappeared. Centralized bounded transient-overlay dismissal; the finalized journey then passed twice consecutively in 2.6 and 2.8 minutes with no retry.
12. 2026-07-11 — Re-ran focused tests (4 files/8 tests), web/E2E typecheck, full root tests (8/8 tasks), production build (5/5), determinism (3/3), frozen install, CI YAML parse, source scans, and whitespace checks. All passed.

Next: land this reviewed slice and continue roadmap item 2 in a new branch/worktree.

Blockers: none.

## Decision log

- Roadmap item 1 requires a new exact goal because the repository enforces one goal file per branch and no existing unfinished goal owns this permanent CI gate.
- The current v34 schema and TRUST-A coordinator are sufficient; no gameplay/save change is justified.
- Public Challenge Scenario setup is a legitimate UI shortcut; normal onboarding is unrelated to this test and much longer.
- Fixing browser time before first navigation resolves setup's `Date.now()` seed without altering simulation code.
- Reload before every tested mutation prevents stale runtime `Saved` text from creating a false positive.
- The accepted trade is the causal source for the press lane, so trade and press belong in one serial dynasty.
- Visible identities are captured at runtime; no generated roster name is asserted from memory.
- Use exact Playwright 1.61.1 and Chromium only. CI gets one worker, CI-only retry, fail-on-flaky behavior, trace on first retry, and failure screenshots.
- Do not accept an applied-plan message alone: the journey reads Current Program first and selects only a recommendation whose deterministic target differs.
- Keep production PWA behavior enabled and take the public Refresh action when first service-worker activation announces an update.
- Use the persisted press-tone briefing (exact quote plus Confident response) as the visible consequence because the response news can fall outside the Press Room's bounded priority window.
- Use production preview with `reuseExistingServer: false` in CI/test configuration so a stale local server cannot satisfy the gate.
- Key the post-reload draft proof by the captured `playerId` as well as its visible SEA ticker line; a name-only assertion is insufficient proof of the exact pick.
- Treat moment/monthly overlays as transient DOM: a locator may disappear between visibility and text reads, so the helper retries bounded public dismissal without turning a natural detach into a flaky failure.

## Completion conditions

All completion conditions are satisfied:

- focused Vitest tests for every changed selector/behavior contract pass;
- `CI=true npx pnpm@9.15.4 run e2e:reload-smoke` passes twice consecutively from clean browser storage;
- a temporary wrong post-reload assertion produces the expected Playwright failure and is reverted;
- `CI=true npx pnpm@9.15.4 run typecheck` passes;
- `CI=true npx pnpm@9.15.4 run test` passes;
- `CI=true npx pnpm@9.15.4 run build` passes;
- `CI=true npx pnpm@9.15.4 run verify:determinism` passes;
- CI workflow command/config syntax is locally validated as far as available;
- a source scan confirms no new bare `Math.random()` in application/simulation source;
- failure artifacts are configured, ignored, and not present in the final diff;
- final diff receives an adversarial save/determinism/CI/browser review with no unresolved P0/P1;
- `COMPLETION.md` maps every requirement to files and observed evidence and records unresolved risks and rollback.
