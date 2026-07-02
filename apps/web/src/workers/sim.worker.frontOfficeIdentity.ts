import type {
  BriefingItem,
  DevelopmentSetback,
  GMPhilosophy,
} from '@mbd/contracts';
import {
  applyMoraleEvent,
  applyOwnerDecisionDelta,
  calculateTeamChemistry,
  calculateTeamPayroll,
  createFrontOfficeState,
  createInitialPlayerMorale,
  createOwnerState,
  evaluateFrontOfficeState,
  getTeamBudget,
  getTeamById,
  type GeneratedPlayer,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';

export type ScoutingAccuracyDomain = 'draft' | 'international' | 'pro';

export interface AlignmentScore {
  score: number;
  impact: number;
  label: 'strong' | 'steady' | 'watch' | 'strained';
  summary: string;
}

export interface EffectiveScoutingAccuracy {
  domain: ScoutingAccuracyDomain;
  baseAccuracy: number;
  effectiveAccuracy: number;
  confidenceBonus: number;
  summary: string;
}

export interface AssistantGmProfileModifiers {
  tradeValuation: number;
  development: number;
  scouting: Partial<Record<ScoutingAccuracyDomain, number>>;
  morale: number;
  owner: number;
  summary: string;
}

export interface FrontOfficeIdentityView {
  assistantGM: {
    id: string | null;
    name: string;
    focus: string;
    upside: string;
    watchout: string;
  };
  scoutingDirector: {
    name: string;
    focus: string;
    draftAccuracy: number;
    internationalAccuracy: number;
    proAccuracy: number;
  } | null;
  philosophy: {
    seasonGoal: string;
    developmentStyle: string;
    scoutingFocus: string;
    spendingStyle: string;
    tradeApproach: string;
    mediaTone: string;
  };
  alignment: {
    overall: AlignmentScore;
    mandate: AlignmentScore;
    spending: AlignmentScore;
    trade: AlignmentScore;
    development: AlignmentScore;
    media: AlignmentScore;
  };
  visibleEffects: string[];
  recentConsequence: {
    headline: string;
    body: string;
    timestamp: string;
  } | null;
}

interface MonthlyFrontOfficeContext {
  month: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function clampScore(value: number): number {
  return clamp(Math.round(value), 0, 100);
}

function clampAccuracy(value: number): number {
  return Math.round(clamp(value, 0.5, 0.95) * 1000) / 1000;
}

function scoreImpact(score: number): number {
  return clamp(Math.round((score - 50) / 8), -8, 8);
}

function labelForScore(score: number): AlignmentScore['label'] {
  if (score >= 70) return 'strong';
  if (score >= 55) return 'steady';
  if (score >= 42) return 'watch';
  return 'strained';
}

function makeScore(score: number, summary: string): AlignmentScore {
  const normalized = clampScore(score);
  return {
    score: normalized,
    impact: scoreImpact(normalized),
    label: labelForScore(normalized),
    summary,
  };
}

function addStoryFlag(state: FullGameState, flag: string): boolean {
  const existing = state.storyFlags.get(state.userTeamId) ?? [];
  if (existing.includes(flag)) {
    return false;
  }
  state.storyFlags.set(state.userTeamId, [...existing, flag].sort((left, right) => left.localeCompare(right)));
  return true;
}

function hasStoryFlag(state: FullGameState, flag: string): boolean {
  return (state.storyFlags.get(state.userTeamId) ?? []).includes(flag);
}

export function hasAnsweredInteractivePressConference(
  state: Pick<FullGameState, 'storyFlags' | 'userTeamId' | 'season' | 'day'>,
): boolean {
  const answeredAlignedPrefix = `press_tone_aligned_${state.season}_${state.day}_`;
  const answeredBacklashPrefix = `press_tone_backlash_${state.season}_${state.day}_`;
  return (state.storyFlags.get(state.userTeamId) ?? []).some((flag) => (
    flag.startsWith(answeredAlignedPrefix) || flag.startsWith(answeredBacklashPrefix)
  ));
}

function timestamp(state: Pick<FullGameState, 'season' | 'day'>): string {
  return `S${state.season}D${state.day}`;
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function normalizeMoney(value: number | undefined): number {
  if (value == null) return 0;
  return value > 1_000 ? value / 1_000_000 : value;
}

function philosophyFromState(state: FullGameState): GMPhilosophy {
  const dayOne = state.franchise.dayOne;
  const fromBudget = dayOne.budgetAllocation === 'spend_now'
    ? 'big_spender'
    : dayOne.budgetAllocation === 'future_flex'
      ? 'penny_pincher'
      : 'balanced';

  return {
    seasonGoal: state.franchise.gmPhilosophy?.seasonGoal ?? dayOne.seasonGoal ?? 'compete',
    developmentStyle: state.franchise.gmPhilosophy?.developmentStyle ?? dayOne.developmentStyle ?? 'balanced',
    spendingStyle: state.franchise.gmPhilosophy?.spendingStyle ?? fromBudget,
    tradeApproach: state.franchise.gmPhilosophy?.tradeApproach ?? (dayOne.seasonGoal === 'rebuild' ? 'seller' : 'opportunistic'),
    scoutingFocus: state.franchise.gmPhilosophy?.scoutingFocus ?? state.franchise.scoutingDirector?.specialty ?? 'draft',
    mediaTone: state.franchise.gmPhilosophy?.mediaTone ?? 'measured',
  };
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function assistantGmLabel(id: string | null | undefined): string {
  switch (id) {
    case 'marcus_chen':
      return 'Marcus Chen';
    case 'walt_kowalski':
      return 'Walter Kowalski';
    case 'elena_vargas':
      return 'Elena Vargas';
    default:
      return 'Unassigned';
  }
}

function updateFanSentiment(state: FullGameState, delta: number, summary: string): void {
  if (delta === 0) {
    return;
  }
  const current = state.fanSentiment;
  const score = clampScore(current.score + delta);
  state.fanSentiment = {
    score,
    trend: score > current.score ? 'rising' : score < current.score ? 'falling' : 'stable',
    summary,
    updatedAt: timestamp(state),
  };
}

function updateFrontOffice(
  state: FullGameState,
  deltas: Parameters<typeof evaluateFrontOfficeState>[1],
): void {
  const current = state.frontOfficeState.get(state.userTeamId) ?? createFrontOfficeState(state.userTeamId);
  state.frontOfficeState.set(state.userTeamId, evaluateFrontOfficeState(current, deltas));
}

function updateOwner(state: FullGameState, delta: number, summary: string): void {
  if (delta === 0) {
    return;
  }
  const current = state.ownerState.get(state.userTeamId) ?? createOwnerState(state.userTeamId, getTeamBudget(state.userTeamId));
  state.ownerState.set(state.userTeamId, applyOwnerDecisionDelta(current, delta, summary));
}

function pushBriefing(state: FullGameState, item: BriefingItem): void {
  if (state.briefingQueue.some((entry) => entry.id === item.id)) {
    return;
  }
  state.briefingQueue.unshift(item);
}

function pushNews(state: FullGameState, item: FullGameState['news'][number]): void {
  if (state.news.some((entry) => entry.id === item.id)) {
    return;
  }
  state.news.unshift(item);
}

function applyTeamMorale(state: FullGameState, impact: number, summary: string): void {
  if (impact === 0) {
    return;
  }
  for (const player of state.players) {
    if (player.teamId !== state.userTeamId || player.rosterStatus !== 'MLB') {
      continue;
    }
    const current = state.playerMorale.get(player.id) ?? createInitialPlayerMorale(player, timestamp(state));
    state.playerMorale.set(player.id, applyMoraleEvent(player, current, {
      type: impact >= 0 ? 'win' : 'loss',
      impact,
      summary,
      timestamp: timestamp(state),
    }));
  }
  state.teamChemistry.set(
    state.userTeamId,
    calculateTeamChemistry(state.userTeamId, state.players, state.playerMorale),
  );
}

function projectedWins(state: FullGameState): { projected: number; gamesPlayed: number; wins: number; losses: number } {
  const record = state.seasonState.standings.getRecord(state.userTeamId);
  const wins = record?.wins ?? 0;
  const losses = record?.losses ?? 0;
  const gamesPlayed = wins + losses;
  return {
    projected: gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 162) : 81,
    gamesPlayed,
    wins,
    losses,
  };
}

function topPromotionCandidateCount(state: FullGameState): number {
  return state.minorLeagueState.developmentReports
    .filter((entry) => entry.teamId === state.userTeamId && entry.trajectory === 'ahead_of_curve')
    .slice(-8)
    .length;
}

export function getAssistantGmProfileModifiers(state: FullGameState): AssistantGmProfileModifiers {
  switch (state.franchise.assistantGMId) {
    case 'marcus_chen':
      return {
        tradeValuation: 4,
        development: -1,
        scouting: { pro: 0.025 },
        morale: -1,
        owner: 2,
        summary: 'Marcus sharpens trade valuation and pro reads, but the room feels colder after unsentimental moves.',
      };
    case 'walt_kowalski':
      return {
        tradeValuation: -1,
        development: -2,
        scouting: {},
        morale: 3,
        owner: -1,
        summary: 'Walt stabilizes the clubhouse and veteran trust, while prospect acceleration gets a shorter leash.',
      };
    case 'elena_vargas':
      return {
        tradeValuation: 0,
        development: 3,
        scouting: { international: 0.025 },
        morale: 2,
        owner: 1,
        summary: 'Elena improves development and international looks, with extra sensitivity around homegrown prospects.',
      };
    default:
      return {
        tradeValuation: 0,
        development: 0,
        scouting: {},
        morale: 0,
        owner: 0,
        summary: 'No assistant GM identity has been committed yet.',
      };
  }
}

export function getEffectiveScoutingAccuracy(
  state: FullGameState,
  domain: ScoutingAccuracyDomain,
  baseAccuracy = 0.7,
): EffectiveScoutingAccuracy {
  const philosophy = philosophyFromState(state);
  const directorFocus = state.franchise.scoutingDirector?.specialty ?? philosophy.scoutingFocus;
  const directorQuality = state.franchise.scoutingDirector
    ? ((state.franchise.scoutingDirector.evaluationAccuracy + state.franchise.scoutingDirector.networkStrength) / 2 - 60) / 1000
    : 0;
  const focusMatches =
    domain === 'draft' && directorFocus === 'draft'
      || domain === 'international' && directorFocus === 'international'
      || domain === 'pro' && directorFocus === 'pro_scouting';
  const philosophyMatches =
    domain === 'draft' && philosophy.scoutingFocus === 'draft'
      || domain === 'international' && philosophy.scoutingFocus === 'international'
      || domain === 'pro' && philosophy.scoutingFocus === 'pro_scouting';
  const agmBonus = getAssistantGmProfileModifiers(state).scouting[domain] ?? 0;
  const mismatchPenalty = focusMatches || philosophyMatches ? 0 : -0.008;
  const focusBonus = (focusMatches ? 0.05 : 0) + (philosophyMatches ? 0.02 : 0);
  const effectiveAccuracy = clampAccuracy(baseAccuracy + focusBonus + directorQuality + agmBonus + mismatchPenalty);
  const confidenceBonus = Math.round((effectiveAccuracy - clampAccuracy(baseAccuracy)) * 100);

  return {
    domain,
    baseAccuracy: clampAccuracy(baseAccuracy),
    effectiveAccuracy,
    confidenceBonus,
    summary: focusMatches || philosophyMatches || agmBonus > 0
      ? `${titleCase(domain)} reports are tighter because the scouting director is aligned there.`
      : confidenceBonus <= -1
        ? `${titleCase(domain)} reports are a little noisier outside the director's lane.`
        : `${titleCase(domain)} reports are near baseline reliability.`,
  };
}

export function scoreMandateAlignment(state: FullGameState): AlignmentScore {
  const philosophy = philosophyFromState(state);
  const pace = projectedWins(state);
  const owner = state.ownerState.get(state.userTeamId);
  let target = 82;
  let score = 58;

  switch (philosophy.seasonGoal) {
    case 'championship':
      target = Math.max(95, owner?.expectations.winsTarget ?? 95);
      score = 54 + ((pace.projected - target) * 1.8);
      break;
    case 'playoff':
      target = Math.max(87, owner?.expectations.winsTarget ?? 87);
      score = 56 + ((pace.projected - target) * 1.6);
      break;
    case 'rebuild': {
      const futureSignals = topPromotionCandidateCount(state);
      score = 63 + (futureSignals * 3) - Math.max(0, pace.projected - 84) * 0.8;
      target = 72;
      break;
    }
    case 'compete':
    default:
      target = 82;
      score = 60 + ((pace.projected - target) * 1.2) - Math.abs(pace.projected - 82) * 0.15;
      break;
  }

  return makeScore(
    score,
    pace.gamesPlayed === 0
      ? `${titleCase(philosophy.seasonGoal)} mandate is set; ownership will judge once games start.`
      : `${titleCase(philosophy.seasonGoal)} mandate is tracking toward ${pace.projected} wins against a ${target}-win pressure point.`,
  );
}

export function scoreSpendingAlignment(state: FullGameState): AlignmentScore {
  const philosophy = philosophyFromState(state);
  const owner = state.ownerState.get(state.userTeamId);
  const payroll = calculateTeamPayroll(state.userTeamId, state.players.filter((player) => player.teamId === state.userTeamId)).totalPayroll;
  const cap = normalizeMoney(owner?.payrollCap ?? owner?.expectations.payrollTarget ?? getTeamBudget(state.userTeamId));
  const ratio = cap > 0 ? payroll / cap : 0.85;
  let score = 58;

  switch (philosophy.spendingStyle) {
    case 'big_spender':
      score = 45 + (ratio * 42);
      if (philosophy.seasonGoal === 'championship' || philosophy.seasonGoal === 'playoff') {
        score += ratio >= 0.84 ? 8 : -8;
      }
      break;
    case 'penny_pincher':
      score = 76 - Math.max(0, ratio - 0.78) * 80;
      if (philosophy.seasonGoal === 'rebuild') {
        score += 7;
      }
      break;
    case 'balanced':
    default:
      score = 74 - Math.abs(ratio - 0.86) * 75;
      break;
  }

  return makeScore(
    score,
    `${titleCase(philosophy.spendingStyle)} posture is using ${Math.round(ratio * 100)}% of the current payroll lane.`,
  );
}

export function scoreTradeAlignment(state: FullGameState): AlignmentScore {
  const philosophy = philosophyFromState(state);
  const userTrades = state.tradeState.tradeHistory
    .filter((entry) => entry.fromTeamId === state.userTeamId || entry.toTeamId === state.userTeamId)
    .filter((entry) => entry.timestamp?.startsWith(`S${state.season}D`) ?? true);
  const averageFairness = userTrades.length > 0
    ? userTrades.reduce((sum, entry) => sum + entry.fairnessScore, 0) / userTrades.length
    : 0;
  const pace = projectedWins(state);
  const inRace = pace.projected >= 84 || pace.wins >= pace.losses;
  let score = 58 + clamp(averageFairness / 4, -12, 12);

  if (userTrades.length === 0) {
    if (philosophy.tradeApproach === 'buyer' && inRace && state.day >= 80) {
      score = 40;
    } else if (philosophy.tradeApproach === 'seller' && !inRace && state.day >= 80) {
      score = 48;
    } else {
      score = 57;
    }
  } else if (philosophy.tradeApproach === 'opportunistic') {
    score += averageFairness >= 8 ? 10 : averageFairness < -6 ? -12 : 2;
  } else if (philosophy.tradeApproach === 'buyer') {
    score += inRace ? 7 : -5;
  } else if (philosophy.tradeApproach === 'seller') {
    score += !inRace ? 7 : -7;
  }

  return makeScore(
    score,
    userTrades.length === 0
      ? `${titleCase(philosophy.tradeApproach)} posture has not logged a trade test yet.`
      : `${titleCase(philosophy.tradeApproach)} posture has ${userTrades.length} current-season trade test${userTrades.length === 1 ? '' : 's'} at ${averageFairness.toFixed(1)} average surplus.`,
  );
}

export function scoreDevelopmentAlignment(state: FullGameState): AlignmentScore {
  const philosophy = philosophyFromState(state);
  const latestReports = state.minorLeagueState.developmentReports
    .filter((entry) => entry.teamId === state.userTeamId)
    .slice(-12);
  const ahead = latestReports.filter((entry) => entry.trajectory === 'ahead_of_curve').length;
  const bust = latestReports.filter((entry) => entry.trajectory === 'bust_risk').length;
  const activeSetbacks = state.minorLeagueState.activeDevelopmentSetbacks
    .filter((entry) => {
      const player = state.players.find((candidate) => candidate.id === entry.playerId);
      return player?.teamId === state.userTeamId;
    }).length;
  let score = 58 + (ahead * 3) - (bust * 6) - (activeSetbacks * 5);

  if (philosophy.developmentStyle === 'aggressive') {
    score += ahead > 0 ? 7 : -2;
    score -= activeSetbacks * 3;
  } else if (philosophy.developmentStyle === 'patient') {
    score += activeSetbacks === 0 ? 6 : -3;
    score -= ahead >= 4 ? 4 : 0;
  } else {
    score += Math.abs(ahead - bust) <= 2 ? 5 : 0;
  }

  return makeScore(
    score,
    `${titleCase(philosophy.developmentStyle)} development has ${ahead} ahead-of-curve reports and ${activeSetbacks} active prospect risk flag${activeSetbacks === 1 ? '' : 's'}.`,
  );
}

export function scoreMediaAlignment(state: FullGameState): AlignmentScore {
  const philosophy = philosophyFromState(state);
  const flags = state.storyFlags.get(state.userTeamId) ?? [];
  const aligned = flags.filter((flag) => flag.startsWith('press_tone_aligned_')).length;
  const backlash = flags.filter((flag) => flag.startsWith('press_tone_backlash_')).length;
  const fanDelta = state.fanSentiment.score - 50;
  let score = 56 + (aligned * 5) - (backlash * 8) + (fanDelta * 0.2);

  if (philosophy.mediaTone === 'measured') {
    score += state.fanSentiment.trend === 'stable' ? 5 : 0;
  } else if (philosophy.mediaTone === 'confident') {
    score += state.fanSentiment.trend === 'rising' ? 6 : 0;
  } else if (philosophy.mediaTone === 'humble') {
    score += backlash === 0 ? 4 : -4;
  }

  return makeScore(
    score,
    `${titleCase(philosophy.mediaTone)} media posture has ${aligned} aligned response${aligned === 1 ? '' : 's'} and ${backlash} backlash marker${backlash === 1 ? '' : 's'}.`,
  );
}

function overallAlignmentScore(scores: AlignmentScore[]): AlignmentScore {
  const average = scores.reduce((sum, score) => sum + score.score, 0) / Math.max(1, scores.length);
  return makeScore(average, `Overall identity alignment is ${Math.round(average)} across mandate, spending, trade, development, and media.`);
}

export function getOwnerAlignmentDecisionScore(state: FullGameState): number {
  const mandate = scoreMandateAlignment(state);
  const spending = scoreSpendingAlignment(state);
  const trade = scoreTradeAlignment(state);
  return clamp(Math.round(((mandate.impact * 0.5) + (spending.impact * 0.25) + (trade.impact * 0.25))), -8, 8);
}

export function applyOnboardingIdentityBaseline(state: FullGameState): void {
  const baselineFlag = 'onboarding_identity_baseline_v1';
  if (hasStoryFlag(state, baselineFlag)) {
    return;
  }

  const philosophy = philosophyFromState(state);
  const owner = state.ownerState.get(state.userTeamId) ?? createOwnerState(state.userTeamId, getTeamBudget(state.userTeamId));
  const mandatePressure: Record<GMPhilosophy['seasonGoal'], { wins: number; playoff: boolean; pressure: number; patience: number }> = {
    championship: { wins: 96, playoff: true, pressure: 14, patience: -5 },
    playoff: { wins: 88, playoff: true, pressure: 7, patience: -1 },
    compete: { wins: 82, playoff: false, pressure: 1, patience: 2 },
    rebuild: { wins: 72, playoff: false, pressure: -11, patience: 10 },
  };
  const mandate = mandatePressure[philosophy.seasonGoal];
  const spendingWillingness = philosophy.spendingStyle === 'big_spender'
    ? 'lavish'
    : philosophy.spendingStyle === 'penny_pincher'
      ? 'cheap'
      : 'moderate';

  state.ownerState.set(state.userTeamId, {
    ...owner,
    patience: clampScore(owner.patience + mandate.patience + getAssistantGmProfileModifiers(state).owner),
    confidence: clampScore(owner.confidence + (mandate.pressure > 0 ? 2 : 1)),
    expectations: {
      ...owner.expectations,
      winsTarget: mandate.wins,
      playoffTarget: mandate.playoff,
    },
    spendingWillingness,
    winNowPressure: clampScore((owner.winNowPressure ?? 50) + mandate.pressure),
    summary: `${titleCase(philosophy.seasonGoal)} mandate established with a ${titleCase(philosophy.spendingStyle)} resource posture.`,
  });

  const agm = getAssistantGmProfileModifiers(state);
  updateFrontOffice(state, {
    draftDelta: (philosophy.scoutingFocus === 'draft' ? 5 : philosophy.scoutingFocus === 'international' ? 2 : 0)
      + (state.franchise.assistantGMId === 'elena_vargas' ? 3 : 0),
    tradeDelta: (philosophy.tradeApproach === 'opportunistic' ? 3 : philosophy.tradeApproach === 'buyer' ? 2 : 1)
      + agm.tradeValuation,
    freeAgencyDelta: philosophy.spendingStyle === 'big_spender' ? 4 : philosophy.spendingStyle === 'penny_pincher' ? -2 : 1,
    playoffDelta: philosophy.seasonGoal === 'championship' ? 3 : philosophy.seasonGoal === 'playoff' ? 2 : 0,
  });

  applyTeamMorale(
    state,
    agm.morale,
    `${assistantGmLabel(state.franchise.assistantGMId)} set the Day One clubhouse tone.`,
  );

  const fanDelta =
    (philosophy.mediaTone === 'confident' ? 3 : philosophy.mediaTone === 'humble' ? -1 : 1)
    + (philosophy.spendingStyle === 'big_spender' ? 3 : philosophy.spendingStyle === 'penny_pincher' ? -2 : 0);
  updateFanSentiment(
    state,
    fanDelta,
    `Fans read the new front office as ${titleCase(philosophy.mediaTone)} and ${titleCase(philosophy.spendingStyle)}.`,
  );

  addStoryFlag(state, baselineFlag);
  addStoryFlag(state, `onboarding_agm_${state.franchise.assistantGMId ?? 'none'}`);
  addStoryFlag(state, `onboarding_mandate_${philosophy.seasonGoal}`);
  addStoryFlag(state, `onboarding_development_${philosophy.developmentStyle}`);
  addStoryFlag(state, `onboarding_scouting_${philosophy.scoutingFocus}`);
  addStoryFlag(state, `onboarding_spending_${philosophy.spendingStyle}`);
  addStoryFlag(state, `onboarding_trade_${philosophy.tradeApproach}`);
  addStoryFlag(state, `onboarding_media_${philosophy.mediaTone}`);

  const body = [
    `${assistantGmLabel(state.franchise.assistantGMId)} is now shaping the room.`,
    `Mandate: ${titleCase(philosophy.seasonGoal)}.`,
    `Scouting: ${titleCase(philosophy.scoutingFocus)}.`,
    `Operating posture: ${titleCase(philosophy.spendingStyle)}, ${titleCase(philosophy.tradeApproach)}, ${titleCase(philosophy.developmentStyle)} development, ${titleCase(philosophy.mediaTone)} media.`,
  ].join(' ');

  pushBriefing(state, {
    id: `front-office-identity-baseline-${state.userTeamId}`,
    priority: 2,
    category: 'owner',
    tag: 'ANALYSIS',
    headline: 'Day One identity is now on the ledger.',
    body,
    relatedTeamIds: [state.userTeamId],
    relatedPlayerIds: [],
    timestamp: timestamp(state),
    acknowledged: false,
  });
  pushNews(state, {
    id: `front-office-identity-news-${state.userTeamId}`,
    headline: `${teamLabel(state.userTeamId)} front office sets its operating identity`,
    body,
    priority: 3,
    category: 'league_event',
    tag: 'ANALYSIS',
    timestamp: timestamp(state),
    relatedPlayerIds: [],
    relatedTeamIds: [state.userTeamId],
    read: false,
  });
}

export function applyMonthlyDevelopmentIdentity(state: FullGameState, month: number): void {
  const philosophy = philosophyFromState(state);
  const agm = getAssistantGmProfileModifiers(state);
  const postureDelta = philosophy.developmentStyle === 'aggressive'
    ? 2.4
    : philosophy.developmentStyle === 'patient'
      ? 0.8
      : 0;
  const riskDelta = philosophy.developmentStyle === 'aggressive'
    ? 0.045
    : philosophy.developmentStyle === 'patient'
      ? -0.045
      : -0.01;
  const agmDelta = agm.development * 0.65;

  const adjustedLedger = state.minorLeagueState.developmentLedger.map((entry) => {
    if (entry.teamId !== state.userTeamId || entry.season !== state.season || entry.month !== month) {
      return entry;
    }
    return {
      ...entry,
      progressScore: Math.round((entry.progressScore + postureDelta + agmDelta) * 100) / 100,
      breakoutProbability: Math.round(clamp(entry.breakoutProbability + (postureDelta / 100) + Math.max(0, agmDelta / 120), 0, 1) * 1000) / 1000,
      bustRisk: Math.round(clamp(entry.bustRisk + riskDelta - Math.max(0, agmDelta / 160), 0, 1) * 1000) / 1000,
    };
  });

  state.minorLeagueState = {
    ...state.minorLeagueState,
    developmentLedger: adjustedLedger,
    developmentReports: state.minorLeagueState.developmentReports.map((entry) => {
      if (entry.teamId !== state.userTeamId || entry.season !== state.season || entry.month !== month) {
        return entry;
      }
      const ledger = adjustedLedger.find((candidate) =>
        candidate.playerId === entry.playerId
        && candidate.season === entry.season
        && candidate.month === entry.month,
      );
      const adjustedProgress = (ledger?.progressScore ?? 0) + postureDelta + agmDelta;
      const trajectory = adjustedProgress >= 10
        ? 'ahead_of_curve'
        : adjustedProgress >= 2
          ? 'on_track'
          : adjustedProgress >= -5
            ? 'below_expectations'
            : 'bust_risk';
      return {
        ...entry,
        trajectory,
        summary: `${entry.summary} ${titleCase(philosophy.developmentStyle)} posture and ${assistantGmLabel(state.franchise.assistantGMId)} adjusted the monthly risk curve.`,
      };
    }),
  };
}

export function adjustPromotionCandidateForIdentity<T extends { playerId: string; score: number; reason: string }>(
  state: FullGameState,
  candidate: T,
): T {
  const philosophy = philosophyFromState(state);
  const agm = getAssistantGmProfileModifiers(state);
  const postureDelta = philosophy.developmentStyle === 'aggressive'
    ? 9
    : philosophy.developmentStyle === 'patient'
      ? -7
      : 0;
  const delta = postureDelta + agm.development;
  if (delta === 0) {
    return candidate;
  }
  return {
    ...candidate,
    score: Math.max(0, candidate.score + delta),
    reason: `${candidate.reason} ${titleCase(philosophy.developmentStyle)} development posture ${delta > 0 ? 'pushes' : 'slows'} the recommendation by ${Math.abs(delta)} points.`,
  };
}

function deterministicGate(scope: string): number {
  let hash = 2166136261;
  for (let index = 0; index < scope.length; index += 1) {
    hash ^= scope.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 0xffffffff;
}

export function adjustDevelopmentSetbackForIdentity(
  state: Pick<FullGameState, 'season' | 'userTeamId' | 'franchise'>,
  player: GeneratedPlayer,
  setback: DevelopmentSetback,
  month: number,
): DevelopmentSetback | null {
  if (player.teamId !== state.userTeamId) {
    return setback;
  }
  const philosophy = philosophyFromState(state as FullGameState);
  const scope = `${state.season}:${month}:${player.id}:${setback.type}:${philosophy.developmentStyle}:${state.franchise.assistantGMId ?? 'none'}`;
  const isPositive = setback.overallModifier > 0;

  if (philosophy.developmentStyle === 'patient' && !isPositive && deterministicGate(scope) < 0.4) {
    return null;
  }

  const agm = state.franchise.assistantGMId;
  const modifierDelta =
    philosophy.developmentStyle === 'aggressive' && !isPositive
      ? -2
      : philosophy.developmentStyle === 'patient' && !isPositive
        ? 2
        : philosophy.developmentStyle === 'aggressive' && isPositive
          ? 1
          : 0;
  const agmDelta = agm === 'elena_vargas' && !isPositive
    ? 2
    : agm === 'walt_kowalski' && isPositive
      ? -1
      : 0;
  const overallModifier = setback.overallModifier + modifierDelta + agmDelta;

  return {
    ...setback,
    overallModifier,
    summary: `${setback.summary} ${titleCase(philosophy.developmentStyle)} development posture and ${assistantGmLabel(agm)} shaped the risk outcome.`,
  };
}

export function applyMonthlyFrontOfficeConsequences(
  state: FullGameState,
  context: MonthlyFrontOfficeContext,
): void {
  const flag = `front_office_monthly_${state.season}_${context.month}`;
  if (hasStoryFlag(state, flag)) {
    return;
  }

  const mandate = scoreMandateAlignment(state);
  const spending = scoreSpendingAlignment(state);
  const trade = scoreTradeAlignment(state);
  const development = scoreDevelopmentAlignment(state);
  const media = scoreMediaAlignment(state);
  const overall = overallAlignmentScore([mandate, spending, trade, development, media]);
  const ownerDelta = clamp(Math.round((mandate.impact * 0.35) + (spending.impact * 0.18) + (trade.impact * 0.18)), -4, 4);
  const fanDelta = clamp(Math.round((spending.impact * 0.35) + (media.impact * 0.45) + (mandate.impact * 0.2)), -5, 5);
  const chemistryDelta = clamp(Math.round((development.impact * 0.7) + (media.impact * 0.2)), -4, 4);

  updateOwner(
    state,
    ownerDelta,
    ownerDelta >= 0
      ? `Ownership sees the front-office identity holding through month ${context.month}.`
      : `Ownership is pressing on front-office identity drift in month ${context.month}.`,
  );
  updateFrontOffice(state, {
    draftDelta: development.impact * 0.35,
    tradeDelta: trade.impact * 0.55,
    freeAgencyDelta: spending.impact * 0.45,
    playoffDelta: mandate.impact * 0.35,
  });
  updateFanSentiment(
    state,
    fanDelta,
    fanDelta >= 0
      ? 'Fans can see the front-office plan matching the product.'
      : 'Fans are questioning whether the public plan matches the roster.',
  );
  applyTeamMorale(
    state,
    chemistryDelta,
    chemistryDelta >= 0
      ? 'The clubhouse feels the front office staying coherent.'
      : 'The clubhouse feels the front office sending mixed signals.',
  );
  addStoryFlag(state, flag);

  const meaningful = Math.abs(ownerDelta) >= 2
    || Math.abs(fanDelta) >= 2
    || Math.abs(chemistryDelta) >= 2
    || overall.score >= 68
    || overall.score <= 44;
  if (!meaningful) {
    return;
  }

  const headline = overall.score >= 58
    ? 'Monthly identity check is helping the room.'
    : 'Monthly identity check shows pressure.';
  const body = [
    overall.summary,
    mandate.summary,
    spending.summary,
    trade.summary,
    development.summary,
    media.summary,
  ].join(' ');

  pushBriefing(state, {
    id: `front-office-monthly-${state.season}-${context.month}`,
    priority: overall.score >= 58 ? 3 : 2,
    category: overall.score >= 58 ? 'news' : 'owner',
    tag: 'ANALYSIS',
    headline,
    body,
    relatedTeamIds: [state.userTeamId],
    relatedPlayerIds: [],
    timestamp: timestamp(state),
    acknowledged: false,
  });
  pushNews(state, {
    id: `front-office-monthly-news-${state.season}-${context.month}`,
    headline,
    body,
    priority: overall.score >= 58 ? 4 : 3,
    category: 'league_event',
    tag: 'ANALYSIS',
    timestamp: timestamp(state),
    relatedPlayerIds: [],
    relatedTeamIds: [state.userTeamId],
    read: false,
  });
}

export function applyPressToneConsequences(
  state: FullGameState,
  conferenceId: string,
  response: {
    tone: 'confident' | 'measured' | 'deflect';
    fanSentimentDelta?: number;
    quote?: string;
  },
): void {
  const philosophy = philosophyFromState(state);
  const aligned =
    philosophy.mediaTone === 'confident' && response.tone === 'confident'
    || philosophy.mediaTone === 'measured' && response.tone === 'measured'
    || philosophy.mediaTone === 'humble' && (response.tone === 'deflect' || response.tone === 'measured');
  const pace = projectedWins(state);
  const confidentBacklash = response.tone === 'confident' && pace.gamesPlayed >= 20 && pace.losses > pace.wins;
  const alignmentDelta = aligned ? 2 : -2;
  const backlashDelta = confidentBacklash ? -3 : 0;
  const fanDelta = (response.fanSentimentDelta ?? 0) + alignmentDelta + backlashDelta;
  const flagPrefix = aligned && !confidentBacklash ? 'press_tone_aligned' : 'press_tone_backlash';
  const flag = `${flagPrefix}_${state.season}_${state.day}_${response.tone}`;

  updateFanSentiment(
    state,
    fanDelta,
    aligned && !confidentBacklash
      ? `The ${titleCase(philosophy.mediaTone)} media posture matched the latest answer.`
      : `The latest press answer drifted from the ${titleCase(philosophy.mediaTone)} media posture.`,
  );
  if (!aligned || confidentBacklash) {
    updateOwner(state, -1, 'Ownership noticed the media posture creating avoidable pressure.');
  }
  addStoryFlag(state, flag);

  const id = `front-office-press-tone-${conferenceId}-${response.tone}`;
  pushBriefing(state, {
    id,
    priority: aligned && !confidentBacklash ? 4 : 2,
    category: aligned && !confidentBacklash ? 'news' : 'owner',
    tag: 'ANALYSIS',
    headline: aligned && !confidentBacklash ? 'Press tone matched the Day One posture.' : 'Press tone created identity friction.',
    body: `${response.quote ? `"${response.quote}" ` : ''}${titleCase(response.tone)} response versus ${titleCase(philosophy.mediaTone)} Day One tone: ${fanDelta >= 0 ? '+' : ''}${fanDelta} fan sentiment.`,
    relatedTeamIds: [state.userTeamId],
    relatedPlayerIds: [],
    timestamp: timestamp(state),
    acknowledged: false,
  });
}

export function buildFrontOfficeIdentityView(state: FullGameState): FrontOfficeIdentityView {
  const philosophy = philosophyFromState(state);
  const draftAccuracy = getEffectiveScoutingAccuracy(state, 'draft');
  const internationalAccuracy = getEffectiveScoutingAccuracy(state, 'international');
  const proAccuracy = getEffectiveScoutingAccuracy(state, 'pro');
  const mandate = scoreMandateAlignment(state);
  const spending = scoreSpendingAlignment(state);
  const trade = scoreTradeAlignment(state);
  const development = scoreDevelopmentAlignment(state);
  const media = scoreMediaAlignment(state);
  const overall = overallAlignmentScore([mandate, spending, trade, development, media]);
  const assistantGM = state.franchise.assistantGMId;
  const recentConsequence = state.briefingQueue.find((entry) =>
    entry.id.startsWith('front-office-identity-')
    || entry.id.startsWith('front-office-monthly-')
    || entry.id.startsWith('front-office-press-tone-'),
  ) ?? null;

  return {
    assistantGM: {
      id: assistantGM ?? null,
      name: assistantGmLabel(assistantGM),
      focus: getAssistantGmProfileModifiers(state).summary,
      upside: assistantGM === 'marcus_chen'
        ? 'Trade valuation, pro scouting, contract discipline'
        : assistantGM === 'walt_kowalski'
          ? 'Clubhouse trust, chemistry stability, veteran buy-in'
          : assistantGM === 'elena_vargas'
            ? 'Player development, international scouting, prospect trust'
            : 'No AGM effect active',
      watchout: assistantGM === 'marcus_chen'
        ? 'Cold roster moves can bruise morale.'
        : assistantGM === 'walt_kowalski'
          ? 'Prospect acceleration is more conservative.'
          : assistantGM === 'elena_vargas'
            ? 'Homegrown prospect selloffs carry extra heat.'
            : 'Choose an AGM to set this lane.',
    },
    scoutingDirector: state.franchise.scoutingDirector
      ? {
        name: state.franchise.scoutingDirector.name,
        focus: titleCase(state.franchise.scoutingDirector.specialty),
        draftAccuracy: draftAccuracy.effectiveAccuracy,
        internationalAccuracy: internationalAccuracy.effectiveAccuracy,
        proAccuracy: proAccuracy.effectiveAccuracy,
      }
      : null,
    philosophy: {
      seasonGoal: titleCase(philosophy.seasonGoal),
      developmentStyle: titleCase(philosophy.developmentStyle),
      scoutingFocus: titleCase(philosophy.scoutingFocus),
      spendingStyle: titleCase(philosophy.spendingStyle),
      tradeApproach: titleCase(philosophy.tradeApproach),
      mediaTone: titleCase(philosophy.mediaTone),
    },
    alignment: {
      overall,
      mandate,
      spending,
      trade,
      development,
      media,
    },
    visibleEffects: [
      `${titleCase(philosophy.seasonGoal)} mandate changes owner win target and pressure.`,
      `${titleCase(philosophy.scoutingFocus)} scouting changes report accuracy.`,
      `${titleCase(philosophy.developmentStyle)} development changes monthly progress and prospect risk.`,
      `${titleCase(philosophy.mediaTone)} media tone changes fan and owner reaction to press answers.`,
    ],
    recentConsequence: recentConsequence
      ? {
        headline: recentConsequence.headline,
        body: recentConsequence.body,
        timestamp: recentConsequence.timestamp,
      }
      : null,
  };
}
