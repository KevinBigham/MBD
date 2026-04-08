import type { ArchivedSeason, SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';

export type DynastyEraState = 'rebuild' | 'ascent' | 'contention' | 'peak' | 'reset';

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
