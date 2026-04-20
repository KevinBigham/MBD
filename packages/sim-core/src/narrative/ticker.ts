import type { TickerEntry } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';

export interface TickerScoreContext {
  winningTeamId: string;
  winningTeamName: string;
  losingTeamId: string;
  losingTeamName: string;
  winningScore: number;
  losingScore: number;
  starPlayerId?: string;
  starPlayerName?: string;
  hits?: number;
  atBats?: number;
  hr?: number;
  storyText?: string;
}

export interface TickerStandingsChangeContext {
  teamId: string;
  teamName: string;
  division: string;
  tookSoleLead: boolean;
}

export interface TickerTradeContext {
  acquiringTeamId: string;
  acquiringTeamName: string;
  fromTeamId: string;
  fromTeamName: string;
  acquiredPlayerId?: string;
  acquiredPlayerName: string;
  returnPlayerId?: string;
  returnPlayerName?: string;
}

export interface TickerInjuryContext {
  playerId: string;
  playerName: string;
  teamId: string;
  injury: string;
}

export interface TickerMilestoneContext {
  playerId: string;
  playerName: string;
  teamId: string;
  text: string;
}

export interface TickerProspectCallupContext {
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  fromLevel: string;
}

export interface TickerRecordWatchContext {
  playerId: string;
  playerName: string;
  teamId: string;
  text: string;
  currentStat: number;
}

export interface TickerRumorCandidate {
  teamId: string;
  teamName: string;
  position: string;
}

export interface TickerGenerationContext {
  season: number;
  day: number;
  scores: TickerScoreContext[];
  standingsChanges: TickerStandingsChangeContext[];
  trades: TickerTradeContext[];
  injuries: TickerInjuryContext[];
  milestones: TickerMilestoneContext[];
  prospectCallups: TickerProspectCallupContext[];
  recordWatches: TickerRecordWatchContext[];
  rumorCandidates: TickerRumorCandidate[];
  rumorsEnabled: boolean;
}

function makeTimestamp(season: number, day: number): string {
  return `S${season}D${day}`;
}

function makeId(category: TickerEntry['category'], season: number, day: number, index: number): string {
  return `ticker-${category}-${season}-${day}-${index}`;
}

function defaultExpiryDay(category: TickerEntry['category'], currentAbsoluteDay: number): number {
  switch (category) {
    case 'trade':
    case 'milestone':
    case 'record':
    case 'league_event':
      return currentAbsoluteDay + 45;
    case 'prospect':
    case 'standings':
    case 'arbitration':
      return currentAbsoluteDay + 21;
    case 'injury':
    case 'rumor':
      return currentAbsoluteDay + 14;
    case 'score':
    default:
      return currentAbsoluteDay + 7;
  }
}

function absoluteDay(season: number, day: number): number {
  return (season * 1000) + day;
}

function parseTimestampRank(timestamp: string): number {
  const match = /^S(\d+)D(\d+)$/.exec(timestamp);
  if (!match) {
    return 0;
  }
  return absoluteDay(Number(match[1]), Number(match[2]));
}

function buildScoreText(score: TickerScoreContext): string {
  if (score.storyText) {
    return score.storyText;
  }

  if (
    score.starPlayerName
    && score.hits != null
    && score.atBats != null
    && score.hr != null
  ) {
    return `${score.winningTeamName} defeats ${score.losingTeamName} ${score.winningScore}-${score.losingScore}. ${score.starPlayerName} goes ${score.hits}-for-${score.atBats} with ${score.hr} HR.`;
  }

  return `${score.winningTeamName} defeats ${score.losingTeamName} ${score.winningScore}-${score.losingScore}.`;
}

function buildEntry(
  category: TickerEntry['category'],
  season: number,
  day: number,
  index: number,
  text: string,
  priority: TickerEntry['priority'],
  relatedTeamIds: string[],
  relatedPlayerIds: string[],
): TickerEntry {
  const currentAbsoluteDay = absoluteDay(season, day);
  return {
    id: makeId(category, season, day, index),
    timestamp: makeTimestamp(season, day),
    category,
    text,
    priority,
    relatedTeamIds,
    relatedPlayerIds,
    expiresDay: defaultExpiryDay(category, currentAbsoluteDay),
  };
}

export function generateTickerEntries(
  rng: GameRNG,
  context: TickerGenerationContext,
): TickerEntry[] {
  const entries: TickerEntry[] = [];
  let index = 0;

  for (const score of context.scores) {
    entries.push(buildEntry(
      'score',
      context.season,
      context.day,
      index,
      buildScoreText(score),
      2,
      [score.winningTeamId, score.losingTeamId],
      score.starPlayerId ? [score.starPlayerId] : [],
    ));
    index += 1;
  }

  for (const change of context.standingsChanges.filter((entry) => entry.tookSoleLead)) {
    entries.push(buildEntry(
      'standings',
      context.season,
      context.day,
      index,
      `The ${change.teamName} have taken sole possession of first place in the ${change.division}.`,
      3,
      [change.teamId],
      [],
    ));
    index += 1;
  }

  for (const trade of context.trades) {
    entries.push(buildEntry(
      'trade',
      context.season,
      context.day,
      index,
      `${trade.acquiringTeamName} acquires ${trade.acquiredPlayerName} from ${trade.fromTeamName}${trade.returnPlayerName ? ` for ${trade.returnPlayerName}` : ''}.`,
      4,
      [trade.acquiringTeamId, trade.fromTeamId],
      [trade.acquiredPlayerId, trade.returnPlayerId].filter((value): value is string => Boolean(value)),
    ));
    index += 1;
  }

  for (const injury of context.injuries) {
    entries.push(buildEntry(
      'injury',
      context.season,
      context.day,
      index,
      `${injury.playerName} placed on 15-day IL with ${injury.injury}.`,
      3,
      [injury.teamId],
      [injury.playerId],
    ));
    index += 1;
  }

  for (const milestone of context.milestones) {
    entries.push(buildEntry(
      'milestone',
      context.season,
      context.day,
      index,
      `${milestone.playerName} ${milestone.text}.`,
      5,
      [milestone.teamId],
      [milestone.playerId],
    ));
    index += 1;
  }

  for (const prospect of context.prospectCallups) {
    entries.push(buildEntry(
      'prospect',
      context.season,
      context.day,
      index,
      `${prospect.teamName} promotes top prospect ${prospect.playerName} from ${prospect.fromLevel}.`,
      4,
      [prospect.teamId],
      [prospect.playerId],
    ));
    index += 1;
  }

  for (const watch of context.recordWatches) {
    entries.push(buildEntry(
      'record',
      context.season,
      context.day,
      index,
      `${watch.playerName} is on pace for ${watch.text}. Currently at ${watch.currentStat}.`,
      3,
      [watch.teamId],
      [watch.playerId],
    ));
    index += 1;
  }

  if (
    context.rumorsEnabled
    && context.rumorCandidates.length > 0
    && (rng.nextInt(0, 99) % 10) === 4
  ) {
    const rumor = context.rumorCandidates[rng.nextInt(0, context.rumorCandidates.length - 1)]!;
    entries.push(buildEntry(
      'rumor',
      context.season,
      context.day,
      index,
      `Sources: ${rumor.teamName} exploring trades for ${rumor.position}.`,
      2,
      [rumor.teamId],
      [],
    ));
  }

  return entries;
}

export function pruneTickerFeed(
  feed: TickerEntry[],
  maxEntries: number,
  currentAbsoluteDay: number = Number.POSITIVE_INFINITY,
): TickerEntry[] {
  return feed
    .filter((entry) => entry.expiresDay >= currentAbsoluteDay)
    .sort((left, right) =>
      parseTimestampRank(right.timestamp) - parseTimestampRank(left.timestamp)
      || right.priority - left.priority
      || left.id.localeCompare(right.id))
    .slice(0, maxEntries);
}
