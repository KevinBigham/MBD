import {
  backfillLegacyRecordBook,
  getRecordWatchList as buildRecordWatchList,
  updateRecordBook,
  type BrokenRecord,
  type PlayerSeasonRecord,
  type TeamStandingRecord,
} from '@mbd/sim-core';
import type { RecordBookEntry } from '@mbd/contracts';
import { queueRecordBrokenMoment } from './sim.worker.ceremony.js';
import type { FullGameState } from './sim.worker.helpers.js';
import { rebuildBriefing } from './sim.worker.narrative.js';
import { buildAdvancedStatsIndex } from './sim.worker.stats.js';

function currentTimestamp(state: FullGameState): string {
  return `S${state.season}D${state.day}`;
}

function parseStreak(value: string): number {
  if (!value || value === '-') {
    return 0;
  }

  const match = /^([WL])(\d+)$/.exec(value);
  if (!match) {
    return 0;
  }

  const direction = match[1] === 'W' ? 1 : -1;
  return direction * Number(match[2]);
}

function countFranchisePlayoffStreak(state: FullGameState, includeCurrentSeason: boolean): number {
  const ordered = [...state.franchiseTimeline]
    .filter((entry) => entry.teamId === state.userTeamId)
    .sort((left, right) => right.season - left.season);

  let streak = includeCurrentSeason ? 1 : 0;
  for (const entry of ordered) {
    if (!entry.playoffAppearance) {
      break;
    }
    streak += 1;
  }

  return streak;
}

function buildCurrentStandings(state: FullGameState, includeCurrentSeasonPlayoffAppearance: boolean): TeamStandingRecord[] {
  const standings = Object.values(state.seasonState.standings.getFullStandings())
    .flatMap((entries) => entries)
    .reduce<Map<string, TeamStandingRecord>>((map, entry) => {
      if (map.has(entry.teamId)) {
        return map;
      }

      map.set(entry.teamId, {
        teamId: entry.teamId,
        wins: entry.wins,
        losses: entry.losses,
        streak: parseStreak(entry.streak),
        playoffAppearances: entry.teamId === state.userTeamId
          ? countFranchisePlayoffStreak(state, includeCurrentSeasonPlayoffAppearance)
          : 0,
      });
      return map;
    }, new Map());

  return Array.from(standings.values());
}

function buildPlayerSeasons(state: FullGameState): PlayerSeasonRecord[] {
  const advancedIndex = buildAdvancedStatsIndex(state);
  const seasons: PlayerSeasonRecord[] = [];

  for (const player of state.players) {
    const stats = state.seasonState.playerSeasonStats.get(player.id);
    if (!stats) {
      continue;
    }

    const hasSeason = (stats.pa > 0 || stats.ip > 0 || (stats.gamesPlayed ?? 0) > 0);
    if (!hasSeason) {
      continue;
    }

    seasons.push({
      playerId: player.id,
      playerName: `${player.firstName} ${player.lastName}`,
      teamId: player.teamId,
      position: player.position,
      isPitcher: player.pitcherAttributes != null,
      gamesPlayed: stats.gamesPlayed ?? 0,
      pa: stats.pa,
      ab: stats.ab,
      hits: stats.hits,
      hr: stats.hr,
      rbi: stats.rbi,
      wins: stats.wins,
      saves: stats.saves ?? 0,
      strikeouts: stats.strikeouts,
      ipOuts: stats.ip,
      earnedRuns: stats.earnedRuns,
      war: advancedIndex.get(player.id)?.war ?? 0,
    });
  }

  return seasons;
}

function recordEntryById(recordBook: RecordBookEntry[], entryId: string): RecordBookEntry | undefined {
  return recordBook.find((entry) => entry.id === entryId);
}

function isUserRelevantRecord(state: FullGameState, entry: RecordBookEntry): boolean {
  const holder = entry.holders[0];
  return holder?.teamId === state.userTeamId || entry.teamId === state.userTeamId;
}

function publishRecordWatchStories(state: FullGameState) {
  for (const watch of state.recordWatch.filter((entry) => entry.teamId === state.userTeamId)) {
    const newsId = `record-watch-${watch.id}-d${state.day}`;
    if (!state.news.some((item) => item.id === newsId)) {
      state.news.unshift({
        id: newsId,
        headline: `Record Watch: ${watch.playerName}`,
        body: watch.summary,
        priority: 3,
        category: 'record',
        tag: 'WATCH',
        timestamp: currentTimestamp(state),
        relatedPlayerIds: [watch.playerId],
        relatedTeamIds: [watch.teamId],
        read: false,
      });
    }
  }
}

function publishBrokenRecordStories(
  state: FullGameState,
  recordBook: RecordBookEntry[],
  brokenRecords: BrokenRecord[],
) {
  let changed = false;
  for (const brokenRecord of brokenRecords) {
    if (brokenRecord.previousValue == null) {
      continue;
    }

    const entry = recordEntryById(recordBook, brokenRecord.entryId);
    const holder = entry?.holders[0];
    if (!entry || !holder || !isUserRelevantRecord(state, entry)) {
      continue;
    }

    const newsId = `record-broken-${state.season}-${entry.id}-${holder.playerId ?? holder.teamId ?? 'team'}`;
    if (!state.news.some((item) => item.id === newsId)) {
      const subject = holder.playerName ?? holder.teamId?.toUpperCase() ?? 'Team';
      state.news.unshift({
        id: newsId,
        headline: `${subject} breaks ${entry.label}`,
        body: `${subject} pushed the ${entry.scope === 'franchise' ? 'franchise' : 'league'} ${entry.label.toLowerCase()} mark to ${holder.displayValue}.`,
        priority: 1,
        category: 'record',
        tag: 'BREAKING',
        timestamp: currentTimestamp(state),
        relatedPlayerIds: holder.playerId ? [holder.playerId] : [],
        relatedTeamIds: holder.teamId ? [holder.teamId] : [],
        read: false,
      });
      changed = true;
    }

    const briefingId = `brief-${newsId}`;
    if (!state.briefingQueue.some((item) => item.id === briefingId)) {
      state.briefingQueue.unshift({
        id: briefingId,
        priority: 1,
        category: 'news',
        tag: 'BREAKING',
        headline: entry.label,
        body: holder.playerName
          ? `${holder.playerName} now owns the ${entry.label.toLowerCase()} record at ${holder.displayValue}.`
          : `${holder.teamId?.toUpperCase() ?? 'TEAM'} now owns the ${entry.label.toLowerCase()} record at ${holder.displayValue}.`,
        relatedPlayerIds: holder.playerId ? [holder.playerId] : [],
        relatedTeamIds: holder.teamId ? [holder.teamId] : [],
        timestamp: currentTimestamp(state),
        acknowledged: false,
      });
      changed = true;
    }

    queueRecordBrokenMoment(state, entry);
  }

  if (changed) {
    rebuildBriefing(state);
  }
}

export function initializeRecordTracking(state: FullGameState) {
  if (state.recordBook.length > 0) {
    return;
  }

  state.recordBook = backfillLegacyRecordBook({
    currentSeason: state.season,
    franchiseTeamId: state.userTeamId,
    franchiseTimeline: state.franchiseTimeline,
    seasonHistory: state.seasonHistory,
    careerStats: state.careerStats,
  });
  state.recordWatch = [];
}

export function syncRecordTracking(
  state: FullGameState,
  options: {
    publishWatchStories?: boolean;
    publishBrokenRecords?: boolean;
    includeCurrentSeasonPlayoffAppearance?: boolean;
    clearWatches?: boolean;
  } = {},
) {
  initializeRecordTracking(state);

  const { recordBook, brokenRecords } = updateRecordBook(state.recordBook, {
    currentSeason: state.season,
    franchiseTeamId: state.userTeamId,
    currentStandings: buildCurrentStandings(state, options.includeCurrentSeasonPlayoffAppearance ?? false),
    playerSeasons: buildPlayerSeasons(state),
    careerStats: state.careerStats,
  });

  state.recordBook = recordBook;

  if (options.clearWatches || state.phase !== 'regular') {
    state.recordWatch = [];
  } else {
    const teamGamesPlayed = new Map(
      buildCurrentStandings(state, options.includeCurrentSeasonPlayoffAppearance ?? false)
        .map((entry) => [entry.teamId, entry.wins + entry.losses] as const),
    );
    state.recordWatch = buildRecordWatchList(state.recordBook, {
      currentSeason: state.season,
      teamGamesPlayed,
      playerSeasons: buildPlayerSeasons(state),
    });
    if (options.publishWatchStories) {
      publishRecordWatchStories(state);
    }
  }

  if (options.publishBrokenRecords) {
    publishBrokenRecordStories(state, state.recordBook, brokenRecords);
  }
}
