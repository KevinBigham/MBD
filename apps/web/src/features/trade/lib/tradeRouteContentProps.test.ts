import { describe, expect, it, vi } from 'vitest';
import type { PlayerDTO } from '@/workers/sim.worker.helpers';
import type { RelationshipView } from '../components/TradeBuilderContextPanel';
import type { TradeAssetFilter } from '../components/TradeAssetSelectionGrid';
import type { TradeResultView } from '../components/TradeResultBanner';
import { buildTradeRouteContentProps, type BuildTradeRouteContentPropsInput } from './tradeRouteContentProps';

function player(id: string, teamId = 'nym'): PlayerDTO {
  return {
    id,
    firstName: 'Test',
    lastName: id.toUpperCase(),
    age: 24,
    position: 'SS',
    overallRating: 70,
    displayRating: 70,
    letterGrade: 'B',
    rosterStatus: 'MLB',
    teamId,
    stats: null,
  } as unknown as PlayerDTO;
}

function baseInput(overrides: Partial<BuildTradeRouteContentPropsInput> = {}): BuildTradeRouteContentPropsInput {
  const setTradeResult = vi.fn();

  return {
    actionHandlers: {
      handleAcceptOffer: vi.fn(),
      handleCounterOffer: vi.fn(),
      handleDeclineOffer: vi.fn(),
      handleResolveNegotiation: vi.fn(),
      proposing: false,
      submitTrade: vi.fn(),
    },
    assetBuilder: {
      filteredTargetRoster: [player('target-player', 'bos')],
      filteredYourRoster: [player('your-player')],
      offering: ['your-player'],
      offeringAssets: [{ type: 'player', playerId: 'your-player' }],
      offeringIFAAmount: '',
      offeringPicks: [],
      requesting: ['target-player'],
      requestingAssets: [{ type: 'player', playerId: 'target-player' }],
      requestingIFAAmount: '',
      requestingPicks: [],
      setOfferingIFAAmount: vi.fn(),
      setRequestingIFAAmount: vi.fn(),
      setTargetAssetFilter: vi.fn(),
      setYourAssetFilter: vi.fn(),
      targetAssetFilter: 'all' as TradeAssetFilter,
      toggleOffer: vi.fn(),
      toggleOfferingPick: vi.fn(),
      toggleRequest: vi.fn(),
      toggleRequestingPick: vi.fn(),
      yourAssetFilter: 'all' as TradeAssetFilter,
    },
    deadlineDramaSlot: 'Deadline slot',
    gmDialogue: null,
    marketContext: {
      effectivePhase: 'regular',
      marketCopy: {
        detail: 'Phones are hot.',
        disabledReason: '',
        headline: '4 days until deadline',
      },
      otherTeams: [{ id: 'bos', name: 'Boston Noreasters', abbr: 'BOS' }],
      relationshipsByTeamId: new Map<string, RelationshipView>(),
      selectedRelationship: null,
      tradeMarketOpen: true,
    },
    multiTeamBuilder: {
      addMultiTeamLane: vi.fn(),
      handleAddConditionalClause: vi.fn(),
      handleEvaluateMultiTeamFramework: vi.fn(),
      handleExecuteMultiTeamFramework: vi.fn(),
      handleProposeMultiTeamFramework: vi.fn(),
      multiTeamConditionPlayerId: 'moved-player',
      multiTeamConditionTargets: [{ playerId: 'moved-player', label: 'Moved Player' }],
      multiTeamConditions: [],
      multiTeamExecutionResult: null,
      multiTeamFairness: null,
      multiTeamLanes: [],
      multiTeamMessage: null,
      multiTeamMovedPlayers: [],
      multiTeamOpen: false,
      multiTeamProposal: { teams: [] },
      multiTeamProposalResult: null,
      multiTeamRosters: {},
      multiTeamSubmitting: false,
      openMultiTeamBuilder: vi.fn(),
      removeMultiTeamLane: vi.fn(),
      resetMultiTeamBuilder: vi.fn(),
      setMultiTeamConditionPlayerId: vi.fn(),
      setMultiTeamLaneTeam: vi.fn(),
      toggleMultiTeamPlayer: vi.fn(),
      updateMultiTeamDestination: vi.fn(),
    },
    negotiation: {
      activeCounterOfferId: null,
      activeNegotiation: null,
      resumeNegotiation: vi.fn(),
      setTradeResult,
      tradeResult: { status: 'counter', message: 'Counter ready.' } as TradeResultView,
    },
    packageSummary: {
      offerTotal: 25,
      offeringSummary: [{ key: 'player:your-player', label: 'Test YOUR-PLAYER' }],
      playerById: (playerId: string) => player(playerId),
      requestTotal: 25,
      requestingSummary: [{ key: 'player:target-player', label: 'Test TARGET-PLAYER' }],
    },
    routeActions: {
      clearTrade: vi.fn(),
      selectTradePartner: vi.fn(),
    },
    routeData: {
      deadlineState: null,
      incomingOffers: [],
      openNegotiations: [],
      openNegotiationsLoading: false,
      targetInventory: { draftPicks: [], ifaRemaining: 0 },
      targetRoster: [player('target-player', 'bos')],
      tradeHistory: [],
      yourInventory: { draftPicks: [], ifaRemaining: 0 },
      yourRoster: [player('your-player')],
    },
    season: 4,
    selectedTeam: 'bos',
    ...overrides,
  } as unknown as BuildTradeRouteContentPropsInput;
}

describe('buildTradeRouteContentProps', () => {
  it('maps grouped route state into TradePageContent props', () => {
    const input = baseInput();

    const props = buildTradeRouteContentProps(input);

    expect(props.deadlineDramaSlot).toBe('Deadline slot');
    expect(props.deadlineDashboardProps).toMatchObject({
      detail: 'Phones are hot.',
      headline: '4 days until deadline',
      tradeMarketOpen: true,
    });
    expect(props.activityColumnProps.incomingOffers).toBe(input.routeData.incomingOffers);
    expect(props.activityColumnProps.onResumeNegotiation).toBe(input.negotiation.resumeNegotiation);
    expect(props.builderStackProps.result).toEqual({ status: 'counter', message: 'Counter ready.' });
    expect(props.builderStackProps.builderProps.contextProps.onSelectTeam).toBe(input.routeActions.selectTradePartner);
    expect(props.builderStackProps.builderProps.assetGridProps.onChangeOfferingFilter).toBe(input.assetBuilder.setYourAssetFilter);
    expect(props.builderStackProps.builderProps.packageEvaluationProps.offerTotal).toBe(25);
  });

  it('keeps the counter-negotiation callback route-owned', () => {
    const input = baseInput();

    const props = buildTradeRouteContentProps(input);
    props.builderStackProps.builderProps.negotiationProps.onCounter();

    expect(input.negotiation.setTradeResult).toHaveBeenCalledWith({
      status: 'counter',
      message: 'Adjust the package below, then send the counter back through the room.',
    });
  });
});
