// @vitest-environment node

// Vitest executes this fixture-backed migration guard in Node, while the app
// tsconfig intentionally omits Node globals for runtime code.
// @ts-ignore
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GameRNG,
  TEAMS,
  assignGMPersonality,
  buildRosterState,
  createRule5Session,
  createSeasonState,
  generateLeaguePlayers,
  generateSchedule,
  generateScoutingStaff,
  initializeGMCareer,
  materializeSimulationImportDefaults,
  simulateDay,
} from '@mbd/sim-core';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION,
  parseGameSnapshot,
  type ArchivedGameBoxScore,
  type ArchivedSeason,
  type BriefingItem,
  type GMRelationship,
  type LeagueEvent,
  type PlayerNicknameState,
  type DebutFlashback,
  type GameSnapshot,
  type OwnerState,
  type PlayerOrigin,
  type PlayerStoryArc,
  type PlayerMorale,
  type ProspectBond,
  type RecordBookEntry,
  type RecordWatchEntry,
  type Rivalry,
  type SignatureMoment,
  type TickerEntry,
  type WhatIfBranchMeta,
  type TeamChemistry,
} from '@mbd/contracts';
import type { FullGameState } from './sim.worker.helpers';
import {
  createDefaultFranchiseState,
  createEmptyAchievementState,
  createEmptyCeremonyState,
} from './sim.worker.ceremony';
import { exportSnapshotToJson, importSnapshotFromJson } from '../shared/lib/saveSystem';
import { exportGameSnapshot, importGameSnapshot } from './snapshot';

function loadContractSaveFixture(version: number, name = 'core'): unknown {
  return JSON.parse(readFileSync(
    new URL(`../../../../packages/contracts/tests/fixtures/save/v${version}/${name}.json`, import.meta.url),
    'utf8',
  )) as unknown;
}

type MatrixRecord = Record<string, unknown>;

function cloneSnapshot<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

let legacyMatrixBase: GameSnapshot | null = null;

function assertVersionSpecificNormalization(version: number, snapshot: GameSnapshot): void {
  expect(snapshot.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
  expect(snapshot.performanceDiagnostics.totalSeasons).toBeGreaterThanOrEqual(1);
  if (version < 14) {
    expect(snapshot.performanceDiagnostics.snapshotSizeBytes).toBe(0);
  }
  if (version >= 14 && version < CURRENT_GAME_SNAPSHOT_VERSION) {
    expect(snapshot.performanceDiagnostics.snapshotSizeBytes, `v${version} migration should recalculate snapshot size`)
      .toBeGreaterThan(0);
  }

  if (version === 2) {
    expect(snapshot.narrative.awardHistory[0]?.league).toBe('MLB');
    expect(snapshot.narrative.seasonHistory[0]).toMatchObject({
      runnerUpTeamId: null,
      worldSeriesRecord: null,
      statLeaders: { hr: [] },
    });
  }
  if (version <= 3) {
    expect(snapshot.tradeState).toEqual({ pendingOffers: [], tradeHistory: [], negotiations: [], multiTeamPendingTrades: [] });
  }
  if (version <= 4) {
    expect(snapshot.rule5Session).toBeNull();
    expect(snapshot.rule5Obligations).toEqual([]);
  }
  if (version <= 6) {
    expect(snapshot.players.every((player) => player.optionYearsUsed === 0 && !player.isOutOfOptions)).toBe(true);
  }
  if (version <= 7) {
    expect(snapshot.minorLeagueState.processedDevelopmentMonths).toEqual([]);
  }
  if (version <= 8) {
    expect(snapshot.seasonState.playerSeasonStats.every(([, stats]) => (
      stats.hbp === 0 && stats.sacFlies === 0 && stats.gamesMissedToInjury === 0
    ))).toBe(true);
  }
  if (version <= 9) {
    expect(snapshot.monthlyPulse).toEqual({ pendingReport: null, decisionQueue: [] });
  }
  if (version === 10) {
    expect(snapshot.franchise.gmName).toBe('General Manager');
    expect(snapshot.ceremony.pendingMoments).toEqual([]);
  }
  if (version === 11) {
    expect(snapshot.narrative.recordWatch).toEqual([]);
    expect(snapshot.narrative.mentorRelationships).toEqual([]);
  }
  if (version === 12) {
    expect(snapshot.narrative.jobMarket.availableJobs).toEqual([]);
    expect(snapshot.narrative.challengeState).toBeNull();
  }
  if (version === 13) {
    expect(snapshot.narrative.tickerFeed).toEqual([]);
    expect(snapshot.minorLeagueState.minorLeagueStatHistory).toEqual([]);
  }
  if (version === 14) {
    expect(snapshot.narrative.archivedSeasons).toEqual([]);
  }
  if (version <= 16) {
    expect(snapshot.narrative.playerMoments).toEqual([]);
    expect(snapshot.tradeState.negotiations).toEqual([]);
  }
  if (version <= 18) {
    expect(snapshot.players.every((player) => (
      player.arbitrationHistory.length === 0 && player.holdoutState === null && !player.superTwoQualified
    ))).toBe(true);
  }
  if (version <= 21) {
    expect(snapshot.narrative.teamMoments).toEqual([]);
  }
  if (version === 26) {
    expect(snapshot.narrative.playoffSeriesHistory).toEqual([]);
    expect(snapshot.narrative.rookieOfTheYearVoting).toEqual([]);
  }
  if (version === 28) {
    expect(snapshot.players.every((player) => player.priorSeasonEstimatedWar === null)).toBe(true);
  }
  if (version === 33) {
    expect(snapshot.narrative.archivedGames).toEqual([]);
  }
}

type MatrixCase = {
  version: number;
  name: string;
  historicalRationale: string;
  build: () => unknown;
  assertRawShape: (raw: unknown) => void;
};

const LEGACY_PLAYER_KEYS = [
  'id', 'firstName', 'lastName', 'age', 'position', 'hitterAttributes', 'pitcherAttributes',
  'personality', 'contract', 'rosterStatus', 'developmentPhase', 'teamId', 'nationality', 'overallRating',
] as const;
const V6_PLAYER_KEYS = [...LEGACY_PLAYER_KEYS, 'rule5EligibleAfterSeason'] as const;
const V7_PLAYER_KEYS = [...V6_PLAYER_KEYS, 'serviceTimeDays', 'optionYearsUsed', 'isOutOfOptions', 'minorLeagueLevel'] as const;
const LEGACY_STAT_KEYS = [
  'pa', 'ab', 'hits', 'doubles', 'triples', 'hr', 'rbi', 'bb', 'k', 'runs', 'ip', 'earnedRuns',
  'strikeouts', 'walks', 'hitsAllowed',
] as const;
const V8_STAT_KEYS = [...LEGACY_STAT_KEYS, 'wins', 'losses'] as const;
const V9_STAT_KEYS = [
  ...V8_STAT_KEYS, 'hbp', 'sacFlies', 'homeRunsAllowed', 'hitBatters', 'flyBallsAllowed',
] as const;
const CORE_ROOT_KEYS = [
  'schemaVersion', 'rng', 'season', 'day', 'phase', 'userTeamId', 'players', 'schedule', 'seasonState',
  'playoffBracket', 'injuries', 'serviceTime', 'scoutingStaffs', 'gmPersonalities', 'offseasonState',
  'draftClass', 'freeAgencyMarket', 'news', 'rosterStates', 'narrative',
] as const;
const V4_ROOT_KEYS = [...CORE_ROOT_KEYS, 'tradeState'] as const;
const V6_ROOT_KEYS = [...V4_ROOT_KEYS, 'rule5Session', 'rule5Obligations', 'rule5OfferBackStates'] as const;
const V7_ROOT_KEYS = [...V6_ROOT_KEYS, 'internationalScoutingState', 'draftState', 'minorLeagueState'] as const;
const V8_ROOT_KEYS = [...V7_ROOT_KEYS, 'coachingStaffs', 'coachFreeAgentPool'] as const;
const V10_ROOT_KEYS = [...V8_ROOT_KEYS, 'monthlyPulse'] as const;
const V11_ROOT_KEYS = [...V10_ROOT_KEYS, 'franchise', 'ceremony', 'achievements'] as const;
const V15_ROOT_KEYS = [...V11_ROOT_KEYS, 'performanceDiagnostics'] as const;
const LEGACY_NARRATIVE_KEYS = [
  'playerMorale', 'teamChemistry', 'ownerState', 'briefingQueue', 'storyFlags', 'rivalries', 'awardHistory', 'seasonHistory',
] as const;
const V5_NARRATIVE_KEYS = [...LEGACY_NARRATIVE_KEYS, 'hallOfFame', 'hallOfFameBallot', 'franchiseTimeline', 'careerStats'] as const;
const V12_NARRATIVE_KEYS = [...V5_NARRATIVE_KEYS, 'recordBook', 'recordWatch', 'seasonArchive', 'historicalPlayers', 'mentorRelationships', 'frontOfficeState'] as const;
const V13_NARRATIVE_KEYS = [...V12_NARRATIVE_KEYS, 'gmCareer', 'jobMarket', 'consequenceWatchers', 'fanSentiment', 'scoutConflicts', 'dynastyCards', 'challengeState'] as const;
const V14_NARRATIVE_KEYS = [...V13_NARRATIVE_KEYS, 'tickerFeed', 'playerStoryArcs', 'prospectBonds', 'playerOrigins', 'debutFlashbacks'] as const;
const V15_NARRATIVE_KEYS = [...V14_NARRATIVE_KEYS, 'archivedSeasons', 'whatIfBranches'] as const;
const SEASON_STATE_KEYS = ['season', 'currentDay', 'standings', 'playerSeasonStats', 'gameLog', 'completed'] as const;
const V7_MINOR_LEAGUE_KEYS = ['serviceTimeLedger', 'optionUsage', 'waiverClaims', 'affiliateStates', 'affiliateBoxScores'] as const;
const V8_MINOR_LEAGUE_KEYS = [
  ...V7_MINOR_LEAGUE_KEYS, 'processedDevelopmentMonths', 'developmentLedger', 'developmentReports', 'conversionRecommendations',
] as const;
const V14_MINOR_LEAGUE_KEYS = [...V8_MINOR_LEAGUE_KEYS, 'minorLeagueStatHistory', 'activeDevelopmentSetbacks'] as const;
// `35d436f` introduced the optional contract economics fields with the v8
// coaching snapshot.  Earlier writers only emitted the five foundation keys.
// Keep this table deliberately versioned so an early raw case cannot inherit a
// current contract and let the parser's permissive optional fields hide it.
const V2_TO_V7_CONTRACT_KEYS = ['years', 'annualSalary', 'noTradeClause', 'playerOption', 'teamOption'] as const;
const V8_TO_V15_CONTRACT_KEYS = [
  ...V2_TO_V7_CONTRACT_KEYS,
  'totalValue', 'noTradeClauseType', 'optOutYears', 'signingBonus', 'buyoutAmount', 'deferredMoney',
] as const;
const LEGACY_TRADE_KEYS = ['pendingOffers', 'tradeHistory'] as const;
const V7_DRAFT_KEYS = ['scoutingReports', 'signability', 'compensatoryPicks', 'pickOwnership', 'bigBoards'] as const;
const V8_TO_V15_DRAFT_KEYS = [...V7_DRAFT_KEYS, 'qualifyingOffers', 'signingDecisions'] as const;
const V11_FRANCHISE_KEYS = ['gmName', 'difficulty', 'createdAt', 'teamId', 'teamName', 'teamAbbreviation', 'teamDivision', 'onboarding'] as const;
const V12_FRANCHISE_KEYS = [...V11_FRANCHISE_KEYS, 'status', 'endedAt', 'endReason'] as const;
const V13_FRANCHISE_KEYS = [...V12_FRANCHISE_KEYS, 'playMode'] as const;
const FRANCHISE_ONBOARDING_KEYS = ['welcomeBriefingSeen', 'firstMonthlyPulseSeen'] as const;
// The version-introducing writers through initial v15 serialized the sim-core
// box score verbatim. `b7498f6` later changed the *still-v15* writer, so this
// matrix intentionally models the initial-v15 writer boundary used by the
// numbered v15 introduction commit (`577643c`), not that later same-version
// shape. The v16+ checked-in fixtures cover their own persisted era.
const INITIAL_V15_GAME_BOX_SCORE_KEYS = [
  'homeTeamId', 'awayTeamId', 'homeScore', 'awayScore', 'innings', 'homeHits', 'awayHits',
  'paResults', 'date', 'isPlayoff',
] as const;
const INITIAL_V15_PA_RESULT_KEYS = ['outcome', 'batterId', 'pitcherId'] as const;
// These interfaces are stable from the v2 writer through the initial v15
// writer. save.ts deliberately stores their inner values as unknown, so the
// matrix must fence them instead of inheriting current object keys wholesale.
const LEGACY_SCOUT_KEYS = ['id', 'name', 'quality', 'specialty', 'bias', 'salary'] as const;
const LEGACY_ROSTER_STATE_KEYS = ['teamId', 'mlbRoster', 'fortyManRoster', 'transactions'] as const;

function pickFields(source: MatrixRecord, keys: readonly string[]): MatrixRecord {
  return Object.fromEntries(keys.map((key) => [key, source[key]]));
}

function seededHistoricalSource(): MatrixRecord {
  legacyMatrixBase ??= exportGameSnapshot(createState());
  const source = cloneSnapshot(legacyMatrixBase) as MatrixRecord;
  const players = source.players as MatrixRecord[];
  const seasonState = source.seasonState as MatrixRecord;
  const playerSeasonStats = seasonState.playerSeasonStats as Array<[string, MatrixRecord]>;
  const player = players[0]!;
  const stats = playerSeasonStats[0]![1];

  player.rule5EligibleAfterSeason = 99;
  player.serviceTimeDays = 344;
  player.optionYearsUsed = 2;
  player.isOutOfOptions = true;
  player.contract = {
    ...(player.contract as MatrixRecord),
    totalValue: 36_000_000,
    noTradeClauseType: 'partial',
    optOutYears: [2],
    signingBonus: 750_000,
    buyoutAmount: 250_000,
    deferredMoney: [{ yearOffset: 3, amount: 1_250_000 }],
  };
  stats.pa = 123;
  stats.wins = 7;
  stats.losses = 3;
  (source.franchise as MatrixRecord).gmName = 'Historical Matrix GM';
  return source;
}

function historicalSeasonState(source: MatrixRecord, statKeys: readonly string[]): MatrixRecord {
  const seasonState = source.seasonState as MatrixRecord;
  const raw = pickFields(seasonState, SEASON_STATE_KEYS);
  raw.playerSeasonStats = (seasonState.playerSeasonStats as Array<[string, MatrixRecord]>).map(([playerId, stats]) => [
    playerId,
    pickFields(stats, statKeys),
  ]);
  raw.gameLog = (seasonState.gameLog as MatrixRecord[]).map((game) => ({
    ...pickFields(game, INITIAL_V15_GAME_BOX_SCORE_KEYS),
    paResults: (game.paResults as MatrixRecord[]).map((pa) => (
      pickFields(pa, INITIAL_V15_PA_RESULT_KEYS)
    )),
  }));
  return raw;
}

function historicalScoutingStaffs(source: MatrixRecord): Array<[string, MatrixRecord[]]> {
  return (source.scoutingStaffs as Array<[string, MatrixRecord[]]>).map(([teamId, staff]) => [
    teamId,
    staff.map((scout) => pickFields(scout, LEGACY_SCOUT_KEYS)),
  ]);
}

function historicalRosterStates(source: MatrixRecord): Array<[string, MatrixRecord]> {
  const rosterIds = (value: unknown): string[] => (
    Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string') : []
  );
  return (source.rosterStates as Array<[string, MatrixRecord]>).map(([teamId, roster]) => [
    teamId,
    {
      teamId: roster.teamId,
      mlbRoster: rosterIds(roster.mlbRoster),
      fortyManRoster: rosterIds(roster.fortyManRoster),
      // Day-one writer state has no transactions; retain rather than invent it.
      transactions: [...(roster.transactions as unknown[])],
    },
  ]);
}

function historicalRaw(
  version: number,
  rootKeys: readonly string[],
  narrativeKeys: readonly string[],
  playerKeys: readonly string[],
  statKeys: readonly string[],
): MatrixRecord {
  const source = seededHistoricalSource();
  const raw = pickFields(source, rootKeys);
  raw.schemaVersion = version;
  raw.players = (source.players as MatrixRecord[]).map((player) => pickFields(player, playerKeys));
  for (const player of raw.players as MatrixRecord[]) {
    player.contract = pickFields(
      player.contract as MatrixRecord,
      version <= 7 ? V2_TO_V7_CONTRACT_KEYS : V8_TO_V15_CONTRACT_KEYS,
    );
  }
  raw.seasonState = historicalSeasonState(source, statKeys);
  raw.scoutingStaffs = historicalScoutingStaffs(source);
  raw.rosterStates = historicalRosterStates(source);
  raw.narrative = pickFields(source.narrative as MatrixRecord, narrativeKeys);
  if (version >= 4) raw.tradeState = pickFields(raw.tradeState as MatrixRecord, LEGACY_TRADE_KEYS);
  if (version === 7) raw.draftState = pickFields(raw.draftState as MatrixRecord, V7_DRAFT_KEYS);
  if (version >= 8) raw.draftState = pickFields(raw.draftState as MatrixRecord, V8_TO_V15_DRAFT_KEYS);
  if (version >= 11) raw.franchise = pickFields(raw.franchise as MatrixRecord, version === 11 ? V11_FRANCHISE_KEYS : version === 12 ? V12_FRANCHISE_KEYS : V13_FRANCHISE_KEYS);
  return raw;
}

function buildV2Raw(): MatrixRecord {
  const raw = historicalRaw(2, CORE_ROOT_KEYS, LEGACY_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, LEGACY_STAT_KEYS);
  raw.narrative = {
    ...(raw.narrative as MatrixRecord),
    awardHistory: [{ season: 1, award: 'MVP', playerId: 'player-1', teamId: 'nym', summary: 'Historic season.' }],
    seasonHistory: [{ season: 1, championTeamId: 'nym', summary: 'Won the title.', awards: [], keyMoments: ['Won Game 6 at home.'] }],
  };
  return raw;
}
function buildV3Raw(): MatrixRecord { return historicalRaw(3, CORE_ROOT_KEYS, LEGACY_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, V8_STAT_KEYS); }
function buildV4Raw(): MatrixRecord { return historicalRaw(4, V4_ROOT_KEYS, LEGACY_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, V8_STAT_KEYS); }
function buildV5Raw(): MatrixRecord { return historicalRaw(5, V4_ROOT_KEYS, V5_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, V8_STAT_KEYS); }
function buildV6Raw(): MatrixRecord { return historicalRaw(6, V6_ROOT_KEYS, V5_NARRATIVE_KEYS, V6_PLAYER_KEYS, V8_STAT_KEYS); }
function buildV7Raw(): MatrixRecord {
  const raw = historicalRaw(7, V7_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V8_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V7_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV8Raw(): MatrixRecord {
  const raw = historicalRaw(8, V8_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V8_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V8_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV9Raw(): MatrixRecord {
  const raw = historicalRaw(9, V8_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V8_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV10Raw(): MatrixRecord {
  const raw = historicalRaw(10, V10_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V8_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV11Raw(): MatrixRecord {
  const raw = historicalRaw(11, V11_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V8_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV12Raw(): MatrixRecord {
  const raw = historicalRaw(12, V11_ROOT_KEYS, V12_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V8_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV13Raw(): MatrixRecord {
  const raw = historicalRaw(13, V11_ROOT_KEYS, V13_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V8_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV14Raw(): MatrixRecord {
  const raw = historicalRaw(14, V11_ROOT_KEYS, V14_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V14_MINOR_LEAGUE_KEYS);
  return raw;
}
function buildV15Raw(): MatrixRecord {
  const raw = historicalRaw(15, V15_ROOT_KEYS, V15_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS);
  raw.minorLeagueState = pickFields(raw.minorLeagueState as MatrixRecord, V14_MINOR_LEAGUE_KEYS);
  return raw;
}

function assertHistoricalRawShape(
  name: string,
  raw: unknown,
  rootKeys: readonly string[],
  narrativeKeys: readonly string[],
  playerKeys: readonly string[],
  statKeys: readonly string[],
): void {
  const snapshot = raw as MatrixRecord;
  expect(Object.keys(snapshot).sort(), `${name} must not retain future root fields`).toEqual([...rootKeys].sort());
  expect(Object.keys(snapshot.narrative as MatrixRecord).sort(), `${name} narrative shape`).toEqual([...narrativeKeys].sort());
  expect(Object.keys((snapshot.players as MatrixRecord[])[0]!).sort(), `${name} player shape`).toEqual([...playerKeys].sort());
  const version = snapshot.schemaVersion as number;
  expect(Object.keys(((snapshot.players as MatrixRecord[])[0]!.contract as MatrixRecord)).sort(), `${name} contract shape`).toEqual(
    [...(version <= 7 ? V2_TO_V7_CONTRACT_KEYS : V8_TO_V15_CONTRACT_KEYS)].sort(),
  );
  if (snapshot.tradeState) expect(Object.keys(snapshot.tradeState as MatrixRecord).sort(), `${name} trade shape`).toEqual([...LEGACY_TRADE_KEYS].sort());
  if (version === 7) expect(Object.keys(snapshot.draftState as MatrixRecord).sort(), `${name} draft shape`).toEqual([...V7_DRAFT_KEYS].sort());
  if (version >= 8) expect(Object.keys(snapshot.draftState as MatrixRecord).sort(), `${name} draft shape`).toEqual([...V8_TO_V15_DRAFT_KEYS].sort());
  if (version >= 11) {
    const franchiseKeys = version === 11 ? V11_FRANCHISE_KEYS : version === 12 ? V12_FRANCHISE_KEYS : V13_FRANCHISE_KEYS;
    expect(Object.keys(snapshot.franchise as MatrixRecord).sort(), `${name} franchise shape`).toEqual([...franchiseKeys].sort());
    expect(Object.keys((snapshot.franchise as MatrixRecord).onboarding as MatrixRecord).sort(), `${name} franchise onboarding shape`).toEqual(
      [...FRANCHISE_ONBOARDING_KEYS].sort(),
    );
  }
  if (version >= 7) {
    const minorLeagueKeys = version <= 13 ? V8_MINOR_LEAGUE_KEYS : V14_MINOR_LEAGUE_KEYS;
    if (version === 7) {
      expect(Object.keys(snapshot.minorLeagueState as MatrixRecord).sort(), `${name} minor-league shape`).toEqual([...V7_MINOR_LEAGUE_KEYS].sort());
    } else {
      expect(Object.keys(snapshot.minorLeagueState as MatrixRecord).sort(), `${name} minor-league shape`).toEqual([...minorLeagueKeys].sort());
    }
  }
  expect(Object.keys(snapshot.seasonState as MatrixRecord).sort(), `${name} season-state shape`).toEqual([...SEASON_STATE_KEYS].sort());
  const stats = ((snapshot.seasonState as MatrixRecord).playerSeasonStats as Array<[string, MatrixRecord]>)[0]![1];
  expect(Object.keys(stats).sort(), `${name} stat shape`).toEqual([...statKeys].sort());
  const gameLog = (snapshot.seasonState as MatrixRecord).gameLog as MatrixRecord[];
  expect(gameLog.length, `${name} must preserve a historical game`).toBeGreaterThan(0);
  for (const [gameIndex, game] of gameLog.entries()) {
    expect(Object.keys(game).sort(), `${name} game ${gameIndex} shape`).toEqual([...INITIAL_V15_GAME_BOX_SCORE_KEYS].sort());
    const paResults = game.paResults as MatrixRecord[];
    expect(paResults.length, `${name} game ${gameIndex} must preserve plate appearances`).toBeGreaterThan(0);
    for (const [paIndex, pa] of paResults.entries()) {
      expect(Object.keys(pa).sort(), `${name} game ${gameIndex} PA ${paIndex} shape`).toEqual([...INITIAL_V15_PA_RESULT_KEYS].sort());
    }
  }
  const scoutingStaffs = snapshot.scoutingStaffs as Array<[string, MatrixRecord[]]>;
  expect(scoutingStaffs.length, `${name} must preserve scouting staffs`).toBeGreaterThan(0);
  for (const [staffIndex, [teamId, staff]] of scoutingStaffs.entries()) {
    expect(typeof teamId, `${name} staff ${staffIndex} team key`).toBe('string');
    expect(staff.length, `${name} staff ${staffIndex} must preserve scouts`).toBeGreaterThan(0);
    for (const [scoutIndex, scout] of staff.entries()) {
      expect(Object.keys(scout).sort(), `${name} staff ${staffIndex} scout ${scoutIndex} shape`).toEqual([...LEGACY_SCOUT_KEYS].sort());
    }
  }
  const rosterStates = snapshot.rosterStates as Array<[string, MatrixRecord]>;
  expect(rosterStates.length, `${name} must preserve roster states`).toBeGreaterThan(0);
  for (const [rosterIndex, [teamId, roster]] of rosterStates.entries()) {
    expect(Object.keys(roster).sort(), `${name} roster ${rosterIndex} shape`).toEqual([...LEGACY_ROSTER_STATE_KEYS].sort());
    expect(teamId, `${name} roster ${rosterIndex} tuple/state team identity`).toBe(roster.teamId);
    expect((roster.mlbRoster as unknown[]).length, `${name} roster ${rosterIndex} MLB identity`).toBeGreaterThan(0);
    expect((roster.fortyManRoster as unknown[]).length, `${name} roster ${rosterIndex} 40-man identity`).toBeGreaterThan(0);
    expect((roster.mlbRoster as unknown[]).every((id) => typeof id === 'string'), `${name} roster ${rosterIndex} MLB IDs`).toBe(true);
    expect((roster.fortyManRoster as unknown[]).every((id) => typeof id === 'string'), `${name} roster ${rosterIndex} 40-man IDs`).toBe(true);
    expect(roster.transactions, `${name} roster ${rosterIndex} day-one transactions`).toEqual([]);
  }
}

/**
 * Preservation oracle deliberately compares facts from each raw historical
 * document with its migrated v34 result.  It complements (rather than
 * duplicates) normalized equality, so a migration that drops valid old facts
 * cannot pass merely because two later canonical exports are both empty.
 */
function assertHistoricalFactOracle(version: number, raw: unknown, migrated: GameSnapshot): void {
  const input = raw as MatrixRecord;
  const inputPlayer = (input.players as MatrixRecord[])[0]!;
  const migratedPlayer = migrated.players[0]!;
  const inputStats = ((input.seasonState as MatrixRecord).playerSeasonStats as Array<[string, MatrixRecord]>)[0]![1];
  const migratedStats = migrated.seasonState.playerSeasonStats[0]![1];

  expect(migratedPlayer.id, `v${version} player identity`).toBe(inputPlayer.id);
  expect(migratedPlayer.firstName, `v${version} player first name`).toBe(inputPlayer.firstName);
  expect(migratedPlayer.lastName, `v${version} player last name`).toBe(inputPlayer.lastName);
  expect(migratedPlayer.overallRating, `v${version} player rating`).toBe(inputPlayer.overallRating);
  expect(migratedPlayer.hitterAttributes, `v${version} hitter ratings`).toEqual(inputPlayer.hitterAttributes);
  expect(migratedStats.pa, `v${version} PA`).toBe(inputStats.pa);
  const inputGame = ((input.seasonState as MatrixRecord).gameLog as MatrixRecord[])[0]!;
  const migratedGame = (migrated.seasonState.gameLog as MatrixRecord[])[0]!;
  const inputGamePa = (inputGame.paResults as MatrixRecord[])[0]!;
  const migratedGamePa = (migratedGame.paResults as MatrixRecord[])[0]!;
  expect(migratedGame).toMatchObject({
    homeTeamId: inputGame.homeTeamId,
    awayTeamId: inputGame.awayTeamId,
    homeScore: inputGame.homeScore,
    awayScore: inputGame.awayScore,
    date: inputGame.date,
    isPlayoff: inputGame.isPlayoff,
  });
  expect(migratedGamePa).toMatchObject({
    outcome: inputGamePa.outcome,
    batterId: inputGamePa.batterId,
    pitcherId: inputGamePa.pitcherId,
  });
  const [inputScoutTeamId, inputStaff] = (input.scoutingStaffs as Array<[string, MatrixRecord[]]>)[0]!;
  const [migratedScoutTeamId, migratedStaff] = (migrated.scoutingStaffs as Array<[string, MatrixRecord[]]>)[0]!;
  const inputScout = inputStaff[0]!;
  const migratedScout = migratedStaff[0]!;
  expect(migratedScoutTeamId, `v${version} scout team identity`).toBe(inputScoutTeamId);
  expect(migratedScout, `v${version} scout facts`).toMatchObject({
    id: inputScout.id,
    name: inputScout.name,
    quality: inputScout.quality,
    specialty: inputScout.specialty,
    bias: inputScout.bias,
    salary: inputScout.salary,
  });
  const [inputRosterTeamId, inputRoster] = (input.rosterStates as Array<[string, MatrixRecord]>)[0]!;
  const [migratedRosterTeamId, migratedRoster] = (migrated.rosterStates as Array<[string, MatrixRecord]>)[0]!;
  expect(migratedRosterTeamId, `v${version} roster team identity`).toBe(inputRosterTeamId);
  expect(migratedRoster.teamId, `v${version} roster state identity`).toBe(inputRoster.teamId);
  expect((migratedRoster.mlbRoster as string[])[0], `v${version} representative MLB player`).toBe(
    (inputRoster.mlbRoster as string[])[0]!,
  );
  expect((migratedRoster.fortyManRoster as string[])[0], `v${version} representative 40-man player`).toBe(
    (inputRoster.fortyManRoster as string[])[0]!,
  );
  expect(migratedRoster.transactions, `v${version} day-one transactions`).toEqual([]);
  if (version >= 3) {
    expect(migratedStats.wins, `v${version} wins`).toBe(inputStats.wins);
    expect(migratedStats.losses, `v${version} losses`).toBe(inputStats.losses);
  }
  if (version >= 6) expect(migratedPlayer.rule5EligibleAfterSeason, `v${version} Rule 5`).toBe(99);
  if (version >= 7) {
    expect(migratedPlayer.serviceTimeDays, `v${version} service time`).toBe(344);
    expect(migratedPlayer.optionYearsUsed, `v${version} option years`).toBe(2);
    expect(migratedPlayer.isOutOfOptions, `v${version} out of options`).toBe(true);
  }
  if (version >= 8) {
    const inputContract = inputPlayer.contract as MatrixRecord;
    expect(migratedPlayer.contract).toMatchObject({
      years: inputContract.years,
      annualSalary: inputContract.annualSalary,
      totalValue: 36_000_000,
      noTradeClauseType: 'partial',
      optOutYears: [2],
      signingBonus: 750_000,
      buyoutAmount: 250_000,
      deferredMoney: [{ yearOffset: 3, amount: 1_250_000 }],
    });
  }
  expect(migrated.narrative.playerMorale, `v${version} narrative morale`).toEqual((input.narrative as MatrixRecord).playerMorale);
  if (version >= 11) expect(migrated.franchise.gmName, `v${version} franchise identity`).toBe('Historical Matrix GM');
}

function historicalCase(
  version: number,
  name: string,
  historicalRationale: string,
  build: () => MatrixRecord,
  rootKeys: readonly string[],
  narrativeKeys: readonly string[],
  playerKeys: readonly string[],
  statKeys: readonly string[],
): MatrixCase {
  return {
    version,
    name,
    historicalRationale,
    build,
    assertRawShape(raw) {
      assertHistoricalRawShape(name, raw, rootKeys, narrativeKeys, playerKeys, statKeys);
    },
  };
}

const HISTORICAL_MATRIX_CASES: MatrixCase[] = [
  historicalCase(2, 'v2 legacy narrative foundation', 'Initial persistence shape before trade and phase-state roots.', buildV2Raw, CORE_ROOT_KEYS, LEGACY_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, LEGACY_STAT_KEYS),
  historicalCase(3, 'v3 recap-era raw shape', 'Pre-trade root with the eight-lane narrative written by v3.', buildV3Raw, CORE_ROOT_KEYS, LEGACY_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, V8_STAT_KEYS),
  historicalCase(4, 'v4 trade root', 'Trade state arrives; narrative remains the eight-lane historical shape.', buildV4Raw, V4_ROOT_KEYS, LEGACY_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, V8_STAT_KEYS),
  historicalCase(5, 'v5 legacy history lanes', 'Hall/timeline/career narrative facts arrive before Rule 5.', buildV5Raw, V4_ROOT_KEYS, V5_NARRATIVE_KEYS, LEGACY_PLAYER_KEYS, V8_STAT_KEYS),
  historicalCase(6, 'v6 Rule 5 eligibility', 'Rule 5 roots and player eligibility arrive before international/coaching state.', buildV6Raw, V6_ROOT_KEYS, V5_NARRATIVE_KEYS, V6_PLAYER_KEYS, V8_STAT_KEYS),
  historicalCase(7, 'v7 international and minors foundation', 'International, draft, and compact minor-league state arrive.', buildV7Raw, V7_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V8_STAT_KEYS),
  historicalCase(8, 'v8 coaching and advanced stats', 'Coaching roots arrive with win/loss stat shape.', buildV8Raw, V8_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V8_STAT_KEYS),
  historicalCase(9, 'v9 pre-monthly-pulse', 'v8 roots remain; monthly pulse is historically absent.', buildV9Raw, V8_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
  historicalCase(10, 'v10 monthly pulse', 'Monthly pulse arrives before franchise/ceremony/achievements.', buildV10Raw, V10_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
  historicalCase(11, 'v11 franchise ceremony', 'Franchise/ceremony/achievement roots arrive before record lanes.', buildV11Raw, V11_ROOT_KEYS, V5_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
  historicalCase(12, 'v12 record and front-office history', 'Record, archive, and front-office narrative lanes arrive.', buildV12Raw, V11_ROOT_KEYS, V12_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
  historicalCase(13, 'v13 career and consequence state', 'GM career/job/consequence narrative lanes arrive.', buildV13Raw, V11_ROOT_KEYS, V13_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
  historicalCase(14, 'v14 prospect and ticker state', 'Ticker/prospect/debut narrative lanes arrive before archival v15.', buildV14Raw, V11_ROOT_KEYS, V14_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
  historicalCase(15, 'v15 archival and diagnostics', 'Archived-season/branch facts and diagnostics arrive; v16 moment lanes remain absent.', buildV15Raw, V15_ROOT_KEYS, V15_NARRATIVE_KEYS, V7_PLAYER_KEYS, V9_STAT_KEYS),
];

function createNarrativeSample(userTeamId: string) {
  const playerMorale = new Map<string, PlayerMorale>();
  const teamChemistry = new Map<string, TeamChemistry>();
  const ownerState = new Map<string, OwnerState>();
  const rivalries = new Map<string, Rivalry>();
  const briefingQueue: BriefingItem[] = [];
  const storyFlags = new Map<string, string[]>();

  playerMorale.set('player-1', {
    playerId: 'player-1',
    score: 61,
    trend: 'rising',
    summary: 'Responding well to recent promotion.',
    lastUpdated: 'S1D2',
  });

  teamChemistry.set(userTeamId, {
    teamId: userTeamId,
    score: 57,
    tier: 'steady',
    trend: 'rising',
    summary: 'Clubhouse is stabilizing after a strong week.',
    reasons: ['Winning streak', 'Healthy core'],
  });

  ownerState.set(userTeamId, {
    teamId: userTeamId,
    archetype: 'win_now',
    patience: 48,
    confidence: 55,
    hotSeat: true,
    summary: 'Owner expects immediate contention.',
    expectations: {
      winsTarget: 88,
      playoffTarget: true,
      payrollTarget: 210_000_000,
    },
  });

  rivalries.set(`${userTeamId}:bos`, {
    id: `${userTeamId}:bos`,
    teamA: userTeamId,
    teamB: 'bos',
    intensity: 63,
    summary: 'Division race tension is building.',
    reasons: ['Recent series split', 'Playoff position battle'],
  });

  briefingQueue.push({
    id: 'brief-1',
    priority: 2,
    category: 'owner',
    headline: 'Ownership is watching the payroll closely.',
    body: 'A strong month could cool the hot seat quickly.',
    relatedTeamIds: [userTeamId],
    relatedPlayerIds: [],
    timestamp: 'S1D2',
    acknowledged: false,
  });

  storyFlags.set(userTeamId, ['owner_hot_seat', 'wild_card_race']);

  const playerMoments = new Map<string, SignatureMoment[]>();
  playerMoments.set('player-1', [{
    season: 1,
    type: 'walk_off_hr',
    description: 'Player One ended the game with one swing.',
    impact: 65,
    relevance: 65,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
  }]);

  const teamMoments = new Map<string, SignatureMoment[]>();
  teamMoments.set(userTeamId, [{
    season: 1,
    day: 122,
    timestamp: 'S1D122',
    type: 'deadline_buyer',
    description: 'The front office pushed chips into the middle at the deadline.',
    impact: 24,
    relevance: 24,
    isPlayoff: false,
    isEliminationGame: false,
    worldSeriesClincher: false,
    round: null,
  }]);

  const playerNicknames = new Map<string, PlayerNicknameState>();
  playerNicknames.set('player-1', {
    seasonHistory: [{
      season: 1,
      age: 22,
      teamId: userTeamId,
      gamesPlayed: 158,
      pa: 690,
      hits: 205,
      hr: 24,
      battingWalks: 58,
      battingStrikeouts: 102,
      stolenBases: 33,
      saves: 0,
      blownSaves: 0,
      wins: 0,
      era: 0,
      pitchingStrikeouts: 0,
      injuryCount: 0,
      overallStart: 60,
      overallEnd: 67,
      wasOnMlbRoster: true,
      ledLeagueInStolenBases: true,
    }],
    earnedNicknames: [{
      id: 'the_flash',
      displayText: 'The Flash',
      priority: 7,
      triggerData: { seasonsMatched: 3 },
    }],
    primaryNickname: {
      id: 'the_flash',
      displayText: 'The Flash',
      priority: 7,
      triggerData: { seasonsMatched: 3 },
    },
    badgeNicknames: [],
  });

  const gmRelationships = new Map<string, GMRelationship>();
  gmRelationships.set('bos', {
    targetTeamId: 'bos',
    score: 12,
    tradeHistory: [{
      season: 1,
      surplusValue: 2.5,
      permanentMemory: false,
      description: 'Moved complementary pieces.',
    }],
    lastInteractionSeason: 1,
  });

  const leagueEvents: LeagueEvent[] = [{
    type: 'gm_firing',
    season: 1,
    month: 4,
    teamIds: ['bos'],
    playerIds: [],
    headline: 'Boston shakes up the front office',
    description: 'Boston moved on from its GM after a slow April.',
    gameplayEffect: 'Boston now has a reset trade baseline.',
    effectData: {
      kind: 'gm_reset',
      magnitude: 10,
      newPersonality: 'analytical',
    },
  }];

  return {
    playerMorale,
    teamChemistry,
    ownerState,
    briefingQueue,
    storyFlags,
    rivalries,
    tickerFeed: [] as TickerEntry[],
    playerMoments,
    teamMoments,
    playerNicknames,
    playerStoryArcs: [] as PlayerStoryArc[],
    prospectBonds: [] as ProspectBond[],
    gmRelationships,
    leagueEvents,
    playerOrigins: new Map<string, PlayerOrigin>(),
    debutFlashbacks: [] as DebutFlashback[],
    awardHistory: [],
    recordBook: [] as RecordBookEntry[],
    recordWatch: [] as RecordWatchEntry[],
    seasonArchive: [],
    archivedSeasons: [] as ArchivedSeason[],
    archivedGames: [] as ArchivedGameBoxScore[],
    historicalPlayers: [],
    mentorRelationships: [],
    frontOfficeState: new Map(),
    seasonHistory: [],
    whatIfBranches: [] as WhatIfBranchMeta[],
  };
}

function createState(): FullGameState {
  const rng = new GameRNG(42);
  const teamIds = TEAMS.map((team) => team.id);
  const players = generateLeaguePlayers(rng.fork(), teamIds);
  const schedule = generateSchedule(rng.fork());
  const seasonState = createSeasonState(1, teamIds);
  const dayOne = simulateDay(rng.fork(), seasonState, schedule, players);

  const serviceTime = new Map<string, number>();
  const scoutingStaffs = new Map();
  const gmPersonalities = new Map();
  const rosterStates = new Map();

  for (const teamId of teamIds) {
    scoutingStaffs.set(teamId, generateScoutingStaff(rng.fork(), teamId));
    gmPersonalities.set(teamId, assignGMPersonality(rng.fork(), teamId));
    rosterStates.set(teamId, buildRosterState(teamId, players));
  }

  for (const player of players) {
    if (player.rosterStatus === 'MLB') {
      serviceTime.set(player.id, 1);
      player.serviceTimeDays = 172;
    }
  }

  const narrative = createNarrativeSample('nym');

  return {
    rng,
    season: 1,
    day: dayOne.newState.currentDay,
    phase: 'regular',
    players,
    schedule,
    seasonState: dayOne.newState,
    userTeamId: 'nym',
    playoffBracket: null,
    injuries: new Map(),
    serviceTime,
    scoutingStaffs,
    gmPersonalities,
    offseasonState: null,
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
    draftClass: null,
    freeAgencyMarket: null,
    news: [],
    rosterStates,
    internationalScoutingState: {
      season: 1,
      ifaPool: [],
      budgets: new Map(),
      scoutingHistory: new Map(),
    },
    draftState: {
      scoutingReports: [],
      signability: [],
      qualifyingOffers: [],
      compensatoryPicks: [],
      pickOwnership: [],
      bigBoards: [],
      signingDecisions: [],
    },
    minorLeagueState: {
      serviceTimeLedger: [],
      optionUsage: [],
      waiverClaims: [],
      affiliateStates: [],
      affiliateBoxScores: [],
      minorLeagueStatHistory: [],
      activeDevelopmentSetbacks: [],
      processedDevelopmentMonths: [],
      developmentLedger: [],
      developmentReports: [],
      conversionRecommendations: [],
    },
    coachingStaffs: new Map(),
    coachFreeAgentPool: [],
    pendingExtensionNegotiations: new Map(),
    monthlyPulse: {
      pendingReport: null,
      decisionQueue: [],
    },
    ...narrative,
    playoffSeriesHistory: [],
    rookieOfTheYearVoting: [],
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
      negotiations: [],
      multiTeamPendingTrades: [],
    },
    hallOfFame: [],
    hallOfFameBallot: [],
    franchiseTimeline: [],
    careerStats: [],
    recordBook: narrative.recordBook,
    recordWatch: narrative.recordWatch,
    seasonArchive: narrative.seasonArchive,
    archivedGames: narrative.archivedGames,
    historicalPlayers: narrative.historicalPlayers,
    mentorRelationships: narrative.mentorRelationships,
    frontOfficeState: narrative.frontOfficeState,
    franchise: createDefaultFranchiseState('nym', 1, dayOne.newState.currentDay),
    gmCareer: initializeGMCareer(new GameRNG(99), 'nym', 'General Manager', 1),
    jobMarket: {
      availableJobs: [],
      applicationDeadlineSeason: null,
    },
    consequenceWatchers: [],
    fanSentiment: {
      score: 50,
      trend: 'stable',
      summary: 'Fan sentiment is stable.',
      updatedAt: `S1D${dayOne.newState.currentDay}`,
    },
    scoutConflicts: [],
    dynastyCards: [],
    challengeState: null,
    ceremony: createEmptyCeremonyState(),
    achievements: createEmptyAchievementState(),
    performanceDiagnostics: {
      totalSeasons: 1,
      snapshotSizeBytes: 0,
    },
  };
}

describe('snapshot helpers', () => {
  it('round-trips full game state without losing deterministic future state', () => {
    const original = createState();
    const candidate = original.players.find(
      (player) => player.teamId === 'bos' && player.rosterStatus === 'AA',
    )!;
    original.tickerFeed.push({
      id: 'ticker-1',
      timestamp: 'S1D2',
      category: 'score',
      text: 'Tycoons defeats Noreasters 5-3.',
      priority: 2,
      relatedTeamIds: ['nym', 'bos'],
      relatedPlayerIds: [candidate.id],
      expiresDay: 5,
    });
    original.playerStoryArcs.push({
      playerId: candidate.id,
      arcType: 'prospect_rise',
      startSeason: 1,
      startDay: 2,
      phase: 'setup',
      milestones: ['Drafted'],
      resolvedSeason: null,
    });
    original.prospectBonds.push({
      prospectId: candidate.id,
      draftedSeason: 1,
      debutSeason: null,
      currentLevel: 'AA',
      bondStrength: 25,
      milestones: ['Drafted Round 2, 1'],
      loyaltyModifier: 0.25,
    });
    original.playerOrigins.set(candidate.id, {
      playerId: candidate.id,
      originTeamId: 'bos',
      acquisitionType: 'draft',
      acquiredSeason: 1,
      draftSeason: 1,
      draftRound: 2,
      draftPickNumber: 42,
      originalGrade: 58,
      bonusAmount: null,
    });
    original.debutFlashbacks.push({
      playerId: candidate.id,
      playerName: `${candidate.firstName} ${candidate.lastName}`,
      draftSeason: 1,
      draftRound: 2,
      originalGrade: 58,
      debutSeason: 3,
      debutOverall: 61,
      journeyHighlights: ['Drafted', 'Reached AA'],
    });
    original.minorLeagueState.minorLeagueStatHistory = [[candidate.id, [{
      season: 1,
      level: 'AA',
      gamesPlayed: 54,
      pa: 220,
      hits: 63,
      hr: 9,
      rbi: 41,
      avg: 0.286,
      ip: 0,
      era: 0,
      k: 0,
      bb: 0,
    }]]];
    original.minorLeagueState.activeDevelopmentSetbacks = [{
      playerId: candidate.id,
      type: 'mental_block',
      overallModifier: -6,
      startSeason: 1,
      startMonth: 2,
      endSeason: 1,
      endMonth: 4,
      summary: 'Struggling with consistency.',
      active: true,
    }];

    candidate.rule5EligibleAfterSeason = original.season;
    original.rule5Session = createRule5Session({
      season: original.season,
      draftOrder: ['nym', 'bos'],
      players: original.players,
      rosterStates: original.rosterStates,
    });
    original.rule5Obligations = [
      {
        playerId: candidate.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nym',
        draftedAfterSeason: original.season,
        status: 'active',
      },
    ];
    original.rule5OfferBackStates = [
      {
        playerId: candidate.id,
        originalTeamId: 'bos',
        draftingTeamId: 'nym',
        status: 'pending',
      },
    ];
    original.archivedGames.push({
      id: 'archived-game-s1-d122-nym-bos-rivalry',
      season: 1,
      day: 122,
      date: 'S1D122',
      kind: 'rivalry',
      label: 'Rivalry Chapter',
      homeTeamId: 'nym',
      awayTeamId: 'bos',
      homeScore: 5,
      awayScore: 3,
      homeHits: 10,
      awayHits: 7,
      innings: 9,
      isPlayoff: false,
      round: null,
      gameNumber: null,
      winningPitcherId: 'pitcher-win',
      losingPitcherId: 'pitcher-loss',
      savePitcherId: null,
      teamIds: ['nym', 'bos'],
      playerIds: [candidate.id],
      teamNameFallbacks: { nym: 'New York Tycoons', bos: 'Boston Noreasters' },
      playerNameFallbacks: { [candidate.id]: `${candidate.firstName} ${candidate.lastName}` },
      lineScore: [
        { inning: 1, awayRuns: 1, homeRuns: 2 },
        { inning: 9, awayRuns: 0, homeRuns: 1 },
      ],
      highlights: [
        { inning: 9, halfInning: 'bottom', text: 'The Tycoons closed a rivalry classic.' },
      ],
      recap: 'The Tycoons beat Boston in a rivalry game worth saving.',
    });

    const snapshot = exportGameSnapshot(original);
    const restored = importGameSnapshot(snapshot);

    expect(snapshot.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect((snapshot as GameSnapshot & {
      monthlyPulse?: { pendingReport: null; decisionQueue: unknown[] };
    }).monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
    expect(snapshot.day).toBe(original.day);
    expect(snapshot.narrative.playerMorale).toHaveLength(1);
    expect(snapshot.narrative.teamChemistry).toHaveLength(1);
    expect(snapshot.narrative.ownerState).toHaveLength(1);
    expect(snapshot.narrative.briefingQueue).toHaveLength(1);
    expect(snapshot.narrative.storyFlags).toHaveLength(1);
    expect(snapshot.narrative.rivalries).toHaveLength(1);
    expect(snapshot.narrative.playerMoments).toHaveLength(1);
    expect(snapshot.narrative.teamMoments).toHaveLength(1);
    expect(snapshot.narrative.playerNicknames).toHaveLength(1);
    expect(snapshot.narrative.gmRelationships).toHaveLength(1);
    expect(snapshot.narrative.leagueEvents).toHaveLength(1);
    expect(snapshot.narrative.recordBook).toEqual([]);
    expect(snapshot.narrative.recordWatch).toEqual([]);
    expect(snapshot.narrative.seasonArchive).toEqual([]);
    expect(snapshot.narrative.archivedGames).toHaveLength(1);
    expect(snapshot.narrative.historicalPlayers).toEqual([]);
    expect(snapshot.narrative.mentorRelationships).toEqual([]);
    expect(snapshot.narrative.frontOfficeState).toEqual([]);
    expect(snapshot.rule5Session).toBeTruthy();
    expect(snapshot.rule5Obligations).toHaveLength(1);
    expect(snapshot.rule5OfferBackStates).toHaveLength(1);

    expect(restored.userTeamId).toBe(original.userTeamId);
    expect(restored.day).toBe(original.day);
    expect(restored.seasonState.currentDay).toBe(original.seasonState.currentDay);
    expect(restored.rng.nextInt(0, 10_000)).toBe(original.rng.nextInt(0, 10_000));
    expect(restored.teamChemistry.get('nym')?.score).toBe(57);
    expect(restored.ownerState.get('nym')?.hotSeat).toBe(true);
    expect(restored.briefingQueue[0]?.headline).toContain('Ownership');
    expect(restored.storyFlags.get('nym')).toContain('owner_hot_seat');
    expect(restored.rivalries.get('nym:bos')?.intensity).toBe(63);
    expect(restored.playerMoments.get('player-1')?.[0]?.type).toBe('walk_off_hr');
    expect(restored.teamMoments.get('nym')?.[0]?.type).toBe('deadline_buyer');
    expect(restored.playerNicknames.get('player-1')?.primaryNickname?.id).toBe('the_flash');
    expect(restored.gmRelationships.get('bos')?.score).toBe(12);
    expect(restored.leagueEvents[0]?.type).toBe('gm_firing');
    expect(restored.recordBook).toEqual([]);
    expect(restored.recordWatch).toEqual([]);
    expect(restored.seasonArchive).toEqual([]);
    expect(restored.archivedGames[0]).toMatchObject({
      id: 'archived-game-s1-d122-nym-bos-rivalry',
      kind: 'rivalry',
      homeTeamId: 'nym',
      awayTeamId: 'bos',
    });
    expect(restored.historicalPlayers).toEqual([]);
    expect(restored.mentorRelationships).toEqual([]);
    expect(restored.frontOfficeState.size).toBe(0);
    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
    expect(restored.tradeState.negotiations).toEqual([]);
    expect(restored.tradeState.multiTeamPendingTrades).toEqual([]);
    expect((restored as FullGameState & {
      monthlyPulse: { pendingReport: null; decisionQueue: unknown[] };
    }).monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
    expect(restored.rule5Session?.phase).toBe('protection_audit');
    expect(restored.rule5Obligations[0]?.status).toBe('active');
    expect(restored.rule5OfferBackStates[0]?.status).toBe('pending');
    expect(restored.tickerFeed[0]?.id).toBe('ticker-1');
    expect(restored.playerStoryArcs[0]?.playerId).toBe(candidate.id);
    expect(restored.prospectBonds[0]?.prospectId).toBe(candidate.id);
    expect(restored.playerOrigins.get(candidate.id)?.draftRound).toBe(2);
    expect(restored.debutFlashbacks[0]?.playerId).toBe(candidate.id);
    expect(restored.minorLeagueState.minorLeagueStatHistory[0]?.[0]).toBe(candidate.id);
    expect(restored.minorLeagueState.activeDevelopmentSetbacks[0]?.playerId).toBe(candidate.id);
  });

  it('migrates v16 snapshots into the current narrative, trade, and arbitration shape', () => {
    const exported = exportGameSnapshot(createState()) as GameSnapshot & {
      schemaVersion: number;
      narrative: Omit<GameSnapshot['narrative'], 'playerMoments' | 'playerNicknames' | 'gmRelationships' | 'leagueEvents'> & {
        playerMoments?: unknown;
        playerNicknames?: unknown;
        gmRelationships?: unknown;
        leagueEvents?: unknown;
      };
      tradeState: Omit<GameSnapshot['tradeState'], 'negotiations' | 'multiTeamPendingTrades'> & {
        negotiations?: unknown;
        multiTeamPendingTrades?: unknown;
      };
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 16,
      narrative: {
        ...exported.narrative,
        playerMoments: undefined,
        playerNicknames: undefined,
        gmRelationships: undefined,
        leagueEvents: undefined,
      },
      tradeState: {
        ...exported.tradeState,
        negotiations: undefined,
        multiTeamPendingTrades: undefined,
      },
    });

    expect(restored.playerMoments).toEqual(new Map());
    expect(restored.playerNicknames).toEqual(new Map());
    expect(restored.gmRelationships.size).toBe(TEAMS.length - 1);
    expect(restored.leagueEvents).toEqual([]);
    expect(restored.tradeState.negotiations).toEqual([]);
    expect(restored.tradeState.multiTeamPendingTrades).toEqual([]);
  });

  it('imports contract-backed v18-v33 snapshots through the worker migration path', () => {
    for (const version of [18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33]) {
      const restored = importGameSnapshot(loadContractSaveFixture(version));

      expect(restored.season).toBeGreaterThan(0);
      expect(restored.userTeamId).toBe('nym');
      expect(exportGameSnapshot(restored).schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
      expect(restored.archivedGames).toEqual([]);
    }
  });

  it('migrates v14 snapshots into the v15 archive and diagnostics shape', () => {
    const snapshot = exportGameSnapshot(createState()) as unknown as {
      schemaVersion: number;
      season: number;
      narrative: {
        seasonArchive: GameSnapshot['narrative']['seasonArchive'];
      };
    };
    snapshot.schemaVersion = 14;
    snapshot.season = 25;
    snapshot.narrative.seasonArchive = Array.from({ length: 14 }, (_, index) => ({
      season: index + 1,
      standings: [
        {
          teamId: 'nym',
          wins: 90,
          losses: 72,
          divisionRank: 1,
          gamesBack: 0,
        },
      ],
      playoffSeries: [
        {
          round: 'World Series',
          winnerTeamId: 'nym',
          loserTeamId: 'lax',
          result: '4-2',
        },
      ],
      awards: [
        {
          season: index + 1,
          award: 'MVP',
          league: 'MLB',
          playerId: `mvp-${index + 1}`,
          teamId: 'nym',
          summary: 'Won MVP',
        },
      ],
      statLeaders: {
        hr: [{ playerId: 'slugger', teamId: 'nym', value: '42', summary: 'Slugger hit 42 HR.' }],
        rbi: [],
        avg: [],
        era: [],
        k: [],
        w: [],
      },
      transactions: [],
      draftClass: [],
      financials: [],
      userSummary: {
        teamId: 'nym',
        record: '90-72',
        playoffResult: 'Won World Series',
        storylines: ['Title run'],
      },
      timelineEvents: ['Won the title'],
    }));

    const restored = importGameSnapshot(snapshot);

    expect(restored.archivedSeasons.length).toBeGreaterThan(0);
    expect(restored.whatIfBranches).toEqual([]);
    expect(restored.performanceDiagnostics.totalSeasons).toBe(25);
    expect(restored.performanceDiagnostics.snapshotSizeBytes).toBeGreaterThan(0);
    expect(restored.seasonArchive).toEqual([]);
    expect(restored.archivedSeasons[0]).toMatchObject({
      season: 1,
      championshipWon: true,
      championTeamId: 'nym',
    });
  });

  it('migrates v9 snapshots into the v10 monthly pulse shape', () => {
    const original = createState();
    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
      monthlyPulse?: unknown;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 9,
      monthlyPulse: undefined,
    });

    expect((restored as FullGameState & {
      monthlyPulse: { pendingReport: null; decisionQueue: unknown[] };
    }).monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
  });

  it('migrates v10 snapshots into the v11 franchise, ceremony, and achievement shape', () => {
    const original = createState();
    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
      franchise?: unknown;
      ceremony?: unknown;
      achievements?: unknown;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 10,
      franchise: undefined,
      ceremony: undefined,
      achievements: undefined,
    });

    expect(restored.franchise.gmName).toBe('General Manager');
    expect(restored.ceremony.pendingMoments).toEqual([]);
    expect(restored.ceremony.seenMomentIds).toEqual([]);
    expect(restored.achievements.unlocked).toEqual([]);
  });

  it('migrates v11 snapshots into the v12 record and historical state shape', () => {
    const original = createState();
    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 11,
    });

    expect(restored.recordBook.length).toBeGreaterThan(0);
    expect(restored.recordWatch).toEqual([]);
    expect(restored.seasonArchive).toEqual([]);
    expect(restored.historicalPlayers.length).toBeGreaterThan(0);
    expect(restored.mentorRelationships).toEqual([]);
    expect(restored.frontOfficeState.size).toBe(0);
  });

  it('round-trips wave-4 persisted-state fields through snapshot export/import', () => {
    const original = createState();
    const hitter = original.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes == null,
    )!;
    const pitcher = original.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'MLB' && player.pitcherAttributes != null,
    )!;

    hitter.teamTenures = [{ teamId: 'nym', startSeason: 1, endSeason: null }];
    hitter.priorSeasonGamesMissed = 61;
    pitcher.careerShutouts = 99;
    original.seasonState.playerSeasonStats.set(hitter.id, {
      playerId: hitter.id,
      teamId: hitter.teamId,
      gamesPlayed: 0,
      pa: 0,
      ab: 0,
      hits: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
      k: 0,
      runs: 0,
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
      saves: 0,
      losses: 0,
      gamesMissedToInjury: 61,
    });
    original.seasonState = {
      ...original.seasonState,
      monthlyRecordSplits: {
        nym: {
          9: { wins: 22, losses: 6 },
        },
      },
    };
    original.playoffBracket = {
      seeds: [
        { teamId: 'nym', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        { teamId: 'lax', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
      ],
      currentRound: 'WORLD_SERIES',
      currentRoundSeries: [{
        id: 'WS-1',
        round: 'WORLD_SERIES',
        league: 'MLB',
        bestOf: 7,
        higherSeed: { teamId: 'lax', seed: 1, wins: 97, losses: 65, league: 'NL', divisionWinner: true },
        lowerSeed: { teamId: 'nym', seed: 1, wins: 99, losses: 63, league: 'AL', divisionWinner: true },
        games: [],
        higherSeedWins: 3,
        lowerSeedWins: 2,
        leaderSummary: 'LAX leads 3-2',
        status: 'in_progress',
        deficitReached: '1-3',
        deficitTeamId: 'nym',
        winnerId: null,
        loserId: null,
      }],
      completedRounds: [],
      series: [],
      champion: null,
      runnerUp: null,
    };
    original.playoffSeriesHistory = [{
      season: 1,
      round: 'CHAMPIONSHIP_SERIES',
      higherSeedTeamId: 'lax',
      lowerSeedTeamId: 'nym',
      bestOf: 7,
      deficitReached: '1-3',
      deficitTeamId: 'nym',
      winnerTeamId: 'nym',
    }];
    original.rookieOfTheYearVoting = [{
      season: 1,
      leagueId: 'AL',
      placements: [{ rank: 2, playerId: hitter.id, points: 42.5 }],
    }];

    const snapshot = exportGameSnapshot(original);
    const restored = importGameSnapshot(snapshot);
    const restoredHitter = restored.players.find((player) => player.id === hitter.id)!;
    const restoredPitcher = restored.players.find((player) => player.id === pitcher.id)!;

    expect(snapshot.players.find((player) => player.id === hitter.id)?.teamTenures).toEqual([
      { teamId: 'nym', startSeason: 1, endSeason: null },
    ]);
    expect(snapshot.players.find((player) => player.id === hitter.id)?.priorSeasonGamesMissed).toBe(61);
    expect(snapshot.players.find((player) => player.id === pitcher.id)?.careerShutouts).toBe(99);
    expect(snapshot.seasonState.playerSeasonStats.find(([playerId]) => playerId === hitter.id)?.[1].gamesMissedToInjury).toBe(61);
    expect(snapshot.seasonState.monthlyRecordSplits).toEqual({
      nym: {
        9: { wins: 22, losses: 6 },
      },
    });
    expect(snapshot.narrative.playoffSeriesHistory).toEqual([{
      season: 1,
      round: 'CHAMPIONSHIP_SERIES',
      higherSeedTeamId: 'lax',
      lowerSeedTeamId: 'nym',
      bestOf: 7,
      deficitReached: '1-3',
      deficitTeamId: 'nym',
      winnerTeamId: 'nym',
    }]);
    expect(snapshot.narrative.rookieOfTheYearVoting).toEqual([{
      season: 1,
      leagueId: 'AL',
      placements: [{ rank: 2, playerId: hitter.id, points: 42.5 }],
    }]);

    expect(restoredHitter.teamTenures).toEqual([{ teamId: 'nym', startSeason: 1, endSeason: null }]);
    expect(restoredHitter.priorSeasonGamesMissed).toBe(61);
    expect(restoredPitcher.careerShutouts).toBe(99);
    expect(restored.seasonState.playerSeasonStats.get(hitter.id)?.gamesMissedToInjury).toBe(61);
    expect(restored.seasonState.monthlyRecordSplits).toEqual({
      nym: {
        9: { wins: 22, losses: 6 },
      },
    });
    expect(restored.playoffBracket?.currentRoundSeries[0]?.deficitReached).toBe('1-3');
    expect(restored.playoffBracket?.currentRoundSeries[0]?.deficitTeamId).toBe('nym');
    expect(restored.playoffSeriesHistory).toEqual([{
      season: 1,
      round: 'CHAMPIONSHIP_SERIES',
      higherSeedTeamId: 'lax',
      lowerSeedTeamId: 'nym',
      bestOf: 7,
      deficitReached: '1-3',
      deficitTeamId: 'nym',
      winnerTeamId: 'nym',
    }]);
    expect(restored.rookieOfTheYearVoting).toEqual([{
      season: 1,
      leagueId: 'AL',
      placements: [{ rank: 2, playerId: hitter.id, points: 42.5 }],
    }]);
  });

  it('migrates v12 snapshots into the v13 career and replayability state shape', () => {
    const original = createState();
    original.season = 4;
    original.franchiseTimeline = [
      {
        season: 1,
        teamId: 'nym',
        record: '81-81',
        winTotal: 81,
        playoffResult: 'Missed playoffs',
        championship: false,
        worldSeriesAppearance: false,
        playoffAppearance: false,
        divisionTitle: false,
        awardWinnerCount: 0,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 10,
      },
      {
        season: 2,
        teamId: 'nym',
        record: '93-69',
        winTotal: 93,
        playoffResult: 'World Series champion',
        championship: true,
        worldSeriesAppearance: true,
        playoffAppearance: true,
        divisionTitle: true,
        awardWinnerCount: 2,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 35,
      },
      {
        season: 3,
        teamId: 'nym',
        record: '88-74',
        winTotal: 88,
        playoffResult: 'Division Series exit',
        championship: false,
        worldSeriesAppearance: false,
        playoffAppearance: true,
        divisionTitle: false,
        awardWinnerCount: 1,
        keyAcquisitions: [],
        keyDepartures: [],
        dynastyScore: 42,
      },
    ];
    const userRecord = original.seasonState.standings.getRecord('nym');
    if (!userRecord) {
      throw new Error('Expected user record');
    }
    userRecord.wins = 76;
    userRecord.losses = 54;

    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 12,
    });

    expect(restored.franchise.playMode).toBe('standard');
    expect(restored.gmCareer.currentTeamId).toBe('nym');
    expect(restored.gmCareer.overallRecord).toEqual({ wins: 338, losses: 278 });
    expect(restored.gmCareer.championships).toBe(1);
    expect(restored.jobMarket.availableJobs).toEqual([]);
    expect(restored.consequenceWatchers).toEqual([]);
    expect(restored.scoutConflicts).toEqual([]);
    expect(restored.dynastyCards).toEqual([]);
    expect(restored.challengeState).toBeNull();
  });

  it('migrates v13 snapshots into the v14 narrative ticker and farm-depth state shape', () => {
    const original = createState();
    original.season = 4;
    const draftedProspect = original.players.find(
      (player) => player.teamId === 'nym' && player.rosterStatus === 'AA',
    )!;
    original.seasonArchive = [
      {
        season: 3,
        standings: [],
        playoffSeries: [],
        awards: [],
        statLeaders: {
          hr: [],
          rbi: [],
          avg: [],
          era: [],
          k: [],
          w: [],
        },
        transactions: [],
        draftClass: [{
          pickNumber: 42,
          playerId: draftedProspect.id,
          playerName: `${draftedProspect.firstName} ${draftedProspect.lastName}`,
          teamId: 'nym',
          currentStatus: 'AA',
        }],
        financials: [],
        userSummary: null,
        timelineEvents: [],
      },
    ];

    const exported = exportGameSnapshot(original) as GameSnapshot & {
      schemaVersion: number;
      narrative: Record<string, unknown>;
      minorLeagueState: Record<string, unknown>;
    };

    const restored = importGameSnapshot({
      ...exported,
      schemaVersion: 13,
      narrative: {
        ...exported.narrative,
        tickerFeed: undefined,
        playerStoryArcs: undefined,
        prospectBonds: undefined,
        playerOrigins: undefined,
        debutFlashbacks: undefined,
      },
      minorLeagueState: {
        ...exported.minorLeagueState,
        minorLeagueStatHistory: undefined,
        activeDevelopmentSetbacks: undefined,
      },
    });

    expect(restored.tickerFeed).toEqual([]);
    expect(restored.playerStoryArcs).toEqual([]);
    expect(restored.debutFlashbacks).toEqual([]);
    expect(restored.minorLeagueState.minorLeagueStatHistory).toEqual([]);
    expect(restored.minorLeagueState.activeDevelopmentSetbacks).toEqual([]);
    expect(restored.playerOrigins.get(draftedProspect.id)).toMatchObject({
      playerId: draftedProspect.id,
      originTeamId: 'nym',
      acquisitionType: 'draft',
      draftSeason: 3,
      draftRound: 2,
      draftPickNumber: 42,
      originalGrade: null,
    });
    expect(restored.prospectBonds.find((bond) => bond.prospectId === draftedProspect.id)).toMatchObject({
      prospectId: draftedProspect.id,
      draftedSeason: 3,
      currentLevel: 'AA',
      bondStrength: 30,
      loyaltyModifier: 0.3,
    });
  });

  it('does not persist pending extension negotiations in snapshots', () => {
    const original = createState();
    original.pendingExtensionNegotiations.set('player-1', {
      playerId: 'player-1',
      targetContract: {
        years: 5,
        annualSalary: 20,
        totalValue: 100,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: false,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
      counterOffer: null,
      rounds: [],
    });

    const snapshot = exportGameSnapshot(original);
    const restored = importGameSnapshot(snapshot);

    expect('pendingExtensionNegotiations' in snapshot).toBe(false);
    expect(restored.pendingExtensionNegotiations.size).toBe(0);
  });

  it('migrates v7 snapshots into the v8 staff and development shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const mlbPlayer = snapshot.players.find((player) => player.rosterStatus === 'MLB')!;
    const minorLeaguer = snapshot.players.find((player) => player.rosterStatus === 'AA')!;
    const v7Snapshot = {
      ...snapshot,
      schemaVersion: 7,
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v7Snapshot);
    const restoredMLBPlayer = restored.players.find((player) => player.id === mlbPlayer.id)!;
    const restoredMinorLeaguer = restored.players.find((player) => player.id === minorLeaguer.id)!;

    expect(restoredMLBPlayer.serviceTimeDays).toBe(172);
    expect(restoredMLBPlayer.optionYearsUsed).toBe(0);
    expect(restoredMLBPlayer.isOutOfOptions).toBe(false);
    expect(restoredMinorLeaguer.minorLeagueLevel).toBe(minorLeaguer.rosterStatus);
    expect(restored.coachingStaffs.get('nym')).toHaveLength(12);
    expect(restored.coachFreeAgentPool.length).toBeGreaterThan(0);
    expect(restored.minorLeagueState.processedDevelopmentMonths).toEqual([]);
  });

  it('migrates v8 snapshots into the v9 advanced stat shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const [playerId, playerStats] = snapshot.seasonState.playerSeasonStats[0]!;
    const v8Snapshot = {
      ...snapshot,
      schemaVersion: 8,
      seasonState: {
        ...snapshot.seasonState,
        playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(([entryPlayerId, entryStats]) => [
          entryPlayerId,
          {
            pa: entryStats.pa,
            ab: entryStats.ab,
            hits: entryStats.hits,
            doubles: entryStats.doubles,
            triples: entryStats.triples,
            hr: entryStats.hr,
            rbi: entryStats.rbi,
            bb: entryStats.bb,
            k: entryStats.k,
            runs: entryStats.runs,
            ip: entryStats.ip,
            earnedRuns: entryStats.earnedRuns,
            strikeouts: entryStats.strikeouts,
            walks: entryStats.walks,
            hitsAllowed: entryStats.hitsAllowed,
            wins: entryStats.wins,
            losses: entryStats.losses,
          },
        ]),
      },
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v8Snapshot);
    const migrated = restored.seasonState.playerSeasonStats.get(playerId);

    expect(migrated?.hbp).toBe(0);
    expect(migrated?.sacFlies).toBe(0);
    expect(migrated?.homeRunsAllowed).toBe(0);
    expect(migrated?.hitBatters).toBe(0);
    expect(migrated?.flyBallsAllowed).toBe(0);
    expect(playerStats.hbp).toBeDefined();
  });

  it('migrates v2 snapshots into the v5 narrative, stat, trade, and legacy shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const v2Snapshot = {
      ...snapshot,
      schemaVersion: 2,
      seasonState: {
        ...snapshot.seasonState,
        playerSeasonStats: snapshot.seasonState.playerSeasonStats.map(([playerId, stats]) => [
          playerId,
          {
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
            ip: stats.ip,
            earnedRuns: stats.earnedRuns,
            strikeouts: stats.strikeouts,
            walks: stats.walks,
            hitsAllowed: stats.hitsAllowed,
          },
        ]),
      },
      narrative: {
        ...snapshot.narrative,
        awardHistory: [
          {
            season: 1,
            award: 'MVP',
            playerId: 'player-1',
            teamId: 'nym',
            summary: 'Historic season.',
          },
        ],
        seasonHistory: [
          {
            season: 1,
            championTeamId: 'nym',
            summary: 'Won the title.',
            awards: [],
            keyMoments: ['Won Game 6 at home.'],
          },
        ],
      },
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v2Snapshot);

    const migratedStats = restored.seasonState.playerSeasonStats.get(
      restored.seasonState.playerSeasonStats.keys().next().value as string,
    );
    expect(migratedStats?.wins).toBe(0);
    expect(migratedStats?.losses).toBe(0);
    expect(restored.awardHistory[0]?.league).toBe('MLB');
    expect(restored.seasonHistory[0]?.runnerUpTeamId).toBeNull();
    expect(restored.seasonHistory[0]?.statLeaders.hr).toEqual([]);
    expect(restored.hallOfFame).toEqual([]);
    expect(restored.franchiseTimeline).toEqual([]);
    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
  });

  it('migrates v3 snapshots into the v5 trade and legacy state shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const v3Snapshot = {
      ...snapshot,
      schemaVersion: 3,
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v3Snapshot);

    expect(restored.tradeState.pendingOffers).toEqual([]);
    expect(restored.tradeState.tradeHistory).toEqual([]);
    expect(restored.hallOfFameBallot).toEqual([]);
  });

  it('migrates v4 snapshots into the v6 legacy and rule5 state shape', () => {
    const snapshot = exportGameSnapshot(createState());
    const v4Snapshot = {
      ...snapshot,
      schemaVersion: 4,
      narrative: {
        playerMorale: [],
        teamChemistry: [],
        ownerState: [],
        briefingQueue: [],
        storyFlags: [],
        rivalries: [],
        awardHistory: [],
        seasonHistory: [],
      },
    } as unknown as GameSnapshot;

    const restored = importGameSnapshot(v4Snapshot);

    expect(restored.hallOfFame).toEqual([]);
    expect(restored.hallOfFameBallot).toEqual([]);
    expect(restored.franchiseTimeline).toEqual([]);
    expect(restored.careerStats).toEqual([]);
    expect(restored.rule5Session).toBeNull();
    expect(restored.rule5Obligations).toEqual([]);
    expect(restored.rule5OfferBackStates).toEqual([]);
  });

  it('round-trips every declared supported schema through worker and canonical JSON paths', () => {
    const supportedVersions = Array.from(
      { length: CURRENT_GAME_SNAPSHOT_VERSION - MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION + 1 },
      (_, index) => MINIMUM_SUPPORTED_GAME_SNAPSHOT_VERSION + index,
    );
    const fixtureCases: MatrixCase[] = supportedVersions
      .filter((version) => version >= 16)
      .map((version) => ({
        version,
        name: `v${version} persisted contract fixture`,
        historicalRationale: 'Checked-in canonical contract fixture.',
        build: () => loadContractSaveFixture(version),
        assertRawShape: () => {},
      }));
    const matrix = [...HISTORICAL_MATRIX_CASES, ...fixtureCases];

    expect(matrix).toHaveLength(33);
    expect(matrix.map(({ version }) => version)).toEqual(supportedVersions);

    for (const entry of matrix) {
      const raw = entry.build();
      expect(entry.historicalRationale, `${entry.name} source rationale`).not.toBe('');
      expect(Number.isInteger((raw as { schemaVersion?: unknown }).schemaVersion), `${entry.name} raw schemaVersion integer`).toBe(true);
      expect((raw as { schemaVersion?: unknown }).schemaVersion, `${entry.name} row/input binding`).toBe(entry.version);
      entry.assertRawShape(raw);

      const normalizedWorkerSnapshot = exportGameSnapshot(importGameSnapshot(raw));
      expect(normalizedWorkerSnapshot, `${entry.name} shared materialization oracle`).toEqual(
        materializeSimulationImportDefaults(parseGameSnapshot(raw)),
      );
      assertVersionSpecificNormalization(entry.version, normalizedWorkerSnapshot);
      if (entry.version <= 15) assertHistoricalFactOracle(entry.version, raw, normalizedWorkerSnapshot);

      const exportedJson = exportSnapshotToJson(`Schema ${entry.version} ${entry.name}`, normalizedWorkerSnapshot);
      const importedJson = importSnapshotFromJson(exportedJson);
      const rehydratedWorkerSnapshot = exportGameSnapshot(importGameSnapshot(importedJson.snapshot));
      const reexportedJson = exportSnapshotToJson(`Schema ${entry.version} ${entry.name}`, rehydratedWorkerSnapshot);
      const canonicalExport = JSON.parse(exportedJson) as { exportedAt?: string; snapshot: unknown };
      const canonicalReexport = JSON.parse(reexportedJson) as { exportedAt?: string; snapshot: unknown };
      delete canonicalExport.exportedAt;
      delete canonicalReexport.exportedAt;

      expect(importedJson.snapshot).toEqual(normalizedWorkerSnapshot);
      expect(rehydratedWorkerSnapshot).toEqual(normalizedWorkerSnapshot);
      expect(canonicalReexport).toEqual(canonicalExport);
    }
  });

  it('preserves the Season 10 v33 boundary without fabricating archived games through canonical JSON', () => {
    const parsedSnapshot = parseGameSnapshot(loadContractSaveFixture(33, 'season10'));
    const normalizedWorkerSnapshot = exportGameSnapshot(
      importGameSnapshot(parsedSnapshot),
    );
    const imported = importSnapshotFromJson(exportSnapshotToJson('Season 10 v33', normalizedWorkerSnapshot));

    expect(normalizedWorkerSnapshot.season).toBe(10);
    expect(normalizedWorkerSnapshot).toEqual(materializeSimulationImportDefaults(parsedSnapshot));
    expect(normalizedWorkerSnapshot.narrative.archivedGames).toEqual([]);
    expect(imported.snapshot).toEqual(normalizedWorkerSnapshot);
  });

  it('rejects unsupported snapshot schema versions', () => {
    const snapshot = exportGameSnapshot(createState());
    const badSnapshot = {
      ...snapshot,
      schemaVersion: 999,
    } as unknown as GameSnapshot;

    expect(() => importGameSnapshot(badSnapshot)).toThrow(/schema/i);
  });
});
