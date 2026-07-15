/**
 * @module draft
 * Barrel export for the draft system: prospect generation, AI selection, and full draft simulation.
 */

export type { DraftProspect, DraftClass, DraftProspectBackground } from './draftPool.js';
export {
  generateDraftClass,
  rankProspects,
  DRAFT_CLASS_SIZE,
  DRAFT_ROUNDS,
  NUM_TEAMS,
} from './draftPool.js';

export type { DraftPick, DraftResult } from './draftAI.js';
export {
  determineDraftOrder,
  aiSelectPick,
  evaluateTeamNeeds,
  simulateFullDraft,
} from './draftAI.js';

export type { DraftScoutingReport } from './draftScouting.js';
export { scoutDraftProspect } from './draftScouting.js';

export type { DraftSigningOutcome } from './draftSigning.js';
export { resolveDraftSigning } from './draftSigning.js';

export type {
  DraftPickOwnership,
  DraftPickDescriptor,
  DraftCompensatoryPick,
  DraftCompensatoryPickAward,
  DraftCompensationPlan,
  DraftPickSlot,
} from './draftPicks.js';
export {
  PROTECTED_TOP_TEN_PICK_COUNT,
  createDefaultDraftPickOwnership,
  tradeDraftPickOwnership,
  awardCompensatoryPick,
  forfeitHighestEligiblePick,
  planDraftPickCompensation,
  buildDraftPickSlots,
} from './draftPicks.js';
