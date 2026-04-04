import type { SeasonArchiveEntry, SeasonHistoryEntry } from '@mbd/contracts';

function hashString(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash * 31) + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

function pickTemplate(scope: string, templates: string[]): string {
  return templates[hashString(scope) % templates.length] ?? templates[0] ?? '';
}

function unique(values: Array<string | null | undefined>, limit?: number): string[] {
  const deduped = values
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .filter((value, index, array) => array.indexOf(value) === index);
  return typeof limit === 'number' ? deduped.slice(0, limit) : deduped;
}

function userSummary(
  seasonHistory: SeasonHistoryEntry,
  seasonArchive?: SeasonArchiveEntry | null,
) {
  return seasonArchive?.userSummary ?? seasonHistory.userSeason ?? null;
}

function narrativeAnchor(
  seasonHistory: SeasonHistoryEntry,
  seasonArchive?: SeasonArchiveEntry | null,
): string {
  return unique([
    ...(seasonHistory.userSeason?.storylines ?? []),
    ...seasonHistory.keyMoments,
    ...(seasonArchive?.timelineEvents ?? []),
    ...(seasonArchive?.transactions ?? []).map((entry) => entry.headline),
  ], 1)[0] ?? 'The winter agenda is clear now.';
}

function seasonMood(
  seasonHistory: SeasonHistoryEntry,
  seasonArchive?: SeasonArchiveEntry | null,
): 'champion' | 'contender' | 'playoff' | 'reset' {
  const summary = userSummary(seasonHistory, seasonArchive);
  const playoffResult = summary?.playoffResult ?? '';

  if (seasonHistory.championTeamId && seasonHistory.championTeamId === summary?.teamId) {
    return 'champion';
  }
  if (/world series|lcs|championship/i.test(playoffResult)) {
    return 'contender';
  }
  if (/playoff|wild card|division series|alds|nlds/i.test(playoffResult)) {
    return 'playoff';
  }
  return 'reset';
}

export function generateOffseasonHeadline(
  seasonHistory: SeasonHistoryEntry,
  seasonArchive?: SeasonArchiveEntry | null,
): string {
  const summary = userSummary(seasonHistory, seasonArchive);
  const record = summary?.record ?? '0-0';
  const scope = `${seasonHistory.season}:${summary?.teamId ?? 'team'}:${record}:${summary?.playoffResult ?? ''}`;

  switch (seasonMood(seasonHistory, seasonArchive)) {
    case 'champion':
      return pickTemplate(scope, [
        'World Series momentum now sets the offseason brief.',
        'A World Series finish just raised the winter standard.',
        'World Series afterglow carries straight into the winter.',
      ]);
    case 'contender':
      return pickTemplate(scope, [
        `A ${record} run left the offseason focused on one more push.`,
        `After ${record}, the winter starts with a contender's checklist.`,
        `${record} put real pressure on the front office to finish the climb.`,
      ]);
    case 'playoff':
      return pickTemplate(scope, [
        `A ${record} season kept the window open, but October left work unfinished.`,
        `${record} was good enough to matter, not good enough to rest on.`,
        `The offseason opens with ${record} and a clear next tier to chase.`,
      ]);
    case 'reset':
    default:
      return pickTemplate(scope, [
        `After ${record}, the offseason brief is a reset.`,
        `${record} put the winter focus on repairing the roster's weak spots.`,
        `The offseason starts with ${record} and no room for self-delusion.`,
      ]);
  }
}

export function generateSeasonRecapNarrative(
  seasonHistory: SeasonHistoryEntry,
  seasonArchive?: SeasonArchiveEntry | null,
): string {
  const summary = userSummary(seasonHistory, seasonArchive);
  const record = summary?.record ?? '0-0';
  const playoffResult = summary?.playoffResult ?? seasonHistory.summary;
  const anchor = narrativeAnchor(seasonHistory, seasonArchive);
  return `${record}. ${playoffResult}. ${anchor} ${seasonHistory.summary}`;
}
