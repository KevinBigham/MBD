// @vitest-environment node

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  CURRENT_GAME_SNAPSHOT_VERSION,
  type GameSnapshot,
} from '@mbd/contracts';
import {
  buildSaveRecord,
  clearAllSaves,
  createBranchSave,
  createAutoSaveScheduler,
  deleteSaveById,
  db,
  exportSnapshotToJson,
  flushAutoSaveQueueForTesting,
  importSnapshotFromJson,
  inspectSave,
  inspectSaveById,
  loadGame,
  loadGameSafe,
  listBranches,
  listSaveTree,
  normalizeLoadedSaveRecord,
  repairSave,
  saveGame,
  saveGameById,
  scheduleAutoSave,
} from './saveSystem';
import {
  clearPerformanceMetrics,
  getLatestPerformanceMetric,
} from './performance';

function createSnapshot(): GameSnapshot {
  return {
    schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
    rng: { seed: 7, callCount: 14 },
    season: 3,
    day: 97,
    phase: 'regular',
    userTeamId: 'nym',
    players: [],
    schedule: [],
    seasonState: {
      season: 3,
      currentDay: 97,
      standings: [],
      playerSeasonStats: [],
      gameLog: [],
      completed: false,
    },
    playoffBracket: null,
    injuries: [],
    serviceTime: [],
    scoutingStaffs: [],
    gmPersonalities: [],
    offseasonState: null,
    rule5Session: null,
    rule5Obligations: [],
    rule5OfferBackStates: [],
    draftClass: null,
    freeAgencyMarket: null,
    news: [],
    rosterStates: [],
    coachingStaffs: [],
    coachFreeAgentPool: [],
    narrative: {
      playerMorale: [],
      teamChemistry: [],
      ownerState: [],
      briefingQueue: [],
      storyFlags: [],
      rivalries: [],
      tickerFeed: [],
      playerMoments: [],
      playerNicknames: [],
      playerStoryArcs: [],
      prospectBonds: [],
      gmRelationships: [],
      leagueEvents: [],
      playerOrigins: [],
      debutFlashbacks: [],
      awardHistory: [],
      hallOfFame: [],
      hallOfFameBallot: [],
      franchiseTimeline: [],
      careerStats: [],
      recordBook: [],
      recordWatch: [],
      seasonArchive: [],
      archivedSeasons: [],
      historicalPlayers: [],
      mentorRelationships: [],
      frontOfficeState: [],
      whatIfBranches: [],
      seasonHistory: [
        {
          season: 2,
          championTeamId: 'nym',
          runnerUpTeamId: 'lax',
          worldSeriesRecord: '4-2',
          summary: 'New York finished the job.',
          awards: [],
          keyMoments: ['Won the World Series in six games.'],
          statLeaders: {
            hr: [],
            rbi: [],
            avg: [],
            era: [],
            k: [],
            w: [],
          },
          notableRetirements: [],
          blockbusterTrades: [],
          userSeason: null,
        },
      ],
    },
    tradeState: {
      pendingOffers: [],
      tradeHistory: [],
      negotiations: [],
      multiTeamPendingTrades: [],
    },
    internationalScoutingState: {
      season: 3,
      ifaPool: [],
      budgets: [],
      scoutingHistory: [],
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
    monthlyPulse: {
      pendingReport: null,
      decisionQueue: [],
    },
    franchise: {
      gmName: 'General Manager',
      difficulty: 'standard',
      playMode: 'standard',
      createdAt: 'S3D97',
      teamId: 'nym',
      teamName: 'New York Tycoons',
      teamAbbreviation: 'NYT',
      teamDivision: 'AL East',
      onboarding: {
        welcomeBriefingSeen: true,
        firstMonthlyPulseSeen: true,
      },
      assistantGMId: null,
      gmPhilosophy: null,
      scoutingDirector: null,
    },
    ceremony: {
      pendingMoments: [],
      seenMomentIds: [],
    },
    achievements: {
      unlocked: [],
      progress: [],
      counters: [],
      ledgers: [],
    },
    performanceDiagnostics: {
      totalSeasons: 3,
      snapshotSizeBytes: 512,
    },
  } as unknown as GameSnapshot;
}

describe('saveSystem helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearPerformanceMetrics();
  });

  it('builds a current-schema save record from a canonical snapshot', () => {
    const snapshot = createSnapshot();

    const record = buildSaveRecord(2, 'Dynasty Slot', snapshot);

    expect(record.slotNumber).toBe(2);
    expect(record.name).toBe('Dynasty Slot');
    expect(record.season).toBe(3);
    expect(record.day).toBe(97);
    expect(record.phase).toBe('regular');
    expect(record.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(record.hasSnapshot).toBe(true);
    expect(record.snapshot?.rng.callCount).toBe(14);
    expect(record.snapshot?.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(record.parentSaveId).toBeNull();
    expect(record.isRootSave).toBe(true);
    expect(record.branchMeta).toBeNull();
    expect(record.snapshot?.narrative.seasonHistory[0]?.worldSeriesRecord).toBe('4-2');
    expect(record.snapshot?.narrative.archivedSeasons).toEqual([]);
    expect(record.snapshot?.narrative.whatIfBranches).toEqual([]);
    expect(record.snapshot?.narrative.playerMoments).toEqual([]);
    expect(record.snapshot?.narrative.playerNicknames).toEqual([]);
    expect(record.snapshot?.narrative.gmRelationships).toEqual([]);
    expect(record.snapshot?.narrative.leagueEvents).toEqual([]);
    expect(record.snapshot?.performanceDiagnostics).toEqual({
      totalSeasons: 3,
      snapshotSizeBytes: 512,
    });
    expect(record.snapshot?.tradeState.pendingOffers).toEqual([]);
    expect(record.snapshot?.tradeState.negotiations).toEqual([]);
    expect(record.snapshot?.tradeState.multiTeamPendingTrades).toEqual([]);
    expect(record.snapshot?.rule5Session).toBeNull();
    expect(record.snapshot?.rule5Obligations).toEqual([]);
    expect(record.snapshot?.rule5OfferBackStates).toEqual([]);
    expect(record.snapshot?.internationalScoutingState.season).toBe(3);
    expect(record.snapshot?.draftState.bigBoards).toEqual([]);
    expect(record.snapshot?.minorLeagueState.affiliateStates).toEqual([]);
    expect(record.snapshot?.monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
    expect(record.legacyState).toBeNull();
  });

  it('round-trips exported snapshot json through the import parser', () => {
    const snapshot = createSnapshot();

    const serialized = exportSnapshotToJson('Dynasty Export', snapshot);
    const imported = importSnapshotFromJson(serialized);

    expect(imported.name).toBe('Dynasty Export');
    expect(imported.snapshot.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(imported.snapshot.franchise.gmName).toBe('General Manager');
  });

  it('saves and inspects branch records by id without assigning a slot', async () => {
    vi.spyOn(db.saves, 'get').mockResolvedValue(undefined as never);
    const putSpy = vi.spyOn(db.saves, 'put').mockResolvedValue('branch-alpha' as never);
    const snapshot = createSnapshot();

    await saveGameById('branch-alpha', 'What If Alpha', snapshot, {
      slotNumber: null,
      parentSaveId: 'save-slot-1',
      isRootSave: false,
      branchMeta: {
        id: 'branch-alpha',
        saveId: 'branch-alpha',
        branchedAtSeason: 3,
        branchedAtDay: 97,
        description: 'What if we kept the ace?',
        createdAt: '2026-04-03T00:00:00.000Z',
      },
    });

    expect(putSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: 'branch-alpha',
      slotNumber: null,
      parentSaveId: 'save-slot-1',
      isRootSave: false,
    }));

    vi.spyOn(db.saves, 'get').mockResolvedValue(putSpy.mock.calls[0]?.[0] as never);

    await expect(inspectSaveById('branch-alpha')).resolves.toMatchObject({
      status: 'ok',
      save: expect.objectContaining({
        id: 'branch-alpha',
        slotNumber: null,
        parentSaveId: 'save-slot-1',
        isRootSave: false,
      }),
    });
  });

  it('creates and lists branches under a root save tree', async () => {
    const root = buildSaveRecord(1, 'Root Dynasty', createSnapshot());
    vi.spyOn(db.saves, 'get').mockResolvedValue(root as never);
    const putSpy = vi.spyOn(db.saves, 'put').mockResolvedValue('branch-beta' as never);
    vi.spyOn(db.saves, 'toArray').mockResolvedValue([
      root,
      {
        ...root,
        id: 'branch-beta',
        slotNumber: null,
        isRootSave: false,
        parentSaveId: 'save-slot-1',
        branchMeta: {
          id: 'branch-beta',
          saveId: 'branch-beta',
          branchedAtSeason: 3,
          branchedAtDay: 97,
          description: 'Alt timeline',
          createdAt: '2026-04-03T00:00:00.000Z',
        },
      },
    ] as never);

    await createBranchSave('save-slot-1', createSnapshot(), 'Alt timeline');

    expect(putSpy).toHaveBeenCalled();
    await expect(listBranches('save-slot-1')).resolves.toHaveLength(1);
    await expect(listSaveTree()).resolves.toEqual([
      expect.objectContaining({
        save: expect.objectContaining({ id: 'save-slot-1' }),
        branches: [
          expect.objectContaining({ id: 'branch-beta' }),
        ],
      }),
    ]);
  });

  it('clears every save slot in one call', async () => {
    const clearSpy = vi.spyOn(db.saves, 'clear').mockResolvedValue(undefined as never);

    await clearAllSaves();

    expect(clearSpy).toHaveBeenCalledTimes(1);
  });

  it('normalizes legacy records into metadata-only entries without deleting them', () => {
    const normalized = normalizeLoadedSaveRecord({
      id: 'save-slot-4',
      slotNumber: 4,
      name: 'Old Save',
      season: 1,
      day: 1,
      phase: 'preseason',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      gameState: '{"old":true}',
    });

    expect(normalized.schemaVersion).toBe(1);
    expect(normalized.hasSnapshot).toBe(false);
    expect(normalized.snapshot).toBeNull();
    expect(normalized.legacyState).toBe('{"old":true}');
  });

  it('migrates v2 snapshots to the current schema on load', () => {
    const normalized = normalizeLoadedSaveRecord({
      id: 'save-slot-3',
      slotNumber: 3,
      name: 'Migrated Save',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      snapshot: {
        schemaVersion: 2,
        rng: { seed: 9, callCount: 5 },
        season: 5,
        day: 12,
        phase: 'offseason',
        userTeamId: 'nym',
        players: [],
        schedule: [],
        seasonState: {
          season: 5,
          currentDay: 12,
          standings: [],
          playerSeasonStats: [
            ['pitcher-1', {
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
              ip: 27,
              earnedRuns: 6,
              strikeouts: 11,
              walks: 2,
              hitsAllowed: 9,
            }],
          ],
          gameLog: [],
          completed: false,
        },
        playoffBracket: null,
        injuries: [],
        serviceTime: [],
        scoutingStaffs: [],
        gmPersonalities: [],
        offseasonState: null,
        draftClass: null,
        freeAgencyMarket: null,
        news: [],
        rosterStates: [],
        narrative: {
          playerMorale: [],
          teamChemistry: [],
          ownerState: [],
          briefingQueue: [],
          storyFlags: [],
          rivalries: [],
          awardHistory: [
            {
              season: 4,
              award: 'MVP',
              playerId: 'player-1',
              teamId: 'nym',
              summary: 'Carried the lineup.',
            },
          ],
          seasonHistory: [
            {
              season: 4,
              championTeamId: 'nym',
              summary: 'Won it all.',
              awards: [],
              keyMoments: ['Wrapped up the title.'],
            },
          ],
        },
      },
      // normalizeLoadedSaveRecord accepts persisted payloads before parsing them.
      // This fixture intentionally uses the legacy v2 shape.
    } as any);

    expect(normalized.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(normalized.snapshot?.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(normalized.snapshot?.seasonState.playerSeasonStats[0]?.[1].wins).toBe(0);
    expect(normalized.snapshot?.seasonState.playerSeasonStats[0]?.[1].losses).toBe(0);
    expect(normalized.snapshot?.seasonState.playerSeasonStats[0]?.[1].hbp).toBe(0);
    expect(normalized.snapshot?.seasonState.playerSeasonStats[0]?.[1].homeRunsAllowed).toBe(0);
    expect(normalized.snapshot?.narrative.awardHistory[0]?.league).toBe('MLB');
    expect(normalized.snapshot?.narrative.seasonHistory[0]?.runnerUpTeamId).toBeNull();
    expect(normalized.snapshot?.narrative.seasonHistory[0]?.statLeaders.w).toEqual([]);
    expect(normalized.snapshot?.narrative.hallOfFame).toEqual([]);
    expect(normalized.snapshot?.narrative.franchiseTimeline).toEqual([]);
    expect(normalized.snapshot?.tradeState.pendingOffers).toEqual([]);
    expect(normalized.snapshot?.rule5Session).toBeNull();
    expect(normalized.snapshot?.rule5Obligations).toEqual([]);
    expect(normalized.snapshot?.rule5OfferBackStates).toEqual([]);
    expect(normalized.snapshot?.internationalScoutingState.ifaPool).toEqual([]);
    expect(normalized.snapshot?.draftState.signability).toEqual([]);
    expect(normalized.snapshot?.minorLeagueState.optionUsage).toEqual([]);
    expect(normalized.snapshot?.monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
  });

  it('migrates v3 snapshots to the current schema on load', () => {
    const snapshot = createSnapshot();
    const normalized = normalizeLoadedSaveRecord({
      id: 'save-slot-5',
      slotNumber: 5,
      name: 'Phase 3 Save',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      snapshot: {
        ...snapshot,
        schemaVersion: 3,
      },
    } as any);

    expect(normalized.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(normalized.snapshot?.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(normalized.snapshot?.tradeState.tradeHistory).toEqual([]);
    expect(normalized.snapshot?.rule5Obligations).toEqual([]);
    expect(normalized.snapshot?.monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
  });

  it('migrates v4 snapshots to the current schema on load', () => {
    const snapshot = createSnapshot();
    const normalized = normalizeLoadedSaveRecord({
      id: 'save-slot-6',
      slotNumber: 6,
      name: 'Phase 4 Save',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
      snapshot: {
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
      },
    } as any);

    expect(normalized.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(normalized.snapshot?.schemaVersion).toBe(CURRENT_GAME_SNAPSHOT_VERSION);
    expect(normalized.snapshot?.narrative.hallOfFame).toEqual([]);
    expect(normalized.snapshot?.narrative.hallOfFameBallot).toEqual([]);
    expect(normalized.snapshot?.narrative.franchiseTimeline).toEqual([]);
    expect(normalized.snapshot?.narrative.careerStats).toEqual([]);
    expect(normalized.snapshot?.rule5OfferBackStates).toEqual([]);
    expect(normalized.snapshot?.monthlyPulse).toEqual({
      pendingReport: null,
      decisionQueue: [],
    });
  });

  it('coalesces queued autosaves so only the latest pending snapshot is written', async () => {
    let flushQueuedSave: (() => void) | null = null;
    const writeSave = vi.fn().mockImplementation(async () => undefined);
    const scheduler = createAutoSaveScheduler(
      writeSave,
      (callback) => {
        flushQueuedSave = callback;
        return () => {
          flushQueuedSave = null;
        };
      },
    );

    const first = scheduler.schedule({
      slot: 1,
      name: 'Season 4',
      state: { season: 4, day: 100 },
    });
    const second = scheduler.schedule({
      slot: 1,
      name: 'Season 4 Updated',
      state: { season: 4, day: 101 },
    });

    expect(writeSave).not.toHaveBeenCalled();
    expect(flushQueuedSave).toBeTypeOf('function');

    const flushQueuedSaveFn = flushQueuedSave as (() => void) | null;
    if (typeof flushQueuedSaveFn !== 'function') {
      throw new Error('Expected idle flush callback to be scheduled.');
    }

    flushQueuedSaveFn();
    await Promise.all([first, second]);

    expect(writeSave).toHaveBeenCalledTimes(1);
    expect(writeSave).toHaveBeenCalledWith({
      slot: 1,
      name: 'Season 4 Updated',
      state: { season: 4, day: 101 },
    });
  });

  it('records save and load timings against the runtime performance ledger', async () => {
    vi.spyOn(db.saves, 'get').mockResolvedValue(undefined as never);
    vi.spyOn(db.saves, 'put').mockResolvedValue('save-slot-1' as never);
    const nowSpy = vi.spyOn(globalThis.performance, 'now');
    nowSpy
      .mockReturnValueOnce(0)
      .mockReturnValueOnce(120)
      .mockReturnValueOnce(200)
      .mockReturnValueOnce(320);

    await saveGame(1, 'Dynasty', createSnapshot());
    await loadGame(1);

    expect(getLatestPerformanceMetric('save.write')).toEqual({
      durationMs: 120,
      budgetMs: 500,
      overBudget: false,
    });
    expect(getLatestPerformanceMetric('save.load')).toEqual({
      durationMs: 120,
      budgetMs: 500,
      overBudget: false,
    });
  });

  it('exposes the shared autosave queue for app-level callers', async () => {
    vi.spyOn(db.saves, 'get').mockResolvedValue(undefined as never);
    const putSpy = vi.spyOn(db.saves, 'put').mockResolvedValue('save-slot-1' as never);

    const scheduled = scheduleAutoSave(1, 'Dynasty', createSnapshot());
    await flushAutoSaveQueueForTesting();
    await scheduled;

    expect(putSpy).toHaveBeenCalledTimes(1);
  });

  it('marks an invalid snapshot payload as corrupt instead of throwing during inspection', async () => {
    vi.spyOn(db.saves, 'get').mockResolvedValue({
      id: 'save-slot-2',
      slotNumber: 2,
      name: 'Broken Save',
      season: 5,
      day: 44,
      phase: 'regular',
      schemaVersion: 12,
      hasSnapshot: true,
      snapshot: { schemaVersion: 12, broken: true },
      legacyState: null,
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    } as never);

    await expect(loadGameSafe(2)).resolves.toMatchObject({
      status: 'corrupt',
      slot: 2,
    });
    await expect(inspectSave(2)).resolves.toMatchObject({
      status: 'corrupt',
      slot: 2,
    });
  });

  it('repairs a legacy snapshot payload and promotes it into the canonical current-schema save shape', async () => {
    const putSpy = vi.spyOn(db.saves, 'put').mockResolvedValue('save-slot-3' as never);
    vi.spyOn(db.saves, 'get').mockResolvedValue({
      id: 'save-slot-3',
      slotNumber: 3,
      name: 'Repairable Save',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: 1,
      hasSnapshot: false,
      snapshot: null,
      legacyState: JSON.stringify(createSnapshot()),
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    } as never);

    const repaired = await repairSave(3);

    expect(repaired).toMatchObject({
      status: 'ok',
      save: expect.objectContaining({
        slotNumber: 3,
        schemaVersion: CURRENT_GAME_SNAPSHOT_VERSION,
        hasSnapshot: true,
      }),
    });
    expect(putSpy).toHaveBeenCalledTimes(1);
  });

  it('returns a corrupt repair result when no migration path can salvage the record', async () => {
    vi.spyOn(db.saves, 'get').mockResolvedValue({
      id: 'save-slot-4',
      slotNumber: 4,
      name: 'Unrepairable Save',
      season: 1,
      day: 1,
      phase: 'preseason',
      schemaVersion: 1,
      hasSnapshot: false,
      snapshot: null,
      legacyState: '{"broken-json"',
      createdAt: '2026-04-01T00:00:00.000Z',
      updatedAt: '2026-04-01T00:00:00.000Z',
    } as never);

    await expect(repairSave(4)).resolves.toMatchObject({
      status: 'corrupt',
      slot: 4,
    });
  });
});
