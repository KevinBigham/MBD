import type { TradeAsset } from '@mbd/contracts';
import {
  checkMilestones,
  deduplicateNews,
  describeInjury,
  GameRNG,
  generateGameHighlights,
  generateGameRecap,
  generateTickerEntries,
  getDaysUntilTradeDeadline,
  getRivalry,
  getTeamById,
  pruneTickerFeed,
  StandingsTracker,
  type GameBoxScore,
} from '@mbd/sim-core';
import type { FullGameState } from './sim.worker.helpers.js';
import { previewRecordWatchList } from './sim.worker.records.js';

const HIT_OUTCOMES = new Set(['SINGLE', 'DOUBLE', 'TRIPLE', 'HR']);
const AT_BAT_OUTCOMES = new Set([
  'SINGLE',
  'DOUBLE',
  'TRIPLE',
  'HR',
  'K',
  'GB_OUT',
  'FB_OUT',
  'LD_OUT',
  'DOUBLE_PLAY',
]);

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function formatDivisionLabel(value: string): string {
  const [league, name] = value.split('_');
  if (!league || !name) {
    return value;
  }
  return `${league} ${name.charAt(0)}${name.slice(1).toLowerCase()}`;
}

function resolvePlayerName(state: FullGameState, playerId: string): string | null {
  const player = state.players.find((entry) => entry.id === playerId);
  return player ? `${player.firstName} ${player.lastName}` : null;
}

function resolveTradeAssetPlayer(
  state: FullGameState,
  assets: TradeAsset[],
): { playerId?: string; playerName: string } | null {
  const playerAsset = assets.find((asset) => asset.type === 'player');
  if (!playerAsset || playerAsset.type !== 'player') {
    return null;
  }

  const playerName = resolvePlayerName(state, playerAsset.playerId);
  if (!playerName) {
    return null;
  }

  return {
    playerId: playerAsset.playerId,
    playerName,
  };
}

function parseTimestampRank(value: string): number {
  const match = /^S(\d+)D(\d+)$/.exec(value);
  if (!match) {
    return 0;
  }
  return absoluteDay(Number(match[1]), Number(match[2]));
}

function buildPlayerNameMap(state: FullGameState) {
  return new Map(
    state.players.map((player) => [player.id, `${player.firstName} ${player.lastName}`] as const),
  );
}

function buildTeamNameMap(game: GameBoxScore) {
  return new Map<string, string>([
    [game.awayTeamId, getTeamById(game.awayTeamId)?.name ?? game.awayTeamId.toUpperCase()],
    [game.homeTeamId, getTeamById(game.homeTeamId)?.name ?? game.homeTeamId.toUpperCase()],
  ]);
}

function buildHighlightTickerText(
  winningTeamName: string,
  losingTeamName: string,
  winningScore: number,
  losingScore: number,
  highlightText: string,
): string {
  return `${winningTeamName} defeats ${losingTeamName} ${winningScore}-${losingScore}. ${highlightText}`;
}

function buildScoreContexts(state: FullGameState, games: GameBoxScore[]) {
  const playerNames = buildPlayerNameMap(state);

  return games.map((game) => {
    const winnerId = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
    const loserId = winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
    const winnerScore = winnerId === game.homeTeamId ? game.homeScore : game.awayScore;
    const loserScore = winnerId === game.homeTeamId ? game.awayScore : game.homeScore;
    const teamNames = buildTeamNameMap(game);
    const highlights = generateGameHighlights(game, playerNames, teamNames);
    const topHighlight = highlights[0] ?? null;

    const batterLines = new Map<string, { hits: number; atBats: number; hr: number }>();
    for (const result of game.paResults) {
      const current = batterLines.get(result.batterId) ?? { hits: 0, atBats: 0, hr: 0 };
      if (HIT_OUTCOMES.has(result.outcome)) {
        current.hits += 1;
      }
      if (AT_BAT_OUTCOMES.has(result.outcome)) {
        current.atBats += 1;
      }
      if (result.outcome === 'HR') {
        current.hr += 1;
      }
      batterLines.set(result.batterId, current);
    }

    const star = Array.from(batterLines.entries())
      .map(([playerId, line]) => ({
        playerId,
        playerName: resolvePlayerName(state, playerId),
        ...line,
      }))
      .filter((entry): entry is { playerId: string; playerName: string; hits: number; atBats: number; hr: number } => entry.playerName != null)
      .sort((left, right) => right.hr - left.hr || right.hits - left.hits || left.atBats - right.atBats)[0];

    const winner = getTeamById(winnerId);
    const loser = getTeamById(loserId);
    const rivalry = getRivalry(state.rivalries, game.homeTeamId, game.awayTeamId);
    const winnerSeriesWins = rivalry == null
      ? null
      : (winnerId === rivalry.teamA ? rivalry.currentSeasonWinsA : rivalry.currentSeasonWinsB) ?? 0;
    const loserSeriesWins = rivalry == null
      ? null
      : (loserId === rivalry.teamA ? rivalry.currentSeasonWinsA : rivalry.currentSeasonWinsB) ?? 0;
    const rivalryText = rivalry != null
      && rivalry.intensity >= 60
      && winnerSeriesWins != null
      && loserSeriesWins != null
      ? `The rivalry intensifies as ${winner?.name ?? winnerId.toUpperCase()} takes a ${winnerSeriesWins}-${loserSeriesWins} season edge over ${loser?.name ?? loserId.toUpperCase()}.${star ? ` ${star.playerName} goes ${star.hits}-for-${star.atBats} with ${star.hr} HR.` : ''}`
      : undefined;
    const highlightText = topHighlight == null
      ? undefined
      : buildHighlightTickerText(
        winner?.name ?? winnerId.toUpperCase(),
        loser?.name ?? loserId.toUpperCase(),
        winnerScore,
        loserScore,
        topHighlight.text,
      );

    return {
      winningTeamId: winnerId,
      winningTeamName: winner?.name ?? winnerId.toUpperCase(),
      losingTeamId: loserId,
      losingTeamName: loser?.name ?? loserId.toUpperCase(),
      winningScore: winnerScore,
      losingScore: loserScore,
      starPlayerId: topHighlight?.playerId ?? star?.playerId,
      starPlayerName: star?.playerName,
      hits: star?.hits,
      atBats: star?.atBats,
      hr: star?.hr,
      storyText: highlightText ?? rivalryText,
    };
  });
}

function buildStandingsChanges(previousRecords: FullGameState['seasonState']['standings']['serialize'] extends () => infer R ? R : never, state: FullGameState) {
  const before = StandingsTracker.deserialize(previousRecords);
  const after = state.seasonState.standings;

  return Object.values(after.getFullStandings())
    .flatMap((entries) => {
      const leader = entries[0];
      const runnerUp = entries[1];
      if (!leader || !runnerUp || leader.gamesBack !== 0 || runnerUp.gamesBack === 0) {
        return [];
      }

      const team = getTeamById(leader.teamId);
      const previousDivision = team ? before.getDivisionStandings(team.division) : [];
      const previousLeader = previousDivision[0];
      const previousRunnerUp = previousDivision[1];
      const previouslyTied = previousLeader != null && previousRunnerUp != null && previousRunnerUp.gamesBack === 0;
      const changedLeaders = previousLeader?.teamId !== leader.teamId;

      if (!previouslyTied && !changedLeaders) {
        return [];
      }

      return [{
        teamId: leader.teamId,
        teamName: team ? team.name : leader.teamId.toUpperCase(),
        division: formatDivisionLabel(team?.division ?? 'UNKNOWN'),
        tookSoleLead: true,
      }];
    });
}

function buildInjuryContexts(state: FullGameState, previousInjuryIds: Set<string>) {
  return Array.from(state.injuries.entries())
    .filter(([playerId]) => !previousInjuryIds.has(playerId))
    .map(([playerId, injury]) => {
      const player = state.players.find((entry) => entry.id === playerId);
      if (!player) {
        return null;
      }

      return {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: player.teamId,
        injury: describeInjury(injury),
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

function buildMilestoneContexts(state: FullGameState, simDay: number) {
  return checkMilestones(state.seasonState.playerSeasonStats, state.players, state.season, simDay)
    .map((moment) => {
      const playerId = moment.playerIds[0];
      if (!playerId) {
        return null;
      }

      const player = state.players.find((entry) => entry.id === playerId);
      if (!player) {
        return null;
      }

      let text = moment.headline;
      if (moment.type === 'milestone_hit') {
        const match = /(\d+) career hits/.exec(moment.headline);
        text = `records career hit #${match?.[1] ?? ''}`.trim();
      } else if (moment.type === 'milestone_hr') {
        const match = /home run #(\d+)/.exec(moment.headline);
        text = `hits career home run #${match?.[1] ?? ''}`.trim();
      } else if (moment.type === 'milestone_k') {
        const match = /strikeout #(\d+)/.exec(moment.headline);
        text = `records career strikeout #${match?.[1] ?? ''}`.trim();
      } else if (moment.type === 'milestone_win') {
        const match = /win #(\d+)/.exec(moment.headline);
        text = `earns career win #${match?.[1] ?? ''}`.trim();
      }

      return {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        teamId: player.teamId,
        text,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null);
}

function buildTradeContexts(state: FullGameState, previousTradeCount: number) {
  const newTrades = state.tradeState.tradeHistory.slice(0, Math.max(0, state.tradeState.tradeHistory.length - previousTradeCount));
  return newTrades.map((trade) => {
    const acquired = resolveTradeAssetPlayer(state, trade.requestingAssets);
    const returned = resolveTradeAssetPlayer(state, trade.offeringAssets);
    const acquiringTeam = getTeamById(trade.toTeamId);
    const fromTeam = getTeamById(trade.fromTeamId);

    return {
      acquiringTeamId: trade.toTeamId,
      acquiringTeamName: acquiringTeam?.name ?? trade.toTeamId.toUpperCase(),
      fromTeamId: trade.fromTeamId,
      fromTeamName: fromTeam?.name ?? trade.fromTeamId.toUpperCase(),
      acquiredPlayerId: acquired?.playerId,
      acquiredPlayerName: acquired?.playerName ?? 'a player',
      returnPlayerId: returned?.playerId,
      returnPlayerName: returned?.playerName,
    };
  });
}

function buildRecordWatchContexts(state: FullGameState) {
  return previewRecordWatchList(state)
    .slice(0, 3)
    .map((watch) => ({
      playerId: watch.playerId,
      playerName: watch.playerName,
      teamId: watch.teamId,
      text: watch.recordLabel.toLowerCase(),
      currentStat: Math.round(watch.currentValue),
    }));
}

function buildRumorCandidates(state: FullGameState) {
  if (getDaysUntilTradeDeadline(state.day) > 30 || getDaysUntilTradeDeadline(state.day) < 0) {
    return [];
  }

  return state.seasonState.standings.getLeagueStandings()
    .filter((entry) => entry.gamesBack > 5)
    .slice(-6)
    .map((entry) => {
      const team = getTeamById(entry.teamId);
      return {
        teamId: entry.teamId,
        teamName: team?.name ?? entry.teamId.toUpperCase(),
        position: 'SP',
      };
    });
}

function buildHighlightHeadline(
  game: GameBoxScore,
  highlight: ReturnType<typeof generateGameHighlights>[number],
): string {
  const winnerId = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
  const loserId = winnerId === game.homeTeamId ? game.awayTeamId : game.homeTeamId;
  const winnerName = getTeamById(winnerId)?.name ?? winnerId.toUpperCase();
  const loserName = getTeamById(loserId)?.name ?? loserId.toUpperCase();

  switch (highlight.type) {
    case 'walkoff':
      return `Walk-off finish: ${winnerName} stun ${loserName}`;
    case 'comeback':
      return `Comeback turn: ${winnerName} flip ${loserName}`;
    case 'extras':
      return `Extra-innings swing: ${winnerName} outlast ${loserName}`;
    case 'clutch_k':
      return `Late jam escape: ${winnerName} hold off ${loserName}`;
    case 'homer':
    default:
      return `Highlight reel: ${winnerName} power past ${loserName}`;
  }
}

function buildGameHighlightNews(
  state: FullGameState,
  games: GameBoxScore[],
) {
  const playerNames = buildPlayerNameMap(state);

  return games
    .map((game) => {
      const teamNames = buildTeamNameMap(game);
      const highlights = generateGameHighlights(game, playerNames, teamNames);
      const topHighlight = highlights[0] ?? null;
      if (!topHighlight) {
        return null;
      }

      const userTeamInvolved = game.homeTeamId === state.userTeamId || game.awayTeamId === state.userTeamId;
      if (!userTeamInvolved && topHighlight.type !== 'walkoff' && topHighlight.dramaScore < 90) {
        return null;
      }

      const priority: 1 | 2 | 3 = topHighlight.type === 'walkoff' ? 1 : userTeamInvolved ? 2 : 3;
      const tag: 'BREAKING' | 'RECAP' = topHighlight.type === 'walkoff' ? 'BREAKING' : 'RECAP';

      return {
        userTeamInvolved,
        dramaScore: topHighlight.dramaScore,
        item: {
          id: `game-highlight-${game.date}-${game.awayTeamId}-${game.homeTeamId}-${topHighlight.type}`,
          headline: buildHighlightHeadline(game, topHighlight),
          body: `${topHighlight.text} ${generateGameRecap(game, highlights, playerNames, teamNames)}`,
          priority,
          category: 'performance' as const,
          tag,
          timestamp: game.date,
          relatedPlayerIds: [topHighlight.playerId],
          relatedTeamIds: [game.awayTeamId, game.homeTeamId],
          read: false,
        },
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry != null)
    .sort((left, right) =>
      Number(right.userTeamInvolved) - Number(left.userTeamInvolved)
      || right.dramaScore - left.dramaScore
      || parseTimestampRank(right.item.timestamp) - parseTimestampRank(left.item.timestamp))
    .slice(0, 3)
    .map((entry) => entry.item);
}

export function refreshTickerFeed(
  state: FullGameState,
  args: {
    simDay: number;
    games: GameBoxScore[];
    previousStandings: ReturnType<FullGameState['seasonState']['standings']['serialize']>;
    previousInjuryIds: Set<string>;
    previousTradeCount: number;
  },
) {
  const tickerRng = new GameRNG((state.rng.getSeed() ^ (state.season * 4096) ^ args.simDay ^ 0x51c3d) | 0);
  const entries = generateTickerEntries(tickerRng, {
    season: state.season,
    day: args.simDay,
    scores: buildScoreContexts(state, args.games),
    standingsChanges: buildStandingsChanges(args.previousStandings, state),
    trades: buildTradeContexts(state, args.previousTradeCount),
    injuries: buildInjuryContexts(state, args.previousInjuryIds),
    milestones: buildMilestoneContexts(state, args.simDay),
    prospectCallups: [],
    recordWatches: buildRecordWatchContexts(state),
    rumorCandidates: buildRumorCandidates(state),
    rumorsEnabled: true,
  });

  state.tickerFeed = pruneTickerFeed(
    [...entries, ...state.tickerFeed],
    200,
    absoluteDay(state.season, args.simDay),
  );

  const highlightNews = buildGameHighlightNews(state, args.games);
  if (highlightNews.length > 0) {
    state.news = deduplicateNews([...highlightNews, ...state.news]);
  }
}
