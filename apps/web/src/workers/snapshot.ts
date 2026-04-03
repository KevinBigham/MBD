import {
  type AchievementState,
  type AwardHistoryEntry,
  type BriefingItem,
  type CareerStatsLedger,
  type CeremonyState,
  type ChallengeState,
  type ConsequenceWatcher,
  type DynastyCard,
  type FanSentiment,
  type FrontOfficeState,
  type FranchiseTimelineEntry,
  type FranchiseState,
  type GameSnapshot,
  type GMCareer,
  type HallOfFameBallotEntry,
  type HallOfFameEntry,
  type HistoricalPlayer,
  type JobMarket,
  type MentorRelationship,
  type OwnerState,
  type PlayerMorale,
  type RecordBookEntry,
  type RecordWatchEntry,
  type Rivalry,
  type ScoutConflict,
  type SeasonArchiveEntry,
  type SeasonHistoryEntry,
  type TeamChemistry,
} from '@mbd/contracts';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  parseGameSnapshot,
} from '../../../../packages/contracts/src/schemas/save';
import {
  GameRNG,
  type IFAScoutingHistoryEntry,
  type IFATeamBudget,
  type InternationalScoutingState,
  StandingsTracker,
  type FreeAgencyMarket,
  type GMPersonality,
  type GeneratedPlayer,
  type Injury,
  type OffseasonState,
  type PlayerGameStats,
  type PlayoffBracket,
  type RosterState,
  type ScheduledGame,
  type Scout,
  type SeasonState,
  type TeamRecord,
  type GameBoxScore,
  type NewsItem,
} from '@mbd/sim-core';
import {
  createEmptyDraftState,
  createEmptyInternationalScoutingState,
  createEmptyMinorLeagueState,
  createEmptyTradeState,
  ensurePlayersHaveRule5Eligibility,
  normalizeDraftSessionState,
  normalizeOffseasonState,
  type DraftSessionState,
  type FullGameState,
} from './sim.worker.helpers';
import {
  createDefaultFranchiseState,
  createEmptyAchievementState,
  createEmptyCeremonyState,
} from './sim.worker.ceremony.js';
import { createEmptyMonthlyPulseState } from './sim.worker.monthlyPulse.js';

function serializeSeasonState(seasonState: SeasonState): GameSnapshot['seasonState'] {
  return {
    season: seasonState.season,
    currentDay: seasonState.currentDay,
    standings: seasonState.standings.serialize(),
    playerSeasonStats: Array.from(seasonState.playerSeasonStats.entries()).map(([playerId, stats]) => [
      playerId,
      {
        gamesPlayed: stats.gamesPlayed ?? 0,
        pa: stats.pa,
        ab: stats.ab,
        hits: stats.hits,
        doubles: stats.doubles,
        triples: stats.triples,
        hr: stats.hr,
        rbi: stats.rbi,
        bb: stats.bb,
        k: stats.k,
        runs: stats.runs,
        hbp: stats.hbp,
        sacFlies: stats.sacFlies,
        ip: stats.ip,
        earnedRuns: stats.earnedRuns,
        strikeouts: stats.strikeouts,
        walks: stats.walks,
        hitsAllowed: stats.hitsAllowed,
        homeRunsAllowed: stats.homeRunsAllowed,
        hitBatters: stats.hitBatters,
        flyBallsAllowed: stats.flyBallsAllowed,
        wins: stats.wins,
        saves: stats.saves ?? 0,
        losses: stats.losses,
      },
    ]),
    gameLog: seasonState.gameLog,
    completed: seasonState.completed,
  };
}

function deserializeSeasonState(
  serialized: GameSnapshot['seasonState'],
): SeasonState {
  return {
    season: serialized.season,
    currentDay: serialized.currentDay,
    standings: StandingsTracker.deserialize(serialized.standings as TeamRecord[]),
    playerSeasonStats: new Map(
      (serialized.playerSeasonStats as GameSnapshot['seasonState']['playerSeasonStats']).map(([playerId, stats]) => [
        playerId,
        {
          playerId,
          teamId: '',
          gamesPlayed: stats.gamesPlayed,
          pa: stats.pa,
          ab: stats.ab,
          hits: stats.hits,
          doubles: stats.doubles,
          triples: stats.triples,
          hr: stats.hr,
          rbi: stats.rbi,
          bb: stats.bb,
          k: stats.k,
          runs: stats.runs,
          hbp: stats.hbp,
          sacFlies: stats.sacFlies,
          ip: stats.ip,
          earnedRuns: stats.earnedRuns,
          strikeouts: stats.strikeouts,
          walks: stats.walks,
          hitsAllowed: stats.hitsAllowed,
          homeRunsAllowed: stats.homeRunsAllowed,
          hitBatters: stats.hitBatters,
          flyBallsAllowed: stats.flyBallsAllowed,
          wins: stats.wins,
          saves: stats.saves,
          losses: stats.losses,
        } satisfies PlayerGameStats,
      ]),
    ),
    gameLog: serialized.gameLog as GameBoxScore[],
    completed: serialized.completed,
  };
}

function toEntries<T>(map: Map<string, T>): [string, T][] {
  return Array.from(map.entries());
}

function fromEntries<T>(entries: [string, T][]): Map<string, T> {
  return new Map(entries);
}

function serializeInternationalScoutingState(
  state: InternationalScoutingState,
): GameSnapshot['internationalScoutingState'] {
  return {
    season: state.season,
    ifaPool: state.ifaPool,
    budgets: Array.from(state.budgets.entries()),
    scoutingHistory: Array.from(state.scoutingHistory.entries()),
  };
}

function deserializeInternationalScoutingState(
  serialized: GameSnapshot['internationalScoutingState'],
): InternationalScoutingState {
  return {
    season: serialized.season,
    ifaPool: serialized.ifaPool,
    budgets: new Map(serialized.budgets as [string, IFATeamBudget][]),
    scoutingHistory: new Map(serialized.scoutingHistory as [string, IFAScoutingHistoryEntry[]][]),
  };
}

function createEmptyJobMarket(): JobMarket {
  return {
    availableJobs: [],
    applicationDeadlineSeason: null,
  };
}

function createDefaultFanSentiment(season: number, day: number): FanSentiment {
  return {
    score: 50,
    summary: 'Fan sentiment is stable.',
    updatedAt: `S${season}D${day}`,
  };
}

function parseRecord(record: string, fallbackWins: number) {
  const match = /^(\d+)-(\d+)$/.exec(record);
  if (match) {
    return {
      wins: Number(match[1]),
      losses: Number(match[2]),
    };
  }

  return {
    wins: fallbackWins,
    losses: Math.max(0, 162 - fallbackWins),
  };
}

function backfillGMCareer(
  snapshot: GameSnapshot,
  franchise: FranchiseState,
): GMCareer {
  const existingCareer = snapshot.narrative.gmCareer as GMCareer | undefined;
  if (existingCareer) {
    return existingCareer;
  }

  const franchiseHistory = (snapshot.narrative.franchiseTimeline as FranchiseTimelineEntry[])
    .filter((entry) => entry.teamId === snapshot.userTeamId)
    .sort((left, right) => left.season - right.season);
  const currentRecord = snapshot.seasonState.standings.find((entry) => entry.teamId === snapshot.userTeamId);
  const totals = franchiseHistory.reduce((record, entry) => {
    const parsed = parseRecord(entry.record, entry.winTotal);
    return {
      wins: record.wins + parsed.wins,
      losses: record.losses + parsed.losses,
    };
  }, {
    wins: currentRecord?.wins ?? 0,
    losses: currentRecord?.losses ?? 0,
  });
  const reputation = (snapshot.narrative.frontOfficeState as [string, FrontOfficeState][])
    .find(([teamId]) => teamId === snapshot.userTeamId)?.[1]?.reputation ?? 50;
  const championships = franchiseHistory.filter((entry) => entry.championship).length;
  const hiredSeason = franchiseHistory[0]?.season ?? Math.max(1, snapshot.season - franchiseHistory.length);

  return {
    careerHistory: [
      {
        teamId: snapshot.userTeamId,
        seasons: Math.max(1, franchiseHistory.length + ((totals.wins + totals.losses) > 0 ? 1 : 0)),
        record: totals,
        championships,
        hiredSeason,
        firedSeason: null,
        firedReason: null,
        reputation,
      },
    ],
    currentTeamId: snapshot.userTeamId,
    reputation,
    overallRecord: totals,
    championships,
    hiredSeason,
    firedSeasons: [],
    careerAchievements: championships > 0 ? [`Won ${championships} championship${championships === 1 ? '' : 's'}.`] : [],
    jobSearchActive: false,
    lastFiredReason: null,
  };
}

function validateSnapshot(snapshot: unknown): GameSnapshot {
  if (
    typeof snapshot === 'object' &&
    snapshot !== null &&
    'schemaVersion' in snapshot &&
    snapshot.schemaVersion !== 2 &&
    snapshot.schemaVersion !== 3 &&
    snapshot.schemaVersion !== 4 &&
    snapshot.schemaVersion !== 5 &&
    snapshot.schemaVersion !== 6 &&
    snapshot.schemaVersion !== 7 &&
    snapshot.schemaVersion !== 8 &&
    snapshot.schemaVersion !== 9 &&
    snapshot.schemaVersion !== 10 &&
    snapshot.schemaVersion !== 11 &&
    snapshot.schemaVersion !== 12 &&
    snapshot.schemaVersion !== CURRENT_GAME_SNAPSHOT_VERSION
  ) {
    throw new Error(`Unsupported snapshot schema version: ${String(snapshot.schemaVersion)}`);
  }
  try {
    return parseGameSnapshot(snapshot);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid snapshot payload';
    throw new Error(`Invalid snapshot: ${message}`);
  }
}

export function exportGameSnapshot(state: FullGameState): GameSnapshot {
  return validateSnapshot({
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    rng: state.rng.getState(),
    season: state.season,
    day: state.day,
    phase: state.phase,
    userTeamId: state.userTeamId,
    players: state.players,
    schedule: state.schedule,
    seasonState: serializeSeasonState(state.seasonState),
    playoffBracket: state.playoffBracket,
    injuries: toEntries(state.injuries),
    serviceTime: toEntries(state.serviceTime),
    scoutingStaffs: toEntries(state.scoutingStaffs),
    gmPersonalities: toEntries(state.gmPersonalities),
    offseasonState: state.offseasonState,
    rule5Session: state.rule5Session,
    rule5Obligations: state.rule5Obligations,
    rule5OfferBackStates: state.rule5OfferBackStates,
    draftClass: state.draftClass,
    freeAgencyMarket: state.freeAgencyMarket,
    news: state.news,
    rosterStates: toEntries(state.rosterStates),
    coachingStaffs: toEntries(state.coachingStaffs),
    coachFreeAgentPool: state.coachFreeAgentPool,
    internationalScoutingState: serializeInternationalScoutingState(state.internationalScoutingState),
    draftState: state.draftState,
    minorLeagueState: state.minorLeagueState,
    narrative: {
      playerMorale: toEntries(state.playerMorale),
      teamChemistry: toEntries(state.teamChemistry),
      ownerState: toEntries(state.ownerState),
      briefingQueue: state.briefingQueue,
      storyFlags: toEntries(state.storyFlags),
      rivalries: toEntries(state.rivalries),
      awardHistory: state.awardHistory,
      hallOfFame: state.hallOfFame,
      hallOfFameBallot: state.hallOfFameBallot,
      franchiseTimeline: state.franchiseTimeline,
      careerStats: state.careerStats,
      recordBook: state.recordBook,
      recordWatch: state.recordWatch,
      seasonArchive: state.seasonArchive,
      historicalPlayers: state.historicalPlayers,
      mentorRelationships: state.mentorRelationships,
      frontOfficeState: toEntries(state.frontOfficeState),
      gmCareer: state.gmCareer,
      jobMarket: state.jobMarket,
      consequenceWatchers: state.consequenceWatchers,
      fanSentiment: state.fanSentiment,
      scoutConflicts: state.scoutConflicts,
      dynastyCards: state.dynastyCards,
      challengeState: state.challengeState,
      seasonHistory: state.seasonHistory,
    },
    monthlyPulse: state.monthlyPulse,
    tradeState: state.tradeState,
    franchise: state.franchise,
    ceremony: state.ceremony,
    achievements: state.achievements,
  });
}

export function importGameSnapshot(snapshotLike: unknown): FullGameState {
  const snapshot = validateSnapshot(snapshotLike);
  const players = snapshot.players as GeneratedPlayer[];
  ensurePlayersHaveRule5Eligibility(players, snapshot.season);
  const serviceTime = fromEntries(snapshot.serviceTime);
  const seasonState = deserializeSeasonState(snapshot.seasonState);
  const franchise = (snapshot.franchise as FranchiseState | undefined)
    ?? createDefaultFranchiseState(snapshot.userTeamId, snapshot.season, snapshot.day);
  const gmCareer = backfillGMCareer(snapshot, franchise);

  return {
    rng: GameRNG.fromState(snapshot.rng),
    season: snapshot.season,
    day: snapshot.day,
    phase: snapshot.phase,
    players,
    schedule: snapshot.schedule as ScheduledGame[],
    seasonState,
    userTeamId: snapshot.userTeamId,
    playoffBracket: snapshot.playoffBracket as PlayoffBracket | null,
    injuries: fromEntries(snapshot.injuries as [string, Injury][]),
    serviceTime,
    scoutingStaffs: fromEntries(snapshot.scoutingStaffs as [string, Scout[]][]),
    gmPersonalities: fromEntries(snapshot.gmPersonalities as [string, GMPersonality][]),
    pendingExtensionNegotiations: new Map(),
    offseasonState: normalizeOffseasonState(
      snapshot.offseasonState as OffseasonState | null,
      players,
      serviceTime,
    ),
    rule5Session: (snapshot.rule5Session as FullGameState['rule5Session']) ?? null,
    rule5Obligations: (snapshot.rule5Obligations as FullGameState['rule5Obligations']) ?? [],
    rule5OfferBackStates: (snapshot.rule5OfferBackStates as FullGameState['rule5OfferBackStates']) ?? [],
    draftClass: normalizeDraftSessionState(
      snapshot.draftClass as DraftSessionState | null,
      seasonState,
      snapshot.draftState ?? createEmptyDraftState(),
      snapshot.userTeamId,
    ),
    freeAgencyMarket: snapshot.freeAgencyMarket as FreeAgencyMarket | null,
    news: snapshot.news as NewsItem[],
    rosterStates: fromEntries(snapshot.rosterStates as [string, RosterState][]),
    coachingStaffs: fromEntries(snapshot.coachingStaffs as [string, FullGameState['coachFreeAgentPool']][]),
    coachFreeAgentPool: snapshot.coachFreeAgentPool as FullGameState['coachFreeAgentPool'],
    internationalScoutingState:
      snapshot.internationalScoutingState
        ? deserializeInternationalScoutingState(snapshot.internationalScoutingState)
        : createEmptyInternationalScoutingState(snapshot.season),
    draftState: snapshot.draftState ?? createEmptyDraftState(),
    minorLeagueState: snapshot.minorLeagueState ?? createEmptyMinorLeagueState(),
    monthlyPulse: snapshot.monthlyPulse ?? createEmptyMonthlyPulseState(),
    playerMorale: fromEntries(snapshot.narrative.playerMorale as [string, PlayerMorale][]),
    teamChemistry: fromEntries(snapshot.narrative.teamChemistry as [string, TeamChemistry][]),
    ownerState: fromEntries(snapshot.narrative.ownerState as [string, OwnerState][]),
    briefingQueue: snapshot.narrative.briefingQueue as BriefingItem[],
    storyFlags: fromEntries(snapshot.narrative.storyFlags),
    rivalries: fromEntries(snapshot.narrative.rivalries as [string, Rivalry][]),
    awardHistory: snapshot.narrative.awardHistory as AwardHistoryEntry[],
    hallOfFame: snapshot.narrative.hallOfFame as HallOfFameEntry[],
    hallOfFameBallot: snapshot.narrative.hallOfFameBallot as HallOfFameBallotEntry[],
    franchiseTimeline: snapshot.narrative.franchiseTimeline as FranchiseTimelineEntry[],
    careerStats: snapshot.narrative.careerStats as CareerStatsLedger[],
    recordBook: snapshot.narrative.recordBook as RecordBookEntry[],
    recordWatch: snapshot.narrative.recordWatch as RecordWatchEntry[],
    seasonArchive: snapshot.narrative.seasonArchive as SeasonArchiveEntry[],
    historicalPlayers: snapshot.narrative.historicalPlayers as HistoricalPlayer[],
    mentorRelationships: snapshot.narrative.mentorRelationships as MentorRelationship[],
    frontOfficeState: fromEntries(snapshot.narrative.frontOfficeState as [string, FrontOfficeState][]),
    seasonHistory: snapshot.narrative.seasonHistory as SeasonHistoryEntry[],
    gmCareer,
    jobMarket: (snapshot.narrative.jobMarket as JobMarket | undefined) ?? createEmptyJobMarket(),
    consequenceWatchers: (snapshot.narrative.consequenceWatchers as ConsequenceWatcher[] | undefined) ?? [],
    fanSentiment: (snapshot.narrative.fanSentiment as FanSentiment | undefined)
      ?? createDefaultFanSentiment(snapshot.season, snapshot.day),
    scoutConflicts: (snapshot.narrative.scoutConflicts as ScoutConflict[] | undefined) ?? [],
    dynastyCards: (snapshot.narrative.dynastyCards as DynastyCard[] | undefined) ?? [],
    challengeState: (snapshot.narrative.challengeState as ChallengeState | null | undefined) ?? null,
    tradeState: snapshot.tradeState ?? createEmptyTradeState(),
    franchise,
    ceremony: (snapshot.ceremony as CeremonyState | undefined) ?? createEmptyCeremonyState(),
    achievements: (snapshot.achievements as AchievementState | undefined) ?? createEmptyAchievementState(),
  };
}
