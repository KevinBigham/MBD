/**
 * @module newsFeed
 * Narrative news feed system for Mr. Baseball Dynasty.
 * Generates contextual headlines, milestone moments, and standings news
 * from game events. All randomness flows through GameRNG.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NewsPriority = 1 | 2 | 3 | 4 | 5;

export type NewsTag = 'BREAKING' | 'ANALYSIS' | 'RECAP' | 'RUMOR' | 'WATCH';

export type NewsCategory =
  | 'injury'
  | 'trade'
  | 'signing'
  | 'extension'
  | 'qualifying_offer'
  | 'coaching'
  | 'draft'
  | 'milestone'
  | 'performance'
  | 'standings'
  | 'roster_move'
  | 'development'
  | 'rumor'
  | 'rivalry'
  | 'award'
  | 'record'
  | 'playoff';

export interface NewsItem {
  id: string;
  headline: string;
  body: string;
  priority: NewsPriority;
  category: NewsCategory;
  tag?: NewsTag;
  /** Format: "S{season}D{day}", e.g. "S3D45" */
  timestamp: string;
  relatedPlayerIds: string[];
  relatedTeamIds: string[];
  read: boolean;
}

export type MomentType =
  | 'walk_off'
  | 'no_hitter'
  | 'perfect_game'
  | 'cycle'
  | 'milestone_hr'
  | 'milestone_hit'
  | 'milestone_k'
  | 'milestone_win'
  | 'streak'
  | 'record_broken'
  | 'debut'
  | 'retirement'
  | 'championship'
  | 'playoff_upset'
  | 'comeback';

export interface Moment {
  type: MomentType;
  headline: string;
  description: string;
  season: number;
  day: number;
  playerIds: string[];
  teamIds: string[];
  /** Is this a franchise-level moment? */
  historical: boolean;
}

export interface GameEvent {
  type:
    | 'game_result'
    | 'injury'
    | 'trade'
    | 'signing'
    | 'roster_move'
    | 'draft_pick'
    | 'season_end'
    | 'milestone'
    | 'extension'
    | 'qualifying_offer'
    | 'coaching'
    | 'development'
    | 'rivalry'
    | 'rumor';
  data: Record<string, unknown>;
  season: number;
  day: number;
}

// ---------------------------------------------------------------------------
// Headline templates
// ---------------------------------------------------------------------------

const PERFORMANCE_TEMPLATES = [
  '{player} goes {hits}-for-{ab} with {hr} home runs as {team} defeats {opponent}',
  '{player} hits walk-off {hit_type} in the {inning}th',
  '{pitcher} strikes out {k} in dominant outing',
  '{player} extends hitting streak to {count} games',
  '{player} delivers clutch performance in {team} victory over {opponent}',
  '{pitcher} tosses {innings} scoreless innings against {opponent}',
];

const INJURY_TEMPLATES = [
  '{player} placed on {il_type}-day IL with {injury}',
  '{player} activated from injured list',
  'Devastating blow: {player} out for the season with {injury}',
  '{team} loses {player} to {injury}, timetable uncertain',
  '{team} scrambles after {player} suffers {injury}',
  '{player} cleared to return as {team} chases ground in the race',
];

const TRADE_TEMPLATES = [
  'BLOCKBUSTER: {team1} acquires {player1} from {team2} for {player2}',
  '{team} adds depth, acquires {player} in deadline deal',
  '{team1} and {team2} complete swap of {player1} and {player2}',
  '{team} sends {player} to {team2} in exchange for prospects',
];

const SIGNING_TEMPLATES = [
  '{player} signs {years}-year deal with {team}',
  '{team} locks up {player} with long-term extension',
  'Free agent {player} agrees to terms with {team}',
];

const EXTENSION_TEMPLATES = [
  '{player} signs {years}-year, ${total}M extension with {team}',
  '{team} secures franchise cornerstone {player} on a {years}-year pact',
  'Extension talks end with {player} staying put in {team}',
  '{team} and {player} hammer out a ${total}M long-term extension',
  '{player} commits to {team} with a {years}-year extension',
];

const EXTENSION_BREAKDOWN_TEMPLATES = [
  'Negotiations break down between {team} and {player}',
  '{player} declines extension overture from {team}',
  '{team} cannot bridge the gap with {player}',
  'Long-term talks stall for {player} and {team}',
  '{team} leaves extension talks with {player} unresolved',
];

const QUALIFYING_OFFER_TEMPLATES = [
  '{player} rejects the qualifying offer and enters the market',
  '{player} accepts the qualifying offer and returns to {team}',
  '{team} extends a qualifying offer to {player}',
  '{player} weighs the qualifying offer as free agency opens',
  '{team} keeps compensation options alive with a QO for {player}',
];

const COACHING_TEMPLATES = [
  '{team} hires {coach} to reshape the staff',
  '{team} brings in {coach} as a new voice in the room',
  '{team} makes a coaching change and tabs {coach}',
  '{coach} joins {team} with player development on the agenda',
  '{team} turns to {coach} for a jolt on the staff',
];

const RUMOR_TEMPLATES = [
  'Sources: {team} checking in on {target}',
  '{team} exploring deadline market for {need}',
  'Industry buzz links {team} to {target}',
  '{team} seen as an active buyer with {days} days to the deadline',
  '{team} listening on veteran pieces as the market heats up',
];

const DEVELOPMENT_TEMPLATES = [
  '{player} forcing the issue after tearing through {level}',
  '{team} weighing a call-up for fast-rising {player}',
  '{player} has turned heads with a breakout run at {level}',
  'Development staff sees real momentum in {player} at {level}',
  '{team} monitoring whether {player} is ready for the next jump',
];

const RIVALRY_TEMPLATES = [
  'Bad blood simmers again between {team1} and {team2}',
  '{team1}-{team2} is becoming the nastiest series on the schedule',
  'Another tense chapter lands in the {team1}-{team2} rivalry',
  '{team1} and {team2} keep raising the temperature',
  'The {team1}-{team2} rivalry is now a pennant-race subplot',
];

const STANDINGS_TEMPLATES = [
  '{team} clinches {division} division title',
  'Playoff race heats up: {team1} and {team2} separated by {games} games',
  '{team} on {count}-game winning streak',
  '{team} falls to {count}-game losing streak as season slips away',
  '{team} surges into playoff contention with recent run',
];

const MILESTONE_TEMPLATES = [
  '{player} hits career home run #{count}',
  '{player} records {count}th career strikeout',
  '{player} joins the 3,000-hit club',
  '{player} earns career win #{count}',
  '{player} reaches {count} career hits',
];

const DRAFT_TEMPLATES = [
  '{team} selects {player} with the #{pick} overall pick',
  '{player} goes #{pick} overall to {team} in the draft',
];

const ROSTER_MOVE_TEMPLATES = [
  '{team} calls up {player} from {level}',
  '{team} designates {player} for assignment',
  '{player} optioned to {level} by {team}',
];

const SEASON_END_TEMPLATES = [
  '{team} captures the championship in dominant fashion',
  '{team} wins it all after a hard-fought series',
  'Season {season} concludes with {team} as champion',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(season: number, day: number): string {
  return `S${season}D${day}`;
}

function playerName(player: GeneratedPlayer): string {
  return `${player.firstName} ${player.lastName}`;
}

function lookupPlayer(
  players: GeneratedPlayer[],
  id: string | undefined,
): GeneratedPlayer | undefined {
  if (!id) return undefined;
  return players.find((p) => p.id === id);
}

function fillTemplate(template: string, vars: Record<string, string | number>): string {
  let result = template;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
  }
  return result;
}

function pickTemplate(rng: GameRNG, templates: readonly string[]): string {
  const index = rng.nextInt(0, templates.length - 1);
  return templates[index]!;
}

function buildContextClause(data: Record<string, unknown>): string {
  const pieces: string[] = [];
  const record = data['record'] as string | undefined;
  const streak = data['streak'] as string | undefined;
  const playoffPosition = data['playoffPosition'] as string | undefined;
  const daysToDeadline = data['daysToDeadline'] as number | undefined;

  if (record) pieces.push(`${record} record`);
  if (streak) pieces.push(`${streak} streak`);
  if (playoffPosition) pieces.push(playoffPosition);
  if (daysToDeadline != null) pieces.push(`${daysToDeadline} days to the deadline`);

  return pieces.length > 0 ? `${pieces.join(' | ')}.` : '';
}

function inferTag(category: NewsCategory, priority: NewsPriority): NewsTag {
  if (category === 'rumor') return 'RUMOR';
  if (priority <= 1) return 'BREAKING';
  if (category === 'extension' || category === 'qualifying_offer' || category === 'coaching' || category === 'development' || category === 'rivalry') {
    return 'ANALYSIS';
  }
  return 'RECAP';
}

function buildNewsItem(
  rng: GameRNG,
  input: Omit<NewsItem, 'id' | 'tag'> & { tag?: NewsTag },
): NewsItem {
  return {
    id: generateNewsId(rng),
    ...input,
    tag: input.tag ?? inferTag(input.category, input.priority),
  };
}

// ---------------------------------------------------------------------------
// ID generation
// ---------------------------------------------------------------------------

/** Generate a unique news item ID using the RNG. */
export function generateNewsId(rng: GameRNG): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'news_';
  for (let i = 0; i < 12; i++) {
    id += chars[rng.nextInt(0, chars.length - 1)];
  }
  return id;
}

// ---------------------------------------------------------------------------
// News generation from events
// ---------------------------------------------------------------------------

/** Generate news items from a game event. */
export function generateNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  season: number,
  day: number,
): NewsItem[] {
  const timestamp = formatTimestamp(season, day);

  switch (event.type) {
    case 'game_result':
      return generateGameResultNews(rng, event, players, timestamp);
    case 'injury':
      return generateInjuryNews(rng, event, players, timestamp);
    case 'trade':
      return generateTradeNews(rng, event, players, timestamp);
    case 'signing':
      return generateSigningNews(rng, event, players, timestamp);
    case 'roster_move':
      return generateRosterMoveNews(rng, event, players, timestamp);
    case 'draft_pick':
      return generateDraftNews(rng, event, players, timestamp);
    case 'season_end':
      return generateSeasonEndNews(rng, event, timestamp);
    case 'milestone':
      return generateMilestoneNews(rng, event, players, timestamp);
    case 'extension':
      return generateExtensionNews(rng, event, players, timestamp);
    case 'qualifying_offer':
      return generateQualifyingOfferNews(rng, event, players, timestamp);
    case 'coaching':
      return generateCoachingNews(rng, event, timestamp);
    case 'development':
      return generateDevelopmentNews(rng, event, players, timestamp);
    case 'rivalry':
      return generateRivalryNews(rng, event, timestamp);
    case 'rumor':
      return generateRumorNews(rng, event, players, timestamp);
    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Category-specific generators
// ---------------------------------------------------------------------------

function generateGameResultNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const items: NewsItem[] = [];

  const starPlayerId = data['starPlayerId'] as string | undefined;
  const starPlayer = lookupPlayer(players, starPlayerId);
  const teamId = (data['winningTeamId'] as string) ?? '';
  const opponentId = (data['losingTeamId'] as string) ?? '';
  const teamName = (data['winningTeamName'] as string) ?? teamId;
  const opponentName = (data['losingTeamName'] as string) ?? opponentId;

  const vars: Record<string, string | number> = {
    team: teamName,
    opponent: opponentName,
    player: starPlayer ? playerName(starPlayer) : 'Unknown',
    pitcher: starPlayer ? playerName(starPlayer) : 'Unknown',
    hits: (data['hits'] as number) ?? 2,
    ab: (data['ab'] as number) ?? 4,
    hr: (data['hr'] as number) ?? 0,
    k: (data['k'] as number) ?? 0,
    hit_type: (data['hitType'] as string) ?? 'single',
    inning: (data['inning'] as number) ?? 9,
    count: (data['streakCount'] as number) ?? 1,
    innings: (data['inningsPitched'] as number) ?? 7,
  };

  const headline = fillTemplate(pickTemplate(rng, PERFORMANCE_TEMPLATES), vars);
  const body = `${teamName} earned a victory over ${opponentName}.`;

  items.push(buildNewsItem(rng, {
    headline,
    body,
    priority: 3,
    category: 'performance',
    tag: 'RECAP',
    timestamp,
    relatedPlayerIds: starPlayerId ? [starPlayerId] : [],
    relatedTeamIds: [teamId, opponentId].filter(Boolean),
    read: false,
  }));

  return items;
}

function generateInjuryNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const injuryType = ((data['injury'] as string | undefined) ?? (data['description'] as string | undefined)) ?? 'undisclosed injury';
  const ilType = (data['ilDays'] as number) ?? 15;
  const isSeason = (data['seasonEnding'] as boolean) ?? false;
  const returning = (data['returning'] as boolean) ?? false;

  const vars: Record<string, string | number> = {
    player: player ? playerName(player) : 'Unknown',
    team: teamName,
    injury: injuryType,
    il_type: ilType,
  };

  const templatePool = returning
    ? [INJURY_TEMPLATES[1]!, INJURY_TEMPLATES[5]!]
    : isSeason
      ? [INJURY_TEMPLATES[2]!, INJURY_TEMPLATES[4]!]
      : INJURY_TEMPLATES.filter((_, i) => i !== 1 && i !== 2 && i !== 5);
  const headline = fillTemplate(pickTemplate(rng, templatePool), vars);

  const priority: NewsPriority = returning ? 2 : isSeason ? 1 : 3;
  const body = returning
    ? `${player ? playerName(player) : 'A player'} is back in the mix for ${teamName}. ${buildContextClause(data)}`
    : isSeason
      ? `${player ? playerName(player) : 'A player'} will miss the remainder of the season with ${injuryType}. ${buildContextClause(data)}`
      : `${player ? playerName(player) : 'A player'} has been placed on the injured list. ${buildContextClause(data)}`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority,
      category: 'injury',
      tag: returning ? 'BREAKING' : undefined,
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateTradeNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const player1Id = data['player1Id'] as string | undefined;
  const player2Id = data['player2Id'] as string | undefined;
  const player1 = lookupPlayer(players, player1Id);
  const player2 = lookupPlayer(players, player2Id);
  const team1Id = (data['team1Id'] as string) ?? '';
  const team2Id = (data['team2Id'] as string) ?? '';
  const team1Name = (data['team1Name'] as string) ?? team1Id;
  const team2Name = (data['team2Name'] as string) ?? team2Id;

  const vars: Record<string, string | number> = {
    player1: player1 ? playerName(player1) : 'Unknown',
    player2: player2 ? playerName(player2) : 'prospects',
    player: player1 ? playerName(player1) : 'Unknown',
    team: team1Name,
    team1: team1Name,
    team2: team2Name,
  };

  const headline = fillTemplate(pickTemplate(rng, TRADE_TEMPLATES), vars);
  const body = `${team1Name} and ${team2Name} have completed a trade.`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority: 1,
      category: 'trade',
      timestamp,
      relatedPlayerIds: [player1Id, player2Id].filter((id): id is string => !!id),
      relatedTeamIds: [team1Id, team2Id].filter(Boolean),
      read: false,
    }),
  ];
}

function generateSigningNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const years = (data['years'] as number) ?? 1;

  const vars: Record<string, string | number> = {
    player: player ? playerName(player) : 'Unknown',
    team: teamName,
    years,
  };

  const headline = fillTemplate(pickTemplate(rng, SIGNING_TEMPLATES), vars);
  const body = `${player ? playerName(player) : 'A free agent'} has signed a ${years}-year contract with ${teamName}.`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority: 2,
      category: 'signing',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateExtensionNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const years = (data['years'] as number) ?? 1;
  const total = Number((data['totalValue'] as number) ?? ((data['annualSalary'] as number) ?? 0) * years).toFixed(1);
  const accepted = ((data['outcome'] as string | undefined) ?? 'accepted') === 'accepted';

  const vars = {
    player: player ? playerName(player) : ((data['playerName'] as string | undefined) ?? 'Unknown'),
    team: teamName,
    years,
    total,
  };

  const headline = fillTemplate(
    pickTemplate(rng, accepted ? EXTENSION_TEMPLATES : EXTENSION_BREAKDOWN_TEMPLATES),
    vars,
  );
  const body = accepted
    ? `${vars.player} stays with ${teamName} on a ${years}-year commitment worth $${total}M. ${buildContextClause(data)}`
    : `${teamName} leaves the table without a long-term deal for ${vars.player}. ${buildContextClause(data)}`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority: accepted ? 1 : 2,
      category: 'extension',
      tag: accepted ? 'BREAKING' : 'ANALYSIS',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateQualifyingOfferNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const amount = Number((data['amount'] as number) ?? 0).toFixed(1);
  const outcome = (data['outcome'] as string | undefined) ?? (data['status'] as string | undefined) ?? 'issued';
  const accepted = outcome === 'accepted';
  const rejected = outcome === 'rejected';
  const templatePool = accepted
    ? [QUALIFYING_OFFER_TEMPLATES[1]!, QUALIFYING_OFFER_TEMPLATES[3]!]
    : rejected
      ? [QUALIFYING_OFFER_TEMPLATES[0]!, QUALIFYING_OFFER_TEMPLATES[3]!]
      : [QUALIFYING_OFFER_TEMPLATES[2]!, QUALIFYING_OFFER_TEMPLATES[4]!];
  const headline = fillTemplate(pickTemplate(rng, templatePool), {
    player: player ? playerName(player) : ((data['playerName'] as string | undefined) ?? 'Unknown'),
    team: teamName,
  });

  const body = accepted
    ? `${player ? playerName(player) : 'The player'} takes the $${amount}M qualifying offer and stays with ${teamName}. ${buildContextClause(data)}`
    : rejected
      ? `${player ? playerName(player) : 'The player'} turns down the $${amount}M qualifying offer and heads into free agency. ${buildContextClause(data)}`
      : `${teamName} places a $${amount}M qualifying offer in front of ${player ? playerName(player) : 'the player'}. ${buildContextClause(data)}`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority: accepted || rejected ? 1 : 2,
      category: 'qualifying_offer',
      tag: accepted || rejected ? 'BREAKING' : 'ANALYSIS',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateCoachingNews(
  rng: GameRNG,
  event: GameEvent,
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const coach = (data['coachName'] as string) ?? 'New coach';
  const role = ((data['role'] as string | undefined) ?? 'staff').replaceAll('_', ' ');
  const headline = fillTemplate(pickTemplate(rng, COACHING_TEMPLATES), {
    team: teamName,
    coach,
  });

  return [
    buildNewsItem(rng, {
      headline,
      body: `${teamName} makes a ${role} move with ${coach}. ${buildContextClause(data)}`,
      priority: 2,
      category: 'coaching',
      tag: 'ANALYSIS',
      timestamp,
      relatedPlayerIds: [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateDevelopmentNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const level = (data['level'] as string) ?? ((data['fromLevel'] as string) ?? 'AAA');
  const headline = fillTemplate(pickTemplate(rng, DEVELOPMENT_TEMPLATES), {
    player: player ? playerName(player) : ((data['playerName'] as string | undefined) ?? 'Unknown'),
    team: (data['teamName'] as string) ?? teamId,
    level,
  });

  return [
    buildNewsItem(rng, {
      headline,
      body: `${player ? playerName(player) : 'A prospect'} is drawing attention after strong work at ${level}. ${buildContextClause(data)}`,
      priority: 2,
      category: 'development',
      tag: 'ANALYSIS',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateRivalryNews(
  rng: GameRNG,
  event: GameEvent,
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const team1 = (data['team1Name'] as string) ?? ((data['team1'] as string) ?? 'Team A');
  const team2 = (data['team2Name'] as string) ?? ((data['team2'] as string) ?? 'Team B');
  const intensity = (data['intensity'] as number) ?? 60;
  const headline = fillTemplate(pickTemplate(rng, RIVALRY_TEMPLATES), {
    team1,
    team2,
  });

  return [
    buildNewsItem(rng, {
      headline,
      body: `${team1} and ${team2} are carrying a rivalry intensity score of ${intensity}. ${buildContextClause(data)}`,
      priority: 3,
      category: 'rivalry',
      tag: 'ANALYSIS',
      timestamp,
      relatedPlayerIds: [],
      relatedTeamIds: [((data['team1Id'] as string) ?? ''), ((data['team2Id'] as string) ?? '')].filter(Boolean),
      read: false,
    }),
  ];
}

function generateRumorNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const targetId = data['targetPlayerId'] as string | undefined;
  const target = lookupPlayer(players, targetId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const need = (data['need'] as string) ?? 'rotation help';
  const days = (data['daysToDeadline'] as number) ?? 0;
  const headline = fillTemplate(pickTemplate(rng, RUMOR_TEMPLATES), {
    team: teamName,
    target: target ? playerName(target) : ((data['targetName'] as string | undefined) ?? 'a veteran target'),
    need,
    days,
  });

  return [
    buildNewsItem(rng, {
      headline,
      body: `${teamName} is one of the clubs drawing league-wide rumor traffic. ${buildContextClause(data)}`,
      priority: 2,
      category: 'rumor',
      tag: 'RUMOR',
      timestamp,
      relatedPlayerIds: targetId ? [targetId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateRosterMoveNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const level = (data['level'] as string) ?? 'AAA';

  const vars: Record<string, string | number> = {
    player: player ? playerName(player) : 'Unknown',
    team: teamName,
    level,
  };

  const headline = fillTemplate(pickTemplate(rng, ROSTER_MOVE_TEMPLATES), vars);
  const body = `${teamName} has made a roster move involving ${player ? playerName(player) : 'a player'}.`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority: 4,
      category: 'roster_move',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateDraftNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const teamId = (data['teamId'] as string) ?? '';
  const teamName = (data['teamName'] as string) ?? teamId;
  const pick = (data['pickNumber'] as number) ?? 1;

  const vars: Record<string, string | number> = {
    player: player ? playerName(player) : 'Unknown',
    team: teamName,
    pick,
  };

  const headline = fillTemplate(pickTemplate(rng, DRAFT_TEMPLATES), vars);
  const body = `${teamName} has selected ${player ? playerName(player) : 'a prospect'} with the #${pick} overall pick.`;

  const priority: NewsPriority = pick <= 10 ? 2 : 4;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority,
      category: 'draft',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: teamId ? [teamId] : [],
      read: false,
    }),
  ];
}

function generateSeasonEndNews(
  rng: GameRNG,
  event: GameEvent,
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const championId = (data['championId'] as string) ?? '';
  const championName = (data['championName'] as string) ?? 'Unknown';
  const seasonNum = (data['season'] as number) ?? 1;

  if (!championId) return [];

  const vars: Record<string, string | number> = {
    team: championName,
    season: seasonNum,
  };

  const headline = fillTemplate(pickTemplate(rng, SEASON_END_TEMPLATES), vars);
  const body = `The Season ${seasonNum} championship has been decided. ${championName} are the champions.`;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority: 1,
      category: 'playoff',
      timestamp,
      relatedPlayerIds: [],
      relatedTeamIds: [championId],
      read: false,
    }),
  ];
}

function generateMilestoneNews(
  rng: GameRNG,
  event: GameEvent,
  players: GeneratedPlayer[],
  timestamp: string,
): NewsItem[] {
  const data = event.data;
  const playerId = data['playerId'] as string | undefined;
  const player = lookupPlayer(players, playerId);
  const milestoneType = (data['milestoneType'] as string) ?? 'achievement';
  const count = (data['count'] as number) ?? 0;

  const vars: Record<string, string | number> = {
    player: player ? playerName(player) : 'Unknown',
    count,
  };

  const milestoneTemplatePool = milestoneType.includes('home') || milestoneType.includes('hr')
    ? [MILESTONE_TEMPLATES[0]!]
    : milestoneType.includes('strikeout') || milestoneType.includes('k')
      ? [MILESTONE_TEMPLATES[1]!]
      : milestoneType.includes('win')
        ? [MILESTONE_TEMPLATES[3]!]
        : milestoneType.includes('hits')
          ? [MILESTONE_TEMPLATES[4]!]
          : MILESTONE_TEMPLATES;
  const headline = fillTemplate(pickTemplate(rng, milestoneTemplatePool), vars);
  const body = `${player ? playerName(player) : 'A player'} has reached a career ${milestoneType} milestone. ${buildContextClause(data)}`;

  // Major milestones (round numbers, large totals) get higher priority
  const isLandmark = count >= 500 || count % 100 === 0;
  const priority: NewsPriority = isLandmark ? 1 : 2;

  return [
    buildNewsItem(rng, {
      headline,
      body,
      priority,
      category: 'milestone',
      timestamp,
      relatedPlayerIds: playerId ? [playerId] : [],
      relatedTeamIds: [],
      read: false,
    }),
  ];
}

// ---------------------------------------------------------------------------
// Milestone detection
// ---------------------------------------------------------------------------

/** Milestone thresholds that trigger Moment generation. */
const HR_MILESTONES = [100, 200, 300, 400, 500, 600, 700, 750];
const HIT_MILESTONES = [500, 1000, 1500, 2000, 2500, 3000, 3500];
const K_MILESTONES = [500, 1000, 1500, 2000, 2500, 3000, 3500];
const WIN_MILESTONES = [50, 100, 150, 200, 250, 300];

function checkThreshold(value: number, thresholds: readonly number[]): number | null {
  // Return the highest threshold crossed
  let highest: number | null = null;
  for (const t of thresholds) {
    if (value >= t) {
      highest = t;
    }
  }
  return highest;
}

/**
 * Check player stats for milestone achievements and return Moment objects.
 * Each stat map entry should represent cumulative career totals.
 */
export function checkMilestones(
  playerStats: Map<string, { hr: number; hits: number; k?: number; wins?: number }>,
  players: GeneratedPlayer[],
  season: number,
  day: number,
): Moment[] {
  const moments: Moment[] = [];

  for (const [playerId, stats] of playerStats) {
    const player = players.find((p) => p.id === playerId);
    const name = player ? playerName(player) : 'Unknown';

    const hrMilestone = checkThreshold(stats.hr, HR_MILESTONES);
    if (hrMilestone !== null && stats.hr === hrMilestone) {
      moments.push({
        type: 'milestone_hr',
        headline: `${name} hits career home run #${hrMilestone}`,
        description: `${name} has reached the ${hrMilestone} home run milestone, a testament to sustained power production.`,
        season,
        day,
        playerIds: [playerId],
        teamIds: [],
        historical: hrMilestone >= 500,
      });
    }

    const hitMilestone = checkThreshold(stats.hits, HIT_MILESTONES);
    if (hitMilestone !== null && stats.hits === hitMilestone) {
      moments.push({
        type: 'milestone_hit',
        headline: `${name} reaches ${hitMilestone} career hits`,
        description: `${name} has collected career hit #${hitMilestone}, joining an elite group of hitters.`,
        season,
        day,
        playerIds: [playerId],
        teamIds: [],
        historical: hitMilestone >= 3000,
      });
    }

    if (stats.k !== undefined) {
      const kMilestone = checkThreshold(stats.k, K_MILESTONES);
      if (kMilestone !== null && stats.k === kMilestone) {
        moments.push({
          type: 'milestone_k',
          headline: `${name} records career strikeout #${kMilestone}`,
          description: `${name} has tallied ${kMilestone} career strikeouts, a mark of pitching dominance.`,
          season,
          day,
          playerIds: [playerId],
          teamIds: [],
          historical: kMilestone >= 3000,
        });
      }
    }

    if (stats.wins !== undefined) {
      const winMilestone = checkThreshold(stats.wins, WIN_MILESTONES);
      if (winMilestone !== null && stats.wins === winMilestone) {
        moments.push({
          type: 'milestone_win',
          headline: `${name} earns career win #${winMilestone}`,
          description: `${name} has reached ${winMilestone} career victories.`,
          season,
          day,
          playerIds: [playerId],
          teamIds: [],
          historical: winMilestone >= 300,
        });
      }
    }
  }

  return moments;
}

// ---------------------------------------------------------------------------
// Standings news
// ---------------------------------------------------------------------------

/** Generate news items based on current standings. */
export function generateStandingsNews(
  rng: GameRNG,
  standings: Array<{ teamId: string; wins: number; losses: number; streak: number }>,
  season: number,
  day: number,
): NewsItem[] {
  const items: NewsItem[] = [];
  const timestamp = formatTimestamp(season, day);

  for (const team of standings) {
    // Notable winning streaks
    if (team.streak >= 7) {
      const headline = fillTemplate('{team} on {count}-game winning streak', {
        team: team.teamId,
        count: team.streak,
      });
      items.push({
        id: generateNewsId(rng),
        headline,
        body: `${team.teamId} has won ${team.streak} consecutive games and is rolling.`,
        priority: team.streak >= 10 ? 2 : 3,
        category: 'standings',
        timestamp,
        relatedPlayerIds: [],
        relatedTeamIds: [team.teamId],
        read: false,
      });
    }

    // Notable losing streaks
    if (team.streak <= -7) {
      const count = Math.abs(team.streak);
      const headline = fillTemplate('{team} falls to {count}-game losing streak as season slips away', {
        team: team.teamId,
        count,
      });
      items.push({
        id: generateNewsId(rng),
        headline,
        body: `${team.teamId} has dropped ${count} straight and is in freefall.`,
        priority: count >= 10 ? 2 : 3,
        category: 'standings',
        timestamp,
        relatedPlayerIds: [],
        relatedTeamIds: [team.teamId],
        read: false,
      });
    }
  }

  // Tight playoff races — find pairs within 2 games
  const sorted = [...standings].sort((a, b) => {
    const wpA = a.wins / Math.max(a.wins + a.losses, 1);
    const wpB = b.wins / Math.max(b.wins + b.losses, 1);
    return wpB - wpA;
  });

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const gamesBack = Math.abs(a.wins - b.wins);
    if (gamesBack <= 2 && gamesBack > 0 && a.wins >= 20) {
      const headline = fillTemplate(
        'Playoff race heats up: {team1} and {team2} separated by {games} games',
        { team1: a.teamId, team2: b.teamId, games: gamesBack },
      );
      items.push({
        id: generateNewsId(rng),
        headline,
        body: `The race between ${a.teamId} and ${b.teamId} is tightening with only ${gamesBack} game${gamesBack === 1 ? '' : 's'} separating them.`,
        priority: 3,
        category: 'standings',
        timestamp,
        relatedPlayerIds: [],
        relatedTeamIds: [a.teamId, b.teamId],
        read: false,
      });
      break; // One race headline per cycle to avoid spam
    }
  }

  return items;
}

// ---------------------------------------------------------------------------
// News utilities
// ---------------------------------------------------------------------------

/** Get unread news sorted by priority (1 = highest). */
export function getUnreadNews(news: NewsItem[]): NewsItem[] {
  return news
    .filter((item) => !item.read)
    .sort((a, b) => a.priority - b.priority);
}

/** Mark a specific news item as read. Returns a new array. */
export function markAsRead(news: NewsItem[], newsId: string): NewsItem[] {
  return news.map((item) =>
    item.id === newsId ? { ...item, read: true } : item,
  );
}

/**
 * Deduplicate similar news items.
 * Removes items with identical category and overlapping relatedPlayerIds
 * within the same timestamp, keeping the higher-priority version.
 */
export function deduplicateNews(news: NewsItem[]): NewsItem[] {
  const seen = new Map<string, NewsItem>();

  // Sort by priority first so we keep the most important version
  const sorted = [...news].sort((a, b) => a.priority - b.priority);

  for (const item of sorted) {
    // Build a dedup key from category + timestamp + sorted player IDs
    const playerKey = [...item.relatedPlayerIds].sort().join(',');
    const key = `${item.category}:${item.timestamp}:${playerKey}`;

    if (!seen.has(key)) {
      seen.set(key, item);
    }
    // Skip duplicates — the first one (highest priority) wins
  }

  return Array.from(seen.values());
}

// ---------------------------------------------------------------------------
// Season recap
// ---------------------------------------------------------------------------

/** Generate end-of-season recap news items. */
export function generateSeasonRecap(
  rng: GameRNG,
  standings: Array<{ teamId: string; wins: number; losses: number }>,
  champion: string | null,
  season: number,
): NewsItem[] {
  const items: NewsItem[] = [];
  const timestamp = formatTimestamp(season, 162);

  // Champion headline
  if (champion) {
    const champTeam = standings.find((s) => s.teamId === champion);
    const record = champTeam ? `${champTeam.wins}-${champTeam.losses}` : '';
    items.push({
      id: generateNewsId(rng),
      headline: `Season ${season} concludes with ${champion} as champion`,
      body: `${champion} has captured the Season ${season} title${record ? ` with a ${record} record` : ''}. A season for the ages.`,
      priority: 1,
      category: 'playoff',
      timestamp,
      relatedPlayerIds: [],
      relatedTeamIds: [champion],
      read: false,
    });
  }

  // Best record
  const sorted = [...standings].sort((a, b) => b.wins - a.wins);
  const best = sorted[0];
  if (best) {
    items.push({
      id: generateNewsId(rng),
      headline: `${best.teamId} finishes Season ${season} with league-best ${best.wins}-${best.losses} record`,
      body: `${best.teamId} led the league with ${best.wins} wins during the regular season.`,
      priority: 2,
      category: 'standings',
      timestamp,
      relatedPlayerIds: [],
      relatedTeamIds: [best.teamId],
      read: false,
    });
  }

  // Worst record
  const worst = sorted[sorted.length - 1];
  if (worst && sorted.length > 1) {
    items.push({
      id: generateNewsId(rng),
      headline: `${worst.teamId} wraps up difficult Season ${season} at ${worst.wins}-${worst.losses}`,
      body: `${worst.teamId} endured a challenging season, finishing with the league's worst record.`,
      priority: 4,
      category: 'standings',
      timestamp,
      relatedPlayerIds: [],
      relatedTeamIds: [worst.teamId],
      read: false,
    });
  }

  // Most improved (highest win total in upper half that isn't the best)
  if (sorted.length >= 4) {
    const secondBest = sorted[1];
    if (secondBest) {
      items.push({
        id: generateNewsId(rng),
        headline: `${secondBest.teamId} posts strong Season ${season} with ${secondBest.wins} wins`,
        body: `${secondBest.teamId} was among the top teams in the league this season.`,
        priority: 4,
        category: 'standings',
        timestamp,
        relatedPlayerIds: [],
        relatedTeamIds: [secondBest.teamId],
        read: false,
      });
    }
  }

  return items;
}

export function generateRetirementNews(
  rng: GameRNG,
  player: GeneratedPlayer,
  season: number,
  day: number,
  teamName?: string,
): NewsItem {
  const club = teamName ?? player.teamId.toUpperCase();

  return {
    id: generateNewsId(rng),
    headline: `${player.firstName} ${player.lastName} calls it a career.`,
    body: `${player.firstName} ${player.lastName} has retired from baseball after closing out his run with ${club}.`,
    priority: 2,
    category: 'roster_move',
    timestamp: formatTimestamp(season, day),
    relatedPlayerIds: [player.id],
    relatedTeamIds: [player.teamId],
    read: false,
  };
}
