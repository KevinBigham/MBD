/**
 * Worker queries for the Onboarding Wizard.
 * Generates assessment data from current game state and produces
 * the full onboarding script with AGM dialogue.
 */
import {
  LUXURY_TAX_THRESHOLD,
  TEAM_MARKETS,
  TEAMS,
  getTeamById,
} from '@mbd/sim-core';
import type {
  GameRNG,
} from '@mbd/sim-core';
import {
  AGM_CANDIDATES,
  buildDayOneDefaults,
  buildDayOneImpacts,
  buildDayOneNarrativePack,
  buildDayOneOrgReview,
  buildDayOneTeamCard,
  buildOpeningDayPlan,
  pickDayOneCrisis,
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
} from '../../../../packages/sim-core/src/onboarding/index.js';
import type {
  AGMCandidate,
  AGMCandidateId,
  AllChapterData,
  DayOneBudgetAllocation,
  DayOneCrisis,
  DayOneCrisisType,
  DayOneNarrativeContext,
  DayOneOpeningPlan,
  DayOneOrgReview,
  DayOneProjectedImpact,
  DayOnePromotionStance,
  DayOneTeamCard,
  DayOneTeaser,
  GMPhilosophy,
  OnboardingScript,
  OnboardingResult,
  RevisedOnboardingScript,
  ScoutingHiringSlate,
  StaffHireChoices,
  StaffHiringSlate,
} from '../../../../packages/sim-core/src/onboarding/index.js';
import {
  createStableWorkerRng,
  requireState,
} from './sim.worker.helpers.js';
import { getDifficultyAdjustedBudget, getTeamStaffBudget } from './sim.worker.setup.js';
import { applyOnboardingIdentityBaseline } from './sim.worker.frontOfficeIdentity.js';
import { calculateStateTeamPayroll } from './sim.worker.tradeFinance.js';

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

export interface DayOneOwnerScene {
  title: string;
  summary: string;
  expectation: string;
  stakes: string;
}

export interface DayOneRecap {
  title: string;
  summary: string;
  bullets: string[];
}

export interface DayOneStepCopy {
  eyebrow: string;
  headline: string;
  body: string;
}

export interface DayOneOpeningPlanView {
  lineup: Array<{ playerId: string; name: string; position: string }>;
  rotation: Array<{ playerId: string; name: string; position: string }>;
  bullpen: {
    closer: { playerId: string; name: string; position: string } | null;
    setup: Array<{ playerId: string; name: string; position: string }>;
    longRelief: { playerId: string; name: string; position: string } | null;
  } | null;
  lineupOptions: Array<{ playerId: string; name: string; position: string }>;
  rotationOptions: Array<{ playerId: string; name: string; position: string }>;
  bullpenOptions: Array<{ playerId: string; name: string; position: string }>;
}

export interface DayOneDevelopmentPlanInput {
  developmentStyle: 'aggressive' | 'balanced' | 'patient';
  promotionStance: DayOnePromotionStance;
}

export interface DayOneSession {
  mode: 'full' | 'quick';
  currentStep: 'owner_intro' | 'agm_select' | 'org_review' | 'season_goal' | 'budget' | 'opening_day_plan' | 'development' | 'crisis' | 'recap' | 'complete';
  teamCard: DayOneTeamCard;
  ownerScene: DayOneOwnerScene;
  stepCopy: DayOneStepCopy;
  agmCandidates: AGMCandidate[];
  selectedAGM: AGMCandidate | null;
  orgReview: DayOneOrgReview;
  projectedImpacts: DayOneProjectedImpact[];
  crisis: DayOneCrisis | null;
  recap: DayOneRecap | null;
  teaser: DayOneTeaser | null;
  openingPlanView: DayOneOpeningPlanView | null;
  choices: {
    seasonGoal: GMPhilosophy['seasonGoal'] | null;
    budgetAllocation: DayOneBudgetAllocation | null;
    developmentStyle: GMPhilosophy['developmentStyle'] | null;
    promotionStance: DayOnePromotionStance | null;
    openingDayPlan: DayOneOpeningPlan | null;
  };
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
  const teamPayroll = calculateStateTeamPayroll(s, teamId);

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
    payroll: teamPayroll.totalPayroll,
    luxuryTaxPayroll: teamPayroll.luxuryTaxPayroll,
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

function buildDayOneTeamContext() {
  const s = requireState();
  const team = getTeamById(s.userTeamId);
  const orgReview = buildDayOneOrgReview(s.players, s.userTeamId);
  const teamPlayers = s.players
    .filter((player) => player.teamId === s.userTeamId && player.rosterStatus === 'MLB')
    .sort((left, right) => right.overallRating - left.overallRating || left.id.localeCompare(right.id))
    .slice(0, 4)
    .map((player) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
      overall: player.overallRating,
    }));

  const teamCard = buildDayOneTeamCard({
    teamId: s.userTeamId,
    teamName: team ? `${team.city} ${team.name}` : s.userTeamId.toUpperCase(),
    division: team?.division ?? 'UNKNOWN',
    payrollTier: getDifficultyAdjustedBudget(s, s.userTeamId) >= 250
      ? 'Premier'
      : getDifficultyAdjustedBudget(s, s.userTeamId) >= 200
        ? 'Competitive'
        : 'Lean',
    farmSystemRating: orgReview.farmTier === 'elite'
      ? 'A'
      : orgReview.farmTier === 'strong'
        ? 'B+'
        : orgReview.farmTier === 'average'
          ? 'B'
          : orgReview.farmTier === 'thin'
            ? 'C+'
            : 'C',
    projectedRecord: `${orgReview.projectedWins}-${162 - orgReview.projectedWins}`,
    strengths: orgReview.strengths,
    weaknesses: orgReview.weaknesses,
    topPlayers: teamPlayers,
    divisionRivals: TEAMS
      .filter((entry) => entry.division === team?.division && entry.id !== s.userTeamId)
      .map((entry) => ({
        teamId: entry.id,
        teamName: `${entry.city} ${entry.name}`,
      })),
  });

  return {
    teamCard,
    orgReview,
  };
}

function buildDayOneNarrativeContext(
  teamCard: DayOneTeamCard,
  orgReview: DayOneOrgReview,
  crisisType?: DayOneCrisisType | null,
): DayOneNarrativeContext {
  const s = requireState();

  return {
    teamId: s.userTeamId,
    teamName: teamCard.teamName,
    marketSize: teamCard.marketSize,
    archetype: teamCard.archetype,
    projectedWins: orgReview.projectedWins,
    topWeakness: inferBiggestWeakness(orgReview.weaknesses),
    topProspectName: orgReview.topProspectName,
    agmId: s.franchise.dayOne.selectedAGMId,
    seasonGoal: s.franchise.dayOne.seasonGoal,
    budgetAllocation: s.franchise.dayOne.budgetAllocation,
    developmentStyle: s.franchise.dayOne.developmentStyle,
    promotionStance: s.franchise.dayOne.promotionStance,
    crisisType: crisisType ?? s.franchise.dayOne.crisisType,
    crisisResponseId: s.franchise.dayOne.crisisResponseId,
  };
}

function buildOwnerScene(teamCard: DayOneTeamCard, narrativeContext: DayOneNarrativeContext): DayOneOwnerScene {
  const narrativePack = buildDayOneNarrativePack(narrativeContext);

  return {
    title: `Welcome To ${teamCard.teamName}`,
    summary: narrativePack.owner.summary,
    expectation: narrativePack.owner.expectation,
    stakes: narrativePack.owner.stakes,
  };
}

function formatSeasonGoalLabel(seasonGoal: GMPhilosophy['seasonGoal'] | null) {
  switch (seasonGoal) {
    case 'championship':
      return 'Championship';
    case 'playoff':
      return 'Playoff Push';
    case 'compete':
      return 'Compete';
    case 'rebuild':
      return 'Rebuild';
    default:
      return 'Uncommitted';
  }
}

function formatBudgetLabel(budgetAllocation: DayOneBudgetAllocation | null) {
  switch (budgetAllocation) {
    case 'spend_now':
      return 'Spend Now';
    case 'balanced':
      return 'Balanced';
    case 'future_flex':
      return 'Future Flex';
    default:
      return 'Uncommitted';
  }
}

function agmVoiceReaction(
  narrativeContext: DayOneNarrativeContext,
  currentStep: DayOneSession['currentStep'],
  orgReview: DayOneOrgReview,
) {
  switch (narrativeContext.agmId) {
    case 'marcus_chen':
      switch (currentStep) {
        case 'org_review':
          return `Marcus reads ${orgReview.strengths.join(' and ')} as the carrying tools, but he thinks ${inferBiggestWeakness(orgReview.weaknesses)} becomes the first thing opponents try to tax.`;
        case 'season_goal':
          return `Marcus wants the mandate to match the actual win curve. Say too little and the room drifts. Say too much and every inefficient roster spot gets put on trial.`;
        case 'budget':
          return narrativeContext.budgetAllocation === 'future_flex'
            ? 'Marcus likes keeping July optionality, but only if the major-league room can survive the first stress test without panicking.'
            : 'Marcus is treating this budget posture like a portfolio choice: if you spend now, the roster has to justify it quickly.';
        case 'opening_day_plan':
          return `Marcus sees the lineup card as a public resource-allocation document. He wants the leverage innings and leverage at-bats aligned with the talent, not the sentiment.`;
        case 'development':
          return narrativeContext.topProspectName
            ? `Marcus thinks ${narrativeContext.topProspectName} is already part of the Season 1 equation, even if the exact arrival date is still negotiable.`
            : 'Marcus views the development posture as hidden payroll strategy: pipeline timing is a roster asset, not a side topic.';
        case 'crisis':
          return 'Marcus is treating the first crisis like a leverage test. He wants an answer that still makes sense in July, not just tonight.';
        default:
          return `Marcus is translating each Day One choice into season-long leverage for ${narrativeContext.teamName}.`;
      }
    case 'walt_kowalski':
      switch (currentStep) {
        case 'org_review':
          return `Walt thinks the room can live with imperfections as long as the club knows what it is. Right now, ${inferBiggestWeakness(orgReview.weaknesses)} is the thing that could make it feel unsure.`;
        case 'season_goal':
          return 'Walt wants the mandate to sound like something a clubhouse can believe, not a slogan that collapses the first time the team gets punched.';
        case 'budget':
          return 'Walt reads the budget posture as a tone-setter. Spend if you are pushing. Hold back if you want to prove the room can handle discomfort without flinching.';
        case 'opening_day_plan':
          return 'Walt is staring at role clarity. He wants players to know where the big outs and big at-bats are supposed to land.';
        case 'development':
          return narrativeContext.topProspectName
            ? `Walt likes ${narrativeContext.topProspectName}, but he wants promotions to feel earned enough that the room respects them on contact.`
            : 'Walt wants development and promotion choices that keep the room honest without teaching prospects bad habits.';
        case 'crisis':
          return 'Walt thinks the first bad break tells the clubhouse whether leadership is steady or theatrical.';
        default:
          return `Walt is reading the emotional temperature in ${narrativeContext.teamName} as much as the roster itself.`;
      }
    case 'elena_vargas':
      switch (currentStep) {
        case 'org_review':
          return `Elena thinks this organization already has a story. ${orgReview.strengths[0] ?? 'The top of the roster'} can make people believe, but ${inferBiggestWeakness(orgReview.weaknesses)} is where the story can turn on you.`;
        case 'season_goal':
          return 'Elena wants the mandate to tell the room what kind of season it is walking into, because players can feel the difference between clarity and noise immediately.';
        case 'budget':
          return narrativeContext.budgetAllocation === 'spend_now'
            ? 'Elena likes telling the room you are serious right away, but she also wants enough flexibility that one bad week does not own the whole conversation.'
            : 'Elena sees the budget choice as part of the club’s emotional weather. The room needs to feel supported without getting lied to.';
        case 'opening_day_plan':
          return 'Elena treats the Opening Day board like the first real promise to the clubhouse. The right names in the right roles make belief easier.';
        case 'development':
          return narrativeContext.topProspectName
            ? `Elena already has one eye on ${narrativeContext.topProspectName}. She wants the promotion stance to feel human, not robotic, when the first real argument arrives.`
            : 'Elena wants the development posture to create trust upstairs and downstairs at the same time.';
        case 'crisis':
          return 'Elena thinks the first crisis becomes part of the franchise memory if your answer feels either brave or confused.';
        default:
          return `Elena is measuring how each Day One choice will feel inside the room and outside it.`;
      }
    default:
      return `${narrativeContext.teamName} is already being shaped by the choices on this desk.`;
  }
}

function buildDayOneStepCopy(args: {
  currentStep: DayOneSession['currentStep'];
  experience: DayOneSession['mode'];
  teamCard: DayOneTeamCard;
  orgReview: DayOneOrgReview;
  crisis: DayOneCrisis | null;
  teaser: DayOneTeaser | null;
  narrativeContext: DayOneNarrativeContext;
}) {
  const {
    currentStep,
    experience,
    teamCard,
    orgReview,
    crisis,
    teaser,
    narrativeContext,
  } = args;
  const narrativePack = buildDayOneNarrativePack(narrativeContext);
  const agmReaction = agmVoiceReaction(narrativeContext, currentStep, orgReview);

  switch (currentStep) {
    case 'owner_intro':
      return {
        eyebrow: 'Owner Suite',
        headline: `${teamCard.archetype} in ${teamCard.teamName}`,
        body: narrativePack.owner.summary,
      };
    case 'agm_select':
      return {
        eyebrow: 'Three Voices',
        headline: 'Pick the AGM who should frame your first season.',
        body: `Each candidate is reading the same franchise through a different lens. ${teamCard.whyNow}`,
      };
    case 'org_review':
      return {
        eyebrow: 'Inherited Shape',
        headline: narrativePack.orgReviewIntro,
        body: agmReaction,
      };
    case 'season_goal':
      return {
        eyebrow: 'Mandate',
        headline: `Tell the room whether ${teamCard.teamName} is chasing now or building pressure for later.`,
        body: agmReaction,
      };
    case 'budget':
      return {
        eyebrow: 'Budget Posture',
        headline: `Your ${formatSeasonGoalLabel(narrativeContext.seasonGoal ?? null)} mandate needs a matching resource posture.`,
        body: agmReaction,
      };
    case 'opening_day_plan':
      return {
        eyebrow: 'Opening Day Board',
        headline: `${inferBiggestWeakness(orgReview.weaknesses)} is the pressure point. Set the board like you mean it.`,
        body: agmReaction,
      };
    case 'development':
      return {
        eyebrow: 'Pipeline Rules',
        headline: narrativeContext.topProspectName
          ? `${narrativeContext.topProspectName} is already lurking behind this decision.`
          : 'The first hot prospect will test this posture immediately.',
        body: agmReaction,
      };
    case 'crisis':
      return {
        eyebrow: 'First Crisis',
        headline: crisis?.title ?? narrativePack.crisis.title,
        body: agmReaction,
      };
    case 'recap':
    case 'complete':
      return {
        eyebrow: experience === 'quick' ? 'Quick Start Teaser' : 'April Watch',
        headline: teaser?.headline ?? `${teamCard.teamName} has its Day One posture.`,
        body: teaser ? `${teaser.agmReaction} ${teaser.openingDayPrompt}` : agmReaction,
      };
  }
}

function dayOneBudgetToSpendingStyle(
  budgetAllocation: DayOneBudgetAllocation | null,
): GMPhilosophy['spendingStyle'] {
  if (budgetAllocation === 'spend_now') {
    return 'big_spender';
  }
  if (budgetAllocation === 'future_flex') {
    return 'penny_pincher';
  }
  return 'balanced';
}

function dayOneBudgetToTradeApproach(
  seasonGoal: GMPhilosophy['seasonGoal'] | null,
  budgetAllocation: DayOneBudgetAllocation | null,
): GMPhilosophy['tradeApproach'] {
  if (seasonGoal === 'rebuild') {
    return 'seller';
  }
  if (budgetAllocation === 'spend_now' || seasonGoal === 'championship') {
    return 'buyer';
  }
  return 'opportunistic';
}

function agmToMediaTone(agmId: AGMCandidateId | null): GMPhilosophy['mediaTone'] {
  if (agmId === 'walt_kowalski') {
    return 'humble';
  }
  if (agmId === 'elena_vargas') {
    return 'confident';
  }
  return 'measured';
}

function spendingStyleToDayOneBudget(
  spendingStyle: GMPhilosophy['spendingStyle'],
): DayOneBudgetAllocation {
  if (spendingStyle === 'big_spender') {
    return 'spend_now';
  }
  if (spendingStyle === 'penny_pincher') {
    return 'future_flex';
  }
  return 'balanced';
}

function developmentStyleToPromotionStance(
  developmentStyle: GMPhilosophy['developmentStyle'],
): DayOnePromotionStance {
  if (developmentStyle === 'aggressive') {
    return 'aggressive';
  }
  if (developmentStyle === 'patient') {
    return 'patient';
  }
  return 'measured';
}

function inferBiggestWeakness(weaknesses: string[]) {
  return weaknesses[0] ?? 'rotation depth';
}

function syncFranchisePhilosophyFromDayOne() {
  const s = requireState();
  s.franchise.gmPhilosophy = {
    seasonGoal: s.franchise.dayOne.seasonGoal ?? 'compete',
    developmentStyle: s.franchise.dayOne.developmentStyle ?? 'balanced',
    spendingStyle: dayOneBudgetToSpendingStyle(s.franchise.dayOne.budgetAllocation),
    tradeApproach: dayOneBudgetToTradeApproach(s.franchise.dayOne.seasonGoal, s.franchise.dayOne.budgetAllocation),
    scoutingFocus: 'draft',
    mediaTone: agmToMediaTone(s.franchise.dayOne.selectedAGMId),
  };
}

function buildCurrentCrisis(orgReview: DayOneOrgReview): DayOneCrisis | null {
  const s = requireState();
  if (
    s.franchise.dayOne.developmentStyle == null
    || s.franchise.dayOne.promotionStance == null
    || s.franchise.dayOne.budgetAllocation == null
    || s.franchise.dayOne.seasonGoal == null
  ) {
    return null;
  }

  return pickDayOneCrisis({
    teamId: s.userTeamId,
    projectedWins: orgReview.projectedWins,
    biggestWeakness: inferBiggestWeakness(orgReview.weaknesses),
    topProspectName: orgReview.topProspectName,
    agmId: s.franchise.dayOne.selectedAGMId,
    seasonGoal: s.franchise.dayOne.seasonGoal,
    budgetAllocation: s.franchise.dayOne.budgetAllocation,
    developmentStyle: s.franchise.dayOne.developmentStyle,
    promotionStance: s.franchise.dayOne.promotionStance,
  });
}

function buildProjectedImpacts(orgReview: DayOneOrgReview): DayOneProjectedImpact[] {
  const s = requireState();
  if (
    s.franchise.dayOne.seasonGoal == null
    || s.franchise.dayOne.budgetAllocation == null
    || s.franchise.dayOne.developmentStyle == null
    || s.franchise.dayOne.promotionStance == null
  ) {
    return [];
  }

  const crisis = buildCurrentCrisis(orgReview);

  return buildDayOneImpacts({
    teamId: s.userTeamId,
    seasonGoal: s.franchise.dayOne.seasonGoal,
    budgetAllocation: s.franchise.dayOne.budgetAllocation,
    developmentStyle: s.franchise.dayOne.developmentStyle,
    promotionStance: s.franchise.dayOne.promotionStance,
    crisisType: crisis?.type ?? s.franchise.dayOne.crisisType,
    agmId: s.franchise.dayOne.selectedAGMId,
  });
}

function buildDayOneRecap(teamCard: DayOneTeamCard, teaser: DayOneTeaser | null): DayOneRecap | null {
  const s = requireState();
  if (s.franchise.dayOne.selectedAGMId == null) {
    return null;
  }

  const selectedAGM = AGM_CANDIDATES.find((candidate) => candidate.id === s.franchise.dayOne.selectedAGMId);
  const bullets = [
    `${selectedAGM?.name ?? 'Your AGM'} is now the voice beside you in the room.`,
    s.franchise.dayOne.seasonGoal ? `Season goal: ${formatSeasonGoalLabel(s.franchise.dayOne.seasonGoal)}.` : null,
    s.franchise.dayOne.budgetAllocation ? `Budget posture: ${formatBudgetLabel(s.franchise.dayOne.budgetAllocation)}.` : null,
    s.franchise.dayOne.openingDayPlan ? 'Opening Day lineup, rotation, and bullpen ladder are locked.' : null,
    s.franchise.dayOne.developmentStyle && s.franchise.dayOne.promotionStance
      ? `Player dev: ${s.franchise.dayOne.developmentStyle}, promotions: ${s.franchise.dayOne.promotionStance}.`
      : null,
    s.franchise.dayOne.crisisResponseId ? `Your first crisis response is already on the record.` : null,
  ].filter((entry): entry is string => entry != null);

  return {
    title: `${teamCard.teamName} Is Now Yours`,
    summary: teaser?.localPressNote
      ?? 'Day One established your operating posture. The front office is ready to see whether your choices hold up once the season starts moving.',
    bullets,
  };
}

function uniquePlayerIds(playerIds: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const playerId of playerIds) {
    if (!playerId || seen.has(playerId)) {
      continue;
    }
    seen.add(playerId);
    ordered.push(playerId);
  }
  return ordered;
}

function normalizeOpeningDayPlan(plan: DayOneOpeningPlan, defaults: DayOneOpeningPlan): DayOneOpeningPlan {
  const lineupPlayerIds = uniquePlayerIds([
    ...plan.lineupPlayerIds,
    ...defaults.lineupPlayerIds,
  ]).slice(0, defaults.lineupPlayerIds.length);
  const rotationPlayerIds = uniquePlayerIds([
    ...plan.rotationPlayerIds,
    ...defaults.rotationPlayerIds,
  ]).slice(0, defaults.rotationPlayerIds.length);
  const defaultBullpen = defaults.bullpen;

  if (defaultBullpen == null) {
    return {
      lineupPlayerIds,
      rotationPlayerIds,
      bullpen: null,
    };
  }

  const candidateBullpen = plan.bullpen ?? defaultBullpen;
  const closerId = uniquePlayerIds([
    candidateBullpen.closerId,
    defaultBullpen.closerId,
  ])[0] ?? null;
  const setupIds = uniquePlayerIds([
    ...candidateBullpen.setupIds,
    ...defaultBullpen.setupIds,
  ])
    .filter((playerId) => playerId !== closerId)
    .slice(0, defaultBullpen.setupIds.length);
  const longReliefId = uniquePlayerIds([
    candidateBullpen.longReliefId,
    defaultBullpen.longReliefId,
  ]).find((playerId) => playerId !== closerId && !setupIds.includes(playerId)) ?? null;

  return {
    lineupPlayerIds,
    rotationPlayerIds,
    bullpen: {
      closerId,
      setupIds,
      longReliefId,
    },
  };
}

function buildOpeningPlanView(plan: DayOneOpeningPlan | null): DayOneOpeningPlanView | null {
  const s = requireState();
  if (plan == null) {
    return null;
  }

  const byId = new Map(
    s.players
      .filter((player) => player.teamId === s.userTeamId)
      .map((player) => [
        player.id,
        {
          playerId: player.id,
          name: `${player.firstName} ${player.lastName}`,
          position: player.position,
        },
      ]),
  );
  const viewFor = (playerId: string | null | undefined) => (playerId ? (byId.get(playerId) ?? null) : null);
  const mlbPlayers = s.players.filter((player) => player.teamId === s.userTeamId && player.rosterStatus === 'MLB');
  const lineupOptions = mlbPlayers
    .filter((player) => player.position !== 'SP' && player.position !== 'RP')
    .sort((left, right) => right.overallRating - left.overallRating)
    .map((player) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
    }));
  const rotationOptions = mlbPlayers
    .filter((player) => player.position === 'SP')
    .sort((left, right) => right.overallRating - left.overallRating)
    .map((player) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
    }));
  const bullpenOptions = mlbPlayers
    .filter((player) => player.position === 'RP' || player.position === 'SP')
    .sort((left, right) => right.overallRating - left.overallRating)
    .map((player) => ({
      playerId: player.id,
      name: `${player.firstName} ${player.lastName}`,
      position: player.position,
    }));

  return {
    lineup: plan.lineupPlayerIds
      .map((playerId) => viewFor(playerId))
      .filter((entry): entry is NonNullable<ReturnType<typeof viewFor>> => entry != null),
    rotation: plan.rotationPlayerIds
      .map((playerId) => viewFor(playerId))
      .filter((entry): entry is NonNullable<ReturnType<typeof viewFor>> => entry != null),
    bullpen: plan.bullpen == null
      ? null
      : {
        closer: viewFor(plan.bullpen.closerId),
        setup: plan.bullpen.setupIds
          .map((playerId) => viewFor(playerId))
          .filter((entry): entry is NonNullable<ReturnType<typeof viewFor>> => entry != null),
        longRelief: viewFor(plan.bullpen.longReliefId),
      },
    lineupOptions,
    rotationOptions,
    bullpenOptions,
  };
}

function buildDayOneSession(): DayOneSession {
  const s = requireState();
  const { teamCard, orgReview } = buildDayOneTeamContext();
  const currentStep = s.franchise.dayOne.currentStep;
  const recommendedPlan = s.franchise.dayOne.openingDayPlan
    ?? buildOpeningDayPlan(s.players.filter((player) => player.teamId === s.userTeamId));
  const crisis = currentStep === 'crisis' || currentStep === 'recap' || currentStep === 'complete'
    ? buildCurrentCrisis(orgReview)
    : null;
  const narrativeContext = buildDayOneNarrativeContext(teamCard, orgReview, crisis?.type ?? s.franchise.dayOne.crisisType);
  const narrativePack = buildDayOneNarrativePack(narrativeContext);
  const teaser = currentStep === 'recap' || currentStep === 'complete'
    ? narrativePack.teaser
    : null;
  const agmCandidates = AGM_CANDIDATES.map((candidate) => ({
    ...candidate,
    selectionScreenBio: narrativePack.agmPitches[candidate.id] ?? candidate.selectionScreenBio,
  }));
  const selectedAGM = s.franchise.dayOne.selectedAGMId == null
    ? null
    : agmCandidates.find((candidate) => candidate.id === s.franchise.dayOne.selectedAGMId) ?? null;

  return {
    mode: s.franchise.dayOne.experience,
    currentStep,
    teamCard,
    ownerScene: buildOwnerScene(teamCard, narrativeContext),
    stepCopy: buildDayOneStepCopy({
      currentStep,
      experience: s.franchise.dayOne.experience,
      teamCard,
      orgReview,
      crisis,
      teaser,
      narrativeContext,
    }),
    agmCandidates,
    selectedAGM,
    orgReview,
    projectedImpacts: buildProjectedImpacts(orgReview),
    crisis,
    recap: currentStep === 'recap' || currentStep === 'complete' ? buildDayOneRecap(teamCard, teaser) : null,
    teaser,
    openingPlanView: buildOpeningPlanView(recommendedPlan),
    choices: {
      seasonGoal: s.franchise.dayOne.seasonGoal,
      budgetAllocation: s.franchise.dayOne.budgetAllocation,
      developmentStyle: s.franchise.dayOne.developmentStyle,
      promotionStance: s.franchise.dayOne.promotionStance,
      openingDayPlan: recommendedPlan,
    },
  };
}

function ensureDayOneStep(expectedStep: DayOneSession['currentStep']) {
  const s = requireState();
  if (s.franchise.dayOne.currentStep !== expectedStep) {
    throw new Error(`Expected Day One step ${expectedStep}, received ${s.franchise.dayOne.currentStep}.`);
  }
}

function autoResolveQuickStart(agmId: AGMCandidateId) {
  const s = requireState();
  const teamPlayers = s.players.filter((player) => player.teamId === s.userTeamId);
  const defaults = buildDayOneDefaults(teamPlayers, s.userTeamId);
  const orgReview = buildDayOneOrgReview(s.players, s.userTeamId);
  const crisis = pickDayOneCrisis({
    teamId: s.userTeamId,
    projectedWins: orgReview.projectedWins,
    biggestWeakness: inferBiggestWeakness(orgReview.weaknesses),
    topProspectName: orgReview.topProspectName,
    agmId,
    seasonGoal: defaults.seasonGoal,
    budgetAllocation: defaults.budgetAllocation,
    developmentStyle: defaults.developmentStyle,
    promotionStance: defaults.promotionStance,
  });

  s.franchise.assistantGMId = agmId;
  s.franchise.dayOne = {
    ...s.franchise.dayOne,
    selectedAGMId: agmId,
    seasonGoal: defaults.seasonGoal,
    budgetAllocation: defaults.budgetAllocation,
    developmentStyle: defaults.developmentStyle,
    promotionStance: defaults.promotionStance,
    openingDayPlan: defaults.openingDayPlan,
    crisisType: crisis.type,
    crisisResponseId: crisis.responseOptions[0]?.id ?? null,
    status: 'complete',
    currentStep: 'complete',
    quickStartRecapSeen: false,
  };
  syncFranchisePhilosophyFromDayOne();
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
  s.franchise.dayOne = {
    ...s.franchise.dayOne,
    status: 'complete',
    currentStep: 'complete',
    selectedAGMId: s.franchise.dayOne.selectedAGMId ?? s.franchise.assistantGMId,
    seasonGoal: philosophy.seasonGoal,
    budgetAllocation: spendingStyleToDayOneBudget(philosophy.spendingStyle),
    developmentStyle: philosophy.developmentStyle,
    promotionStance: s.franchise.dayOne.promotionStance
      ?? developmentStyleToPromotionStance(philosophy.developmentStyle),
    quickStartRecapSeen: true,
  };
  s.franchise.onboarding = {
    ...s.franchise.onboarding,
    welcomeBriefingSeen: true,
  };
  applyOnboardingIdentityBaseline(s);
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
  s.franchise.dayOne = {
    ...s.franchise.dayOne,
    status: 'complete',
    currentStep: 'complete',
    selectedAGMId: result.selectedAGMId,
    seasonGoal: result.gmPhilosophy.seasonGoal,
    budgetAllocation: spendingStyleToDayOneBudget(result.gmPhilosophy.spendingStyle),
    developmentStyle: result.gmPhilosophy.developmentStyle,
    promotionStance: developmentStyleToPromotionStance(result.gmPhilosophy.developmentStyle),
    quickStartRecapSeen: true,
  };
  s.franchise.onboarding = {
    ...s.franchise.onboarding,
    welcomeBriefingSeen: true,
  };
  applyOnboardingIdentityBaseline(s);
  revisedOnboardingDraft = null;

  return { success: true, flowStateChanged: true };
}
