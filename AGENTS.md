# Mr. Baseball Dynasty — Agent Instructions

## Mission

Build MBD as a trustworthy, deterministic, approachable long-save baseball dynasty game. Prefer complete causal loops over more screens:

`choice -> mutation -> durable save -> visible consequence -> permanent memory`

## Source truth and scope

- Kevin's canonical standing authorization is recorded in
  `docs/codex/STANDING_USER_AUTHORITY.md`. Do not pause solely to request user
  permission for bounded GOAT-campaign work; choose the narrowest
  source-grounded action and continue. When a bounded verification route
  correctly exhausts, preserve it and freeze a distinct smallest successor
  under that standing authority instead of requesting another permission-only
  oracle. Technical gates, explicit retry budgets, and safety invariants remain
  mandatory.
- Current repository source, tests, schemas, runtime behavior, and git state outrank every audit or council document.
- Implement exactly one file from `docs/codex/goals/` per branch/worktree.
- Read the goal, inspect the live source, and create a living plan before production edits.
- Treat paths, line numbers, save versions, and “already fixed” claims in older documents as unverified until checked.
- Preserve all pre-existing work. Never run destructive Git commands (`reset --hard`, `clean`, force checkout, force push) or delete untracked user files.
- Do not silently expand scope. Record adjacent work in the run report.

## Required work loop

1. Record branch, commit, dirty state, package manager, scripts, current save version, and baseline results.
2. Map the real source seams and existing tests for the active goal.
3. Update `docs/codex/runs/<SLICE_ID>/PLAN.md` using `PLANS.md`.
4. Implement in checkpoints with tests alongside the change.
5. Run targeted tests after each checkpoint and full gates before completion.
6. Use browser/reload proof for every high-emotion mutation.
7. Review the final diff adversarially before declaring done.
8. Write `docs/codex/runs/<SLICE_ID>/COMPLETION.md` with changed files, requirement mapping, commands/results, unresolved risks, and rollback.

## Engineering invariants

### Persistence and trust

- Worker mutation success is not save success.
- Bind each accepted mutation to the exact post-mutation snapshot and intended save ID.
- Durable writes must be ordered; an older completion may never overwrite newer state.
- Retry persistence only. Never rerun a gameplay mutation to repair a failed save.
- `Saved` is permitted only after the latest desired snapshot is durable.
- No-op/rejected actions must not create dirty/saving state.
- Every high-emotion lane touched must have a hard-reload test.

### Determinism

- Use the repository's seeded RNG and deterministic ordering.
- Never add `Math.random()` or wall-clock/UUID values to simulation truth or deterministic event IDs.
- Preserve same-seed behavior unless the active goal explicitly changes a tested decision policy.

### Saves and history

- Confirm the live save version before any schema work.
- Every schema change requires an additive migration, fixtures, old/deep-save coverage, import/export round-trip, reload proof, and rollback behavior.
- Never fabricate old-save history or silently replace existing players.
- Store factual events; derive eras, salience, reputation, and narrative summaries on read unless the goal explicitly proves a persisted fact is required.

### CPU organizations

- No hidden ratings, outcome bonuses, free budget, privileged scouting truth, or uncosted advantages.
- Organization identity changes preferences and choices within tested fairness bounds.
- User and CPU mechanisms must be symmetric where the feature claims symmetry.

### Architecture

- Extend existing routes and contracts before adding new ones.
- Refactor only the boundary required by the active goal.
- Do not perform repo-wide worker decomposition or cleanup while shipping a player-facing slice.
- Avoid new production dependencies unless source inspection proves they are necessary.

## Validation

Read commands from the current `package.json`; do not trust stale command lists. At minimum, preserve the repository equivalents of:

- typecheck
- targeted tests
- full tests
- production build
- deterministic verification
- browser/reload acceptance for the active goal

Do not claim a command passed unless it was run in the current worktree and its result was observed.

## Stop conditions

Pause with a precise technical blocker report—not a permission request—when:

- the goal contradicts live source;
- a required schema migration cannot be fully covered;
- deterministic or old-save safety cannot be proven;
- required browser infrastructure is absent and adding it would exceed scope;
- the goal requires another unmerged slice;
- completing the work would cross the goal's scope cut line.

A pause terminates the unsafe candidate, not the campaign's standing authority.
When a safe, newly identified, bounded successor exists, record its identity,
scope, gates, and retry budget and continue without waiting for another user
permission message.
