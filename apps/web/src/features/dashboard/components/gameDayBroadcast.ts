import type { GameBoxScore } from '@mbd/sim-core';
import { getTeamById } from '@mbd/sim-core';

export interface BroadcastHighlight {
  type: string;
  text: string;
}

export interface BroadcastPlay {
  inning: number;
  halfInning: 'top' | 'bottom';
  text: string;
  isHighlight: boolean;
}

export interface GameRecapView {
  gameIndex: number;
  recap: string;
  highlights: BroadcastHighlight[];
  playByPlay: BroadcastPlay[];
  boxScore: GameBoxScore;
}

export interface GamePlayByPlayView {
  gameIndex: number;
  recap: string;
  highlights: BroadcastHighlight[];
  plays: BroadcastPlay[];
  boxScore: GameBoxScore;
}

export interface LineScoreRow {
  teamId: string;
  teamAbbreviation: string;
  runsByInning: number[];
  runs: number;
  hits: number;
}

export interface PlayByPlayGroup {
  key: string;
  heading: string;
  plays: BroadcastPlay[];
}

export function teamAbbreviation(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

export function teamName(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

export function formatOrdinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) {
    return `${value}th`;
  }

  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

export function formatHalfInningLabel(inning: number, halfInning: 'top' | 'bottom'): string {
  return `${halfInning === 'top' ? 'Top' : 'Bottom'} ${formatOrdinal(inning)}`;
}

export function formatInningsLabel(innings: number): string {
  return innings === 9 ? 'Final' : `Final/${innings}`;
}

export function buildPlayByPlayGroups(plays: BroadcastPlay[]): PlayByPlayGroup[] {
  const groups = new Map<string, BroadcastPlay[]>();

  for (const play of plays) {
    const key = `${play.inning}:${play.halfInning}`;
    const current = groups.get(key) ?? [];
    current.push(play);
    groups.set(key, current);
  }

  return [...groups.entries()].map(([key, groupedPlays]) => {
    const [inningValue, halfInning] = key.split(':') as [string, 'top' | 'bottom'];
    const inning = Number(inningValue);
    return {
      key,
      heading: formatHalfInningLabel(inning, halfInning),
      plays: groupedPlays,
    };
  });
}

export function deriveLineScore(boxScore: GameBoxScore): LineScoreRow[] {
  const innings = Math.max(1, boxScore.innings);
  const awayRunsByInning = Array.from({ length: innings }, () => 0);
  const homeRunsByInning = Array.from({ length: innings }, () => 0);

  for (const pa of boxScore.paResults) {
    const inningIndex = Math.max(0, pa.inning - 1);
    if (inningIndex >= innings) {
      continue;
    }

    if (pa.halfInning === 'top') {
      awayRunsByInning[inningIndex] = (awayRunsByInning[inningIndex] ?? 0) + Math.max(0, pa.scoreAfter[0] - pa.scoreBefore[0]);
    } else {
      homeRunsByInning[inningIndex] = (homeRunsByInning[inningIndex] ?? 0) + Math.max(0, pa.scoreAfter[1] - pa.scoreBefore[1]);
    }
  }

  return [
    {
      teamId: boxScore.awayTeamId,
      teamAbbreviation: teamAbbreviation(boxScore.awayTeamId),
      runsByInning: awayRunsByInning,
      runs: boxScore.awayScore,
      hits: boxScore.awayHits,
    },
    {
      teamId: boxScore.homeTeamId,
      teamAbbreviation: teamAbbreviation(boxScore.homeTeamId),
      runsByInning: homeRunsByInning,
      runs: boxScore.homeScore,
      hits: boxScore.homeHits,
    },
  ];
}
