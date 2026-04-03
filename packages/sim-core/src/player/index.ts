export {
  toDisplayRating,
  toInternalRating,
  toLetterGrade,
  hitterOverall,
  pitcherOverall,
  clampRating,
  RATING_MIN,
  RATING_MAX,
  DISPLAY_MIN,
  DISPLAY_MAX,
  GRADE_THRESHOLDS,
  HITTER_WEIGHTS,
  PITCHER_WEIGHTS,
} from './attributes.js';
export type {
  HitterAttributes,
  PitcherAttributes,
  LetterGrade,
} from './attributes.js';

export {
  generatePlayer,
  generateTeamRoster,
  generateLeaguePlayers,
  HITTER_POSITIONS,
  PITCHER_POSITIONS,
  ALL_POSITIONS,
  ROSTER_LEVELS,
  DEV_PHASES,
} from './generation.js';
export type {
  Position,
  RosterLevel,
  DevPhase,
  DevelopmentProgram,
  DevelopmentTrajectory,
  NoTradeClauseType,
  DeferredMoneyInstallment,
  ExtensionHistoryEntry,
  GeneratedPlayer,
} from './generation.js';

export {
  PERSONALITY_TRAITS,
  POSITIVE_CHEMISTRY_TRAITS,
  NEGATIVE_CHEMISTRY_TRAITS,
  CLUBHOUSE_LEADER_TRAITS,
  PLAYOFF_COMPOSURE_TRAITS,
  VOLATILE_PERFORMANCE_TRAITS,
  assignPersonalityTraits,
  deriveDeterministicPersonalityTraits,
  calculatePlayoffComposureModifier,
  countMatchingTraits,
} from './personalityTraits.js';

export {
  COACH_ROLES,
  COACH_SPECIALTIES,
  calculateCoachMarketValue,
  calculateCoachingPayroll,
  calculateStaffBudget,
  fireCoach,
  generateCoachFreeAgents,
  generateCoachingStaff,
  getCoachSpecialtyForPosition,
  getCoachingDevelopmentModifier,
  hireCoach,
} from './coaching.js';
export type {
  CoachRole,
  CoachSpecialty,
  Coach,
} from './coaching.js';

export {
  getBreakoutProbability,
  getPositionConversionTargets,
  initializePlayerDevelopmentProfile,
  reconcileDevelopmentPipeline,
  runMonthlyDevelopmentCheckpoint,
} from './developmentPipeline.js';

// Development
export {
  developPlayer,
  developAllPlayers,
  updateDevPhase,
  shouldRetire,
  growMentalToughness,
} from './development.js';
export type { DevProgram } from './development.js';

// Injuries
export {
  checkInjury,
  advanceInjury,
  getInjuryMultiplier,
  generateInjury,
  describeInjury,
  processInjuries,
} from './injury.js';
export type {
  InjuryType,
  InjurySeverity,
  Injury,
} from './injury.js';

export {
  detectProspectBreakouts,
} from './breakouts.js';
export type {
  BreakoutEvent,
} from './breakouts.js';
