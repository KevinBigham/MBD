import type { GeneratedPlayer } from '../player/generation.js';
import type { GameBoxScore } from '../sim/gameSimulator.js';
import type { PAOutcome, PAResult } from '../sim/plateAppearance.js';
import {
  pickStableWeeklyMomentBody,
  pickStableWeeklyMomentHeadline,
  type WeeklyMomentRenderContext,
  type WeeklyMomentTopicId,
} from '../narrative/weeklyMomentProse.js';
import type { Moment } from './momentDetector.js';

const WEEKLY_MOMENT_WINDOW_DAYS = 7;
const HOT_STREAK_WEEK_MIN_WINS = 5;
const HOT_STREAK_WEEK_MIN_RUN_DIFFERENTIAL = 15;
const COLD_SNAP_WEEK_MIN_LOSSES = 5;
const COLD_SNAP_WEEK_MAX_RUN_DIFFERENTIAL = -12;
const STREAK_WEEK_THROTTLE_DAYS = 14;
const CLOSER_LIGHTS_OUT_MIN_SAVES = 5;
const CLOSER_MELTDOWN_MIN_BLOWN_SAVES = 2;
const CLOSER_MELTDOWN_MIN_EARNED_RUNS = 4;
const CLOSER_MELTDOWN_MIN_OUTINGS = 3;
const BENCH_CLUTCH_MIN_RBI = 5;
const BENCH_CLUTCH_MIN_HOME_RUNS = 2;
const BULLPEN_OVERWORK_MIN_OUTS = 75;
const BULLPEN_OVERWORK_MIN_CONSECUTIVE_DAYS = 4;
const BULLPEN_OVERWORK_THROTTLE_DAYS = 30;

const WEEKLY_IMPACTS: Record<WeeklyMomentTopicId, number> = {
  hot_streak_week: 38,
  cold_snap_week: -36,
  closer_lights_out: 35,
  closer_meltdown_week: -40,
  bench_clutch_week: 32,
  bullpen_overwork_warning: -32,
};

const WEEKLY_RELEVANCE: Record<WeeklyMomentTopicId, number> = {
  hot_streak_week: 0.76,
  cold_snap_week: 0.74,
  closer_lights_out: 0.78,
  closer_meltdown_week: 0.80,
  bench_clutch_week: 0.70,
  bullpen_overwork_warning: 0.72,
};

const WEEKLY_MOMENT_ORDER: Record<WeeklyMomentTopicId, number> = {
  hot_streak_week: 0,
  cold_snap_week: 1,
  closer_lights_out: 2,
  closer_meltdown_week: 3,
  bench_clutch_week: 4,
  bullpen_overwork_warning: 5,
};

const PITCHER_OUTS_BY_OUTCOME: Readonly<Record<PAOutcome, number>> = {
  BB: 0,
  HBP: 0,
  SINGLE: 0,
  DOUBLE: 0,
  TRIPLE: 0,
  HR: 0,
  K: 1,
  GB_OUT: 1,
  FB_OUT: 1,
  LD_OUT: 1,
  SAC_FLY: 1,
  DOUBLE_PLAY: 2,
};

export interface WeeklyMomentDetectionContext {
  readonly season: number;
  readonly weekEndDay: number;
  readonly players: readonly GeneratedPlayer[];
  readonly gameLog: readonly GameBoxScore[];
  readonly teamMoments: ReadonlyMap<string, readonly Moment[]>;
  readonly playerMoments: ReadonlyMap<string, readonly Moment[]>;
}

export type WeeklyDetectedMoment =
  | {
    readonly scope: 'team';
    readonly teamId: string;
    readonly moment: Moment & { readonly day: number; readonly timestamp: string };
  }
  | {
    readonly scope: 'player';
    readonly teamId: string;
    readonly playerId: string;
    readonly moment: Moment & { readonly day: number; readonly timestamp: string };
  };

interface TeamWeekLine {
  wins: number;
  losses: number;
  runDifferential: number;
}

interface CloserWeekLine {
  teamId: string;
  playerId: string;
  saves: number;
  earnedRuns: number;
  outings: Set<number>;
  blownSaves: number;
}

interface BullpenWeekLine {
  outs: number;
  pitcherDays: Map<string, Set<number>>;
}

interface BenchWeekLine {
  rbi: number;
  homeRuns: number;
}

function dayFromTimestamp(timestamp: string | undefined): number | null {
  if (!timestamp) {
    return null;
  }
  const match = /^S\d+D(?<day>\d+)$/.exec(timestamp);
  return match?.groups ? Number(match.groups.day) : null;
}

function dayFromBoxScore(boxScore: GameBoxScore): number | null {
  return dayFromTimestamp(boxScore.date);
}

function seasonFromBoxScore(boxScore: GameBoxScore): number | null {
  const match = /^S(?<season>\d+)D\d+$/.exec(boxScore.date);
  return match?.groups ? Number(match.groups.season) : null;
}

function momentDay(moment: Moment): number | null {
  const day = (moment as { readonly day?: unknown }).day;
  if (typeof day === 'number') {
    return day;
  }
  return dayFromTimestamp((moment as { readonly timestamp?: string }).timestamp);
}

function gameIsInWindow(
  boxScore: GameBoxScore,
  season: number,
  weekStartDay: number,
  weekEndDay: number,
): boolean {
  if (boxScore.isPlayoff) {
    return false;
  }
  const gameSeason = seasonFromBoxScore(boxScore);
  const day = dayFromBoxScore(boxScore);
  return gameSeason === season && day != null && day >= weekStartDay && day <= weekEndDay;
}

function teamLabel(teamId: string): string {
  return teamId.toUpperCase();
}

function playerName(player: Pick<GeneratedPlayer, 'firstName' | 'lastName'>): string {
  return `${player.firstName} ${player.lastName}`;
}

function emptyTeamWeekLine(): TeamWeekLine {
  return {
    wins: 0,
    losses: 0,
    runDifferential: 0,
  };
}

function hasRecentMoment(
  momentsById: ReadonlyMap<string, readonly Moment[]>,
  ownerId: string,
  type: Moment['type'],
  season: number,
  weekEndDay: number,
  throttleDays: number,
): boolean {
  const earliestDay = weekEndDay - throttleDays + 1;
  return momentsById.get(ownerId)?.some((moment) => {
    if (moment.type !== type || moment.season !== season) {
      return false;
    }
    const day = momentDay(moment);
    return day != null && day >= earliestDay && day <= weekEndDay;
  }) ?? false;
}

function hasMomentOnDay(
  momentsById: ReadonlyMap<string, readonly Moment[]>,
  ownerId: string,
  type: Moment['type'],
  season: number,
  day: number,
): boolean {
  return hasRecentMoment(momentsById, ownerId, type, season, day, 1);
}

function buildDescription(
  topicId: WeeklyMomentTopicId,
  renderContext: WeeklyMomentRenderContext,
  stableKey: {
    readonly teamId?: string;
    readonly playerId?: string;
    readonly season: number;
    readonly weekStartDay: number;
  },
): string {
  const headline = pickStableWeeklyMomentHeadline(topicId, renderContext, stableKey);
  const body = pickStableWeeklyMomentBody(topicId, renderContext, stableKey);
  return `${headline} ${body}`;
}

function createMoment(
  season: number,
  weekEndDay: number,
  type: WeeklyMomentTopicId,
  description: string,
): Moment & { readonly day: number; readonly timestamp: string } {
  return {
    season,
    day: weekEndDay,
    timestamp: `S${season}D${weekEndDay}`,
    type,
    description,
    impact: WEEKLY_IMPACTS[type],
    relevance: WEEKLY_RELEVANCE[type],
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
  };
}

function addTeamLine(lines: Map<string, TeamWeekLine>, teamId: string): TeamWeekLine {
  let line = lines.get(teamId);
  if (!line) {
    line = emptyTeamWeekLine();
    lines.set(teamId, line);
  }
  return line;
}

function buildTeamWeekLines(
  context: WeeklyMomentDetectionContext,
  weekStartDay: number,
): Map<string, TeamWeekLine> {
  const lines = new Map<string, TeamWeekLine>();

  for (const game of context.gameLog) {
    if (!gameIsInWindow(game, context.season, weekStartDay, context.weekEndDay)) {
      continue;
    }

    const homeLine = addTeamLine(lines, game.homeTeamId);
    const awayLine = addTeamLine(lines, game.awayTeamId);
    const homeDiff = game.homeScore - game.awayScore;
    homeLine.runDifferential += homeDiff;
    awayLine.runDifferential -= homeDiff;

    if (game.homeScore > game.awayScore) {
      homeLine.wins += 1;
      awayLine.losses += 1;
    } else if (game.awayScore > game.homeScore) {
      awayLine.wins += 1;
      homeLine.losses += 1;
    }
  }

  return lines;
}

function detectTeamStreakMoments(
  context: WeeklyMomentDetectionContext,
  weekStartDay: number,
): WeeklyDetectedMoment[] {
  const detected: WeeklyDetectedMoment[] = [];
  const lines = buildTeamWeekLines(context, weekStartDay);

  for (const [teamId, line] of [...lines.entries()].sort((left, right) => left[0].localeCompare(right[0]))) {
    if (
      line.wins >= HOT_STREAK_WEEK_MIN_WINS
      && line.runDifferential >= HOT_STREAK_WEEK_MIN_RUN_DIFFERENTIAL
      && !hasRecentMoment(
        context.teamMoments,
        teamId,
        'hot_streak_week',
        context.season,
        context.weekEndDay,
        STREAK_WEEK_THROTTLE_DAYS,
      )
    ) {
      detected.push({
        scope: 'team',
        teamId,
        moment: createMoment(
          context.season,
          context.weekEndDay,
          'hot_streak_week',
          buildDescription(
            'hot_streak_week',
            {
              teamLabel: teamLabel(teamId),
              wins: line.wins,
              runDifferential: line.runDifferential,
            },
            { teamId, season: context.season, weekStartDay },
          ),
        ),
      });
    }

    if (
      line.losses >= COLD_SNAP_WEEK_MIN_LOSSES
      && line.runDifferential <= COLD_SNAP_WEEK_MAX_RUN_DIFFERENTIAL
      && !hasRecentMoment(
        context.teamMoments,
        teamId,
        'cold_snap_week',
        context.season,
        context.weekEndDay,
        STREAK_WEEK_THROTTLE_DAYS,
      )
    ) {
      detected.push({
        scope: 'team',
        teamId,
        moment: createMoment(
          context.season,
          context.weekEndDay,
          'cold_snap_week',
          buildDescription(
            'cold_snap_week',
            {
              teamLabel: teamLabel(teamId),
              losses: line.losses,
              runDifferential: line.runDifferential,
            },
            { teamId, season: context.season, weekStartDay },
          ),
        ),
      });
    }
  }

  return detected;
}

function leadForPitchingTeam(result: PAResult, after: boolean): number {
  const score = after ? result.scoreAfter : result.scoreBefore;
  const awayScore = score[0];
  const homeScore = score[1];
  return result.halfInning === 'top'
    ? homeScore - awayScore
    : awayScore - homeScore;
}

function isBlownSavePa(result: PAResult): boolean {
  if (result.inning < 7) {
    return false;
  }
  const leadBefore = leadForPitchingTeam(result, false);
  const leadAfter = leadForPitchingTeam(result, true);
  return leadBefore > 0 && leadBefore <= 3 && leadAfter <= 0;
}

function getCloserLine(lines: Map<string, CloserWeekLine>, player: GeneratedPlayer): CloserWeekLine {
  let line = lines.get(player.id);
  if (!line) {
    line = {
      teamId: player.teamId,
      playerId: player.id,
      saves: 0,
      earnedRuns: 0,
      outings: new Set<number>(),
      blownSaves: 0,
    };
    lines.set(player.id, line);
  }
  return line;
}

function buildCloserWeekLines(
  context: WeeklyMomentDetectionContext,
  weekStartDay: number,
): Map<string, CloserWeekLine> {
  const playersById = new Map(context.players.map((player) => [player.id, player] as const));
  const lines = new Map<string, CloserWeekLine>();

  for (const game of context.gameLog) {
    if (!gameIsInWindow(game, context.season, weekStartDay, context.weekEndDay)) {
      continue;
    }
    const day = dayFromBoxScore(game);
    if (day == null) {
      continue;
    }

    if (game.savePitcherId) {
      const savePitcher = playersById.get(game.savePitcherId);
      if (savePitcher?.position === 'CL') {
        const line = getCloserLine(lines, savePitcher);
        line.saves += 1;
        line.outings.add(day);
      }
    }

    const blownSavePitchers = new Set<string>();
    for (const result of game.paResults) {
      const pitcher = playersById.get(result.pitcherId);
      if (!pitcher || pitcher.position !== 'CL') {
        continue;
      }
      const line = getCloserLine(lines, pitcher);
      line.earnedRuns += result.rbiOnPlay;
      line.outings.add(day);
      if (isBlownSavePa(result)) {
        blownSavePitchers.add(pitcher.id);
      }
    }
    for (const pitcherId of blownSavePitchers) {
      const pitcher = playersById.get(pitcherId);
      if (pitcher) {
        getCloserLine(lines, pitcher).blownSaves += 1;
      }
    }
  }

  return lines;
}

function detectCloserMoments(
  context: WeeklyMomentDetectionContext,
  weekStartDay: number,
): WeeklyDetectedMoment[] {
  const detected: WeeklyDetectedMoment[] = [];
  const playersById = new Map(context.players.map((player) => [player.id, player] as const));
  const lines = buildCloserWeekLines(context, weekStartDay);

  for (const line of [...lines.values()].sort((left, right) => left.playerId.localeCompare(right.playerId))) {
    const player = playersById.get(line.playerId);
    if (!player) {
      continue;
    }

    const outings = line.outings.size;
    if (
      (line.blownSaves >= CLOSER_MELTDOWN_MIN_BLOWN_SAVES
        || (line.earnedRuns >= CLOSER_MELTDOWN_MIN_EARNED_RUNS && outings >= CLOSER_MELTDOWN_MIN_OUTINGS))
      && !hasMomentOnDay(
        context.playerMoments,
        line.playerId,
        'closer_meltdown_week',
        context.season,
        context.weekEndDay,
      )
    ) {
      detected.push({
        scope: 'player',
        teamId: line.teamId,
        playerId: line.playerId,
        moment: createMoment(
          context.season,
          context.weekEndDay,
          'closer_meltdown_week',
          buildDescription(
            'closer_meltdown_week',
            {
              teamLabel: teamLabel(line.teamId),
              playerName: playerName(player),
              blownSaves: line.blownSaves,
              earnedRuns: line.earnedRuns,
              outings,
            },
            { teamId: line.teamId, playerId: line.playerId, season: context.season, weekStartDay },
          ),
        ),
      });
      continue;
    }

    if (
      line.saves >= CLOSER_LIGHTS_OUT_MIN_SAVES
      && line.earnedRuns === 0
      && !hasMomentOnDay(
        context.playerMoments,
        line.playerId,
        'closer_lights_out',
        context.season,
        context.weekEndDay,
      )
    ) {
      detected.push({
        scope: 'player',
        teamId: line.teamId,
        playerId: line.playerId,
        moment: createMoment(
          context.season,
          context.weekEndDay,
          'closer_lights_out',
          buildDescription(
            'closer_lights_out',
            {
              teamLabel: teamLabel(line.teamId),
              playerName: playerName(player),
              saves: line.saves,
              earnedRuns: line.earnedRuns,
            },
            { teamId: line.teamId, playerId: line.playerId, season: context.season, weekStartDay },
          ),
        ),
      });
    }
  }

  return detected;
}

function projectedBenchHitterIds(players: readonly GeneratedPlayer[]): Set<string> {
  const benchIds = new Set<string>();
  const hittersByTeamId = new Map<string, GeneratedPlayer[]>();
  for (const player of players) {
    if (player.rosterStatus !== 'MLB' || player.pitcherAttributes != null) {
      continue;
    }
    const hitters = hittersByTeamId.get(player.teamId) ?? [];
    hitters.push(player);
    hittersByTeamId.set(player.teamId, hitters);
  }

  for (const hitters of hittersByTeamId.values()) {
    const sorted = [...hitters].sort((left, right) =>
      right.overallRating - left.overallRating
      || left.id.localeCompare(right.id)
    );
    for (const player of sorted.slice(9)) {
      benchIds.add(player.id);
    }
  }

  return benchIds;
}

function detectBenchClutchMoments(
  context: WeeklyMomentDetectionContext,
  weekStartDay: number,
): WeeklyDetectedMoment[] {
  const benchIds = projectedBenchHitterIds(context.players);
  if (benchIds.size === 0) {
    return [];
  }

  const playersById = new Map(context.players.map((player) => [player.id, player] as const));
  const lines = new Map<string, BenchWeekLine>();
  for (const game of context.gameLog) {
    if (!gameIsInWindow(game, context.season, weekStartDay, context.weekEndDay)) {
      continue;
    }
    for (const result of game.paResults) {
      if (!benchIds.has(result.batterId)) {
        continue;
      }
      const batter = playersById.get(result.batterId);
      if (!batter) {
        continue;
      }
      const line = lines.get(batter.teamId) ?? { rbi: 0, homeRuns: 0 };
      line.rbi += result.rbiOnPlay;
      if (result.outcome === 'HR') {
        line.homeRuns += 1;
      }
      lines.set(batter.teamId, line);
    }
  }

  return [...lines.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .filter(([teamId, line]) =>
      (line.rbi >= BENCH_CLUTCH_MIN_RBI || line.homeRuns >= BENCH_CLUTCH_MIN_HOME_RUNS)
      && !hasMomentOnDay(
        context.teamMoments,
        teamId,
        'bench_clutch_week',
        context.season,
        context.weekEndDay,
      )
    )
    .map(([teamId, line]) => ({
      scope: 'team' as const,
      teamId,
      moment: createMoment(
        context.season,
        context.weekEndDay,
        'bench_clutch_week',
        buildDescription(
          'bench_clutch_week',
          {
            teamLabel: teamLabel(teamId),
            rbi: line.rbi,
            homeRuns: line.homeRuns,
          },
          { teamId, season: context.season, weekStartDay },
        ),
      ),
    }));
}

function addPitcherDay(daysByPitcher: Map<string, Set<number>>, pitcherId: string, day: number) {
  const days = daysByPitcher.get(pitcherId) ?? new Set<number>();
  days.add(day);
  daysByPitcher.set(pitcherId, days);
}

function longestConsecutiveDayStreak(days: ReadonlySet<number>): number {
  const sorted = [...days].sort((left, right) => left - right);
  let longest = 0;
  let current = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    current = previous != null && day === previous + 1 ? current + 1 : 1;
    longest = Math.max(longest, current);
    previous = day;
  }
  return longest;
}

function detectBullpenOverworkMoments(
  context: WeeklyMomentDetectionContext,
  weekStartDay: number,
): WeeklyDetectedMoment[] {
  const playersById = new Map(context.players.map((player) => [player.id, player] as const));
  const lines = new Map<string, BullpenWeekLine>();

  for (const game of context.gameLog) {
    if (!gameIsInWindow(game, context.season, weekStartDay, context.weekEndDay)) {
      continue;
    }
    const day = dayFromBoxScore(game);
    if (day == null) {
      continue;
    }

    for (const result of game.paResults) {
      const pitcher = playersById.get(result.pitcherId);
      if (!pitcher || (pitcher.position !== 'RP' && pitcher.position !== 'CL')) {
        continue;
      }
      const line = lines.get(pitcher.teamId) ?? { outs: 0, pitcherDays: new Map<string, Set<number>>() };
      line.outs += PITCHER_OUTS_BY_OUTCOME[result.outcome] ?? 0;
      addPitcherDay(line.pitcherDays, pitcher.id, day);
      lines.set(pitcher.teamId, line);
    }
  }

  return [...lines.entries()]
    .sort((left, right) => left[0].localeCompare(right[0]))
    .map(([teamId, line]) => {
      const consecutiveDays = Math.max(
        0,
        ...[...line.pitcherDays.values()].map((days) => longestConsecutiveDayStreak(days)),
      );
      return { teamId, line, consecutiveDays };
    })
    .filter(({ teamId, line, consecutiveDays }) =>
      (line.outs >= BULLPEN_OVERWORK_MIN_OUTS || consecutiveDays >= BULLPEN_OVERWORK_MIN_CONSECUTIVE_DAYS)
      && !hasRecentMoment(
        context.teamMoments,
        teamId,
        'bullpen_overwork_warning',
        context.season,
        context.weekEndDay,
        BULLPEN_OVERWORK_THROTTLE_DAYS,
      )
    )
    .map(({ teamId, line, consecutiveDays }) => ({
      scope: 'team' as const,
      teamId,
      moment: createMoment(
        context.season,
        context.weekEndDay,
        'bullpen_overwork_warning',
        buildDescription(
          'bullpen_overwork_warning',
          {
            teamLabel: teamLabel(teamId),
            bullpenInnings: Number((line.outs / 3).toFixed(1)),
            consecutiveDays,
          },
          { teamId, season: context.season, weekStartDay },
        ),
      ),
    }));
}

function compareDetectedMoment(left: WeeklyDetectedMoment, right: WeeklyDetectedMoment): number {
  return (
    left.teamId.localeCompare(right.teamId)
    || (left.scope === 'player' ? 1 : 0) - (right.scope === 'player' ? 1 : 0)
    || (left.scope === 'player' && right.scope === 'player' ? left.playerId.localeCompare(right.playerId) : 0)
    || WEEKLY_MOMENT_ORDER[left.moment.type as WeeklyMomentTopicId] - WEEKLY_MOMENT_ORDER[right.moment.type as WeeklyMomentTopicId]
  );
}

export function detectWeeklyMoments(context: WeeklyMomentDetectionContext): WeeklyDetectedMoment[] {
  const weekStartDay = Math.max(1, context.weekEndDay - WEEKLY_MOMENT_WINDOW_DAYS + 1);
  return [
    ...detectTeamStreakMoments(context, weekStartDay),
    ...detectCloserMoments(context, weekStartDay),
    ...detectBenchClutchMoments(context, weekStartDay),
    ...detectBullpenOverworkMoments(context, weekStartDay),
  ].sort(compareDetectedMoment);
}
