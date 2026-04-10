/**
 * Worker queries for the Onboarding Wizard.
 * Generates assessment data from current game state and produces
 * the full onboarding script with AGM dialogue.
 */
import {
  AGM_CANDIDATES,
  GameRNG,
  LUXURY_TAX_THRESHOLD,
  TEAM_MARKETS,
  TEAMS,
  applyScoutingHire as applyScoutingHireCore,
  applyStaffHires as applyStaffHiresCore,
  assessFarmSystem,
  assessRoster,
  evaluateCoachingStaff,
  generateFinancialPlaybook,
  generateFullOnboardingScript,
  generateOnboardingPressConference,
  generateRevisedOnboardingScript,
  generateScoutingHiringSlate,
  generateStaffHiringSlate,
  generateOwnerMeeting,
  generateScoutingBriefing,
  generateSeasonStrategy,
  getTeamById,
} from '@mbd/sim-core';
import type {
  AGMCandidate,
  AGMCandidateId,
  AllChapterData,
  GMPhilosophy,
  OnboardingScript,
  OnboardingResult,
  RevisedOnboardingScript,
  ScoutingHiringSlate,
  StaffHireChoices,
  StaffHiringSlate,
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

export interface RevisedOnboardingData {
  script: RevisedOnboardingScript;
  chapterData: AllChapterData;
  staffSlate: StaffHiringSlate;
  scoutingSlate: ScoutingHiringSlate;
}

interface RevisedOnboardingDraft {
  agmId: AGMCandidateId;
  staffSlate: StaffHiringSlate;
  scoutingSlate: ScoutingHiringSlate;
  stagedStaffHires: StaffHireChoices | null;
  stagedScoutingHire: string | null;
}

interface WorkerMutationResult {
  success: boolean;
  flowStateChanged: boolean;
}

let revisedOnboardingDraft: RevisedOnboardingDraft | null = null;

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

function buildHiringContext() {
  const s = requireState();
  const team = getTeamById(s.userTeamId);

  return {
    teamId: s.userTeamId,
    teamName: team ? `${team.city} ${team.name}` : s.userTeamId.toUpperCase(),
    coachingStaff: s.coachingStaffs.get(s.userTeamId) ?? [],
    scoutingStaff: s.scoutingStaffs.get(s.userTeamId) ?? [],
  };
}

function defaultPhilosophy(chapterData: AllChapterData): GMPhilosophy {
  return {
    seasonGoal: chapterData.strategy.recommendedSeasonGoal,
    developmentStyle: 'balanced',
    spendingStyle: 'balanced',
    tradeApproach: chapterData.strategy.recommendedTradeApproach,
    scoutingFocus: 'draft',
    mediaTone: 'measured',
  };
}

function requireRevisedDraft(): RevisedOnboardingDraft {
  if (revisedOnboardingDraft == null) {
    throw new Error('Revised onboarding has not been initialized.');
  }

  return revisedOnboardingDraft;
}

// ---------------------------------------------------------------------------
// Public queries
// ---------------------------------------------------------------------------

export function getOnboardingData(): OnboardingData {
  const s = requireState();
  const rng = createStableWorkerRng(s, 'onboarding-wizard');
  const chapterData = buildAllChapterData(rng.fork());
  const scriptPhilosophy = defaultPhilosophy(chapterData);

  const team = getTeamById(s.userTeamId);
  const teamName = team ? `${team.city} ${team.name}` : s.userTeamId.toUpperCase();

  const script = generateFullOnboardingScript(rng.fork(), {
    gmName: s.franchise.gmName,
    teamName,
    teamId: s.userTeamId,
    allChapterData: chapterData,
    philosophy: scriptPhilosophy,
  });

  return { script, chapterData };
}

export function getAGMCandidates(): AGMCandidate[] {
  return AGM_CANDIDATES.map((candidate) => ({ ...candidate }));
}

export function getRevisedOnboardingData(agmId: AGMCandidateId): RevisedOnboardingData {
  const s = requireState();
  const rng = createStableWorkerRng(s, `onboarding-revised-${agmId}`);
  const chapterData = buildAllChapterData(rng.fork());
  const hiringContext = buildHiringContext();
  const staffSlate = generateStaffHiringSlate(hiringContext, rng.fork());
  const scoutingSlate = generateScoutingHiringSlate(hiringContext, rng.fork());
  const team = getTeamById(s.userTeamId);
  const teamName = team ? `${team.city} ${team.name}` : s.userTeamId.toUpperCase();

  revisedOnboardingDraft = {
    agmId,
    staffSlate,
    scoutingSlate,
    stagedStaffHires: null,
    stagedScoutingHire: null,
  };

  return {
    script: generateRevisedOnboardingScript(rng.fork(), {
      selectedAGM: AGM_CANDIDATES.find((candidate) => candidate.id === agmId)!,
      gmName: s.franchise.gmName,
      teamName,
      allChapterData: chapterData,
      staffSlate,
      scoutingSlate,
      philosophy: defaultPhilosophy(chapterData),
    }),
    chapterData,
    staffSlate,
    scoutingSlate,
  };
}

export function applyStaffHires(hires: StaffHireChoices): WorkerMutationResult {
  const draft = requireRevisedDraft();
  applyStaffHiresCore(buildHiringContext(), draft.staffSlate, hires);
  revisedOnboardingDraft = {
    ...draft,
    stagedStaffHires: { ...hires },
  };
  return { success: true, flowStateChanged: false };
}

export function applyScoutingHire(scoutingDirectorId: string): WorkerMutationResult {
  const draft = requireRevisedDraft();
  applyScoutingHireCore(buildHiringContext(), draft.scoutingSlate, scoutingDirectorId);
  revisedOnboardingDraft = {
    ...draft,
    stagedScoutingHire: scoutingDirectorId,
  };
  return { success: true, flowStateChanged: false };
}

export function completeOnboarding(philosophy: GMPhilosophy): void {
  const s = requireState();
  s.franchise.gmPhilosophy = philosophy;
  s.franchise.onboarding = {
    ...s.franchise.onboarding,
    welcomeBriefingSeen: true,
  };
}

export function completeRevisedOnboarding(result: OnboardingResult): WorkerMutationResult {
  const s = requireState();
  const draft = requireRevisedDraft();
  const hires = draft.stagedStaffHires ?? result.staffHires;
  const scoutingDirectorId = draft.stagedScoutingHire ?? result.scoutingHire;

  if (result.selectedAGMId !== draft.agmId) {
    throw new Error('Selected AGM does not match the initialized onboarding draft.');
  }

  const appliedStaff = applyStaffHiresCore(buildHiringContext(), draft.staffSlate, hires);
  const appliedScouting = applyScoutingHireCore(buildHiringContext(), draft.scoutingSlate, scoutingDirectorId);

  s.coachingStaffs.set(s.userTeamId, appliedStaff.coachingStaff);
  s.franchise.assistantGMId = result.selectedAGMId;
  s.franchise.scoutingDirector = appliedScouting.scoutingDirector;
  s.franchise.gmPhilosophy = {
    ...result.gmPhilosophy,
    scoutingFocus: appliedScouting.scoutingFocus,
  };
  s.franchise.onboarding = {
    ...s.franchise.onboarding,
    welcomeBriefingSeen: true,
  };
  revisedOnboardingDraft = null;

  return { success: true, flowStateChanged: true };
}
