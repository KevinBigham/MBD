import { describe, expect, it } from 'vitest';
import * as simCore from '../src/index.js';
import type { GeneratedPlayer, PlayoffBracket } from '../src/index.js';

function makePlayer(
  seed: number,
  teamId: string,
  position: Parameters<typeof simCore.generatePlayer>[1] = 'SS',
): GeneratedPlayer {
  const rng = new simCore.GameRNG(seed);
  return simCore.generatePlayer(rng, position, teamId, 'MLB');
}

function withOverrides(
  player: GeneratedPlayer,
  overrides: Partial<GeneratedPlayer>,
): GeneratedPlayer {
  return {
    ...player,
    ...overrides,
    personality: {
      ...player.personality,
      ...(overrides.personality ?? {}),
    },
    contract: {
      ...player.contract,
      ...(overrides.contract ?? {}),
    },
    hitterAttributes: {
      ...player.hitterAttributes,
      ...(overrides.hitterAttributes ?? {}),
    },
    pitcherAttributes: overrides.pitcherAttributes === undefined
      ? player.pitcherAttributes
      : overrides.pitcherAttributes,
  };
}

describe('narrative consequences', () => {
  it('applies owner decision deltas with clamping and a replacement summary', () => {
    const applyOwnerDecisionDelta = (
      simCore as unknown as {
        applyOwnerDecisionDelta?: (
          owner: ReturnType<typeof simCore.createOwnerState>,
          delta: number,
          summary: string,
        ) => ReturnType<typeof simCore.createOwnerState>;
      }
    ).applyOwnerDecisionDelta;

    expect(typeof applyOwnerDecisionDelta).toBe('function');

    const owner = simCore.createOwnerState('nym', 210_000_000);
    const updated = applyOwnerDecisionDelta!(owner, 60, 'Ownership loved the move.');

    expect(updated.patience).toBe(100);
    expect(updated.confidence).toBe(100);
    expect(updated.summary).toBe('Ownership loved the move.');
    expect(updated.hotSeat).toBe(false);
  });

  it('builds trade consequences for an accepted user-team deal', () => {
    const buildTradeConsequenceBundle = (
      simCore as unknown as {
        buildTradeConsequenceBundle?: (context: unknown) => {
          newsItems: Array<{ category: string; body: string }>;
          briefingItems: Array<{ category: string; body: string }>;
          playerMoraleEvents: Array<{ playerId: string; event: { impact: number; summary: string } }>;
          ownerDecisionDelta: { delta: number; summary: string } | null;
          storyFlags: string[];
          seasonHistoryMoments: string[];
        };
      }
    ).buildTradeConsequenceBundle;

    expect(typeof buildTradeConsequenceBundle).toBe('function');

    const acquired = withOverrides(makePlayer(1, 'bos', 'CF'), {
      teamId: 'nym',
      firstName: 'Victor',
      lastName: 'Valez',
    });
    const tradedAway = withOverrides(makePlayer(2, 'nym', 'RF'), {
      teamId: 'bos',
      firstName: 'Martin',
      lastName: 'Cole',
    });
    const remaining = withOverrides(makePlayer(3, 'nym', 'SS'), {
      firstName: 'Luis',
      lastName: 'Ramos',
    });

    const bundle = buildTradeConsequenceBundle!({
      rng: new simCore.GameRNG(9),
      season: 3,
      day: 88,
      userTeamId: 'nym',
      partnerTeamId: 'bos',
      acquiredPlayers: [acquired],
      tradedAwayPlayers: [tradedAway],
      remainingUserPlayers: [remaining],
      userFairness: 44,
      payrollAfterTrade: 222,
      payrollTarget: 210,
    });

    expect(bundle.newsItems).toHaveLength(1);
    expect(bundle.newsItems[0]?.category).toBe('trade');
    expect(bundle.briefingItems).toHaveLength(1);
    expect(bundle.briefingItems[0]?.category).toBe('news');
    expect(bundle.playerMoraleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: acquired.id, event: expect.objectContaining({ impact: 6 }) }),
        expect.objectContaining({ playerId: tradedAway.id, event: expect.objectContaining({ impact: -10 }) }),
        expect.objectContaining({ playerId: remaining.id, event: expect.objectContaining({ impact: 4 }) }),
      ]),
    );
    expect(bundle.ownerDecisionDelta?.delta).toBe(4);
    expect(bundle.ownerDecisionDelta?.summary).toContain('trade');
  });

  it('builds signing consequences for a user-team free-agent deal', () => {
    const buildSigningConsequenceBundle = (
      simCore as unknown as {
        buildSigningConsequenceBundle?: (context: unknown) => {
          newsItems: Array<{ category: string }>;
          briefingItems: Array<{ category: string }>;
          playerMoraleEvents: Array<{ playerId: string; event: { impact: number } }>;
          ownerDecisionDelta: { delta: number; summary: string } | null;
        };
      }
    ).buildSigningConsequenceBundle;

    expect(typeof buildSigningConsequenceBundle).toBe('function');

    const signedPlayer = withOverrides(makePlayer(4, 'fa', 'SP'), {
      teamId: 'nym',
      firstName: 'Diego',
      lastName: 'Mendez',
    });
    const teammate = withOverrides(makePlayer(5, 'nym', '1B'), {
      firstName: 'Evan',
      lastName: 'Parker',
    });

    const bundle = buildSigningConsequenceBundle!({
      rng: new simCore.GameRNG(12),
      season: 4,
      day: 12,
      userTeamId: 'nym',
      player: signedPlayer,
      annualSalary: 18,
      years: 4,
      marketValue: 18,
      payrollAfterSigning: 205,
      payrollTarget: 210,
      remainingUserPlayers: [teammate],
      decisionExplanation: 'At age 33, the $18.00M AAV and recent playoff standing led the decision.',
    });

    expect(bundle.newsItems).toHaveLength(1);
    expect(bundle.newsItems[0]?.category).toBe('signing');
    expect(bundle.briefingItems).toHaveLength(1);
    expect(bundle.newsItems[0]?.body).toContain('Decision: At age 33');
    expect(bundle.briefingItems[0]?.body).toContain('Decision: At age 33');
    expect(bundle.playerMoraleEvents[0]?.event.summary).toContain('joined the major-league roster');
    expect(bundle.playerMoraleEvents[0]?.event.summary).not.toContain('clear role');
    expect(bundle.playerMoraleEvents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: signedPlayer.id, event: expect.objectContaining({ impact: 10 }) }),
        expect.objectContaining({ playerId: teammate.id, event: expect.objectContaining({ impact: 3 }) }),
      ]),
    );
    expect(bundle.ownerDecisionDelta?.delta).toBe(8);
  });

  it('builds postseason consequences from the completed playoff bracket', () => {
    const buildPostseasonConsequenceBundle = (
      simCore as unknown as {
        buildPostseasonConsequenceBundle?: (context: unknown) => {
          newsItems: Array<{ category: string }>;
          briefingItems: Array<{ category: string }>;
          playerMoraleEvents: Array<{ playerId: string; event: { impact: number } }>;
          ownerDecisionDelta: { delta: number; summary: string } | null;
          seasonHistoryMoments: string[];
        };
      }
    ).buildPostseasonConsequenceBundle;

    expect(typeof buildPostseasonConsequenceBundle).toBe('function');

    const roster = [
      withOverrides(makePlayer(6, 'nym', 'SS'), { firstName: 'Alex', lastName: 'Stone' }),
      withOverrides(makePlayer(7, 'nym', 'CF'), { firstName: 'Jalen', lastName: 'Frost' }),
    ];
    const bracket: PlayoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 101, losses: 61 },
        { teamId: 'bos', seed: 2, wins: 96, losses: 66 },
      ],
      series: [
        { winnerId: 'nym', loserId: 'bos', winnerWins: 4, loserWins: 2, games: [], round: 'WORLD_SERIES' },
      ],
      champion: 'nym',
    };

    const bundle = buildPostseasonConsequenceBundle!({
      rng: new simCore.GameRNG(22),
      season: 5,
      userTeamId: 'nym',
      playoffBracket: bracket,
      userOutcome: 'champion',
      standings: [
        { teamId: 'nym', wins: 101, losses: 61 },
        { teamId: 'bos', wins: 96, losses: 66 },
        { teamId: 'orl', wins: 79, losses: 83 },
      ],
      userPlayers: roster,
    });

    expect(bundle.newsItems.length).toBeGreaterThan(0);
    expect(bundle.newsItems[0]?.category).toBe('playoff');
    expect(bundle.briefingItems).toHaveLength(1);
    expect(bundle.playerMoraleEvents).toHaveLength(roster.length);
    expect(bundle.playerMoraleEvents.every((entry) => entry.event.impact === 8)).toBe(true);
    expect(bundle.ownerDecisionDelta?.delta).toBe(15);
    expect(bundle.seasonHistoryMoments.length).toBeGreaterThan(0);
  });

  it('keeps postseason prose deterministic and varied for early exits', () => {
    const buildPostseasonConsequenceBundle = (
      simCore as unknown as {
        buildPostseasonConsequenceBundle?: (context: unknown) => {
          briefingItems: Array<{ headline: string; body: string }>;
          ownerDecisionDelta: { delta: number; summary: string } | null;
          storyFlags: string[];
          seasonHistoryMoments: string[];
        };
      }
    ).buildPostseasonConsequenceBundle;

    expect(typeof buildPostseasonConsequenceBundle).toBe('function');

    const userPlayers = [
      withOverrides(makePlayer(106, 'nym', 'SS'), { firstName: 'Alex', lastName: 'Stone' }),
      withOverrides(makePlayer(107, 'nym', 'CF'), { firstName: 'Jalen', lastName: 'Frost' }),
    ];
    const buildBundle = (season: number, champion: string) => buildPostseasonConsequenceBundle!({
      rng: new simCore.GameRNG(22),
      season,
      userTeamId: 'nym',
      playoffBracket: {
        seeds: [
          { teamId: 'nym', seed: 4, wins: 88, losses: 74 },
          { teamId: champion, seed: 1, wins: 99, losses: 63 },
        ],
        series: [
          { winnerId: champion, loserId: 'nym', winnerWins: 2, loserWins: 1, games: [], round: 'WILD_CARD' },
          { winnerId: champion, loserId: 'bos', winnerWins: 4, loserWins: 2, games: [], round: 'WORLD_SERIES' },
        ],
        champion,
      },
      userOutcome: 'wild_card_loss',
      standings: [
        { teamId: 'nym', wins: 88, losses: 74 },
        { teamId: champion, wins: 99, losses: 63 },
        { teamId: 'bos', wins: 92, losses: 70 },
      ],
      userPlayers,
    });

    const stableA = buildBundle(5, 'bos');
    const stableB = buildBundle(5, 'bos');

    expect(stableB).toEqual(stableA);
    expect(stableA.ownerDecisionDelta).toEqual({
      delta: 3,
      summary: stableA.briefingItems[0]!.body,
    });
    expect(stableA.storyFlags).toEqual(['postseason_sting']);
    expect(stableA.seasonHistoryMoments[0]).toBe(stableA.briefingItems[0]?.body);

    const normalizedHeadlines = new Set(
      ['bos', 'sea', 'chi', 'sat', 'mil', 'msp'].map((champion, index) =>
        buildBundle(10 + index, champion).briefingItems[0]!.headline.replace(/\d+/g, 'N'),
      ),
    );
    const uniqueBodies = new Set(
      ['bos', 'sea', 'chi', 'sat', 'mil', 'msp'].map((champion, index) =>
        buildBundle(10 + index, champion).briefingItems[0]!.body,
      ),
    );

    expect(normalizedHeadlines.size).toBeGreaterThanOrEqual(3);
    expect(uniqueBodies.size).toBeGreaterThanOrEqual(3);
  });

  it('builds retirement consequences for notable MLB veterans', () => {
    const buildRetirementConsequenceBundle = (
      simCore as unknown as {
        buildRetirementConsequenceBundle?: (context: unknown) => {
          newsItems: Array<{ category: string }>;
          briefingItems: Array<{ category: string }>;
          playerMoraleEvents: Array<{ playerId: string; event: { impact: number } }>;
          ownerDecisionDelta: { delta: number; summary: string } | null;
          seasonHistoryMoments: string[];
        };
      }
    ).buildRetirementConsequenceBundle;

    expect(typeof buildRetirementConsequenceBundle).toBe('function');

    const userRetiree = withOverrides(makePlayer(8, 'nym', 'C'), {
      firstName: 'Marcus',
      lastName: 'Dean',
      age: 40,
      overallRating: 365,
      personality: {
        leadership: 88,
      },
    });
    const leagueRetiree = withOverrides(makePlayer(9, 'bos', 'SP'), {
      firstName: 'Tomas',
      lastName: 'Ruiz',
      age: 41,
      personality: {
        leadership: 77,
      },
    });
    const teammate = withOverrides(makePlayer(10, 'nym', '2B'), {
      firstName: 'Sam',
      lastName: 'Hale',
    });

    const bundle = buildRetirementConsequenceBundle!({
      rng: new simCore.GameRNG(41),
      season: 6,
      day: 1,
      userTeamId: 'nym',
      retiredPlayers: [userRetiree, leagueRetiree],
      remainingUserPlayers: [teammate],
    });

    expect(bundle.newsItems).toHaveLength(2);
    expect(bundle.newsItems.every((item) => item.category === 'roster_move')).toBe(true);
    expect(bundle.briefingItems).toHaveLength(1);
    expect(bundle.playerMoraleEvents).toEqual([
      expect.objectContaining({ playerId: teammate.id, event: expect.objectContaining({ impact: -4 }) }),
    ]);
    expect(bundle.ownerDecisionDelta?.delta).toBe(-2);
    expect(bundle.seasonHistoryMoments[0]).toContain(userRetiree.lastName);
  });

  it('builds a veteran trade aftermath watcher chain and caps active watchers at twenty', () => {
    const buildTradeAftermathChain = (
      simCore as unknown as {
        buildTradeAftermathChain?: (context: {
          rng: InstanceType<typeof simCore.GameRNG>;
          season: number;
          day: number;
          userTeamId: string;
          tradedAwayPlayers: GeneratedPlayer[];
          replacementPlayers: GeneratedPlayer[];
          seasonsWithTeamByPlayerId: Record<string, number>;
        }) => import('@mbd/contracts').ConsequenceWatcher[];
      }
    ).buildTradeAftermathChain;
    const appendConsequenceWatchers = (
      simCore as unknown as {
        appendConsequenceWatchers?: (
          existing: import('@mbd/contracts').ConsequenceWatcher[],
          additions: import('@mbd/contracts').ConsequenceWatcher[],
        ) => import('@mbd/contracts').ConsequenceWatcher[];
      }
    ).appendConsequenceWatchers;

    expect(typeof buildTradeAftermathChain).toBe('function');
    expect(typeof appendConsequenceWatchers).toBe('function');

    const tradedAway = withOverrides(makePlayer(11, 'nym', 'RF'), {
      firstName: 'Diego',
      lastName: 'Serrano',
      teamId: 'bos',
      serviceTimeDays: 172 * 6,
    });
    const replacement = withOverrides(makePlayer(12, 'nym', 'LF'), {
      firstName: 'Eli',
      lastName: 'Young',
      teamId: 'nym',
    });

    const watchers = buildTradeAftermathChain!({
      rng: new simCore.GameRNG(77),
      season: 4,
      day: 88,
      userTeamId: 'nym',
      tradedAwayPlayers: [tradedAway],
      replacementPlayers: [replacement],
      seasonsWithTeamByPlayerId: {
        [tradedAway.id]: 6,
      },
    });

    expect(watchers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'trade_aftermath', expiresSeason: 4, expiresDay: 148, resolved: false }),
        expect.objectContaining({ type: 'trade_aftermath', expiresSeason: 5, expiresDay: 1, resolved: false }),
      ]),
    );

    const existing = Array.from({ length: 20 }, (_, index) => ({
      id: `watcher-${index}`,
      type: 'fan_reaction',
      createdSeason: 4,
      createdDay: index + 1,
      expiresSeason: 4,
      expiresDay: 120,
      context: { index },
      resolved: false,
    })) as import('@mbd/contracts').ConsequenceWatcher[];
    const merged = appendConsequenceWatchers!(existing, watchers);

    expect(merged).toHaveLength(20);
    expect(merged[0]?.resolved).toBe(true);
    expect(merged.some((watcher) => watcher.id === watchers[0]?.id)).toBe(true);
  });

  it('evaluates watcher resolution, rushing risk, and fan sentiment deterministically', () => {
    const evaluateConsequenceWatchers = (
      simCore as unknown as {
        evaluateConsequenceWatchers?: (context: {
          rng: InstanceType<typeof simCore.GameRNG>;
          season: number;
          day: number;
          userTeamId: string;
          players: GeneratedPlayer[];
          playerStats: Array<[string, PlayerGameStats]>;
          watchers: import('@mbd/contracts').ConsequenceWatcher[];
        }) => {
          updatedWatchers: import('@mbd/contracts').ConsequenceWatcher[];
          newsItems: Array<{ headline: string }>;
          moraleDeltas: Array<{ playerId: string; event: { impact: number } }>;
        };
      }
    ).evaluateConsequenceWatchers;
    const calculateRushingRisk = (
      simCore as unknown as {
        calculateRushingRisk?: (
          player: GeneratedPlayer,
          currentLevel: string,
          targetLevel: string,
        ) => { injuryMultiplier: number; regressionChance: number; confidenceHit: number };
      }
    ).calculateRushingRisk;
    const calculateFanSentiment = (
      simCore as unknown as {
        calculateFanSentiment?: (context: {
          season: number;
          day: number;
          priorScore?: number;
          wins: number;
          losses: number;
          tradePulse: number;
          signingPulse: number;
          prospectDebuts: number;
          championshipSeasons: number[];
        }) => import('@mbd/contracts').FanSentiment;
      }
    ).calculateFanSentiment;

    expect(typeof evaluateConsequenceWatchers).toBe('function');
    expect(typeof calculateRushingRisk).toBe('function');
    expect(typeof calculateFanSentiment).toBe('function');

    const player = withOverrides(makePlayer(13, 'nym', 'CF'), {
      firstName: 'Avery',
      lastName: 'Mills',
      teamId: 'nym',
    });
    const replacement = withOverrides(makePlayer(14, 'nym', 'LF'), {
      firstName: 'Cole',
      lastName: 'Parker',
      teamId: 'nym',
    });
    const playerStats = new Map<string, PlayerGameStats>([
      [player.id, {
        pa: 520,
        ab: 470,
        hits: 161,
        doubles: 30,
        triples: 4,
        hr: 27,
        rbi: 92,
        bb: 48,
        k: 101,
        runs: 88,
        hbp: 0,
        sacFlies: 0,
        ip: 0,
        earnedRuns: 0,
        strikeouts: 0,
        walks: 0,
        hitsAllowed: 0,
        homeRunsAllowed: 0,
        hitBatters: 0,
        flyBallsAllowed: 0,
        wins: 0,
        losses: 0,
      }],
      [replacement.id, {
        pa: 410,
        ab: 382,
        hits: 93,
        doubles: 14,
        triples: 1,
        hr: 9,
        rbi: 44,
        bb: 25,
        k: 118,
        runs: 42,
        hbp: 0,
        sacFlies: 0,
        ip: 0,
        earnedRuns: 0,
        strikeouts: 0,
        walks: 0,
        hitsAllowed: 0,
        homeRunsAllowed: 0,
        hitBatters: 0,
        flyBallsAllowed: 0,
        wins: 0,
        losses: 0,
      }],
    ]);

    const evaluated = evaluateConsequenceWatchers!({
      rng: new simCore.GameRNG(17),
      season: 5,
      day: 1,
      userTeamId: 'nym',
      players: [player, replacement],
      playerStats: Array.from(playerStats.entries()),
      watchers: [{
        id: 'trade-long',
        type: 'trade_aftermath',
        createdSeason: 4,
        createdDay: 88,
        expiresSeason: 5,
        expiresDay: 1,
        resolved: false,
        context: {
          tradedPlayerId: player.id,
          replacementPlayerId: replacement.id,
          tradedPlayerName: `${player.firstName} ${player.lastName}`,
          replacementPlayerName: `${replacement.firstName} ${replacement.lastName}`,
        },
      }],
    });

    expect(evaluated.updatedWatchers[0]?.resolved).toBe(true);
    expect(evaluated.newsItems[0]?.headline.toLowerCase()).toMatch(/vindication|regret/);

    const oneLevelRisk = calculateRushingRisk!(player, 'AA', 'AAA');
    const twoLevelRisk = calculateRushingRisk!(player, 'A', 'MLB');
    expect(oneLevelRisk).toEqual({ injuryMultiplier: 1.3, regressionChance: 0.1, confidenceHit: 5 });
    expect(twoLevelRisk).toEqual({ injuryMultiplier: 1.6, regressionChance: 0.2, confidenceHit: 10 });

    const sentiment = calculateFanSentiment!({
      season: 5,
      day: 30,
      priorScore: 50,
      wins: 21,
      losses: 9,
      tradePulse: 8,
      signingPulse: 6,
      prospectDebuts: 2,
      championshipSeasons: [4],
    });

    expect(sentiment.score).toBeGreaterThan(60);
    expect(sentiment.summary.toLowerCase()).toContain('fans');
  });
});
