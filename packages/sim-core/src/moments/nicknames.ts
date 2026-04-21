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
  | 'the_ghost'
  | 'the_inferno'
  | 'on_a_heater'
  | 'torch_mode'
  | 'wildfire'
  | 'smoke_show'
  | 'red_hot'
  | 'barrelstorm'
  | 'the_oven'
  | 'deep_freeze'
  | 'the_yips'
  | 'snow_day'
  | 'slump_merchant'
  | 'warning_track'
  | 'the_icebox'
  | 'whiff_machine'
  | 'cold_spell'
  | 'big_boomer'
  | 'the_hammer'
  | 'thunderstick'
  | 'moonshot'
  | 'light_tower'
  | 'the_anvil'
  | 'launch_code'
  | 'big_fly_machine'
  | 'slapdash'
  | 'the_surgeon'
  | 'silk_bat'
  | 'needle_threader'
  | 'line_driver'
  | 'bat_control'
  | 'the_metronome'
  | 'table_setter'
  | 'cheetah'
  | 'the_blur'
  | 'jetstream'
  | 'green_light'
  | 'first_to_third'
  | 'dust_trail'
  | 'burner'
  | 'quicksilver';

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
  { id: 'the_inferno', displayText: 'The Inferno', priority: 21, summary: 'Caught the hottest stretch in the league.' },
  { id: 'on_a_heater', displayText: 'On a Heater', priority: 22, summary: 'Stayed scorching long enough to earn a heater nickname.' },
  { id: 'torch_mode', displayText: 'Torch Mode', priority: 23, summary: 'Ran through opponents in a blaze of production.' },
  { id: 'wildfire', displayText: 'Wildfire', priority: 24, summary: 'Turned a hot streak into full-on chaos.' },
  { id: 'smoke_show', displayText: 'Smoke Show', priority: 25, summary: 'Left nothing but smoke over a dominant run.' },
  { id: 'red_hot', displayText: 'Red Hot', priority: 26, summary: 'Stayed red hot through the recent run of play.' },
  { id: 'barrelstorm', displayText: 'Barrelstorm', priority: 27, summary: 'Lived on the barrel during a heater.' },
  { id: 'the_oven', displayText: 'The Oven', priority: 28, summary: 'Kept the lineup cooking during a hot run.' },
  { id: 'deep_freeze', displayText: 'Deep Freeze', priority: 29, summary: 'Fell into a deep freeze at the plate or on the mound.' },
  { id: 'the_yips', displayText: 'The Yips', priority: 30, summary: 'Looked rattled through a cold stretch.' },
  { id: 'snow_day', displayText: 'Snow Day', priority: 31, summary: 'Production disappeared under a snow-day slump.' },
  { id: 'slump_merchant', displayText: 'Slump Merchant', priority: 32, summary: 'Could not shake a lingering slump.' },
  { id: 'warning_track', displayText: 'Warning Track', priority: 33, summary: 'Kept flirting with contact that went nowhere.' },
  { id: 'the_icebox', displayText: 'The Icebox', priority: 34, summary: 'Turned ice cold over the recent run.' },
  { id: 'whiff_machine', displayText: 'Whiff Machine', priority: 35, summary: 'Racked up empty swings in a cold stretch.' },
  { id: 'cold_spell', displayText: 'Cold Spell', priority: 36, summary: 'The recent run was defined by a cold spell.' },
  { id: 'big_boomer', displayText: 'Big Boomer', priority: 37, summary: 'Profiled as a power-first masher.' },
  { id: 'the_hammer', displayText: 'The Hammer', priority: 38, summary: 'Brought hammer-level power to the lineup.' },
  { id: 'thunderstick', displayText: 'Thunderstick', priority: 39, summary: 'Carried thunder in the bat.' },
  { id: 'moonshot', displayText: 'Moonshot', priority: 40, summary: 'Lived on towering drives and big flies.' },
  { id: 'light_tower', displayText: 'Light Tower', priority: 41, summary: 'Had light-tower raw power.' },
  { id: 'the_anvil', displayText: 'The Anvil', priority: 42, summary: 'Every swing looked heavy enough to dent the game.' },
  { id: 'launch_code', displayText: 'Launch Code', priority: 43, summary: 'Produced launch-angle damage in bunches.' },
  { id: 'big_fly_machine', displayText: 'Big Fly Machine', priority: 44, summary: 'Turned power into a steady stream of damage.' },
  { id: 'slapdash', displayText: 'Slapdash', priority: 45, summary: 'Won with bat-to-ball precision and constant contact.' },
  { id: 'the_surgeon', displayText: 'The Surgeon', priority: 46, summary: 'Placed contact with surgical precision.' },
  { id: 'silk_bat', displayText: 'Silk Bat', priority: 47, summary: 'Had a smooth, precise contact profile.' },
  { id: 'needle_threader', displayText: 'Needle Threader', priority: 48, summary: 'Threaded line drives into every opening.' },
  { id: 'line_driver', displayText: 'Line Driver', priority: 49, summary: 'Lived on line-drive contact.' },
  { id: 'bat_control', displayText: 'Bat Control', priority: 50, summary: 'Had elite feel for the barrel.' },
  { id: 'the_metronome', displayText: 'The Metronome', priority: 51, summary: 'Delivered the same clean contact every night.' },
  { id: 'table_setter', displayText: 'Table Setter', priority: 52, summary: 'Set the table with relentless on-ball contact.' },
  { id: 'cheetah', displayText: 'Cheetah', priority: 53, summary: 'Played the game at top-end speed.' },
  { id: 'the_blur', displayText: 'The Blur', priority: 54, summary: 'Looked like a blur once the ball was in play.' },
  { id: 'jetstream', displayText: 'Jetstream', priority: 55, summary: 'Ran like the game had wind behind it.' },
  { id: 'green_light', displayText: 'Green Light', priority: 56, summary: 'Always had the green light to run.' },
  { id: 'first_to_third', displayText: 'First to Third', priority: 57, summary: 'Turned singles into pressure with speed.' },
  { id: 'dust_trail', displayText: 'Dust Trail', priority: 58, summary: 'Left a dust trail on the bases.' },
  { id: 'burner', displayText: 'Burner', priority: 59, summary: 'Brought game-warping speed every night.' },
  { id: 'quicksilver', displayText: 'Quicksilver', priority: 60, summary: 'Moved with quicksilver acceleration.' },
];

export const HOT_STREAK_NICKNAME_IDS = [
  'the_inferno',
  'on_a_heater',
  'torch_mode',
  'wildfire',
  'smoke_show',
  'red_hot',
  'barrelstorm',
  'the_oven',
] as const satisfies readonly NicknameId[];

export const COLD_STREAK_NICKNAME_IDS = [
  'deep_freeze',
  'the_yips',
  'snow_day',
  'slump_merchant',
  'warning_track',
  'the_icebox',
  'whiff_machine',
  'cold_spell',
] as const satisfies readonly NicknameId[];

export const POWER_STYLE_NICKNAME_IDS = [
  'big_boomer',
  'the_hammer',
  'thunderstick',
  'moonshot',
  'light_tower',
  'the_anvil',
  'launch_code',
  'big_fly_machine',
] as const satisfies readonly NicknameId[];

export const CONTACT_STYLE_NICKNAME_IDS = [
  'slapdash',
  'the_surgeon',
  'silk_bat',
  'needle_threader',
  'line_driver',
  'bat_control',
  'the_metronome',
  'table_setter',
] as const satisfies readonly NicknameId[];

export const SPEED_STYLE_NICKNAME_IDS = [
  'cheetah',
  'the_blur',
  'jetstream',
  'green_light',
  'first_to_third',
  'dust_trail',
  'burner',
  'quicksilver',
] as const satisfies readonly NicknameId[];

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
export const HOT_STREAK_HR_THRESHOLD = 35;
export const HOT_STREAK_HITS_THRESHOLD = 170;
export const HOT_STREAK_WALKS_THRESHOLD = 75;
export const HOT_STREAK_STRIKEOUT_LIMIT = 120;
export const HOT_STREAK_STOLEN_BASES_THRESHOLD = 45;
export const HOT_STREAK_PITCHING_STRIKEOUTS_THRESHOLD = 220;
export const HOT_STREAK_SAVES_THRESHOLD = 35;
export const HOT_STREAK_ERA_THRESHOLD = 3.25;
export const HOT_STREAK_OVERALL_DELTA_THRESHOLD = 4;
export const COLD_STREAK_HITS_THRESHOLD = 110;
export const COLD_STREAK_HR_THRESHOLD = 15;
export const COLD_STREAK_WALKS_THRESHOLD = 35;
export const COLD_STREAK_STRIKEOUT_THRESHOLD = 170;
export const COLD_STREAK_INJURY_THRESHOLD = 2;
export const COLD_STREAK_BLOWN_SAVE_THRESHOLD = 5;
export const COLD_STREAK_ERA_THRESHOLD = 5;
export const COLD_STREAK_OVERALL_DROP_THRESHOLD = 6;
export const STYLE_POWER_ATTRIBUTE_THRESHOLD = 340;
export const STYLE_POWER_HR_THRESHOLD = 30;
export const STYLE_POWER_CAREER_HR_THRESHOLD = 200;
export const STYLE_CONTACT_ATTRIBUTE_THRESHOLD = 340;
export const STYLE_CONTACT_HITS_THRESHOLD = 175;
export const STYLE_CONTACT_STRIKEOUT_LIMIT = 80;
export const STYLE_SPEED_ATTRIBUTE_THRESHOLD = 340;
export const STYLE_SPEED_SB_THRESHOLD = 35;

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

function latestSeason(
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
): NicknameSeasonHistoryEntry | null {
  return seasonHistory.at(-1) ?? null;
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function buildNicknameSelectionBase(
  player: Pick<GeneratedPlayer, 'id' | 'teamId'>,
  careerStats: NicknameCareerStats,
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
  selectionSeed?: string | number,
): string {
  if (selectionSeed != null) {
    return String(selectionSeed);
  }

  const recentSeason = latestSeason(seasonHistory);
  return [
    player.id,
    player.teamId,
    careerStats.currentAge,
    careerStats.currentOverall,
    careerStats.careerBatting?.hits ?? 0,
    careerStats.careerBatting?.hr ?? 0,
    careerStats.careerPitching?.strikeouts ?? 0,
    careerStats.careerPitching?.saves ?? 0,
    recentSeason?.season ?? 0,
  ].join('|');
}

function pickDeterministicNicknameId(
  options: readonly NicknameId[],
  selectionBase: string,
  category: string,
  fingerprint: string,
): NicknameId {
  const hash = stableHash(`${selectionBase}|${category}|${fingerprint}`);
  return options[hash % options.length]!;
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

function isHotRecentSeason(
  season: NicknameSeasonHistoryEntry,
): boolean {
  const hitterHeat = season.pa >= 450 && (
    season.hr >= HOT_STREAK_HR_THRESHOLD
    || season.hits >= HOT_STREAK_HITS_THRESHOLD
    || (
      season.battingWalks >= HOT_STREAK_WALKS_THRESHOLD
      && season.battingStrikeouts <= HOT_STREAK_STRIKEOUT_LIMIT
    )
    || season.stolenBases >= HOT_STREAK_STOLEN_BASES_THRESHOLD
  );
  const pitcherHeat = (
    season.pitchingStrikeouts >= HOT_STREAK_PITCHING_STRIKEOUTS_THRESHOLD
    || (
      season.saves >= HOT_STREAK_SAVES_THRESHOLD
      && season.blownSaves <= 2
    )
    || (
      season.wins >= 16
      && season.era > 0
      && season.era <= HOT_STREAK_ERA_THRESHOLD
    )
  );

  return hitterHeat || pitcherHeat || season.overallEnd - season.overallStart >= HOT_STREAK_OVERALL_DELTA_THRESHOLD;
}

function isColdRecentSeason(
  season: NicknameSeasonHistoryEntry,
): boolean {
  const hitterSlide = season.pa >= 250 && (
    (
      season.battingStrikeouts >= COLD_STREAK_STRIKEOUT_THRESHOLD
      && season.hr <= COLD_STREAK_HR_THRESHOLD
    )
    || (
      season.hits <= COLD_STREAK_HITS_THRESHOLD
      && season.battingWalks <= COLD_STREAK_WALKS_THRESHOLD
    )
  );
  const pitcherSlide = season.blownSaves >= COLD_STREAK_BLOWN_SAVE_THRESHOLD
    || (season.era >= COLD_STREAK_ERA_THRESHOLD && season.wins <= 10);

  return hitterSlide
    || pitcherSlide
    || season.injuryCount >= COLD_STREAK_INJURY_THRESHOLD
    || season.overallStart - season.overallEnd >= COLD_STREAK_OVERALL_DROP_THRESHOLD;
}

function earnMoodNickname(
  player: Pick<GeneratedPlayer, 'id' | 'teamId'>,
  careerStats: NicknameCareerStats,
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
  selectionSeed?: string | number,
): EarnedNickname | null {
  const recentSeason = latestSeason(sortedHistory);
  if (recentSeason == null) {
    return null;
  }

  const selectionBase = buildNicknameSelectionBase(player, careerStats, sortedHistory, selectionSeed);
  const fingerprint = [
    recentSeason.season,
    recentSeason.hr,
    recentSeason.hits,
    recentSeason.battingWalks,
    recentSeason.battingStrikeouts,
    recentSeason.stolenBases,
    recentSeason.saves,
    recentSeason.blownSaves,
    recentSeason.pitchingStrikeouts,
    recentSeason.injuryCount,
    recentSeason.overallStart,
    recentSeason.overallEnd,
  ].join('|');

  if (isHotRecentSeason(recentSeason)) {
    const id = pickDeterministicNicknameId(HOT_STREAK_NICKNAME_IDS, selectionBase, 'mood:hot', fingerprint);
    return createEarnedNickname(id, {
      category: 'mood',
      mood: 'hot',
      season: recentSeason.season,
      hr: recentSeason.hr,
      hits: recentSeason.hits,
      stolenBases: recentSeason.stolenBases,
      overallDelta: recentSeason.overallEnd - recentSeason.overallStart,
    });
  }

  if (isColdRecentSeason(recentSeason)) {
    const id = pickDeterministicNicknameId(COLD_STREAK_NICKNAME_IDS, selectionBase, 'mood:cold', fingerprint);
    return createEarnedNickname(id, {
      category: 'mood',
      mood: 'cold',
      season: recentSeason.season,
      strikeouts: recentSeason.battingStrikeouts,
      injuries: recentSeason.injuryCount,
      overallDelta: recentSeason.overallEnd - recentSeason.overallStart,
    });
  }

  return null;
}

type StyleCategory = 'power' | 'contact' | 'speed';

function determineStyleCategory(
  player: Pick<GeneratedPlayer, 'hitterAttributes'>,
  careerStats: NicknameCareerStats,
  recentSeason: NicknameSeasonHistoryEntry | null,
): StyleCategory | null {
  if (player.hitterAttributes == null || recentSeason == null) {
    return null;
  }

  const powerQualifies = (
    player.hitterAttributes.power >= STYLE_POWER_ATTRIBUTE_THRESHOLD
    || recentSeason.hr >= STYLE_POWER_HR_THRESHOLD
    || (careerStats.careerBatting?.hr ?? 0) >= STYLE_POWER_CAREER_HR_THRESHOLD
  );
  const contactQualifies = (
    player.hitterAttributes.contact >= STYLE_CONTACT_ATTRIBUTE_THRESHOLD
    || recentSeason.hits >= STYLE_CONTACT_HITS_THRESHOLD
    || (
      recentSeason.pa >= 500
      && recentSeason.battingStrikeouts <= STYLE_CONTACT_STRIKEOUT_LIMIT
    )
  );
  const speedQualifies = (
    player.hitterAttributes.speed >= STYLE_SPEED_ATTRIBUTE_THRESHOLD
    || recentSeason.stolenBases >= STYLE_SPEED_SB_THRESHOLD
    || recentSeason.ledLeagueInStolenBases
  );

  const scores = [
    {
      category: 'power' as const,
      qualifies: powerQualifies,
      score: player.hitterAttributes.power + (recentSeason.hr * 6) + Math.min(120, (careerStats.careerBatting?.hr ?? 0) / 2),
    },
    {
      category: 'contact' as const,
      qualifies: contactQualifies,
      score: player.hitterAttributes.contact + (recentSeason.hits * 2) + recentSeason.battingWalks - recentSeason.battingStrikeouts,
    },
    {
      category: 'speed' as const,
      qualifies: speedQualifies,
      score: player.hitterAttributes.speed + (recentSeason.stolenBases * 7) + (recentSeason.ledLeagueInStolenBases ? 50 : 0),
    },
  ] satisfies ReadonlyArray<{ category: StyleCategory; score: number; qualifies: boolean }>;
  const qualifyingScores = scores.filter((entry) => entry.qualifies);

  if (qualifyingScores.length === 0) {
    return null;
  }

  qualifyingScores.sort((left, right) => right.score - left.score || left.category.localeCompare(right.category));
  return qualifyingScores[0]!.category;
}

function earnStyleNickname(
  player: Pick<GeneratedPlayer, 'id' | 'teamId' | 'hitterAttributes'>,
  careerStats: NicknameCareerStats,
  sortedHistory: readonly NicknameSeasonHistoryEntry[],
  selectionSeed?: string | number,
): EarnedNickname | null {
  const recentSeason = latestSeason(sortedHistory);
  const category = determineStyleCategory(player, careerStats, recentSeason);
  if (recentSeason == null || category == null) {
    return null;
  }

  const selectionBase = buildNicknameSelectionBase(player, careerStats, sortedHistory, selectionSeed);
  const fingerprint = [
    category,
    recentSeason.season,
    recentSeason.hr,
    recentSeason.hits,
    recentSeason.stolenBases,
    recentSeason.battingWalks,
    recentSeason.battingStrikeouts,
    careerStats.careerBatting?.hr ?? 0,
    player.hitterAttributes?.power ?? 0,
    player.hitterAttributes?.contact ?? 0,
    player.hitterAttributes?.speed ?? 0,
  ].join('|');

  const options = category === 'power'
    ? POWER_STYLE_NICKNAME_IDS
    : category === 'contact'
      ? CONTACT_STYLE_NICKNAME_IDS
      : SPEED_STYLE_NICKNAME_IDS;
  const id = pickDeterministicNicknameId(options, selectionBase, `style:${category}`, fingerprint);

  return createEarnedNickname(id, {
    category: 'style',
    style: category,
    season: recentSeason.season,
    hr: recentSeason.hr,
    hits: recentSeason.hits,
    stolenBases: recentSeason.stolenBases,
    power: player.hitterAttributes?.power ?? 0,
    contact: player.hitterAttributes?.contact ?? 0,
    speed: player.hitterAttributes?.speed ?? 0,
  });
}

export function getNicknameDisplayText(nickname: NicknameId): string {
  return getTrigger(nickname).displayText;
}

export function evaluateNicknames(
  player: Pick<GeneratedPlayer, 'id' | 'teamId' | 'hitterAttributes'>,
  careerStats: NicknameCareerStats,
  seasonHistory: readonly NicknameSeasonHistoryEntry[],
  selectionSeed?: string | number,
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
    earnMoodNickname(player, careerStats, sortedHistory, selectionSeed),
    earnStyleNickname(player, careerStats, sortedHistory, selectionSeed),
  ]
    .filter((nickname): nickname is EarnedNickname => nickname != null)
    .sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id));

  return {
    earnedNicknames,
    primaryNickname: earnedNicknames[0] ?? null,
    badgeNicknames: earnedNicknames.slice(1, 4),
  };
}
