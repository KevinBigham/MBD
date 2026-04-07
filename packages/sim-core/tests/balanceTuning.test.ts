import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  calculateTeamPayroll,
  createFreeAgencyMarket,
  generatePlayer,
} from '../src/index.js';
import type { GeneratedPlayer, Position, RosterLevel } from '../src/index.js';

const BALANCE_SEEDS = [5_101, 5_102] as const;
const THIRTY_TWO_TEAM_PAYROLL_MIN = 3_800;
const THIRTY_TWO_TEAM_PAYROLL_MAX = 6_800;

const MLB_HITTER_POSITIONS: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'];
const MLB_PITCHER_POSITIONS: Position[] = ['SP', 'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'RP', 'RP', 'CL', 'RP', 'RP'];

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function createPlayer(
  rng: GameRNG,
  position: Position,
  teamId: string,
  rosterLevel: RosterLevel,
): GeneratedPlayer {
  return generatePlayer(rng, position, teamId, rosterLevel);
}

function generateOpeningDayLeague(seed: number) {
  const rng = new GameRNG(seed);
  return TEAMS.flatMap((team) => {
    const teamRng = rng.fork();
    return [
      ...MLB_HITTER_POSITIONS.map((position) => createPlayer(teamRng.fork(), position, team.id, 'MLB')),
      ...MLB_HITTER_POSITIONS.slice(0, 4).map((position) => createPlayer(teamRng.fork(), position, team.id, 'MLB')),
      ...MLB_PITCHER_POSITIONS.map((position) => createPlayer(teamRng.fork(), position, team.id, 'MLB')),
      ...Array.from({ length: 28 }, (_, index) =>
        createPlayer(teamRng.fork(), (index % 5 === 0 ? 'SP' : index % 2 === 0 ? 'CF' : 'SS') as Position, team.id, 'AAA'),
      ),
      ...Array.from({ length: 28 }, (_, index) =>
        createPlayer(teamRng.fork(), (index % 4 === 0 ? 'RP' : index % 3 === 0 ? '3B' : 'CF') as Position, team.id, 'AA'),
      ),
    ];
  });
}

function makeExpiredPlayer(seed: number, overrides: Partial<GeneratedPlayer>): GeneratedPlayer {
  const rng = new GameRNG(seed);
  const player = generatePlayer(rng, 'SS', 'nym', 'MLB');
  return {
    ...player,
    ...overrides,
    contract: {
      ...player.contract,
      ...(overrides.contract ?? {}),
      years: 0,
    },
  };
}

describe('balance tuning guards', () => {
  const leagues = BALANCE_SEEDS.map(generateOpeningDayLeague);

  it('keeps opening-day MLB payroll in a realistic 32-team band', () => {
    const payrollTotal = average(
      leagues.map((players) =>
        TEAMS.reduce((sum, team) => sum + calculateTeamPayroll(team.id, players).mlbPayroll, 0),
      ),
    );

    expect(payrollTotal).toBeGreaterThanOrEqual(THIRTY_TWO_TEAM_PAYROLL_MIN);
    expect(payrollTotal).toBeLessThanOrEqual(THIRTY_TWO_TEAM_PAYROLL_MAX);
  });

  it('keeps average MLB salary in a believable everyday-player band', () => {
    const averageSalary = average(
      leagues.map((players) => {
        const mlbPlayers = players.filter((player) => player.rosterStatus === 'MLB');
        return average(mlbPlayers.map((player) => player.contract.annualSalary));
      }),
    );

    expect(averageSalary).toBeGreaterThanOrEqual(2.5);
    expect(averageSalary).toBeLessThanOrEqual(8.5);
  });

  it('does not flood free agency with every expiring minor leaguer in the universe', () => {
    const market = createFreeAgencyMarket(1, leagues[0]!);
    expect(market.freeAgents.length).toBeLessThan(900);
  });

  it('keeps expiring MLB talent in the free-agent market while skipping fringe depth', () => {
    const mlbVeteran = makeExpiredPlayer(8_412, {
      age: 29,
      rosterStatus: 'MLB',
      overallRating: 410,
      hitterAttributes: {
        contact: 395,
        power: 410,
        eye: 360,
        speed: 220,
        defense: 255,
        durability: 345,
      },
    });
    const fringeMinor = makeExpiredPlayer(8_413, {
      age: 23,
      rosterStatus: 'AA',
      minorLeagueLevel: 'AA',
      overallRating: 170,
      contract: {
        years: 0,
        annualSalary: 0.5,
        totalValue: 0.5,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
      hitterAttributes: {
        contact: 150,
        power: 140,
        eye: 135,
        speed: 165,
        defense: 170,
        durability: 180,
      },
    });

    const market = createFreeAgencyMarket(1, [mlbVeteran, fringeMinor]);
    const freeAgentIds = new Set(market.freeAgents.map((entry) => entry.player.id));

    expect(freeAgentIds.has(mlbVeteran.id)).toBe(true);
    expect(freeAgentIds.has(fringeMinor.id)).toBe(false);
  });

  it('creates enough short-term MLB deals to seed future free-agent classes', () => {
    const shortDealShare = average(
      leagues.map((players) => {
        const mlbPlayers = players.filter((player) => player.rosterStatus === 'MLB');
        const shortDeals = mlbPlayers.filter((player) => player.contract.years <= 2).length;
        return shortDeals / Math.max(mlbPlayers.length, 1);
      }),
    );

    expect(shortDealShare).toBeGreaterThanOrEqual(0.25);
    expect(shortDealShare).toBeLessThanOrEqual(0.7);
  });
});
