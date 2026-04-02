/**
 * @module gameSimulator
 * Full 9-inning game simulation with extras, lineup cycling, and stat tracking.
 */

import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { resolvePlateAppearance } from './plateAppearance.js';
import type { PAOutcome, PAResult } from './plateAppearance.js';
import { advanceRunners, freshRunnerState } from './markov.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GameTeam {
  readonly teamId: string;
  readonly lineup: GeneratedPlayer[];     // 9 batters in order
  readonly pitcher: GeneratedPlayer;      // starting pitcher
  readonly bullpen: GeneratedPlayer[];    // available relievers
}

export interface GameBoxScore {
  readonly homeTeamId: string;
  readonly awayTeamId: string;
  readonly homeScore: number;
  readonly awayScore: number;
  readonly innings: number;
  readonly homeHits: number;
  readonly awayHits: number;
  readonly paResults: PAResult[];
  readonly date: string;
  readonly isPlayoff: boolean;
}

export interface PlayerGameStats {
  playerId: string;
  teamId: string;
  pa: number;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  k: number;
  runs: number;
  hbp: number;
  sacFlies: number;
  // Pitching
  ip: number;  // innings pitched (in thirds)
  earnedRuns: number;
  strikeouts: number;
  walks: number;
  hitsAllowed: number;
  homeRunsAllowed: number;
  hitBatters: number;
  flyBallsAllowed: number;
  wins: number;
  losses: number;
}

// ---------------------------------------------------------------------------
// Hit detection
// ---------------------------------------------------------------------------

const HIT_OUTCOMES: Set<PAOutcome> = new Set(['SINGLE', 'DOUBLE', 'TRIPLE', 'HR']);
const AT_BAT_OUTCOMES: Set<PAOutcome> = new Set([
  'SINGLE', 'DOUBLE', 'TRIPLE', 'HR', 'K', 'GB_OUT', 'FB_OUT', 'LD_OUT', 'DOUBLE_PLAY',
]);

// ---------------------------------------------------------------------------
// Game simulation
// ---------------------------------------------------------------------------

/**
 * Simulate a full baseball game between two teams.
 * Returns box score and per-player stats.
 */
export function simulateGame(
  rng: GameRNG,
  away: GameTeam,
  home: GameTeam,
  date: string,
  isPlayoff: boolean = false,
): { boxScore: GameBoxScore; playerStats: Map<string, PlayerGameStats> } {
  let homeScore = 0;
  let awayScore = 0;
  let homeHits = 0;
  let awayHits = 0;
  const paResults: PAResult[] = [];
  const playerStats = new Map<string, PlayerGameStats>();

  let awayBatterIdx = 0;
  let homeBatterIdx = 0;

  // Current pitchers (can be relieved)
  let awayPitcher = away.pitcher;
  let homePitcher = home.pitcher;
  let awayPitcherPA = 0;
  let homePitcherPA = 0;
  let awayBullpenIdx = 0;
  let homeBullpenIdx = 0;

  const getStats = (player: GeneratedPlayer, teamId: string): PlayerGameStats => {
    let stats = playerStats.get(player.id);
    if (!stats) {
      stats = {
        playerId: player.id, teamId,
        pa: 0, ab: 0, hits: 0, doubles: 0, triples: 0, hr: 0,
        rbi: 0, bb: 0, k: 0, runs: 0, hbp: 0, sacFlies: 0,
        ip: 0, earnedRuns: 0, strikeouts: 0, walks: 0, hitsAllowed: 0,
        homeRunsAllowed: 0, hitBatters: 0, flyBallsAllowed: 0,
        wins: 0, losses: 0,
      };
      playerStats.set(player.id, stats);
    }
    return stats;
  };

  const MIN_INNINGS = 9;
  let totalInnings = 0;

  for (let inning = 1; inning <= 30; inning++) { // 30 = max extras safety
    // Top of inning: away bats vs home pitcher
    const topResult = simulateHalfInning(
      rng,
      away.lineup, awayBatterIdx, homePitcher,
      away.teamId, home.teamId,
      getStats, paResults,
    );
    awayScore += topResult.runs;
    awayHits += topResult.hits;
    awayBatterIdx = topResult.nextBatterIdx;
    homePitcherPA += topResult.paCount;

    // Pitcher fatigue check
    if (homePitcherPA > 27 && homeBullpenIdx < home.bullpen.length) {
      homePitcher = home.bullpen[homeBullpenIdx]!;
      homeBullpenIdx++;
      homePitcherPA = 0;
    }

    // Bottom of inning: home bats vs away pitcher
    // Walk-off check: if it's the 9th+ and home is winning after top, game over
    const isLastHalf = inning >= MIN_INNINGS && homeScore > awayScore;
    if (isLastHalf) {
      totalInnings = inning;
      break;
    }

    const botResult = simulateHalfInning(
      rng,
      home.lineup, homeBatterIdx, awayPitcher,
      home.teamId, away.teamId,
      getStats, paResults,
    );
    homeScore += botResult.runs;
    homeHits += botResult.hits;
    homeBatterIdx = botResult.nextBatterIdx;
    awayPitcherPA += botResult.paCount;

    // Pitcher fatigue
    if (awayPitcherPA > 27 && awayBullpenIdx < away.bullpen.length) {
      awayPitcher = away.bullpen[awayBullpenIdx]!;
      awayBullpenIdx++;
      awayPitcherPA = 0;
    }

    totalInnings = inning;

    // Walk-off: home wins in bottom of inning (9th+)
    if (inning >= MIN_INNINGS && homeScore > awayScore) break;

    // End regulation or continue extras
    if (inning >= MIN_INNINGS && homeScore !== awayScore) break;
  }

  // Update pitcher IP
  updatePitcherStats(playerStats, homePitcher, away.pitcher, awayScore, homeScore);
  if (homeScore > awayScore) {
    getStats(homePitcher, home.teamId).wins++;
    getStats(awayPitcher, away.teamId).losses++;
  } else {
    getStats(awayPitcher, away.teamId).wins++;
    getStats(homePitcher, home.teamId).losses++;
  }

  return {
    boxScore: {
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      homeScore,
      awayScore,
      innings: totalInnings,
      homeHits,
      awayHits,
      paResults,
      date,
      isPlayoff,
    },
    playerStats,
  };
}

// ---------------------------------------------------------------------------
// Half-inning simulation
// ---------------------------------------------------------------------------

interface HalfInningResult {
  runs: number;
  hits: number;
  nextBatterIdx: number;
  paCount: number;
}

function simulateHalfInning(
  rng: GameRNG,
  lineup: GeneratedPlayer[],
  startBatterIdx: number,
  pitcher: GeneratedPlayer,
  battingTeamId: string,
  pitchingTeamId: string,
  getStats: (p: GeneratedPlayer, teamId: string) => PlayerGameStats,
  paResults: PAResult[],
): HalfInningResult {
  let runnerState = freshRunnerState();
  let runs = 0;
  let hits = 0;
  let batterIdx = startBatterIdx;
  let paCount = 0;

  while (runnerState.outs < 3) {
    const batter = lineup[batterIdx % lineup.length]!;

    const paResult = resolvePlateAppearance(
      rng,
      {
        batterAttrs: batter.hitterAttributes,
        pitcherAttrs: pitcher.pitcherAttributes ?? {
          stuff: 250, control: 250, stamina: 250, velocity: 250, movement: 250,
        },
      },
      batter.id,
      pitcher.id,
    );

    paResults.push(paResult);
    paCount++;

    // Advance runners
    const outsBefore = runnerState.outs;
    const markovResult = advanceRunners(runnerState, paResult.outcome);
    runs += markovResult.runsScored;
    runnerState = markovResult.newState;

    // Track stats
    const bStats = getStats(batter, battingTeamId);
    bStats.pa++;
    if (AT_BAT_OUTCOMES.has(paResult.outcome)) bStats.ab++;
    if (HIT_OUTCOMES.has(paResult.outcome)) {
      bStats.hits++;
      hits++;
    }
    if (paResult.outcome === 'DOUBLE') bStats.doubles++;
    if (paResult.outcome === 'TRIPLE') bStats.triples++;
    if (paResult.outcome === 'HR') bStats.hr++;
    if (paResult.outcome === 'BB') bStats.bb++;
    if (paResult.outcome === 'HBP') bStats.hbp++;
    if (paResult.outcome === 'K') bStats.k++;
    if (paResult.outcome === 'FB_OUT' && outsBefore < 2 && markovResult.runsScored > 0) {
      bStats.sacFlies++;
    }
    bStats.rbi += markovResult.runsScored;

    // Pitcher stats
    const pStats = getStats(pitcher, pitchingTeamId);
    if (HIT_OUTCOMES.has(paResult.outcome)) pStats.hitsAllowed++;
    if (paResult.outcome === 'HR') pStats.homeRunsAllowed++;
    if (paResult.outcome === 'K') pStats.strikeouts++;
    if (paResult.outcome === 'BB') pStats.walks++;
    if (paResult.outcome === 'HBP') pStats.hitBatters++;
    if (paResult.outcome === 'FB_OUT' || paResult.outcome === 'HR' || paResult.outcome === 'SAC_FLY') {
      pStats.flyBallsAllowed++;
    }
    pStats.ip += markovResult.inningOver ? 3 - outsBefore : runnerState.outs - outsBefore;
    pStats.earnedRuns += markovResult.runsScored;

    if (markovResult.inningOver) break;

    batterIdx = (batterIdx + 1) % lineup.length;
  }

  return { runs, hits, nextBatterIdx: (batterIdx + 1) % lineup.length, paCount };
}

function updatePitcherStats(
  _stats: Map<string, PlayerGameStats>,
  _homePitcher: GeneratedPlayer,
  _awayPitcher: GeneratedPlayer,
  _awayScore: number,
  _homeScore: number,
): void {
  // IP tracking is handled incrementally during half-innings
  // This is a placeholder for future win/loss/save attribution
}
