# ORG-DRAFT-1 Plan

## Objective and player outcome

CPU clubs make visibly different, understandable draft choices from legal board information while remaining deterministic and fair. Active goal: `docs/codex/goals/04_ORG_DRAFT_1.md`.

## Live source truth

See `SOURCE_TRUTH.md`. This checkout has no `.git` directory, so branch/commit/dirty state are unavailable. Save schema is v35. The public policy is in `packages/sim-core/src/draft/draftAI.ts`; both worker draft lanes now call the compact-compatible selector exported from `draftWorker.ts`.

## Scope and non-goals

Allowed: draft AI contract/scoring, draft exports/tests, worker tests only as needed, and ORG-DRAFT-1 run documents. Deferred: development, trades, free agency, economy, scouting redesign, routes/UI, save schema, and Goal 31 performance work.

## Behavioral invariants

- No hidden ratings or privileged scouting truth.
- Identity changes only bounded preferences, never talent, outcomes, budgets, RNG source, pool composition, or save shape.
- Stable candidate ordering and existing seeded tiebreaker behavior remain deterministic.
- Scoring and selection do not mutate inputs.
- `aiSelectPick` remains compatible for existing callers.

## Design decision

Replace the hidden-truth upside calculation with a pure scorer over a narrow immutable visible candidate view. Export a versioned profile, a detailed non-persisted selection result, and a backward-compatible prospect-only wrapper. Use conservative component bounds and explanations derived from actual components.

## Milestones

1. Baseline draft tests and source records — `draft.test.ts`; prove current behavior and record leakage.
2. Versioned profiles and visible boundary — `draftAI.ts`, `index.ts`, focused unit tests.
3. Pure bounded scoring and hidden-truth removal — `draftAI.ts`, property/invariant tests.
4. Detailed selection and explanations — `draftAI.ts`, export/tests.
5. Worker-boundary regression proof — worker tests; no persisted shape change.
6. Fairness/determinism harness and final gates — tests and run artifacts.
7. Completion report and `NEXT_ORG_DEV_1_PROMPT.md`.

## Acceptance matrix

| Requirement | Implementation/proof | Status |
|---|---|---|
| Visible-only scoring | `DraftCandidateVisibleInput`, conversion, scorer | complete |
| Versioned profiles | exported v1 profile contract and fallback | complete |
| Truthful breakdown/explanation | detailed selection result and tests | complete |
| Bounded identity | explicit bound plus fast-check property tests | complete |
| Determinism/order/no mutation | sim-core tests | complete |
| Both worker paths | worker draft suite, 14 targeted tests | complete |
| Save v35 unchanged | schema inspection/tests/report | complete |

## Progress log

- 2026-08-09: Read objective and supplied prompt. Confirmed no Git metadata, save v35, hidden-truth leak, and both worker call sites. Created source truth and plan. Next: run baseline tests.
- 2026-08-09: Restored frozen dependencies. Fixed profile API typing and visible scoring. Sim-core draft suite: 27 passed; sim-core full suite: 1,717 passed; worker draft suite: 14 passed; typechecks, determinism, build, and standalone smoke gate passed.
- 2026-08-09: Extracted the compact worker selector and added parity coverage. Final emitted core is `453,687` raw / `146,826` gzip: 3,017 raw bytes and 630 gzip bytes under the required 1 KB-headroom target. Full `pnpm verify`, determinism, quality, targeted tests, and source searches pass. Status GREEN.

## Decision log

- The absent `.git` directory is recorded as an environment limitation; no branch or commit is invented.
- Existing strategy differentiation is retained and reconciled rather than replaced with a second system.
- Explanations remain non-persisted because the active draft save shape is outside scope.

## Completion conditions

Targeted sim-core and worker tests, typechecks, full repository gates, determinism/quality checks, diff hygiene, fairness properties, completion report, and next-goal handoff are complete. ORG-DEV-1 remains deferred.
