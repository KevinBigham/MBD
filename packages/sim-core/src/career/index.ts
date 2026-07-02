import type { GMCareer, GMCareerEntry, JobMarket, JobOpening } from '@mbd/contracts';
import type { GameRNG } from '../math/index.js';
import type { TeamDef } from '../league/index.js';

export interface CareerStandingsEntry {
  teamId: string;
  wins: number;
  losses: number;
}

const BIG_MARKET_TEAM_IDS = new Set([
  'nym',  // New York Tycoons
  'chi',  // Chicago Deep Dish
  'lax',  // Los Angeles Sunset Strip
  'hou',  // Houston Starliners
  'dal',  // Dallas Lone Stars
  'phi',  // Philadelphia Liberty Bells
  'bos',  // Boston Noreasters
  'sfb',  // San Francisco Sourdoughs
]);

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function hasChampionship(playoffResult: string): boolean {
  return /world series champion/i.test(playoffResult);
}

function createCareerEntry(
  teamId: string,
  hiredSeason: number,
  reputation: number,
): GMCareerEntry {
  return {
    teamId,
    seasons: 0,
    record: {
      wins: 0,
      losses: 0,
    },
    championships: 0,
    hiredSeason,
    firedSeason: null,
    firedReason: null,
    reputation,
  };
}

function findCurrentEntryIndex(career: GMCareer): number {
  for (let index = career.careerHistory.length - 1; index >= 0; index -= 1) {
    const entry = career.careerHistory[index];
    if (entry?.teamId === career.currentTeamId && entry.firedSeason == null) {
      return index;
    }
  }
  return -1;
}

function currentEntry(career: GMCareer): GMCareerEntry {
  const index = findCurrentEntryIndex(career);
  if (index >= 0) {
    return career.careerHistory[index]!;
  }
  return createCareerEntry(career.currentTeamId, career.hiredSeason, career.reputation);
}

function replaceCurrentEntry(career: GMCareer, nextEntry: GMCareerEntry): GMCareerEntry[] {
  const index = findCurrentEntryIndex(career);
  if (index < 0) {
    return [...career.careerHistory, nextEntry];
  }

  return career.careerHistory.map((entry, entryIndex) => (
    entryIndex === index ? nextEntry : entry
  ));
}

function teamMarketScore(team: TeamDef): number {
  if (BIG_MARKET_TEAM_IDS.has(team.id)) {
    return 18;
  }
  if (team.city === 'Los Angeles' || team.city === 'New York' || team.city === 'Chicago') {
    return 15;
  }
  if (team.city === 'Toronto' || team.city === 'Philadelphia' || team.city === 'Houston') {
    return 12;
  }
  return 8;
}

function ownerArchetypeForWins(wins: number): JobOpening['ownerArchetype'] {
  if (wins >= 86) {
    return 'win_now';
  }
  if (wins <= 71) {
    return 'patient_builder';
  }
  return 'penny_pincher';
}

function budgetLabel(team: TeamDef): string {
  if (BIG_MARKET_TEAM_IDS.has(team.id)) {
    return 'Premier budget';
  }
  if (team.city === 'Houston' || team.city === 'Seattle' || team.city === 'Toronto') {
    return 'Competitive budget';
  }
  return 'Lean budget';
}

function expectationsLabel(wins: number): string {
  if (wins >= 88) {
    return 'Win now';
  }
  if (wins >= 78) {
    return 'Push for October';
  }
  return 'Patient rebuild';
}

function difficultyLabel(wins: number, attractiveness: number): string {
  if (wins >= 88 || attractiveness >= 82) {
    return 'High pressure';
  }
  if (wins <= 70) {
    return 'Long rebuild';
  }
  return 'Balanced runway';
}

function achievementSummary(championships: number): string[] {
  if (championships <= 0) {
    return [];
  }
  return [`Won ${championships} championship${championships === 1 ? '' : 's'}.`];
}

export function initializeGMCareer(
  _rng: GameRNG,
  teamId: string,
  _gmName: string,
  hiredSeason: number,
): GMCareer {
  const reputation = 50;
  return {
    careerHistory: [createCareerEntry(teamId, hiredSeason, reputation)],
    currentTeamId: teamId,
    reputation,
    overallRecord: {
      wins: 0,
      losses: 0,
    },
    championships: 0,
    hiredSeason,
    firedSeasons: [],
    careerAchievements: [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

export function recordSeasonResult(
  career: GMCareer,
  season: number,
  wins: number,
  losses: number,
  playoffResult: string,
): GMCareer {
  const priorEntry = currentEntry(career);
  const championshipBonus = hasChampionship(playoffResult) ? 12 : playoffResult.toLowerCase().includes('playoff') ? 4 : 0;
  const recordBonus = Math.round((wins - losses) / 12);
  const reputation = clamp(career.reputation + recordBonus + championshipBonus, 0, 100);
  const nextEntry: GMCareerEntry = {
    ...priorEntry,
    seasons: priorEntry.seasons + 1,
    record: {
      wins: priorEntry.record.wins + wins,
      losses: priorEntry.record.losses + losses,
    },
    championships: priorEntry.championships + (hasChampionship(playoffResult) ? 1 : 0),
    reputation,
    firedSeason: null,
    firedReason: null,
  };
  const championships = career.championships + (hasChampionship(playoffResult) ? 1 : 0);

  return {
    ...career,
    reputation,
    overallRecord: {
      wins: career.overallRecord.wins + wins,
      losses: career.overallRecord.losses + losses,
    },
    championships,
    careerHistory: replaceCurrentEntry(career, nextEntry),
    careerAchievements: achievementSummary(championships),
    jobSearchActive: false,
    hiredSeason: priorEntry.hiredSeason || season,
  };
}

export function processGMFiring(
  career: GMCareer,
  firedReason: string,
  season: number,
): GMCareer {
  const priorEntry = currentEntry(career);
  const reputation = clamp(career.reputation - 8, 0, 100);
  const nextEntry: GMCareerEntry = {
    ...priorEntry,
    firedSeason: season,
    firedReason,
    reputation,
  };

  return {
    ...career,
    reputation,
    careerHistory: replaceCurrentEntry(career, nextEntry),
    firedSeasons: career.firedSeasons.includes(season)
      ? career.firedSeasons
      : [...career.firedSeasons, season],
    jobSearchActive: true,
    lastFiredReason: firedReason,
  };
}

export function applyForJob(
  career: GMCareer,
  teamId: string,
  hiredSeason: number,
): GMCareer {
  if (career.currentTeamId === teamId && !career.jobSearchActive) {
    return career;
  }

  return {
    ...career,
    currentTeamId: teamId,
    hiredSeason,
    careerHistory: [
      ...career.careerHistory,
      createCareerEntry(teamId, hiredSeason, career.reputation),
    ],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

export function getCareerLegacyScore(career: GMCareer): number {
  const totalGames = career.overallRecord.wins + career.overallRecord.losses;
  const winPct = totalGames > 0 ? career.overallRecord.wins / totalGames : 0.5;
  const longevityScore = career.careerHistory.reduce((sum, entry) => sum + entry.seasons, 0) * 4;
  return Math.round(
    (career.overallRecord.wins * 0.75)
      + (career.championships * 30)
      + (winPct * 100)
      + longevityScore
      + (career.reputation * 0.5),
  );
}

export function generateJobMarket(
  rng: GameRNG,
  career: GMCareer,
  teams: readonly TeamDef[],
  standings: CareerStandingsEntry[],
): JobMarket {
  const standingsByTeam = new Map<string, CareerStandingsEntry>();
  for (const standing of standings) {
    standingsByTeam.set(standing.teamId, standing);
  }

  const jobs = teams
    .filter((team) => team.id !== career.currentTeamId)
    .map((team) => {
      const record = standingsByTeam.get(team.id) ?? {
        teamId: team.id,
        wins: 81,
        losses: 81,
      };
      const marketScore = teamMarketScore(team);
      const pressureScore = clamp(84 - record.wins, -8, 20);
      const reputationFit = (career.reputation - 50) * 0.55;
      const randomness = rng.nextInt(-3, 3);
      const attractiveness = clamp(
        Math.round(46 + marketScore + pressureScore + reputationFit + randomness),
        20,
        99,
      );

      return {
        teamId: team.id,
        ownerArchetype: ownerArchetypeForWins(record.wins),
        budget: budgetLabel(team),
        expectations: expectationsLabel(record.wins),
        difficulty: difficultyLabel(record.wins, attractiveness),
        attractiveness,
      } satisfies JobOpening;
    })
    .sort((left, right) => right.attractiveness - left.attractiveness || left.teamId.localeCompare(right.teamId));

  const marketSize = career.reputation >= 75 ? 5 : career.reputation >= 45 ? 4 : 3;
  const applicationDeadlineSeason = career.firedSeasons[career.firedSeasons.length - 1] ?? null;

  return {
    availableJobs: jobs.slice(0, marketSize),
    applicationDeadlineSeason,
  };
}

export type {
  GMCareer,
  GMCareerEntry,
  JobMarket,
  JobOpening,
};
