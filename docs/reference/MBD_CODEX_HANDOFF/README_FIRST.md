# MBD Codex 5.5 Execution System

This package converts the council archive and Claude Code handoff into a **Codex-native delivery system**.

The operating principle is:

> **One persistent `/goal` per vertical slice, one isolated worktree/branch, one verified stopping condition, one independent review.**

Do **not** ask Codex to implement the entire roadmap in one goal. `/goal` is strongest when the work is larger than one prompt but smaller than an open-ended backlog. MBD has multiple dependent systems, migrations, and overlapping worker files; combining them would increase regression risk and make rollback unclear.

## What to copy into the game repository

Copy the contents of `repo_overlay/` into the **actual Git repository root**. Merge rather than overwrite any existing `AGENTS.md`, `.codex/config.toml`, or project documentation.

Important locations after copying:

- `AGENTS.md` — durable project-wide Codex rules.
- `apps/web/AGENTS.md` — browser, persistence, reload, and UI rules.
- `packages/contracts/AGENTS.md` — save-schema and migration rules.
- `packages/sim-core/AGENTS.md` — determinism and CPU-fairness rules.
- `PLANS.md` — the living execution-plan format.
- `.agents/skills/mbd-implement-slice/SKILL.md` — reusable implementation workflow.
- `.agents/skills/mbd-review-slice/SKILL.md` — reusable adversarial review workflow.
- `docs/codex/PROGRAM.md` — the corrected implementation sequence.
- `docs/codex/goals/` — one source-grounded goal contract per slice.

Keep the original `MBD_CODEX_HANDOFF/` folder in the workspace as **reference material**, preferably under `docs/reference/MBD_CODEX_HANDOFF/`. Do not make Codex read it all by default.

## Exact launch sequence for the first slice

Open Codex in the real repository root, select GPT-5.5, and use a fresh isolated worktree/thread.

### 1. Plan

Paste the contents of `copy_paste/00_PLAN_TRUST_A.txt`.

### 2. Start the persistent goal

After Codex has source-grounded the plan, paste `copy_paste/01_GOAL_TRUST_A.txt`.

### 3. Review

After the goal completes, run `/review` using `copy_paste/02_REVIEW_COMPLETED_SLICE.txt` as the custom instructions, or explicitly invoke `$mbd-review-slice`.

### 4. Repair review findings

Paste `copy_paste/03_FIX_REVIEW_FINDINGS.txt` in the same worktree. Re-run the entire acceptance gate before merging.

### 5. Move to the next goal

Merge only after review is clean. Start a **new worktree and new Codex thread** for the next goal. Follow `docs/codex/PROGRAM.md`.

## The corrected sequence

1. `TRUST-A` — exact snapshot persistence, truthful save state, reload proof.
2. `MEMORY-0` — one factual event spine and honest old-save coverage.
3. `PROSPECT-1` — First Homegrown Star vertical slice.
4. `ORG-DRAFT-1` — bounded, deterministic CPU draft identity.
5. `TRUST-QW` — isolated trust and clarity quick wins; may run in parallel after TRUST-A.
6. `ORG-DEV-1` — CPU development symmetry.
7. `ORG-TRADE-1` — CPU trade style within fairness bounds.
8. `ORG-MARKET-1` — CPU free-agent and payroll style within real budgets.
9. `MEMORY-ERAS-1` — derived eras and rivalry origins.
10. `OLDSAVE-MINORS-1` — opt-in, non-destructive old-save enrichment; last.

## Why this is better than a single mega-prompt

The source tree, save version, and existing fixes may differ from the June audit. Each goal therefore begins with source reconciliation and writes its own live plan. The rules live in `AGENTS.md`; repeatable execution lives in Skills; detailed work lives in a goal file; validation lives in the plan and goal. This keeps prompts short while preserving heavy documentation.

## Best original handoff material

The strongest original files remain valuable as references:

- `06_CANONICAL_PRODUCT_AND_ENGINEERING_DIRECTION.md`
- `04_COUNCIL_DECISION_LEDGER.csv`
- `08_TRACEABILITY_MATRIX.csv`
- `09_RELEASE_AND_VALIDATION_GATES.md`
- `starter_pack/test_matrix.md`
- `starter_pack/deterministic_scenarios.json`
- `starter_pack/playwright_reload_spec.md`
- `starter_pack/REVIEW_CHECKLIST.md`
- the `next_slice_packets/` files as design inputs

See `CURATION_AND_ADJUSTMENTS.md` for what was changed and why.
