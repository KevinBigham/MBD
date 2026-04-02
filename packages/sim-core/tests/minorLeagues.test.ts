import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  buildRosterState,
  buildWaiverPriority,
  claimOffWaivers,
  consumeOptionYear,
  createMinorLeagueState,
  accrueServiceTimeDay,
  getPromotionCandidates,
  getRosterComplianceIssues,
  placeOnWaivers,
  simulateAffiliateDay,
  generatePlayer,
} from '../src/index.js';
import type { GeneratedPlayer, RosterLevel } from '../src/index.js';

function makePlayer(
  seed: number,
  teamId: string,
  position: 'SS' | 'CF' | 'SP' | 'RP',
  level: RosterLevel,
  overrides: Partial<GeneratedPlayer> = {},
): GeneratedPlayer {
  const player = generatePlayer(new GameRNG(seed), position, teamId, level);
  return {
    ...player,
    ...overrides,
  };
}

function makeAffiliatePlayers(teamId: string, level: Extract<RosterLevel, 'AAA' | 'AA' | 'A_PLUS' | 'A' | 'ROOKIE'>): GeneratedPlayer[] {
  const players: GeneratedPlayer[] = [];
  for (let i = 0; i < 9; i += 1) {
    players.push(makePlayer(100 + i + teamId.length, teamId, i % 2 === 0 ? 'SS' : 'CF', level));
  }
  players.push(makePlayer(300 + teamId.length, teamId, 'SP', level));
  players.push(makePlayer(301 + teamId.length, teamId, 'SP', level));
  players.push(makePlayer(302 + teamId.length, teamId, 'RP', level));
  players.push(makePlayer(303 + teamId.length, teamId, 'RP', level));
  return players;
}

describe('minor league service time and options', () => {
  it('accrues service time only for players on the MLB roster', () => {
    const mlbPlayer = makePlayer(1, 'nyy', 'SS', 'MLB');
    const aaaPlayer = makePlayer(2, 'nyy', 'SS', 'AAA');
    const state = createMinorLeagueState(['nyy'], 1);

    const result = accrueServiceTimeDay([mlbPlayer, aaaPlayer], state);
    const updatedMLB = result.players.find((player) => player.id === mlbPlayer.id)!;
    const updatedAAA = result.players.find((player) => player.id === aaaPlayer.id)!;

    expect(updatedMLB.serviceTimeDays).toBe(1);
    expect(updatedAAA.serviceTimeDays).toBe(0);
    expect(result.state.serviceTimeLedger).toContainEqual([mlbPlayer.id, 1]);
  });

  it('consumes at most one option year per season and flags players after the third', () => {
    let player = makePlayer(3, 'nyy', 'SS', 'MLB');
    let state = createMinorLeagueState(['nyy'], 1);

    ({ player, state } = consumeOptionYear(player, state, 1));
    expect(player.optionYearsUsed).toBe(1);
    expect(player.isOutOfOptions).toBe(false);

    ({ player, state } = consumeOptionYear(player, state, 1));
    expect(player.optionYearsUsed).toBe(1);

    ({ player, state } = consumeOptionYear(player, state, 2));
    ({ player, state } = consumeOptionYear(player, state, 3));

    expect(player.optionYearsUsed).toBe(3);
    expect(player.isOutOfOptions).toBe(true);
    expect(state.optionUsage).toContainEqual([player.id, [1, 2, 3]]);
  });
});

describe('minor league waivers and roster compliance', () => {
  it('orders waiver priority from worst record to best record', () => {
    const priority = buildWaiverPriority([
      { teamId: 'lad', wins: 70, losses: 50 },
      { teamId: 'pit', wins: 45, losses: 75 },
      { teamId: 'nyy', wins: 60, losses: 60 },
      { teamId: 'bos', wins: 45, losses: 75 },
    ]);

    expect(priority).toEqual(['bos', 'pit', 'nyy', 'lad']);
  });

  it('places players on waivers and lets the highest-priority team claim them', () => {
    const player = makePlayer(4, 'nyy', 'SS', 'MLB', {
      contract: {
        years: 2,
        annualSalary: 7,
        noTradeClause: false,
        playerOption: false,
        teamOption: false,
      },
    });
    let state = createMinorLeagueState(['nyy', 'pit'], 1);
    state = placeOnWaivers(state, player, ['pit', 'nyy'], 1, 90);

    const result = claimOffWaivers([player], state, player.id, 'pit');
    const claimedPlayer = result.players.find((candidate) => candidate.id === player.id)!;

    expect(claimedPlayer.teamId).toBe('pit');
    expect(claimedPlayer.rosterStatus).toBe('AAA');
    expect(claimedPlayer.minorLeagueLevel).toBe('AAA');
    expect(result.state.waiverClaims[0]?.status).toBe('claimed');
    expect(result.state.waiverClaims[0]?.toTeamId).toBe('pit');
  });

  it('flags active-roster and 40-man compliance issues with September expansion support', () => {
    const mlbPlayers = Array.from({ length: 28 }, (_, index) =>
      makePlayer(10 + index, 'nyy', index < 14 ? 'SS' : 'SP', 'MLB'),
    );
    const aaaPlayers = Array.from({ length: 13 }, (_, index) =>
      makePlayer(100 + index, 'nyy', index % 2 === 0 ? 'CF' : 'RP', 'AAA'),
    );
    const allPlayers = [...mlbPlayers, ...aaaPlayers];
    const rosterState = buildRosterState('nyy', allPlayers);

    const regularSeasonIssues = getRosterComplianceIssues(allPlayers, rosterState, 120);
    const expandedRosterIssues = getRosterComplianceIssues(allPlayers, rosterState, 150);

    expect(regularSeasonIssues.some((issue) => issue.code === 'active_roster_over_limit')).toBe(true);
    expect(regularSeasonIssues.some((issue) => issue.code === 'forty_man_over_limit')).toBe(true);
    expect(expandedRosterIssues.some((issue) => issue.code === 'active_roster_over_limit')).toBe(false);
    expect(expandedRosterIssues.some((issue) => issue.code === 'forty_man_over_limit')).toBe(true);
  });
});

describe('minor league promotion engine', () => {
  it('recommends promotions for players who clear level-appropriate stat thresholds', () => {
    const player = makePlayer(200, 'nyy', 'SS', 'AA', {
      age: 21,
      overallRating: 335,
      minorLeagueLevel: 'AA',
    });
    const depth = makePlayer(201, 'nyy', 'CF', 'AA', {
      age: 24,
      overallRating: 275,
      minorLeagueLevel: 'AA',
    });
    const state = createMinorLeagueState(['nyy'], 1);
    const affiliateState = state.affiliateStates.find((entry) => entry.teamId === 'nyy' && entry.level === 'AA')!;
    affiliateState.playerStats = [
      [
        player.id,
        {
          playerId: player.id,
          games: 28,
          pa: 112,
          hits: 38,
          hr: 7,
          rbi: 24,
          bb: 15,
          k: 18,
          ipOuts: 0,
          earnedRuns: 0,
          strikeouts: 0,
          walks: 0,
          wins: 0,
          losses: 0,
        },
      ],
      [
        depth.id,
        {
          playerId: depth.id,
          games: 28,
          pa: 96,
          hits: 20,
          hr: 1,
          rbi: 9,
          bb: 4,
          k: 25,
          ipOuts: 0,
          earnedRuns: 0,
          strikeouts: 0,
          walks: 0,
          wins: 0,
          losses: 0,
        },
      ],
    ];

    const candidates = getPromotionCandidates([player, depth], state, 'nyy');

    expect(candidates[0]?.playerId).toBe(player.id);
    expect(candidates[0]?.targetLevel).toBe('AAA');
    expect(candidates[0]?.reason).toContain('production');
  });
});

describe('affiliate simulation', () => {
  it('simulates affiliate days deterministically and keeps only the last 30 days of box scores', () => {
    const teamIds = ['nyy', 'bos'];
    const players = [
      ...makeAffiliatePlayers('nyy', 'AAA'),
      ...makeAffiliatePlayers('bos', 'AAA'),
      ...makeAffiliatePlayers('nyy', 'AA'),
      ...makeAffiliatePlayers('bos', 'AA'),
      ...makeAffiliatePlayers('nyy', 'A_PLUS'),
      ...makeAffiliatePlayers('bos', 'A_PLUS'),
      ...makeAffiliatePlayers('nyy', 'A'),
      ...makeAffiliatePlayers('bos', 'A'),
      ...makeAffiliatePlayers('nyy', 'ROOKIE'),
      ...makeAffiliatePlayers('bos', 'ROOKIE'),
    ];

    let first = createMinorLeagueState(teamIds, 1);
    let second = createMinorLeagueState(teamIds, 1);
    const rngA = new GameRNG(55);
    const rngB = new GameRNG(55);

    for (let day = 1; day <= 40; day += 1) {
      first = simulateAffiliateDay(rngA.fork(), first, players, day, 1, teamIds);
      second = simulateAffiliateDay(rngB.fork(), second, players, day, 1, teamIds);
    }

    expect(first).toEqual(second);
    expect(first.affiliateBoxScores.length).toBeGreaterThan(0);
    expect(first.affiliateBoxScores.every((boxScore) => boxScore.day >= 10)).toBe(true);

    const aaaState = first.affiliateStates.find((entry) => entry.teamId === 'nyy' && entry.level === 'AAA')!;
    expect(aaaState.gamesPlayed).toBeGreaterThan(0);
    expect(aaaState.playerStats.length).toBeGreaterThan(0);
  });
});
