/**
 * Worker queries for the Onboarding Wizard.
 * Generates assessment data from current game state and produces
 * the full onboarding script with AGM dialogue.
 */
import {
  GameRNG,
  LUXURY_TAX_THRESHOLD,
  TEAM_MARKETS,
  TEAMS,
  assessFarmSystem,
  assessRoster,
  evaluateCoachingStaff,
  generateFinancialPlaybook,
  generateFullOnboardingScript,
  generateOnboardingPressConference,
  generateOwnerMeeting,
  generateScoutingBriefing,
  generateSeasonStrategy,
  getTeamBudget,
  getTeamById,
} from '@mbd/sim-core';
import type {
  AllChapterData,
  GMPhilosophy,
  OnboardingScript,
} from '@mbd/sim-core';
import {
  createStableWorkerRng,
  requireState,
} from './sim.worker.helpers.js';
import { getDifficultyAdjustedBudget, getTeamStaffBudget } from './sim.worker.setup.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface OnboardingData {
  script: OnboardingScript;
  chapterData: AllChapterData;
}

// ---------------------------------------------------------------------------
// Assessment data assembly
// ---------------------------------------------------------------------------

function buildAllChapterData(rng: GameRNG): AllChapterData {
  const s = requireState();
  const teamId = s.userTeamId;
  const team = getTeamById(teamId);
  const teamName = team ? `${team.city} ${team.name}` : teamId.toUpperCase();
  const coaches = s.coachingStaffs.get(teamId) ?? [];
  const ownerS = s.ownerState.get(teamId);
  const budget = getDifficultyAdjustedBudget(s, teamId);
  const staffBudget = getTeamStaffBudget(s, teamId);
  const divisionRivalIds = TEAMS
    .filter((t) => t.division === team?.division && t.id !== teamId)
    .map((t) => t.id);

  // Build all-team roster map for scouting briefing
  const allTeamRosters = new Map<string, typeof s.players>();
  for (const t of TEAMS) {
    allTeamRosters.set(
      t.id,
      s.players.filter((p) => p.teamId === t.id && p.rosterStatus === 'MLB'),
    );
  }

  // Minor league players for farm assessment
  const minorLeaguePlayers = s.players.filter(
    (p) => p.teamId === teamId && p.rosterStatus !== 'MLB',
  );

  // 1. Owner meeting
  const owner = generateOwnerMeeting(rng.fork(), {
    teamId,
    teamName,
    gmName: s.franchise.gmName,
    ownerPatience: ownerS?.patience ?? 50,
    ownerConfidence: ownerS?.confidence ?? 50,
    marketSize: TEAM_MARKETS[teamId]?.size ?? 'medium',
    payroll: s.players
      .filter((p) => p.teamId === teamId && p.rosterStatus === 'MLB')
      .reduce((sum, p) => sum + (p.contract?.annualSalary ?? 0), 0),
    budget,
    luxuryTaxThreshold: LUXURY_TAX_THRESHOLD,
    lastSeasonWins: null,
    lastSeasonPlayoffResult: null,
    divisionRivals: divisionRivalIds,
    difficulty: s.franchise.difficulty,
  });

  // 2. Roster assessment
  const roster = assessRoster(rng.fork(), s.players, teamId);

  // 3. Farm assessment
  const farm = assessFarmSystem(rng.fork(), minorLeaguePlayers, coaches);

  // 4. Staff evaluation
  const staff = evaluateCoachingStaff(coaches, staffBudget);

  // 5. Financial playbook
  const financial = generateFinancialPlaybook({
    players: s.players.filter((p) => p.teamId === teamId),
    budget,
    luxuryTaxThreshold: LUXURY_TAX_THRESHOLD,
    difficulty: s.franchise.difficulty,
  });

  // 6. Scouting briefing
  const scouting = generateScoutingBriefing(rng.fork(), {
    userTeamId: teamId,
    divisionRivalIds,
    allTeamRosters,
  });

  // 7. Season strategy (requires 1-6)
  const strategy = generateSeasonStrategy({
    teamId,
    teamName,
    ownerMeeting: owner,
    roster,
    farm,
    staff,
    financial,
    scouting,
  });

  // 8. Press conference (requires strategy)
  const press = generateOnboardingPressConference(rng.fork(), {
    teamId,
    teamName,
    gmName: s.franchise.gmName,
    recommendedSeasonGoal: strategy.recommendedSeasonGoal,
    recommendedTradeApproach: strategy.recommendedTradeApproach,
    ownerExpectationSummary: owner.expectations,
    rosterHeadline: roster.rosterNarrative,
    notablePlayers: roster.stars.slice(0, 3).map((p) => p.name),
    competitiveWindow: strategy.competitiveWindow,
  });

  return { owner, roster, farm, staff, financial, scouting, strategy, press };
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export function getOnboardingData(): OnboardingData {
  const s = requireState();
  const rng = createStableWorkerRng(s, 'onboarding-wizard');
  const chapterData = buildAllChapterData(rng.fork());

  // Build default (balanced) philosophy for script generation.
  // The actual choices come from the UI; the script pre-generates
  // reactions for ALL possible choices per chapter.
  const defaultPhilosophy: GMPhilosophy = {
    seasonGoal: chapterData.strategy.recommendedSeasonGoal,
    developmentStyle: 'balanced',
    spendingStyle: 'balanced',
    tradeApproach: chapterData.strategy.recommendedTradeApproach,
    scoutingFocus: 'draft',
    mediaTone: 'measured',
  };

  const team = getTeamById(s.userTeamId);
  const teamName = team ? `${team.city} ${team.name}` : s.userTeamId.toUpperCase();

  const script = generateFullOnboardingScript(rng.fork(), {
    gmName: s.franchise.gmName,
    teamName,
    teamId: s.userTeamId,
    allChapterData: chapterData,
    philosophy: defaultPhilosophy,
  });

  return { script, chapterData };
}

export function completeOnboarding(philosophy: GMPhilosophy): void {
  const s = requireState();
  // Store philosophy on franchise state for downstream systems
  (s.franchise as Record<string, unknown>).gmPhilosophy = philosophy;
  // Mark onboarding as complete
  s.franchise.onboarding = {
    ...s.franchise.onboarding,
    welcomeBriefingSeen: true,
  };
}
