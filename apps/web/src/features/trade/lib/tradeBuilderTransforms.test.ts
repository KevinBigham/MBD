import { describe, expect, it } from 'vitest';
import type { TradeAsset } from '@mbd/contracts';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { TradeAssetView, TradeDeadlineStateView } from '@/workers/sim.worker.trade';
import type { MultiTeamLaneState } from '../components/MultiTeamLaneCard';
import {
  ALL_TEAM_OPTIONS,
  buildInitialMultiTeamLanes,
  buildMarketPhaseCopy,
  buildMultiTeamMovedPlayers,
  buildOpenMultiTeamBuilderState,
  addMultiTeamLane,
  draftPickAssetsFromAssets,
  draftPickAssetsFromViews,
  draftPickKey,
  fairnessLabel,
  fairnessRatio,
  ifaAmountFromAssets,
  ifaAmountFromViews,
  multiTeamProposalFromLanes,
  parsePoolAmount,
  playerAsset,
  playerIdsFromAssets,
  playerIdsFromAssetViews,
  playerMatchesAssetFilter,
  poolAsset,
  removeMultiTeamLane,
  sortPlayerList,
  setMultiTeamLaneTeam,
  teamDisplayName,
  toggleDraftPickAsset,
  toggleMultiTeamLanePlayer,
  tradeAssetsFromSelection,
  tradeAssetSummaryItems,
  tradeAssetValue,
  tradeBuilderSelectionFromAssets,
  tradeBuilderSelectionFromAssetViews,
  tradeResultFromNegotiationAction,
  tradeResultFromOfferResponse,
  updateMultiTeamLaneDestination,
  validateTradeSubmission,
} from './tradeBuilderTransforms';

function player(overrides: Partial<PlayerDTO> & { id: string }): PlayerDTO {
  return {
    id: overrides.id,
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'Player',
    age: overrides.age ?? 24,
    position: overrides.position ?? 'SS',
    overallRating: overrides.overallRating ?? overrides.displayRating ?? 70,
    displayRating: overrides.displayRating ?? overrides.overallRating ?? 70,
    letterGrade: overrides.letterGrade ?? 'B',
    rosterStatus: overrides.rosterStatus ?? 'MLB',
    teamId: overrides.teamId ?? 'nym',
    contract: overrides.contract ?? {
      years: 1,
      annualSalary: 1,
      totalValue: 1,
      noTradeClause: false,
      noTradeClauseType: 'none',
      playerOption: false,
      teamOption: false,
      optOutYears: [],
      signingBonus: 0,
      buyoutAmount: 0,
      deferredMoney: [],
    },
    stats: null,
  } as unknown as PlayerDTO;
}

function assetView(asset: TradeAsset): TradeAssetView {
  return {
    key:
      asset.type === 'player'
        ? `player:${asset.playerId}`
        : asset.type === 'draft_pick'
          ? draftPickKey(asset)
          : `ifa:${asset.amount}`,
    type: asset.type,
    label: 'Asset',
    detail: 'Detail',
    asset,
    playerId: asset.type === 'player' ? asset.playerId : undefined,
  };
}

describe('tradeBuilderTransforms', () => {
  it('builds deterministic team labels and initial multi-team lanes', () => {
    expect(ALL_TEAM_OPTIONS[0]?.label).toContain(' - ');
    expect(teamDisplayName('bos')).toContain('BOS - ');
    expect(teamDisplayName('unknown')).toBe('UNKNOWN');

    expect(buildInitialMultiTeamLanes('nym', 'bos')).toEqual([
      { laneId: 'lane-1', teamId: 'nym', role: 'initiator', outgoing: [] },
      { laneId: 'lane-2', teamId: 'bos', role: 'partner', outgoing: [] },
      expect.objectContaining({ laneId: 'lane-3', role: 'facilitator', outgoing: [] }),
    ]);
  });

  it('converts multi-team lanes into sorted unique proposal payloads', () => {
    const proposal = multiTeamProposalFromLanes([
      {
        laneId: 'lane-1',
        teamId: 'nym',
        role: 'initiator',
        outgoing: [
          { playerId: 'p2', destinationTeamId: 'bos' },
          { playerId: 'p1', destinationTeamId: 'bos' },
          { playerId: 'p1', destinationTeamId: 'bos' },
        ],
      },
      {
        laneId: 'lane-2',
        teamId: 'bos',
        role: 'partner',
        outgoing: [{ playerId: 'p3', destinationTeamId: 'nym' }],
      },
      {
        laneId: 'lane-empty',
        teamId: '',
        role: 'facilitator',
        outgoing: [{ playerId: 'ignored', destinationTeamId: 'nym' }],
      },
    ], [{
      type: 'performance',
      playerId: 'p1',
      threshold: 2,
      deadline: 120,
      description: 'p1 reaches 2 WAR',
    }]);

    expect(proposal.teams).toEqual([
      {
        teamId: 'nym',
        role: 'initiator',
        sendingPlayerIds: ['p1', 'p2'],
        receivingPlayerIds: ['ignored', 'p3'],
      },
      {
        teamId: 'bos',
        role: 'partner',
        sendingPlayerIds: ['p3'],
        receivingPlayerIds: ['p1', 'p2'],
      },
    ]);
    expect(proposal.conditions).toHaveLength(1);
  });

  it('updates multi-team lanes without mutating route state', () => {
    const lanes: MultiTeamLaneState[] = [
      {
        laneId: 'lane-1',
        teamId: 'nym',
        role: 'initiator',
        outgoing: [
          { playerId: 'p1', destinationTeamId: 'bos' },
          { playerId: 'p2', destinationTeamId: 'sea' },
        ],
      },
      {
        laneId: 'lane-2',
        teamId: 'bos',
        role: 'partner',
        outgoing: [
          { playerId: 'p3', destinationTeamId: 'nym' },
          { playerId: 'p4', destinationTeamId: 'bos' },
        ],
      },
    ];

    expect(setMultiTeamLaneTeam(lanes, 'lane-2', 'sea')).toEqual([
      {
        laneId: 'lane-1',
        teamId: 'nym',
        role: 'initiator',
        outgoing: [
          { playerId: 'p2', destinationTeamId: 'sea' },
        ],
      },
      {
        laneId: 'lane-2',
        teamId: 'sea',
        role: 'partner',
        outgoing: [],
      },
    ]);
    expect(toggleMultiTeamLanePlayer(lanes, 'lane-1', 'p5')[0]?.outgoing.at(-1)).toEqual({
      playerId: 'p5',
      destinationTeamId: 'bos',
    });
    expect(toggleMultiTeamLanePlayer(lanes, 'lane-1', 'p1')[0]?.outgoing).toEqual([
      { playerId: 'p2', destinationTeamId: 'sea' },
    ]);
    expect(updateMultiTeamLaneDestination(lanes, 'lane-1', 'p2', 'bos')[0]?.outgoing).toEqual([
      { playerId: 'p1', destinationTeamId: 'bos' },
      { playerId: 'p2', destinationTeamId: 'bos' },
    ]);
    expect(removeMultiTeamLane(lanes, 'lane-2')).toEqual([
      {
        laneId: 'lane-1',
        teamId: 'nym',
        role: 'initiator',
        outgoing: [
          { playerId: 'p2', destinationTeamId: 'sea' },
        ],
      },
    ]);
    expect(lanes[0]!.outgoing).toEqual([
      { playerId: 'p1', destinationTeamId: 'bos' },
      { playerId: 'p2', destinationTeamId: 'sea' },
    ]);
  });

  it('adds at most one unused fourth multi-team lane', () => {
    const lanes = buildInitialMultiTeamLanes('nym', 'bos');
    const withFourthLane = addMultiTeamLane(lanes, 'nym');

    expect(withFourthLane).toHaveLength(4);
    expect(withFourthLane[3]).toEqual(expect.objectContaining({
      laneId: 'lane-4',
      role: 'facilitator',
      outgoing: [],
    }));
    expect(withFourthLane[3]?.teamId).not.toBe('nym');
    expect(addMultiTeamLane(withFourthLane, 'nym')).toBe(withFourthLane);
  });

  it('builds the initial multi-team route state from current rosters', () => {
    const userRoster = [
      player({ id: 'u-low', displayRating: 61, overallRating: 61 }),
      player({ id: 'u-high', displayRating: 78, overallRating: 78 }),
    ];
    const targetRoster = [
      player({ id: 't-low', displayRating: 57, overallRating: 57, teamId: 'bos' }),
      player({ id: 't-high', displayRating: 82, overallRating: 82, teamId: 'bos' }),
    ];

    const state = buildOpenMultiTeamBuilderState('nym', 'bos', userRoster, targetRoster);

    expect(state.lanes).toEqual([
      { laneId: 'lane-1', teamId: 'nym', role: 'initiator', outgoing: [] },
      { laneId: 'lane-2', teamId: 'bos', role: 'partner', outgoing: [] },
      expect.objectContaining({ laneId: 'lane-3', role: 'facilitator', outgoing: [] }),
    ]);
    expect(state.rosters.nym?.map((candidate) => candidate.id)).toEqual(['u-high', 'u-low']);
    expect(state.rosters.bos?.map((candidate) => candidate.id)).toEqual(['t-high', 't-low']);
    expect(state.conditions).toEqual([]);
    expect(state.conditionPlayerId).toBe('');
    expect(state.fairness).toBeNull();
    expect(state.proposalResult).toBeNull();
    expect(state.executionResult).toBeNull();
    expect(state.message).toBeNull();
    expect(userRoster.map((candidate) => candidate.id)).toEqual(['u-low', 'u-high']);
    expect(targetRoster.map((candidate) => candidate.id)).toEqual(['t-low', 't-high']);
  });

  it('sorts and filters player lists without mutating caller arrays', () => {
    const roster = [
      player({ id: 'b', firstName: 'B', lastName: 'Beta', age: 30, position: 'SP', displayRating: 65, overallRating: 65, rosterStatus: 'AAA' }),
      player({ id: 'a', firstName: 'A', lastName: 'Alpha', age: 21, position: 'CF', displayRating: 70, overallRating: 70, rosterStatus: 'MLB', ceiling: 84 }),
      player({ id: 'c', firstName: 'C', lastName: 'Gamma', age: 26, position: 'RP', displayRating: 70, overallRating: 70, rosterStatus: 'MLB' }),
    ];

    expect(sortPlayerList(roster).map((candidate) => candidate.id)).toEqual(['a', 'c', 'b']);
    expect(roster.map((candidate) => candidate.id)).toEqual(['b', 'a', 'c']);
    expect(playerMatchesAssetFilter(roster[0]!, 'pitchers', [])).toBe(true);
    expect(playerMatchesAssetFilter(roster[1]!, 'prospects', [])).toBe(true);
    expect(playerMatchesAssetFilter(roster[1]!, 'hitters', [])).toBe(true);
    expect(playerMatchesAssetFilter(roster[1]!, 'selected', ['a'])).toBe(true);
    expect(playerMatchesAssetFilter(roster[1]!, 'selected', ['b'])).toBe(false);
    expect(playerMatchesAssetFilter(roster[2]!, 'mlb', [])).toBe(true);
  });

  it('derives market phase copy from current phase and deadline state', () => {
    expect(buildMarketPhaseCopy('regular', { daysUntilDeadline: 14, deadlineMode: false } as TradeDeadlineStateView, true)).toEqual({
      headline: '14 days until trade deadline',
      detail: 'Regular-season trade calls are open. Shape a package or resume an active talk.',
      disabledReason: '',
    });
    expect(buildMarketPhaseCopy('spring_training', null, false).disabledReason).toBe('Formal offers unlock on Opening Day.');
    expect(buildMarketPhaseCopy('offseason', null, false).headline).toBe('Offseason roster market');
    expect(buildMarketPhaseCopy('playoffs', null, false).headline).toBe('Postseason roster freeze');
    expect(buildMarketPhaseCopy('regular', null, false).headline).toBe('Deadline has passed');
  });

  it('validates trade submissions while preserving silent route guards', () => {
    expect(validateTradeSubmission({
      selectedTeam: '',
      offeringAssetCount: 1,
      requestingAssetCount: 1,
      tradeMarketOpen: true,
      offeringIFAAmount: '',
      requestingIFAAmount: '',
      userIFARemaining: 0,
      targetIFARemaining: 0,
    })).toEqual({ ok: false, result: null });
    expect(validateTradeSubmission({
      selectedTeam: 'bos',
      offeringAssetCount: 0,
      requestingAssetCount: 1,
      tradeMarketOpen: true,
      offeringIFAAmount: '',
      requestingIFAAmount: '',
      userIFARemaining: 0,
      targetIFARemaining: 0,
    })).toEqual({ ok: false, result: null });
    expect(validateTradeSubmission({
      selectedTeam: 'bos',
      offeringAssetCount: 1,
      requestingAssetCount: 1,
      tradeMarketOpen: false,
      offeringIFAAmount: '',
      requestingIFAAmount: '',
      userIFARemaining: 0,
      targetIFARemaining: 0,
    })).toEqual({ ok: false, result: null });
    expect(validateTradeSubmission({
      selectedTeam: 'bos',
      offeringAssetCount: 1,
      requestingAssetCount: 1,
      tradeMarketOpen: true,
      offeringIFAAmount: '2.1',
      requestingIFAAmount: '',
      userIFARemaining: 2,
      targetIFARemaining: 0,
    })).toEqual({
      ok: false,
      result: {
        status: 'rejected',
        message: 'You cannot offer more international pool space than you have remaining.',
      },
    });
    expect(validateTradeSubmission({
      selectedTeam: 'bos',
      offeringAssetCount: 1,
      requestingAssetCount: 1,
      tradeMarketOpen: true,
      offeringIFAAmount: '',
      requestingIFAAmount: '1.1',
      userIFARemaining: 0,
      targetIFARemaining: 1,
    })).toEqual({
      ok: false,
      result: {
        status: 'rejected',
        message: 'The target club does not have that much international pool space available.',
      },
    });
    expect(validateTradeSubmission({
      selectedTeam: 'bos',
      offeringAssetCount: 1,
      requestingAssetCount: 1,
      tradeMarketOpen: true,
      offeringIFAAmount: '1',
      requestingIFAAmount: '1',
      userIFARemaining: 1,
      targetIFARemaining: 1,
    })).toEqual({ ok: true });

    const malformedAssets = tradeAssetsFromSelection(
      ['player-1'],
      [],
      '',
      { 'player-1': { retainedSalary: '1.005', cashConsideration: '' } },
      [player({
        id: 'player-1',
        contract: {
          years: 3,
          annualSalary: 20,
          totalValue: 60,
          noTradeClause: false,
          noTradeClauseType: 'none',
          playerOption: false,
          teamOption: false,
          optOutYears: [],
          signingBonus: 0,
          buyoutAmount: 0,
          deferredMoney: [],
        },
      })],
      4,
    );
    expect(validateTradeSubmission({
      selectedTeam: 'bos',
      offeringAssetCount: malformedAssets.length,
      requestingAssetCount: 1,
      tradeMarketOpen: true,
      offeringIFAAmount: '',
      requestingIFAAmount: '',
      userIFARemaining: 0,
      targetIFARemaining: 0,
      offeringAssets: malformedAssets,
      requestingAssets: [{ type: 'player', playerId: 'target-1' }],
    })).toEqual({
      ok: false,
      result: {
        status: 'rejected',
        message: 'Trade money must be finite and use at most two decimal places.',
      },
    });
  });

  it('preserves entered trade money so strict validation can reject excess precision', () => {
    const pick = { type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' } as const;
    const pool = poolAsset(parsePoolAmount('2.345'));

    expect(playerAsset('p1')).toEqual({ type: 'player', playerId: 'p1' });
    expect(draftPickKey(pick)).toBe('draft:4:1:nym');
    expect(pool).toEqual({ type: 'ifa_pool_space', amount: 2.345 });
    expect(parsePoolAmount('-1')).toBe(0);
    expect(parsePoolAmount('bad')).toBe(0);
    expect(toggleDraftPickAsset([], pick)).toEqual([pick]);
    expect(toggleDraftPickAsset([pick], pick)).toEqual([]);
  });

  it('builds route-side asset selections and package summary rows', () => {
    const pick = { type: 'draft_pick', season: 5, round: 3, originalTeamId: 'bos' } as const;
    const assets = tradeAssetsFromSelection(['p2', 'p1'], [pick], '1.256');

    expect(assets).toEqual([
      { type: 'player', playerId: 'p2' },
      { type: 'player', playerId: 'p1' },
      pick,
      { type: 'ifa_pool_space', amount: 1.256 },
    ]);
    expect(tradeAssetsFromSelection([], [], 'not-a-number')).toEqual([]);
    expect(tradeAssetSummaryItems(assets, (asset) => (
      asset.type === 'player' ? `Player ${asset.playerId}` : asset.type
    ))).toEqual([
      { key: 'player:p2', label: 'Player p2' },
      { key: 'player:p1', label: 'Player p1' },
      { key: 'draft:5:3:bos', label: 'draft_pick' },
      { key: 'ifa:1.26', label: 'ifa_pool_space' },
    ]);
  });

  it('materializes exact contract-linked terms and excludes the final option year', () => {
    const contracted = player({
      id: 'p-finance',
      contract: {
        years: 4,
        annualSalary: 24,
        totalValue: 96,
        noTradeClause: false,
        noTradeClauseType: 'none',
        playerOption: true,
        teamOption: false,
        optOutYears: [],
        signingBonus: 0,
        buyoutAmount: 0,
        deferredMoney: [],
      },
    });
    const assets = tradeAssetsFromSelection(
      [contracted.id],
      [],
      '',
      { [contracted.id]: { retainedSalary: '6', cashConsideration: '2' } },
      [contracted],
      5,
    );

    expect(assets).toEqual([{
      type: 'player',
      playerId: contracted.id,
      contractReference: { annualSalary: 24, contractEndSeasonExclusive: 9 },
      retainedSalary: { annualAmount: 6, startSeason: 5, endSeasonExclusive: 8 },
      cashConsideration: { amount: 2, season: 5 },
    }]);
    expect(tradeBuilderSelectionFromAssetViews(assets.map(assetView), [])).toMatchObject({
      offeringFinancialTerms: {
        [contracted.id]: { retainedSalary: '6', cashConsideration: '2' },
      },
    });
  });

  it('extracts asset selections from worker views and proposals', () => {
    const pick = { type: 'draft_pick', season: 4, round: 2, originalTeamId: 'bos' } as const;
    const assets: TradeAsset[] = [
      { type: 'player', playerId: 'p1' },
      pick,
      { type: 'ifa_pool_space', amount: 1.25 },
    ];
    const views = assets.map(assetView);

    expect(playerIdsFromAssets(assets)).toEqual(['p1']);
    expect(draftPickAssetsFromAssets(assets)).toEqual([pick]);
    expect(ifaAmountFromAssets(assets)).toBe('1.25');
    expect(playerIdsFromAssetViews(views)).toEqual(['p1']);
    expect(draftPickAssetsFromViews(views)).toEqual([pick]);
    expect(ifaAmountFromViews(views)).toBe('1.25');
  });

  it('builds full route builder selections from worker assets and offer views', () => {
    const offeringPick = { type: 'draft_pick', season: 4, round: 2, originalTeamId: 'bos' } as const;
    const requestingPick = { type: 'draft_pick', season: 5, round: 1, originalTeamId: 'nym' } as const;
    const offeringAssets: TradeAsset[] = [
      { type: 'player', playerId: 'p1' },
      offeringPick,
      { type: 'ifa_pool_space', amount: 1.25 },
    ];
    const requestingAssets: TradeAsset[] = [
      { type: 'player', playerId: 'p2' },
      requestingPick,
      { type: 'ifa_pool_space', amount: 0.5 },
    ];

    expect(tradeBuilderSelectionFromAssets(offeringAssets, requestingAssets)).toEqual({
      offeringPlayerIds: ['p1'],
      requestingPlayerIds: ['p2'],
      offeringDraftPicks: [offeringPick],
      requestingDraftPicks: [requestingPick],
      offeringIFAAmount: '1.25',
      requestingIFAAmount: '0.50',
    });

    expect(tradeBuilderSelectionFromAssetViews(
      requestingAssets.map(assetView),
      offeringAssets.map(assetView),
    )).toEqual({
      offeringPlayerIds: ['p2'],
      requestingPlayerIds: ['p1'],
      offeringDraftPicks: [requestingPick],
      requestingDraftPicks: [offeringPick],
      offeringIFAAmount: '0.50',
      requestingIFAAmount: '1.25',
    });
  });

  it('calculates deterministic package value and fairness labels', () => {
    const resolver = (id: string) =>
      id === 'p1'
        ? player({ id: 'p1', age: 24, overallRating: 70, displayRating: 70 })
        : undefined;

    expect(tradeAssetValue({ type: 'player', playerId: 'p1' }, 4, resolver)).toBeCloseTo(70);
    expect(tradeAssetValue({ type: 'draft_pick', season: 4, round: 1, originalTeamId: 'nym' }, 4, resolver)).toBe(69);
    expect(tradeAssetValue({ type: 'ifa_pool_space', amount: 2 }, 4, resolver)).toBe(16);
    expect(fairnessRatio(40, 60)).toBe(0.4);
    expect(fairnessRatio(0, 0)).toBe(0.5);
    expect(fairnessLabel(0.2).text).toBe('Heavily favors you');
    expect(fairnessLabel(0.5).text).toBe('Fair trade');
    expect(fairnessLabel(0.8).text).toBe('Heavily favors them');
  });

  it('maps worker trade decisions into route result banner states', () => {
    const review = {
      fairnessScore: 4.2,
      rosterValid: true,
      rosterIssues: [],
      narrative: 'Deal checks out.',
    };

    expect(tradeResultFromNegotiationAction({
      decision: 'accepted',
      message: 'Accepted.',
      review,
    })).toEqual({
      status: 'accepted',
      message: 'Accepted.',
      review,
    });
    expect(tradeResultFromNegotiationAction({
      decision: 'pending',
      message: 'Still talking.',
      review: null,
    })).toEqual({
      status: 'counter',
      message: 'Still talking.',
      review: null,
    });
    expect(tradeResultFromNegotiationAction({
      decision: 'countered',
      message: 'Countered.',
      review: null,
    }).status).toBe('counter');
    expect(tradeResultFromNegotiationAction({
      decision: 'dead',
      message: 'Expired.',
      review: null,
    }).status).toBe('rejected');

    expect(tradeResultFromOfferResponse({
      decision: 'accepted',
      message: 'Trade accepted.',
    })).toEqual({
      status: 'accepted',
      message: 'Trade accepted.',
    });
    expect(tradeResultFromOfferResponse({
      decision: 'countered',
      message: 'The other GM sent a revised proposal.',
    })).toEqual({
      status: 'counter',
      message: 'The other GM sent a revised proposal.',
    });
    expect(tradeResultFromOfferResponse({
      decision: 'declined',
      message: 'Offer declined.',
    })).toEqual({
      status: 'declined',
      message: 'Offer declined.',
    });
    expect(tradeResultFromOfferResponse({
      decision: 'rejected',
      message: 'That offer is no longer actionable.',
    }).status).toBe('rejected');
  });

  it('builds deterministic moved-player targets for multi-team conditional clauses', () => {
    const lanes = [
      {
        laneId: 'lane-1',
        teamId: 'nym',
        role: 'initiator',
        outgoing: [
          { playerId: 'p2', destinationTeamId: 'bos' },
          { playerId: 'p1', destinationTeamId: 'bos' },
        ],
      },
      {
        laneId: 'lane-2',
        teamId: 'bos',
        role: 'partner',
        outgoing: [
          { playerId: 'missing-player', destinationTeamId: 'nym' },
          { playerId: 'p2', destinationTeamId: 'sea' },
        ],
      },
    ] as const;
    const rosters = {
      nym: [
        player({ id: 'p1', firstName: 'Jose', lastName: 'Anchor' }),
        player({ id: 'p2', firstName: 'Maya', lastName: 'Power' }),
      ],
      bos: [
        player({ id: 'p2', firstName: 'Maya', lastName: 'Power' }),
      ],
    };

    expect(buildMultiTeamMovedPlayers(lanes, rosters)).toEqual([
      { playerId: 'p2', label: 'Maya Power (BOS - Noreasters)' },
      { playerId: 'p1', label: 'Jose Anchor (NYT - Tycoons)' },
      { playerId: 'missing-player', label: 'missing-player' },
    ]);
  });
});
