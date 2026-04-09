import { calculateOps } from '../stats/advanced.js';
import type { GeneratedPlayer } from '../player/generation.js';

export type NicknameId =
  | 'mr_3000'
  | 'the_franchise'
  | 'mr_october'
  | 'doctor_k'
  | 'the_wall'
  | 'iron_man'
  | 'the_flash'
  | 'the_closer'
  | 'the_professor'
  | 'the_natural'
  | 'old_reliable'
  | 'the_kid'
  | 'phoenix'
  | 'captain'
  | 'the_vulture'
  | 'boom_or_bust'
  | 'cardiac_kid'
  | 'crash'
  | 'snakebit'
  | 'the_ghost';

export interface NicknameTrigger {
  id: NicknameId;
  displayText: string;
  priority: number;
  summary: string;
}

export interface NicknameCareerBattingStats {
  hits: number;
  hr: number;
}

export interface NicknameCareerPitchingStats {
  wins: number;
  strikeouts: number;
  saves: number;
}

export interface NicknameCareerPlayoffBattingStats {
  pa: number;
  ab: number;
  hits: number;
  doubles: number;
  triples: number;
  hr: number;
  bb: number;
  hbp: number;
  sacFlies: number;
}

export interface NicknameCareerStats {
  debutAge: number;
  currentAge: number;
  currentOverall: number;
  peakOverall: number;
  potentialRating: number;
  leadership: number;
  careerWar: number;
  championships: number;
  yearsWithCurrentTeam: number;
  goldGloveAwards: number;
  captainSeasons: number;
  careerBatting: NicknameCareerBattingStats | null;
  careerPitching: NicknameCareerPitchingStats | null;
  careerPlayoffBatting: NicknameCareerPlayoffBattingStats | null;
}

export interface NicknameSeasonHistoryEntry {
  season: number;
  age: number;
  teamId: string;
  gamesPlayed: number;
  pa: number;
  hits: number;
  hr: number;
  battingWalks: number;
  battingStrikeouts: number;
  stolenBases: number;
  saves: number;
  blownSaves: number;
  wins: number;
  era: number;
  pitchingStrikeouts: number;
  injuryCount: number;
  overallStart: number;
  overallEnd: number;
  wasOnMlbRoster: boolean;
  ledLeagueInStolenBases: boolean;
}

export interface EarnedNickname {
  id: NicknameId;
  displayText: string;
  priority: number;
  triggerData: Record<string, string | number | boolean>;
}

export interface NicknameEvaluation {
  earnedNicknames: EarnedNickname[];
  primaryNickname: EarnedNickname | null;
  badgeNicknames: EarnedNickname[];
}

export const NICKNAME_TRIGGERS: NicknameTrigger[] = [
  { id: 'mr_3000', displayText: 'Mr. 3000', priority: 1, summary: 'Reached 3000 career hits.' },
  { id: 'the_franchise', displayText: 'The Franchise', priority: 2, summary: 'Ten-plus years, one team, 50-plus WAR.' },
  { id: 'mr_october', displayText: 'Mr. October', priority: 3, summary: 'Career playoff OPS above 1.000 with at least 50 PA.' },
  { id: 'doctor_k', displayText: 'Doctor K', priority: 4, summary: 'Recorded a 250-strikeout season.' },
  { id: 'the_wall', displayText: 'The Wall', priority: 5, summary: 'Won five Gold Gloves.' },
  { id: 'iron_man', displayText: 'Iron Man', priority: 6, summary: 'Played 155-plus games in five straight seasons.' },
  { id: 'the_flash', displayText: 'The Flash', priority: 7, summary: 'Led the league in steals three times in four years.' },
  { id: 'the_closer', displayText: 'The Closer', priority: 8, summary: 'Posted 40-plus saves in three straight years.' },
  { id: 'the_professor', displayText: 'The Professor', priority: 9, summary: 'Ran a BB-K ratio above 2.0 for three straight years.' },
  { id: 'the_natural', displayText: 'The Natural', priority: 10, summary: 'Had 80 potential and reached 75 overall by age 23.' },
  { id: 'old_reliable', displayText: 'Old Reliable', priority: 11, summary: 'Age 35-plus, 70-plus overall, and ten-plus years with one team.' },
  { id: 'the_kid', displayText: 'The Kid', priority: 12, summary: 'Debuted before 20 and is still younger than 24.' },
  { id: 'phoenix', displayText: 'Phoenix', priority: 13, summary: 'Dropped more than 15 overall and later recovered more than 10.' },
  { id: 'captain', displayText: 'Captain', priority: 14, summary: 'Served as captain for three-plus years with leadership above 80.' },
  { id: 'the_vulture', displayText: 'The Vulture', priority: 15, summary: 'Won 15-plus games with an ERA above 4.50.' },
  { id: 'boom_or_bust', displayText: 'Boom or Bust', priority: 16, summary: 'Hit more than 35 homers with more than 180 strikeouts.' },
  { id: 'cardiac_kid', displayText: 'Cardiac Kid', priority: 17, summary: 'Blew five-plus saves in a season.' },
  { id: 'crash', displayText: 'Crash', priority: 18, summary: 'Suffered three-plus injuries in one season.' },
  { id: 'snakebit', displayText: 'Snakebit', priority: 19, summary: 'Career WAR above 40 without a title.' },
  { id: 'the_ghost', displayText: 'The Ghost', priority: 20, summary: 'Stayed on an MLB roster but finished below 100 PA.' },
];

export const FLASH_WINDOW_SIZE = 4;
export const FLASH_REQUIRED_LEAGUE_LEADS = 3;
export const PROFESSOR_WINDOW_SIZE = 3;
export const PROFESSOR_RATIO_THRESHOLD = 2;
export const IRON_MAN_WINDOW_SIZE = 5;
export const IRON_MAN_GAMES_THRESHOLD = 155;
export const DOCTOR_K_STRIKEOUT_THRESHOLD = 250;
export const CARDIAC_KID_BLOWN_SAVE_THRESHOLD = 5;
export const MR_OCTOBER_PA_THRESHOLD = 50;
export const MR_OCTOBER_OPS_THRESHOLD = 1;
export const THE_KID_DEBUT_AGE_THRESHOLD = 20;
export const THE_KID_CURRENT_AGE_THRESHOLD = 24;
export const OLD_RELIABLE_AGE_THRESHOLD = 35;
export const OLD_RELIABLE_OVR_THRESHOLD = 70;
export const OLD_RELIABLE_YEARS_THRESHOLD = 10;
export const NATURAL_POTENTIAL_THRESHOLD = 80;
export const NATURAL_OVR_THRESHOLD = 75;
export const NATURAL_AGE_THRESHOLD = 23;
export const CRASH_INJURY_THRESHOLD = 3;
export const VULTURE_WIN_THRESHOLD = 15;
export const VULTURE_ERA_THRESHOLD = 4.5;
export const CAPTAIN_SEASONS_THRESHOLD = 3;
export const CAPTAIN_LEADERSHIP_THRESHOLD = 80;
export const GHOST_PA_THRESHOLD = 100;
export const MR_3000_HIT_THRESHOLD = 3000;
export const CLOSER_SAVE_THRESHOLD = 40;
export const CLOSER_WINDOW_SIZE = 3;
export const BOOM_OR_BUST_HR_THRESHOLD = 35;
export const BOOM_OR_BUST_STRIKEOUT_THRESHOLD = 180;
export const WALL_GOLD_GLOVE_THRESHOLD = 5;
export const PHOENIX_DROP_THRESHOLD = 15;
export const PHOENIX_RECOVERY_THRESHOLD = 10;
export const FRANCHISE_WAR_THRESHOLD = 50;
export const FRANCHISE_YEARS_THRESHOLD = 10;
export const SNAKEBIT_WAR_THRESHOLD = 40;

function getTrigger(id: NicknameId): NicknameTrigger {
  return NICKNAME_TRIGGERS.find((trigger) => trigger.id === id)!;
}

function createEarnedNickname(
  id: NicknameId,
  triggerData: Record<string, string | number | boolean>,
): EarnedNickname {
  const trigger = getTrigger(id);
  return {
    id,
    displayText: trigger.displayText,
    priority: trigger.priority,
    triggerData,
  };
}

function sortSeasonHistory(
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
): NicknameSeasonHistoryEntry[] {
  return [...seasonHistory].sort((left, right) => left.season - right.season);
}

function isConsecutiveWindow(
  window: readonly NicknameSeasonHistoryEntry[],
): boolean {
  for (let index = 1; index < window.length; index += 1) {
    if (window[index]!.season !== window[index - 1]!.season + 1) {
      return false;
    }
  }
  return true;
}

function ratioAboveThreshold(
  walks: number,
  strikeouts: number,
  threshold: number,
): boolean {
  return walks / Math.max(1, strikeouts) > threshold;
}

function distinctTeamCount(
  player: Pick<GeneratedPlayer, 'teamId'>,
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
): number {
  const teamIds = new Set(seasonHistory.map((entry) => entry.teamId));
  if (teamIds.size === 0) {
    teamIds.add(player.teamId);
  }
  return teamIds.size;
}

function earnTheFlash(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  for (let index = 0; index <= sortedHistory.length - FLASH_WINDOW_SIZE; index += 1) {
    const window = sortedHistory.slice(index, index + FLASH_WINDOW_SIZE);
    if (!isConsecutiveWindow(window)) {
      continue;
    }
    const leagueLeadCount = window.filter((entry) => entry.ledLeagueInStolenBases).length;
    if (leagueLeadCount >= FLASH_REQUIRED_LEAGUE_LEADS) {
      return createEarnedNickname('the_flash', {
        seasonsMatched: leagueLeadCount,
        windowStartSeason: window[0]!.season,
        windowEndSeason: window.at(-1)!.season,
      });
    }
  }
  return null;
}

function earnCardiacKid(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  const season = sortedHistory.find((entry) => entry.blownSaves >= CARDIAC_KID_BLOWN_SAVE_THRESHOLD);
  return season
    ? createEarnedNickname('cardiac_kid', { season: season.season, blownSaves: season.blownSaves })
    : null;
}

function earnMrOctober(
  careerStats: NicknameCareerStats,
): EarnedNickname | null {
  if (careerStats.careerPlayoffBatting == null || careerStats.careerPlayoffBatting.pa < MR_OCTOBER_PA_THRESHOLD) {
    return null;
  }

  const ops = calculateOps(careerStats.careerPlayoffBatting);
  return ops > MR_OCTOBER_OPS_THRESHOLD
    ? createEarnedNickname('mr_october', {
      pa: careerStats.careerPlayoffBatting.pa,
      ops: Number(ops.toFixed(3)),
    })
    : null;
}

function earnTheProfessor(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  for (let index = 0; index <= sortedHistory.length - PROFESSOR_WINDOW_SIZE; index += 1) {
    const window = sortedHistory.slice(index, index + PROFESSOR_WINDOW_SIZE);
    if (!isConsecutiveWindow(window)) {
      continue;
    }
    if (window.every((entry) => ratioAboveThreshold(entry.battingWalks, entry.battingStrikeouts, PROFESSOR_RATIO_THRESHOLD))) {
      return createEarnedNickname('the_professor', {
        windowStartSeason: window[0]!.season,
        windowEndSeason: window.at(-1)!.season,
      });
    }
  }
  return null;
}

function earnIronMan(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  for (let index = 0; index <= sortedHistory.length - IRON_MAN_WINDOW_SIZE; index += 1) {
    const window = sortedHistory.slice(index, index + IRON_MAN_WINDOW_SIZE);
    if (!isConsecutiveWindow(window)) {
      continue;
    }
    if (window.every((entry) => entry.gamesPlayed >= IRON_MAN_GAMES_THRESHOLD)) {
      return createEarnedNickname('iron_man', {
        windowStartSeason: window[0]!.season,
        windowEndSeason: window.at(-1)!.season,
      });
    }
  }
  return null;
}

function earnDoctorK(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  const season = sortedHistory.find((entry) => entry.pitchingStrikeouts >= DOCTOR_K_STRIKEOUT_THRESHOLD);
  return season
    ? createEarnedNickname('doctor_k', { season: season.season, strikeouts: season.pitchingStrikeouts })
    : null;
}

function earnTheKid(
  careerStats: NicknameCareerStats,
): EarnedNickname | null {
  return careerStats.debutAge < THE_KID_DEBUT_AGE_THRESHOLD && careerStats.currentAge < THE_KID_CURRENT_AGE_THRESHOLD
    ? createEarnedNickname('the_kid', {
      debutAge: careerStats.debutAge,
      currentAge: careerStats.currentAge,
    })
    : null;
}

function earnOldReliable(
  player: Pick<GeneratedPlayer, 'teamId'>,
  careerStats: NicknameCareerStats,
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  if (
    careerStats.currentAge < OLD_RELIABLE_AGE_THRESHOLD
    || careerStats.currentOverall <= OLD_RELIABLE_OVR_THRESHOLD
    || careerStats.yearsWithCurrentTeam < OLD_RELIABLE_YEARS_THRESHOLD
    || distinctTeamCount(player, seasonHistory) !== 1
  ) {
    return null;
  }

  return createEarnedNickname('old_reliable', {
    currentAge: careerStats.currentAge,
    currentOverall: careerStats.currentOverall,
    yearsWithCurrentTeam: careerStats.yearsWithCurrentTeam,
  });
}

function earnTheNatural(
  careerStats: NicknameCareerStats,
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  if (careerStats.potentialRating < NATURAL_POTENTIAL_THRESHOLD) {
    return null;
  }

  const season = sortedHistory.find((entry) => (
    entry.age <= NATURAL_AGE_THRESHOLD
    && Math.max(entry.overallStart, entry.overallEnd) >= NATURAL_OVR_THRESHOLD
  ));
  if (season != null) {
    return createEarnedNickname('the_natural', {
      season: season.season,
      age: season.age,
      reachedOverall: Math.max(season.overallStart, season.overallEnd),
    });
  }

  if (careerStats.currentAge <= NATURAL_AGE_THRESHOLD && careerStats.currentOverall >= NATURAL_OVR_THRESHOLD) {
    return createEarnedNickname('the_natural', {
      age: careerStats.currentAge,
      reachedOverall: careerStats.currentOverall,
    });
  }

  return null;
}

function earnCrash(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  const season = sortedHistory.find((entry) => entry.injuryCount >= CRASH_INJURY_THRESHOLD);
  return season
    ? createEarnedNickname('crash', { season: season.season, injuryCount: season.injuryCount })
    : null;
}

function earnTheVulture(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  const season = sortedHistory.find((entry) => (
    entry.wins >= VULTURE_WIN_THRESHOLD
    && entry.era > VULTURE_ERA_THRESHOLD
  ));
  return season
    ? createEarnedNickname('the_vulture', { season: season.season, wins: season.wins, era: season.era })
    : null;
}

function earnCaptain(
  careerStats: NicknameCareerStats,
): EarnedNickname | null {
  return careerStats.captainSeasons >= CAPTAIN_SEASONS_THRESHOLD && careerStats.leadership > CAPTAIN_LEADERSHIP_THRESHOLD
    ? createEarnedNickname('captain', {
      captainSeasons: careerStats.captainSeasons,
      leadership: careerStats.leadership,
    })
    : null;
}

function earnTheGhost(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  const season = sortedHistory.find((entry) => entry.wasOnMlbRoster && entry.pa < GHOST_PA_THRESHOLD);
  return season
    ? createEarnedNickname('the_ghost', { season: season.season, pa: season.pa })
    : null;
}

function earnMr3000(
  careerStats: NicknameCareerStats,
): EarnedNickname | null {
  return (careerStats.careerBatting?.hits ?? 0) >= MR_3000_HIT_THRESHOLD
    ? createEarnedNickname('mr_3000', { hits: careerStats.careerBatting!.hits })
    : null;
}

function earnTheCloser(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  for (let index = 0; index <= sortedHistory.length - CLOSER_WINDOW_SIZE; index += 1) {
    const window = sortedHistory.slice(index, index + CLOSER_WINDOW_SIZE);
    if (!isConsecutiveWindow(window)) {
      continue;
    }
    if (window.every((entry) => entry.saves >= CLOSER_SAVE_THRESHOLD)) {
      return createEarnedNickname('the_closer', {
        windowStartSeason: window[0]!.season,
        windowEndSeason: window.at(-1)!.season,
      });
    }
  }
  return null;
}

function earnBoomOrBust(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  const season = sortedHistory.find((entry) => (
    entry.hr > BOOM_OR_BUST_HR_THRESHOLD
    && entry.battingStrikeouts > BOOM_OR_BUST_STRIKEOUT_THRESHOLD
  ));
  return season
    ? createEarnedNickname('boom_or_bust', { season: season.season, hr: season.hr, strikeouts: season.battingStrikeouts })
    : null;
}

function earnTheWall(
  careerStats: NicknameCareerStats,
): EarnedNickname | null {
  return careerStats.goldGloveAwards >= WALL_GOLD_GLOVE_THRESHOLD
    ? createEarnedNickname('the_wall', { goldGloveAwards: careerStats.goldGloveAwards })
    : null;
}

function earnPhoenix(
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  let peak = Number.NEGATIVE_INFINITY;
  let trough: number | null = null;

  for (const season of sortedHistory) {
    const seasonHigh = Math.max(season.overallStart, season.overallEnd);
    const seasonLow = Math.min(season.overallStart, season.overallEnd);
    const priorTrough = trough;
    peak = Math.max(peak, seasonHigh);

    if (priorTrough != null && seasonHigh - priorTrough > PHOENIX_RECOVERY_THRESHOLD) {
      return createEarnedNickname('phoenix', {
        season: season.season,
        trough: priorTrough,
        reboundOverall: seasonHigh,
      });
    }

    if (peak - seasonLow > PHOENIX_DROP_THRESHOLD) {
      trough = trough == null ? seasonLow : Math.min(trough, seasonLow);
    }
  }

  return null;
}

function earnTheFranchise(
  player: Pick<GeneratedPlayer, 'teamId'>,
  careerStats: NicknameCareerStats,
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
): EarnedNickname | null {
  if (
    careerStats.yearsWithCurrentTeam < FRANCHISE_YEARS_THRESHOLD
    || careerStats.careerWar < FRANCHISE_WAR_THRESHOLD
    || distinctTeamCount(player, seasonHistory) !== 1
  ) {
    return null;
  }

  return createEarnedNickname('the_franchise', {
    yearsWithCurrentTeam: careerStats.yearsWithCurrentTeam,
    careerWar: careerStats.careerWar,
  });
}

function earnSnakebit(
  careerStats: NicknameCareerStats,
): EarnedNickname | null {
  return careerStats.careerWar > SNAKEBIT_WAR_THRESHOLD && careerStats.championships === 0
    ? createEarnedNickname('snakebit', {
      careerWar: careerStats.careerWar,
      championships: careerStats.championships,
    })
    : null;
}

export function getNicknameDisplayText(nickname: NicknameId): string {
  return getTrigger(nickname).displayText;
}

export function evaluateNicknames(
  player: Pick<GeneratedPlayer, 'teamId'>,
  careerStats: NicknameCareerStats,
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
): NicknameEvaluation {
  const sortedHistory = sortSeasonHistory(seasonHistory);
  const earnedNicknames = [
    earnMr3000(careerStats),
    earnTheFranchise(player, careerStats, sortedHistory),
    earnMrOctober(careerStats),
    earnDoctorK(sortedHistory),
    earnTheWall(careerStats),
    earnIronMan(sortedHistory),
    earnTheFlash(sortedHistory),
    earnTheCloser(sortedHistory),
    earnTheProfessor(sortedHistory),
    earnTheNatural(careerStats, sortedHistory),
    earnOldReliable(player, careerStats, sortedHistory),
    earnTheKid(careerStats),
    earnPhoenix(sortedHistory),
    earnCaptain(careerStats),
    earnTheVulture(sortedHistory),
    earnBoomOrBust(sortedHistory),
    earnCardiacKid(sortedHistory),
    earnCrash(sortedHistory),
    earnSnakebit(careerStats),
    earnTheGhost(sortedHistory),
  ]
    .filter((nickname): nickname is EarnedNickname => nickname != null)
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));

  return {
    earnedNicknames,
    primaryNickname: earnedNicknames[0] ?? null,
    badgeNicknames: earnedNicknames.slice(1, 4),
  };
}
