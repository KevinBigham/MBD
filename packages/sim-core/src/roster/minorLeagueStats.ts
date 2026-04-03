import type { MinorLeagueSeasonLine } from '@mbd/contracts';
import type { AffiliatePlayerStats } from './minorLeagues.js';

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function recordMinorLeagueStats(
  history: Map<string, MinorLeagueSeasonLine[]>,
  playerId: string,
  season: number,
  level: string,
  stats: AffiliatePlayerStats,
): Map<string, MinorLeagueSeasonLine[]> {
  const nextHistory = new Map(history);
  const existing = [...(nextHistory.get(playerId) ?? [])];
  const line: MinorLeagueSeasonLine = {
    season,
    level,
    gamesPlayed: stats.games,
    pa: stats.pa,
    hits: stats.hits,
    hr: stats.hr,
    rbi: stats.rbi,
    avg: stats.pa > 0 ? roundTo(stats.hits / stats.pa, 3) : 0,
    ip: roundTo(stats.ipOuts / 3, 1),
    era: stats.ipOuts > 0 ? roundTo((stats.earnedRuns * 27) / stats.ipOuts, 2) : 0,
    k: stats.strikeouts,
    bb: stats.bb + stats.walks,
  };

  const filtered = existing.filter((entry) => !(entry.season === season && entry.level === level));
  filtered.push(line);
  filtered.sort((left, right) => left.season - right.season || left.level.localeCompare(right.level));
  nextHistory.set(playerId, filtered);
  return nextHistory;
}

export function getMinorLeagueProgression(
  history: Map<string, MinorLeagueSeasonLine[]>,
  playerId: string,
): MinorLeagueSeasonLine[] {
  return [...(history.get(playerId) ?? [])]
    .sort((left, right) => left.season - right.season || left.level.localeCompare(right.level));
}
