import type { GameSnapshot } from '@mbd/contracts';
import { getTeamById } from '../league/teams.js';
import { getScenarioById, readScenarioRecord, type ScenarioDefinition } from './scenarioLibrary.js';

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return structuredClone(snapshot);
}

function fallbackGMCareer(snapshot: GameSnapshot): NonNullable<GameSnapshot['narrative']['gmCareer']> {
  return snapshot.narrative.gmCareer ?? {
    careerHistory: [],
    currentTeamId: snapshot.franchise.teamId,
    reputation: 50,
    overallRecord: { wins: 0, losses: 0 },
    championships: 0,
    hiredSeason: snapshot.season,
    firedSeasons: [],
    careerAchievements: [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

function teamDivisionLabel(teamId: string): string {
  return getTeamById(teamId)?.division.replace('_', ' ') ?? 'League';
}

export function applyScenarioOverrides(
  _rng: { nextInt(min: number, max: number): number },
  snapshot: GameSnapshot,
  scenario: ScenarioDefinition,
): GameSnapshot {
  const next = cloneSnapshot(snapshot);
  const gmCareer = fallbackGMCareer(next);

  if (scenario.startingTeamId) {
    const team = getTeamById(scenario.startingTeamId);
    next.userTeamId = scenario.startingTeamId;
    next.franchise = {
      ...next.franchise,
      teamId: scenario.startingTeamId,
      teamName: team ? `${team.city} ${team.name}` : scenario.startingTeamId.toUpperCase(),
      teamAbbreviation: team?.abbreviation ?? scenario.startingTeamId.toUpperCase(),
      teamDivision: teamDivisionLabel(scenario.startingTeamId),
    };
    next.narrative.gmCareer = {
      ...gmCareer,
      currentTeamId: scenario.startingTeamId,
    };
  }

  if (scenario.id === 'expansion') {
    next.userTeamId = 'por';
    next.franchise = {
      ...next.franchise,
      teamId: 'por',
      teamName: 'Portland Sasquatch',
      teamAbbreviation: 'POR',
      teamDivision: teamDivisionLabel('por'),
    };
    next.narrative.gmCareer = {
      ...gmCareer,
      currentTeamId: 'por',
    };
  }

  if (scenario.id === 'turnaround') {
    next.franchise = {
      ...next.franchise,
      playMode: 'career',
    };
    next.narrative.gmCareer = {
      ...gmCareer,
      careerHistory: [
        ...gmCareer.careerHistory,
        {
          teamId: snapshot.userTeamId,
          seasons: 0,
          record: { wins: 0, losses: 0 },
          championships: 0,
          hiredSeason: snapshot.season,
          firedSeason: snapshot.season,
          firedReason: 'Previous club moved on.',
          reputation: 48,
        },
      ],
      currentTeamId: 'por',
      reputation: 48,
    };
  }

  next.narrative.challengeState = {
    scenarioId: scenario.id,
    startSeason: next.season,
    maxSeasons: scenario.maxSeasons,
    progress: 0,
    completed: false,
    completedSeason: null,
    failed: false,
    summary: scenario.description,
  };

  return next;
}

export function evaluateScenarioProgress(
  snapshot: GameSnapshot,
  scenario: ScenarioDefinition,
): { met: boolean; progress: number; message: string } {
  const record = readScenarioRecord(snapshot);
  if (scenario.id === 'perfect_season') {
    const progress = Math.max(0, Math.min(1, record.wins / 116));
    return {
      met: record.wins >= 116,
      progress: record.wins >= 116 ? 1 : Number(progress.toFixed(2)),
      message: record.wins >= 116 ? 'Historic win pace secured.' : `${record.wins} wins toward 116.`,
    };
  }
  if (scenario.id === 'rebuild') {
    const progress = Math.max(0, Math.min(1, record.wins / 86));
    return {
      met: record.wins >= 86,
      progress: record.wins >= 86 ? 1 : Number(progress.toFixed(2)),
      message: record.wins >= 86 ? 'Playoff pace reached.' : `${record.wins} wins toward a playoff push.`,
    };
  }
  if (scenario.id === 'expansion') {
    const progress = Math.max(0, Math.min(1, record.wins / 84));
    return {
      met: record.wins >= 84,
      progress: record.wins >= 84 ? 1 : Number(progress.toFixed(2)),
      message: record.wins >= 84 ? 'Portland broke through.' : `${record.wins} wins toward relevance.`,
    };
  }

  return {
    met: false,
    progress: 0,
    message: scenario.description,
  };
}

export function completeScenario(
  snapshot: GameSnapshot,
  scenarioId: string,
  season: number,
): GameSnapshot {
  const scenario = getScenarioById(scenarioId);
  if (!scenario) {
    return snapshot;
  }

  const next = cloneSnapshot(snapshot);
  if (!next.narrative.challengeState) {
    next.narrative.challengeState = {
      scenarioId,
      startSeason: season,
      maxSeasons: scenario.maxSeasons,
      progress: 1,
      completed: true,
      completedSeason: season,
      failed: false,
      summary: `${scenario.name} complete.`,
    };
    return next;
  }

  next.narrative.challengeState = {
    ...next.narrative.challengeState,
    progress: 1,
    completed: true,
    completedSeason: season,
    failed: false,
    summary: `${scenario.name} complete.`,
  };
  return next;
}
