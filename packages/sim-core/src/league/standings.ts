/**
 * @module standings
 * Track wins, losses, streaks, and division standings.
 */

import type { Division } from './teams.js';
import { TEAMS, DIVISIONS, getTeamsByDivision } from './teams.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamRecord {
  teamId: string;
  wins: number;
  losses: number;
  runsScored: number;
  runsAllowed: number;
  streak: number; // positive = win streak, negative = loss streak
  last10: [number, number]; // [wins, losses]
  divisionWins: number;
  divisionLosses: number;
}

export interface StandingsEntry {
  teamId: string;
  wins: number;
  losses: number;
  pct: number;
  gamesBack: number;
  runsScored: number;
  runsAllowed: number;
  runDifferential: number;
  streak: string;
  last10Wins: number;
  last10Losses: number;
}

function cloneRecord(record: TeamRecord): TeamRecord {
  return {
    ...record,
    last10: [...record.last10] as [number, number],
  };
}

function compareStandingsEntries(left: StandingsEntry, right: StandingsEntry): number {
  if (right.pct !== left.pct) return right.pct - left.pct;
  if (right.wins !== left.wins) return right.wins - left.wins;
  if (left.losses !== right.losses) return left.losses - right.losses;
  if (right.runDifferential !== left.runDifferential) return right.runDifferential - left.runDifferential;
  return left.teamId.localeCompare(right.teamId);
}

// ---------------------------------------------------------------------------
// Standings tracker
// ---------------------------------------------------------------------------

export class StandingsTracker {
  private records: Map<string, TeamRecord>;

  constructor(teamIds: string[]) {
    this.records = new Map();
    for (const id of teamIds) {
      this.records.set(id, {
        teamId: id,
        wins: 0,
        losses: 0,
        runsScored: 0,
        runsAllowed: 0,
        streak: 0,
        last10: [0, 0],
        divisionWins: 0,
        divisionLosses: 0,
      });
    }
  }

  /** Record a game result. */
  recordGame(
    winnerId: string,
    loserId: string,
    winnerRuns: number,
    loserRuns: number,
    isDivisionGame: boolean,
  ): void {
    const winner = this.records.get(winnerId);
    const loser = this.records.get(loserId);
    if (!winner || !loser) return;

    winner.wins++;
    winner.runsScored += winnerRuns;
    winner.runsAllowed += loserRuns;
    winner.streak = winner.streak > 0 ? winner.streak + 1 : 1;

    loser.losses++;
    loser.runsScored += loserRuns;
    loser.runsAllowed += winnerRuns;
    loser.streak = loser.streak < 0 ? loser.streak - 1 : -1;

    if (isDivisionGame) {
      winner.divisionWins++;
      loser.divisionLosses++;
    }

    // Update last10 (rolling window — simplified as season-level ratio)
    this.updateLast10(winner);
    this.updateLast10(loser);
  }

  private updateLast10(record: TeamRecord): void {
    const totalGames = record.wins + record.losses;
    if (totalGames <= 10) {
      record.last10 = [record.wins, record.losses];
    } else {
      // Approximate last 10 from win rate (full rolling window is tracked in full sim)
      const rate = record.wins / totalGames;
      record.last10 = [Math.round(rate * 10), Math.round((1 - rate) * 10)];
    }
  }

  /** Get standings for a division, sorted by win percentage. */
  getDivisionStandings(division: Division): StandingsEntry[] {
    const divTeams = getTeamsByDivision(division);
    const divTeamIds = new Set(divTeams.map(t => t.id));

    const entries: StandingsEntry[] = [];
    for (const teamId of divTeamIds) {
      const r = this.records.get(teamId);
      if (!r) continue;
      const totalGames = r.wins + r.losses;
      entries.push({
        teamId: r.teamId,
        wins: r.wins,
        losses: r.losses,
        pct: totalGames > 0 ? r.wins / totalGames : 0,
        gamesBack: 0, // computed after sort
        runsScored: r.runsScored,
        runsAllowed: r.runsAllowed,
        runDifferential: r.runsScored - r.runsAllowed,
        streak: r.streak > 0 ? `W${r.streak}` : r.streak < 0 ? `L${Math.abs(r.streak)}` : '-',
        last10Wins: r.last10[0],
        last10Losses: r.last10[1],
      });
    }

    // Sort by win pct descending
    entries.sort(compareStandingsEntries);

    // Compute games back from division leader
    if (entries.length > 0) {
      const leader = entries[0]!;
      for (const entry of entries) {
        entry.gamesBack = ((leader.wins - entry.wins) + (entry.losses - leader.losses)) / 2;
      }
    }

    return entries;
  }

  /** Get full league standings organized by division. */
  getFullStandings(): Record<Division, StandingsEntry[]> {
    const result: Record<string, StandingsEntry[]> = {};
    for (const div of DIVISIONS) {
      result[div] = this.getDivisionStandings(div);
    }
    return result as Record<Division, StandingsEntry[]>;
  }

  /** Get flat sorted standings for the entire league. */
  getLeagueStandings(): StandingsEntry[] {
    const all: StandingsEntry[] = [];
    for (const div of DIVISIONS) {
      all.push(...this.getDivisionStandings(div));
    }
    return all.sort(compareStandingsEntries);
  }

  /** Get a team's record. */
  getRecord(teamId: string): TeamRecord | undefined {
    return this.records.get(teamId);
  }

  /** Serialize for save state. */
  serialize(): TeamRecord[] {
    return Array.from(this.records.values(), cloneRecord);
  }

  /** Restore from save state. */
  static deserialize(records: TeamRecord[]): StandingsTracker {
    const tracker = new StandingsTracker([]);
    for (const r of records) {
      tracker.records.set(r.teamId, cloneRecord(r));
    }
    return tracker;
  }
}
