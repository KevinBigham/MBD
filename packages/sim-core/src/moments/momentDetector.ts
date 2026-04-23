import type { AwardHistoryEntry } from '@mbd/contracts';
import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import type { GameBoxScore, PlayerGameStats } from '../sim/gameSimulator.js';

export const MOMENT_IMPACT_THRESHOLD = 60;
export const MOMENT_RELEVANCE_DECAY_RATE = 0.8;
export const MAX_MOMENTS_PER_PLAYER = 8;
export const PERMANENT_CLUTCH_WALK_OFF_COUNT = 3;

export const WALK_OFF_HR_IMPACT = 65;
export const NO_HITTER_IMPACT = 85;
export const PERFECT_GAME_IMPACT = 100;
export const FOUR_HR_GAME_IMPACT = 90;
export const PLAYOFF_ERROR_IMPACT = -80;
export const FIRST_CAREER_HR_IMPACT = 62;
export const FIRST_ALL_STAR_IMPACT = 45;
export const MILESTONE_500_HR_IMPACT = 95;
export const MILESTONE_3000_HIT_IMPACT = 95;
export const MILESTONE_300_WIN_IMPACT = 95;
export const BLOWN_WS_SAVE_IMPACT = -85;
export const CYCLE_IMPACT = 70;
export const TWENTY_K_GAME_IMPACT = 88;
export const BENCH_CLEARING_BRAWL_IMPACT = 40;
export const PLAYOFF_WALK_OFF_BONUS = 15;
export const WORLD_SERIES_CLINCHER_BONUS = 10;
export const PRESSURE_CLUTCH_BONUS = 10;
export const PRESSURE_SCARRED_PENALTY = 15;
export const NO_HITTER_ATTRIBUTE_BONUS = 5;

export const FOUR_HR_THRESHOLD = 4;
export const COMPLETE_GAME_OUTS = 27;
export const TWENTY_STRIKEOUT_THRESHOLD = 20;
export const MILESTONE_500_HR_THRESHOLD = 500;
export const MILESTONE_3000_HIT_THRESHOLD = 3000;
export const MILESTONE_300_WIN_THRESHOLD = 300;
export const WORLD_SERIES_CLUTCH_DURATION_SEASONS = 2;
export const SCARRED_DURATION_SEASONS = 1;
export const BENCH_CLEARING_BRAWL_INTENSITY_THRESHOLD = 70;
export const BENCH_CLEARING_BRAWL_HBP_THRESHOLD = 2;
export const BENCH_CLEARING_BRAWL_MIN_INNING = 7;
export const BENCH_CLEARING_BRAWL_MAX_SCORE_MARGIN = 2;

export type MomentType =
  | 'walk_off_hr'
  | 'no_hitter'
  | 'perfect_game'
  | 'four_hr_game'
  | 'playoff_error'
  | 'first_career_hr'
  | 'first_all_star'
  | 'milestone_500hr'
  | 'milestone_3000h'
  | 'milestone_300w'
  | 'blown_ws_save'
  | 'cycle'
  | 'twenty_k_game'
  | 'bench_clearing_brawl'
  | 'arbitration_win'
  | 'arbitration_loss'
  | 'super_two_debut'
  | 'holdout_resolution'
  | 'blockbuster_trade_moved'
  | 'blockbuster_trade_acquired'
  | 'deadline_seller'
  | 'deadline_buyer'
  | 'championship_run'
  | 'contention_collapse'
  | 'first_dynasty_peak'
  | 'three_peat'
  | 'losing_season_streak'
  | 'rebuild_begun'
  | 'breakout_season'
  | 'contention_window_opens'
  | 'era_ending_collapse'
  | 'fire_sale'
  | 'dynasty_end'
  | 'cursed_franchise'
  | 'veteran_core_retires'
  | 'playoff_gauntlet'
  | 'rivalry_renewed'
  | 'perennial_contender'
  | 'comeback_player'
  | 'rookie_sensation'
  | 'september_heroics'
  | 'redemption_arc'
  | 'late_career_peak'
  | 'rookie_breakout';

export type MomentRound = 'WC' | 'DS' | 'CS' | 'WS';

export interface Moment {
  season: number;
  type: MomentType;
  description: string;
  impact: number;
  relevance: number;
  isPlayoff: boolean;
  isEliminationGame: boolean;
  worldSeriesClincher: boolean;
  round: MomentRound | null;
}

export interface CareerTotalsBeforeGame {
  hr: number;
  hits: number;
  wins: number;
}

export interface MomentDetectionContext {
  currentSeason: number;
  existingMomentsByPlayer: ReadonlyMap<string, readonly Moment[]>;
  careerTotalsBeforeGameByPlayer: ReadonlyMap<string, CareerTotalsBeforeGame>;
  round: MomentRound | null;
  isPlayoff: boolean;
  isEliminationGame: boolean;
  worldSeriesClincher: boolean;
  decisiveErrorPlayerId: string | null;
  blownSavePitcherId: string | null;
  playerNameById?: ReadonlyMap<string, string>;
  awardHistory?: readonly AwardHistoryEntry[];
  rivalryIntensity?: number;
}

export interface DetectedMoment {
  playerId: string;
  moment: Moment;
}

export interface MomentHistoryUpdate {
  playerId: string;
  newMoments: Moment[];
  updatedMoments: Moment[];
}

export interface MomentEffectModifiers {
  pressureDelta: number;
  hitterAttributeDelta: number;
  pitcherAttributeDelta: number;
  activeTraits: string[];
  storyFlags: string[];
}

interface PendingMoment extends DetectedMoment {
  sequence: number;
}

export const MOMENT_TYPE_ORDER: readonly MomentType[] = [
  'walk_off_hr',
  'no_hitter',
  'perfect_game',
  'four_hr_game',
  'playoff_error',
  'first_career_hr',
  'first_all_star',
  'milestone_500hr',
  'milestone_3000h',
  'milestone_300w',
  'blown_ws_save',
  'cycle',
  'twenty_k_game',
  'bench_clearing_brawl',
  'arbitration_win',
  'arbitration_loss',
  'super_two_debut',
  'holdout_resolution',
  'blockbuster_trade_moved',
  'blockbuster_trade_acquired',
  'deadline_seller',
  'deadline_buyer',
  'championship_run',
  'contention_collapse',
  'first_dynasty_peak',
  'losing_season_streak',
  'rebuild_begun',
  'breakout_season',
  'contention_window_opens',
  'fire_sale',
  'dynasty_end',
  'cursed_franchise',
  'veteran_core_retires',
  'playoff_gauntlet',
  'rivalry_renewed',
  'comeback_player',
  'rookie_sensation',
  'september_heroics',
  'redemption_arc',
  'late_career_peak',
  'rookie_breakout',
  'three_peat',
  'era_ending_collapse',
  'perennial_contender',
];

export const MOMENT_DESCRIPTION_TEMPLATES: Record<MomentType, readonly string[]> = {
  walk_off_hr: [
    '{player} ended the night with one violent swing and a walk-off blast.',
    '{player} turned the final pitch into a walk-off home run and instant legend.',
    '{player} dropped the curtain with a walk-off homer that shook the park.',
  ],
  no_hitter: [
    '{player} finished a no-hitter and left the other lineup searching for answers.',
    '{player} silenced every bat in sight with a no-hit masterpiece.',
    '{player} authored a no-hitter and owned every inning of the game.',
  ],
  perfect_game: [
    '{player} carved a perfect game into the season ledger without a single mistake.',
    '{player} retired every hitter and completed a perfect game for the ages.',
    '{player} never let the door crack open, closing out a perfect game.',
  ],
  four_hr_game: [
    '{player} launched four home runs and turned a good night into a personal storm.',
    '{player} hit four balls out of the yard and wrecked the pitching plan by himself.',
    '{player} posted a four-homer game that will live in every replay package.',
  ],
  playoff_error: [
    '{player} wore the playoff error that slammed the season shut.',
    '{player} was left staring at the one playoff error nobody could undo.',
    '{player} became attached to the elimination error that ended October.',
  ],
  first_career_hr: [
    '{player} finally found the seats for a first career home run.',
    '{player} broke through with the first home run of the career arc.',
    '{player} got the first career homer out of the way and the dugout felt it.',
  ],
  first_all_star: [
    '{player} broke through with a first All-Star selection.',
    '{player} made the first All-Star team of the career climb.',
    '{player} turned steady production into a first trip to the All-Star stage.',
  ],
  milestone_500hr: [
    '{player} reached 500 home runs and moved into rare company.',
    '{player} crossed the 500-homer line and stamped the power legacy.',
    '{player} hammered career home run number 500 and the milestone landed hard.',
  ],
  milestone_3000h: [
    '{player} collected hit number 3000 and joined one of baseball’s small rooms.',
    '{player} reached 3000 hits and turned longevity into history.',
    '{player} arrived at 3000 hits, a milestone built on years of clean contact.',
  ],
  milestone_300w: [
    '{player} secured win number 300 and entered a shrinking class of workhorses.',
    '{player} reached 300 career wins and made the resume impossible to ignore.',
    '{player} grabbed the 300th win and pushed the career into historic air.',
  ],
  blown_ws_save: [
    '{player} let a World Series save slip away and the stage only made it louder.',
    '{player} carried the weight of a blown save on the World Series stage.',
    '{player} could not lock down the World Series save chance, and the miss lingered.',
  ],
  cycle: [
    '{player} completed the cycle and touched every corner of the box score.',
    '{player} finished a cycle and turned one game into a catalog of every hit.',
    '{player} landed the cycle and filled the stat line from single to homer.',
  ],
  twenty_k_game: [
    '{player} piled up 20 strikeouts and overwhelmed the entire lineup.',
    '{player} turned the mound into a strikeout factory with a 20-K game.',
    '{player} hit the 20-strikeout mark and dominated from first pitch to last.',
  ],
  bench_clearing_brawl: [
    '{player} was in the middle of a rivalry flashpoint when both benches emptied.',
    '{player} got dragged into a late-inning brawl as the rivalry spilled over.',
    '{player} stood in the middle of a bench-clearing scene that changed the temperature.',
  ],
  arbitration_win: [
    '{player} won the arbitration case.',
  ],
  arbitration_loss: [
    '{player} lost the arbitration case.',
  ],
  super_two_debut: [
    '{player} hit arbitration early as a Super Two.',
  ],
  holdout_resolution: [
    '{player} ended the holdout.',
  ],
  blockbuster_trade_moved: [
    '{player} was moved in a blockbuster trade.',
  ],
  blockbuster_trade_acquired: [
    '{player} arrived in a blockbuster return.',
  ],
  deadline_seller: [
    '{player} became the face of a deadline sell signal.',
  ],
  deadline_buyer: [
    '{player} became the face of a deadline buy signal.',
  ],
  championship_run: [
    '{player} hoisted the World Series trophy and stamped a championship season.',
  ],
  contention_collapse: [
    '{player} watched the playoffs from home after a winning season slipped away.',
  ],
  first_dynasty_peak: [
    '{player} helped turn back-to-back division titles into a franchise identity.',
  ],
  losing_season_streak: [
    '{player} was part of a club staring at a third straight losing season.',
  ],
  rebuild_begun: [
    '{player} now sits at the front edge of a franchise pivot toward a rebuild.',
  ],
  breakout_season: [
    '{player} helped drag the franchise back into the division-title conversation.',
  ],
  contention_window_opens: [
    '{player} helped crack open a fresh contention window after lean seasons.',
  ],
  fire_sale: [
    '{player} became part of a franchise fire sale before the deadline slammed shut.',
  ],
  dynasty_end: [
    '{player} saw a once-dominant division run finally crack apart.',
  ],
  cursed_franchise: [
    '{player} remained stuck in a franchise losing streak that reached another bleak milestone.',
  ],
  veteran_core_retires: [
    '{player} watched a franchise core age out together and leave a real void behind.',
  ],
  playoff_gauntlet: [
    '{player} survived a playoff hole and helped drag the club back out of it.',
  ],
  rivalry_renewed: [
    '{player} stepped into a rivalry that suddenly mattered all over again.',
  ],
  comeback_player: [
    '{player} turned a lost season into a full comeback.',
  ],
  rookie_sensation: [
    '{player} forced the rookie race into the spotlight.',
  ],
  september_heroics: [
    '{player} helped carry a September charge straight into October.',
  ],
  redemption_arc: [
    '{player} authored the kind of rebound season front offices wait around to see.',
  ],
  late_career_peak: [
    '{player} proved an older star can still land another peak season.',
  ],
  rookie_breakout: [
    '{player} closed a first MLB season with a real breakout stamp on it.',
  ],
  three_peat: [
    '{player} helped seal a third straight title and put a dynasty label on the run.',
  ],
  era_ending_collapse: [
    '{player} watched a recent playoff club drop into a losing season all at once.',
  ],
  perennial_contender: [
    '{player} helped keep a five-year playoff streak alive and turn contention into habit.',
  ],
};

export function compareMomentType(left: MomentType, right: MomentType): number {
  return MOMENT_TYPE_ORDER.indexOf(left) - MOMENT_TYPE_ORDER.indexOf(right);
}

function roundToThousandth(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function qualifiesForMoment(impact: number, isPlayoff: boolean): boolean {
  return Math.abs(impact) > MOMENT_IMPACT_THRESHOLD || isPlayoff;
}

function defaultCareerTotals(): CareerTotalsBeforeGame {
  return {
    hr: 0,
    hits: 0,
    wins: 0,
  };
}

function getCareerTotals(
  context: MomentDetectionContext,
  playerId: string,
): CareerTotalsBeforeGame {
  return context.careerTotalsBeforeGameByPlayer.get(playerId) ?? defaultCareerTotals();
}

function getOpponentHitsAllowed(
  gameResult: GameBoxScore,
  playerTeamId: string,
): number | null {
  if (playerTeamId === gameResult.homeTeamId) {
    return gameResult.awayHits;
  }
  if (playerTeamId === gameResult.awayTeamId) {
    return gameResult.homeHits;
  }
  return null;
}

function crossedThreshold(before: number, delta: number, threshold: number): boolean {
  return before < threshold && before + delta >= threshold;
}

function singleCount(stats: Pick<PlayerGameStats, 'hits' | 'doubles' | 'triples' | 'hr'>): number {
  return Math.max(0, stats.hits - stats.doubles - stats.triples - stats.hr);
}

function createMomentRecord(
  type: MomentType,
  impact: number,
  context: MomentDetectionContext,
): Moment {
  return {
    season: context.currentSeason,
    type,
    description: '',
    impact,
    relevance: Math.abs(impact),
    isPlayoff: context.isPlayoff,
    isEliminationGame: context.isEliminationGame,
    worldSeriesClincher: type === 'walk_off_hr' && context.worldSeriesClincher,
    round: context.round,
  };
}

function pickDescriptionTemplate(
  templates: readonly string[],
  rng: GameRNG,
): string {
  return templates[rng.nextInt(0, templates.length - 1)]!;
}

function ordinalInning(inning: number): string {
  const remainder10 = inning % 10;
  const remainder100 = inning % 100;
  if (remainder10 === 1 && remainder100 !== 11) {
    return `${inning}st`;
  }
  if (remainder10 === 2 && remainder100 !== 12) {
    return `${inning}nd`;
  }
  if (remainder10 === 3 && remainder100 !== 13) {
    return `${inning}rd`;
  }
  return `${inning}th`;
}

function assignDescriptions(
  pendingMoments: PendingMoment[],
  context: MomentDetectionContext,
  rng: GameRNG,
): void {
  const sorted = [...pendingMoments].sort((left, right) => (
    left.playerId.localeCompare(right.playerId)
    || compareMomentType(left.moment.type, right.moment.type)
  ));

  for (const pending of sorted) {
    if (pending.moment.description.length > 0) {
      continue;
    }
    const playerName = context.playerNameById?.get(pending.playerId) ?? pending.playerId;
    pending.moment.description = formatMomentDescription(pending.moment, playerName, rng.fork());
  }
}

function addPendingMoment(
  pendingMoments: PendingMoment[],
  playerId: string,
  moment: Moment,
): void {
  pendingMoments.push({
    playerId,
    moment,
    sequence: pendingMoments.length,
  });
}

function detectWalkOffHomeRun(
  gameResult: GameBoxScore,
  context: MomentDetectionContext,
  pendingMoments: PendingMoment[],
): void {
  for (const result of gameResult.paResults) {
    if (!result.isWalkOff || result.outcome !== 'HR') {
      continue;
    }

    let impact = WALK_OFF_HR_IMPACT;
    if (context.isPlayoff) {
      impact += PLAYOFF_WALK_OFF_BONUS;
    }
    if (context.worldSeriesClincher) {
      impact += WORLD_SERIES_CLINCHER_BONUS;
    }
    if (!qualifiesForMoment(impact, context.isPlayoff)) {
      continue;
    }

    addPendingMoment(
      pendingMoments,
      result.batterId,
      createMomentRecord('walk_off_hr', impact, context),
    );
  }
}

function detectContextMoments(
  context: MomentDetectionContext,
  pendingMoments: PendingMoment[],
): void {
  if (context.isPlayoff && context.isEliminationGame && context.decisiveErrorPlayerId != null) {
    addPendingMoment(
      pendingMoments,
      context.decisiveErrorPlayerId,
      createMomentRecord('playoff_error', PLAYOFF_ERROR_IMPACT, context),
    );
  }

  if (context.isPlayoff && context.round === 'WS' && context.blownSavePitcherId != null) {
    addPendingMoment(
      pendingMoments,
      context.blownSavePitcherId,
      createMomentRecord('blown_ws_save', BLOWN_WS_SAVE_IMPACT, context),
    );
  }
}

function playerAlreadyHasMomentType(
  context: MomentDetectionContext,
  playerId: string,
  type: MomentType,
): boolean {
  return (context.existingMomentsByPlayer.get(playerId) ?? []).some((moment) => moment.type === type);
}

function detectAwardMoments(
  context: MomentDetectionContext,
  pendingMoments: PendingMoment[],
): void {
  const seenPlayers = new Set<string>();
  const awardHistory = [...(context.awardHistory ?? [])].sort((left, right) => (
    left.playerId.localeCompare(right.playerId)
    || left.season - right.season
    || left.award.localeCompare(right.award)
  ));

  for (const award of awardHistory) {
    if (award.season !== context.currentSeason || award.award !== 'All-Star') {
      continue;
    }
    if (seenPlayers.has(award.playerId) || playerAlreadyHasMomentType(context, award.playerId, 'first_all_star')) {
      continue;
    }

    const priorAllStarSelection = awardHistory.some((candidate) => (
      candidate.playerId === award.playerId
      && candidate.award === 'All-Star'
      && candidate.season < context.currentSeason
    ));
    if (priorAllStarSelection) {
      continue;
    }

    seenPlayers.add(award.playerId);
    addPendingMoment(
      pendingMoments,
      award.playerId,
      createMomentRecord('first_all_star', FIRST_ALL_STAR_IMPACT, context),
    );
  }
}

function detectBenchClearingBrawl(
  gameResult: GameBoxScore,
  context: MomentDetectionContext,
  pendingMoments: PendingMoment[],
  rng: GameRNG,
): void {
  if ((context.rivalryIntensity ?? 0) < BENCH_CLEARING_BRAWL_INTENSITY_THRESHOLD) {
    return;
  }

  const hitByPitchResults = gameResult.paResults.filter((result) => result.outcome === 'HBP');
  if (hitByPitchResults.length < BENCH_CLEARING_BRAWL_HBP_THRESHOLD) {
    return;
  }

  const lateCloseResult = [...gameResult.paResults]
    .reverse()
    .find((result) => (
      result.inning >= BENCH_CLEARING_BRAWL_MIN_INNING
      && Math.abs(result.scoreBefore[0] - result.scoreBefore[1]) <= BENCH_CLEARING_BRAWL_MAX_SCORE_MARGIN
    ));
  if (!lateCloseResult) {
    return;
  }

  const probability = Math.min(0.18, 0.06 + (((context.rivalryIntensity ?? 0) - BENCH_CLEARING_BRAWL_INTENSITY_THRESHOLD) * 0.003));
  if (rng.nextFloat() >= probability) {
    return;
  }

  const instigator = hitByPitchResults[hitByPitchResults.length - 1]!;
  const moment = createMomentRecord('bench_clearing_brawl', BENCH_CLEARING_BRAWL_IMPACT, context);
  moment.description = `Benches empty in ${gameResult.homeTeamId.toUpperCase()}: the ${gameResult.awayTeamId.toUpperCase()}-${gameResult.homeTeamId.toUpperCase()} rivalry boils over in the ${ordinalInning(lateCloseResult.inning)}.`;
  addPendingMoment(pendingMoments, instigator.batterId, moment);
}

function detectStatMoments(
  gameResult: GameBoxScore,
  playerStats: ReadonlyMap<string, PlayerGameStats>,
  context: MomentDetectionContext,
  pendingMoments: PendingMoment[],
): void {
  const sortedEntries = [...playerStats.entries()].sort((left, right) => left[0].localeCompare(right[0]));

  for (const [playerId, stats] of sortedEntries) {
    const careerTotals = getCareerTotals(context, playerId);
    const opponentHits = getOpponentHitsAllowed(gameResult, stats.teamId);

    if (stats.hr >= FOUR_HR_THRESHOLD) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('four_hr_game', FOUR_HR_GAME_IMPACT, context),
      );
    }

    if (
      stats.hits >= 4
      && singleCount(stats) >= 1
      && stats.doubles >= 1
      && stats.triples >= 1
      && stats.hr >= 1
    ) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('cycle', CYCLE_IMPACT, context),
      );
    }

    if (stats.hr > 0 && crossedThreshold(careerTotals.hr, stats.hr, 1)) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('first_career_hr', FIRST_CAREER_HR_IMPACT, context),
      );
    }

    if (stats.hr > 0 && crossedThreshold(careerTotals.hr, stats.hr, MILESTONE_500_HR_THRESHOLD)) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('milestone_500hr', MILESTONE_500_HR_IMPACT, context),
      );
    }

    if (stats.hits > 0 && crossedThreshold(careerTotals.hits, stats.hits, MILESTONE_3000_HIT_THRESHOLD)) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('milestone_3000h', MILESTONE_3000_HIT_IMPACT, context),
      );
    }

    if (stats.wins > 0 && crossedThreshold(careerTotals.wins, stats.wins, MILESTONE_300_WIN_THRESHOLD)) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('milestone_300w', MILESTONE_300_WIN_IMPACT, context),
      );
    }

    if (
      opponentHits === 0
      && stats.ip >= COMPLETE_GAME_OUTS
      && stats.hitsAllowed === 0
      && stats.walks === 0
      && stats.hitBatters === 0
    ) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('perfect_game', PERFECT_GAME_IMPACT, context),
      );
    } else if (
      opponentHits === 0
      && stats.ip >= COMPLETE_GAME_OUTS
      && stats.hitsAllowed === 0
    ) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('no_hitter', NO_HITTER_IMPACT, context),
      );
    }

    if (stats.strikeouts >= TWENTY_STRIKEOUT_THRESHOLD) {
      addPendingMoment(
        pendingMoments,
        playerId,
        createMomentRecord('twenty_k_game', TWENTY_K_GAME_IMPACT, context),
      );
    }
  }
}

function updateMomentHistory(
  playerId: string,
  newMoments: readonly Moment[],
  context: MomentDetectionContext,
): MomentHistoryUpdate {
  const existingMoments = [...(context.existingMomentsByPlayer.get(playerId) ?? [])];
  const updatedMoments = [...existingMoments, ...newMoments].slice(-MAX_MOMENTS_PER_PLAYER);

  return {
    playerId,
    newMoments: [...newMoments],
    updatedMoments,
  };
}

export function detectMoment(
  gameResult: GameBoxScore,
  playerStats: ReadonlyMap<string, PlayerGameStats>,
  context: MomentDetectionContext,
  rng: GameRNG,
): MomentHistoryUpdate[] {
  const pendingMoments: PendingMoment[] = [];

  detectWalkOffHomeRun(gameResult, context, pendingMoments);
  detectStatMoments(gameResult, playerStats, context, pendingMoments);
  detectContextMoments(context, pendingMoments);
  detectAwardMoments(context, pendingMoments);
  detectBenchClearingBrawl(gameResult, context, pendingMoments, rng.fork());
  assignDescriptions(pendingMoments, context, rng);

  const momentsByPlayer = new Map<string, Moment[]>();
  for (const pending of pendingMoments.sort((left, right) => left.sequence - right.sequence)) {
    const playerMoments = momentsByPlayer.get(pending.playerId) ?? [];
    playerMoments.push({ ...pending.moment });
    momentsByPlayer.set(pending.playerId, playerMoments);
  }

  return [...momentsByPlayer.keys()]
    .sort((left, right) => left.localeCompare(right))
    .map((playerId) => updateMomentHistory(playerId, momentsByPlayer.get(playerId) ?? [], context));
}

export function applyMomentEffects(
  _player: Pick<GeneratedPlayer, 'position'>,
  moments: readonly Moment[],
  currentSeason: number,
): MomentEffectModifiers {
  const activeTraits = new Set<string>();
  const storyFlags = new Set<string>();

  const hasActiveNoHitter = moments.some((moment) => (
    moment.type === 'no_hitter'
    && moment.season === currentSeason
  ));
  const hasWorldSeriesClutchWindow = moments.some((moment) => (
    moment.type === 'walk_off_hr'
    && moment.worldSeriesClincher
    && currentSeason > moment.season
    && currentSeason <= moment.season + WORLD_SERIES_CLUTCH_DURATION_SEASONS
  ));
  const hasScarredWindow = moments.some((moment) => (
    moment.type === 'playoff_error'
    && moment.isEliminationGame
    && currentSeason === moment.season + SCARRED_DURATION_SEASONS
  ));
  const hasExpiredScarredMoment = moments.some((moment) => (
    moment.type === 'playoff_error'
    && moment.isEliminationGame
    && currentSeason > moment.season + SCARRED_DURATION_SEASONS
  ));
  const walkOffCount = moments.filter((moment) => moment.type === 'walk_off_hr').length;

  if (hasWorldSeriesClutchWindow || walkOffCount >= PERMANENT_CLUTCH_WALK_OFF_COUNT) {
    activeTraits.add('clutch');
  }
  if (hasExpiredScarredMoment) {
    storyFlags.add('redemption_arc');
  }

  return {
    pressureDelta: (hasWorldSeriesClutchWindow ? PRESSURE_CLUTCH_BONUS : 0) - (hasScarredWindow ? PRESSURE_SCARRED_PENALTY : 0),
    hitterAttributeDelta: hasActiveNoHitter ? NO_HITTER_ATTRIBUTE_BONUS : 0,
    pitcherAttributeDelta: hasActiveNoHitter ? NO_HITTER_ATTRIBUTE_BONUS : 0,
    activeTraits: [...activeTraits],
    storyFlags: [...storyFlags],
  };
}

export function decayMoments(moments: readonly Moment[]): Moment[] {
  return moments.map((moment) => ({
    ...moment,
    relevance: Math.min(
      roundToThousandth(moment.relevance * MOMENT_RELEVANCE_DECAY_RATE),
      moment.relevance,
    ),
  }));
}

export function formatMomentDescription(
  moment: Moment,
  playerName: string,
  rng: GameRNG,
): string {
  const templates = moment.type === 'walk_off_hr' && moment.worldSeriesClincher
    ? [
      '{player} delivered the World Series clincher with a walk-off swing nobody will forget.',
      '{player} ended the World Series on a walk-off homer and froze the moment in baseball history.',
      '{player} won the World Series on one walk-off blast and turned the night immortal.',
    ]
    : MOMENT_DESCRIPTION_TEMPLATES[moment.type];

  return pickDescriptionTemplate(templates, rng).replaceAll('{player}', playerName);
}
