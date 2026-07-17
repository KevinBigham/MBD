import {
  buildTeamSeasonSummaries,
  detectBullpenCollapse,
  detectDominantRotation,
  detectEraEndingCollapse,
  detectInjuryReturnHero,
  detectBreakoutCountdowns,
  detectLateCareerPeak,
  detectLineupOfEra,
  detectPerennialContender,
  detectRedemptionArc,
  detectRookieBreakout,
  detectSeptemberCallupHero,
  detectSeasonIdentityMoments,
  detectThreePeat,
  detectTradeDeadlineSpark,
  detectWeeklyMoments,
  evaluateScenarioProgress,
  generateDebutFlashback,
  generatePressConference,
  getScenarioById,
  pruneTickerFeed,
  resolvePlayoffTeamIds,
} from '@mbd/sim-core';
import { getTeamById } from '@mbd/sim-core';
import type { TeamSeasonSummary } from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import {
  appendPlayerMoments,
  appendTeamMoments,
} from './sim.worker.helpers.js';
import { queueProspectDebutMoment } from './sim.worker.ceremony.js';
import { previewRecordWatchList } from './sim.worker.records.js';
import { exportGameSnapshot } from './snapshot.js';

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function parseTimestamp(timestamp: string): number {
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) {
    return 0;
  }
  return (Number(match[1]) * 1000) + Number(match[2]);
}

function parseTimestampParts(timestamp: string): readonly [number, number] | null {
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) {
    return null;
  }
  return [Number(match[1]), Number(match[2])];
}

function latestMinorLevelFromBond(state: FullGameState, playerId: string): string {
  const bond = state.prospectBonds.find((entry) => entry.prospectId === playerId);
  if (!bond) {
    return 'AAA';
  }

  const milestone = [...bond.milestones]
    .reverse()
    .find((entry) => entry.startsWith('Promoted to ') && !entry.includes('MLB'));
  if (!milestone) {
    return 'AAA';
  }

  return milestone.replace(/^Promoted to /, '').split(',')[0] ?? 'AAA';
}

function addStoryFlag(state: FullGameState, flag: string) {
  const existing = state.storyFlags.get(state.userTeamId) ?? [];
  if (!existing.includes(flag)) {
    state.storyFlags.set(state.userTeamId, [...existing, flag]);
  }
}

function hasStoryFlag(state: FullGameState, flag: string): boolean {
  return (state.storyFlags.get(state.userTeamId) ?? []).includes(flag);
}

function appendTickerEntries(
  state: FullGameState,
  entries: FullGameState['tickerFeed'],
) {
  if (entries.length === 0) {
    return;
  }

  state.tickerFeed = pruneTickerFeed(
    [...entries, ...state.tickerFeed],
    200,
    absoluteDay(state.season, state.day),
  );
}

function createTickerEntry(
  state: FullGameState,
  id: string,
  category: FullGameState['tickerFeed'][number]['category'],
  text: string,
  priority: FullGameState['tickerFeed'][number]['priority'],
  relatedTeamIds: string[],
  relatedPlayerIds: string[],
  expiresOffsetDays: number,
): FullGameState['tickerFeed'][number] {
  return {
    id,
    timestamp: `S${state.season}D${state.day}`,
    category,
    text,
    priority,
    relatedTeamIds,
    relatedPlayerIds,
    expiresDay: absoluteDay(state.season, state.day) + expiresOffsetDays,
  };
}

function addDebutTickerEntry(state: FullGameState, playerId: string) {
  const player = state.players.find((candidate) => candidate.id === playerId);
  if (!player) {
    return;
  }

  const playerName = `${player.firstName} ${player.lastName}`;
  const relatedTeamIds = [player.teamId];
  const relatedPlayerIds = [player.id];
  const timestamp = `S${state.season}D${state.day}`;
  const activeRecordWatch = previewRecordWatchList(state).find((entry) => entry.playerId === player.id);
  const recordLabel = activeRecordWatch?.recordLabel.toLowerCase() ?? null;
  const text = recordLabel
    ? `${playerName} debuts and is on pace for ${recordLabel}.`
    : `${playerName} makes his MLB debut for the ${getTeamById(player.teamId)?.name ?? player.teamId.toUpperCase()}.`;

  state.tickerFeed = state.tickerFeed.filter((entry) =>
    !(
      entry.timestamp === timestamp
      && entry.relatedPlayerIds.includes(player.id)
      && (entry.category === 'record' || entry.id === `ticker-debut-${player.id}-${state.season}-${state.day}`)
    ),
  );
  appendTickerEntries(state, [
    createTickerEntry(
      state,
      `ticker-debut-${player.id}-${state.season}-${state.day}`,
      'prospect',
      text,
      recordLabel ? 4 : 3,
      relatedTeamIds,
      relatedPlayerIds,
      21,
    ),
  ]);
}

export function applyDebutFlashbacks(
  state: FullGameState,
  debutedPlayerIds: string[],
) {
  for (const playerId of debutedPlayerIds) {
    const player = state.players.find((candidate) => candidate.id === playerId);
    const bond = state.prospectBonds.find((entry) => entry.prospectId === playerId);
    if (!player || !bond || state.debutFlashbacks.some((entry) => entry.playerId === playerId)) {
      continue;
    }

    const flashback = generateDebutFlashback({
      season: state.season,
      playerOrigins: state.playerOrigins,
      debutFlashbacks: state.debutFlashbacks,
    }, player, bond);
    if (flashback) {
      state.debutFlashbacks = [...state.debutFlashbacks, flashback];
    }

    if (player.teamId === state.userTeamId) {
      queueProspectDebutMoment(state, playerId, latestMinorLevelFromBond(state, playerId), flashback ?? null);
    }

    addDebutTickerEntry(state, playerId);
  }
}

export function applyBreakoutCountdowns(
  state: FullGameState,
) {
  const countdowns = detectBreakoutCountdowns(state.rng.fork(), {
    season: state.season,
    day: state.day,
    players: state.players,
    playerOrigins: state.playerOrigins,
    playerStoryArcs: state.playerStoryArcs,
    minorLeagueStatHistory: new Map(state.minorLeagueState.minorLeagueStatHistory),
  });

  const existingActivePlayers = new Set(
    state.playerStoryArcs
      .filter((arc) => arc.resolvedSeason == null)
      .map((arc) => arc.playerId),
  );
  const openSlots = Math.max(0, 5 - existingActivePlayers.size);
  const newTickerEntries = countdowns
    .filter((countdown) => !state.tickerFeed.some((entry) => entry.id === `breakout-countdown-${countdown.playerId}-${state.season}-${state.day}`))
    .map((countdown) => ({
      id: `breakout-countdown-${countdown.playerId}-${state.season}-${state.day}`,
      timestamp: `S${state.season}D${state.day}`,
      category: 'prospect' as const,
      text: countdown.summary,
      priority: 3 as const,
      relatedTeamIds: [countdown.teamId],
      relatedPlayerIds: [countdown.playerId],
      expiresDay: absoluteDay(state.season, state.day) + 30,
    }));

  for (const countdown of countdowns.slice(0, openSlots)) {
    if (existingActivePlayers.has(countdown.playerId)) {
      continue;
    }

    state.playerStoryArcs = [
      ...state.playerStoryArcs,
      {
        playerId: countdown.playerId,
        arcType: 'prospect_rise',
        startSeason: state.season,
        startDay: state.day,
        phase: 'setup',
        milestones: [countdown.summary],
        resolvedSeason: null,
      },
    ];
    existingActivePlayers.add(countdown.playerId);
  }

  state.tickerFeed = pruneTickerFeed(
    [...newTickerEntries, ...state.tickerFeed],
    200,
    absoluteDay(state.season, state.day),
  );
}

function buildFarmStrength(state: FullGameState): { farmStrength: number; topProspectCount: number } {
  const prospects = state.players.filter((player) =>
    player.teamId === state.userTeamId
    && player.rosterStatus !== 'MLB'
    && player.rosterStatus !== 'INTERNATIONAL',
  );

  const scored = prospects.map((player) => {
    const bond = state.prospectBonds.find((entry) => entry.prospectId === player.id);
    return (
      ((player.ceiling ?? player.overallRating) / 5)
      + (bond?.bondStrength ?? 0)
    );
  });

  const farmStrength = scored.length > 0
    ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length)
    : 0;

  return {
    farmStrength,
    topProspectCount: prospects.filter((player) => (player.ceiling ?? player.overallRating) >= 340).length,
  };
}

function recentTradeHeadline(state: FullGameState): string | null {
  const recentTrade = state.tradeState.tradeHistory
    .filter((entry) => parseTimestamp(entry.timestamp ?? '') >= absoluteDay(state.season, Math.max(1, state.day - 30)))
    .find((entry) => entry.fromTeamId === state.userTeamId || entry.toTeamId === state.userTeamId);
  return recentTrade?.summary ?? null;
}

function userTeamStanding(state: FullGameState) {
  const division = getTeamById(state.userTeamId)?.division;
  const standings = division ? state.seasonState.standings.getFullStandings()[division] ?? [] : [];
  const entry = standings.find((candidate) => candidate.teamId === state.userTeamId);

  return {
    wins: entry?.wins ?? 0,
    losses: entry?.losses ?? 0,
    divisionRank: entry ? standings.indexOf(entry) + 1 : 1,
    gamesBack: Math.round(entry?.gamesBack ?? 0),
    clinched: state.phase === 'playoffs',
    eliminated: false,
  };
}

function ownerTone(state: FullGameState): 'supportive' | 'neutral' | 'impatient' {
  const owner = state.ownerState.get(state.userTeamId);
  if (!owner) {
    return 'neutral';
  }
  if ((owner.satisfaction ?? 100) <= 45 || owner.patience <= 35) {
    return 'impatient';
  }
  if ((owner.satisfaction ?? 0) >= 68 && owner.confidence >= 60) {
    return 'supportive';
  }
  return 'neutral';
}

export function applyMonthlyPressConference(state: FullGameState) {
  const farm = buildFarmStrength(state);
  const item = generatePressConference(state.rng.fork(), {
    season: state.season,
    day: state.day,
    userTeamId: state.userTeamId,
    teamRecord: userTeamStanding(state),
    ownerTone: ownerTone(state),
    recentTradeHeadline: recentTradeHeadline(state),
    farmStrength: farm.farmStrength,
    topProspectCount: farm.topProspectCount,
  });
  if (!item || state.news.some((entry) => entry.id === item.id)) {
    return;
  }

  state.news.unshift(item);
}

function monthFlag(prefix: string, season: number, month: number): string {
  return `${prefix}_${season}_${month}`;
}

function scenarioProgressTicker(state: FullGameState, month: number) {
  if (!state.challengeState) {
    return;
  }

  const flag = monthFlag('scenario_progress', state.season, month);
  if (hasStoryFlag(state, flag)) {
    return;
  }

  const scenario = getScenarioById(state.challengeState.scenarioId);
  if (!scenario) {
    return;
  }

  const progress = evaluateScenarioProgress(exportGameSnapshot(state), scenario);
  const yearsElapsed = (state.season - state.challengeState.startSeason) + 1;
  appendTickerEntries(state, [
    createTickerEntry(
      state,
      `ticker-scenario-progress-${state.season}-${month}`,
      'milestone',
      `Year ${yearsElapsed} of ${scenario.name} - progress: ${Math.round(progress.progress * 100)}%.`,
      4,
      [state.userTeamId],
      [],
      30,
    ),
  ]);
  addStoryFlag(state, flag);
}

function thisDayInHistoryTicker(state: FullGameState, month: number) {
  const flag = monthFlag('history_callback', state.season, month);
  if (hasStoryFlag(state, flag) || state.seasonArchive.length < 2) {
    return;
  }

  const archives = state.seasonArchive
    .filter((entry) => (state.season - entry.season) >= 2 && entry.timelineEvents.length > 0)
    .sort((left, right) => left.season - right.season);
  if (archives.length === 0) {
    return;
  }

  const archive = archives[state.rng.fork().nextInt(0, archives.length - 1)]!;
  const event = archive.timelineEvents[state.rng.fork().nextInt(0, archive.timelineEvents.length - 1)]!;
  appendTickerEntries(state, [
    createTickerEntry(
      state,
      `ticker-history-callback-${archive.season}-${state.season}-${month}`,
      'milestone',
      `On this day ${state.season - archive.season} years ago, ${event}.`,
      4,
      [state.userTeamId],
      [],
      30,
    ),
  ]);
  addStoryFlag(state, flag);
}

function draftAnniversaryTicker(state: FullGameState) {
  const anniversaryPlayers = state.players
    .filter((player) => player.teamId === state.userTeamId)
    .map((player) => ({ player, origin: state.playerOrigins.get(player.id) ?? null }))
    .filter((entry) =>
      entry.origin != null
      && entry.origin.originTeamId === state.userTeamId
      && (entry.origin.acquisitionType === 'draft' || entry.origin.acquisitionType === 'ifa')
    )
    .map((entry) => ({
      player: entry.player,
      yearsWithTeam: state.season - (entry.origin?.acquiredSeason ?? state.season),
    }))
    .filter((entry) => entry.yearsWithTeam === 5 || entry.yearsWithTeam === 10)
    .sort((left, right) => right.player.overallRating - left.player.overallRating || left.player.lastName.localeCompare(right.player.lastName));

  const newEntries: FullGameState['tickerFeed'] = [];
  for (const entry of anniversaryPlayers) {
    const flag = `draft_anniversary_${entry.player.id}_${state.season}`;
    if (hasStoryFlag(state, flag)) {
      continue;
    }

    const playerName = `${entry.player.firstName} ${entry.player.lastName}`;
    newEntries.push(createTickerEntry(
      state,
      `ticker-draft-anniversary-${entry.player.id}-${state.season}`,
      'milestone',
      `${playerName} celebrates ${entry.yearsWithTeam} seasons with the franchise.`,
      4,
      [state.userTeamId],
      [entry.player.id],
      45,
    ));
    addStoryFlag(state, flag);
  }

  appendTickerEntries(state, newEntries);
}

function statSummary(state: FullGameState, playerId: string): string | null {
  const player = state.players.find((candidate) => candidate.id === playerId);
  const stats = state.seasonState.playerSeasonStats.get(playerId);
  if (!player || !stats) {
    return null;
  }

  if (player.pitcherAttributes) {
    return `${stats.wins}-${stats.losses} with a ${stats.ip > 0 ? ((stats.earnedRuns / Math.max(1, stats.ip / 3)) * 9).toFixed(2) : '0.00'} ERA`;
  }

  const average = stats.ab > 0 ? ((stats.hits / stats.ab).toFixed(3)).replace(/^0/, '') : '.000';
  return `${average} with ${stats.hr} HR and ${stats.rbi} RBI`;
}

export function applyMonthlyNarrativeHooks(state: FullGameState, month: number) {
  scenarioProgressTicker(state, month);
  thisDayInHistoryTicker(state, month);
  draftAnniversaryTicker(state);
}

function buildCurrentTeamSummaries(
  state: FullGameState,
  currentPlayoffTeamIds: ReadonlySet<string>,
  championTeamId: string | null,
): TeamSeasonSummary[] {
  return buildTeamSeasonSummaries({
    season: state.season,
    standingsByDivision: state.seasonState.standings.getFullStandings(),
    leagueStandings: state.seasonState.standings.getLeagueStandings(),
    currentPlayoffTeamIds,
    championTeamId,
    seasonArchive: state.seasonArchive,
    archivedSeasons: state.archivedSeasons,
  });
}

function buildDynastyMarkerContext(
  state: FullGameState,
  summaries: readonly TeamSeasonSummary[],
) {
  return {
    season: state.season,
    day: state.day,
    teams: summaries,
    teamMoments: state.teamMoments,
    seasonArchive: state.seasonArchive,
    archivedSeasons: state.archivedSeasons,
    seasonHistory: state.seasonHistory,
    playoffSeriesHistory: state.playoffSeriesHistory,
  };
}

function buildPositionGroupContext(
  state: FullGameState,
  summaries: readonly TeamSeasonSummary[],
) {
  return {
    season: state.season,
    day: state.day,
    teams: summaries,
    teamMoments: state.teamMoments,
    players: state.players,
    playerSeasonStats: state.seasonState.playerSeasonStats,
  };
}

function applySeasonIdentityMoments(state: FullGameState) {
  const flag = `season_identity_moments_${state.season}`;
  if (hasStoryFlag(state, flag)) {
    return;
  }

  const fullStandings = state.seasonState.standings.getFullStandings();
  const summaries = buildCurrentTeamSummaries(
    state,
    new Set(state.playoffBracket?.seeds.map((seed) => seed.teamId) ?? []),
    state.playoffBracket?.champion ?? null,
  );
  const playerTeamById = new Map(state.players.map((player) => [player.id, player.teamId] as const));
  const playerMomentCountsByTeamId = new Map<string, number>();
  for (const [playerId, moments] of state.playerMoments.entries()) {
    const teamId = playerTeamById.get(playerId);
    if (!teamId) {
      continue;
    }
    const currentSeasonCount = moments.filter((moment) => moment.season === state.season).length;
    if (currentSeasonCount <= 0) {
      continue;
    }
    playerMomentCountsByTeamId.set(
      teamId,
      (playerMomentCountsByTeamId.get(teamId) ?? 0) + currentSeasonCount,
    );
  }

  const detected = detectSeasonIdentityMoments({
    season: state.season,
    day: state.day,
    teams: summaries,
    rivalries: state.rivalries,
    standingsByDivision: fullStandings,
    playoffSeriesHistory: state.playoffSeriesHistory,
    teamMoments: state.teamMoments,
    playerMomentCountsByTeamId,
    monthlyRecordSplits: state.seasonState.monthlyRecordSplits,
    retiredPlayers: state.players.filter((player) =>
      (state.offseasonState?.phaseResults.retiredPlayers ?? []).some((retirement) => retirement.playerId === player.id),
    ),
  });

  for (const entry of detected) {
    appendTeamMoments(state, entry.teamId, [entry.moment]);
  }

  addStoryFlag(state, flag);
}

export function applyRegularSeasonTeamDynastyMarkers(state: FullGameState) {
  const currentPlayoffTeamIds = resolvePlayoffTeamIds(
    state.seasonState.standings.getFullStandings(),
    state.playoffBracket?.seeds.map((seed) => seed.teamId),
  );
  const summaries = buildCurrentTeamSummaries(state, currentPlayoffTeamIds, null)
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
  const context = buildDynastyMarkerContext(state, summaries);

  for (const summary of summaries) {
    const detected = detectEraEndingCollapse(summary, context);
    if (detected) {
      appendTeamMoments(state, detected.teamId, [detected.moment]);
    }
  }
}

export function applyRegularSeasonPositionGroupMoments(state: FullGameState) {
  const currentPlayoffTeamIds = resolvePlayoffTeamIds(
    state.seasonState.standings.getFullStandings(),
    state.playoffBracket?.seeds.map((seed) => seed.teamId),
  );
  const summaries = buildCurrentTeamSummaries(state, currentPlayoffTeamIds, null)
    .sort((left, right) => left.teamId.localeCompare(right.teamId));
  const context = buildPositionGroupContext(state, summaries);

  for (const summary of summaries) {
    const detected = [
      detectDominantRotation(summary, context),
      detectBullpenCollapse(summary, context),
      detectLineupOfEra(summary, context),
    ].filter((entry): entry is NonNullable<typeof entry> => entry != null);

    if (detected.length === 0) {
      continue;
    }

    appendTeamMoments(
      state,
      summary.teamId,
      detected.map((entry) => entry.moment),
    );
  }
}

function playerMicroArcBaseContext(state: FullGameState) {
  return {
    season: state.season,
    detectionDay: state.day,
    players: state.players,
    playerSeasonStats: state.seasonState.playerSeasonStats,
    gameLog: state.seasonState.gameLog,
    playerMoments: state.playerMoments,
  };
}

function latestInjuryStartDay(state: FullGameState, playerId: string): number {
  let latest = 0;
  for (const item of state.news) {
    if (item.category[0] !== 'i' || item.relatedPlayerIds[0] !== playerId) {
      continue;
    }
    const parsed = parseTimestampParts(item.timestamp);
    if (parsed && parsed[0] === state.season) {
      latest = parsed[1];
    }
  }
  return latest;
}

export function applyRegularSeasonPlayerMicroArcMoments(state: FullGameState) {
  const baseContext = playerMicroArcBaseContext(state);

  for (const player of state.players) {
    const injury = state.injuries.get(player.id);
    if (!injury || injury.daysRemaining > 0) {
      continue;
    }
    const injuryStartDay = latestInjuryStartDay(state, player.id);
    if (!injuryStartDay) {
      continue;
    }
    const detected = detectInjuryReturnHero(player, {
      ...baseContext,
      returnDay: injuryStartDay + injury.totalDays,
      injuryLabel: injury.type.split('_')[0]!,
      daysOnIl: injury.totalDays,
      teamId: player.teamId,
    });
    if (detected) {
      appendPlayerMoments(state, detected.playerId, [detected.moment]);
    }
  }
}

export function applyWeeklyMoments(state: FullGameState, weekEndDay: number) {
  const detected = detectWeeklyMoments({
    season: state.season,
    weekEndDay,
    players: state.players,
    gameLog: state.seasonState.gameLog,
    teamMoments: state.teamMoments,
    playerMoments: state.playerMoments,
  });

  for (const entry of detected) {
    if (entry.scope === 'team') {
      appendTeamMoments(state, entry.teamId, [entry.moment]);
    } else {
      appendPlayerMoments(state, entry.playerId, [entry.moment]);
    }
  }
}

export function getWeeklyMomentCheckpointDays(
  previousDay: number,
  currentDay: number,
  seasonComplete: boolean,
): number[] {
  const finalCompletedDay = currentDay - 1;
  if (finalCompletedDay < previousDay) {
    return [];
  }

  const checkpoints: number[] = [];
  for (let day = previousDay; day <= finalCompletedDay; day += 1) {
    if (day > 0 && day % 7 === 0) {
      checkpoints.push(day);
    }
  }

  if (
    seasonComplete
    && finalCompletedDay > 0
    && !checkpoints.includes(finalCompletedDay)
  ) {
    checkpoints.push(finalCompletedDay);
  }

  return checkpoints;
}

export function applyWeeklyMomentsForCompletedRange(
  state: FullGameState,
  previousDay: number,
  currentDay: number,
  seasonComplete: boolean,
) {
  for (const checkpointDay of getWeeklyMomentCheckpointDays(previousDay, currentDay, seasonComplete)) {
    applyWeeklyMoments(state, checkpointDay);
  }
}

export function applySeasonEndPlayerMicroArcMoments(state: FullGameState) {
  const baseContext = playerMicroArcBaseContext(state);

  for (const player of state.players) {
    for (const item of state.news) {
      if (
        item.relatedPlayerIds[0] !== player.id
        || !item.body.includes('cal')
      ) {
        continue;
      }
      const parsed = parseTimestampParts(item.timestamp);
      if (!parsed || parsed[0] - state.season) {
        continue;
      }
      const detected = detectSeptemberCallupHero(player, {
        ...baseContext,
        callupDay: parsed[1],
        teamId: player.teamId,
      });
      if (detected) {
        appendPlayerMoments(state, detected.playerId, [detected.moment]);
      }
    }

    const bestTrades: Record<string, NonNullable<ReturnType<typeof detectTradeDeadlineSpark>>> = {};
    for (const trade of state.tradeState.tradeHistory) {
      const parsed = parseTimestampParts(trade.timestamp);
      if (!parsed || parsed[0] - state.season) {
        continue;
      }
      for (const [assets, acquiringTeamId, priorTeamId] of [
        [trade.offeringAssets, trade.toTeamId, trade.fromTeamId],
        [trade.requestingAssets, trade.fromTeamId, trade.toTeamId],
      ] as const) {
        for (const asset of assets) {
          if ((asset as { readonly playerId?: string }).playerId === player.id) {
            const detected = detectTradeDeadlineSpark(player, {
              ...baseContext,
              tradeDay: parsed[1],
              acquiringTeamId,
              priorTeamId,
            });
            if (detected) {
              const current = bestTrades[acquiringTeamId];
              if (!current || detected.score! > current.score!) {
                bestTrades[acquiringTeamId] = detected;
              }
            }
          }
        }
      }
    }
    for (const teamId in bestTrades) {
      appendPlayerMoments(state, bestTrades[teamId]!.playerId, [bestTrades[teamId]!.moment]);
    }
  }
}

export function applySeasonEndTeamDynastyMarkers(state: FullGameState) {
  const currentPlayoffTeamIds = resolvePlayoffTeamIds(
    state.seasonState.standings.getFullStandings(),
    state.playoffBracket?.seeds.map((seed) => seed.teamId),
  );
  const summaries = buildCurrentTeamSummaries(
    state,
    currentPlayoffTeamIds,
    state.playoffBracket?.champion ?? null,
  ).sort((left, right) => left.teamId.localeCompare(right.teamId));
  const context = buildDynastyMarkerContext(state, summaries);

  for (const summary of summaries) {
    const detected = [
      detectThreePeat(summary, context),
      detectPerennialContender(summary, context, currentPlayoffTeamIds),
    ].filter((entry): entry is NonNullable<typeof entry> => entry != null);

    if (detected.length === 0) {
      continue;
    }

    appendTeamMoments(
      state,
      summary.teamId,
      detected.map((entry) => entry.moment),
    );
  }
}

export function applySeasonEndPlayerArcMoments(state: FullGameState) {
  const careerWarByPlayerId = new Map(
    state.careerStats.map((entry) => [entry.playerId, entry.war ?? 0] as const),
  );

  for (const player of [...state.players].sort((left, right) => left.id.localeCompare(right.id))) {
    const stats = state.seasonState.playerSeasonStats.get(player.id);
    const careerWarBeforeSeason = careerWarByPlayerId.get(player.id) ?? 0;
    const detected = [
      detectRedemptionArc(
        player,
        stats,
        state.season,
        state.day,
        state.playerMoments,
      ),
      detectLateCareerPeak(
        player,
        stats,
        careerWarBeforeSeason,
        state.season,
        state.day,
        state.playerMoments,
      ),
      detectRookieBreakout(
        player,
        stats,
        state.season,
        state.day,
        state.playerMoments,
      ),
    ].filter((entry): entry is NonNullable<typeof entry> => entry != null);

    if (detected.length === 0) {
      continue;
    }

    appendPlayerMoments(
      state,
      player.id,
      detected.map((entry) => entry.moment),
    );
  }
}

export function applyOffseasonNarrativeHooks(state: FullGameState) {
  applySeasonIdentityMoments(state);

  const flag = `where_are_they_now_${state.season}`;
  if (hasStoryFlag(state, flag)) {
    return;
  }

  const tradedAwayPlayers = state.tradeState.tradeHistory
    .filter((entry) => entry.fromTeamId === state.userTeamId)
    .flatMap((entry) => entry.offeringAssets)
    .filter((asset): asset is Extract<typeof asset, { type: 'player' }> => asset.type === 'player')
    .map((asset) => asset.playerId);
  const uniquePlayers = Array.from(new Set(tradedAwayPlayers))
    .map((playerId) => state.players.find((candidate) => candidate.id === playerId))
    .filter((player): player is NonNullable<typeof player> => player != null && player.teamId !== state.userTeamId);
  const featured = uniquePlayers
    .sort((left, right) => right.overallRating - left.overallRating || left.lastName.localeCompare(right.lastName))[0];
  if (!featured) {
    return;
  }

  const team = getTeamById(featured.teamId);
  const line = statSummary(state, featured.id);
  if (!line) {
    return;
  }

  state.news.unshift({
    id: `where-are-they-now-${featured.id}-${state.season}`,
    headline: `Where Are They Now: ${featured.firstName} ${featured.lastName}`,
    body: `${featured.firstName} ${featured.lastName} spent the year with ${team ? `${team.city} ${team.name}` : featured.teamId.toUpperCase()}, posting ${line} after the trade.`,
    priority: 3,
    category: 'trade',
    tag: 'ANALYSIS',
    timestamp: `S${state.season}D${state.day}`,
    relatedPlayerIds: [featured.id],
    relatedTeamIds: [state.userTeamId, featured.teamId],
    read: false,
  });
  addStoryFlag(state, flag);
}
