import type { ArchivedSeason, SeasonArchiveEntry, SeasonHistoryEntry, SeasonStatLeader, SeasonStatLeaders } from '@mbd/contracts';

export type DynastyEraState = 'rebuild' | 'ascent' | 'contention' | 'peak' | 'reset';
export type DynastyTimelineMemoryBeatKind = 'playoff' | 'trade' | 'draft' | 'award' | 'stat' | 'retirement' | 'rivalry' | 'breakout' | 'injury' | 'identity' | 'story';

export interface DynastyTimelineMemoryBeat {
  id: string;
  kind: DynastyTimelineMemoryBeatKind;
  label: string;
  summary: string;
  playerIds: string[];
  playerNameFallbacks?: Record<string, string>;
  teamIds: string[];
  gameIndex?: number;
  archivedGameId?: string;
}

export interface DynastyTimelinePlayerMomentBeat {
  playerId: string;
  teamId: string;
  type: string;
  label: string;
  summary: string;
  relevance: number;
  day: number | null;
  playerNameFallback?: string;
  gameIndex?: number;
  archivedGameId?: string;
}

export interface DynastyTimelineTeamMomentBeat {
  teamId: string;
  teamIds?: string[];
  type: string;
  label: string;
  summary: string;
  relevance: number;
  day: number | null;
  playerIds?: string[];
  playerNameFallbacks?: Record<string, string>;
  gameIndex?: number;
  archivedGameId?: string;
}

export interface DynastyTimelineEntryLike {
  season: number;
  record: string;
  playoffResult: string;
  championship: boolean;
  dynastyScore: number;
  keyAcquisitions: string[];
  keyDepartures: string[];
  worldSeriesAppearance?: boolean;
  playoffAppearance?: boolean;
  playoffGameIndex?: number;
  playoffArchivedGameId?: string;
  playerMomentBeats?: DynastyTimelinePlayerMomentBeat[];
  teamMomentBeats?: DynastyTimelineTeamMomentBeat[];
}

export type DynastyTimelineSeasonView = SeasonArchiveEntry | ArchivedSeason;

export interface DynastyTimelineSeasonSummary {
  id: string;
  season: number;
  record: string;
  wins: number;
  losses: number;
  playoffResult: string;
  championship: boolean;
  playoffAppearance: boolean;
  dynastyScore: number;
  keyAcquisitions: string[];
  keyDepartures: string[];
  storylineHook: string | null;
  memoryBeats: DynastyTimelineMemoryBeat[];
  state: DynastyEraState;
}

export interface DynastyTimelineChapter {
  id: string;
  title: string;
  startSeason: number;
  endSeason: number;
  dominantState: DynastyEraState;
  seasons: DynastyTimelineSeasonSummary[];
  championshipCount: number;
  playoffSeasonCount: number;
  bestWinTotal: number;
  averageWins: number;
  dynastyScoreDelta: number;
  keyStoryline: string | null;
  notableAdds: string[];
  notableLosses: string[];
}

interface BuildDynastyTimelineArgs {
  franchiseTimeline: DynastyTimelineEntryLike[];
  seasonViews: Record<number, DynastyTimelineSeasonView>;
  seasonHistory: SeasonHistoryEntry[];
}

interface DynastyTimelineChapterDraft {
  seasons: DynastyTimelineSeasonSummary[];
}

const LARGE_WIN_SWING = 12;
const RESET_WIN_DROP = -10;
const MAX_CHAPTER_SIZE = 5;
const TARGET_MIN_CHAPTER_SIZE = 3;
const STAT_LEADER_ORDER = ['hr', 'rbi', 'avg', 'era', 'k', 'w'] as const satisfies readonly (keyof SeasonStatLeaders)[];

function parseRecord(record: string): { wins: number; losses: number } {
  const match = /^(\d+)-(\d+)$/.exec(record.trim());
  if (!match) {
    return { wins: 0, losses: 0 };
  }

  return {
    wins: Number(match[1]),
    losses: Number(match[2]),
  };
}

function isArchivedSeasonView(view: DynastyTimelineSeasonView | null | undefined): view is ArchivedSeason {
  return view != null && !('playoffSeries' in view);
}

function isFullSeasonArchive(view: DynastyTimelineSeasonView | null | undefined): view is SeasonArchiveEntry {
  return view != null && 'playoffSeries' in view;
}

function seasonViewTeamId(view: DynastyTimelineSeasonView | null | undefined, history: SeasonHistoryEntry | undefined): string | null {
  if (view && !isArchivedSeasonView(view)) {
    return view.userSummary?.teamId ?? null;
  }

  return history?.userSeason?.teamId ?? null;
}

function seasonViewRecord(view: DynastyTimelineSeasonView | null | undefined, fallbackRecord: string): { record: string; wins: number; losses: number } {
  if (!view) {
    const parsed = parseRecord(fallbackRecord);
    return { record: fallbackRecord, ...parsed };
  }

  if (isArchivedSeasonView(view)) {
    if (view.userRecord) {
      return {
        record: `${view.userRecord.wins}-${view.userRecord.losses}`,
        wins: view.userRecord.wins,
        losses: view.userRecord.losses,
      };
    }

    const parsed = parseRecord(fallbackRecord);
    return { record: fallbackRecord, ...parsed };
  }

  if (view.userSummary?.record) {
    const parsed = parseRecord(view.userSummary.record);
    return { record: view.userSummary.record, ...parsed };
  }

  const parsed = parseRecord(fallbackRecord);
  return { record: fallbackRecord, ...parsed };
}

function seasonViewPlayoffResult(
  entry: DynastyTimelineEntryLike,
  view: DynastyTimelineSeasonView | null | undefined,
): string {
  if (view) {
    if (isArchivedSeasonView(view)) {
      return view.playoffResult ?? (view.championshipWon ? 'Champion' : entry.playoffResult);
    }

    return view.userSummary?.playoffResult ?? entry.playoffResult;
  }

  return entry.playoffResult;
}

function didMakePlayoffs(playoffResult: string, entry: DynastyTimelineEntryLike): boolean {
  if (entry.playoffAppearance != null) {
    return entry.playoffAppearance;
  }

  const normalized = playoffResult.trim().toLowerCase();
  if (normalized.length === 0) {
    return false;
  }

  return !['missed playoffs', 'did not qualify', 'no playoff result recorded'].includes(normalized);
}

function didReachPeak(
  entry: DynastyTimelineEntryLike,
  playoffResult: string,
  teamId: string | null,
  history: SeasonHistoryEntry | undefined,
): boolean {
  if (entry.championship || entry.worldSeriesAppearance) {
    return true;
  }

  const normalized = playoffResult.toLowerCase();
  if (normalized.includes('champion') || normalized.includes('world series')) {
    return true;
  }

  return teamId != null && history?.runnerUpTeamId === teamId;
}

function getStorylineHook(
  entry: DynastyTimelineEntryLike,
  view: DynastyTimelineSeasonView | null | undefined,
  history: SeasonHistoryEntry | undefined,
): string | null {
  const candidates = [
    history?.summary ?? '',
    history?.userSeason?.storylines?.[0] ?? '',
    !view || isArchivedSeasonView(view) ? '' : (view.userSummary?.storylines?.[0] ?? ''),
    history?.keyMoments?.[0] ?? '',
    !view || isArchivedSeasonView(view) ? '' : (view.timelineEvents?.[0] ?? ''),
    entry.keyAcquisitions[0] ?? '',
    entry.keyDepartures[0] ?? '',
  ];

  return candidates.find((candidate) => candidate.trim().length > 0) ?? null;
}

function hasRosterPivot(entry: DynastyTimelineEntryLike): boolean {
  return entry.keyAcquisitions.length + entry.keyDepartures.length >= 2;
}

function awardLabel(league: string, award: string): string {
  return `${league} ${award.replace(/_/g, ' ')}`.trim();
}

function statLeaderLabel(stat: keyof SeasonStatLeaders): string {
  switch (stat) {
    case 'hr':
      return 'Home Run Leader';
    case 'rbi':
      return 'RBI Leader';
    case 'avg':
      return 'Batting Average Leader';
    case 'era':
      return 'ERA Leader';
    case 'k':
      return 'Strikeout Leader';
    case 'w':
      return 'Wins Leader';
    default:
      return 'League Leader';
  }
}

function statLeaderSummary(stat: keyof SeasonStatLeaders, leader: SeasonStatLeader): string {
  const summary = leader.summary.trim();
  return summary.length > 0
    ? summary
    : `${leader.playerId} led the league in ${statLeaderLabel(stat).toLowerCase()} with ${leader.value}.`;
}

function retirementPlayerNameFallback(summary: string): string | null {
  const match = /^(.+?) retired after \d+ seasons\b/i.exec(summary.trim());
  const name = match?.[1]?.trim() ?? '';
  return name.length > 0 ? name : null;
}

function awardPlayerNameFallback(summary: string | null | undefined): string | null {
  if (typeof summary !== 'string') {
    return null;
  }

  const [first = '', second = ''] = summary.trim().split(/\s+/);
  if (!/^[A-Z][A-Za-z'-]*$/.test(first) || !/^[A-Z][A-Za-z'-]*$/.test(second)) {
    return null;
  }

  return `${first} ${second}`;
}

function statLeaderPlayerNameFallback(summary: string): string | null {
  return awardPlayerNameFallback(summary);
}

function collectStatLeaderMemorySources(
  view: DynastyTimelineSeasonView | null | undefined,
  history: SeasonHistoryEntry | undefined,
  teamId: string | null,
): Array<{ stat: keyof SeasonStatLeaders; leader: SeasonStatLeader }> {
  const sources = [view?.statLeaders, history?.statLeaders].filter((source): source is SeasonStatLeaders => source != null);
  const leaders: Array<{ stat: keyof SeasonStatLeaders; leader: SeasonStatLeader }> = [];
  const seen = new Set<string>();

  for (const source of sources) {
    for (const stat of STAT_LEADER_ORDER) {
      for (const leader of source[stat] ?? []) {
        if (teamId != null && leader.teamId !== teamId) {
          continue;
        }

        const key = `${stat}:${leader.playerId}`;
        if (seen.has(key)) {
          continue;
        }

        seen.add(key);
        leaders.push({ stat, leader });
      }
    }
  }

  return leaders;
}

function compactRosterMoveMemoryKind(summary: string): DynastyTimelineMemoryBeatKind {
  return /\b(acquired|acquisition|blockbuster|deadline|deal|flipped|swap|trade|traded)\b/i.test(summary)
    ? 'trade'
    : 'story';
}

function classifyStoryMemoryLabel(summary: string): { kind: DynastyTimelineMemoryBeatKind; label: string } {
  const normalized = summary.toLowerCase();
  if (normalized.includes('rivalry') || /^[a-z]{2,4}-[a-z]{2,4}:/i.test(summary)) {
    return { kind: 'rivalry', label: 'Rivalry Turn' };
  }
  if (normalized.includes('injur') || normalized.includes(' injured') || normalized.includes(' il ')) {
    return { kind: 'injury', label: 'Injury Watch' };
  }
  if (normalized.includes('breakout') || normalized.includes('rookie') || normalized.includes('emerged')) {
    return { kind: 'breakout', label: 'Breakout Season' };
  }
  return { kind: 'story', label: 'Season Memory' };
}

function playerMomentBeatKind(type: string, label: string): DynastyTimelineMemoryBeatKind {
  const normalizedLabel = label.toLowerCase();
  if (
    type === 'no_hitter'
    || type === 'perfect_game'
    || type === 'cycle'
    || type === 'milestone_500hr'
    || type === 'milestone_3000h'
    || type === 'milestone_300w'
    || normalizedLabel.includes('no-hitter')
    || normalizedLabel.includes('perfect game')
    || normalizedLabel.includes('cycle')
    || normalizedLabel.includes('milestone')
  ) {
    return 'stat';
  }
  if (type === 'injury_return_hero' || normalizedLabel.includes('injur')) {
    return 'injury';
  }
  if (type === 'rookie_breakout' || normalizedLabel.includes('breakout')) {
    return 'breakout';
  }
  return 'story';
}

function teamMomentBeatKind(type: string, label: string): DynastyTimelineMemoryBeatKind {
  const normalized = `${type} ${label}`.toLowerCase();
  if (normalized.includes('rivalry')) {
    return 'rivalry';
  }
  if (normalized.includes('trade') || normalized.includes('deadline') || normalized.includes('fire_sale')) {
    return 'trade';
  }
  if (
    normalized.includes('championship')
    || normalized.includes('playoff')
    || normalized.includes('three_peat')
    || normalized.includes('contender')
  ) {
    return 'playoff';
  }
  if (normalized.includes('breakout')) {
    return 'breakout';
  }
  if (normalized.includes('injur')) {
    return 'injury';
  }
  if (
    normalized.includes('dominant_rotation')
    || normalized.includes('lineup_of_era')
    || normalized.includes('hot_streak')
    || normalized.includes('cold_snap')
    || normalized.includes('closer_lights_out')
    || normalized.includes('closer_meltdown')
    || normalized.includes('bench_clutch')
    || normalized.includes('bullpen_collapse')
    || normalized.includes('bullpen_overwork')
    || normalized.includes('dominant rotation')
    || normalized.includes('lineup of era')
    || normalized.includes('hot streak')
    || normalized.includes('cold snap')
    || normalized.includes('closer lockdown')
    || normalized.includes('closer meltdown')
    || normalized.includes('bench spark')
    || normalized.includes('bullpen workload')
    || normalized.includes('mentorship')
  ) {
    return 'identity';
  }
  return 'story';
}

function playoffMemoryLabel(championship: boolean, userTeamLostSeries: boolean, worldSeriesRunnerUp: boolean): string {
  if (championship) {
    return 'Championship';
  }

  if (worldSeriesRunnerUp) {
    return 'World Series Run';
  }

  return userTeamLostSeries ? 'Playoff Collapse' : 'October Turn';
}

function worldSeriesRunnerUpMemory(
  history: SeasonHistoryEntry | undefined,
  teamId: string | null,
): { summary: string; teamIds: string[] } | null {
  if (!teamId || history?.runnerUpTeamId !== teamId) {
    return null;
  }

  return {
    summary: history.worldSeriesRecord
      ? `World Series ended ${history.worldSeriesRecord}`
      : 'World Series runner-up finish',
    teamIds: unique([history.championTeamId ?? '', history.runnerUpTeamId ?? '']),
  };
}

function buildMemoryBeats(
  entry: DynastyTimelineEntryLike,
  view: DynastyTimelineSeasonView | null | undefined,
  history: SeasonHistoryEntry | undefined,
  teamId: string | null,
  playoffResult: string,
  playoffAppearance: boolean,
): DynastyTimelineMemoryBeat[] {
  const fullArchive = isFullSeasonArchive(view) ? view : null;
  const beats: DynastyTimelineMemoryBeat[] = [];
  const seen = new Set<string>();
  const addBeat = (beat: Omit<DynastyTimelineMemoryBeat, 'id'>) => {
    const summary = beat.summary.trim();
    if (!summary) {
      return;
    }

    const key = `${beat.kind}:${beat.label}:${summary}`;
    if (seen.has(key)) {
      return;
    }

    seen.add(key);
    const playerIds = unique(beat.playerIds);
    const playerNameFallbacks = Object.fromEntries(
      Object.entries(beat.playerNameFallbacks ?? {})
        .map(([playerId, playerName]) => [playerId, playerName.trim()] as const)
        .filter(([playerId, playerName]) => playerIds.includes(playerId) && playerName.length > 0),
    );

    beats.push({
      id: `memory-${entry.season}-${beats.length + 1}`,
      ...beat,
      summary,
      playerIds,
      ...(Object.keys(playerNameFallbacks).length > 0 ? { playerNameFallbacks } : {}),
      teamIds: unique(beat.teamIds),
    });
  };

  if (playoffAppearance) {
    const userSeries = teamId
      ? fullArchive?.playoffSeries.find((series) => series.loserTeamId === teamId)
      : null;
    const runnerUpMemory = userSeries == null ? worldSeriesRunnerUpMemory(history, teamId) : null;
    const normalizedResult = playoffResult.toLowerCase();
    const championship = entry.championship
      || normalizedResult === 'champion'
      || normalizedResult.includes('won world series')
      || normalizedResult.includes('world series champion');
    addBeat({
      kind: 'playoff',
      label: playoffMemoryLabel(championship, userSeries != null, runnerUpMemory != null),
      summary: userSeries?.round && userSeries.result
        ? `${userSeries.round} ended ${userSeries.result}`
        : (runnerUpMemory?.summary ?? playoffResult),
      playerIds: [],
      teamIds: runnerUpMemory?.teamIds
        ?? unique([userSeries?.winnerTeamId ?? '', userSeries?.loserTeamId ?? '', teamId ?? '']),
      ...(entry.playoffGameIndex != null ? { gameIndex: entry.playoffGameIndex } : {}),
      ...(entry.playoffArchivedGameId != null ? { archivedGameId: entry.playoffArchivedGameId } : {}),
    });
  }

  for (const trade of history?.blockbusterTrades ?? []) {
    addBeat({
      kind: 'trade',
      label: 'Defining Trade',
      summary: trade.summary || trade.headline,
      playerIds: trade.playerIds,
      teamIds: trade.teamIds,
    });
  }

  for (const transaction of [...(fullArchive?.transactions ?? [])]
    .sort((left, right) => right.impactScore - left.impactScore || left.headline.localeCompare(right.headline))
    .slice(0, 2)) {
    const tradeLike = /trade|deal|blockbuster|deadline/i.test(`${transaction.headline} ${transaction.summary}`);
    addBeat({
      kind: tradeLike ? 'trade' : 'story',
      label: tradeLike ? 'Defining Trade' : 'Roster Pivot',
      summary: transaction.summary || transaction.headline,
      playerIds: transaction.playerIds,
      teamIds: transaction.teamIds,
    });
  }

  if ((fullArchive?.transactions.length ?? 0) === 0) {
    for (const summary of entry.keyAcquisitions.slice(0, 2)) {
      addBeat({
        kind: compactRosterMoveMemoryKind(summary),
        label: 'Key Addition',
        summary,
        playerIds: [],
        teamIds: [teamId ?? ''],
      });
    }

    for (const summary of entry.keyDepartures.slice(0, 2)) {
      addBeat({
        kind: compactRosterMoveMemoryKind(summary),
        label: 'Key Departure',
        summary,
        playerIds: [],
        teamIds: [teamId ?? ''],
      });
    }
  }

  for (const pick of (fullArchive?.draftClass ?? [])
    .filter((pick) => teamId == null || pick.teamId === teamId)
    .sort((left, right) => left.pickNumber - right.pickNumber)
    .slice(0, 2)) {
    addBeat({
      kind: 'draft',
      label: `Draft Pick #${pick.pickNumber}`,
      summary: `${pick.playerName} joined the system and is now ${pick.currentStatus}.`,
      playerIds: [pick.playerId],
      playerNameFallbacks: { [pick.playerId]: pick.playerName },
      teamIds: [pick.teamId],
    });
  }

  for (const award of [...(history?.awards ?? []), ...(fullArchive?.awards ?? [])]
    .filter((award, index, awards) =>
      (teamId == null || award.teamId === teamId)
      && awards.findIndex((candidate) =>
        candidate.season === award.season
        && candidate.award === award.award
        && candidate.league === award.league
        && candidate.playerId === award.playerId,
      ) === index)
    .slice(0, 2)) {
    const playerName = awardPlayerNameFallback(award.summary);
    addBeat({
      kind: 'award',
      label: awardLabel(award.league, award.award),
      summary: award.summary || `${award.playerId} won ${awardLabel(award.league, award.award)}.`,
      playerIds: [award.playerId],
      playerNameFallbacks: playerName ? { [award.playerId]: playerName } : {},
      teamIds: [award.teamId],
    });
  }

  for (const retirement of history?.notableRetirements ?? []) {
    const playerName = retirementPlayerNameFallback(retirement.summary);
    addBeat({
      kind: 'retirement',
      label: 'Retirement',
      summary: retirement.summary,
      playerIds: [retirement.playerId],
      playerNameFallbacks: playerName ? { [retirement.playerId]: playerName } : {},
      teamIds: [retirement.teamId],
    });
  }

  for (const momentBeat of [...(entry.playerMomentBeats ?? [])]
    .sort((left, right) =>
      right.relevance - left.relevance
      || (right.day ?? 0) - (left.day ?? 0)
      || left.label.localeCompare(right.label)
      || left.playerId.localeCompare(right.playerId),
    )
    .slice(0, 3)) {
    addBeat({
      kind: playerMomentBeatKind(momentBeat.type, momentBeat.label),
      label: momentBeat.label,
      summary: momentBeat.summary,
      playerIds: [momentBeat.playerId],
      playerNameFallbacks: momentBeat.playerNameFallback
        ? { [momentBeat.playerId]: momentBeat.playerNameFallback }
        : {},
      teamIds: [momentBeat.teamId],
      ...(momentBeat.gameIndex != null ? { gameIndex: momentBeat.gameIndex } : {}),
      ...(momentBeat.archivedGameId != null ? { archivedGameId: momentBeat.archivedGameId } : {}),
    });
  }

  for (const momentBeat of [...(entry.teamMomentBeats ?? [])]
    .sort((left, right) =>
      right.relevance - left.relevance
      || (right.day ?? 0) - (left.day ?? 0)
      || left.label.localeCompare(right.label)
      || left.teamId.localeCompare(right.teamId),
    )
    .slice(0, 3)) {
    const teamIds = unique(momentBeat.teamIds ?? [momentBeat.teamId]);
    addBeat({
      kind: teamMomentBeatKind(momentBeat.type, momentBeat.label),
      label: momentBeat.label,
      summary: momentBeat.summary,
      playerIds: momentBeat.playerIds ?? [],
      teamIds,
      ...(momentBeat.playerNameFallbacks ? { playerNameFallbacks: momentBeat.playerNameFallbacks } : {}),
      ...(momentBeat.gameIndex != null ? { gameIndex: momentBeat.gameIndex } : {}),
      ...(momentBeat.archivedGameId != null ? { archivedGameId: momentBeat.archivedGameId } : {}),
    });
  }

  for (const { stat, leader } of collectStatLeaderMemorySources(view, history, teamId).slice(0, 2)) {
    const summary = statLeaderSummary(stat, leader);
    const playerName = statLeaderPlayerNameFallback(summary);
    addBeat({
      kind: 'stat',
      label: statLeaderLabel(stat),
      summary,
      playerIds: [leader.playerId],
      playerNameFallbacks: playerName ? { [leader.playerId]: playerName } : {},
      teamIds: [leader.teamId],
    });
  }

  for (const summary of [
    ...(fullArchive?.timelineEvents ?? []),
    ...(history?.keyMoments ?? []),
    ...(history?.userSeason?.storylines ?? []),
    ...(fullArchive?.userSummary?.storylines ?? []),
    history?.summary ?? '',
  ]) {
    const { kind, label } = classifyStoryMemoryLabel(summary);
    addBeat({
      kind,
      label,
      summary,
      playerIds: [],
      teamIds: [teamId ?? ''],
    });
  }

  return beats.slice(0, 8);
}

function classifySeasonState(
  entry: DynastyTimelineEntryLike,
  previous: DynastyTimelineSeasonSummary | null,
  wins: number,
  losses: number,
  playoffResult: string,
  madePlayoffs: boolean,
  reachedPeak: boolean,
): DynastyEraState {
  if (reachedPeak) {
    return 'peak';
  }

  if (madePlayoffs || wins >= 90) {
    return 'contention';
  }

  const winDelta = previous ? wins - previous.wins : 0;
  const isWinningSeason = wins >= losses;
  const previousWasContender = previous?.state === 'contention' || previous?.state === 'peak';
  const playoffCollapse = previous != null && previous.playoffAppearance && !madePlayoffs;

  if (
    previousWasContender
    && (
      winDelta <= RESET_WIN_DROP
      || !isWinningSeason
      || playoffCollapse
      || hasRosterPivot(entry)
      || playoffResult.toLowerCase().includes('missed')
    )
  ) {
    return 'reset';
  }

  if (
    isWinningSeason
    && (
      previous == null
      || winDelta >= 8
      || previous.state === 'rebuild'
      || previous.state === 'reset'
      || wins >= 84
    )
  ) {
    return 'ascent';
  }

  return 'rebuild';
}

export function buildDynastyTimelineSeasonSummaries({
  franchiseTimeline,
  seasonViews,
  seasonHistory,
}: BuildDynastyTimelineArgs): DynastyTimelineSeasonSummary[] {
  const ordered = [...franchiseTimeline].sort((left, right) => left.season - right.season);
  const historyBySeason = new Map(seasonHistory.map((entry) => [entry.season, entry]));
  const summaries: DynastyTimelineSeasonSummary[] = [];

  for (const entry of ordered) {
    const view = seasonViews[entry.season];
    const history = historyBySeason.get(entry.season);
    const teamId = seasonViewTeamId(view, history);
    const { record, wins, losses } = seasonViewRecord(view, entry.record);
    const playoffResult = seasonViewPlayoffResult(entry, view);
    const playoffAppearance = didMakePlayoffs(playoffResult, entry);
    const reachedPeak = didReachPeak(entry, playoffResult, teamId, history);
    const state = classifySeasonState(entry, summaries.at(-1) ?? null, wins, losses, playoffResult, playoffAppearance, reachedPeak);

    summaries.push({
      id: `dynasty-season-${entry.season}`,
      season: entry.season,
      record,
      wins,
      losses,
      playoffResult,
      championship: entry.championship,
      playoffAppearance,
      dynastyScore: entry.dynastyScore,
      keyAcquisitions: entry.keyAcquisitions,
      keyDepartures: entry.keyDepartures,
      storylineHook: getStorylineHook(entry, view, history),
      memoryBeats: buildMemoryBeats(entry, view, history, teamId, playoffResult, playoffAppearance),
      state,
    });
  }

  return summaries;
}

function chapterTransitionWeight(state: DynastyEraState): number {
  switch (state) {
    case 'peak':
      return 5;
    case 'reset':
      return 4;
    case 'contention':
      return 3;
    case 'ascent':
      return 2;
    case 'rebuild':
    default:
      return 1;
  }
}

function shouldStartNewChapter(previous: DynastyTimelineSeasonSummary, current: DynastyTimelineSeasonSummary): boolean {
  const winDelta = current.wins - previous.wins;
  const playoffFlip = previous.playoffAppearance !== current.playoffAppearance;

  if (current.state === 'peak' || previous.state === 'peak') {
    return true;
  }

  if (current.state === 'reset' && previous.state !== 'reset') {
    return true;
  }

  if (previous.state === 'reset' && current.state === 'rebuild') {
    return false;
  }

  if (previous.state !== current.state && chapterTransitionWeight(previous.state) !== chapterTransitionWeight(current.state)) {
    return true;
  }

  if (Math.abs(winDelta) >= LARGE_WIN_SWING || playoffFlip) {
    return true;
  }

  return false;
}

function mergeChapters(left: DynastyTimelineChapterDraft, right: DynastyTimelineChapterDraft): DynastyTimelineChapterDraft {
  return {
    seasons: [...left.seasons, ...right.seasons],
  };
}

function isMeaningfulSingleton(chapter: DynastyTimelineChapterDraft): boolean {
  const only = chapter.seasons[0];
  return chapter.seasons.length === 1 && (only?.state === 'peak' || only?.state === 'reset');
}

function hasHardBoundaryState(chapter: DynastyTimelineChapterDraft): boolean {
  return chapter.seasons.some((season) => season.state === 'peak' || season.state === 'reset');
}

function smoothChapters(chapters: DynastyTimelineChapterDraft[]): DynastyTimelineChapterDraft[] {
  const smoothed: DynastyTimelineChapterDraft[] = [];

  for (let index = 0; index < chapters.length; index += 1) {
    let current = { ...chapters[index]!, seasons: [...chapters[index]!.seasons] };

    if (current.seasons.length < TARGET_MIN_CHAPTER_SIZE && !hasHardBoundaryState(current)) {
      while (
        index + 1 < chapters.length
        && current.seasons.length < TARGET_MIN_CHAPTER_SIZE
        && !hasHardBoundaryState(chapters[index + 1]!)
        && current.seasons.length + chapters[index + 1]!.seasons.length <= MAX_CHAPTER_SIZE
      ) {
        current = mergeChapters(current, chapters[index + 1]!);
        index += 1;
      }
    }

    smoothed.push(current);
  }

  return smoothed;
}

function dominantStateForChapter(seasons: DynastyTimelineSeasonSummary[]): DynastyEraState {
  if (seasons.some((season) => season.state === 'peak')) {
    return 'peak';
  }

  if (seasons[0]?.state === 'reset' || seasons.some((season) => season.state === 'reset')) {
    return 'reset';
  }

  if (seasons[0]?.state === 'rebuild' && ['ascent', 'contention'].includes(seasons.at(-1)?.state ?? '')) {
    return 'ascent';
  }

  if (seasons.some((season) => season.state === 'contention')) {
    return 'contention';
  }

  if (seasons.some((season) => season.state === 'ascent')) {
    return 'ascent';
  }

  return 'rebuild';
}

function unique(values: string[]): string[] {
  return values.filter((value, index) => value.length > 0 && values.indexOf(value) === index);
}

function chapterTitleForState(
  dominantState: DynastyEraState,
  chapter: DynastyTimelineChapterDraft,
  isEarliestChapter: boolean,
): string {
  if (dominantState === 'peak') {
    return 'Peak Years';
  }

  if (dominantState === 'reset') {
    return 'Window Closes';
  }

  if (dominantState === 'ascent') {
    return isEarliestChapter ? 'Foundation' : 'Window Opens';
  }

  if (dominantState === 'contention') {
    return chapter.seasons.some((season) => season.playoffAppearance) ? 'Contender Run' : 'Window Opens';
  }

  return isEarliestChapter ? 'Foundation' : 'Rebuild';
}

function finalizeChapter(
  chapter: DynastyTimelineChapterDraft,
  index: number,
  total: number,
): DynastyTimelineChapter {
  const startSeason = chapter.seasons[0]!.season;
  const endSeason = chapter.seasons.at(-1)!.season;
  const dominantState = dominantStateForChapter(chapter.seasons);
  const championships = chapter.seasons.filter((season) => season.championship).length;
  const playoffSeasons = chapter.seasons.filter((season) => season.playoffAppearance).length;
  const wins = chapter.seasons.map((season) => season.wins);
  const dynastyScoreDelta = chapter.seasons.at(-1)!.dynastyScore - chapter.seasons[0]!.dynastyScore;
  const title = chapterTitleForState(dominantState, chapter, index === 0);

  return {
    id: `dynasty-chapter-${startSeason}-${endSeason}`,
    title,
    startSeason,
    endSeason,
    dominantState,
    seasons: chapter.seasons,
    championshipCount: championships,
    playoffSeasonCount: playoffSeasons,
    bestWinTotal: Math.max(...wins),
    averageWins: Math.round(wins.reduce((sum, value) => sum + value, 0) / wins.length),
    dynastyScoreDelta,
    keyStoryline: chapter.seasons.find((season) => season.storylineHook)?.storylineHook ?? null,
    notableAdds: unique(chapter.seasons.flatMap((season) => season.keyAcquisitions)).slice(0, 3),
    notableLosses: unique(chapter.seasons.flatMap((season) => season.keyDepartures)).slice(0, 3),
  };
}

export function buildDynastyTimelineChapters(args: BuildDynastyTimelineArgs): DynastyTimelineChapter[] {
  const summaries = buildDynastyTimelineSeasonSummaries(args);
  if (summaries.length === 0) {
    return [];
  }

  const chapters: DynastyTimelineChapterDraft[] = [];
  for (const summary of summaries) {
    const current = chapters.at(-1);
    if (!current) {
      chapters.push({ seasons: [summary] });
      continue;
    }

    const previous = current.seasons.at(-1)!;
    if (shouldStartNewChapter(previous, summary)) {
      chapters.push({ seasons: [summary] });
    } else {
      current.seasons.push(summary);
    }
  }

  const smoothed = smoothChapters(chapters);
  return smoothed
    .map((chapter, index) => finalizeChapter(chapter, index, smoothed.length))
    .reverse();
}
