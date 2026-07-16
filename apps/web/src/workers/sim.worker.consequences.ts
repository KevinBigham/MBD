import {
  appendConsequenceWatchers,
  applyMoraleEvent,
  applyOwnerDecisionDelta,
  buildPostseasonConsequenceBundle,
  buildRetirementConsequenceBundle,
  buildSigningConsequenceBundle,
  buildTradeAftermathChain,
  buildTradeConsequenceBundle,
  calculateTeamChemistry,
  calculateTeamPayroll,
  comparePackages,
  createFrontOfficeState,
  createInitialPlayerMorale,
  createOwnerState,
  deduplicateNews,
  deriveTradeDeadlineMode,
  evaluateFrontOfficeState,
  generateTradeDialogue,
  getDaysUntilTradeDeadline,
  getTeamBudget,
  getTeamById,
  getTradeDeadlineDay,
  type ConsequenceBundle,
  type UserPostseasonOutcome,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers';
import { createStableWorkerRng, getTeamPlayers } from './sim.worker.helpers';
import { rebuildBriefing } from './sim.worker.narrative';

function updateFrontOffice(
  state: FullGameState,
  deltas: Parameters<typeof evaluateFrontOfficeState>[1],
) {
  const current = state.frontOfficeState.get(state.userTeamId) ?? createFrontOfficeState(state.userTeamId);
  state.frontOfficeState.set(state.userTeamId, evaluateFrontOfficeState(current, deltas));
}

function addStoryFlag(state: FullGameState, flag: string) {
  const existing = state.storyFlags.get(state.userTeamId) ?? [];
  if (!existing.includes(flag)) {
    state.storyFlags.set(state.userTeamId, [...existing, flag]);
  }
}

function queueContractReactionWatcher(
  state: FullGameState,
  playerId: string,
  playerName: string,
  annualSalary: number,
  years: number,
  marketValue: number,
) {
  state.consequenceWatchers = appendConsequenceWatchers(state.consequenceWatchers, [{
    id: `contract-reaction-${state.season}-${state.day}-${playerId}`,
    type: 'contract_reaction',
    createdSeason: state.season,
    createdDay: state.day,
    expiresSeason: state.season + 1,
    expiresDay: 1,
    resolved: false,
    context: {
      playerId,
      playerName,
      annualSalary,
      years,
      marketValue,
    },
  }]);
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function buildTradeDialoguePayload(
  state: FullGameState,
  partnerTeamId: string,
  offerValue: number,
  requestValue: number,
) {
  const team = getTeamById(partnerTeamId);
  const record = state.seasonState.standings.getRecord(partnerTeamId);
  const divisionStandings = team ? state.seasonState.standings.getDivisionStandings(team.division) : [];
  const standingEntry = divisionStandings.find((entry) => entry.teamId === partnerTeamId);
  const totalGames = (record?.wins ?? 0) + (record?.losses ?? 0);
  const daysUntilDeadline = state.phase === 'regular' && state.day <= getTradeDeadlineDay()
    ? getDaysUntilTradeDeadline(state.day)
    : null;
  const mode = deriveTradeDeadlineMode({
    winPct: totalGames > 0 ? (record?.wins ?? 0) / totalGames : 0.5,
    gamesBack: standingEntry?.gamesBack ?? 0,
    daysUntilDeadline,
    gmPersonality: state.gmPersonalities.get(partnerTeamId) ?? 'analytical',
  });

  return generateTradeDialogue(
    createStableWorkerRng(state, `trade-dialogue:${partnerTeamId}:offer:${Math.round(offerValue)}:${Math.round(requestValue)}`),
    {
      teamName: teamLabel(partnerTeamId),
      gmPersonality: state.gmPersonalities.get(partnerTeamId) ?? 'analytical',
      mode,
      daysUntilDeadline,
      offerValue,
      requestValue,
      negotiationType: 'offer',
    },
  );
}

function injectTradeDialogueStory(
  state: FullGameState,
  bundle: ConsequenceBundle,
  partnerTeamId: string,
  offerValue: number,
  requestValue: number,
  relatedPlayerIds: string[],
) {
  const dialogue = buildTradeDialoguePayload(state, partnerTeamId, offerValue, requestValue);
  const timestamp = `S${state.season}D${state.day}`;
  const dialogueLine = dialogue.lines.at(-1) ?? dialogue.headline;

  if (bundle.newsItems[0]) {
    bundle.newsItems[0] = {
      ...bundle.newsItems[0],
      body: `${bundle.newsItems[0].body} ${dialogueLine}`.trim(),
    };
  }

  if (bundle.briefingItems[0]) {
    bundle.briefingItems[0] = {
      ...bundle.briefingItems[0],
      body: `${bundle.briefingItems[0].body} ${dialogueLine}`.trim(),
    };
  }

  bundle.newsItems = [{
    id: `trade-dialogue-${state.season}-${state.day}-${partnerTeamId}-${Math.round(offerValue)}-${Math.round(requestValue)}`,
    headline: dialogue.headline,
    body: dialogue.lines.join(' '),
    priority: 2,
    category: 'trade',
    tag: 'ANALYSIS',
    timestamp,
    relatedPlayerIds: [],
    relatedTeamIds: [state.userTeamId, partnerTeamId],
    read: false,
  }, ...bundle.newsItems];

  bundle.briefingItems = [{
    id: `brief-trade-dialogue-${state.season}-${state.day}-${partnerTeamId}`,
    priority: 2,
    category: 'news',
    tag: 'ANALYSIS',
    headline: dialogue.headline,
    body: dialogue.lines.join(' '),
    relatedTeamIds: [state.userTeamId, partnerTeamId],
    relatedPlayerIds,
    timestamp,
    acknowledged: false,
  }, ...bundle.briefingItems];
}

function homegrownDraftSeason(
  state: FullGameState,
  playerId: string,
): number | null {
  const bond = state.prospectBonds.find((entry) => entry.prospectId === playerId);
  const origin = state.playerOrigins.get(playerId);
  if (!bond || !origin || origin.originTeamId !== state.userTeamId) {
    return null;
  }

  return origin.draftSeason ?? origin.acquiredSeason ?? bond.draftedSeason;
}

function decorateTradeAftermathWatchers(
  state: FullGameState,
  watchers: FullGameState['consequenceWatchers'],
  tradedPlayerIds: string[],
) {
  const decorated = watchers.map((watcher) => {
    if (watcher.type !== 'trade_aftermath') {
      return watcher;
    }

    const tradedPlayerId = typeof watcher.context.tradedPlayerId === 'string'
      ? watcher.context.tradedPlayerId
      : null;
    if (!tradedPlayerId) {
      return watcher;
    }

    const draftSeason = homegrownDraftSeason(state, tradedPlayerId);
    if (draftSeason == null) {
      return watcher;
    }

    return {
      ...watcher,
      context: {
        ...watcher.context,
        homegrownDraftSeason: draftSeason,
      },
    };
  });

  const coveredPlayers = new Set(
    decorated
      .filter((watcher) => watcher.type === 'trade_aftermath')
      .map((watcher) => String(watcher.context.tradedPlayerId ?? ''))
      .filter(Boolean),
  );

  const additions = state.players
    .filter((player) => tradedPlayerIds.includes(player.id) && player.teamId !== state.userTeamId && !coveredPlayers.has(player.id))
    .map((player) => {
      const draftSeason = homegrownDraftSeason(state, player.id);
      if (draftSeason == null) {
        return null;
      }

      return {
        id: `trade-homegrown-review-${state.season}-${state.day}-${player.id}`,
        type: 'trade_aftermath' as const,
        createdSeason: state.season,
        createdDay: state.day,
        expiresSeason: state.season + 1,
        expiresDay: 1,
        resolved: false,
        context: {
          kind: 'season_review',
          teamId: state.userTeamId,
          tradedPlayerId: player.id,
          tradedPlayerName: `${player.firstName} ${player.lastName}`,
          replacementPlayerId: null,
          replacementPlayerName: 'the replacement plan',
          homegrownDraftSeason: draftSeason,
        },
      };
    })
    .filter((watcher): watcher is NonNullable<typeof watcher> => watcher != null);

  return [...decorated, ...additions];
}

function applyConsequenceBundle(state: FullGameState, bundle: ConsequenceBundle) {
  if (bundle.newsItems.length > 0) {
    state.news = deduplicateNews([...bundle.newsItems, ...state.news]);
  }

  if (bundle.briefingItems.length > 0) {
    state.briefingQueue = [...bundle.briefingItems, ...state.briefingQueue];
  }

  for (const entry of bundle.playerMoraleEvents) {
    const player = state.players.find((candidate) => candidate.id === entry.playerId);
    if (!player) continue;
    const current = state.playerMorale.get(player.id) ?? createInitialPlayerMorale(player, entry.event.timestamp);
    state.playerMorale.set(player.id, applyMoraleEvent(player, current, entry.event));
  }

  if (bundle.ownerDecisionDelta) {
    const currentOwner = state.ownerState.get(state.userTeamId)
      ?? createOwnerState(state.userTeamId, getTeamBudget(state.userTeamId));
    state.ownerState.set(
      state.userTeamId,
      applyOwnerDecisionDelta(
        currentOwner,
        bundle.ownerDecisionDelta.delta,
        bundle.ownerDecisionDelta.summary,
      ),
    );
  }

  for (const flag of bundle.storyFlags) {
    addStoryFlag(state, flag);
  }

  state.teamChemistry.set(
    state.userTeamId,
    calculateTeamChemistry(state.userTeamId, state.players, state.playerMorale),
  );
  rebuildBriefing(state);
}

export function applySeriesOutcomeConsequences(
  state: FullGameState,
  winnerId: string,
  loserId: string,
) {
  if (winnerId !== state.userTeamId && loserId !== state.userTeamId) {
    return;
  }

  const userAdvanced = winnerId === state.userTeamId;
  const opponentId = userAdvanced ? loserId : winnerId;
  const summary = userAdvanced
    ? `${teamLabel(state.userTeamId)} advanced past ${teamLabel(opponentId)}.`
    : `${teamLabel(state.userTeamId)} was knocked out by ${teamLabel(opponentId)}.`;
  const impact = userAdvanced ? 6 : -7;

  for (const player of getTeamPlayers(state.userTeamId)) {
    if (player.rosterStatus !== 'MLB') continue;
    const current = state.playerMorale.get(player.id) ?? createInitialPlayerMorale(player, `S${state.season}D${state.day}`);
    state.playerMorale.set(player.id, applyMoraleEvent(player, current, {
      type: userAdvanced ? 'win' : 'loss',
      impact,
      summary,
      timestamp: `S${state.season}D${state.day}`,
    }));
  }

  const currentOwner = state.ownerState.get(state.userTeamId)
    ?? createOwnerState(state.userTeamId, getTeamBudget(state.userTeamId));
  state.ownerState.set(
    state.userTeamId,
    applyOwnerDecisionDelta(
      currentOwner,
      userAdvanced ? 5 : -8,
      userAdvanced ? `Ownership loved the series win over ${teamLabel(opponentId)}.` : summary,
    ),
  );

  state.teamChemistry.set(
    state.userTeamId,
    calculateTeamChemistry(state.userTeamId, state.players, state.playerMorale),
  );
  updateFrontOffice(state, {
    draftDelta: 0,
    tradeDelta: 0,
    freeAgencyDelta: 0,
    playoffDelta: userAdvanced ? 4 : -3,
  });
  rebuildBriefing(state);
}

export function applyTradeConsequences(
  state: FullGameState,
  offeredIds: string[],
  requestedIds: string[],
  partnerTeamId: string,
  preTradeUserPlayers: typeof state.players,
  preTradePartnerPlayers: typeof state.players,
) {
  const comparison = comparePackages(
    preTradeUserPlayers.filter((player) => offeredIds.includes(player.id)),
    preTradePartnerPlayers.filter((player) => requestedIds.includes(player.id)),
  );
  const ownerState = state.ownerState.get(state.userTeamId)
    ?? createOwnerState(state.userTeamId, getTeamBudget(state.userTeamId));
  const bundle = buildTradeConsequenceBundle({
    rng: state.rng.fork(),
    season: state.season,
    day: state.day,
    userTeamId: state.userTeamId,
    partnerTeamId,
    acquiredPlayers: state.players.filter((player) => requestedIds.includes(player.id)),
    tradedAwayPlayers: state.players.filter((player) => offeredIds.includes(player.id)),
    remainingUserPlayers: getTeamPlayers(state.userTeamId).filter(
      (player) => player.rosterStatus === 'MLB' && !requestedIds.includes(player.id),
    ),
    userFairness: comparison.fairness,
    payrollAfterTrade: calculateTeamPayroll(state.userTeamId, getTeamPlayers(state.userTeamId)).totalPayroll,
    payrollTarget: ownerState.expectations.payrollTarget,
  });
  injectTradeDialogueStory(
    state,
    bundle,
    partnerTeamId,
    comparison.requestValue,
    comparison.offerValue,
    [...requestedIds, ...offeredIds],
  );

  applyConsequenceBundle(state, bundle);
  state.consequenceWatchers = appendConsequenceWatchers(
    state.consequenceWatchers,
    decorateTradeAftermathWatchers(state, buildTradeAftermathChain({
      rng: state.rng.fork(),
      season: state.season,
      day: state.day,
      userTeamId: state.userTeamId,
      tradedAwayPlayers: preTradeUserPlayers.filter((player) => offeredIds.includes(player.id)),
      replacementPlayers: state.players.filter((player) => requestedIds.includes(player.id)),
      seasonsWithTeamByPlayerId: Object.fromEntries(
        preTradeUserPlayers
          .filter((player) => offeredIds.includes(player.id))
          .map((player) => [player.id, Math.max(0, Math.floor((state.serviceTime.get(player.id) ?? player.serviceTimeDays ?? 0) / 172))]),
      ),
    }), offeredIds),
  );
  updateFrontOffice(state, {
    draftDelta: 0,
    tradeDelta: Math.max(-10, Math.min(10, comparison.fairness / 7)),
    freeAgencyDelta: 0,
    playoffDelta: 0,
  });
}

export function applySigningConsequences(
  state: FullGameState,
  playerId: string,
  annualSalary: number,
  years: number,
  marketValue: number,
) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;

  const ownerState = state.ownerState.get(state.userTeamId)
    ?? createOwnerState(state.userTeamId, getTeamBudget(state.userTeamId));
  const bundle = buildSigningConsequenceBundle({
    rng: state.rng.fork(),
    season: state.season,
    day: state.day,
    userTeamId: state.userTeamId,
    player,
    annualSalary,
    years,
    marketValue,
    payrollAfterSigning: calculateTeamPayroll(state.userTeamId, getTeamPlayers(state.userTeamId)).totalPayroll,
    payrollTarget: ownerState.expectations.payrollTarget,
    remainingUserPlayers: getTeamPlayers(state.userTeamId).filter(
      (candidate) => candidate.rosterStatus === 'MLB' && candidate.id !== playerId,
    ),
  });

  applyConsequenceBundle(state, bundle);
  queueContractReactionWatcher(
    state,
    player.id,
    `${player.firstName} ${player.lastName}`,
    annualSalary,
    years,
    marketValue,
  );
  const surplus = marketValue - annualSalary;
  updateFrontOffice(state, {
    draftDelta: 0,
    tradeDelta: 0,
    freeAgencyDelta: Math.max(-8, Math.min(8, (surplus / Math.max(1, marketValue)) * 10)),
    playoffDelta: 0,
  });
}

export function applyAISigningConsequences(
  state: FullGameState,
  playerId: string,
  teamId: string,
  annualSalary: number,
  years: number,
  marketValue: number,
) {
  if (teamId === state.userTeamId) return;

  const userDivision = getTeamById(state.userTeamId)?.division;
  const signingDivision = getTeamById(teamId)?.division;
  if (!userDivision || !signingDivision || userDivision !== signingDivision) return;

  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) return;

  const bundle = buildSigningConsequenceBundle({
    rng: state.rng.fork(),
    season: state.season,
    day: state.day,
    userTeamId: teamId,
    player,
    annualSalary,
    years,
    marketValue,
    payrollAfterSigning: calculateTeamPayroll(teamId, getTeamPlayers(teamId)).totalPayroll,
    payrollTarget: state.ownerState.get(teamId)?.payrollCap
      ?? state.ownerState.get(teamId)?.annualBudget
      ?? getTeamBudget(teamId),
    remainingUserPlayers: getTeamPlayers(teamId).filter(
      (candidate) => candidate.rosterStatus === 'MLB' && candidate.id !== playerId,
    ),
  });

  if (bundle.newsItems.length > 0) {
    state.news = deduplicateNews([...bundle.newsItems, ...state.news]);
  }

  if (bundle.briefingItems.length > 0) {
    state.briefingQueue = [...bundle.briefingItems, ...state.briefingQueue];
  }

  rebuildBriefing(state);
}

function deriveUserPostseasonOutcome(state: FullGameState): UserPostseasonOutcome {
  const bracket = state.playoffBracket;
  if (!bracket) return 'missed_playoffs';
  if (bracket.champion === state.userTeamId) return 'champion';
  const userSeriesLoss = bracket.series.find((series) => series.loserId === state.userTeamId);
  if (!userSeriesLoss) return 'missed_playoffs';
  switch (userSeriesLoss.round) {
    case 'WORLD_SERIES':
      return 'world_series_loss';
    case 'CHAMPIONSHIP_SERIES':
      return 'championship_series_loss';
    case 'WILD_CARD':
      return 'wild_card_loss';
    default:
      return 'division_series_loss';
  }
}

export function applyPostseasonConsequences(state: FullGameState): string[] {
  if (!state.playoffBracket) return [];

  const standings = Object.values(state.seasonState.standings.getFullStandings())
    .flatMap((division) => division.map((entry) => ({
      teamId: entry.teamId,
      wins: entry.wins,
      losses: entry.losses,
    })));
  const bundle = buildPostseasonConsequenceBundle({
    rng: state.rng.fork(),
    season: state.season,
    userTeamId: state.userTeamId,
    playoffBracket: state.playoffBracket,
    standings,
    userPlayers: getTeamPlayers(state.userTeamId).filter((player) => player.rosterStatus === 'MLB'),
    userOutcome: deriveUserPostseasonOutcome(state),
  });

  applyConsequenceBundle(state, bundle);
  return bundle.seasonHistoryMoments;
}

export function applyRetirementConsequences(
  state: FullGameState,
  retiredIds: string[],
): string[] {
  const retiredPlayers = state.players.filter((player) => retiredIds.includes(player.id));
  if (retiredPlayers.length === 0) return [];

  const bundle = buildRetirementConsequenceBundle({
    rng: state.rng.fork(),
    season: state.season,
    day: state.day,
    userTeamId: state.userTeamId,
    retiredPlayers,
    remainingUserPlayers: getTeamPlayers(state.userTeamId).filter(
      (player) => player.rosterStatus === 'MLB' && !retiredIds.includes(player.id),
    ),
    careerStatsByPlayerId: new Map(state.careerStats.map((entry) => [entry.playerId, entry])),
    priorSeasonGamesMissedByPlayerId: new Map(retiredPlayers.map((player) => [
      player.id,
      state.seasonState.playerSeasonStats.get(player.id)?.gamesMissedToInjury ?? player.priorSeasonGamesMissed,
    ])),
  });

  applyConsequenceBundle(state, bundle);
  return bundle.seasonHistoryMoments;
}
