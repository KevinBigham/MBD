# Plan — ECON-MILESTONE-PATH-PERF-1

## Objective and player outcome

The exact long-save simulation reaches career-milestone production work with
less redundant name-resolution cost while players receive the same events and
ceremonies. See [Goal 31](../../goals/31_ECON_MILESTONE_PATH_PERF_1.md).

## Live source truth

See `SOURCE_TRUTH.md`. Root commands: `pnpm test`, `pnpm typecheck`,
`pnpm build`, and `pnpm verify:determinism`; only focused tests/typecheck/build/
bundle are permitted before this source freeze. Save v35 and Dexie v6 are
confirmed. The source modules are the two independent consumers listed there.

## Scope and non-goals

Allowed source is exactly milestones, ceremony, their adjacent tests, and Goal
31/run docs. No sim-core, schemas, APIs, UI, dependencies, Goal-18 harnesses,
or retained Goal-30 worktree state. Raw proof data remains untracked outside
this repository. This is a `HEAVY` bounded prerequisite with 0/2 correction
loops consumed.

## Behavioral invariants

The worker remains canonical; state, raw RNG, save/export/round-trip, history,
rows, subdomain/content digests, player/team/roster facts, and public surface
remain exact. Original player order and duplicates remain exact. CPU and user
rules are unchanged. No save mutation or browser interaction is touched.

## Design decision

Each consumer performs an empty-player canonical eligibility probe, returns
early when none qualify, derives membership IDs, retains qualifying original
rows in original order, then makes its final canonical call against that array.
This removes irrelevant display-name scans without encoding threshold policy or
sharing work across consumers. A separate full-width mutant confirms the bound.
No migration is needed; rollback is reverting the eventual source-freeze commit.

## Milestones

1. Docs-first: create Goal/run source truth, plan, and architecture gate; commit
   separately. **Status: in progress.**
2. Milestone consumer: implement frozen probe/narrow/final-call algorithm and
   add exact structural/semantic tests. Prove with its focused Vitest file.
3. Ceremony consumer: implement independently and add queue exactness tests.
   Prove with its focused Vitest file.
4. Run both negative controls, restore source, then focused typecheck/build and
   bundle evidence.
5. Validate retained provenance; compose a new disposable runtime; execute the
   one warm-up, C1–C3, V8 C1–C3, and exactly one forecast sequence.
6. Update documents with literal commands/hashes/results and commit source/
   tests/docs as source freeze only if every frozen gate passes.

## Acceptance matrix

| Requirement | Location | Proof | Status |
| --- | --- | --- | --- |
| Probe and order-preserving narrowing | two worker consumers | adjacent structural tests | pending |
| Exact event/moment behavior | two worker consumers | controlled JSON/state/RNG fixtures | pending |
| Full-width mutants fail | temporary disposable edits | two failing focused tests then restored | pending |
| No schema/API/bundle regression | unchanged boundaries | typecheck/build/bundle | pending |
| Late-state semantic and timing bands | disposable runtime | C1–C3/V8 receipts | pending |
| Forecast cap | disposable runtime | one primary, conditional continuation | pending |

## Progress log

1. Verified exact clean base, scripts, v35, Dexie v6, source hashes, and live
   consumer seams. Began docs-first artifact; no production edit has occurred.

## Decision log

1. The Sol route is the authoritative architecture freeze. The missing standalone
   Goal-28 file is a source correction, not a blocker because its dependent
   contract is documented by Goals 29/30 and the route.
2. Separate adjacent tests are necessary because clean main has no tests for
   either consumer and the scope prohibits widening a shared module.

## Completion conditions

Only source-freeze work may complete here: all frozen focused/semantic,
negative-control, provenance, C1–C3, V8, build/bundle, and one forecast gate
must be recorded. Full repository gates, Sol final review, and landing are
explicitly deferred to later owners.
