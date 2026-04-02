// @vitest-environment node

import { describe, expect, it } from 'vitest';
import type { GameSnapshot } from '@mbd/contracts';
import {
  buildSaveRecord,
  normalizeLoadedSaveRecord,
} from './saveSystem';

function createSnapshot(): GameSnapshot {
  return {
    schemaVersion: 7,
    rng: { seed: 7, callCount: 14 },
    season: 3,
    day: 97,
    phase: 'regular',
    userTeamId: 'nyy',
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
    narrative: {
      playerMorale: [],
      teamChemistry: [],
      ownerState: [],
      briefingQueue: [],
      storyFlags: [],
      rivalries: [],
      awardHistory: [],
      hallOfFame: [],
      hallOfFameBallot: [],
      franchiseTimeline: [],
      careerStats: [],
      seasonHistory: [
        {
          season: 2,
          championTeamId: 'nyy',
          runnerUpTeamId: 'lad',
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
    },
  } as unknown as GameSnapshot;
}

describe('saveSystem helpers', () => {
  it('builds a v7 save record from a canonical snapshot', () => {
    const snapshot = createSnapshot();

    const record = buildSaveRecord(2, 'Dynasty Slot', snapshot);

    expect(record.slotNumber).toBe(2);
    expect(record.name).toBe('Dynasty Slot');
    expect(record.season).toBe(3);
    expect(record.day).toBe(97);
    expect(record.phase).toBe('regular');
    expect(record.schemaVersion).toBe(7);
    expect(record.hasSnapshot).toBe(true);
    expect(record.snapshot?.rng.callCount).toBe(14);
    expect(record.snapshot?.schemaVersion).toBe(7);
    expect(record.snapshot?.narrative.seasonHistory[0]?.worldSeriesRecord).toBe('4-2');
    expect(record.snapshot?.tradeState.pendingOffers).toEqual([]);
    expect(record.snapshot?.rule5Session).toBeNull();
    expect(record.snapshot?.rule5Obligations).toEqual([]);
    expect(record.snapshot?.rule5OfferBackStates).toEqual([]);
    expect(record.snapshot?.internationalScoutingState.season).toBe(3);
    expect(record.snapshot?.draftState.bigBoards).toEqual([]);
    expect(record.snapshot?.minorLeagueState.affiliateStates).toEqual([]);
    expect(record.legacyState).toBeNull();
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

  it('migrates v2 snapshots to v7 on load', () => {
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
        userTeamId: 'nyy',
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
              teamId: 'nyy',
              summary: 'Carried the lineup.',
            },
          ],
          seasonHistory: [
            {
              season: 4,
              championTeamId: 'nyy',
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

    expect(normalized.schemaVersion).toBe(7);
    expect(normalized.snapshot?.schemaVersion).toBe(7);
    expect(normalized.snapshot?.seasonState.playerSeasonStats[0]?.[1].wins).toBe(0);
    expect(normalized.snapshot?.seasonState.playerSeasonStats[0]?.[1].losses).toBe(0);
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
  });

  it('migrates v3 snapshots to v7 on load', () => {
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

    expect(normalized.schemaVersion).toBe(7);
    expect(normalized.snapshot?.schemaVersion).toBe(7);
    expect(normalized.snapshot?.tradeState.tradeHistory).toEqual([]);
    expect(normalized.snapshot?.rule5Obligations).toEqual([]);
  });

  it('migrates v4 snapshots to v7 on load', () => {
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

    expect(normalized.schemaVersion).toBe(7);
    expect(normalized.snapshot?.schemaVersion).toBe(7);
    expect(normalized.snapshot?.narrative.hallOfFame).toEqual([]);
    expect(normalized.snapshot?.narrative.hallOfFameBallot).toEqual([]);
    expect(normalized.snapshot?.narrative.franchiseTimeline).toEqual([]);
    expect(normalized.snapshot?.narrative.careerStats).toEqual([]);
    expect(normalized.snapshot?.rule5OfferBackStates).toEqual([]);
  });
});
