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
  SERVICE_TIME_DAYS_PER_YEAR,
  ARB_MAX_BASE_SALARY,
  ARB_DIVISOR,
  ARB_YEAR_MULTIPLIERS,
  ARB_PERFORMANCE_VARIANCE,
  ARB_TEAM_WIN_PROBABILITY,
  SUPER_TWO_COHORT_SHARE,
  ARB_ESCALATOR_PER_WIN,
  ARB_ESCALATOR_CAP,
  MAX_CONTRACT_YEARS,
  NTC_RATING_THRESHOLD,
  PLAYER_OPTION_RATING_THRESHOLD,
  FUTURE_COMMITMENT_YEARS,
  TEAM_MARKETS,
  // Types (re-exported as values for runtime use where applicable)
  type MarketSize,
  type MarketConfig,
  type ContractDetail,
  type ContractOffseasonAdvanceOutcome,
  type ContractOffseasonAdvanceResult,
  type ArbitrationCase,
  type HoldoutEvaluation,
  type TeamPayroll,
  type ExtensionTeamContext,
  type ExtensionContractTerms,
  type ExtensionWillingness,
  type NegotiationRound,
  type ExtensionNegotiationSession,
  type ExtensionResult,
  type TeamExtensionProcessResult,
  type ExtensionGmDecisionPolicy,
  // Functions
  calculatePlayerValue,
  advanceContractForOffseason,
  qualifiesForSuperTwo,
  generateArbitrationCase,
  evaluateHoldout,
  resolveArbitration,
  calculateTeamPayroll,
  calculateLuxuryTax,
  getTeamMarketConfig,
  getTeamBudget,
  advanceContracts,
  generateContractOffer,
  getArbEligiblePlayers,
  serviceDaysToYears,
  evaluateExtensionWillingness,
  calculateExtensionOffer,
  extensionNegotiationContractSignature,
  gmExtensionPriorityAdjustment,
  getExtensionGmDecisionPolicy,
  negotiateExtension,
  processTeamExtensions,
} from './contracts.js';

export {
  MARKET_REVENUE_ALLOCATION_FACTORS,
  MARKET_REVENUE_ATTENDANCE_LIMIT,
  MARKET_REVENUE_PLAYOFF_RATE,
  deriveMarketRevenueStatement,
  type MarketRevenueStatementInput,
  type MarketRevenueStatement,
} from './marketRevenue.js';

export {
  findComparableContracts,
  generateMarketReport,
  predictSigning,
  generateMarketSummary,
  type ComparableContract,
  type SigningPrediction,
  type MarketReportContext,
  type MarketReport,
  type MarketSummary,
} from './marketIntelligence.js';

export {
  OWNER_PAYROLL_FLOOR_RATIOS,
  deriveOwnerPayrollPolicy,
  resolveOwnerSoftCeiling,
  type OwnerPayrollBand,
  type OwnerPayrollTaxBand,
  type OwnerPayrollPolicyInput,
  type OwnerPayrollPolicy,
} from './ownerPayrollPressure.js';
