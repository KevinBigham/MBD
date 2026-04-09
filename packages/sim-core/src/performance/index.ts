import type {
  ArchivedSeason,
  GameSnapshot,
  SeasonArchiveEntry,
  SeasonStatLeaders,
} from '@mbd/contracts';

const DEFAULT_RECENT_SEASON_COUNT = 10;
const CONSEQUENCE_RETENTION_SEASONS = 5;
const STORY_ARC_RETENTION_SEASONS = 10;
const TICKER_FEED_CAP = 200;
const SCOUT_CONFLICT_CAP = 100;
const DYNASTY_CARD_CAP = 50;

function parseRecord(record: string | null | undefined): ArchivedSeason['userRecord'] {
  if (!record) {
    return null;
  }

  const match = /^(\d+)-(\d+)$/.exec(record.trim());
  if (!match) {
    return null;
  }

  return {
    wins: Number(match[1]),
    losses: Number(match[2]),
  };
}

function keepTopLeaderOnly(statLeaders: SeasonArchiveEntry['statLeaders']): SeasonStatLeaders {
  return {
    hr: statLeaders.hr.slice(0, 1),
    rbi: statLeaders.rbi.slice(0, 1),
    avg: statLeaders.avg.slice(0, 1),
    era: statLeaders.era.slice(0, 1),
    k: statLeaders.k.slice(0, 1),
    w: statLeaders.w.slice(0, 1),
  };
}

function summarizeAward(awards: SeasonArchiveEntry['awards'], label: string): string | null {
  const winner = awards.find((award) => award.award === label);
  return winner?.summary ?? winner?.playerId ?? null;
}

function compressSeason(entry: SeasonArchiveEntry, userTeamId: string): ArchivedSeason {
  const championTeamId = entry.playoffSeries.find((series) => series.round === 'World Series')?.winnerTeamId ?? null;
  return {
    season: entry.season,
    standings: entry.standings.map((standing) => ({
      teamId: standing.teamId,
      wins: standing.wins,
      losses: standing.losses,
      divisionRank: standing.divisionRank,
    })),
    userRecord: parseRecord(entry.userSummary?.record),
    playoffResult: entry.userSummary?.playoffResult ?? null,
    championshipWon: championTeamId === userTeamId,
    championTeamId,
    mvpName: summarizeAward(entry.awards, 'MVP'),
    cyYoungName: summarizeAward(entry.awards, 'CY_YOUNG'),
    statLeaders: keepTopLeaderOnly(entry.statLeaders),
    dynastyScore: null,
  };
}

function computeSnapshotSize(payload: unknown): number {
  const serialized = JSON.stringify(payload);
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(serialized).byteLength;
  }
  return serialized.length;
}

export function estimateSnapshotSize(snapshot: GameSnapshot): number {
  return computeSnapshotSize(snapshot);
}

export function archiveOldSeasons(
  snapshot: GameSnapshot,
  currentSeason: number = snapshot.season,
  keepRecentCount: number = DEFAULT_RECENT_SEASON_COUNT,
): GameSnapshot {
  const userTeamId = snapshot.userTeamId ?? snapshot.franchise.teamId;
  const keepThresholdSeason = Math.max(1, currentSeason - keepRecentCount);
  const seasonArchive = snapshot.narrative.seasonArchive ?? [];
  const archivedSeasons = snapshot.narrative.archivedSeasons ?? [];

  const newlyArchived = seasonArchive
    .filter((entry) => entry.season < keepThresholdSeason)
    .map((entry) => compressSeason(entry, userTeamId));
  const retainedArchive = seasonArchive.filter((entry) => entry.season >= keepThresholdSeason);

  const nextSnapshot: GameSnapshot = {
    ...snapshot,
    narrative: {
      ...snapshot.narrative,
      seasonArchive: retainedArchive,
      archivedSeasons: [...archivedSeasons, ...newlyArchived]
        .sort((left, right) => left.season - right.season)
        .filter((entry, index, all) => index === all.findIndex((candidate) => candidate.season === entry.season)),
    },
    performanceDiagnostics: {
      totalSeasons: Math.max(snapshot.performanceDiagnostics?.totalSeasons ?? 1, currentSeason),
      snapshotSizeBytes: 0,
    },
  };

  return {
    ...nextSnapshot,
    performanceDiagnostics: {
      ...nextSnapshot.performanceDiagnostics,
      snapshotSizeBytes: estimateSnapshotSize(nextSnapshot),
    },
  };
}

export function pruneStaleData(snapshot: GameSnapshot): GameSnapshot {
  const currentSeason = snapshot.season;
  const consequenceWatchers = (snapshot.narrative.consequenceWatchers ?? []).filter((watcher) => (
    !watcher.resolved || watcher.createdSeason > (currentSeason - CONSEQUENCE_RETENTION_SEASONS)
  ));
  const playerStoryArcs = (snapshot.narrative.playerStoryArcs ?? []).filter((arc) => (
    arc.resolvedSeason == null || arc.resolvedSeason > (currentSeason - STORY_ARC_RETENTION_SEASONS)
  ));
  const tickerFeed = (snapshot.narrative.tickerFeed ?? []).slice(-TICKER_FEED_CAP);
  const activeDevelopmentSetbacks = (snapshot.minorLeagueState.activeDevelopmentSetbacks ?? []).filter((setback) => {
    if (setback.active) {
      return true;
    }
    return setback.endSeason > currentSeason;
  });
  const scoutConflicts = [...(snapshot.narrative.scoutConflicts ?? [])]
    .sort((left, right) => {
      const leftResolved = left.resolved ? 0 : 1;
      const rightResolved = right.resolved ? 0 : 1;
      return leftResolved - rightResolved || left.createdSeason - right.createdSeason;
    })
    .slice(Math.max(0, (snapshot.narrative.scoutConflicts?.length ?? 0) - SCOUT_CONFLICT_CAP));
  const dynastyCards = [...(snapshot.narrative.dynastyCards ?? [])];
  while (dynastyCards.length > DYNASTY_CARD_CAP) {
    const removableIndex = dynastyCards.findIndex((card) => {
      const cardType = card.type as string;
      return cardType !== 'championship' && cardType !== 'championship_run';
    });
    dynastyCards.splice(removableIndex >= 0 ? removableIndex : 0, 1);
  }

  const nextSnapshot: GameSnapshot = {
    ...snapshot,
    narrative: {
      ...snapshot.narrative,
      consequenceWatchers,
      playerStoryArcs,
      tickerFeed,
      scoutConflicts,
      dynastyCards,
    },
    minorLeagueState: {
      ...snapshot.minorLeagueState,
      activeDevelopmentSetbacks,
    },
    performanceDiagnostics: {
      totalSeasons: snapshot.performanceDiagnostics?.totalSeasons ?? Math.max(1, snapshot.season),
      snapshotSizeBytes: 0,
    },
  };

  return {
    ...nextSnapshot,
    performanceDiagnostics: {
      ...nextSnapshot.performanceDiagnostics,
      snapshotSizeBytes: estimateSnapshotSize(nextSnapshot),
    },
  };
}
