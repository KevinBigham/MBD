import type {
  BriefingItem,
  OwnerState,
  PlayerMorale,
  Rivalry,
  TeamChemistry,
} from '@mbd/contracts';
import { getTeamBudget } from '../finance/contracts.js';
import type { GeneratedPlayer } from '../player/generation.js';
import {
  CLUBHOUSE_LEADER_TRAITS,
  NEGATIVE_CHEMISTRY_TRAITS,
  POSITIVE_CHEMISTRY_TRAITS,
  countMatchingTraits,
} from '../player/personalityTraits.js';

export type PersonalityArchetype =
  | 'captain'
  | 'sparkplug'
  | 'bulldog'
  | 'steady_hand'
  | 'mercenary';

export interface MoraleEvent {
  type: 'win' | 'loss' | 'injury' | 'promotion' | 'trade' | 'award' | 'breakout';
  impact: number;
  summary: string;
  timestamp: string;
}

export interface OwnerEvaluationContext {
  wins: number;
  losses: number;
  payroll: number;
  chemistryScore: number;
  recentDecisionScore: number;
  madePlayoffs?: boolean;
}

export interface BriefingContext {
  teamId: string;
  ownerState: OwnerState;
  chemistry: TeamChemistry;
  unreadNewsCount: number;
  rivalries: Map<string, Rivalry>;
}

export interface TeamChemistryContext {
  recentStreak?: number;
  rosterContinuity?: number;
  coachFit?: number;
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampBudget(value: number): number {
  return Math.round(Math.max(0, value) * 100) / 100;
}

function normalizeBudgetAmount(value: number): number {
  return value > 1_000 ? value / 1_000_000 : value;
}

function average(values: number[]): number {
  if (values.length === 0) return 50;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function chemistryTier(score: number): TeamChemistry['tier'] {
  if (score >= 80) return 'electric';
  if (score >= 65) return 'connected';
  if (score >= 45) return 'steady';
  if (score >= 30) return 'tense';
  return 'fractured';
}

function chemistrySummary(score: number): string {
  if (score >= 80) return 'The clubhouse is feeding off itself right now.';
  if (score >= 65) return 'Leadership is pulling the room together.';
  if (score >= 45) return 'The room is stable but not especially tight.';
  if (score >= 30) return 'Clubhouse tension is starting to show.';
  return 'The clubhouse feels splintered and difficult to manage.';
}

function ownerSummary(owner: Pick<OwnerState, 'satisfaction' | 'hotSeat' | 'winNowPressure'>): string {
  const satisfaction = owner.satisfaction ?? 50;
  const winNowPressure = owner.winNowPressure ?? 50;
  if (satisfaction >= 80) {
    return 'Ownership is pleased enough to expand the operating runway.';
  }
  if (satisfaction >= 60) {
    return winNowPressure >= 70
      ? 'Ownership still expects October baseball and likes the current pace.'
      : 'Ownership sees a healthy long-term direction and is staying patient.';
  }
  if (satisfaction >= 40) {
    return 'Ownership is watching results closely and wants a sharper trendline.';
  }
  if (satisfaction >= 15) {
    return 'Ownership is openly frustrated after a fading playoff pace and expects immediate course correction.';
  }
  return 'Ownership has lost faith in the current front-office plan after the playoff push collapsed.';
}

function stableOwnerBudgetBase(owner: Pick<OwnerState, 'teamId' | 'expectations'>): number {
  return normalizeBudgetAmount(getTeamBudget(owner.teamId) || owner.expectations.payrollTarget);
}

function budgetOutputsFromOwner(
  owner: Pick<OwnerState, 'spendingWillingness' | 'satisfaction'>,
  baseBudget: number,
  wins: number,
  losses: number,
  madePlayoffs: boolean,
) {
  const normalizedBaseBudget = normalizeBudgetAmount(baseBudget);
  const spendingFactor =
    owner.spendingWillingness === 'lavish'
      ? 1.12
      : owner.spendingWillingness === 'cheap'
        ? 0.9
        : 1;
  const satisfactionFactor = ((owner.satisfaction ?? 50) - 50) / 240;
  const attendanceFactor = clamp(((wins - losses) / 162) * 0.08, -0.08, 0.08);
  const playoffFactor = madePlayoffs ? 0.035 : 0;
  const annualBudget = clampBudget(
    normalizedBaseBudget * (1 + satisfactionFactor + attendanceFactor + playoffFactor) * spendingFactor,
  );
  const payrollCap = clampBudget(annualBudget * 0.92);

  return {
    annualBudget,
    payrollCap,
    draftBonusPool: clampBudget(Math.max(4.5, annualBudget * 0.03)),
    ifaBonusPool: clampBudget(Math.max(3.5, annualBudget * 0.0225)),
    staffBudget: clampBudget(Math.max(7.5, annualBudget * 0.0525)),
  };
}

export function getPersonalityArchetype(player: GeneratedPlayer): PersonalityArchetype {
  const { leadership, workEthic, competitiveness, mentalToughness } = player.personality;
  if (leadership >= 85 && mentalToughness >= 75) return 'captain';
  if (competitiveness >= 88 && workEthic >= 80) return 'sparkplug';
  if (competitiveness >= 85 && mentalToughness >= 70) return 'bulldog';
  if (mentalToughness >= 78 && workEthic >= 65) return 'steady_hand';
  return 'mercenary';
}

export function createInitialPlayerMorale(
  player: GeneratedPlayer,
  timestamp: string,
): PlayerMorale {
  const score = clampScore(
    30 +
      player.personality.mentalToughness * 0.28 +
      player.personality.workEthic * 0.18 +
      player.personality.leadership * 0.08 +
      (player.rosterStatus === 'MLB' ? 3 : 0)
  );

  return {
    playerId: player.id,
    score,
    trend: 'steady',
    summary: `${getPersonalityArchetype(player)} entering the season on even footing.`,
    lastUpdated: timestamp,
  };
}

export function applyMoraleEvent(
  player: GeneratedPlayer,
  current: PlayerMorale,
  event: MoraleEvent,
): PlayerMorale {
  const positiveMultiplier = 0.7 + player.personality.workEthic / 1000;
  const negativeMultiplier = 0.55 + (100 - player.personality.mentalToughness) / 180;
  const rawImpact = event.impact >= 0
    ? event.impact * positiveMultiplier
    : event.impact * negativeMultiplier;
  const score = clampScore(current.score + rawImpact);
  const delta = score - current.score;

  return {
    playerId: current.playerId,
    score,
    trend: delta > 1 ? 'rising' : delta < -1 ? 'falling' : 'steady',
    summary: event.summary,
    lastUpdated: event.timestamp,
  };
}

export function calculateTeamChemistry(
  teamId: string,
  players: GeneratedPlayer[],
  moraleByPlayer: Map<string, PlayerMorale>,
  context: TeamChemistryContext = {},
): TeamChemistry {
  const teamPlayers = players.filter((player) => player.teamId === teamId);
  const moraleScores = teamPlayers.map((player) => moraleByPlayer.get(player.id)?.score ?? 50);
  const leadershipScores = teamPlayers.map((player) => player.personality.leadership);
  const workEthicScores = teamPlayers.map((player) => player.personality.workEthic);
  const toughnessScores = teamPlayers.map((player) => player.personality.mentalToughness);
  const competitivenessScores = teamPlayers.map((player) => player.personality.competitiveness);
  const recentStreak = Math.max(-10, Math.min(10, context.recentStreak ?? 0));
  const rosterContinuity = Math.max(0, Math.min(100, context.rosterContinuity ?? 50));
  const coachFit = Math.max(0, Math.min(100, context.coachFit ?? 50));
  const rosterSize = Math.max(1, teamPlayers.length);
  const positiveTraitCount = teamPlayers.reduce(
    (sum, player) => sum + countMatchingTraits(player.personalityTraits, POSITIVE_CHEMISTRY_TRAITS),
    0,
  );
  const negativeTraitCount = teamPlayers.reduce(
    (sum, player) => sum + countMatchingTraits(player.personalityTraits, NEGATIVE_CHEMISTRY_TRAITS),
    0,
  );
  const leadershipTraitCount = teamPlayers.reduce(
    (sum, player) => sum + countMatchingTraits(player.personalityTraits, CLUBHOUSE_LEADER_TRAITS),
    0,
  );

  const competitivenessSpread = competitivenessScores.length > 0
    ? Math.max(...competitivenessScores) - Math.min(...competitivenessScores)
    : 0;
  const traitImpact = ((positiveTraitCount * 2.7) - (negativeTraitCount * 3.2) + (leadershipTraitCount * 1.4)) / rosterSize;

  const score = clampScore(
    average(moraleScores) * 0.36 +
      average(leadershipScores) * 0.17 +
      average(workEthicScores) * 0.14 +
      average(toughnessScores) * 0.11 -
      competitivenessSpread * 0.06 +
      traitImpact * 4.2 +
      recentStreak * 1.2 +
      (rosterContinuity - 50) * 0.12 +
      (coachFit - 50) * 0.1
  );

  const reasons: string[] = [];
  if (average(leadershipScores) >= 70) reasons.push('Veteran leadership');
  if (leadershipTraitCount >= Math.max(2, Math.ceil(rosterSize / 6))) reasons.push('Leadership core holds the clubhouse together');
  if (average(moraleScores) >= 60) reasons.push('Positive morale');
  if (positiveTraitCount > negativeTraitCount && positiveTraitCount >= 3) reasons.push('Clubhouse glue personalities are showing');
  if (negativeTraitCount >= 2) reasons.push('Diva tension and mercenary drama are bubbling up');
  if (competitivenessSpread >= 35) reasons.push('Competing personalities');
  if (recentStreak >= 5) reasons.push('Winning streak boosted the room');
  if (recentStreak <= -5) reasons.push('Losing streak put the room on edge');
  if (rosterContinuity >= 65) reasons.push('Core has stayed together');
  if (coachFit >= 65) reasons.push('Coaching voice matches the room');
  if (reasons.length === 0) reasons.push('Clubhouse still finding its identity');

  return {
    teamId,
    score,
    tier: chemistryTier(score),
    trend:
      recentStreak >= 4 || average(moraleScores) >= 62
        ? 'rising'
        : recentStreak <= -4 || average(moraleScores) <= 38
          ? 'falling'
          : 'steady',
    summary: chemistrySummary(score),
    reasons,
  };
}

export function chemistryScoreToModifier(score: number): number {
  const normalized = (Math.max(0, Math.min(100, score)) - 50) / 50;
  return Number((1 + normalized * 0.03).toFixed(4));
}

function ownerArchetypeFromBudget(payrollTarget: number): OwnerState['archetype'] {
  const normalizedPayrollTarget = normalizeBudgetAmount(payrollTarget);
  if (normalizedPayrollTarget >= 185) return 'win_now';
  if (normalizedPayrollTarget <= 120) return 'penny_pincher';
  return 'patient_builder';
}

export function createOwnerState(teamId: string, payrollTarget: number): OwnerState {
  const normalizedPayrollTarget = normalizeBudgetAmount(payrollTarget);
  const archetype = ownerArchetypeFromBudget(normalizedPayrollTarget);
  const winsTarget =
    archetype === 'win_now' ? 90 :
    archetype === 'patient_builder' ? 84 :
    78;
  const spendingWillingness =
    archetype === 'win_now' ? 'lavish' : archetype === 'patient_builder' ? 'moderate' : 'cheap';
  const winNowPressure =
    archetype === 'win_now' ? 84 : archetype === 'patient_builder' ? 52 : 64;
  const meddlingLevel =
    archetype === 'win_now' ? 62 : archetype === 'patient_builder' ? 38 : 74;
  const satisfaction =
    archetype === 'win_now' ? 62 : archetype === 'patient_builder' ? 58 : 52;
  const budgets = budgetOutputsFromOwner(
    { spendingWillingness, satisfaction },
    normalizedPayrollTarget,
    winsTarget,
    162 - winsTarget,
    archetype === 'win_now',
  );

  return {
    teamId,
    archetype,
    patience: archetype === 'win_now' ? 55 : archetype === 'patient_builder' ? 72 : 60,
    confidence: archetype === 'win_now' ? 58 : archetype === 'patient_builder' ? 68 : 54,
    hotSeat: false,
    summary: ownerSummary({ satisfaction, hotSeat: false, winNowPressure }),
    expectations: {
      winsTarget,
      playoffTarget: archetype !== 'penny_pincher',
      payrollTarget: budgets.payrollCap,
    },
    spendingWillingness,
    winNowPressure,
    meddlingLevel,
    satisfaction,
    annualBudget: budgets.annualBudget,
    payrollCap: budgets.payrollCap,
    draftBonusPool: budgets.draftBonusPool,
    ifaBonusPool: budgets.ifaBonusPool,
    staffBudget: budgets.staffBudget,
  };
}

export function evaluateOwnerState(
  owner: OwnerState,
  context: OwnerEvaluationContext,
): OwnerState {
  const gamesPlayed = Math.max(1, context.wins + context.losses);
  const expectedWinsAtPace = owner.expectations.winsTarget * (gamesPlayed / 162);
  const winGap = expectedWinsAtPace - context.wins;
  const normalizedPayroll = normalizeBudgetAmount(context.payroll);
  const payrollTarget = owner.payrollCap ?? normalizeBudgetAmount(owner.expectations.payrollTarget);
  const payrollOverage = Math.max(0, normalizedPayroll - payrollTarget);
  const payrollSavings = Math.max(0, payrollTarget - normalizedPayroll);
  const chemistryPenalty = Math.max(0, 55 - context.chemistryScore);
  const chemistryBonus = Math.max(0, context.chemistryScore - 55);
  const recentDecisionImpact = context.recentDecisionScore * 0.9;
  const attendanceProxy = clamp((context.wins - context.losses) / 4, -18, 18);
  const expectationBonus = context.madePlayoffs ? 10 : owner.expectations.playoffTarget ? 0 : 4;
  const satisfaction = clampScore(
    55
      - (winGap * 1.4)
      - (payrollOverage * 0.45)
      + Math.min(6, payrollSavings * 0.18)
      - (chemistryPenalty * 0.45)
      + (chemistryBonus * 0.25)
      + recentDecisionImpact
      + attendanceProxy
      + expectationBonus,
  );

  const patience = clampScore(
    (owner.patience * 0.45)
      + (satisfaction * 0.55)
      - ((owner.winNowPressure ?? 50) * 0.12)
      + ((owner.spendingWillingness === 'cheap' ? 5 : owner.spendingWillingness === 'lavish' ? -2 : 0)),
  );

  const confidence = clampScore(
    (owner.confidence * 0.35)
      + (satisfaction * 0.65)
      + (context.recentDecisionScore * 0.3)
      - (payrollOverage * 0.25),
  );

  const hotSeat = satisfaction < 50 || patience < 45 || confidence < 45;
  const budgets = budgetOutputsFromOwner(
    {
      spendingWillingness: owner.spendingWillingness,
      satisfaction,
    },
    stableOwnerBudgetBase(owner),
    context.wins,
    context.losses,
    context.madePlayoffs ?? false,
  );

  return {
    ...owner,
    patience,
    confidence,
    hotSeat,
    summary: ownerSummary({ satisfaction, hotSeat, winNowPressure: owner.winNowPressure }),
    satisfaction,
    annualBudget: budgets.annualBudget,
    payrollCap: budgets.payrollCap,
    draftBonusPool: budgets.draftBonusPool,
    ifaBonusPool: budgets.ifaBonusPool,
    staffBudget: budgets.staffBudget,
    expectations: {
      ...owner.expectations,
      payrollTarget: budgets.payrollCap,
    },
  };
}

export function applyOwnerDecisionDelta(
  owner: OwnerState,
  delta: number,
  summary: string,
): OwnerState {
  const patience = clampScore(owner.patience + delta);
  const confidence = clampScore(owner.confidence + delta);
  const satisfaction = clampScore((owner.satisfaction ?? average([owner.patience, owner.confidence])) + delta);
  const hotSeat = satisfaction < 50 || patience < 45 || confidence < 45;
  const budgets = budgetOutputsFromOwner(
    {
      spendingWillingness: owner.spendingWillingness,
      satisfaction,
    },
    stableOwnerBudgetBase(owner),
    owner.expectations.winsTarget,
    162 - owner.expectations.winsTarget,
    satisfaction >= 80,
  );

  return {
    ...owner,
    patience,
    confidence,
    hotSeat,
    satisfaction,
    summary,
    annualBudget: budgets.annualBudget,
    payrollCap: budgets.payrollCap,
    draftBonusPool: budgets.draftBonusPool,
    ifaBonusPool: budgets.ifaBonusPool,
    staffBudget: budgets.staffBudget,
    expectations: {
      ...owner.expectations,
      payrollTarget: budgets.payrollCap,
    },
  };
}

export function buildFrontOfficeBriefing(context: BriefingContext): BriefingItem[] {
  const ownerItem: BriefingItem = {
    id: `${context.teamId}-owner-summary`,
    priority: context.ownerState.hotSeat ? 1 : 4,
    category: 'owner',
    tag: context.ownerState.hotSeat ? 'BREAKING' : 'ANALYSIS',
    headline: context.ownerState.hotSeat
      ? 'Owner pressure is rising.'
      : 'Owner expectations remain on the board.',
    body: context.ownerState.summary,
    relatedTeamIds: [context.teamId],
    relatedPlayerIds: [],
    timestamp: 'NOW',
    acknowledged: false,
  };
  if (context.ownerState.hotSeat) {
    ownerItem.id = `${context.teamId}-owner-hot-seat`;
  }

  const items: BriefingItem[] = [ownerItem];

  if (context.chemistry.score < 55) {
    items.push({
      id: `${context.teamId}-chemistry`,
      priority: 2,
      category: 'chemistry',
      tag: 'ANALYSIS',
      headline: 'Clubhouse chemistry needs attention.',
      body: context.chemistry.summary,
      relatedTeamIds: [context.teamId],
      relatedPlayerIds: [],
      timestamp: 'NOW',
      acknowledged: false,
    });
  }

  if (context.unreadNewsCount > 0) {
    items.push({
      id: `${context.teamId}-news`,
      priority: 3,
      category: 'news',
      tag: 'RECAP',
      headline: `${context.unreadNewsCount} unread briefing item${context.unreadNewsCount === 1 ? '' : 's'}.`,
      body: 'Review the latest league context before making the next major move.',
      relatedTeamIds: [context.teamId],
      relatedPlayerIds: [],
      timestamp: 'NOW',
      acknowledged: false,
    });
  }

  const topRivalry = Array.from(context.rivalries.values())
    .sort((a, b) => b.intensity - a.intensity)[0];

  if (topRivalry && topRivalry.intensity >= 55) {
    items.push({
      id: topRivalry.id,
      priority: 4,
      category: 'rivalry',
      tag: 'ANALYSIS',
      headline: 'A rivalry is becoming a real subplot.',
      body: topRivalry.summary,
      relatedTeamIds: [topRivalry.teamA, topRivalry.teamB],
      relatedPlayerIds: [],
      timestamp: 'NOW',
      acknowledged: false,
    });
  }

  return items.sort((a, b) => a.priority - b.priority);
}
