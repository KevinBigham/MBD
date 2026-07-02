---
name: mbd-review-slice
description: Adversarially review one completed MBD slice against its goal, plan, diff, tests, save compatibility, determinism, CPU fairness, browser proof, and scope. Use after implementation; do not broaden the feature.
---

# MBD Review Slice

1. Identify the active goal file, base branch, worktree diff, `PLAN.md`, `SOURCE_TRUTH.md`, and `COMPLETION.md`.
2. Read `docs/codex/REVIEW_STANDARD.md` and the nearest `AGENTS.md` files.
3. Explicitly spawn focused read-only subagents when useful:
   - persistence/save/migration reviewer;
   - determinism/CPU-fairness reviewer;
   - tests/browser/UX reviewer;
   - scope/architecture reviewer.
4. Review source, not just summaries. Reproduce critical commands or tests when possible.
5. Report findings by P0-P3 with exact paths, evidence, impact, and smallest fix. Call out missing proof and false claims.
6. Verify that every goal requirement maps to implementation and a proving test/runtime check.
7. Do not suggest unrelated features or repo-wide refactors.
8. End with one verdict: `BLOCK`, `FIX_AND_REVIEW`, or `MERGE_READY`, and list the exact remaining gate.
