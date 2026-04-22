import type { AwardHistoryEntry, PlayerOrigin, PlayerStoryArc, TickerEntry } from '@mbd/contracts';
import { getDaysUntilTradeDeadline } from '../sim/calendar.js';
import { toDisplayRating, type GeneratedPlayer } from '../player/index.js';
import type { GameRNG } from '../math/prng.js';
import type { NewsItem } from './newsFeed.js';

type StoryArcType =
  | 'rookie_sensation'
  | 'breakout_campaign'
  | 'comeback_trail'
  | 'decline_watch'
  | 'trade_saga'
  | 'contract_drama'
  | 'prospect_rise'
  | 'dynasty_cornerstone';

type StoryArcOutcomePhase = Exclude<PlayerStoryArc['phase'], 'setup'>;

type StoryStatLine = {
  pa?: number;
  ab?: number;
  hits?: number;
  hr?: number;
  rbi?: number;
  ip?: number;
  earnedRuns?: number;
  strikeouts?: number;
  wins?: number;
};

export interface StoryArcSnapshot {
  season: number;
  day: number;
  userTeamId: string;
  players: GeneratedPlayer[];
  playerStoryArcs: PlayerStoryArc[];
  seasonStats: Map<string, StoryStatLine>;
  standings: Map<string, { wins: number; losses: number }>;
  awardHistory: AwardHistoryEntry[];
  playerOrigins?: Map<string, PlayerOrigin>;
}

const MAX_ACTIVE_ARCS = 5;
const ARC_PRIORITY: Record<StoryArcType, number> = {
  rookie_sensation: 7,
  breakout_campaign: 6,
  comeback_trail: 5,
  decline_watch: 2,
  trade_saga: 8,
  contract_drama: 4,
  prospect_rise: 9,
  dynasty_cornerstone: 3,
};

const STORY_PHASE_TEMPLATES = {
  rising: [
    '{player} is building momentum in a {arc}.',
    '{player} is turning the {arc} into a louder conversation.',
    'Momentum is building around {player} as the {arc} sharpens.',
  ],
  climax: [
    'All eyes are on {player} as the {arc} peaks.',
    '{player} has pushed the {arc} to an inflection point.',
    '{player} now sits at the center of the {arc}.',
  ],
  resolution: [
    '{player} carried the {arc} into its defining turn.',
    'The {arc} around {player} has landed on its clearest outcome.',
    'The {arc} closed with {player} on the line that will be remembered.',
  ],
} as const;

function currentTimestamp(season: number, day: number): string {
  return `S${season}D${day}`;
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pickStableVariant(scope: string, variants: readonly string[]): string {
  if (variants.length === 0) {
    return '';
  }
  return variants[hashString(scope) % variants.length] ?? variants[0] ?? '';
}

function arcLabel(arcType: StoryArcType): string {
  return arcType.replaceAll('_', ' ');
}

function battingAverage(stats: StoryStatLine | undefined): number {
  if (!stats || !stats.ab) {
    return 0;
  }
  return (stats.hits ?? 0) / Math.max(1, stats.ab);
}

function era(stats: StoryStatLine | undefined): number {
  if (!stats || !stats.ip) {
    return 99;
  }
  return ((stats.earnedRuns ?? 0) / Math.max(1, stats.ip / 3)) * 9;
}

function isPitcher(player: GeneratedPlayer): boolean {
  return player.pitcherAttributes != null;
}

function headlineForArc(playerName: string, arcType: StoryArcType): string {
  switch (arcType) {
    case 'rookie_sensation':
      return `${playerName} is making rookie noise.`;
    case 'breakout_campaign':
      return `${playerName} is forcing a breakout conversation.`;
    case 'comeback_trail':
      return `${playerName} is pushing back into the spotlight.`;
    case 'decline_watch':
      return `${playerName} is facing decline questions.`;
    case 'trade_saga':
      return `${playerName} is drawing trade buzz.`;
    case 'contract_drama':
      return `${playerName}'s contract picture is heating up.`;
    case 'prospect_rise':
      return `${playerName} is climbing fast through the system.`;
    case 'dynasty_cornerstone':
      return `${playerName}'s franchise legacy is growing.`;
  }
}

function teamRecord(snapshot: StoryArcSnapshot, teamId: string) {
  return snapshot.standings.get(teamId) ?? { wins: 0, losses: 0 };
}

function awardCount(snapshot: StoryArcSnapshot, playerId: string): number {
  return snapshot.awardHistory.filter((entry) => entry.playerId === playerId).length;
}

function isMinorLeaguer(player: GeneratedPlayer): boolean {
  return player.rosterStatus !== 'MLB';
}

function detectArcType(
  snapshot: StoryArcSnapshot,
  player: GeneratedPlayer,
): StoryArcType | null {
  const stats = snapshot.seasonStats.get(player.id);
  const avg = battingAverage(stats);
  const playerEra = era(stats);
  const displayRating = toDisplayRating(player.overallRating);
  const record = teamRecord(snapshot, player.teamId);
  const teamLosing = record.losses > record.wins;
  const nearDeadline = getDaysUntilTradeDeadline(snapshot.day) <= 25 && getDaysUntilTradeDeadline(snapshot.day) >= 0;
  const origin = snapshot.playerOrigins?.get(player.id) ?? null;

  if (
    player.rosterStatus === 'MLB'
    && player.age <= 24
    && player.serviceTimeDays <= 172
    && (
      (!isPitcher(player) && (avg >= 0.3 || (stats?.hr ?? 0) >= 8) && (stats?.pa ?? 0) >= 80)
      || (isPitcher(player) && playerEra <= 3.4 && (stats?.ip ?? 0) >= 45)
    )
  ) {
    return 'rookie_sensation';
  }

  if (
    player.rosterStatus === 'MLB'
    && player.teamId === snapshot.userTeamId
    && player.serviceTimeDays >= (8 * 172)
    && awardCount(snapshot, player.id) >= 3
  ) {
    return 'dynasty_cornerstone';
  }

  if (
    player.rosterStatus === 'MLB'
    && player.age >= 25
    && player.age <= 31
    && player.serviceTimeDays > 172
    && displayRating >= 55
    && displayRating <= 72
    && (
      (!isPitcher(player) && (stats?.pa ?? 0) >= 120 && ((stats?.hr ?? 0) >= 14 || avg >= 0.315))
      || (isPitcher(player) && (stats?.ip ?? 0) >= 50 && playerEra <= 3.25 && (stats?.strikeouts ?? 0) >= 55)
    )
  ) {
    return 'breakout_campaign';
  }

  if (
    player.rosterStatus === 'MLB'
    && player.age >= 26
    && player.developmentTrajectory === 'ahead_of_curve'
    && (
      (!isPitcher(player) && (stats?.pa ?? 0) >= 80 && avg >= 0.28)
      || (isPitcher(player) && (stats?.ip ?? 0) >= 30 && playerEra <= 3.8)
    )
  ) {
    return 'comeback_trail';
  }

  if (
    player.rosterStatus === 'MLB'
    && player.age >= 33
    && (player.developmentTrajectory === 'below_expectations' || player.developmentTrajectory === 'bust_risk')
    && (
      (!isPitcher(player) && (stats?.pa ?? 0) >= 80 && avg <= 0.235)
      || (isPitcher(player) && (stats?.ip ?? 0) >= 40 && playerEra >= 4.8)
      || displayRating <= 58
    )
  ) {
    return 'decline_watch';
  }

  if (
    player.rosterStatus === 'MLB'
    && player.contract.years <= 1
    && teamLosing
    && nearDeadline
    && displayRating >= 55
  ) {
    return 'trade_saga';
  }

  if (
    player.rosterStatus === 'MLB'
    && player.contract.years === 1
    && displayRating >= 58
    && ((stats?.pa ?? 0) >= 120 || (stats?.ip ?? 0) >= 50)
  ) {
    return 'contract_drama';
  }

  if (
    isMinorLeaguer(player)
    && player.age <= 23
    && displayRating >= 55
    && origin != null
    && ['AAA', 'AA', 'A_PLUS', 'A'].includes(player.rosterStatus)
  ) {
    return 'prospect_rise';
  }

  return null;
}

function buildStoryArc(
  snapshot: StoryArcSnapshot,
  player: GeneratedPlayer,
  arcType: StoryArcType,
): PlayerStoryArc {
  return {
    playerId: player.id,
    arcType,
    startSeason: snapshot.season,
    startDay: snapshot.day,
    phase: 'setup',
    milestones: [headlineForArc(`${player.firstName} ${player.lastName}`, arcType)],
    resolvedSeason: null,
  };
}

function candidateSort(snapshot: StoryArcSnapshot, left: PlayerStoryArc, right: PlayerStoryArc): number {
  const leftPlayer = snapshot.players.find((player) => player.id === left.playerId);
  const rightPlayer = snapshot.players.find((player) => player.id === right.playerId);
  const leftUser = leftPlayer?.teamId === snapshot.userTeamId ? 1 : 0;
  const rightUser = rightPlayer?.teamId === snapshot.userTeamId ? 1 : 0;
  if (rightUser !== leftUser) {
    return rightUser - leftUser;
  }
  const priorityDelta = ARC_PRIORITY[right.arcType as StoryArcType] - ARC_PRIORITY[left.arcType as StoryArcType];
  if (priorityDelta !== 0) {
    return priorityDelta;
  }
  const ratingDelta = (rightPlayer?.overallRating ?? 0) - (leftPlayer?.overallRating ?? 0);
  if (ratingDelta !== 0) {
    return ratingDelta;
  }
  return left.playerId.localeCompare(right.playerId);
}

export function detectNewStoryArcs(
  _rng: GameRNG,
  snapshot: StoryArcSnapshot,
): PlayerStoryArc[] {
  const activeArcs = snapshot.playerStoryArcs.filter((arc) => arc.resolvedSeason == null);
  const activePlayerIds = new Set(activeArcs.map((arc) => arc.playerId));
  const openSlots = Math.max(0, MAX_ACTIVE_ARCS - activeArcs.length);
  if (openSlots === 0) {
    return [];
  }

  const detected = snapshot.players
    .filter((player) => !activePlayerIds.has(player.id))
    .map((player) => {
      const arcType = detectArcType(snapshot, player);
      return arcType ? buildStoryArc(snapshot, player, arcType) : null;
    })
    .filter((arc): arc is PlayerStoryArc => arc != null)
    .sort((left, right) => candidateSort(snapshot, left, right));

  return detected.slice(0, openSlots);
}

function transitionCategory(arcType: StoryArcType): TickerEntry['category'] {
  if (arcType === 'prospect_rise') {
    return 'prospect';
  }
  if (arcType === 'trade_saga' || arcType === 'contract_drama') {
    return 'rumor';
  }
  return 'milestone';
}

function progressLevel(snapshot: StoryArcSnapshot, arc: PlayerStoryArc, player: GeneratedPlayer): number {
  const stats = snapshot.seasonStats.get(player.id);
  const avg = battingAverage(stats);
  const playerEra = era(stats);
  const record = teamRecord(snapshot, player.teamId);
  const deadlineDays = getDaysUntilTradeDeadline(snapshot.day);

  switch (arc.arcType as StoryArcType) {
    case 'rookie_sensation':
      if (snapshot.day >= 145) return 3;
      if ((!isPitcher(player) && ((stats?.hr ?? 0) >= 18 || avg >= 0.32)) || (isPitcher(player) && playerEra <= 3.0 && (stats?.wins ?? 0) >= 8)) return 2;
      return 1;
    case 'breakout_campaign':
      if (snapshot.day >= 145) return 3;
      if ((!isPitcher(player) && ((stats?.hr ?? 0) >= 22 || (stats?.rbi ?? 0) >= 70)) || (isPitcher(player) && (stats?.wins ?? 0) >= 10 && playerEra <= 3.2)) return 2;
      return 1;
    case 'comeback_trail':
      if (snapshot.day >= 145) return 3;
      if ((!isPitcher(player) && avg >= 0.3) || (isPitcher(player) && playerEra <= 3.4 && (stats?.ip ?? 0) >= 70)) return 2;
      return 1;
    case 'decline_watch':
      if (snapshot.day >= 145) return 3;
      if ((!isPitcher(player) && avg <= 0.22) || (isPitcher(player) && playerEra >= 5.2)) return 2;
      return 1;
    case 'trade_saga':
      if (deadlineDays < 0) return 3;
      if (deadlineDays <= 10) return 2;
      return 1;
    case 'contract_drama':
      if (snapshot.day >= 145) return 3;
      if ((!isPitcher(player) && (stats?.hr ?? 0) >= 18) || (isPitcher(player) && (stats?.wins ?? 0) >= 9)) return 2;
      return 1;
    case 'prospect_rise':
      if (player.rosterStatus === 'MLB') return 3;
      if (player.rosterStatus === 'AAA') return 2;
      return 1;
    case 'dynasty_cornerstone':
      if (snapshot.day >= 145) return 3;
      if (awardCount(snapshot, player.id) >= 4 || player.serviceTimeDays >= (10 * 172)) return 2;
      return 1;
  }
}

function storyOutcomeText(
  snapshot: StoryArcSnapshot,
  player: GeneratedPlayer,
  arc: PlayerStoryArc,
  nextPhase: StoryArcOutcomePhase,
): string {
  const phaseTemplates = STORY_PHASE_TEMPLATES[nextPhase];
  const scope = [
    'story-arc',
    player.id,
    arc.arcType,
    nextPhase,
    snapshot.season,
    snapshot.day,
  ].join(':');

  return pickStableVariant(scope, phaseTemplates)
    .replaceAll('{player}', `${player.firstName} ${player.lastName}`)
    .replaceAll('{arc}', arcLabel(arc.arcType as StoryArcType));
}

function storyNews(
  snapshot: StoryArcSnapshot,
  player: GeneratedPlayer,
  arc: PlayerStoryArc,
  nextPhase: StoryArcOutcomePhase,
  outcomeText: string,
): NewsItem {
  const playerName = `${player.firstName} ${player.lastName}`;
  return {
    id: `story-arc-${arc.arcType}-${player.id}-${nextPhase}-${snapshot.season}-${snapshot.day}`,
    headline: outcomeText,
    body: `${playerName} has moved into the ${nextPhase} phase of a ${arcLabel(arc.arcType as StoryArcType)}.`,
    priority: nextPhase === 'climax' ? 2 : 3,
    category: arc.arcType === 'trade_saga' || arc.arcType === 'contract_drama' ? 'rumor' : 'performance',
    tag: 'ANALYSIS',
    timestamp: currentTimestamp(snapshot.season, snapshot.day),
    relatedPlayerIds: [player.id],
    relatedTeamIds: [player.teamId],
    read: false,
  };
}

function storyTicker(
  snapshot: StoryArcSnapshot,
  player: GeneratedPlayer,
  arc: PlayerStoryArc,
  nextPhase: StoryArcOutcomePhase,
  outcomeText: string,
): TickerEntry {
  return {
    id: `ticker-story-${arc.arcType}-${player.id}-${nextPhase}-${snapshot.season}-${snapshot.day}`,
    timestamp: currentTimestamp(snapshot.season, snapshot.day),
    category: transitionCategory(arc.arcType as StoryArcType),
    text: outcomeText,
    priority: nextPhase === 'climax' ? 4 : 3,
    relatedTeamIds: [player.teamId],
    relatedPlayerIds: [player.id],
    expiresDay: (snapshot.season * 1000) + snapshot.day + 21,
  };
}

export function advanceStoryArcs(
  _rng: GameRNG,
  snapshot: StoryArcSnapshot,
): { updatedArcs: PlayerStoryArc[]; newsItems: NewsItem[]; tickerEntries: TickerEntry[] } {
  const newsItems: NewsItem[] = [];
  const tickerEntries: TickerEntry[] = [];

  const updatedArcs = snapshot.playerStoryArcs.map((arc) => {
    if (arc.resolvedSeason != null) {
      return arc;
    }

    const player = snapshot.players.find((entry) => entry.id === arc.playerId);
    if (!player) {
      return {
        ...arc,
        phase: 'resolution',
        resolvedSeason: snapshot.season,
      } satisfies PlayerStoryArc;
    }

    const progress = progressLevel(snapshot, arc, player);
    const hasElapsed = snapshot.season > arc.startSeason || snapshot.day > arc.startDay;
    let nextPhase = arc.phase;

    if (arc.phase === 'setup' && hasElapsed && progress >= 1) {
      nextPhase = 'rising';
    } else if (arc.phase === 'rising' && progress >= 2) {
      nextPhase = 'climax';
    } else if (arc.phase === 'climax' && progress >= 3) {
      nextPhase = 'resolution';
    }

    if (nextPhase === arc.phase) {
      return arc;
    }

    const resolvedPhase = nextPhase as StoryArcOutcomePhase;
    const outcomeText = storyOutcomeText(snapshot, player, arc, resolvedPhase);

    newsItems.push(storyNews(snapshot, player, arc, resolvedPhase, outcomeText));
    tickerEntries.push(storyTicker(snapshot, player, arc, resolvedPhase, outcomeText));

    return {
      ...arc,
      phase: nextPhase,
      milestones: [...arc.milestones, outcomeText],
      resolvedSeason: nextPhase === 'resolution' ? snapshot.season : null,
    } satisfies PlayerStoryArc;
  });

  return {
    updatedArcs,
    newsItems,
    tickerEntries,
  };
}
