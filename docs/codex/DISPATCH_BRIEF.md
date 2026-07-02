# MBD Dispatch Brief — pick up from your phone

Paste this (or just reference it) in your Dispatch thread to restore context instantly.

## Where things stand
- Repo: `~/Downloads/MBD-main` (the LIVE repo — branch `codex/mbd-ui-ux-ootp-overhaul`). NOT `~/MBD-main` (stale May 18 copy).
- Installed & committed (`efc58f0`): the **MBD Codex 5.5 Execution System** — layered `AGENTS.md`, `PLANS.md`, `.codex/config.toml` (`goals = true`), the `mbd-implement-slice` / `mbd-review-slice` skills, and `docs/codex/` with the 10 goal files.
- Original handoff archived (research-only) at `docs/reference/MBD_CODEX_HANDOFF/`.

## Active work: TRUST-A (slice 1 of 10)
- `/plan` was run in Codex (desktop app) and produced a source-grounded plan: confirmed schema **v34**, seam = main-thread persistence coordinator (no worker proxy / no schema migration), preserves dirty WIP.
- NEXT ACTION: in Codex, click **"Yes, implement this plan"** (this writes `docs/codex/runs/TRUST-A/SOURCE_TRUTH.md` + `PLAN.md` and begins implementation). Do NOT paste the standalone `/goal` prompt in that same thread.
- Right after approving, paste this to lock in goal-grade finish criteria:
  > As you implement, also: perform an adversarial self-review pass, fix all P0/P1 findings, and write docs/codex/runs/TRUST-A/COMPLETION.md. Do not broaden scope beyond 01_TRUST_A.md. Stop only when the goal's done-state is proven or a documented stop condition blocks safe completion.
- After it finishes: run the `/review` prompt (in `copy_paste/02_REVIEW_COMPLETED_SLICE.txt`), fix every P0/P1, rerun full gates, merge.

## Canonical slice order (sequential; each in a fresh worktree/thread)
TRUST-A → MEMORY-0 → PROSPECT-1 → ORG-DRAFT-1 → TRUST-QW → ORG-DEV-1 → ORG-TRADE-1 → ORG-MARKET-1 → MEMORY-ERAS-1 → OLDSAVE-MINORS-1
(TRUST-QW may run in a 2nd worktree once TRUST-A is merged; keep the rest sequential.)

## Reusable prompts
All paste-ready prompts are in `MBD_CODEX_5_5_EXECUTION_SYSTEM/copy_paste/` (also in the zip):
`00_PLAN_TRUST_A`, `01_GOAL_TRUST_A`, `02_REVIEW_COMPLETED_SLICE`, `03_FIX_REVIEW_FINDINGS`, `04_START_NEXT_GOAL_TEMPLATE` (swap in the next goal file).
