import type { Difficulty, PlayMode } from '@mbd/contracts';
import {
  GameRNG,
  TEAMS,
  assignGMPersonality,
  backfillLegacyRecordBook,
  buildDayOneOrgReview,
  buildDayOneTeamCard,
  buildRosterState,
  createRelationshipMap,
  createSeasonState,
  createFrontOfficeState,
  createOwnerState,
  frontOfficeTradeModifier,
  generateCoachFreeAgents,
  generateCoachingStaff,
  generateLeaguePlayers,
  generateSchedule,
  generateScoutingStaff,
  getTeamBudget,
  getTeamById,
  initializeGMCareer,
  initializePlayerDevelopmentProfile,
  seedHistoricalRivalries,
  toDisplayRating,
} from '@mbd/sim-core';
import {
  createDefaultFanSentiment,
  createEmptyJobMarket,
  createEmptyMonthlyPulseState,
} from './sim.worker.state.js';
import {
  createEmptyDraftState,
  createEmptyInternationalScoutingState,
  createEmptyMinorLeagueState,
  createEmptyTradeState,
  ensurePlayersHaveRule5Eligibility,
} from './sim.worker.helpers.js';
import type { FullGameState } from './sim.worker.helpers.js';
import {
  createDefaultFranchiseState,
  createEmptyAchievementState,
  createEmptyCeremonyState,
} from './sim.worker.ceremony.js';
import {
  difficultyAdjustValue,
  getDifficultyAdjustedBudget,
  getDifficultyProfileForState,
} from './sim.worker.budget.js';

// Re-exported from ./sim.worker.budget.js so existing consumers
// (actions, narrative, onboarding, queries) keep importing from setup.ts
// while helpers.ts can pull these directly from budget.ts to break the
// helpers ↔ setup runtime cycle.
export {
  DIFFICULTY_PROFILES,
  getDifficultyAdjustedBudget,
  getDifficultyProfileForState,
  getTeamFreeAgencyAppealScore,
  getTeamIFABonusPool,
  getTeamPayrollCap,
} from './sim.worker.budget.js';

export interface NewGameOptions {
  seed: number;
  userTeamId: string;
  gmName: string;
  difficulty: Difficulty;
  saveSlot: number;
  playMode?: PlayMode;
  scenarioId?: string;
  dayOneExperience?: 'full' | 'quick';
}

export interface SetupPreview {
  teamId: string;
  teamName: string;
  division: string;
  archetype: string;
  franchiseHook: string;
  whyNow: string;
  marketSize: 'large' | 'medium' | 'small';
  timeline: string;
  payrollTier: string;
  farmSystemRating: string;
  strengths: string[];
  weaknesses: string[];
  teamIdentityBlurb: string;
  projectedRecord: string;
  topPlayers: Array<{
    playerId: string;
    name: string;
    position: string;
    overall: number;
  }>;
  divisionRivals: Array<{
    teamId: string;
    teamName: string;
  }>;
}

export function getDifficultyAdjustedTradeFairness(
  state: Pick<FullGameState, 'franchise' | 'userTeamId'> & Partial<Pick<FullGameState, 'frontOfficeState'>>,
  fairness: number,
  fromTeamId: string,
  toTeamId: string,
): number {
  if (fromTeamId !== state.userTeamId && toTeamId !== state.userTeamId) {
    return fairness;
  }

  return Math.max(
    -100,
    Math.min(
      100,
      fairness
        + getDifficultyProfileForState(state).tradeBias
        + getTeamTradeReputationModifier(state, state.userTeamId),
    ),
  );
}

export function getDifficultyAdjustedCompetitiveAav(
  state: Pick<FullGameState, 'franchise'>,
  annualSalary: number,
): number {
  return Math.round(annualSalary * getDifficultyProfileForState(state).aiCompetitiveBidMultiplier * 100) / 100;
}

export function getTeamStaffBudget(
  state: Pick<FullGameState, 'franchise' | 'userTeamId'> & Partial<Pick<FullGameState, 'ownerState'>>,
  teamId: string,
): number {
  const value = state.ownerState?.get(teamId)?.staffBudget ?? Math.max(7.5, getDifficultyAdjustedBudget(state, teamId) * 0.0525);
  return difficultyAdjustValue(state, teamId, value);
}

export function getTeamTradeReputationModifier(
  state: Partial<Pick<FullGameState, 'frontOfficeState'>>,
  teamId: string,
): number {
  return frontOfficeTradeModifier(state.frontOfficeState?.get(teamId)?.reputation ?? 50);
}

function payrollTierForBudget(budget: number): string {
  if (budget >= 250) {
    return 'Premier';
  }
  if (budget >= 200) {
    return 'Competitive';
  }
  return 'Lean';
}

function farmSystemRatingForPlayers(players: FullGameState['players'], teamId: string): string {
  const topMinors = players
    .filter((player) => player.teamId === teamId && player.rosterStatus !== 'MLB')
    .sort((left, right) => right.overallRating - left.overallRating)
    .slice(0, 8);
  const average = topMinors.length > 0
    ? topMinors.reduce((sum, player) => sum + toDisplayRating(player.overallRating), 0) / topMinors.length
    : 40;

  if (average >= 68) {
    return 'A';
  }
  if (average >= 61) {
    return 'B+';
  }
  if (average >= 55) {
    return 'B';
  }
  if (average >= 49) {
    return 'C+';
  }
  return 'C';
}

function projectedWinsForPlayers(players: FullGameState['players'], teamId: string): number {
  const mlbByTeam = new Map<string, number[]>();
  for (const player of players) {
    if (player.rosterStatus !== 'MLB') {
      continue;
    }
    const current = mlbByTeam.get(player.teamId) ?? [];
    current.push(toDisplayRating(player.overallRating));
    mlbByTeam.set(player.teamId, current);
  }

  const teamScores = Array.from(mlbByTeam.entries()).map(([entryTeamId, ratings]) => ({
    teamId: entryTeamId,
    score: ratings
      .sort((left, right) => right - left)
      .slice(0, 26)
      .reduce((sum, value) => sum + value, 0),
  }));
  const leagueAverage = teamScores.reduce((sum, entry) => sum + entry.score, 0) / Math.max(1, teamScores.length);
  const teamScore = teamScores.find((entry) => entry.teamId === teamId)?.score ?? leagueAverage;
  return Math.max(58, Math.min(104, Math.round(81 + ((teamScore - leagueAverage) / 12))));
}

function teamIdentityBlurb(teamId: string, payrollTier: string, farmSystemRating: string): string {
  const team = getTeamById(teamId);
  const marketLine = payrollTier === 'Premier'
    ? 'big-market expectations and little patience for a slow burn'
    : payrollTier === 'Competitive'
      ? 'enough payroll room to push while still needing smart decisions'
      : 'a thinner budget that rewards patience and development';
  const pipelineLine = farmSystemRating.startsWith('A')
    ? 'The farm can carry aggressive long-term bets.'
    : farmSystemRating.startsWith('B')
      ? 'There is enough prospect depth to support a balanced build.'
      : 'The system needs work, so every development win matters.';
  return `${team?.city ?? teamId.toUpperCase()} enters with ${marketLine}. ${pipelineLine}`;
}

function createInitialDayOneState(
  experience: 'full' | 'quick',
  bypassDayOne: boolean,
) {
  if (bypassDayOne) {
    return {
      experience: 'quick' as const,
      status: 'complete' as const,
      currentStep: 'complete' as const,
      selectedAGMId: null,
      seasonGoal: null,
      budgetAllocation: null,
      developmentStyle: null,
      promotionStance: null,
      openingDayPlan: null,
      crisisType: null,
      crisisResponseId: null,
      quickStartRecapSeen: true,
    };
  }

  return {
    experience,
    status: 'in_progress' as const,
    currentStep: experience === 'full' ? 'owner_intro' as const : 'agm_select' as const,
    selectedAGMId: null,
    seasonGoal: null,
    budgetAllocation: null,
    developmentStyle: null,
    promotionStance: null,
    openingDayPlan: null,
    crisisType: null,
    crisisResponseId: null,
    quickStartRecapSeen: false,
  };
}

export function buildNewGameState(options: NewGameOptions): FullGameState {
  const rng = new GameRNG(options.seed);
  const teamIds = TEAMS.map((team) => team.id);
  const developmentRng = new GameRNG(options.seed + 10_001);
  const coachingRng = new GameRNG(options.seed + 20_001);
  const coachPoolRng = new GameRNG(options.seed + 30_001);
  const players = generateLeaguePlayers(rng.fork(), teamIds)
    .map((player) => initializePlayerDevelopmentProfile(developmentRng.fork(), player));
  ensurePlayersHaveRule5Eligibility(players, 1);
  const schedule = generateSchedule(rng.fork());
  const seasonState = createSeasonState(1, teamIds);

  const serviceTime = new Map<string, number>();
  for (const player of players) {
    if (player.rosterStatus === 'MLB') {
      const yearsOfService = rng.nextInt(0, 8);
      serviceTime.set(player.id, yearsOfService);
      player.serviceTimeDays = yearsOfService * 172;
    }
  }

  const scoutingStaffs = new Map();
  const gmPersonalities = new Map();
  const coachingStaffs = new Map();
  const rosterStates = new Map();
  const ownerState = new Map();
  const frontOfficeState = new Map();
  for (const teamId of teamIds) {
    scoutingStaffs.set(teamId, generateScoutingStaff(rng.fork(), teamId));
    gmPersonalities.set(teamId, assignGMPersonality(rng.fork(), teamId));
    coachingStaffs.set(teamId, generateCoachingStaff(coachingRng.fork(), teamId));
    rosterStates.set(teamId, buildRosterState(teamId, players));
    ownerState.set(teamId, createOwnerState(teamId, getTeamBudget(teamId)));
    frontOfficeState.set(teamId, createFrontOfficeState(teamId));
  }

  const recordBook = backfillLegacyRecordBook({
    currentSeason: 1,
    franchiseTeamId: options.userTeamId,
    franchiseTimeline: [],
    seasonHistory: [],
    careerStats: [],
  });
  const playMode = options.playMode ?? 'standard';
  const bypassDayOne = playMode === 'scenario' || options.scenarioId != null;
  const dayOneExperience = options.dayOneExperience ?? 'full';
  const gmCareer = initializeGMCareer(new GameRNG(options.seed + 40_001), options.userTeamId, options.gmName, 1);

  return {
    rng,
    season: 1,
    day: 1,
    phase: 'preseason',
    players,
    schedule,
    seasonState,
    userTeamId: options.userTeamId,
    playoffBracket: null,
    injuries: new Map(),
    serviceTime,
    scoutingStaffs,
    gmPersonalities,
    coachingStaffs,
    coachFreeAgentPool: generateCoachFreeAgents(coachPoolRng),
    pendingExtensionNegotiations: new Map(),
    offseasonState: null,
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
    draftClass: null,
    freeAgencyMarket: null,
    news: [],
    rosterStates,
    internationalScoutingState: createEmptyInternationalScoutingState(1),
    draftState: createEmptyDraftState(),
    minorLeagueState: createEmptyMinorLeagueState(1),
    monthlyPulse: createEmptyMonthlyPulseState(),
    playerMorale: new Map(),
    teamChemistry: new Map(),
    ownerState,
    briefingQueue: [],
    storyFlags: new Map(),
    rivalries: seedHistoricalRivalries(new Map()),
    tickerFeed: [],
    playerMoments: new Map(),
    playerNicknames: new Map(),
    playerStoryArcs: [],
    prospectBonds: [],
    gmRelationships: createRelationshipMap(teamIds, options.userTeamId),
    leagueEvents: [],
    playerOrigins: new Map(),
    debutFlashbacks: [],
    awardHistory: [],
    hallOfFame: [],
    hallOfFameBallot: [],
    franchiseTimeline: [],
    careerStats: [],
    recordBook,
    recordWatch: [],
    seasonArchive: [],
    archivedSeasons: [],
    historicalPlayers: [],
    mentorRelationships: [],
    frontOfficeState,
    whatIfBranches: [],
    seasonHistory: [],
    gmCareer,
    jobMarket: createEmptyJobMarket(),
    consequenceWatchers: [],
    fanSentiment: createDefaultFanSentiment(1, 1),
    scoutConflicts: [],
    dynastyCards: [],
    challengeState: null,
    tradeState: createEmptyTradeState(),
    franchise: createDefaultFranchiseState(options.userTeamId, 1, 1, {
      gmName: options.gmName,
      difficulty: options.difficulty,
      playMode,
      onboarding: {
        welcomeBriefingSeen: bypassDayOne,
        firstMonthlyPulseSeen: false,
      },
      dayOne: createInitialDayOneState(dayOneExperience, bypassDayOne),
    }),
    ceremony: createEmptyCeremonyState(),
    achievements: createEmptyAchievementState(),
    performanceDiagnostics: {
      totalSeasons: 1,
      snapshotSizeBytes: 0,
    },
  };
}

export function buildSetupPreview(options: Pick<NewGameOptions, 'seed' | 'userTeamId' | 'difficulty'>): SetupPreview {
  const seededState = buildNewGameState({
    ...options,
    gmName: 'General Manager',
    saveSlot: 1,
  });
  const team = getTeamById(options.userTeamId);
  const payrollTier = payrollTierForBudget(getTeamBudget(options.userTeamId));
  const orgReview = buildDayOneOrgReview(seededState.players, options.userTeamId);
  const farmSystemRating = farmSystemRatingForPlayers(seededState.players, options.userTeamId);
  const projectedWins = orgReview.projectedWins || projectedWinsForPlayers(seededState.players, options.userTeamId);
  const topPlayers = seededState.players
    .filter((player) => player.teamId === options.userTeamId && player.rosterStatus === 'MLB')
    .sort((left, right) => right.overallRating - left.overallRating)
    .slice(0, 4)
    .map((player) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      overall: toDisplayRating(player.overallRating),
    }));
  const teamCard = buildDayOneTeamCard({
    teamId: options.userTeamId,
    teamName: team ? `${team.city} ${team.name}` : options.userTeamId.toUpperCase(),
    division: team?.division ?? 'UNKNOWN',
    payrollTier,
    farmSystemRating,
    projectedRecord: `${projectedWins}-${162 - projectedWins}`,
    strengths: orgReview.strengths,
    weaknesses: orgReview.weaknesses,
    teamIdentityBlurb: teamIdentityBlurb(options.userTeamId, payrollTier, farmSystemRating),
    topPlayers,
    divisionRivals: TEAMS
      .filter((entry) => entry.division === team?.division && entry.id !== options.userTeamId)
      .map((entry) => ({
        teamId: entry.id,
        teamName: `${entry.city} ${entry.name}`,
      })),
  });

  return {
    ...teamCard,
  };
}
