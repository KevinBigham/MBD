import type { GameSnapshot } from '@mbd/contracts';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  difficulty: 'rookie' | 'standard' | 'hard' | 'legendary';
  maxSeasons: number;
  requiresCareerMode: boolean;
  startingTeamId?: string;
}

export const SCENARIO_LIBRARY: ScenarioDefinition[] = [
  { id: 'underdog', name: 'The Underdog', description: 'Take a low-budget club to the title.', difficulty: 'hard', maxSeasons: 5, requiresCareerMode: false, startingTeamId: 'oak' },
  { id: 'rebuild', name: 'The Rebuild', description: 'Turn a 100-loss roster into a playoff team.', difficulty: 'standard', maxSeasons: 3, requiresCareerMode: false, startingTeamId: 'cws' },
  { id: 'dynasty', name: 'The Dynasty', description: 'Win three championships in five seasons.', difficulty: 'legendary', maxSeasons: 5, requiresCareerMode: false, startingTeamId: 'lad' },
  { id: 'moneyball', name: 'Moneyball', description: 'Win with a bottom-five payroll.', difficulty: 'hard', maxSeasons: 5, requiresCareerMode: false, startingTeamId: 'tb' },
  { id: 'prospect_whisperer', name: 'Prospect Whisperer', description: 'Grow homegrown stars into a core.', difficulty: 'standard', maxSeasons: 8, requiresCareerMode: false, startingTeamId: 'bal' },
  { id: 'trade_shark', name: 'Trade Shark', description: 'Build a champion through trades.', difficulty: 'hard', maxSeasons: 6, requiresCareerMode: false, startingTeamId: 'sea' },
  { id: 'veterans_last_stand', name: "Veteran's Last Stand", description: 'Squeeze one last October run from an aging roster.', difficulty: 'standard', maxSeasons: 3, requiresCareerMode: false, startingTeamId: 'stl' },
  { id: 'expansion', name: 'The Expansion', description: 'Guide Portland into playoff relevance.', difficulty: 'standard', maxSeasons: 4, requiresCareerMode: false, startingTeamId: 'por' },
  { id: 'turnaround', name: 'The Turnaround', description: 'Get fired, land the worst job, and win a title.', difficulty: 'hard', maxSeasons: 6, requiresCareerMode: true, startingTeamId: 'por' },
  { id: 'perfect_season', name: 'Perfect Season', description: 'Win 116 or more games.', difficulty: 'legendary', maxSeasons: 10, requiresCareerMode: false, startingTeamId: 'nyy' },
];

export function getScenarioById(id: string): ScenarioDefinition | null {
  return SCENARIO_LIBRARY.find((entry) => entry.id === id) ?? null;
}

export function readScenarioRecord(snapshot: GameSnapshot): { wins: number; losses: number } {
  const standings = snapshot.seasonState.standings as Array<{ teamId: string; wins: number; losses: number }> | Array<[string, { wins: number; losses: number }]>;
  for (const entry of standings) {
    if (Array.isArray(entry)) {
      if (entry[0] === snapshot.userTeamId) {
        return { wins: entry[1].wins, losses: entry[1].losses };
      }
      continue;
    }

    if (entry.teamId === snapshot.userTeamId) {
      return { wins: entry.wins, losses: entry.losses };
    }
  }

  return { wins: 0, losses: 0 };
}
