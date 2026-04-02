/**
 * @module finance
 * Barrel export for the finance system: contracts, arbitration, payroll.
 */

export {
  // Constants
  LEAGUE_MINIMUM_SALARY,
  LUXURY_TAX_THRESHOLD,
  LUXURY_TAX_TIERS,
  PRE_ARB_MAX_YEARS,
  ARB_FIRST_YEAR,
  ARB_LAST_YEAR,
  ARB_MAX_BASE_SALARY,
  ARB_DIVISOR,
  ARB_YEAR_MULTIPLIERS,
  ARB_PERFORMANCE_VARIANCE,
  ARB_TEAM_WIN_PROBABILITY,
  MAX_CONTRACT_YEARS,
  NTC_RATING_THRESHOLD,
  PLAYER_OPTION_RATING_THRESHOLD,
  FUTURE_COMMITMENT_YEARS,
  TEAM_MARKETS,
  // Types (re-exported as values for runtime use where applicable)
  type MarketSize,
  type MarketConfig,
  type ContractDetail,
  type ArbitrationCase,
  type TeamPayroll,
  // Functions
  calculatePlayerValue,
  generateArbitrationCase,
  resolveArbitration,
  calculateTeamPayroll,
  calculateLuxuryTax,
  getTeamBudget,
  advanceContracts,
  generateContractOffer,
  getArbEligiblePlayers,
  serviceDaysToYears,
} from './contracts.js';
