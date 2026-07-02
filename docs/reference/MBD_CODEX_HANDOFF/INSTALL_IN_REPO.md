# Install in the MBD Repository

1. Locate the actual Git root Codex will modify.
2. Keep the original Claude Code handoff under `docs/reference/MBD_CODEX_HANDOFF/` or outside the repo.
3. Copy the **contents** of `repo_overlay/` into the Git root.
4. If any destination file already exists, merge it manually; do not overwrite project-specific rules.
5. Confirm the repo now contains:
   - `AGENTS.md`
   - `PLANS.md`
   - `.agents/skills/mbd-implement-slice/SKILL.md`
   - `.agents/skills/mbd-review-slice/SKILL.md`
   - `docs/codex/PROGRAM.md`
   - `docs/codex/goals/01_TRUST_A.md`
6. Merge `[features] goals = true` into `.codex/config.toml`, or enable goals from Codex if already configured.
7. Restart Codex if the new skills do not appear.
8. Open a fresh worktree/thread at the repo root and use `copy_paste/00_PLAN_TRUST_A.txt`.

Do not copy machine-specific absolute paths or assume the handoff's v33/v34 source state is still current.
