import type { Rivalry } from '@mbd/contracts';
import type { GameBoxScore } from '../sim/gameSimulator.js';
import type { PlayoffSeriesState } from '../sim/playoffSimulator.js';
import type { StandingsEntry } from './standings.js';
import { getTeamById } from './teams.js';

type RivalryOrigin = NonNullable<Rivalry['origin']>;
type RivalryEvent = NonNullable<Rivalry['eventHistory']>[number];

export interface RivalrySeasonReviewContext {
  season: number;
  standingsByDivision: Record<string, StandingsEntry[]>;
  playoffSeries?: Array<Pick<PlayoffSeriesState, 'higherSeed' | 'lowerSeed' | 'winnerId' | 'loserId' | 'round'>>;
}

export interface RivalryTradeContext {
  season: number;
  fromTeamId: string;
  toTeamId: string;
  impactScore: number;
  summary?: string;
}

export interface RivalryDefectionContext {
  season: number;
  fromTeamId: string;
  toTeamId: string;
  playerName: string;
  starScore: number;
}

export interface ComputedRivalryIntensityContext {
  readonly rivalry: Rivalry | null;
  readonly currentSeasonTeamMomentCount?: number;
  readonly currentSeasonPlayerMomentCount?: number;
}

export interface RivalryMatchupNarrativeContext {
  readonly rivalry: Rivalry | null;
  readonly season: number;
  readonly day: number;
  readonly minimumIntensityScore?: number;
  readonly currentSeasonTeamMomentCount?: number;
  readonly currentSeasonPlayerMomentCount?: number;
}

export interface RivalryMatchupNarrative {
  readonly headline: string;
  readonly body: string;
  readonly intensityScore: number;
}

export const RIVALRY_MATCHUP_BRIEFING_MIN_SCORE = 55;
export const RIVALRY_HIGH_LEVERAGE_MIN_SCORE = 70;

interface RivalryNarrativeRenderContext {
  readonly rivalry: Rivalry;
  readonly intensityScore: number;
  readonly summary: string;
  readonly teamALabel: string;
  readonly teamBLabel: string;
}

const HISTORICAL_RIVALRIES: Array<{
  teamA: string;
  teamB: string;
  intensity: number;
  reason: string;
}> = [
  { teamA: 'nym', teamB: 'bos', intensity: 78, reason: 'Historic East Coast feud' },
  { teamA: 'lax', teamB: 'sfb', intensity: 76, reason: 'Historic California feud' },
  { teamA: 'chi', teamB: 'det', intensity: 72, reason: 'Historic Great Lakes feud' },
];

const RIVALRY_MATCHUP_HEADLINE_VARIANTS: ReadonlyArray<
  (context: RivalryNarrativeRenderContext) => string
> = [
  ({ teamALabel, teamBLabel }) => `${teamALabel} and ${teamBLabel} are lining up for another loud chapter.`,
  ({ teamALabel, teamBLabel }) => `${teamALabel}-${teamBLabel} is drifting back to the center of the season.`,
  ({ teamALabel, teamBLabel }) => `Another meaningful ${teamALabel}-${teamBLabel} meeting is back on the board.`,
];

const RIVALRY_MATCHUP_BODY_VARIANTS: ReadonlyArray<
  (context: RivalryNarrativeRenderContext) => string
> = [
  ({ teamALabel, teamBLabel, summary }) => `${teamALabel} and ${teamBLabel} keep running into meaningful stakes. ${summary}`,
  ({ teamALabel, teamBLabel, summary }) => `The room already knows this matchup carries old noise and fresh pressure. ${summary}`,
  ({ teamALabel, teamBLabel, summary }) => `${teamALabel} and ${teamBLabel} have real carryover heat again. ${summary}`,
];

function rivalryId(teamA: string, teamB: string): string {
  return [teamA, teamB].sort((left, right) => left.localeCompare(right)).join(':');
}

function clampIntensity(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function sameDivision(teamA: string, teamB: string): boolean {
  const left = getTeamById(teamA);
  const right = getTeamById(teamB);
  return Boolean(left && right && left.division === right.division);
}

function abbreviate(teamId: string): string {
  return getTeamById(teamId)?.abbreviation ?? teamId.toUpperCase();
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function stableRivalryNarrativeKey(
  rivalry: Rivalry,
  season: number,
  day: number,
  topicId: string,
): string {
  return [rivalry.id, season, day, topicId].join(':');
}

function pickStableRivalryNarrative(
  variants: ReadonlyArray<(context: RivalryNarrativeRenderContext) => string>,
  renderContext: RivalryNarrativeRenderContext,
  season: number,
  day: number,
  topicId: string,
): string {
  if (variants.length === 1) {
    return variants[0]!(renderContext);
  }

  const variantIndex = hashString(
    stableRivalryNarrativeKey(renderContext.rivalry, season, day, topicId),
  ) % variants.length;
  return variants[variantIndex]!(renderContext);
}

function defaultOrigin(teamA: string, teamB: string): RivalryOrigin {
  return sameDivision(teamA, teamB) ? 'division_race' : 'playoff';
}

function pushReason(reasons: string[], reason: string): string[] {
  return reasons.includes(reason) ? reasons : [...reasons, reason];
}

function pushEventHistory(current: Rivalry, season: number, type: RivalryEvent['type'], summary: string): Rivalry['eventHistory'] {
  const next = [...(current.eventHistory ?? [])];
  if (!next.some((entry) => entry.season === season && entry.type === type && entry.summary === summary)) {
    next.unshift({ season, type, summary });
  }
  return next.slice(0, 8);
}

function summarizeRivalry(rivalry: Rivalry): string {
  const headToHead = (rivalry.currentSeasonWinsA ?? 0) + (rivalry.currentSeasonWinsB ?? 0) > 0
    ? `${abbreviate(rivalry.teamA)} leads ${rivalry.currentSeasonWinsA ?? 0}-${rivalry.currentSeasonWinsB ?? 0}`
    : (rivalry.historicalWinsA ?? 0) + (rivalry.historicalWinsB ?? 0) > 0
      ? `Tracked head-to-head: ${abbreviate(rivalry.teamA)} ${(rivalry.historicalWinsA ?? 0)}-${(rivalry.historicalWinsB ?? 0)} ${abbreviate(rivalry.teamB)}`
      : 'Bad blood is still building.';

  if (rivalry.intensity >= 80) {
    return `${abbreviate(rivalry.teamA)} and ${abbreviate(rivalry.teamB)} are running hot. ${headToHead}.`;
  }
  if (rivalry.intensity >= 60) {
    return `${abbreviate(rivalry.teamA)} and ${abbreviate(rivalry.teamB)} keep colliding in meaningful spots. ${headToHead}.`;
  }
  if (rivalry.intensity >= 40) {
    return `${abbreviate(rivalry.teamA)} and ${abbreviate(rivalry.teamB)} are starting to circle each other. ${headToHead}.`;
  }
  return `${abbreviate(rivalry.teamA)} and ${abbreviate(rivalry.teamB)} are still being watched. ${headToHead}.`;
}

function createRivalry(
  teamA: string,
  teamB: string,
  intensity: number,
  reason: string,
  origin: RivalryOrigin,
  season?: number,
): Rivalry {
  const rivalry: Rivalry = {
    id: rivalryId(teamA, teamB),
    teamA,
    teamB,
    intensity: clampIntensity(intensity),
    summary: '',
    reasons: [reason],
    origin,
    active: true,
    currentSeasonWinsA: 0,
    currentSeasonWinsB: 0,
    historicalWinsA: 0,
    historicalWinsB: 0,
    lastMetSeason: season ?? 0,
    closeRaceStreak: 0,
    playoffSeriesStreak: 0,
    lastTradeSeason: 0,
    lastDefectionSeason: 0,
    eventHistory: season
      ? [{ season, type: origin === 'division_race' ? 'division_race' : origin, summary: reason }]
      : [],
  };
  return {
    ...rivalry,
    summary: summarizeRivalry(rivalry),
  };
}

function getPairKey(teamA: string, teamB: string): string {
  return rivalryId(teamA, teamB);
}

function setRivalry(existing: Map<string, Rivalry>, rivalry: Rivalry): Map<string, Rivalry> {
  existing.set(rivalry.id, {
    ...rivalry,
    intensity: clampIntensity(rivalry.intensity),
    summary: summarizeRivalry(rivalry),
  });
  return existing;
}

function bumpSeasonWins(rivalry: Rivalry, winnerId: string): Rivalry {
  if (winnerId === rivalry.teamA) {
    return {
      ...rivalry,
      currentSeasonWinsA: (rivalry.currentSeasonWinsA ?? 0) + 1,
      historicalWinsA: (rivalry.historicalWinsA ?? 0) + 1,
    };
  }
  return {
    ...rivalry,
    currentSeasonWinsB: (rivalry.currentSeasonWinsB ?? 0) + 1,
    historicalWinsB: (rivalry.historicalWinsB ?? 0) + 1,
  };
}

export function getRivalry(existing: Map<string, Rivalry>, teamA: string, teamB: string): Rivalry | null {
  return existing.get(rivalryId(teamA, teamB)) ?? null;
}

export function seedHistoricalRivalries(existing: Map<string, Rivalry> = new Map()): Map<string, Rivalry> {
  const next = new Map(existing);
  for (const entry of HISTORICAL_RIVALRIES) {
    const current = next.get(getPairKey(entry.teamA, entry.teamB));
    if (!current) {
      setRivalry(next, createRivalry(entry.teamA, entry.teamB, entry.intensity, entry.reason, 'historical'));
      continue;
    }

    setRivalry(next, {
      ...current,
      intensity: clampIntensity(current.intensity),
      origin: current.origin ?? 'historical',
      active: true,
      reasons: pushReason(current.reasons, entry.reason),
      eventHistory: pushEventHistory(current, current.lastMetSeason || 1, 'historical', entry.reason),
    });
  }
  return next;
}

export function upsertRivalry(
  existing: Map<string, Rivalry>,
  teamA: string,
  teamB: string,
  intensityChange: number,
  reason: string,
  options: {
    origin?: RivalryOrigin;
    season?: number;
    active?: boolean;
  } = {},
): Map<string, Rivalry> {
  const next = seedHistoricalRivalries(existing);
  const current = next.get(getPairKey(teamA, teamB))
    ?? createRivalry(teamA, teamB, 44, reason, options.origin ?? defaultOrigin(teamA, teamB), options.season);

  const updated: Rivalry = {
    ...current,
    intensity: clampIntensity(current.intensity + intensityChange),
    origin: current.origin ?? options.origin ?? defaultOrigin(teamA, teamB),
    active: options.active ?? true,
    reasons: pushReason(current.reasons, reason),
    eventHistory: options.season
      ? pushEventHistory(current, options.season, options.origin ?? current.origin ?? defaultOrigin(teamA, teamB), reason)
      : current.eventHistory ?? [],
  };

  return setRivalry(next, updated);
}

export function recordRivalryGame(
  existing: Map<string, Rivalry>,
  game: Pick<GameBoxScore, 'homeTeamId' | 'awayTeamId' | 'homeScore' | 'awayScore'>,
  season: number,
): Map<string, Rivalry> {
  const next = seedHistoricalRivalries(existing);
  const current = getRivalry(next, game.homeTeamId, game.awayTeamId);
  if (!current) {
    return next;
  }

  const winnerId = game.homeScore > game.awayScore ? game.homeTeamId : game.awayTeamId;
  const oneRunGame = Math.abs(game.homeScore - game.awayScore) <= 1;
  const rivalry = bumpSeasonWins(current, winnerId);

  return setRivalry(next, {
    ...rivalry,
    intensity: clampIntensity(rivalry.intensity + (oneRunGame ? 3 : 2)),
    active: true,
    lastMetSeason: season,
    eventHistory: pushEventHistory(
      rivalry,
      season,
      'series_result',
      `${abbreviate(winnerId)} took another chapter in the rivalry.`,
    ),
  });
}

export function deriveRivalriesFromStandings(
  existing: Map<string, Rivalry>,
  standingsByDivision: Record<string, StandingsEntry[]>,
  season?: number,
): Map<string, Rivalry> {
  const next = seedHistoricalRivalries(existing);

  for (const entries of Object.values(standingsByDivision)) {
    if (entries.length < 2) continue;
    const leader = entries[0]!;
    const challenger = entries[1]!;
    if (challenger.gamesBack <= 5) {
      upsertRivalry(next, leader.teamId, challenger.teamId, challenger.gamesBack <= 2 ? 6 : 4, 'Tight division race', {
        origin: 'division_race',
        season,
        active: true,
      });
    }
  }

  return next;
}

function finalStandingsPairs(standingsByDivision: Record<string, StandingsEntry[]>): Set<string> {
  const pairs = new Set<string>();
  for (const entries of Object.values(standingsByDivision)) {
    if (entries.length < 2) continue;
    const leader = entries[0]!;
    const challenger = entries[1]!;
    if (challenger.gamesBack <= 5) {
      pairs.add(getPairKey(leader.teamId, challenger.teamId));
    }
  }
  return pairs;
}

function playoffPairs(playoffSeries: RivalrySeasonReviewContext['playoffSeries']): Set<string> {
  const pairs = new Set<string>();
  for (const series of playoffSeries ?? []) {
    pairs.add(getPairKey(series.higherSeed.teamId, series.lowerSeed.teamId));
  }
  return pairs;
}

export function finalizeSeasonRivalries(
  existing: Map<string, Rivalry>,
  context: RivalrySeasonReviewContext,
): Map<string, Rivalry> {
  const next = seedHistoricalRivalries(existing);
  const closeRacePairs = finalStandingsPairs(context.standingsByDivision);
  const postseasonPairs = playoffPairs(context.playoffSeries);
  const touched = new Set<string>([...closeRacePairs, ...postseasonPairs]);

  for (const [id, rivalry] of next.entries()) {
    const inCloseRace = closeRacePairs.has(id);
    const inPostseason = postseasonPairs.has(id);
    const updated: Rivalry = {
      ...rivalry,
      closeRaceStreak: inCloseRace ? (rivalry.closeRaceStreak ?? 0) + 1 : 0,
      playoffSeriesStreak: inPostseason ? (rivalry.playoffSeriesStreak ?? 0) + 1 : 0,
      active: rivalry.origin === 'historical' || rivalry.intensity >= 15,
    };

    if (inCloseRace) {
      updated.intensity = clampIntensity(updated.intensity + ((updated.closeRaceStreak ?? 0) >= 3 ? 12 : 5));
      updated.origin = rivalry.origin ?? 'division_race';
      updated.reasons = pushReason(
        updated.reasons,
        (updated.closeRaceStreak ?? 0) >= 3 ? 'Three straight close division races' : 'Tight division race',
      );
      updated.eventHistory = pushEventHistory(
        updated,
        context.season,
        'division_race',
        (updated.closeRaceStreak ?? 0) >= 3
          ? 'The division race stayed tight for a third straight season.'
          : 'The division standings tightened again.',
      );
    }

    if (inPostseason) {
      updated.intensity = clampIntensity(updated.intensity + ((updated.playoffSeriesStreak ?? 0) >= 2 ? 14 : 9));
      if (updated.origin !== 'historical') {
        updated.origin = 'playoff';
      }
      updated.reasons = pushReason(
        updated.reasons,
        (updated.playoffSeriesStreak ?? 0) >= 2 ? 'Back-to-back playoff meetings' : 'Playoff collision',
      );
      updated.eventHistory = pushEventHistory(
        updated,
        context.season,
        'playoff',
        (updated.playoffSeriesStreak ?? 0) >= 2
          ? 'The clubs met in October again.'
          : 'October put the clubs on the same line.',
      );
    }

    if (!inCloseRace && !inPostseason && updated.lastTradeSeason !== context.season && updated.lastDefectionSeason !== context.season) {
      updated.intensity = clampIntensity(updated.intensity - (updated.origin === 'historical' ? 2 : 5));
    }

    updated.currentSeasonWinsA = 0;
    updated.currentSeasonWinsB = 0;
    setRivalry(next, updated);
  }

  for (const id of touched) {
    if (next.has(id)) continue;
    const [teamA, teamB] = id.split(':');
    if (!teamA || !teamB) continue;
    const origin = postseasonPairs.has(id) ? 'playoff' : 'division_race';
    const baseReason = origin === 'playoff' ? 'Playoff collision' : 'Tight division race';
    const created = createRivalry(teamA, teamB, origin === 'playoff' ? 58 : 46, baseReason, origin, context.season);
    setRivalry(
      next,
      {
        ...created,
        closeRaceStreak: origin === 'division_race' ? 1 : 0,
        playoffSeriesStreak: origin === 'playoff' ? 1 : 0,
      },
    );
  }

  return next;
}

export function recordBlockbusterTradeRivalry(
  existing: Map<string, Rivalry>,
  context: RivalryTradeContext,
): Map<string, Rivalry> {
  if (context.impactScore < 28) {
    return existing;
  }

  const next = upsertRivalry(
    existing,
    context.fromTeamId,
    context.toTeamId,
    10 + Math.round(context.impactScore / 12),
    context.summary ?? 'Blockbuster trade',
    {
      origin: 'trade',
      season: context.season,
      active: true,
    },
  );
  const rivalry = getRivalry(next, context.fromTeamId, context.toTeamId);
  if (!rivalry) {
    return next;
  }

  return setRivalry(next, {
    ...rivalry,
    lastTradeSeason: context.season,
  });
}

export function recordStarDefectionRivalry(
  existing: Map<string, Rivalry>,
  context: RivalryDefectionContext,
): Map<string, Rivalry> {
  if (context.fromTeamId === context.toTeamId || context.starScore < 280) {
    return existing;
  }

  const next = upsertRivalry(
    existing,
    context.fromTeamId,
    context.toTeamId,
    8 + Math.round((context.starScore - 260) / 20),
    `${context.playerName} crossed the line in free agency`,
    {
      origin: 'defection',
      season: context.season,
      active: true,
    },
  );
  const rivalry = getRivalry(next, context.fromTeamId, context.toTeamId);
  if (!rivalry) {
    return next;
  }

  return setRivalry(next, {
    ...rivalry,
    lastDefectionSeason: context.season,
  });
}

export function rivalryTradePenalty(
  existing: Map<string, Rivalry>,
  fromTeamId: string,
  toTeamId: string,
  requestedRatings: number[],
): number {
  if (requestedRatings.length === 0) {
    return 0;
  }

  const rivalry = getRivalry(existing, fromTeamId, toTeamId);
  const intensity = rivalry?.intensity ?? (sameDivision(fromTeamId, toTeamId) ? 40 : 0);
  if (intensity === 0) {
    return 0;
  }

  const starPenalty = requestedRatings.reduce((total, rating) => {
    if (rating >= 360) return total + 8;
    if (rating >= 320) return total + 6;
    if (rating >= 280) return total + 4;
    return total;
  }, 0);

  return Math.round((intensity / 12) + starPenalty);
}

export function rivalryGameModifier(
  existing: Map<string, Rivalry>,
  teamId: string,
  opponentId: string,
  chemistryScore: number,
): number {
  const rivalry = getRivalry(existing, teamId, opponentId);
  if (!rivalry) {
    return 0;
  }

  const chemistryTilt = (Math.max(0, Math.min(100, chemistryScore)) - 50) / 50;
  return Number((chemistryTilt * (rivalry.intensity / 100) * 0.012).toFixed(4));
}

export function computeRivalryIntensityScore(
  context: ComputedRivalryIntensityContext,
): number {
  const rivalry = context.rivalry;
  if (!rivalry) {
    return 0;
  }

  const currentSeasonWinsA = rivalry.currentSeasonWinsA ?? 0;
  const currentSeasonWinsB = rivalry.currentSeasonWinsB ?? 0;
  const gamesPlayed = currentSeasonWinsA + currentSeasonWinsB;
  const headToHeadGap = Math.abs(currentSeasonWinsA - currentSeasonWinsB);
  const tightnessBonus = gamesPlayed === 0
    ? 0
    : Math.max(0, Math.min(18, gamesPlayed * 2.5) - (headToHeadGap * 3));
  const playoffBonus = Math.min(20, (rivalry.playoffSeriesStreak ?? 0) * 6);
  const closeRaceBonus = Math.min(15, (rivalry.closeRaceStreak ?? 0) * 4);
  const eventHistoryBonus = Math.min(10, (rivalry.eventHistory?.length ?? 0) * 1.5);
  const teamMomentBonus = Math.min(12, (context.currentSeasonTeamMomentCount ?? 0) * 3);
  const playerMomentBonus = Math.min(12, (context.currentSeasonPlayerMomentCount ?? 0) * 2);

  return clampIntensity(
    (rivalry.intensity * 0.55)
    + tightnessBonus
    + playoffBonus
    + closeRaceBonus
    + eventHistoryBonus
    + teamMomentBonus
    + playerMomentBonus,
  );
}

export function getRivalryMatchupNarrative(
  context: RivalryMatchupNarrativeContext,
): RivalryMatchupNarrative | null {
  if (!context.rivalry) {
    return null;
  }

  const intensityScore = computeRivalryIntensityScore({
    rivalry: context.rivalry,
    currentSeasonTeamMomentCount: context.currentSeasonTeamMomentCount,
    currentSeasonPlayerMomentCount: context.currentSeasonPlayerMomentCount,
  });
  if (intensityScore < (context.minimumIntensityScore ?? 0)) {
    return null;
  }

  const renderContext: RivalryNarrativeRenderContext = {
    rivalry: context.rivalry,
    intensityScore,
    summary: context.rivalry.summary || summarizeRivalry(context.rivalry),
    teamALabel: abbreviate(context.rivalry.teamA),
    teamBLabel: abbreviate(context.rivalry.teamB),
  };

  return {
    headline: pickStableRivalryNarrative(
      RIVALRY_MATCHUP_HEADLINE_VARIANTS,
      renderContext,
      context.season,
      context.day,
      'matchup_headline',
    ),
    body: pickStableRivalryNarrative(
      RIVALRY_MATCHUP_BODY_VARIANTS,
      renderContext,
      context.season,
      context.day,
      'matchup_body',
    ),
    intensityScore,
  };
}
