# ORG-DEV-1 Fresh-Agent Handoff

Implement only `docs/codex/goals/06_ORG_DEV_1.md` in a fresh MBD checkout after ORG-DRAFT-1's test gates are green.

Consume the non-persisted `OrganizationDraftProfileV1` contract and `getOrganizationDraftProfile(teamId)` from `packages/sim-core/src/draft/draftAI.ts` / `draft/index.ts`. Treat `version: 1` as a compatibility boundary; do not change the profile mapping silently.

Identity may change only real development choices: focus, allocation, promotion posture, assignments, patience, and costed resources. It must not grant hidden information, growth multipliers, better rolls, budgets, or outcome bonuses. Use the same visible information and costs available to the user. Preserve save compatibility and seeded determinism, and prove no-runaway advantage with constructed and multi-season tests.

Before editing, re-read the live Goal 06 source seams, current save version, and the completed ORG-DRAFT-1 report. Stop if the profile contract is not actually stable or if development behavior would require a schema migration or free CPU advantage.
