import type { AwardHistoryEntry } from '@mbd/contracts';
import type { GeneratedPlayer } from '../player/generation.js';
import type { PlayerGameStats } from '../sim/gameSimulator.js';
import { getTeamById } from './teams.js';

export interface AwardRaceEntry {
  playerId: string;
  teamId: string;
  score: number;
  summary: string;
}

export interface AwardRaces {
  mvp: AwardRaceEntry[];
  cyYoung: AwardRaceEntry[];
  roy: AwardRaceEntry[];
}

type LeagueId = 'AL' | 'NL';

function hitterScore(stats: PlayerGameStats): number {
  return (
    stats.hr * 4 +
    stats.rbi * 1.2 +
    stats.hits * 0.6 +
    stats.runs * 0.8 +
    stats.bb * 0.35
  );
}

function pitcherScore(stats: PlayerGameStats): number {
  return (
    stats.strikeouts * 0.75 +
    (stats.ip / 3) * 1.2 -
    stats.earnedRuns * 2.5 -
    stats.walks * 0.4
  );
}

function silverSluggerScore(stats: PlayerGameStats): number {
  const average = stats.hits / Math.max(1, stats.ab);
  return hitterScore(stats) + (average * 140) + (stats.hr * 0.8);
}

function goldGloveScore(player: GeneratedPlayer, stats: PlayerGameStats): number {
  if (player.pitcherAttributes != null) {
    return (
      player.pitcherAttributes.control * 0.32 +
      player.pitcherAttributes.movement * 0.24 +
      player.pitcherAttributes.velocity * 0.12 +
      (stats.ip / 3) * 0.35 -
      stats.walks * 0.4
    );
  }

  return (
    player.hitterAttributes.defense * 0.55 +
    player.hitterAttributes.speed * 0.18 +
    player.hitterAttributes.durability * 0.12 +
    stats.pa * 0.06 +
    stats.hits * 0.08
  );
}

function topFive(entries: AwardRaceEntry[]): AwardRaceEntry[] {
  return [...entries].sort((a, b) => b.score - a.score).slice(0, 5);
}

function topAwardEntry(
  players: GeneratedPlayer[],
  statsByPlayer: Map<string, PlayerGameStats>,
  scorer: (player: GeneratedPlayer, stats: PlayerGameStats) => number,
  summaryFormatter: (player: GeneratedPlayer) => string,
): AwardRaceEntry | undefined {
  return players
    .map((player) => ({
      player,
      stats: statsByPlayer.get(player.id),
    }))
    .filter((entry): entry is { player: GeneratedPlayer; stats: PlayerGameStats } => entry.stats != null)
    .map(({ player, stats }) => ({
      playerId: player.id,
      teamId: player.teamId,
      score: scorer(player, stats),
      summary: summaryFormatter(player),
    }))
    .sort((left, right) => right.score - left.score)[0];
}

export function calculateAwardRaces(
  players: GeneratedPlayer[],
  statsByPlayer: Map<string, PlayerGameStats>,
): AwardRaces {
  const mvp: AwardRaceEntry[] = [];
  const cyYoung: AwardRaceEntry[] = [];
  const roy: AwardRaceEntry[] = [];

  for (const player of players) {
    const stats = statsByPlayer.get(player.id);
    if (!stats) continue;

    const isPitcher = player.pitcherAttributes != null;
    const score = isPitcher ? pitcherScore(stats) : hitterScore(stats);

    if (isPitcher) {
      cyYoung.push({
        playerId: player.id,
        teamId: player.teamId,
        score,
        summary: `${player.firstName} ${player.lastName} is dominating the Cy Young race.`,
      });
    } else {
      mvp.push({
        playerId: player.id,
        teamId: player.teamId,
        score,
        summary: `${player.firstName} ${player.lastName} is carrying the offense.`,
      });
    }

    if (player.age <= 23 || player.developmentPhase === 'Prospect' || player.developmentPhase === 'Ascent') {
      roy.push({
        playerId: player.id,
        teamId: player.teamId,
        score,
        summary: `${player.firstName} ${player.lastName} is forcing his way into the rookie spotlight.`,
      });
    }
  }

  return {
    mvp: topFive(mvp),
    cyYoung: topFive(cyYoung),
    roy: topFive(roy.length > 0 ? roy : mvp),
  };
}

function leagueForTeam(teamId: string): LeagueId | null {
  const division = getTeamById(teamId)?.division;
  if (!division) return null;
  return division.startsWith('AL') ? 'AL' : 'NL';
}

function createAwardEntry(
  season: number,
  award: string,
  winner: AwardRaceEntry | undefined,
  fallback: GeneratedPlayer | undefined,
): AwardHistoryEntry {
  const playerId = winner?.playerId ?? fallback?.id ?? 'unknown';
  const teamId = winner?.teamId ?? fallback?.teamId ?? 'unknown';
  const division = getTeamById(teamId)?.division;
  const summary = winner?.summary ?? `No qualified ${award} pool existed; defaulted to best available player.`;

  return {
    season,
    award,
    league: division?.startsWith('AL') ? 'AL' : division?.startsWith('NL') ? 'NL' : 'MLB',
    playerId,
    teamId,
    summary,
  };
}

export function finalizeAwardResults(
  season: number,
  players: GeneratedPlayer[],
  statsByPlayer: Map<string, PlayerGameStats>,
): AwardHistoryEntry[] {
  const winners: AwardHistoryEntry[] = [];

  for (const league of ['AL', 'NL'] as const) {
    const leaguePlayers = players.filter((player) => leagueForTeam(player.teamId) === league);
    const leagueRaces = calculateAwardRaces(leaguePlayers, statsByPlayer);
    const fallback = leaguePlayers[0];

    winners.push(
      {
        ...createAwardEntry(season, 'MVP', leagueRaces.mvp[0], fallback),
        league,
      },
      {
        ...createAwardEntry(season, 'CY_YOUNG', leagueRaces.cyYoung[0], fallback),
        league,
      },
      {
        ...createAwardEntry(season, 'ROY', leagueRaces.roy[0], fallback),
        league,
      },
      {
        ...createAwardEntry(
          season,
          'GOLD_GLOVE',
          topAwardEntry(
            leaguePlayers,
            statsByPlayer,
            (player, stats) => goldGloveScore(player, stats),
            (player) => `${player.firstName} ${player.lastName} set the defensive standard in ${league}.`,
          ),
          fallback,
        ),
        league,
      },
      {
        ...createAwardEntry(
          season,
          'SILVER_SLUGGER',
          topAwardEntry(
            leaguePlayers.filter((player) => player.pitcherAttributes == null),
            statsByPlayer,
            (_player, stats) => silverSluggerScore(stats),
            (player) => `${player.firstName} ${player.lastName} anchored the league's loudest bat.`,
          ),
          fallback,
        ),
        league,
      },
    );
  }

  return winners;
}
