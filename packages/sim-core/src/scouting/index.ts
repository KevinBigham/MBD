/**
 * @module scouting
 * Barrel export for the scouting system.
 */

export {
  // Types
  type ScoutBias,
  type Scout,
  type ScoutReport,

  // Functions
  generateScout,
  generateScoutingStaff,
  scoutPlayer,
  combineReports,
  getTeamScoutingAccuracy,
  generateScoutNotes,
} from './scoutingEngine.js';

export {
  DEFAULT_IFA_BONUS_POOL,
  IFA_POOL_MIN,
  IFA_POOL_MAX,
  scoutQualityToAccuracy,
  getInternationalScoutAccuracy,
  generateIFAPool,
  createInternationalScoutingState,
  getAvailableIFAProspects,
  getRemainingIFABudget,
  scoutIFAProspect,
  tradeIFABonusPool,
  convertIFAProspectToPlayer,
  signIFAProspect,
} from './international.js';
export type {
  InternationalRegion,
  InternationalNationality,
  IFAProspectStatus,
  InternationalProspect,
  IFATeamBudget,
  InternationalScoutingReport,
  IFAScoutingHistoryEntry,
  InternationalScoutingState,
  SignIFAProspectResult,
} from './international.js';
