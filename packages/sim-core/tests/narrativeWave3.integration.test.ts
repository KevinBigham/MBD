import { describe, expect, it } from 'vitest';
import type { AwardHistoryEntry, Rivalry } from '@mbd/contracts';
import { GameRNG } from '../src/math/prng.js';
import {
  detectMoment,
  type GameBoxScore,
  type Moment,
  type MomentDetectionContext,
  type PlayerGameStats,
} from '../src/moments/momentDetector.js';
import {
  detectSeasonIdentityMoments,
  type SeasonIdentityMomentDetectionContext,
  type TeamSeasonSummary,
} from '../src/moments/seasonIdentityMoments.js';
import { generateRebuildAnnouncementBriefing } from '../src/narrative/eventBriefings.js';
import {
  computeRivalryIntensityScore,
  getRivalry,
  seedHistoricalRivalries,
} from '../src/league/rivalries.js';

function createTeamSummary(
  overrides: Partial<TeamSeasonSummary> & { teamId: string },
): TeamSeasonSummary {
  return {
    teamId: overrides.teamId,
    teamName: overrides.teamName,
    wins: 81,
    losses: 81,
    madePlayoffs: false,
    isChampion: false,
    divisionRank: null,
    priorSeasonsSummary: [],
    ...overrides,
  };
}

function createSeasonIdentityContext(
  overrides: Partial<SeasonIdentityMomentDetectionContext> & { teams: readonly TeamSeasonSummary[] },
): SeasonIdentityMomentDetectionContext {
  return {
    season: 7,
    day: 182,
    ...overrides,
  };
}

function createBoxScore(
  overrides: Partial<GameBoxScore> = {},
): GameBoxScore {
  return {
    homeTeamId: 'bos',
    awayTeamId: 'nym',
    homeScore: 5,
    awayScore: 4,
    innings: 9,
    homeHits: 8,
    awayHits: 7,
    paResults: [],
    winningPitcherId: 'pitcher-home',
    losingPitcherId: 'pitcher-away',
    savePitcherId: null,
    date: 'S7D120',
    isPlayoff: false,
    ...overrides,
  };
}

function createMomentContext(
  overrides: Partial<MomentDetectionContext> = {},
): MomentDetectionContext {
  return {
    currentSeason: 7,
    existingMomentsByPlayer: new Map(),
    careerTotalsBeforeGameByPlayer: new Map(),
    round: null,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    decisiveErrorPlayerId: null,
    blownSavePitcherId: null,
    ...overrides,
  };
}

function createBrawlBoxScore(): GameBoxScore {
  return createBoxScore({
    homeTeamId: 'bos',
    awayTeamId: 'nym',
    homeScore: 4,
    awayScore: 3,
    paResults: [
      {
        outcome: 'HBP',
        batterId: 'sparkplug',
        pitcherId: 'starter-away',
        inning: 4,
        halfInning: 'bottom',
        outs: 1,
        runnersOn: 0,
        scoreBefore: [1, 1],
        scoreAfter: [1, 1],
        rbiOnPlay: 0,
        isWalkOff: false,
      },
      {
        outcome: 'HBP',
        batterId: 'instigator',
        pitcherId: 'setup-away',
        inning: 7,
        halfInning: 'bottom',
        outs: 0,
        runnersOn: 1,
        scoreBefore: [3, 2],
        scoreAfter: [3, 2],
        rbiOnPlay: 0,
        isWalkOff: false,
      },
      {
        outcome: 'FB_OUT',
        batterId: 'cleanup',
        pitcherId: 'setup-away',
        inning: 8,
        halfInning: 'bottom',
        outs: 1,
        runnersOn: 2,
        scoreBefore: [3, 4],
        scoreAfter: [3, 4],
        rbiOnPlay: 0,
        isWalkOff: false,
      },
    ],
  });
}

function findMoment(
  updates: ReturnType<typeof detectMoment>,
  type: Moment['type'],
): Moment | undefined {
  return updates.flatMap((update) => update.newMoments).find((moment) => moment.type === type);
}

function createTradeHistoryEntry(
  id: string,
  playerId: string,
  day: number,
) {
  return {
    id,
    fromTeamId: 'pit',
    toTeamId: 'lad',
    offeringAssets: [{ type: 'player' as const, playerId }],
    requestingAssets: [],
    fairnessScore: 0,
    summary: `pit moved ${playerId}`,
    timestamp: `S7D${day}`,
  };
}

function createHighIntensityRivalry(): Rivalry {
  return {
    ...getRivalry(seedHistoricalRivalries(new Map()), 'nym', 'bos')!,
    currentSeasonWinsA: 7,
    currentSeasonWinsB: 6,
    closeRaceStreak: 3,
    playoffSeriesStreak: 2,
    eventHistory: [
      { season: 7, type: 'playoff', summary: 'Met again in October.' },
      { season: 7, type: 'division_race', summary: 'The race stayed tight all summer.' },
      { season: 6, type: 'trade', summary: 'A rivalry trade reopened wounds.' },
      { season: 5, type: 'historical', summary: 'Old tension still lingers.' },
    ],
  };
}

function findBrawlSeed(
  boxScore: GameBoxScore,
  context: MomentDetectionContext,
): number {
  for (let seed = 1; seed <= 500; seed += 1) {
    if (findMoment(detectMoment(boxScore, new Map<string, PlayerGameStats>(), context, new GameRNG(seed)), 'bench_clearing_brawl')) {
      return seed;
    }
  }
  throw new Error('Expected to find a deterministic bench-clearing brawl seed');
}

describe('narrative depth wave 3 integrations', () => {
  it('turns a detected fire sale into a rebuild announcement briefing', () => {
    const fireSaleContext = createSeasonIdentityContext({
      teams: [
        createTeamSummary({
          teamId: 'pit',
          teamName: 'Pittsburgh Riveters',
          wins: 64,
          losses: 98,
        }),
      ],
      tradeHistory: [
        createTradeHistoryEntry('trade-1', 'p1', 94),
        createTradeHistoryEntry('trade-2', 'p2', 99),
        createTradeHistoryEntry('trade-3', 'p3', 104),
      ],
      playerContractYearsById: new Map([
        ['p1', 3],
        ['p2', 2],
        ['p3', 4],
      ]),
    });

    const [fireSaleMoment] = detectSeasonIdentityMoments(fireSaleContext);
    const briefing = generateRebuildAnnouncementBriefing({
      teamId: 'pit',
      teamName: 'Pittsburgh Riveters',
      season: 7,
      day: 182,
      wins: 64,
      losses: 98,
      gmPersonality: 'prospect_hugger',
      teamMoments: fireSaleMoment ? [fireSaleMoment.moment] : [],
    });

    expect(fireSaleMoment?.moment.type).toBe('fire_sale');
    expect(briefing).toEqual(expect.objectContaining({
      category: 'news',
      tag: 'BREAKING',
      relatedTeamIds: ['pit'],
    }));
  });

  it('detects a first_all_star moment from award history and assigns a player-facing description', () => {
    const awardHistory: AwardHistoryEntry[] = [
      {
        season: 7,
        award: 'All-Star',
        league: 'AL',
        playerId: 'breakout-bat',
        teamId: 'bos',
      },
    ];
    const updates = detectMoment(
      createBoxScore(),
      new Map<string, PlayerGameStats>(),
      createMomentContext({
        awardHistory,
        playerNameById: new Map([['breakout-bat', 'Pat Legend']]),
      }),
      new GameRNG(902),
    );
    const firstAllStar = findMoment(updates, 'first_all_star');

    expect(firstAllStar).toEqual(expect.objectContaining({
      type: 'first_all_star',
      impact: 45,
    }));
    expect(firstAllStar?.description).toContain('Pat Legend');
  });

  it('feeds computed rivalry intensity into a deterministic bench-clearing brawl detection', () => {
    const rivalryIntensity = computeRivalryIntensityScore({
      rivalry: createHighIntensityRivalry(),
      currentSeasonTeamMomentCount: 3,
      currentSeasonPlayerMomentCount: 2,
    });
    const boxScore = createBrawlBoxScore();
    const context = createMomentContext({
      rivalryIntensity,
      playerNameById: new Map([['instigator', 'Pat Legend']]),
    });
    const seed = findBrawlSeed(boxScore, context);
    const brawl = findMoment(
      detectMoment(boxScore, new Map<string, PlayerGameStats>(), context, new GameRNG(seed)),
      'bench_clearing_brawl',
    );

    expect(rivalryIntensity).toBeGreaterThanOrEqual(70);
    expect(brawl).toEqual(expect.objectContaining({
      type: 'bench_clearing_brawl',
      impact: 40,
    }));
    expect(brawl?.description).toContain('Benches empty');
    expect(brawl?.description).toContain('NYM-BOS');
  });
});
