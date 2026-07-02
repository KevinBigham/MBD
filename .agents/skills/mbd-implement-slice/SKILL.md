---
name: mbd-implement-slice
description: Implement exactly one Mr. Baseball Dynasty goal file with source reconciliation, a living plan, deterministic/save-safe coding, tests, browser proof, and a completion report. Use for MBD feature slices; do not use for broad backlog implementation.
---

# MBD Implement Slice

Input: one file under `docs/codex/goals/`.

1. Read the root and nearest `AGENTS.md`, `PLANS.md`, `docs/codex/CANONICAL_DIRECTION.md`, the selected goal, and only the relevant original handoff references named by that goal.
2. Inspect Git state and live source before edits. Create `docs/codex/runs/<SLICE_ID>/SOURCE_TRUTH.md` from the template.
3. For a complex slice, explicitly spawn up to three **read-only** subagents:
   - source mapper: find real implementation seams and stale assumptions;
   - test mapper: locate existing fixtures, harnesses, and missing acceptance proof;
   - risk reviewer: identify persistence, determinism, migration, fairness, and scope hazards.
   Wait for them and synthesize their findings. Do not let parallel agents edit overlapping production files.
4. Create `PLAN.md` from `PLANS.md`. Resolve source contradictions before coding. If a defined stop condition is met, write a blocker report and stop.
5. Implement one milestone at a time. Add or update tests alongside each milestone. Run the smallest proving command immediately.
6. Keep the progress and decision logs current. Record every path/assumption correction.
7. Run the goal's complete acceptance matrix, full repository gates, and real browser/reload checks where required.
8. Perform an adversarial self-review using `docs/codex/REVIEW_STANDARD.md`. For complex diffs, spawn read-only reviewers for persistence/data safety, determinism/fairness, and test/UX quality. Fix all P0/P1 findings and rerun gates.
9. Write `COMPLETION.md`: player outcome, changed files, requirement-to-path mapping, commands/results, browser proof, migrations, compatibility, rollback, deferred work, and remaining uncertainty.
10. Stop only when the goal's verifiable done state is satisfied or a documented stop condition blocks it.
