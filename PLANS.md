# MBD Execution Plans

For every nontrivial Codex goal, create and maintain:

`docs/codex/runs/<SLICE_ID>/PLAN.md`

The plan is a living source-grounded artifact, not a pre-coding essay. Update it after each checkpoint.

## Required plan sections

1. **Objective and player outcome**
   - One sentence describing what becomes true for the player.
   - Link to the active goal file.

2. **Live source truth**
   - Repository root, branch/worktree, commit, dirty state.
   - Package manager and exact scripts from current package files.
   - Current save version.
   - Existing implementation/tests relevant to the goal.
   - Corrections to old handoff paths or assumptions.

3. **Scope and non-goals**
   - Exact production areas allowed.
   - Hard cut line.
   - Explicitly deferred adjacent work.

4. **Behavioral invariants**
   - Persistence, determinism, old-save, fairness, and UI invariants that apply.

5. **Design decision**
   - Chosen design and why it fits live source.
   - Alternatives rejected.
   - Migration/compatibility/rollback decision.

6. **Milestones**
   - Small ordered checkpoints, each with files and a proving command/test.
   - No milestone may claim completion without evidence.

7. **Acceptance matrix**
   - Requirement -> implementation location -> unit/integration/browser proof -> status.

8. **Progress log**
   - Timestamp or sequence, completed checkpoint, commands/results, next checkpoint, blockers.

9. **Decision log**
   - Material source discoveries and scope decisions.

10. **Completion conditions**
    - Exact commands and observable behaviors required before the goal may stop.

## Planning rules

- Standing user authorization is canonical at
  `docs/codex/STANDING_USER_AUTHORITY.md`. Plans must not create a
  permission-only stop; record the technically safest bounded decision and
  continue. Product contradictions and failed gates remain real stop
  conditions for the affected candidate. When a distinct bounded successor is
  technically safe, give it a fresh identity and explicit gates/retry budget
  and continue without reopening user permission.
- Plan mode may inspect and write plan/docs, but should not edit production code until source truth and design are recorded.
- If source contradicts the goal, write the contradiction and stop instead of forcing the requested architecture.
- Keep the plan concise enough to remain useful during the run.
