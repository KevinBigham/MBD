# TRUST-PLAYWRIGHT-1 — Permanent Reload-Smoke CI Journey

## Objective

Turn TRUST-A's manual hard-reload evidence into a permanent Playwright release gate that proves the four named high-emotion mutations—draft pick, accepted trade, press response, and development-plan apply—remain durable after a real browser reload.

This goal owns roadmap item 1 only. It does not change gameplay, save semantics, or the persistence coordinator unless live browser evidence exposes a defect that must be fixed to make the existing TRUST-A contract true.

## Read first

- `AGENTS.md`
- `PLANS.md`
- `docs/codex/CANONICAL_DIRECTION.md`
- `docs/codex/RELEASE_GATES.md`
- `docs/codex/REVIEW_STANDARD.md`
- `docs/codex/goals/01_TRUST_A.md`
- `docs/codex/runs/TRUST-A/COMPLETION.md`
- live CI, package, Vite, IndexedDB/save, onboarding, draft, trade, press, and minors source

## Source-first checkpoint

Before production edits:

1. Record branch, commit, dirty state, package manager, scripts, current save version, current CI jobs, and baseline results.
2. Confirm no Playwright dependency/config/tests already exist and inspect the current CI browser/runtime support.
3. Map the shortest real UI path to each required mutation. Prefer public UI and stable accessibility contracts; do not mutate worker state, IndexedDB, or React internals from the test to manufacture the asserted effect.
4. Confirm the persisted evidence for each lane from the canonical saved snapshot and the visible UI after reload.
5. Decide whether one serial dynasty journey or isolated lane journeys are more deterministic and maintainable. Record the choice in the plan.
6. Prove test data and identifiers are seed-stable. No wall-clock, UUID, or unseeded randomness may enter simulation truth or expected event IDs.
7. Establish the baseline for targeted web tests, full typecheck/test/build/determinism, and the new browser command before claiming the gate.

## Required invariants

1. Every required lane performs the mutation through the same public application UI a player uses.
2. Each lane observes truthful `Saved` state before reload, performs a hard page reload, resumes the same save slot, and asserts the exact gameplay consequence survived.
3. The test never passes solely because pre-reload React/worker memory survived; post-reload assertions must come from a newly initialized page/worker reading IndexedDB.
4. A rejected/no-op action cannot satisfy a lane.
5. The journey is deterministic and repeatable locally and in CI with bounded timeouts and no arbitrary sleeps.
6. The CI job installs a pinned browser/runtime and fails when any required lane fails.
7. Screenshots, traces, or equivalent diagnostics are retained on failure without committing generated artifacts.
8. Existing Vitest, build, determinism, bundle, and PWA gates remain intact.
9. Save schema remains v34. Any discovered need for a schema change is a stop condition for this slice.

## Required lanes

### Draft pick

- Reach the real draft UI through supported app controls.
- Make an accepted draft selection.
- Wait for truthful save completion.
- Hard reload and resume the same save.
- Assert the selected prospect remains drafted by the user organization.

### Accepted trade

- Reach an open trade window through supported app controls.
- Execute an accepted trade through the real trade UI.
- Wait for truthful save completion.
- Hard reload and resume the same save.
- Assert at least one specifically identified player remains on the post-trade organization.

### Press response

- Reach a real press prompt.
- Submit one response through the visible press UI.
- Wait for truthful save completion.
- Hard reload and resume the same save.
- Assert the response's durable consequence and that the answered prompt does not reopen as unanswered.

### Development-plan apply

- Open the Minors development-plan UI.
- Apply a plan to a specifically identified player.
- Wait for truthful save completion.
- Hard reload and resume the same save.
- Assert that player's applied plan remains visible.

## Architecture selection order

1. Add the smallest conventional Playwright setup at the web-workspace or repository boundary that matches current scripts and CI.
2. Reuse one seed-stable onboarding helper and narrowly scoped UI helpers; keep assertions in the lane tests.
3. Prefer role/label/test-id selectors anchored to durable user-facing contracts. Add a test id only where no stable accessible selector exists.
4. Prefer serial execution against isolated browser contexts/save storage. Parallelism must not create shared-slot races.
5. Reuse the current Vite production preview or dev-server command. Do not add an application-only E2E mode, hidden mutation endpoint, worker backdoor, or fixture injection API.
6. If a lane is prohibitively long through existing controls, optimize the public journey with deterministic reusable setup—not by bypassing game rules.

## CI and diagnostics

- Add a named root or web script for the reload-smoke journey.
- Add a CI job/step that installs only the required Playwright browser and runs the named journey.
- Use retries only in CI and retain trace/screenshot evidence on the first retry or final failure.
- Keep generated Playwright artifacts ignored.
- Document the exact local command in the run report.

## Proof

- targeted Vitest coverage for any selector/behavior contract changed to support the browser journey;
- local Playwright run passes twice consecutively from clean browser storage;
- a negative-control demonstration proves at least one lane fails when its post-reload durability assertion is intentionally pointed at the pre-mutation state, with the temporary change reverted before completion;
- full root `typecheck`, `test`, `build`, and `verify:determinism` pass;
- CI workflow syntax and command wiring are verified locally as far as the environment permits;
- browser artifacts on failure are configured and ignored;
- no new bare `Math.random()` in application/simulation source.

## Scope cut line

No save checksum, multi-tab lock, storage-pressure UX, write-ahead journal, autosave auto-retry/export fallback, shell timestamp/pending-write display, gameplay tuning, schema migration, worker decomposition, new route, or test-only gameplay mutation API. Record any defect discovered outside the four named lanes as adjacent work unless it violates an existing TRUST-A invariant required by this journey.

## Stop conditions

Stop with evidence if:

- a required lane cannot be reached through the current public UI without adding gameplay behavior;
- the browser infrastructure cannot run in the current repository/CI without a production dependency or schema change;
- the test requires unseeded simulation behavior or private state injection to become repeatable;
- live source proves one of the named mutations no longer exists.

## Done

The repository has a CI-run Playwright reload-smoke gate that performs all four real mutations, observes truthful save completion, hard reloads, and proves the exact consequences survived from IndexedDB-backed state. The journey is deterministic, locally repeatable, diagnostically useful on failure, schema-neutral, green with all repository gates, browser-proven, adversarially reviewed, and fully recorded in `docs/codex/runs/TRUST-PLAYWRIGHT-1/COMPLETION.md`.
