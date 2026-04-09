import { getTeamById } from '../league/teams.js';
import type { GameRNG } from '../math/prng.js';
import type { GeneratedPlayer } from '../player/generation.js';
import { analyzeLineupStrengths, identifyStarPlayers } from './rosterAssessment.js';
import { average, pickTemplate } from './shared.js';

export interface ScoutingBriefingContext {
  userTeamId: string;
  divisionRivalIds: string[];
  allTeamRosters: Map<string, GeneratedPlayer[]>;
}

export interface RivalReport {
  teamId: string;
  teamName: string;
  overallThreatLevel: 'elite' | 'dangerous' | 'competitive' | 'rebuilding';
  starPlayer: { name: string; position: string; rating: number } | null;
  keyStrength: string;
  exploitableWeakness: string;
  headToHeadOutlook: string;
}

export interface ThreatAssessment {
  teamId: string;
  teamName: string;
  projectedWins: number;
  threatLevel: 'favorite' | 'contender' | 'fringe' | 'rebuilder';
}

export interface ScoutingBriefing {
  divisionReports: RivalReport[];
  leagueThreats: ThreatAssessment[];
  scoutingFocusOptions: Array<{ id: string; label: string; description: string }>;
  intelNarrative: string;
}

const INTEL_OPENERS = [
  'The division picture is clear enough to define the first scouting priorities.',
  'The early league scan already shows where the real pressure points sit.',
  'The rival board points to a few clubs that deserve sustained advance work.',
] as const;

function fullTeamName(teamId: string): string {
  const team = getTeamById(teamId);
  return team == null ? teamId.toUpperCase() : `${team.city} ${team.name}`;
}

function averageMlbRating(players: GeneratedPlayer[]): number {
  return average(players.filter((player) => player.rosterStatus === 'MLB').map((player) => player.overallRating));
}

function overallThreatLevel(averageRating: number): RivalReport['overallThreatLevel'] {
  if (averageRating > 380) return 'elite';
  if (averageRating >= 340) return 'dangerous';
  if (averageRating >= 300) return 'competitive';
  return 'rebuilding';
}

function threatLevelFromWins(projectedWins: number): ThreatAssessment['threatLevel'] {
  if (projectedWins >= 92) return 'favorite';
  if (projectedWins >= 84) return 'contender';
  if (projectedWins >= 77) return 'fringe';
  return 'rebuilder';
}

function projectedWinsFromAverage(averageRating: number): number {
  return Math.round(76 + ((averageRating - 300) * 0.19));
}

export function scoutDivisionRival(
  rng: GameRNG,
  rivalPlayers: GeneratedPlayer[],
  rivalTeamId: string,
): RivalReport {
  const stars = identifyStarPlayers(rivalPlayers, 1);
  const lineup = analyzeLineupStrengths(rivalPlayers);
  const avgRating = averageMlbRating(rivalPlayers);
  const teamName = fullTeamName(rivalTeamId);
  const headToHeadLead = pickTemplate(rng, [
    `The first series with ${teamName} should reveal whether the roster gap is real or cosmetic.`,
    `${teamName} will stress every soft spot in the roster until the club proves it can answer back.`,
  ]);

  return {
    teamId: rivalTeamId,
    teamName,
    overallThreatLevel: overallThreatLevel(avgRating),
    starPlayer: stars[0] == null
      ? null
      : {
        name: stars[0].name,
        position: stars[0].position,
        rating: stars[0].overallRating,
      },
    keyStrength: lineup.topStrength,
    exploitableWeakness: lineup.biggestWeakness,
    headToHeadOutlook: headToHeadLead,
  };
}

export function identifyLeagueThreats(
  allTeams: Array<{ teamId: string; players: GeneratedPlayer[] }>,
  userTeamId: string,
): ThreatAssessment[] {
  return allTeams
    .filter((team) => team.teamId !== userTeamId)
    .map((team) => {
      const avgRating = averageMlbRating(team.players);
      const projectedWins = projectedWinsFromAverage(avgRating);

      return {
        teamId: team.teamId,
        teamName: fullTeamName(team.teamId),
        projectedWins,
        threatLevel: threatLevelFromWins(projectedWins),
      };
    })
    .sort((left, right) => {
      if (right.projectedWins !== left.projectedWins) {
        return right.projectedWins - left.projectedWins;
      }
      return left.teamId.localeCompare(right.teamId);
    });
}

export function generateScoutingBriefing(
  rng: GameRNG,
  context: ScoutingBriefingContext,
): ScoutingBriefing {
  const divisionReports = context.divisionRivalIds
    .map((teamId) => scoutDivisionRival(rng.fork(), context.allTeamRosters.get(teamId) ?? [], teamId));
  const leagueThreats = identifyLeagueThreats(
    [...context.allTeamRosters.entries()].map(([teamId, players]) => ({ teamId, players })),
    context.userTeamId,
  );
  const opener = pickTemplate(rng, INTEL_OPENERS);

  return {
    divisionReports,
    leagueThreats,
    scoutingFocusOptions: [
      {
        id: 'draft',
        label: 'Draft',
        description: 'Lean resources toward domestic amateur coverage and board confidence.',
      },
      {
        id: 'international',
        label: 'International',
        description: 'Push more bandwidth toward Latin America and Asia for long-range talent capture.',
      },
      {
        id: 'pro_scouting',
        label: 'Pro Scouting',
        description: 'Prioritize trade-target and free-agent intelligence for quicker roster movement.',
      },
    ],
    intelNarrative: `${opener} ${divisionReports[0]?.teamName ?? 'The division leader'} is the clearest internal benchmark, while ${leagueThreats[0]?.teamName ?? 'the field'} looks strongest at the league level.`,
  };
}
