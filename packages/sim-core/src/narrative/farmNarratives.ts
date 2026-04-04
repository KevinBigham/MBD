import type {
  DebutFlashback,
  MinorLeagueSeasonLine,
  PlayerOrigin,
  PlayerStoryArc,
  ProspectBond,
} from '@mbd/contracts';
import { getTeamById } from '../league/teams.js';
import { toDisplayRating, type GeneratedPlayer } from '../player/index.js';
import type { GameRNG } from '../math/prng.js';
import type { NewsItem } from './newsFeed.js';

export interface BreakoutCountdown {
  playerId: string;
  playerName: string;
  teamId: string;
  level: string;
  summary: string;
  score: number;
}

export interface BreakoutCountdownSnapshot {
  season: number;
  day: number;
  players: GeneratedPlayer[];
  playerOrigins: Map<string, PlayerOrigin>;
  playerStoryArcs: PlayerStoryArc[];
  minorLeagueStatHistory: Map<string, MinorLeagueSeasonLine[]>;
}

export interface PressConferenceContext {
  season: number;
  day: number;
  userTeamId: string;
  teamRecord: {
    wins: number;
    losses: number;
    divisionRank: number;
    gamesBack: number;
    clinched?: boolean;
    eliminated?: boolean;
  };
  ownerTone: 'supportive' | 'neutral' | 'impatient';
  recentTradeHeadline?: string | null;
  farmStrength: number;
  topProspectCount: number;
}

const BREAKOUT_LEVELS = new Set(['AA', 'AAA']);
const MAX_BREAKOUT_COUNTDOWNS = 3;

function levelLabel(level: string): string {
  return level === 'A_PLUS' ? 'A+' : level;
}

function latestMinorLeagueLine(
  snapshot: BreakoutCountdownSnapshot,
  playerId: string,
): MinorLeagueSeasonLine | null {
  const history = snapshot.minorLeagueStatHistory.get(playerId) ?? [];
  return [...history]
    .sort((left, right) => right.season - left.season || right.gamesPlayed - left.gamesPlayed)
    .find((line) => BREAKOUT_LEVELS.has(line.level)) ?? null;
}

function hitterCountdownScore(
  player: GeneratedPlayer,
  line: MinorLeagueSeasonLine,
  origin: PlayerOrigin,
): number {
  return (
    (line.avg * 1000)
    + (line.hr * 8)
    + (line.rbi * 0.5)
    + ((origin.originalGrade ?? 50) * 2)
    + (toDisplayRating(player.ceiling ?? player.overallRating) * 3)
  );
}

function pitcherCountdownScore(
  player: GeneratedPlayer,
  line: MinorLeagueSeasonLine,
  origin: PlayerOrigin,
): number {
  return (
    ((5 - Math.min(5, line.era)) * 80)
    + (line.k * 1.6)
    + ((origin.originalGrade ?? 50) * 2)
    + (toDisplayRating(player.ceiling ?? player.overallRating) * 3)
  );
}

export function generateDebutFlashback(
  snapshot: {
    season: number;
    playerOrigins: Map<string, PlayerOrigin>;
    debutFlashbacks?: DebutFlashback[];
  },
  player: GeneratedPlayer,
  bond: ProspectBond,
): DebutFlashback | null {
  if (snapshot.debutFlashbacks?.some((entry) => entry.playerId === player.id)) {
    return null;
  }

  const origin = snapshot.playerOrigins.get(player.id);
  if (
    !origin
    || origin.draftSeason == null
    || origin.draftRound == null
    || origin.originalGrade == null
  ) {
    return null;
  }

  return {
    playerId: player.id,
    playerName: `${player.firstName} ${player.lastName}`,
    draftSeason: origin.draftSeason,
    draftRound: origin.draftRound,
    originalGrade: origin.originalGrade,
    debutSeason: snapshot.season,
    debutOverall: toDisplayRating(player.overallRating),
    journeyHighlights: bond.milestones.slice(-4),
  };
}

export function detectBreakoutCountdowns(
  rng: GameRNG,
  snapshot: BreakoutCountdownSnapshot,
): BreakoutCountdown[] {
  const activeArcPlayers = new Set(
    snapshot.playerStoryArcs
      .filter((arc) => arc.resolvedSeason == null)
      .map((arc) => arc.playerId),
  );

  const candidates = snapshot.players
    .filter((player) =>
      BREAKOUT_LEVELS.has(player.rosterStatus)
      && player.age <= 24
      && !activeArcPlayers.has(player.id),
    )
    .map((player) => {
      const origin = snapshot.playerOrigins.get(player.id);
      const line = latestMinorLeagueLine(snapshot, player.id);
      if (!origin || !line) {
        return null;
      }

      const isPitcher = player.pitcherAttributes != null;
      if (isPitcher) {
        if (line.ip < 28 || (line.era > 3.35 && line.k < 44)) {
          return null;
        }
      } else if (line.pa < 120 || (line.avg < 0.315 && line.hr < 10)) {
        return null;
      }

      const score = isPitcher
        ? pitcherCountdownScore(player, line, origin)
        : hitterCountdownScore(player, line, origin);
      const name = `${player.firstName} ${player.lastName}`;
      const statLine = isPitcher
        ? `${line.era.toFixed(2)} ERA with ${line.k} K`
        : `${line.avg.toFixed(3).replace(/^0/, '')} in ${levelLabel(line.level)}`;
      return {
        playerId: player.id,
        playerName: name,
        teamId: player.teamId,
        level: line.level,
        summary: `Dark horse ${name} posting ${statLine} could be next in line for a callup.`,
        score: Number((score + rng.nextFloat()).toFixed(3)),
      } satisfies BreakoutCountdown;
    })
    .filter((candidate): candidate is BreakoutCountdown => candidate != null)
    .sort((left, right) =>
      right.score - left.score
      || left.playerName.localeCompare(right.playerName),
    );

  return candidates.slice(0, MAX_BREAKOUT_COUNTDOWNS);
}

function teamLabel(teamId: string): string {
  const team = getTeamById(teamId);
  return team ? `${team.city} ${team.name}` : teamId.toUpperCase();
}

function pressConferenceQuestion(context: PressConferenceContext): { topic: string; question: string; priority: 2 | 3 } | null {
  if (context.teamRecord.clinched || (context.teamRecord.divisionRank === 1 && context.teamRecord.wins >= context.teamRecord.losses + 12)) {
    return {
      topic: 'first_place',
      question: 'Congratulations on the club surge. How do you keep the edge now that expectations are rising?',
      priority: 2,
    };
  }

  if (context.recentTradeHeadline) {
    return {
      topic: 'trade_reaction',
      question: `That recent deal is being debated around the league. ${context.recentTradeHeadline} Any regrets yet?`,
      priority: 2,
    };
  }

  if (context.teamRecord.gamesBack >= 10 || context.teamRecord.losses >= context.teamRecord.wins + 10) {
    return {
      topic: 'rebuild',
      question: `Your club is ${context.teamRecord.gamesBack} games back. Is this a retool or the start of something more drastic?`,
      priority: 3,
    };
  }

  if (context.farmStrength >= 70 || context.topProspectCount >= 3) {
    return {
      topic: 'farm_pipeline',
      question: 'Your prospect pipeline is drawing real attention. When do fans start seeing those returns in the majors?',
      priority: 3,
    };
  }

  return null;
}

function ownerToneLead(ownerTone: PressConferenceContext['ownerTone']): string {
  switch (ownerTone) {
    case 'supportive':
      return 'A calmer room framed the question this way:';
    case 'impatient':
      return 'The room carried a sharper edge:';
    default:
      return 'The question in the room was direct:';
  }
}

export function generatePressConference(
  _rng: GameRNG,
  context: PressConferenceContext,
): NewsItem | null {
  const prompt = pressConferenceQuestion(context);
  if (!prompt) {
    return null;
  }

  return {
    id: `press-conference-${context.season}-${context.day}-${prompt.topic}`,
    headline: `Press Conference: ${teamLabel(context.userTeamId)}`,
    body: `${ownerToneLead(context.ownerTone)} ${prompt.question}`,
    priority: prompt.priority,
    category: 'press_conference',
    tag: 'ANALYSIS',
    timestamp: `S${context.season}D${context.day}`,
    relatedPlayerIds: [],
    relatedTeamIds: [context.userTeamId],
    read: false,
  };
}
