# ORG-DRAFT-1 Source Truth

## Repository and execution state

- Repository root: `/Users/tkevinbigham/Downloads/MBD-main 2`
- Git metadata: absent in this checkout; branch, HEAD, and dirty state cannot be verified.
- Package manager: pnpm 9.15.4 (`packageManager` in root `package.json`).
- Node: v24.13.1.
- Current save schema: v35 (`packages/contracts/src/schemas/save.ts`).
- No production dependency is required or authorized for this slice.

## Live implementation seams

- Draft policy: `packages/sim-core/src/draft/draftAI.ts`.
- Compact worker selector: `packages/sim-core/src/draft/draftWorker.ts`.
- Draft public shape: `packages/sim-core/src/draft/draftPool.ts`.
- Sim-core barrel: `packages/sim-core/src/draft/index.ts`.
- Draft tests: `packages/sim-core/tests/draft.test.ts`.
- Interactive worker path: `advanceDraftToUserTurn()` in `apps/web/src/workers/sim.worker.helpers.ts`.
- Simulate-remainder worker path: `simulateRemainingDraftSession()` in `apps/web/src/workers/sim.worker.helpers.ts`.

## Corrections to prior status claims

- Existing organization identity is partial and keyed to stable team IDs.
- The public policy now consumes a visible candidate contract; the compact worker selector uses the same visible fields and keeps roster ratings isolated to team-need calculation.
- The worker selector and public policy have an explicit parity test across three teams and seeds.
- Existing candidate ordering is stabilized by player ID before seeded tiebreakers; this behavior must remain deterministic.
- Both worker draft paths call the compact `aiSelectPick` policy exported through the canonical draft barrel.

## Legal visible candidate information

The existing `DraftProspect` exposes perceived/consensus draft-board fields alongside the full generated player. The corrected identity scorer may use only this audited view:

- permanent player ID;
- position;
- draft age/background;
- scouting grade;
- signability and commitment strength;
- consensus rank;
- projected draft round;
- position rank.

Roster need remains a separately computed team context. True player ratings, ceiling, potential, future outcomes, and hidden scouting truth are excluded structurally from the scorer input.

## Compatibility decision

The organization profile is a version-1 derived contract and is not persisted. Existing saves remain v35 with no migration. A future profile consumer must explicitly handle version 1; changing derived mappings later requires a compatibility decision before extending the profile into development or other domains.
