import type {
  CareerStatsLedger,
  FranchiseTimelineEntry,
  RecordBookEntry,
  RecordBookHolder,
  RecordWatchEntry,
  SeasonHistoryEntry,
} from '@mbd/contracts';

type RecordScope = 'franchise' | 'league';
type RecordCategory = 'team_single_season' | 'individual_single_season' | 'career' | 'streak';

interface RecordDescriptor {
  scope: RecordScope;
  category: RecordCategory;
  stat: string;
  label: string;
  qualifier?: string | null;
}

export interface LegacyRecordBookArgs {
  currentSeason: number;
  franchiseTeamId: string;
  franchiseTimeline: FranchiseTimelineEntry[];
  seasonHistory: SeasonHistoryEntry[];
  careerStats: CareerStatsLedger[];
}

export interface TeamStandingRecord {
  teamId: string;
  wins: number;
  losses: number;
  streak: number;
  playoffAppearances: number;
}

export interface PlayerSeasonRecord {
  playerId: string;
  playerName: string;
  teamId: string;
  position: string;
  isPitcher: boolean;
  gamesPlayed: number;
  pa: number;
  ab: number;
  hits: number;
  hr: number;
  rbi: number;
  wins: number;
  saves: number;
  strikeouts: number;
  ipOuts: number;
  earnedRuns: number;
  war: number;
}

export interface UpdateRecordBookArgs {
  currentSeason: number;
  franchiseTeamId: string;
  currentStandings: TeamStandingRecord[];
  playerSeasons: PlayerSeasonRecord[];
  careerStats: CareerStatsLedger[];
}

export interface BrokenRecord {
  entryId: string;
  previousValue: number | null;
  newValue: number;
}

export interface RecordWatchArgs {
  currentSeason: number;
  teamGamesPlayed: Map<string, number>;
  playerSeasons: PlayerSeasonRecord[];
}

const RECORD_DESCRIPTORS: RecordDescriptor[] = [
  { scope: 'franchise', category: 'team_single_season', stat: 'wins', label: 'Most Wins' },
  { scope: 'franchise', category: 'team_single_season', stat: 'losses', label: 'Most Losses' },
  { scope: 'franchise', category: 'team_single_season', stat: 'batting_average', label: 'Highest Team BA' },
  { scope: 'franchise', category: 'team_single_season', stat: 'era', label: 'Lowest Team ERA' },
  { scope: 'franchise', category: 'team_single_season', stat: 'hr', label: 'Most Home Runs' },
  { scope: 'franchise', category: 'team_single_season', stat: 'stolen_bases', label: 'Most Stolen Bases' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'hr', label: 'Most Home Runs' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'rbi', label: 'Most RBI' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'hits', label: 'Most Hits' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'batting_average', label: 'Highest Batting Average', qualifier: '500 PA' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'wins', label: 'Most Pitcher Wins' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'saves', label: 'Most Saves' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'era', label: 'Lowest ERA', qualifier: '150 IP' },
  { scope: 'franchise', category: 'individual_single_season', stat: 'strikeouts', label: 'Most Strikeouts' },
  { scope: 'franchise', category: 'career', stat: 'games_played', label: 'Most Games' },
  { scope: 'franchise', category: 'career', stat: 'hr', label: 'Most Career Home Runs' },
  { scope: 'franchise', category: 'career', stat: 'hits', label: 'Most Career Hits' },
  { scope: 'franchise', category: 'career', stat: 'wins', label: 'Most Career Wins' },
  { scope: 'franchise', category: 'career', stat: 'saves', label: 'Most Career Saves' },
  { scope: 'franchise', category: 'career', stat: 'war', label: 'Most Career WAR' },
  { scope: 'franchise', category: 'streak', stat: 'win_streak', label: 'Longest Win Streak' },
  { scope: 'franchise', category: 'streak', stat: 'loss_streak', label: 'Longest Losing Streak' },
  { scope: 'franchise', category: 'streak', stat: 'playoff_appearances', label: 'Most Consecutive Playoff Appearances' },
  { scope: 'league', category: 'team_single_season', stat: 'wins', label: 'Most Wins' },
  { scope: 'league', category: 'team_single_season', stat: 'losses', label: 'Most Losses' },
  { scope: 'league', category: 'individual_single_season', stat: 'hr', label: 'Most Home Runs' },
  { scope: 'league', category: 'individual_single_season', stat: 'batting_average', label: 'Highest Batting Average', qualifier: '500 PA' },
  { scope: 'league', category: 'individual_single_season', stat: 'era', label: 'Lowest ERA', qualifier: '150 IP' },
  { scope: 'league', category: 'career', stat: 'games_played', label: 'Most Games' },
  { scope: 'league', category: 'career', stat: 'hr', label: 'Most Career Home Runs' },
  { scope: 'league', category: 'career', stat: 'hits', label: 'Most Career Hits' },
  { scope: 'league', category: 'career', stat: 'wins', label: 'Most Career Wins' },
  { scope: 'league', category: 'career', stat: 'saves', label: 'Most Career Saves' },
  { scope: 'league', category: 'career', stat: 'war', label: 'Most Career WAR' },
];

function entryId(scope: RecordScope, franchiseTeamId: string, category: RecordCategory, stat: string): string {
  return `${scope}:${scope === 'franchise' ? `${franchiseTeamId}:` : ''}${category}:${stat}`;
}

function emptyRecordBook(franchiseTeamId: string, currentSeason: number): RecordBookEntry[] {
  return RECORD_DESCRIPTORS.map((descriptor) => ({
    id: entryId(descriptor.scope, franchiseTeamId, descriptor.category, descriptor.stat),
    scope: descriptor.scope,
    teamId: descriptor.scope === 'franchise' ? franchiseTeamId : null,
    category: descriptor.category,
    stat: descriptor.stat,
    label: descriptor.label,
    qualifier: descriptor.qualifier ?? null,
    holders: [],
    trackingFromSeason: currentSeason,
    note: null,
  }));
}

function winsFromRecord(record: string): { wins: number; losses: number } | null {
  const match = /^(\d+)-(\d+)$/.exec(record);
  if (!match) {
    return null;
  }
  return {
    wins: Number(match[1]),
    losses: Number(match[2]),
  };
}

function compareValues(stat: string, candidate: number, current: number): number {
  if (stat === 'era') {
    return current - candidate;
  }
  return candidate - current;
}

function formatValue(stat: string, value: number): string {
  if (stat === 'batting_average') {
    return value.toFixed(3).replace(/^0/, '');
  }
  if (stat === 'era' || stat === 'war') {
    return value.toFixed(1);
  }
  return String(Math.round(value));
}

function addOrReplaceHolder(entry: RecordBookEntry, holder: RecordBookHolder): boolean {
  if (entry.holders.length === 0) {
    entry.holders = [holder];
    entry.trackingFromSeason = null;
    return true;
  }

  const comparison = compareValues(entry.stat, holder.value, entry.holders[0]!.value);
  if (comparison > 0) {
    entry.holders = [holder];
    entry.trackingFromSeason = null;
    return true;
  }

  if (comparison === 0 && !entry.holders.some((existing) => existing.playerId === holder.playerId && existing.teamId === holder.teamId)) {
    entry.holders = [...entry.holders, holder];
    entry.trackingFromSeason = null;
  }

  return false;
}

function findEntry(recordBook: RecordBookEntry[], id: string): RecordBookEntry | undefined {
  return recordBook.find((entry) => entry.id === id);
}

function setHolder(recordBook: RecordBookEntry[], id: string, holder: RecordBookHolder): void {
  const entry = findEntry(recordBook, id);
  if (entry) {
    addOrReplaceHolder(entry, holder);
  }
}

function battingAverage(stats: Pick<PlayerSeasonRecord, 'hits' | 'ab'>): number {
  return stats.ab > 0 ? stats.hits / stats.ab : 0;
}

function era(stats: Pick<PlayerSeasonRecord, 'earnedRuns' | 'ipOuts'>): number {
  return stats.ipOuts > 0 ? (stats.earnedRuns / (stats.ipOuts / 3)) * 9 : 99;
}

function eligibleForBattingAverage(stats: Pick<PlayerSeasonRecord, 'pa'>): boolean {
  return stats.pa >= 500;
}

function eligibleForEra(stats: Pick<PlayerSeasonRecord, 'ipOuts'>): boolean {
  return stats.ipOuts >= 450;
}

function seasonHolderFromPlayer(stat: string, season: PlayerSeasonRecord, currentSeason: number): RecordBookHolder {
  let value = 0;
  if (stat === 'hr') value = season.hr;
  if (stat === 'rbi') value = season.rbi;
  if (stat === 'hits') value = season.hits;
  if (stat === 'batting_average') value = battingAverage(season);
  if (stat === 'wins') value = season.wins;
  if (stat === 'saves') value = season.saves;
  if (stat === 'era') value = era(season);
  if (stat === 'strikeouts') value = season.strikeouts;

  return {
    playerId: season.playerId,
    playerName: season.playerName,
    teamId: season.teamId,
    season: currentSeason,
    value,
    displayValue: formatValue(stat, value),
  };
}

function careerValue(stat: string, ledger: CareerStatsLedger): number {
  if (stat === 'games_played') return ledger.gamesPlayed ?? 0;
  if (stat === 'hr') return ledger.batting?.hr ?? 0;
  if (stat === 'hits') return ledger.batting?.hits ?? 0;
  if (stat === 'wins') return ledger.pitching?.wins ?? 0;
  if (stat === 'saves') return ledger.saves ?? 0;
  if (stat === 'war') return ledger.war ?? 0;
  return 0;
}

function projectedValue(stat: string, season: PlayerSeasonRecord, gamesPlayed: number): number {
  const divisor = Math.max(1, gamesPlayed);
  const factor = 162 / divisor;
  if (stat === 'hr') return Math.round(season.hr * factor);
  if (stat === 'rbi') return Math.round(season.rbi * factor);
  if (stat === 'hits') return Math.round(season.hits * factor);
  if (stat === 'wins') return Math.round(season.wins * factor);
  if (stat === 'saves') return Math.round(season.saves * factor);
  if (stat === 'strikeouts') return Math.round(season.strikeouts * factor);
  if (stat === 'batting_average') {
    return battingAverage({
      hits: season.hits * factor,
      ab: season.ab * factor,
    });
  }
  if (stat === 'era') {
    return era({
      earnedRuns: season.earnedRuns * factor,
      ipOuts: season.ipOuts * factor,
    });
  }
  return 0;
}

function projectedQualifierMet(stat: string, season: PlayerSeasonRecord, gamesPlayed: number): boolean {
  const factor = 162 / Math.max(1, gamesPlayed);
  if (stat === 'batting_average') {
    return season.pa * factor >= 500;
  }
  if (stat === 'era') {
    return season.ipOuts * factor >= 450;
  }
  return true;
}

function teamSeasonValue(
  stat: 'batting_average' | 'era' | 'hr',
  seasons: PlayerSeasonRecord[],
): number {
  if (stat === 'batting_average') {
    const hits = seasons.reduce((sum, season) => sum + season.hits, 0);
    const ab = seasons.reduce((sum, season) => sum + season.ab, 0);
    return ab > 0 ? hits / ab : 0;
  }

  if (stat === 'era') {
    const earnedRuns = seasons.reduce((sum, season) => sum + season.earnedRuns, 0);
    const ipOuts = seasons.reduce((sum, season) => sum + season.ipOuts, 0);
    return ipOuts > 0 ? (earnedRuns / (ipOuts / 3)) * 9 : 99;
  }

  return seasons.reduce((sum, season) => sum + season.hr, 0);
}

export function backfillLegacyRecordBook(args: LegacyRecordBookArgs): RecordBookEntry[] {
  const recordBook = emptyRecordBook(args.franchiseTeamId, args.currentSeason);

  const bestFranchiseSeason = args.franchiseTimeline.reduce<FranchiseTimelineEntry | null>((best, entry) => {
    if (entry.teamId !== args.franchiseTeamId) {
      return best;
    }
    if (!best || entry.winTotal > best.winTotal) {
      return entry;
    }
    return best;
  }, null);
  if (bestFranchiseSeason) {
    setHolder(recordBook, entryId('franchise', args.franchiseTeamId, 'team_single_season', 'wins'), {
      playerId: null,
      playerName: null,
      teamId: args.franchiseTeamId,
      season: bestFranchiseSeason.season,
      value: bestFranchiseSeason.winTotal,
      displayValue: String(bestFranchiseSeason.winTotal),
    });

    const parsed = winsFromRecord(bestFranchiseSeason.record);
    if (parsed) {
      setHolder(recordBook, entryId('franchise', args.franchiseTeamId, 'team_single_season', 'losses'), {
        playerId: null,
        playerName: null,
        teamId: args.franchiseTeamId,
        season: bestFranchiseSeason.season,
        value: parsed.losses,
        displayValue: String(parsed.losses),
      });
    }
  }

  for (const ledger of args.careerStats) {
    const franchiseEligible = ledger.teamIds.includes(args.franchiseTeamId);
    for (const stat of ['games_played', 'hr', 'hits', 'wins', 'saves', 'war'] as const) {
      const holder: RecordBookHolder = {
        playerId: ledger.playerId,
        playerName: ledger.playerName,
        teamId: franchiseEligible ? args.franchiseTeamId : null,
        season: null,
        value: careerValue(stat, ledger),
        displayValue: formatValue(stat, careerValue(stat, ledger)),
      };
      if (franchiseEligible) {
        setHolder(recordBook, entryId('franchise', args.franchiseTeamId, 'career', stat), holder);
      }
      setHolder(recordBook, entryId('league', args.franchiseTeamId, 'career', stat), holder);
    }
  }

  return recordBook;
}

export function updateRecordBook(
  existing: RecordBookEntry[],
  args: UpdateRecordBookArgs,
): { recordBook: RecordBookEntry[]; brokenRecords: BrokenRecord[] } {
  const recordBook = existing.map((entry) => ({
    ...entry,
    holders: [...entry.holders],
  }));
  const brokenRecords: BrokenRecord[] = [];

  const maybeUpdate = (id: string, holder: RecordBookHolder) => {
    const entry = findEntry(recordBook, id);
    if (!entry) return;
    const previous = entry.holders[0]?.value ?? null;
    const broken = addOrReplaceHolder(entry, holder);
    if (broken) {
      brokenRecords.push({
        entryId: id,
        previousValue: previous,
        newValue: holder.value,
      });
    }
  };

  for (const standing of args.currentStandings) {
    const franchise = standing.teamId === args.franchiseTeamId;
    const winHolder: RecordBookHolder = {
      playerId: null,
      playerName: null,
      teamId: standing.teamId,
      season: args.currentSeason,
      value: standing.wins,
      displayValue: String(standing.wins),
    };
    const lossHolder: RecordBookHolder = {
      ...winHolder,
      value: standing.losses,
      displayValue: String(standing.losses),
    };
    const winStreakHolder: RecordBookHolder = {
      ...winHolder,
      value: standing.streak > 0 ? standing.streak : 0,
      displayValue: String(Math.max(0, standing.streak)),
    };
    const lossStreakHolder: RecordBookHolder = {
      ...winHolder,
      value: standing.streak < 0 ? Math.abs(standing.streak) : 0,
      displayValue: String(Math.max(0, Math.abs(standing.streak))),
    };
    const playoffHolder: RecordBookHolder = {
      ...winHolder,
      value: standing.playoffAppearances,
      displayValue: String(standing.playoffAppearances),
    };

    maybeUpdate(entryId('league', args.franchiseTeamId, 'team_single_season', 'wins'), winHolder);
    maybeUpdate(entryId('league', args.franchiseTeamId, 'team_single_season', 'losses'), lossHolder);
    if (franchise) {
      maybeUpdate(entryId('franchise', args.franchiseTeamId, 'team_single_season', 'wins'), winHolder);
      maybeUpdate(entryId('franchise', args.franchiseTeamId, 'team_single_season', 'losses'), lossHolder);
      maybeUpdate(entryId('franchise', args.franchiseTeamId, 'streak', 'win_streak'), winStreakHolder);
      maybeUpdate(entryId('franchise', args.franchiseTeamId, 'streak', 'loss_streak'), lossStreakHolder);
      maybeUpdate(entryId('franchise', args.franchiseTeamId, 'streak', 'playoff_appearances'), playoffHolder);
    }
  }

  const playerSeasonsByTeam = args.playerSeasons.reduce<Map<string, PlayerSeasonRecord[]>>((map, season) => {
    const current = map.get(season.teamId) ?? [];
    current.push(season);
    map.set(season.teamId, current);
    return map;
  }, new Map());

  for (const [teamId, seasons] of playerSeasonsByTeam.entries()) {
    if (teamId !== args.franchiseTeamId) {
      continue;
    }

    for (const stat of ['batting_average', 'era', 'hr'] as const) {
      const value = teamSeasonValue(stat, seasons);
      maybeUpdate(entryId('franchise', args.franchiseTeamId, 'team_single_season', stat), {
        playerId: null,
        playerName: null,
        teamId,
        season: args.currentSeason,
        value,
        displayValue: formatValue(stat, value),
      });
    }
  }

  for (const season of args.playerSeasons) {
    const franchise = season.teamId === args.franchiseTeamId;
    const seasonStats = ['hr', 'rbi', 'hits', 'batting_average', 'wins', 'saves', 'era', 'strikeouts'] as const;
    for (const stat of seasonStats) {
      if (stat === 'batting_average' && !eligibleForBattingAverage(season)) continue;
      if (stat === 'era' && !eligibleForEra(season)) continue;
      if ((stat === 'wins' || stat === 'saves' || stat === 'era' || stat === 'strikeouts') && !season.isPitcher) continue;
      const holder = seasonHolderFromPlayer(stat, season, args.currentSeason);
      maybeUpdate(entryId('league', args.franchiseTeamId, 'individual_single_season', stat), holder);
      if (franchise) {
        maybeUpdate(entryId('franchise', args.franchiseTeamId, 'individual_single_season', stat), holder);
      }
    }
  }

  for (const ledger of args.careerStats) {
    const franchise = ledger.teamIds.includes(args.franchiseTeamId);
    for (const stat of ['games_played', 'hr', 'hits', 'wins', 'saves', 'war'] as const) {
      const value = careerValue(stat, ledger);
      const holder: RecordBookHolder = {
        playerId: ledger.playerId,
        playerName: ledger.playerName,
        teamId: franchise ? args.franchiseTeamId : null,
        season: null,
        value,
        displayValue: formatValue(stat, value),
      };
      maybeUpdate(entryId('league', args.franchiseTeamId, 'career', stat), holder);
      if (franchise) {
        maybeUpdate(entryId('franchise', args.franchiseTeamId, 'career', stat), holder);
      }
    }
  }

  return { recordBook, brokenRecords };
}

export function getRecordWatchList(recordBook: RecordBookEntry[], args: RecordWatchArgs): RecordWatchEntry[] {
  const watches: RecordWatchEntry[] = [];
  const watchableStats = ['hr', 'rbi', 'hits', 'batting_average', 'wins', 'saves', 'era', 'strikeouts'] as const;

  for (const season of args.playerSeasons) {
    const gamesPlayed = args.teamGamesPlayed.get(season.teamId) ?? season.gamesPlayed;
    for (const stat of watchableStats) {
      if ((stat === 'wins' || stat === 'saves' || stat === 'era' || stat === 'strikeouts') && !season.isPitcher) continue;
      if ((stat === 'batting_average' || stat === 'era') && !projectedQualifierMet(stat, season, gamesPlayed)) continue;
      const entry = recordBook.find((candidate) =>
        candidate.category === 'individual_single_season'
        && candidate.scope === 'franchise'
        && candidate.teamId === season.teamId
        && candidate.stat === stat,
      );
      if (!entry || entry.holders.length === 0) continue;
      const projected = projectedValue(stat, season, gamesPlayed);
      const holderValue = entry.holders[0]!.value;
      const ratio = stat === 'era'
        ? holderValue / Math.max(projected, 0.0001)
        : projected / Math.max(holderValue, 1);
      if (ratio < 0.85) continue;

      watches.push({
        id: `${args.currentSeason}:${season.playerId}:${entry.id}`,
        recordId: entry.id,
        playerId: season.playerId,
        playerName: season.playerName,
        teamId: season.teamId,
        recordLabel: entry.label,
        currentValue: seasonHolderFromPlayer(stat, season, args.currentSeason).value,
        projectedValue: projected,
        holderValue,
        progressRatio: Number(Math.min(2, Math.max(0, ratio)).toFixed(2)),
        summary: `${season.playerName} is on pace for ${formatValue(stat, projected)} ${stat === 'batting_average' ? 'AVG' : stat.toUpperCase()}. ${entry.scope === 'franchise' ? 'Franchise' : 'League'} record is ${entry.holders[0]!.displayValue}.`,
      });
    }
  }

  return watches.sort((left, right) => right.progressRatio - left.progressRatio || right.projectedValue - left.projectedValue);
}
