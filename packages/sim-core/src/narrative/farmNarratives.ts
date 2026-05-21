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

/* ---------- interactive press conference ---------- */

export interface PressConferenceResponse {
  id: string;
  label: string;
  tone: 'confident' | 'measured' | 'deflect';
  quote: string;
  /** Morale delta for the team (-10 to +10) */
  moraleDelta: number;
  /** Owner satisfaction delta (-8 to +8) */
  ownerDelta: number;
  /** Fan sentiment delta (-8 to +8) */
  fanSentimentDelta: number;
  /** Whether this generates a follow-up news story */
  generatesNews: boolean;
}

export interface InteractivePressConference {
  id: string;
  topic: string;
  question: string;
  ownerTone: PressConferenceContext['ownerTone'];
  teamId: string;
  season: number;
  day: number;
  responses: [PressConferenceResponse, PressConferenceResponse, PressConferenceResponse];
}

const RESPONSE_TEMPLATES: Record<string, {
  confident: { label: string; quote: string; moraleDelta: number; ownerDelta: number; fanSentimentDelta: number };
  measured: { label: string; quote: string; moraleDelta: number; ownerDelta: number; fanSentimentDelta: number };
  deflect: { label: string; quote: string; moraleDelta: number; ownerDelta: number; fanSentimentDelta: number };
}> = {
  first_place: {
    confident: {
      label: 'We\'re built for this',
      quote: 'This roster was assembled to win, and that\'s exactly what we\'re doing. No one should be surprised.',
      moraleDelta: 5,
      ownerDelta: 3,
      fanSentimentDelta: 4,
    },
    measured: {
      label: 'Stay focused',
      quote: 'We appreciate the recognition, but there\'s a lot of baseball left. We\'re taking it one series at a time.',
      moraleDelta: 2,
      ownerDelta: 1,
      fanSentimentDelta: 1,
    },
    deflect: {
      label: 'Credit the players',
      quote: 'I\'m just putting the pieces in place. The guys in that clubhouse are the ones making it happen every night.',
      moraleDelta: 4,
      ownerDelta: 0,
      fanSentimentDelta: 2,
    },
  },
  trade_reaction: {
    confident: {
      label: 'No regrets',
      quote: 'We did our homework. I\'d make that deal again tomorrow. The numbers backed us up.',
      moraleDelta: 1,
      ownerDelta: 4,
      fanSentimentDelta: 1,
    },
    measured: {
      label: 'Time will tell',
      quote: 'Every trade is a calculated risk. We\'re confident in the process, but we\'ll let the results speak for themselves.',
      moraleDelta: 0,
      ownerDelta: 2,
      fanSentimentDelta: 0,
    },
    deflect: {
      label: 'Next question',
      quote: 'I\'m not going to relitigate every deal with the press. We\'re focused on winning games.',
      moraleDelta: -2,
      ownerDelta: -1,
      fanSentimentDelta: -2,
    },
  },
  rebuild: {
    confident: {
      label: 'Trust the process',
      quote: 'We have a clear plan. The farm system is loaded, and the payoff is closer than people think.',
      moraleDelta: 3,
      ownerDelta: -2,
      fanSentimentDelta: 3,
    },
    measured: {
      label: 'Honest assessment',
      quote: 'We\'re not where we want to be yet, but the foundation is being laid. Patience will be rewarded.',
      moraleDelta: 1,
      ownerDelta: 1,
      fanSentimentDelta: 0,
    },
    deflect: {
      label: 'Blame injuries',
      quote: 'A healthy roster looks very different from what we\'re putting out there right now. Context matters.',
      moraleDelta: -1,
      ownerDelta: -3,
      fanSentimentDelta: -1,
    },
  },
  farm_pipeline: {
    confident: {
      label: 'Prospects are ready',
      quote: 'Some of these kids are closer than people realize. Don\'t be surprised if you see fresh faces soon.',
      moraleDelta: 4,
      ownerDelta: 2,
      fanSentimentDelta: 3,
    },
    measured: {
      label: 'Development takes time',
      quote: 'We won\'t rush anyone. When they\'re ready, they\'ll get their shot. Not a day before.',
      moraleDelta: 1,
      ownerDelta: 3,
      fanSentimentDelta: 1,
    },
    deflect: {
      label: 'Keep expectations low',
      quote: 'Prospect rankings are fun for the fans, but they don\'t win games. We\'ll see what happens.',
      moraleDelta: -2,
      ownerDelta: 0,
      fanSentimentDelta: -2,
    },
  },
};

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- farm_pipeline is always defined above
const DEFAULT_RESPONSES = RESPONSE_TEMPLATES.farm_pipeline!;

export function generateInteractivePressConference(
  context: PressConferenceContext,
): InteractivePressConference | null {
  const prompt = pressConferenceQuestion(context);
  if (!prompt) {
    return null;
  }

  const resolved = RESPONSE_TEMPLATES[prompt.topic];
  const templates = resolved ?? DEFAULT_RESPONSES;
  const baseId = `press-conf-${context.season}-${context.day}-${prompt.topic}`;

  return {
    id: baseId,
    topic: prompt.topic,
    question: `${ownerToneLead(context.ownerTone)} ${prompt.question}`,
    ownerTone: context.ownerTone,
    teamId: context.userTeamId,
    season: context.season,
    day: context.day,
    responses: [
      {
        id: `${baseId}-confident`,
        label: templates.confident.label,
        tone: 'confident',
        quote: templates.confident.quote,
        moraleDelta: templates.confident.moraleDelta,
        ownerDelta: templates.confident.ownerDelta,
        fanSentimentDelta: templates.confident.fanSentimentDelta,
        generatesNews: true,
      },
      {
        id: `${baseId}-measured`,
        label: templates.measured.label,
        tone: 'measured',
        quote: templates.measured.quote,
        moraleDelta: templates.measured.moraleDelta,
        ownerDelta: templates.measured.ownerDelta,
        fanSentimentDelta: templates.measured.fanSentimentDelta,
        generatesNews: false,
      },
      {
        id: `${baseId}-deflect`,
        label: templates.deflect.label,
        tone: 'deflect',
        quote: templates.deflect.quote,
        moraleDelta: templates.deflect.moraleDelta,
        ownerDelta: templates.deflect.ownerDelta,
        fanSentimentDelta: templates.deflect.fanSentimentDelta,
        generatesNews: true,
      },
    ],
  };
}
